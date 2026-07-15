use crate::error::SettlementError;
use crate::events::{emit_front_running_detected, FrontRunningDetectedEvent};
use crate::types::Bid;
use soroban_sdk::{contracttype, symbol_short, Address, Bytes, Env, Symbol, Vec};

// Storage keys
const COMMITMENT_STORAGE: Symbol = symbol_short!("commits");

/// Withdrawal record for on-chain pattern monitoring
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawalRecord {
    pub timestamp: u64,
    pub amount: i128,
    pub withdrawal_type: Bytes,
}

/// Commit-reveal scheme for bid protection
pub struct CommitRevealScheme;

impl CommitRevealScheme {
    /// Create a commitment hash from bid details using SHA-256
    pub fn create_commitment(
        env: &Env,
        bidder: &Address,
        auction_id: u64,
        bid_amount: i128,
        salt: &Bytes,
    ) -> Bytes {
        // Build a deterministic preimage: bidder || auction_id || bid_amount || salt
        let mut preimage = Bytes::new(env);
        preimage.append(&bidder.to_xdr(env));
        preimage.append(&Bytes::from_slice(env, &auction_id.to_be_bytes()));
        preimage.append(&Bytes::from_slice(env, &bid_amount.to_be_bytes()));
        preimage.append(salt);

        // Hash with SHA-256 for a collision-resistant commitment
        env.crypto().sha256(&preimage)
    }

    /// Store a sealed-bid commitment
    pub fn store_commitment(
        env: &Env,
        bidder: &Address,
        auction_id: u64,
        commitment_hash: &Bytes,
        reveal_deadline: u64,
    ) -> Result<(), SettlementError> {
        let mut commitments: soroban_sdk::Map<Address, soroban_sdk::Map<u64, (Bytes, u64)>> = env
            .storage()
            .instance()
            .get(&COMMITMENT_STORAGE)
            .unwrap_or(soroban_sdk::Map::new(env));

        let mut bidder_commitments = commitments
            .get(bidder.clone())
            .unwrap_or(soroban_sdk::Map::new(env));

        bidder_commitments.set(auction_id, (commitment_hash.clone(), reveal_deadline));
        commitments.set(bidder.clone(), bidder_commitments);

        env.storage()
            .instance()
            .set(&COMMITMENT_STORAGE, &commitments);
        Ok(())
    }

    /// Reveal and verify a sealed-bid commitment
    pub fn reveal_commitment(
        env: &Env,
        bidder: &Address,
        auction_id: u64,
        bid_amount: i128,
        salt: &Bytes,
    ) -> Result<(), SettlementError> {
        let commitments: soroban_sdk::Map<Address, soroban_sdk::Map<u64, (Bytes, u64)>> = env
            .storage()
            .instance()
            .get(&COMMITMENT_STORAGE)
            .ok_or(SettlementError::NotFound)?;

        let bidder_commitments = commitments
            .get(bidder.clone())
            .ok_or(SettlementError::NotFound)?;

        let (stored_hash, reveal_deadline) = bidder_commitments
            .get(auction_id)
            .unwrap_or((Bytes::new(env), 0));

        // Check if reveal deadline has passed
        let current_time = env.ledger().timestamp();
        if current_time > reveal_deadline {
            return Err(SettlementError::Expired);
        }

        // Recompute the commitment hash from the revealed values and verify match
        let computed_hash = Self::create_commitment(env, bidder, auction_id, bid_amount, salt);
        if computed_hash != stored_hash {
            return Err(SettlementError::CommitmentMismatch);
        }

        Ok(())
    }

    /// Clean up expired commitments
    pub fn cleanup_expired_commitments(env: &Env) -> Result<(), SettlementError> {
        let current_time = env.ledger().timestamp();
        let mut commitments: soroban_sdk::Map<Address, soroban_sdk::Map<u64, (Bytes, u64)>> = env
            .storage()
            .instance()
            .get(&COMMITMENT_STORAGE)
            .unwrap_or(soroban_sdk::Map::new(env));

        // This is a simplified cleanup - in production you'd want a more efficient approach
        let bidders: Vec<Address> = commitments.keys();

        for bidder in bidders.iter() {
            if let Some(mut bidder_commitments) = commitments.get(bidder.clone()) {
                let auction_ids: Vec<u64> = bidder_commitments.keys();

                for auction_id in auction_ids.iter() {
                    if let Some((_, reveal_deadline)) = bidder_commitments.get(auction_id) {
                        if current_time > reveal_deadline {
                            bidder_commitments.remove(auction_id);
                        }
                    }
                }

                if bidder_commitments.is_empty() {
                    commitments.remove(bidder.clone());
                } else {
                    commitments.set(bidder.clone(), bidder_commitments);
                }
            }
        }

        env.storage()
            .instance()
            .set(&COMMITMENT_STORAGE, &commitments);
        Ok(())
    }
}

/// Front-running pattern detection
pub struct FrontRunningDetector;

impl FrontRunningDetector {
    /// Analyze bidding patterns for potential front-running
    pub fn analyze_bidding_pattern(
        env: &Env,
        auction_id: u64,
        new_bid: &Bid,
        recent_bids: &Vec<Bid>,
    ) -> Result<(), SettlementError> {
        // Check for suspicious patterns
        let suspicious_patterns =
            Self::detect_suspicious_patterns(env, auction_id, new_bid, recent_bids)?;

        if !suspicious_patterns.is_empty() {
            // Emit front-running detection event
            let event = FrontRunningDetectedEvent {
                suspicious_address: new_bid.bidder.clone(),
                pattern: Bytes::from_slice(env, b"multiple_patterns"),
                timestamp: env.ledger().timestamp(),
            };
            emit_front_running_detected(env, event);

            return Err(SettlementError::FrontRunningDetected);
        }

        Ok(())
    }

    /// Detect various suspicious bidding patterns
    fn detect_suspicious_patterns(
        env: &Env,
        _auction_id: u64,
        new_bid: &Bid,
        recent_bids: &Vec<Bid>,
    ) -> Result<Vec<Bytes>, SettlementError> {
        let mut patterns = Vec::new(env);

        // Pattern 1: Rapid successive bids from same address
        if Self::detect_rapid_bidding(new_bid, recent_bids) {
            patterns.push_back(Bytes::from_slice(env, "rapid_bidding".as_bytes()));
        }

        // Pattern 2: Bid amounts that exactly match previous bids + increment
        if Self::detect_increment_gaming(new_bid, recent_bids) {
            patterns.push_back(Bytes::from_slice(env, "increment_gaming".as_bytes()));
        }

        // Pattern 3: Bids placed at exact time intervals
        if Self::detect_timed_bidding(env, new_bid, recent_bids) {
            patterns.push_back(Bytes::from_slice(env, "timed_bidding".as_bytes()));
        }

        Ok(patterns)
    }

    /// Detect rapid successive bidding from same address
    fn detect_rapid_bidding(new_bid: &Bid, recent_bids: &Vec<Bid>) -> bool {
        let mut same_bidder_count = 0u32;
        let time_window = 60; // 60 seconds

        for bid in recent_bids.iter() {
            if bid.bidder == new_bid.bidder && new_bid.placed_at - bid.placed_at < time_window {
                same_bidder_count += 1;
                if same_bidder_count >= 3 {
                    return true;
                }
            }
        }
        false
    }

    /// Detect bids that game the increment system
    fn detect_increment_gaming(new_bid: &Bid, recent_bids: &Vec<Bid>) -> bool {
        if recent_bids.is_empty() {
            return false;
        }

        // Check if new bid exactly matches expected increment
        // This is a simplified check - in practice you'd have more sophisticated logic
        for bid in recent_bids.iter().rev().take(3) {
            let expected_increment = bid.amount + 1000; // Example increment
            if new_bid.amount == expected_increment {
                return true;
            }
        }
        false
    }

    /// Detect suspiciously timed bidding
    fn detect_timed_bidding(env: &Env, new_bid: &Bid, recent_bids: &Vec<Bid>) -> bool {
        if recent_bids.len() < 2 {
            return false;
        }

        // Check for regular time intervals between bids
        let mut intervals = Vec::new(env);

        for i in 1..recent_bids.len() {
            if let (Some(prev_bid), Some(curr_bid)) = (recent_bids.get(i - 1), recent_bids.get(i)) {
                intervals.push_back(curr_bid.placed_at - prev_bid.placed_at);
            }
        }

        // Check if new bid follows similar pattern
        if let Some(last_interval) = intervals.get(intervals.len() - 1) {
            let new_interval =
                new_bid.placed_at - recent_bids.get(recent_bids.len() - 1).unwrap().placed_at;
            let diff = new_interval.abs_diff(last_interval);

            // If timing is too regular (within 5 seconds), flag as suspicious
            diff < 5
        } else {
            false
        }
    }
}

/// Withdrawal pattern monitoring
pub struct WithdrawalPatternMonitor;

impl WithdrawalPatternMonitor {
    /// Monitor withdrawal patterns for security — records timestamp, amount, and type for pattern analysis
    pub fn monitor_withdrawal(
        env: &Env,
        user: &Address,
        amount: i128,
        withdrawal_type: &str,
    ) -> Result<(), SettlementError> {
        let key = Symbol::new(env, "wdrwl_log");
        let mut logs: soroban_sdk::Map<Address, soroban_sdk::Vec<WithdrawalRecord>> = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or(soroban_sdk::Map::new(env));

        let mut user_logs = logs
            .get(user.clone())
            .unwrap_or(soroban_sdk::Vec::new(env));

        let entry = WithdrawalRecord {
            timestamp: env.ledger().timestamp(),
            amount,
            withdrawal_type: Bytes::from_slice(env, withdrawal_type.as_bytes()),
        };
        user_logs.push_back(entry);

        // Retain only the last 50 withdrawal records per user to bound storage
        while user_logs.len() > 50 {
            user_logs.remove(0);
        }

        logs.set(user.clone(), user_logs);
        env.storage().instance().set(&key, &logs);
        Ok(())
    }

    /// Check for unusual withdrawal patterns — flags high-frequency or large-amount anomalies
    pub fn check_unusual_pattern(
        env: &Env,
        user: &Address,
        amount: i128,
    ) -> Result<(), SettlementError> {
        let key = Symbol::new(env, "wdrwl_log");
        let logs: soroban_sdk::Map<Address, soroban_sdk::Vec<WithdrawalRecord>> = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or(soroban_sdk::Map::new(env));

        let user_logs = match logs.get(user.clone()) {
            Some(l) => l,
            None => return Ok(()),
        };

        let current_time = env.ledger().timestamp();
        let window = 3600u64; // 1 hour

        let mut recent_count = 0u32;
        let mut recent_volume: i128 = 0;

        for entry in user_logs.iter() {
            if current_time.saturating_sub(entry.timestamp) <= window {
                recent_count += 1;
                recent_volume = recent_volume.saturating_add(entry.amount);
            }
        }

        // Flag: more than 10 withdrawals in 1 hour OR total volume exceeds 1M stroops
        if recent_count > 10 || recent_volume > 1_000_000_000_000 {
            let event = FrontRunningDetectedEvent {
                suspicious_address: user.clone(),
                pattern: Bytes::from_slice(env, "unusual_withdrawal".as_bytes()),
                timestamp: current_time,
            };
            emit_front_running_detected(env, event);
        }

        Ok(())
    }
}
