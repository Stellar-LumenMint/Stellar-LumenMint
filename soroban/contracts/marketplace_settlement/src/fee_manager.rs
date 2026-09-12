use crate::error::SettlementError;
use crate::events::{
    emit_fee_config_initialized, emit_platform_fees_collected, FeeConfigInitializedEvent,
    PlatformFeesCollectedEvent,
};
use crate::ttl;
use crate::types::{Asset, FeeConfig, VolumeTier};
use crate::utils::math_utils;
use soroban_sdk::{contracttype, symbol_short, Address, Env, Symbol, Vec};

// Storage keys
const FEE_CONFIG: Symbol = symbol_short!("fee_cfg");
const FEE_CONFIG_INITIALIZED: Symbol = symbol_short!("fee_initd");

/// Storage key for a single fee ledger entry.
///
/// Accumulated fees and per-user trade volume were two `Map<...>` values in
/// instance storage, so every settled trade rewrote the whole fee ledger and
/// every account that ever traded. The per-user map grew with the user base
/// with no ceiling, on an entry that already holds the admin config. Each
/// balance now has its own persistent entry.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum FeeKey {
    Accumulated(Asset),
    UserVolume(Address),
}

/// Fee manager for handling platform fees and fee distribution
pub struct FeeManager;

impl FeeManager {
    /// Calculate fee for a transaction
    pub fn calculate_fee(
        env: &Env,
        transaction_amount: i128,
        user: &Address,
    ) -> Result<i128, SettlementError> {
        let fee_config = Self::get_fee_config(env)?;

        if !fee_config.dynamic_fee_enabled {
            // Simple fee calculation
            return math_utils::calculate_fee(
                transaction_amount,
                fee_config.platform_fee_bps,
                fee_config.minimum_fee,
                fee_config.maximum_fee,
                env,
            );
        }

        // Dynamic fee calculation based on user volume
        Self::calculate_dynamic_fee(env, transaction_amount, user, &fee_config)
    }

    /// Calculate dynamic fee based on user trading volume
    fn calculate_dynamic_fee(
        env: &Env,
        transaction_amount: i128,
        user: &Address,
        fee_config: &FeeConfig,
    ) -> Result<i128, SettlementError> {
        let user_volume = Self::get_user_volume(env, user)?;
        let discount_bps: u64 =
            Self::calculate_volume_discount(user_volume, &fee_config.volume_discounts)?;

        // Apply discount to base fee
        let discounted_fee_bps = fee_config.platform_fee_bps.saturating_sub(discount_bps);

        // Check for VIP exemptions
        if fee_config.vip_exemptions.contains(user.clone()) {
            return Ok(0);
        }

        math_utils::calculate_fee(
            transaction_amount,
            discounted_fee_bps,
            fee_config.minimum_fee,
            fee_config.maximum_fee,
            env,
        )
    }

    /// Collect platform fee
    pub fn collect_platform_fee(
        env: &Env,
        amount: i128,
        asset: &Asset,
        collector: &Address,
    ) -> Result<(), SettlementError> {
        // Add to accumulated fees
        let current_amount = Self::get_accumulated_fees(env, asset);
        let new_amount = math_utils::safe_add(current_amount, amount, env)?;
        ttl::set(env, &FeeKey::Accumulated(asset.clone()), &new_amount);

        // Update user volume for dynamic fees
        Self::update_user_volume(env, collector, amount)?;

        // Emit fee collection event
        let event = PlatformFeesCollectedEvent {
            amount,
            currency: asset.clone(),
            collector: collector.clone(),
            timestamp: env.ledger().timestamp(),
        };
        emit_platform_fees_collected(env, event);

        Ok(())
    }

    /// Record a user's trade volume for dynamic fee tiers without changing the
    /// withdrawable fee balance.
    ///
    /// Used when the platform's share of a sale was already paid out directly
    /// by the royalty distribution. Adding it to the accumulated balance as
    /// well would let `withdraw_platform_fees` pay the platform twice for the
    /// same trade, out of funds escrowed for other transactions.
    pub fn record_platform_volume(
        env: &Env,
        user: &Address,
        amount: i128,
    ) -> Result<(), SettlementError> {
        Self::update_user_volume(env, user, amount)
    }

    /// Withdraw accumulated platform fees
    pub fn withdraw_platform_fees(
        env: &Env,
        asset: &Asset,
        recipient: &Address,
        admin: &Address,
    ) -> Result<i128, SettlementError> {
        let fee_config = Self::get_fee_config(env)?;

        // Check admin authorization
        if fee_config.fee_recipient != *admin {
            return Err(SettlementError::Unauthorized);
        }

        let amount = Self::get_accumulated_fees(env, asset);

        if amount <= 0 {
            return Err(SettlementError::InsufficientFunds);
        }

        // Transfer fees to recipient
        crate::utils::asset_utils::transfer_tokens(
            &asset.contract,
            &env.current_contract_address(),
            recipient,
            amount,
            env,
        )?;

        // Reset accumulated fees
        ttl::set(env, &FeeKey::Accumulated(asset.clone()), &0i128);

        Ok(amount)
    }

    /// Initialize fee configuration exactly once at deployment.
    /// Subsequent calls return FeeAlreadyInitialized.
    pub fn initialize_fee_config(
        env: &Env,
        config: &FeeConfig,
        initializer: &Address,
    ) -> Result<(), SettlementError> {
        if env.storage().instance().has(&FEE_CONFIG_INITIALIZED) {
            return Err(SettlementError::FeeAlreadyInitialized);
        }

        Self::validate_fee_config(config)?;

        env.storage().instance().set(&FEE_CONFIG, config);
        env.storage().instance().set(&FEE_CONFIG_INITIALIZED, &true);

        emit_fee_config_initialized(
            env,
            FeeConfigInitializedEvent {
                config: config.clone(),
                initialized_by: initializer.clone(),
                timestamp: env.ledger().timestamp(),
            },
        );

        Ok(())
    }

    /// Update fee configuration
    pub fn update_fee_config(
        env: &Env,
        new_config: &FeeConfig,
        admin: &Address,
    ) -> Result<(), SettlementError> {
        // Validate fee configuration
        Self::validate_fee_config(new_config)?;

        env.storage().instance().set(&FEE_CONFIG, new_config);

        // Emit configuration update event
        crate::events::emit_fee_config_updated(
            env,
            crate::events::FeeConfigUpdatedEvent {
                new_config: new_config.clone(),
                updated_by: admin.clone(),
                timestamp: env.ledger().timestamp(),
            },
        );

        Ok(())
    }

    /// Get current fee configuration
    pub fn get_fee_config(env: &Env) -> Result<FeeConfig, SettlementError> {
        env.storage()
            .instance()
            .get(&FEE_CONFIG)
            .ok_or(SettlementError::NotFound)
    }

    /// Add VIP exemption
    pub fn add_vip_exemption(
        env: &Env,
        user: &Address,
        admin: &Address,
    ) -> Result<(), SettlementError> {
        let mut fee_config = Self::get_fee_config(env)?;
        // Check admin permissions here

        if !fee_config.vip_exemptions.contains(user.clone()) {
            fee_config.vip_exemptions.push_back(user.clone());
            Self::update_fee_config(env, &fee_config, admin)?;
        }

        Ok(())
    }

    /// Remove VIP exemption
    pub fn remove_vip_exemption(
        env: &Env,
        user: &Address,
        admin: &Address,
    ) -> Result<(), SettlementError> {
        let mut fee_config = Self::get_fee_config(env)?;
        // Check admin permissions here

        let mut new_exemptions = Vec::new(env);
        for exemption in fee_config.vip_exemptions.iter() {
            if exemption != *user {
                new_exemptions.push_back(exemption);
            }
        }

        fee_config.vip_exemptions = new_exemptions;
        Self::update_fee_config(env, &fee_config, admin)?;

        Ok(())
    }

    /// Get accumulated fees for an asset
    pub fn get_accumulated_fees(env: &Env, asset: &Asset) -> i128 {
        ttl::get(env, &FeeKey::Accumulated(asset.clone())).unwrap_or(0)
    }

    /// Get user trading volume
    pub fn get_user_volume(env: &Env, user: &Address) -> Result<i128, SettlementError> {
        Ok(ttl::get(env, &FeeKey::UserVolume(user.clone())).unwrap_or(0))
    }

    /// Calculate volume-based discount
    fn calculate_volume_discount(
        volume: i128,
        tiers: &Vec<VolumeTier>,
    ) -> Result<u64, SettlementError> {
        for tier in tiers.iter() {
            if volume >= tier.min_volume {
                return Ok(tier.fee_discount_bps);
            }
        }
        Ok(0)
    }

    /// Update user trading volume
    fn update_user_volume(env: &Env, user: &Address, amount: i128) -> Result<(), SettlementError> {
        let current_volume = Self::get_user_volume(env, user)?;
        let new_volume = math_utils::safe_add(current_volume, amount, env)?;
        ttl::set(env, &FeeKey::UserVolume(user.clone()), &new_volume);
        Ok(())
    }

    /// Validate fee configuration
    fn validate_fee_config(config: &FeeConfig) -> Result<(), SettlementError> {
        // Validate percentages
        if config.platform_fee_bps > 10000 {
            return Err(SettlementError::InvalidFeeConfig);
        }

        // Validate minimum < maximum if maximum is set
        if config.maximum_fee > 0 && config.minimum_fee >= config.maximum_fee {
            return Err(SettlementError::InvalidFeeConfig);
        }

        // Validate volume tiers are ordered correctly
        let mut prev_volume = 0i128;
        for tier in config.volume_discounts.iter() {
            if tier.min_volume <= prev_volume {
                return Err(SettlementError::InvalidFeeConfig);
            }
            if tier.fee_discount_bps > config.platform_fee_bps {
                return Err(SettlementError::InvalidFeeConfig);
            }
            prev_volume = tier.min_volume;
        }

        Ok(())
    }

    /// Reset user volume (admin function)
    pub fn reset_user_volume(
        env: &Env,
        user: &Address,
        _admin: &Address,
    ) -> Result<(), SettlementError> {
        ttl::set(env, &FeeKey::UserVolume(user.clone()), &0i128);
        Ok(())
    }
}

/// Fee calculator for complex fee structures
pub struct FeeCalculator;

impl FeeCalculator {
    /// Calculate tiered fees based on transaction size
    pub fn calculate_tiered_fee(
        env: &Env,
        amount: i128,
        tiers: &Vec<(i128, u64)>, // (min_amount, fee_bps)
    ) -> Result<i128, SettlementError> {
        for (min_amount, fee_bps) in tiers.iter() {
            if amount >= min_amount {
                return math_utils::calculate_percentage(amount, fee_bps, env);
            }
        }
        Ok(0)
    }

    /// Calculate time-based fees (lower fees during certain hours)
    pub fn calculate_time_based_fee(
        env: &Env,
        base_fee: i128,
        current_hour: u64,
    ) -> Result<i128, SettlementError> {
        // Lower fees during off-peak hours (e.g., 2-6 AM)
        let discount = if (2..=6).contains(&current_hour) {
            25 // 25% discount
        } else {
            0
        };

        let discount_amount = math_utils::calculate_percentage(base_fee, discount, env)?;
        math_utils::safe_sub(base_fee, discount_amount, env)
    }

    /// Calculate bundle fees (discounts for multiple items)
    pub fn calculate_bundle_fee(
        env: &Env,
        individual_fees: &Vec<i128>,
        bundle_discount_bps: u64,
    ) -> Result<i128, SettlementError> {
        let mut total_fee = 0i128;
        for fee in individual_fees.iter() {
            total_fee = math_utils::safe_add(total_fee, fee, env)?;
        }

        let discount = math_utils::calculate_percentage(total_fee, bundle_discount_bps, env)?;
        math_utils::safe_sub(total_fee, discount, env)
    }
}
