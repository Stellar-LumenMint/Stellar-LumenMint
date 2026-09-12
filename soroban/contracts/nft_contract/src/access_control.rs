use crate::error::ContractError;
use crate::storage::DataKey;
use crate::types::role;
use soroban_sdk::{panic_with_error, Address, Env};

/// Grant `role` to `target`, reporting a no-op instead of silently succeeding.
///
/// Both directions used to be unconditional writes that returned nothing, so a
/// caller could not tell a role change that happened from one that was already
/// in place. A duplicate grant and a revocation of a role nobody holds are both
/// caller mistakes worth surfacing.
pub fn grant_role(
    env: &Env,
    caller: &Address,
    target: &Address,
    role: u32,
) -> Result<(), ContractError> {
    require_owner(env, caller);
    if has_role(env, target, role) {
        return Err(ContractError::RoleAlreadyGranted);
    }
    env.storage()
        .instance()
        .set(&DataKey::Role(target.clone(), role), &true);
    Ok(())
}

pub fn revoke_role(
    env: &Env,
    caller: &Address,
    target: &Address,
    role_disc: u32,
) -> Result<(), ContractError> {
    require_owner(env, caller);
    if !has_role(env, target, role_disc) {
        return Err(ContractError::RoleNotGranted);
    }
    env.storage()
        .instance()
        .set(&DataKey::Role(target.clone(), role_disc), &false);
    Ok(())
}

pub fn has_role(env: &Env, address: &Address, role_disc: u32) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Role(address.clone(), role_disc))
        .unwrap_or(false)
}

pub fn require_owner(env: &Env, caller: &Address) {
    if !has_role(env, caller, role::OWNER) {
        panic_with_error!(env, ContractError::NotAuthorized);
    }
}

pub fn require_admin_or_owner(env: &Env, caller: &Address) {
    if !has_role(env, caller, role::OWNER) && !has_role(env, caller, role::ADMIN) {
        panic_with_error!(env, ContractError::NotAuthorized);
    }
}

pub fn require_minter(env: &Env, caller: &Address) -> Result<(), ContractError> {
    if has_role(env, caller, role::OWNER)
        || has_role(env, caller, role::ADMIN)
        || has_role(env, caller, role::MINTER)
    {
        Ok(())
    } else {
        Err(ContractError::NotMinter)
    }
}

pub fn require_burner(env: &Env, caller: &Address) -> Result<(), ContractError> {
    if has_role(env, caller, role::OWNER)
        || has_role(env, caller, role::ADMIN)
        || has_role(env, caller, role::BURNER)
    {
        Ok(())
    } else {
        Err(ContractError::NotBurner)
    }
}

pub fn require_metadata_updater(env: &Env, caller: &Address) -> Result<(), ContractError> {
    if has_role(env, caller, role::METADATA_UPDATER) {
        Ok(())
    } else {
        Err(ContractError::NotAuthorized)
    }
}

pub fn init_owner(env: &Env, owner: &Address) {
    env.storage()
        .instance()
        .set(&DataKey::Role(owner.clone(), role::OWNER), &true);
    env.storage()
        .instance()
        .set(&DataKey::Role(owner.clone(), role::ADMIN), &true);
    env.storage()
        .instance()
        .set(&DataKey::Role(owner.clone(), role::MINTER), &true);
    env.storage()
        .instance()
        .set(&DataKey::Role(owner.clone(), role::BURNER), &true);
    env.storage()
        .instance()
        .set(&DataKey::Role(owner.clone(), role::METADATA_UPDATER), &true);
}
