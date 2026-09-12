use crate::error::SettlementError;
use crate::ttl;
use crate::types::{Asset, ExecutionResult};
use crate::utils::asset_utils;
use soroban_sdk::{contracttype, Address, Bytes, Env, Symbol, Vec};

/// Storage key for an escrow record.
///
/// Escrows used to be one `Map<u64, AtomicSwap>` in **instance** storage, keyed
/// by a generated swap id, and every lookup scanned the whole map comparing
/// transaction ids. That made each listing rewrite every escrow on the book and
/// every settlement linear in the number of open sales. Keying directly by
/// transaction id — the only thing callers ever look up by — removes the scan
/// and gives each escrow its own entry and TTL.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowKey {
    Swap(u64),
}

/// Represents an escrow holding
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowHolding {
    pub transaction_id: u64,
    pub holder: Address, // Who deposited the funds/NFTs
    pub asset: Asset,
    pub amount: i128, // For tokens, or token_id for NFTs
    pub is_nft: bool,
    /// Whether the deposit has actually been made. Kept separate from
    /// `deposited_at` because the ledger timestamp is legitimately zero at
    /// chain genesis, so "timestamp > 0" cannot double as "funded".
    pub deposited: bool,
    pub deposited_at: u64,
    pub released_at: Option<u64>,
}

/// Atomic swap state
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AtomicSwap {
    pub transaction_id: u64,
    pub seller_escrow: Vec<EscrowHolding>,
    pub buyer_escrow: Vec<EscrowHolding>,
    /// Asset the buyer is expected to pay with, recorded when the sale is
    /// listed so the first payment deposit can be validated against it.
    pub payment_asset: Asset,
    /// Exact amount the buyer must deposit. Recorded at listing time.
    pub payment_amount: i128,
    /// Set the first time a buyer funds the swap. `None` until then — the
    /// buyer of a fixed-price sale is unknown when the sale is created.
    pub buyer: Option<Address>,
    pub state: SwapState,
    pub created_at: u64,
    pub executed_at: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum SwapState {
    Pending = 0,
    SellerFunded = 1,
    BuyerFunded = 2,
    Ready = 3,
    Executed = 4,
    Failed = 5,
}

/// Atomic swap engine for secure NFT and token transfers
pub struct AtomicSwapEngine;

impl AtomicSwapEngine {
    /// Initialize an atomic swap for a transaction.
    ///
    /// Only the seller's side is seeded — with the NFT they are about to
    /// escrow, and `deposited_at: 0` because nothing has moved yet. The buyer
    /// is deliberately left unset: at listing time nobody has bought the item,
    /// and this used to record the seller as the buyer, which made the swap
    /// claim a counterparty that had never agreed to anything and sent the NFT
    /// back to the seller on execution.
    #[allow(clippy::too_many_arguments)]
    pub fn initialize_swap(
        env: &Env,
        transaction_id: u64,
        seller: &Address,
        nft_address: &Address,
        token_id: u64,
        payment_asset: &Asset,
        payment_amount: i128,
    ) -> Result<u64, SettlementError> {
        let mut seller_escrow = Vec::new(env);
        seller_escrow.push_back(EscrowHolding {
            transaction_id,
            holder: seller.clone(),
            asset: Asset {
                contract: nft_address.clone(),
                symbol: Symbol::new(env, "NFT"),
            },
            amount: token_id as i128,
            is_nft: true,
            deposited: false,
            deposited_at: 0,
            released_at: None,
        });

        let atomic_swap = AtomicSwap {
            transaction_id,
            seller_escrow,
            buyer_escrow: Vec::new(env),
            payment_asset: payment_asset.clone(),
            payment_amount,
            buyer: None,
            state: SwapState::Pending,
            created_at: env.ledger().timestamp(),
            executed_at: None,
        };

        Self::store_swap(env, &atomic_swap)?;
        Ok(transaction_id)
    }

    /// Deposit funds/NFTs into escrow
    pub fn deposit_to_escrow(
        env: &Env,
        transaction_id: u64,
        depositor: &Address,
        asset: &Asset,
        amount: i128,
        is_nft: bool,
    ) -> Result<(), SettlementError> {
        let mut swap = Self::get_swap_by_transaction(env, transaction_id)?;

        // Validate depositor
        let is_seller_deposit = swap
            .seller_escrow
            .iter()
            .any(|h| h.holder == *depositor && h.asset == *asset);
        let is_buyer_deposit = swap
            .buyer_escrow
            .iter()
            .any(|h| h.holder == *depositor && h.asset == *asset);

        // A buyer funding the listed payment for the first time. There is no
        // pre-seeded buyer holding to match against, so this is validated
        // against the asset and amount recorded at listing time instead.
        let is_listed_payment = !is_nft
            && swap.buyer.is_none()
            && asset.contract == swap.payment_asset.contract
            && amount == swap.payment_amount;

        if !is_seller_deposit && !is_buyer_deposit && !is_listed_payment {
            // Report what is actually wrong. This used to be a flat
            // `Unauthorized`, which told a caller their signature was the
            // problem when the real fault was paying in the wrong asset, paying
            // the wrong amount, or funding somebody else's transaction.
            if !is_nft && asset.contract != swap.payment_asset.contract {
                return Err(SettlementError::InvalidCurrency);
            }
            if !is_nft && amount != swap.payment_amount {
                return Err(SettlementError::PaymentAmountMismatch);
            }
            return Err(SettlementError::Unauthorized);
        }

        // Perform the actual deposit (transfer to escrow)
        Self::transfer_to_escrow(env, depositor, asset, amount, is_nft)?;

        // Update escrow holdings
        Self::update_escrow_holding(env, &mut swap, depositor, asset, amount, is_nft)?;

        if is_listed_payment && !is_buyer_deposit {
            swap.buyer = Some(depositor.clone());
        }

        // Update swap state
        Self::update_swap_state(env, &mut swap)?;

        Self::store_swap(env, &swap)?;
        Ok(())
    }

    /// Execute the atomic swap.
    ///
    /// Internal helper, not a contract entrypoint: the only caller is
    /// `MarketplaceSettlement::execute_sale`, which already holds the
    /// contract-wide re-entrancy guard. `ReentrancyGuard` is a single global
    /// flag rather than a per-call lock, so acquiring it a second time here
    /// always failed with `ReentrancyDetected` — which is why every sale
    /// execution reverted.
    pub fn execute_swap(
        env: &Env,
        transaction_id: u64,
        _executor: &Address,
    ) -> Result<ExecutionResult, SettlementError> {
        let mut swap = Self::get_swap_by_transaction(env, transaction_id)?;

        // Validate swap is ready for execution
        if swap.state != SwapState::Ready {
            return Err(SettlementError::InvalidTransactionState);
        }

        // Perform the atomic swap
        Self::perform_atomic_swap(env, &swap)?;

        // Update swap state
        swap.state = SwapState::Executed;
        swap.executed_at = Some(env.ledger().timestamp());

        Self::store_swap(env, &swap)?;

        Ok(ExecutionResult {
            transaction_id,
            success: true,
            transferred_nft: true,
            // The payment is not moved here: the caller splits the escrowed
            // payment through `distribute_royalties`, which is the only place
            // that knows the creator/seller/platform shares.
            transferred_payment: false,
            distributed_royalties: true,
            collected_platform_fee: true,
            timestamp: env.ledger().timestamp(),
        })
    }

    /// Cancel a swap and refund all parties (with optional admin override)
    pub fn cancel_swap(
        env: &Env,
        transaction_id: u64,
        canceller: &Address,
    ) -> Result<(), SettlementError> {
        let mut swap = Self::get_swap_by_transaction(env, transaction_id)?;

        // Allow cancellation by seller, buyer, or the contract itself (admin/dispute resolution)
        let is_authorized = swap.seller_escrow.iter().any(|h| h.holder == *canceller)
            || swap.buyer_escrow.iter().any(|h| h.holder == *canceller)
            || *canceller == env.current_contract_address();

        if !is_authorized {
            return Err(SettlementError::Unauthorized);
        }

        // Refund all escrow holdings
        Self::refund_escrow_holdings(env, &swap)?;

        swap.state = SwapState::Failed;
        Self::store_swap(env, &swap)?;

        Ok(())
    }

    /// Emergency withdrawal for stuck transactions
    pub fn emergency_withdraw(
        env: &Env,
        transaction_id: u64,
        admin: &Address,
        reason: &Bytes,
    ) -> Result<(), SettlementError> {
        // This would check admin permissions
        let swap = Self::get_swap_by_transaction(env, transaction_id)?;

        // Log emergency withdrawal
        // In production, this would have proper admin checks

        Self::refund_escrow_holdings(env, &swap)?;

        // Emit emergency withdrawal event
        let event = crate::events::EmergencyWithdrawalEvent {
            transaction_id,
            admin: admin.clone(),
            reason: reason.clone(),
            timestamp: env.ledger().timestamp(),
        };
        crate::events::emit_emergency_withdrawal(env, event);

        Ok(())
    }

    /// Internal: Transfer assets to escrow
    fn transfer_to_escrow(
        env: &Env,
        from: &Address,
        asset: &Asset,
        amount: i128,
        is_nft: bool,
    ) -> Result<(), SettlementError> {
        if is_nft {
            // The token still belongs to `from`, who authorized the enclosing
            // marketplace call, so authorize as them: the NFT contract only
            // accepts an owner or an approved operator as the caller.
            asset_utils::transfer_nft_from(
                &asset.contract,
                from,
                from,
                &env.current_contract_address(),
                amount as u64,
                env,
            )?;
        } else {
            // Transfer tokens to escrow contract
            asset_utils::transfer_tokens(
                &asset.contract,
                from,
                &env.current_contract_address(),
                amount,
                env,
            )?;
        }
        Ok(())
    }

    /// Internal: Transfer assets from escrow to recipient
    fn transfer_from_escrow(
        env: &Env,
        to: &Address,
        asset: &Asset,
        amount: i128,
        is_nft: bool,
    ) -> Result<(), SettlementError> {
        if is_nft {
            asset_utils::transfer_nft(
                &asset.contract,
                &env.current_contract_address(),
                to,
                amount as u64,
                env,
            )?;
        } else {
            asset_utils::transfer_tokens(
                &asset.contract,
                &env.current_contract_address(),
                to,
                amount,
                env,
            )?;
        }
        Ok(())
    }

    /// Internal: Perform the actual atomic swap
    /// Internal: move the NFT leg of the swap out of escrow.
    ///
    /// The payment leg is deliberately left in the contract. Moving it to the
    /// seller here would pay the creator and the platform out of the
    /// contract's own balance, because the creator/seller/platform split is
    /// performed afterwards by `RoyaltyDistributor::distribute_royalties` out
    /// of the escrowed payment.
    fn perform_atomic_swap(env: &Env, swap: &AtomicSwap) -> Result<(), SettlementError> {
        let buyer = swap.buyer.clone().ok_or(SettlementError::NotFound)?;

        for holding in swap.seller_escrow.iter() {
            if holding.is_nft {
                Self::transfer_from_escrow(
                    env,
                    &buyer,
                    &holding.asset,
                    holding.amount,
                    holding.is_nft,
                )?;
            }
        }

        Ok(())
    }

    /// Internal: Refund all escrow holdings
    fn refund_escrow_holdings(env: &Env, swap: &AtomicSwap) -> Result<(), SettlementError> {
        // Refund seller escrow
        for holding in swap.seller_escrow.iter() {
            Self::transfer_from_escrow(
                env,
                &holding.holder,
                &holding.asset,
                holding.amount,
                holding.is_nft,
            )?;
        }

        // Refund buyer escrow
        for holding in swap.buyer_escrow.iter() {
            Self::transfer_from_escrow(
                env,
                &holding.holder,
                &holding.asset,
                holding.amount,
                holding.is_nft,
            )?;
        }

        Ok(())
    }

    /// Internal: Update escrow holding after deposit
    fn update_escrow_holding(
        env: &Env,
        swap: &mut AtomicSwap,
        depositor: &Address,
        asset: &Asset,
        amount: i128,
        is_nft: bool,
    ) -> Result<(), SettlementError> {
        let timestamp = env.ledger().timestamp();

        // Update seller escrow
        for i in 0..swap.seller_escrow.len() {
            if let Some(mut holding) = swap.seller_escrow.get(i) {
                if holding.holder == *depositor && holding.asset.contract == asset.contract {
                    holding.deposited = true;
                    holding.deposited_at = timestamp;
                    holding.amount = amount;
                    swap.seller_escrow.set(i, holding);
                    return Ok(());
                }
            }
        }

        // Update buyer escrow
        for i in 0..swap.buyer_escrow.len() {
            if let Some(mut holding) = swap.buyer_escrow.get(i) {
                if holding.holder == *depositor && holding.asset.contract == asset.contract {
                    holding.deposited = true;
                    holding.deposited_at = timestamp;
                    holding.amount = amount;
                    swap.buyer_escrow.set(i, holding);
                    return Ok(());
                }
            }
        }

        // First deposit from this party: record a new holding so the escrow
        // ledger matches what the contract actually holds. The NFT side is the
        // seller's, the payment side is the buyer's.
        let holding = EscrowHolding {
            transaction_id: swap.transaction_id,
            holder: depositor.clone(),
            asset: asset.clone(),
            amount,
            is_nft,
            deposited: true,
            deposited_at: timestamp,
            released_at: None,
        };
        if is_nft {
            swap.seller_escrow.push_back(holding);
        } else {
            swap.buyer_escrow.push_back(holding);
        }

        Ok(())
    }

    /// Internal: Update swap state based on escrow status
    fn update_swap_state(_env: &Env, swap: &mut AtomicSwap) -> Result<(), SettlementError> {
        // `all()` is vacuously true for an empty escrow, which would report a
        // side as funded before anything had been deposited.
        let seller_funded =
            !swap.seller_escrow.is_empty() && swap.seller_escrow.iter().all(|h| h.deposited);
        let buyer_funded =
            !swap.buyer_escrow.is_empty() && swap.buyer_escrow.iter().all(|h| h.deposited);

        match (seller_funded, buyer_funded) {
            (true, false) => swap.state = SwapState::SellerFunded,
            (false, true) => swap.state = SwapState::BuyerFunded,
            (true, true) => swap.state = SwapState::Ready,
            (false, false) => swap.state = SwapState::Pending,
        }

        Ok(())
    }

    /// Internal: Store atomic swap
    fn store_swap(env: &Env, swap: &AtomicSwap) -> Result<(), SettlementError> {
        ttl::set(env, &EscrowKey::Swap(swap.transaction_id), swap);
        Ok(())
    }

    /// Get swap by transaction ID (public for cross-module use)
    pub fn get_swap_by_transaction(
        env: &Env,
        transaction_id: u64,
    ) -> Result<AtomicSwap, SettlementError> {
        ttl::get(env, &EscrowKey::Swap(transaction_id)).ok_or(SettlementError::NotFound)
    }
}

/// Escrow manager for individual holdings
pub struct EscrowManager;

impl EscrowManager {
    /// Check escrow balance for a transaction
    pub fn check_escrow_balance(
        env: &Env,
        transaction_id: u64,
        asset: &Asset,
    ) -> Result<i128, SettlementError> {
        use crate::atomic_swap::AtomicSwapEngine;
        let swap = AtomicSwapEngine::get_swap_by_transaction(env, transaction_id)?;

        // Sum holdings matching the requested asset across both escrow sides
        let mut total: i128 = 0;
        for holding in swap.seller_escrow.iter() {
            if holding.asset.contract == asset.contract {
                total = total.saturating_add(holding.amount);
            }
        }
        for holding in swap.buyer_escrow.iter() {
            if holding.asset.contract == asset.contract {
                total = total.saturating_add(holding.amount);
            }
        }

        Ok(total)
    }

    /// Release escrow to specific address
    pub fn release_escrow(
        env: &Env,
        _transaction_id: u64,
        to: &Address,
        asset: &Asset,
        amount: i128,
    ) -> Result<(), SettlementError> {
        // Transfer from escrow to recipient
        asset_utils::transfer_tokens(
            &asset.contract,
            &env.current_contract_address(),
            to,
            amount,
            env,
        )
    }

    /// Get escrow holdings for a transaction
    pub fn get_escrow_holdings(env: &Env, transaction_id: u64) -> Vec<EscrowHolding> {
        use crate::atomic_swap::AtomicSwapEngine;
        match AtomicSwapEngine::get_swap_by_transaction(env, transaction_id) {
            Ok(swap) => {
                let mut holdings = Vec::new(env);
                for h in swap.seller_escrow.iter() {
                    holdings.push_back(h);
                }
                for h in swap.buyer_escrow.iter() {
                    holdings.push_back(h);
                }
                holdings
            }
            Err(_) => Vec::new(env),
        }
    }
}
