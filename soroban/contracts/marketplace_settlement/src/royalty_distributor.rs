use crate::error::SettlementError;
use crate::events::{emit_royalties_distributed, RoyaltiesDistributedEvent};
use crate::ttl;
use crate::types::{AdminConfig, Asset, DistributionResult, NFTItem, RoyaltyDistribution};
use crate::utils::asset_utils;
use crate::utils::math_utils;
use soroban_sdk::{contracttype, symbol_short, Address, Env, Map, Vec};

/// Storage key for a single NFT's royalty configuration.
///
/// This used to be a `Bytes` value produced by a helper that ignored both of
/// its arguments and always returned an empty `Bytes`. Every NFT therefore
/// shared one map slot: configuring royalties for token N silently rewrote the
/// configuration for every other token, and `get_royalty_info` returned
/// whichever token was configured last. Making the key an explicit enum that
/// carries the contract address and token id removes that ambiguity at the
/// type level.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RoyaltyKey {
    Config(Address, u64),
}

/// Royalty information for an NFT
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoyaltyInfo {
    pub nft_contract: Address,
    pub token_id: u64,
    pub creator: Address,
    pub royalty_percentage: u64, // Basis points (10000 = 100%)
    pub last_updated: u64,
}

/// Royalty distributor for handling royalty payments
pub struct RoyaltyDistributor;

impl RoyaltyDistributor {
    /// Resolve the royalty configuration for an NFT, falling back to a
    /// zero-percentage configuration when none has been recorded.
    ///
    /// Royalties are opt-in: an NFT whose creator never configured a royalty
    /// must still be sellable, with the whole sale price flowing through the
    /// normal seller/platform split. Treating "unconfigured" as an error — as
    /// the previous `get_royalty_info(...)?` call did — meant `create_sale`
    /// reverted for every token on a fresh deployment.
    pub fn resolve_royalty_info(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        default_creator: &Address,
    ) -> RoyaltyInfo {
        Self::get_royalty_info(env, nft_contract, token_id).unwrap_or(RoyaltyInfo {
            nft_contract: nft_contract.clone(),
            token_id,
            creator: default_creator.clone(),
            royalty_percentage: 0,
            last_updated: 0,
        })
    }

    /// Calculate royalties for an NFT sale.
    ///
    /// The creator's royalty comes out of the full sale price. The platform
    /// fee — an amount the caller resolved through `FeeManager`, which owns the
    /// configured basis points, the min/max bounds and the volume discounts —
    /// comes out of the remainder, and the seller receives what is left. The
    /// three shares always sum to exactly `sale_price`, which
    /// `validate_royalty_distribution` re-checks before a single transfer is
    /// attempted.
    #[allow(clippy::too_many_arguments)]
    pub fn calculate_royalties(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        sale_price: i128,
        seller: &Address,
        platform_address: &Address,
        platform_fee: i128,
    ) -> Result<RoyaltyDistribution, SettlementError> {
        let royalty_info = Self::resolve_royalty_info(env, nft_contract, token_id, seller);

        // Calculate royalty amount on full sale price (rounds in creator's favor via half-up)
        let royalty_amount =
            math_utils::calculate_percentage(sale_price, royalty_info.royalty_percentage, env)?;

        // Post-royalty remainder: seller and platform split only this amount
        let remainder = math_utils::safe_sub(sale_price, royalty_amount, env)?;

        // A negative fee is meaningless, and one larger than the remainder
        // would drive the seller's share below zero; clamp into [0, remainder]
        // so the distribution can never exceed the amount actually escrowed.
        let platform_amount = if platform_fee < 0 {
            0
        } else if platform_fee > remainder {
            remainder
        } else {
            platform_fee
        };
        let seller_amount = math_utils::safe_sub(remainder, platform_amount, env)?;

        // Kept for reporting only; derived from the settled amounts so the
        // percentages always describe the distribution that was built.
        let platform_percentage = if sale_price > 0 {
            ((platform_amount * 10_000) / sale_price) as u64
        } else {
            0
        };
        let seller_percentage = if sale_price > 0 {
            ((seller_amount * 10_000) / sale_price) as u64
        } else {
            0
        };

        // A creator is frequently also the seller, and the platform recipient
        // can be either. Accumulate per address: overwriting would drop an
        // earlier share, the map would no longer sum to the sale price, and
        // `validate_royalty_distribution` would reject the whole sale.
        let mut amounts = Map::new(env);
        Self::add_amount(&mut amounts, &royalty_info.creator, royalty_amount);
        Self::add_amount(&mut amounts, seller, seller_amount);
        Self::add_amount(&mut amounts, platform_address, platform_amount);

        Ok(RoyaltyDistribution {
            creator_address: royalty_info.creator,
            creator_percentage: royalty_info.royalty_percentage,
            seller_address: seller.clone(),
            seller_percentage,
            platform_address: platform_address.clone(),
            platform_percentage,
            total_amount: sale_price,
            amounts,
        })
    }

    /// Add `amount` to a recipient's existing share, if they already have one.
    fn add_amount(amounts: &mut Map<Address, i128>, recipient: &Address, amount: i128) {
        let existing = amounts.get(recipient.clone()).unwrap_or(0);
        amounts.set(recipient.clone(), existing + amount);
    }

    /// Distribute royalties for a transaction.
    /// Validates the distribution sums to total before any transfer.
    /// Fails the entire transaction if any individual transfer fails.
    pub fn distribute_royalties(
        env: &Env,
        transaction_id: u64,
        royalty_distribution: &RoyaltyDistribution,
        payment_asset: &Asset,
    ) -> Result<DistributionResult, SettlementError> {
        // Validate distribution sums before any transfer
        Self::validate_royalty_distribution(env, royalty_distribution)?;

        let mut total_distributed = 0i128;

        // Distribute to each recipient — fail entire tx if any transfer fails
        for (recipient, amount) in royalty_distribution.amounts.iter() {
            asset_utils::transfer_tokens(
                &payment_asset.contract,
                &env.current_contract_address(),
                &recipient,
                amount,
                env,
            )?;
            total_distributed = math_utils::safe_add(total_distributed, amount, env)?;
        }

        // Look up amounts from the distribution map using stored addresses
        let creator_amount = royalty_distribution
            .amounts
            .get(royalty_distribution.creator_address.clone())
            .unwrap_or(0);
        let seller_amount = royalty_distribution
            .amounts
            .get(royalty_distribution.seller_address.clone())
            .unwrap_or(0);
        let platform_amount = royalty_distribution
            .amounts
            .get(royalty_distribution.platform_address.clone())
            .unwrap_or(0);

        let result = DistributionResult {
            transaction_id,
            total_amount: royalty_distribution.total_amount,
            creator_amount,
            seller_amount,
            platform_amount,
            distribution_success: true,
            timestamp: env.ledger().timestamp(),
        };

        // Emit distribution event
        let event = RoyaltiesDistributedEvent {
            transaction_id,
            nft_address: royalty_distribution.creator_address.clone(),
            token_id: 0,
            creator: royalty_distribution.creator_address.clone(),
            creator_amount,
            seller_amount,
            platform_amount,
            total_amount: result.total_amount,
            timestamp: result.timestamp,
        };
        emit_royalties_distributed(env, event);

        Ok(result)
    }

    /// Maximum royalty a creator may charge, in basis points (50%).
    pub const MAX_ROYALTY_BPS: u64 = 5000;

    /// Assert that `setter` is allowed to configure royalties for `token_id`.
    ///
    /// The previous implementation ignored its `setter` argument entirely, so
    /// any account could designate itself (or anyone else) as the royalty
    /// recipient for any token. That is a first-come land grab on a value that
    /// is paid out of every future sale, so it has to be anchored to a real
    /// claim on the token.
    ///
    /// Two principals qualify:
    /// * the token's **current owner**, resolved through the NFT contract —
    ///   the same authority that can move the token, and
    /// * the **marketplace admin**, so a misconfigured record can be repaired
    ///   without holding the owner's key.
    fn assert_can_configure(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        setter: &Address,
    ) -> Result<(), SettlementError> {
        if let Some(admin_config) = env
            .storage()
            .instance()
            .get::<_, AdminConfig>(&symbol_short!("admin_cfg"))
        {
            if admin_config.admin == *setter {
                return Ok(());
            }
        }

        match asset_utils::try_owner_of(nft_contract, token_id, env) {
            Some(owner) if owner == *setter => Ok(()),
            _ => Err(SettlementError::Unauthorized),
        }
    }

    /// Set royalty information for an NFT.
    ///
    /// `setter` must authorize the call and must be the token's current owner
    /// or the marketplace admin; see [`Self::assert_can_configure`].
    pub fn set_royalty_info(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        creator: &Address,
        royalty_percentage: u64,
        setter: &Address,
    ) -> Result<(), SettlementError> {
        setter.require_auth();
        Self::assert_can_configure(env, nft_contract, token_id, setter)?;

        // Validate royalty percentage (max 50%)
        if royalty_percentage > Self::MAX_ROYALTY_BPS {
            return Err(SettlementError::InvalidRoyaltyPercentage);
        }

        let royalty_info = RoyaltyInfo {
            nft_contract: nft_contract.clone(),
            token_id,
            creator: creator.clone(),
            royalty_percentage,
            last_updated: env.ledger().timestamp(),
        };

        Self::store_royalty_info(env, &royalty_info)?;
        Ok(())
    }

    /// Get royalty information for an NFT
    pub fn get_royalty_info(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
    ) -> Result<RoyaltyInfo, SettlementError> {
        ttl::get(env, &RoyaltyKey::Config(nft_contract.clone(), token_id))
            .ok_or(SettlementError::NotFound)
    }

    /// Update royalty percentage for an NFT
    pub fn update_royalty_percentage(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        new_percentage: u64,
        updater: &Address,
    ) -> Result<(), SettlementError> {
        // Authorize before reading: a rejected update should not leak the
        // current configuration to an unauthorized caller.
        updater.require_auth();

        let mut royalty_info = Self::get_royalty_info(env, nft_contract, token_id)?;

        // Only the recorded creator may change the percentage. (The admin has
        // `set_royalty_info` for repairs, which can also change the recipient.)
        if royalty_info.creator != *updater {
            return Err(SettlementError::Unauthorized);
        }

        // Validate new percentage
        if new_percentage > Self::MAX_ROYALTY_BPS {
            return Err(SettlementError::InvalidRoyaltyPercentage);
        }

        royalty_info.royalty_percentage = new_percentage;
        royalty_info.last_updated = env.ledger().timestamp();

        Self::store_royalty_info(env, &royalty_info)?;
        Ok(())
    }

    /// Calculate the royalty distribution for a multi-item bundle.
    ///
    /// Each item is valued at an equal share of `total_price`, and the
    /// creator's royalty is computed on that share and aggregated per creator,
    /// so a creator holding several items in the bundle is paid once. The
    /// platform fee is the amount the caller resolved through `FeeManager` —
    /// the same authority `calculate_royalties` uses; the function this
    /// replaces hardcoded 5% and ignored the configured fee. The seller absorbs
    /// the rounding residue, so the shares always sum to exactly `total_price`.
    pub fn calculate_bundle_royalties(
        env: &Env,
        items: &Vec<NFTItem>,
        total_price: i128,
        seller: &Address,
        platform_address: &Address,
        platform_fee: i128,
    ) -> Result<RoyaltyDistribution, SettlementError> {
        if items.is_empty() {
            return Err(SettlementError::InvalidAmount);
        }

        let item_count = items.len() as i128;
        let mut total_royalty_amount = 0i128;
        let mut amounts = Map::new(env);

        for item in items.iter() {
            let share = math_utils::safe_div(total_price, item_count, env)?;
            let royalty_info =
                Self::resolve_royalty_info(env, &item.nft_address, item.token_id, seller);
            let royalty_amount =
                math_utils::calculate_percentage(share, royalty_info.royalty_percentage, env)?;
            Self::add_amount(&mut amounts, &royalty_info.creator, royalty_amount);
            total_royalty_amount = math_utils::safe_add(total_royalty_amount, royalty_amount, env)?;
        }

        let remainder = math_utils::safe_sub(total_price, total_royalty_amount, env)?;
        let platform_amount = if platform_fee < 0 {
            0
        } else if platform_fee > remainder {
            remainder
        } else {
            platform_fee
        };
        let seller_amount = math_utils::safe_sub(remainder, platform_amount, env)?;

        Self::add_amount(&mut amounts, seller, seller_amount);
        Self::add_amount(&mut amounts, platform_address, platform_amount);

        let platform_percentage = if total_price > 0 {
            ((platform_amount * 10_000) / total_price) as u64
        } else {
            0
        };
        let seller_percentage = if total_price > 0 {
            ((seller_amount * 10_000) / total_price) as u64
        } else {
            0
        };

        Ok(RoyaltyDistribution {
            creator_address: seller.clone(), // Fallback — creators are listed in `amounts`
            creator_percentage: 0,
            seller_address: seller.clone(),
            seller_percentage,
            platform_address: platform_address.clone(),
            platform_percentage,
            total_amount: total_price,
            amounts,
        })
    }

    /// Validate royalty distribution adds up correctly
    pub fn validate_royalty_distribution(
        env: &Env,
        distribution: &RoyaltyDistribution,
    ) -> Result<(), SettlementError> {
        let mut total_distributed = 0i128;

        for (_, amount) in distribution.amounts.iter() {
            total_distributed = math_utils::safe_add(total_distributed, amount, env)?;
        }

        if total_distributed != distribution.total_amount {
            return Err(SettlementError::InvalidAmount);
        }

        Ok(())
    }

    /// Get royalty history for an NFT
    pub fn get_royalty_history(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
    ) -> Vec<RoyaltyInfo> {
        // This would store historical royalty information
        // For now, just return current
        match Self::get_royalty_info(env, nft_contract, token_id) {
            Ok(info) => {
                let mut result = Vec::new(env);
                result.push_back(info);
                result
            }
            Err(_) => Vec::new(env),
        }
    }

    /// Bulk set royalties for multiple NFTs
    pub fn bulk_set_royalties(
        env: &Env,
        nft_contract: &Address,
        token_ids: &Vec<u64>,
        creator: &Address,
        royalty_percentage: u64,
        setter: &Address,
    ) -> Result<(), SettlementError> {
        for token_id in token_ids.iter() {
            Self::set_royalty_info(
                env,
                nft_contract,
                token_id,
                creator,
                royalty_percentage,
                setter,
            )?;
        }
        Ok(())
    }

    /// Internal: Store royalty information under the token's own key.
    ///
    /// Persistent storage rather than one instance-level map: royalty configs
    /// are per-token and are read on every listing/settlement, so they must
    /// neither contend for the instance entry's size limit nor be rewritten in
    /// full on each update.
    fn store_royalty_info(env: &Env, royalty_info: &RoyaltyInfo) -> Result<(), SettlementError> {
        ttl::set(
            env,
            &RoyaltyKey::Config(royalty_info.nft_contract.clone(), royalty_info.token_id),
            royalty_info,
        );
        Ok(())
    }
}

/// Royalty enforcement for ensuring royalties are paid
pub struct RoyaltyEnforcer;

impl RoyaltyEnforcer {
    /// Enforce royalty payment before transfer
    pub fn enforce_royalty_payment(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        sale_price: i128,
        _payment_asset: &Asset,
        seller: &Address,
        platform_address: &Address,
        platform_fee: i128,
    ) -> Result<(), SettlementError> {
        let royalty_distribution = RoyaltyDistributor::calculate_royalties(
            env,
            nft_contract,
            token_id,
            sale_price,
            seller,
            platform_address,
            platform_fee,
        )?;

        // Check if sufficient funds are available for royalties
        let royalty_amount = math_utils::calculate_percentage(
            sale_price,
            royalty_distribution.creator_percentage,
            env,
        )?;

        // Verify payment can cover royalties
        if sale_price < royalty_amount {
            return Err(SettlementError::InsufficientFunds);
        }

        Ok(())
    }

    /// Verify royalty payment was made
    pub fn verify_royalty_payment(
        _env: &Env,
        _transaction_id: u64,
        _expected_distribution: &RoyaltyDistribution,
    ) -> Result<bool, SettlementError> {
        // This would check if royalties were actually distributed
        // For now, return true
        Ok(true)
    }

    /// Calculate minimum price needed to cover royalties
    pub fn calculate_minimum_price(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        desired_net_amount: i128,
    ) -> Result<i128, SettlementError> {
        let royalty_info = RoyaltyDistributor::get_royalty_info(env, nft_contract, token_id)?;

        // Price = desired_net_amount / (1 - royalty_percentage)
        let royalty_decimal = royalty_info.royalty_percentage as i128;
        let denominator = math_utils::safe_sub(10000, royalty_decimal, env)?;
        let price = math_utils::safe_div(
            math_utils::safe_mul(desired_net_amount, 10000, env)?,
            denominator,
            env,
        )?;

        Ok(price)
    }
}
