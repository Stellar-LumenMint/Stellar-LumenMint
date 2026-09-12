use crate::error::SettlementError;
use crate::ttl;
use crate::types::{AuctionTransaction, Bid, DutchAuctionData};
use soroban_sdk::{contracttype, symbol_short, Address, Env, Symbol, Vec};

/// Storage key for a single auction record.
///
/// Auctions, their bids and Dutch pricing data each used to live in one
/// `Map<u64, ...>` in **instance** storage. Every bid therefore rewrote every
/// auction on the book and the whole bid book with it, and the single shared
/// instance entry grew without bound. Each auction now owns its own persistent
/// entries, so a bid touches one auction.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AuctionKey {
    Auction(u64),
    Bids(u64),
    Dutch(u64),
}

pub const NEXT_AUCTION_ID: Symbol = symbol_short!("next_auc");

/// Storage manager for auction transactions
pub struct AuctionStore;

impl AuctionStore {
    /// Get the next available auction ID
    pub fn next_id(env: &Env) -> u64 {
        let current_id: u64 = env.storage().instance().get(&NEXT_AUCTION_ID).unwrap_or(1);
        let next_id = current_id + 1;
        env.storage().instance().set(&NEXT_AUCTION_ID, &next_id);
        current_id
    }

    /// Store an auction transaction
    pub fn put(env: &Env, auction: &AuctionTransaction) -> Result<(), SettlementError> {
        ttl::set(env, &AuctionKey::Auction(auction.auction_id), auction);
        Ok(())
    }

    /// Get an auction by ID
    pub fn get(env: &Env, auction_id: u64) -> Result<AuctionTransaction, SettlementError> {
        ttl::get(env, &AuctionKey::Auction(auction_id)).ok_or(SettlementError::AuctionNotFound)
    }

    /// Update an auction
    pub fn update(env: &Env, auction: &AuctionTransaction) -> Result<(), SettlementError> {
        Self::put(env, auction)
    }

    /// Remove an auction
    pub fn remove(env: &Env, auction_id: u64) -> Result<(), SettlementError> {
        if !env
            .storage()
            .persistent()
            .has(&AuctionKey::Auction(auction_id))
        {
            return Err(SettlementError::AuctionNotFound);
        }
        ttl::remove(env, &AuctionKey::Auction(auction_id));
        Ok(())
    }

    /// Add a bid to an auction
    pub fn add_bid(env: &Env, auction_id: u64, bid: &Bid) -> Result<(), SettlementError> {
        let mut bids = Self::get_bids(env, auction_id);
        bids.push_back(bid.clone());
        ttl::set(env, &AuctionKey::Bids(auction_id), &bids);
        Ok(())
    }

    /// Get all bids for an auction
    pub fn get_bids(env: &Env, auction_id: u64) -> Vec<Bid> {
        ttl::get(env, &AuctionKey::Bids(auction_id)).unwrap_or_else(|| Vec::new(env))
    }

    /// Rewrite the bid book for an auction with `bids`.
    fn put_bids(env: &Env, auction_id: u64, bids: &Vec<Bid>) {
        ttl::set(env, &AuctionKey::Bids(auction_id), bids);
    }

    /// Mark a bid as refunded (checks-effects-interactions guard)
    pub fn mark_bid_refunded(
        env: &Env,
        auction_id: u64,
        bidder: &Address,
    ) -> Result<(), SettlementError> {
        let mut bids = Self::get_bids(env, auction_id);
        for i in 0..bids.len() {
            if let Some(mut bid) = bids.get(i) {
                if bid.bidder == *bidder {
                    if bid.refunded {
                        return Err(SettlementError::InvalidState);
                    }
                    bid.refunded = true;
                    bids.set(i, bid);
                    Self::put_bids(env, auction_id, &bids);
                    return Ok(());
                }
            }
        }
        Err(SettlementError::NotFound)
    }

    /// Mark every outstanding bid from `bidder` as refunded and return the
    /// total they had escrowed.
    ///
    /// A bidder may bid repeatedly and be outbid each time, and every one of
    /// those deposits is held by the contract. Refunding only the first bid
    /// left the rest stranded: the first bid was already marked refunded, so a
    /// second withdrawal attempt was rejected and the remaining deposits became
    /// permanently unreachable.
    pub fn refund_all_bids(
        env: &Env,
        auction_id: u64,
        bidder: &Address,
    ) -> Result<i128, SettlementError> {
        let mut bids = Self::get_bids(env, auction_id);
        let mut total: i128 = 0;
        let mut found = false;

        for i in 0..bids.len() {
            if let Some(mut bid) = bids.get(i) {
                if bid.bidder == *bidder && !bid.refunded {
                    total = total.saturating_add(bid.amount);
                    bid.refunded = true;
                    bids.set(i, bid);
                    found = true;
                }
            }
        }

        if !found {
            return Err(SettlementError::NotFound);
        }

        Self::put_bids(env, auction_id, &bids);
        Ok(total)
    }

    /// Update a bid in an auction (for committed bids)
    pub fn update_bid(
        env: &Env,
        auction_id: u64,
        bidder: &Address,
        new_bid: &Bid,
    ) -> Result<(), SettlementError> {
        let mut bids = Self::get_bids(env, auction_id);
        for i in 0..bids.len() {
            if let Some(existing_bid) = bids.get(i) {
                if existing_bid.bidder == *bidder {
                    bids.set(i, new_bid.clone());
                    Self::put_bids(env, auction_id, &bids);
                    return Ok(());
                }
            }
        }
        Err(SettlementError::NotFound)
    }
}

/// Storage manager for Dutch auction data
pub struct DutchAuctionStore;

impl DutchAuctionStore {
    /// Store Dutch auction data
    pub fn put(env: &Env, auction_id: u64, data: &DutchAuctionData) -> Result<(), SettlementError> {
        ttl::set(env, &AuctionKey::Dutch(auction_id), data);
        Ok(())
    }

    /// Get Dutch auction data
    pub fn get(env: &Env, auction_id: u64) -> Result<DutchAuctionData, SettlementError> {
        ttl::get(env, &AuctionKey::Dutch(auction_id)).ok_or(SettlementError::AuctionNotFound)
    }

    /// Update Dutch auction data
    pub fn update(
        env: &Env,
        auction_id: u64,
        data: &DutchAuctionData,
    ) -> Result<(), SettlementError> {
        Self::put(env, auction_id, data)
    }

    /// Remove Dutch auction data
    pub fn remove(env: &Env, auction_id: u64) -> Result<(), SettlementError> {
        if !env
            .storage()
            .persistent()
            .has(&AuctionKey::Dutch(auction_id))
        {
            return Err(SettlementError::AuctionNotFound);
        }
        ttl::remove(env, &AuctionKey::Dutch(auction_id));
        Ok(())
    }
}
