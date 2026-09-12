use crate::error::ContractError;
use crate::events;
use crate::storage::DataKey;
use crate::ttl;
use crate::types::TokenData;
use soroban_sdk::{Address, Env};

pub fn approve(
    env: &Env,
    owner: &Address,
    approved: &Address,
    token_id: u64,
) -> Result<(), ContractError> {
    let token_owner: Address =
        ttl::get(env, &DataKey::TokenOwner(token_id)).ok_or(ContractError::TokenNotFound)?;

    if &token_owner != owner {
        return Err(ContractError::NotOwner);
    }

    ttl::set(env, &DataKey::TokenApproved(token_id), approved);

    events::emit_approval(env, owner.clone(), approved.clone(), token_id);
    Ok(())
}

pub fn set_approval_for_all(env: &Env, owner: &Address, operator: &Address, approved: bool) {
    ttl::set(
        env,
        &DataKey::OperatorApproval(owner.clone(), operator.clone()),
        &approved,
    );
    events::emit_approval_for_all(env, owner.clone(), operator.clone(), approved);
}

pub fn get_approved(env: &Env, token_id: u64) -> Option<Address> {
    ttl::get(env, &DataKey::TokenApproved(token_id))
}

pub fn is_approved_for_all(env: &Env, owner: &Address, operator: &Address) -> bool {
    ttl::get::<_, bool>(
        env,
        &DataKey::OperatorApproval(owner.clone(), operator.clone()),
    )
    .unwrap_or(false)
}

/// Read a token's owner.
///
/// Split out so a caller that needs the owner for *two* checks reads the entry
/// once instead of once per check. A transfer used to resolve the same
/// `TokenOwner` entry twice — once to authorize the spender and once to verify
/// `from` — and `batch_transfer` did it twice per token, so the duplicate read
/// scaled with the batch size.
///
/// Returns `TokenNotFound` for an unknown token, which is what the storage layer
/// already reported; callers that must preserve the older "unknown token is
/// simply not approved" answer should use [`is_approved_or_owner`].
pub fn read_owner(env: &Env, token_id: u64) -> Result<Address, ContractError> {
    ttl::get(env, &DataKey::TokenOwner(token_id)).ok_or(ContractError::TokenNotFound)
}

/// Returns true if `spender` is the owner, approved for the token, or an operator.
pub fn is_approved_or_owner(env: &Env, spender: &Address, token_id: u64) -> bool {
    match read_owner(env, token_id) {
        Ok(owner) => is_approved_or_owner_of(env, &owner, spender, token_id),
        Err(_) => false,
    }
}

/// [`is_approved_or_owner`] for an owner the caller has already read.
pub fn is_approved_or_owner_of(
    env: &Env,
    owner: &Address,
    spender: &Address,
    token_id: u64,
) -> bool {
    if spender == owner {
        return true;
    }
    if let Some(approved) = ttl::get::<_, Address>(env, &DataKey::TokenApproved(token_id)) {
        if spender == &approved {
            return true;
        }
    }
    is_approved_for_all(env, owner, spender)
}

fn check_not_paused(env: &Env) -> Result<(), ContractError> {
    if env
        .storage()
        .instance()
        .get::<_, bool>(&DataKey::IsPaused)
        .unwrap_or(false)
    {
        return Err(ContractError::ContractPaused);
    }
    Ok(())
}

pub fn do_transfer(
    env: &Env,
    from: &Address,
    to: &Address,
    token_id: u64,
) -> Result<(), ContractError> {
    check_not_paused(env)?;

    let owner = read_owner(env, token_id)?;

    if &owner != from {
        return Err(ContractError::NotOwner);
    }

    do_transfer_effects(env, from, to, token_id)
}

/// [`do_transfer`] for an owner the caller has already read.
///
/// Performs the same authorization checks — paused, then `from` really owns the
/// token — but skips the storage read that produced `owner`.
pub fn do_transfer_checked(
    env: &Env,
    owner: &Address,
    from: &Address,
    to: &Address,
    token_id: u64,
) -> Result<(), ContractError> {
    check_not_paused(env)?;

    if owner != from {
        return Err(ContractError::NotOwner);
    }

    do_transfer_effects(env, from, to, token_id)
}

/// The state changes a transfer makes, once authorization has passed.
fn do_transfer_effects(
    env: &Env,
    from: &Address,
    to: &Address,
    token_id: u64,
) -> Result<(), ContractError> {
    // A transfer to this contract's own address is unrecoverable, because there
    // is no entrypoint that moves a token back out. Checked here rather than in
    // each caller so `transfer`, `safe_transfer_from` and `batch_transfer` all
    // reject it.
    if to == &env.current_contract_address() {
        return Err(ContractError::InvalidRecipient);
    }

    // Clear per-token approval on transfer
    ttl::remove(env, &DataKey::TokenApproved(token_id));

    // Update TokenData: new owner, increment transfer_count, set timestamp
    let mut token_data: TokenData =
        ttl::get(env, &DataKey::TokenData(token_id)).ok_or(ContractError::TokenNotFound)?;
    token_data.owner = to.clone();
    token_data.transfer_count = token_data.transfer_count.saturating_add(1);
    token_data.last_transfer_at = env.ledger().timestamp();
    ttl::set(env, &DataKey::TokenData(token_id), &token_data);

    ttl::set(env, &DataKey::TokenOwner(token_id), to);

    // Update balances
    let from_bal: u64 = ttl::get(env, &DataKey::Balance(from.clone())).unwrap_or(0);
    ttl::set(
        env,
        &DataKey::Balance(from.clone()),
        &from_bal.saturating_sub(1),
    );

    let to_bal: u64 = ttl::get(env, &DataKey::Balance(to.clone())).unwrap_or(0);
    ttl::set(env, &DataKey::Balance(to.clone()), &(to_bal + 1));

    events::emit_transfer(env, from.clone(), to.clone(), token_id);
    Ok(())
}
