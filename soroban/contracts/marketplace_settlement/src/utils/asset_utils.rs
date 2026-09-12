use crate::error::SettlementError;
use crate::storage::allowlist_store::AllowlistStore;
use crate::types::Asset;
use soroban_sdk::{Address, Env, IntoVal, Symbol, Vec};

/// Validate that an asset is supported
pub fn validate_asset(
    asset: &Asset,
    _supported_assets: &Vec<Asset>,
    env: &Env,
) -> Result<(), SettlementError> {
    if !AllowlistStore::is_token_allowed(env, &asset.contract) {
        return Err(SettlementError::AssetNotSupported);
    }
    Ok(())
}

/// Check if two assets are the same
pub fn assets_equal(a: &Asset, b: &Asset) -> bool {
    a.contract == b.contract
}

/// Get asset symbol for display purposes
pub fn get_asset_symbol(asset: &Asset, _env: &Env) -> Symbol {
    asset.symbol.clone()
}

/// Validate payment amount for an asset
pub fn validate_payment_amount(amount: i128, min_amount: i128) -> Result<(), SettlementError> {
    if amount <= 0 {
        return Err(SettlementError::InvalidAmount);
    }
    if amount < min_amount {
        return Err(SettlementError::InsufficientPayment);
    }

    Ok(())
}

/// Calculate asset transfer amount after fees
pub fn calculate_transfer_amount(
    total_amount: i128,
    fee_amount: i128,
    env: &Env,
) -> Result<i128, SettlementError> {
    use crate::utils::math_utils::safe_sub;
    safe_sub(total_amount, fee_amount, env)
}

/// Check if an address is a valid token contract
pub fn is_valid_token_contract(address: &Address, env: &Env) -> bool {
    AllowlistStore::is_token_allowed(env, address)
}

/// Get token balance for an account
pub fn get_token_balance(
    token_contract: &Address,
    account: &Address,
    env: &Env,
) -> Result<i128, SettlementError> {
    env.try_invoke_contract::<i128, SettlementError>(
        token_contract,
        &Symbol::new(env, "balance"),
        soroban_sdk::vec![env, account.into_val(env)],
    )
    .map_err(|_| SettlementError::PaymentFailed)?
    .map_err(|_| SettlementError::PaymentFailed)
}

/// Transfer tokens between accounts, reporting a refused transfer as
/// [`SettlementError::PaymentFailed`].
///
/// The token call is made with `try_invoke_contract` rather than through
/// `token::Client` so a token that rejects the transfer (paused asset contract,
/// insufficient balance, frozen trustline) surfaces as a typed error instead of
/// aborting the invocation with the token's own error. Either way the caller's
/// transaction is rolled back; the difference is that the failure is now
/// attributable to the payment leg.
pub fn transfer_tokens(
    token_contract: &Address,
    from: &Address,
    to: &Address,
    amount: i128,
    env: &Env,
) -> Result<(), SettlementError> {
    env.try_invoke_contract::<(), SettlementError>(
        token_contract,
        &Symbol::new(env, "transfer"),
        soroban_sdk::vec![
            env,
            from.into_val(env),
            to.into_val(env),
            amount.into_val(env),
        ],
    )
    .map_err(|_| SettlementError::PaymentFailed)?
    .map_err(|_| SettlementError::PaymentFailed)
}

/// Get token decimals
pub fn get_token_decimals(_token_contract: &Address, _env: &Env) -> Result<u32, SettlementError> {
    Ok(7) // Default for Stellar assets
}

/// Validate that an NFT contract supports the required interface
pub fn validate_nft_contract(nft_contract: &Address, env: &Env) -> Result<(), SettlementError> {
    if !AllowlistStore::is_nft_allowed(env, nft_contract) {
        return Err(SettlementError::NftNotSupported);
    }
    Ok(())
}

/// Check NFT ownership
pub fn check_nft_ownership(
    nft_contract: &Address,
    token_id: u64,
    owner: &Address,
    env: &Env,
) -> Result<bool, SettlementError> {
    let current_owner: Address = env.invoke_contract(
        nft_contract,
        &Symbol::new(env, "owner_of"),
        soroban_sdk::vec![env, token_id.into_val(env)],
    );
    Ok(current_owner == *owner)
}

/// Look up a token's current owner through the NFT contract's `owner_of`.
///
/// Unlike [`check_nft_ownership`], a rejected invocation (the address is not a
/// contract, the contract does not expose `owner_of`, or it traps) returns
/// `None` instead of aborting the caller. Configuration paths use this so a
/// misbehaving NFT contract cannot make an unrelated settlement call revert.
pub fn try_owner_of(nft_contract: &Address, token_id: u64, env: &Env) -> Option<Address> {
    env.try_invoke_contract::<Address, SettlementError>(
        nft_contract,
        &Symbol::new(env, "owner_of"),
        soroban_sdk::vec![env, token_id.into_val(env)],
    )
    .ok()
    .and_then(|result| result.ok())
}

/// Transfer an NFT, authorizing as the marketplace contract itself.
///
/// The caller position of the NFT contract's `transfer` must be an owner or an
/// approved operator of the token, so this only works for tokens the
/// marketplace already holds — which is the case when releasing escrow.
///
/// See [`transfer_nft_from`] for moving a token out of the seller's own
/// custody.
pub fn transfer_nft(
    nft_contract: &Address,
    from: &Address,
    to: &Address,
    token_id: u64,
    env: &Env,
) -> Result<(), SettlementError> {
    transfer_nft_from(
        nft_contract,
        &env.current_contract_address(),
        from,
        to,
        token_id,
        env,
    )
}

/// Transfer an NFT, authorizing as `caller`.
///
/// Escrowing a token the seller still owns has to authorize as the seller:
/// the NFT contract checks `owner_of(token) == caller` (or an approval), and
/// the marketplace is neither. The seller can satisfy that check without an
/// extra signature because they already authorized the enclosing marketplace
/// call, and Soroban auth applies to the whole invocation tree.
pub fn transfer_nft_from(
    nft_contract: &Address,
    caller: &Address,
    from: &Address,
    to: &Address,
    token_id: u64,
    env: &Env,
) -> Result<(), SettlementError> {
    env.invoke_contract::<()>(
        nft_contract,
        &Symbol::new(env, "transfer"),
        soroban_sdk::vec![
            env,
            caller.into_val(env),
            from.into_val(env),
            to.into_val(env),
            token_id.into_val(env),
        ],
    );
    Ok(())
}
