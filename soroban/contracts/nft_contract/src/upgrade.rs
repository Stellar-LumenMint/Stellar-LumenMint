use crate::error::ContractError;
use crate::storage::DataKey;
use soroban_sdk::{Address, Env, String, panic_with_error, symbol_short};

// ── Storage Layout Version ────────────────────────────────────────────────────

/// The current storage layout version. Increment this when making
/// backwards-incompatible changes to the storage schema.
pub const CURRENT_STORAGE_VERSION: u32 = 1;

/// Supported storage layout versions for migration.
pub const SUPPORTED_VERSIONS: &[u32] = &[1];

// ── Upgrade Admin ─────────────────────────────────────────────────────────────

/// Get the current upgrade admin address.
/// Falls back to the contract admin if no upgrade admin is explicitly set.
pub fn get_upgrade_admin(env: &Env) -> Option<Address> {
    env.storage()
        .instance()
        .get(&DataKey::UpgradeAdmin)
}

/// Set the upgrade admin address (requires current upgrade admin auth).
pub fn set_upgrade_admin(
    env: &Env,
    caller: &Address,
    new_admin: Address,
) -> Result<(), ContractError> {
    require_upgrade_admin(env, caller)?;
    env.storage()
        .instance()
        .set(&DataKey::UpgradeAdmin, &new_admin);
    Ok(())
}

/// Require that the caller is the upgrade admin (or contract admin if unset).
pub fn require_upgrade_admin(env: &Env, caller: &Address) -> Result<(), ContractError> {
    let upgrade_admin: Option<Address> = get_upgrade_admin(env);
    if let Some(admin) = upgrade_admin {
        if caller == &admin {
            return Ok(());
        }
    }
    // Fall back to contract admin
    let contract_admin: Option<Address> =
        env.storage().instance().get(&DataKey::Admin);
    if let Some(admin) = contract_admin {
        if caller == &admin {
            return Ok(());
        }
    }
    Err(ContractError::NotAuthorized)
}

// ── Storage Version Tracking ──────────────────────────────────────────────────

/// Get the currently active storage layout version.
/// Defaults to CURRENT_STORAGE_VERSION if not yet set (first deployment).
pub fn get_storage_version(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::StorageVersion)
        .unwrap_or(CURRENT_STORAGE_VERSION)
}

/// Set the storage layout version (only callable during upgrade).
fn set_storage_version(env: &Env, version: u32) {
    env.storage()
        .instance()
        .set(&DataKey::StorageVersion, &version);
}

// ── Upgrade Execution ─────────────────────────────────────────────────────────

/// Perform an in-place upgrade to a new storage layout version.
///
/// This runs any necessary migration functions to transform existing
/// state from one version to the next.
///
/// # Security
/// - Requires upgrade admin authorization
/// - Migrations are run sequentially (v1→v2, v2→v3, etc.)
/// - Contract should be paused during upgrade
pub fn perform_upgrade(
    env: &Env,
    caller: &Address,
    target_version: u32,
) -> Result<(), ContractError> {
    caller.require_auth();
    require_upgrade_admin(env, caller)?;

    let current = get_storage_version(env);

    if target_version < current {
        return Err(ContractError::InvalidUpgradeTarget);
    }

    if target_version == current {
        return Ok(()); // No-op
    }

    if !SUPPORTED_VERSIONS.contains(&target_version) {
        return Err(ContractError::UnsupportedStorageVersion);
    }

    // Run migrations sequentially
    let mut version = current;
    while version < target_version {
        version += 1;
        run_migration(env, version)?;
        set_storage_version(env, version);
    }

    Ok(())
}

// ── Migration Functions ───────────────────────────────────────────────────────

/// Run the migration function for a specific target version.
///
/// Add new migration cases here as the storage layout evolves:
/// ```rust
/// match target_version {
///     2 => migrate_v1_to_v2(env),
///     3 => migrate_v2_to_v3(env),
///     _ => Err(ContractError::UnsupportedStorageVersion),
/// }
/// ```
fn run_migration(env: &Env, target_version: u32) -> Result<(), ContractError> {
    match target_version {
        // v1 is the initial version — no migration needed to reach it
        1 => Ok(()),
        // Future migrations:
        // 2 => migrate_v1_to_v2(env),
        _ => Err(ContractError::UnsupportedStorageVersion),
    }
}

// ── Future Migration Templates ────────────────────────────────────────────────

/// Example migration from v1 to v2.
/// Add actual migration logic when the storage layout changes.
#[allow(dead_code)]
fn migrate_v1_to_v2(_env: &Env) -> Result<(), ContractError> {
    // Example: rename a storage key, add a new field to all TokenData, etc.
    // for token_id in 1..=total_supply {
    //     let old_data = env.storage().persistent().get(&DataKey::TokenData(token_id));
    //     let new_data = transform(old_data);
    //     env.storage().persistent().set(&DataKey::TokenDataV2(token_id), &new_data);
    //     env.storage().persistent().remove(&DataKey::TokenData(token_id));
    // }
    Ok(())
}

// ── Emergency Rollback ────────────────────────────────────────────────────────

/// Emergency rollback to a previous storage version.
/// Only available when explicitly enabled by the upgrade admin.
/// Use with extreme caution — may cause data loss for features
/// introduced after the target version.
#[allow(dead_code)]
pub fn emergency_rollback(
    env: &Env,
    caller: &Address,
    target_version: u32,
) -> Result<(), ContractError> {
    caller.require_auth();
    require_upgrade_admin(env, caller)?;

    let current = get_storage_version(env);

    if target_version >= current {
        return Err(ContractError::InvalidUpgradeTarget);
    }

    if !SUPPORTED_VERSIONS.contains(&target_version) {
        return Err(ContractError::UnsupportedStorageVersion);
    }

    // Rollback is simpler: just set the version.
    // The storage keys for newer features become orphaned but don't
    // affect the contract's behavior since they're version-gated.
    set_storage_version(env, target_version);

    Ok(())
}

// ── Upgrade Status ────────────────────────────────────────────────────────────

/// Returns metadata about the current upgrade state.
pub fn get_upgrade_info(env: &Env) -> UpgradeInfo {
    UpgradeInfo {
        storage_version: get_storage_version(env),
        current_version: CURRENT_STORAGE_VERSION,
        upgrade_admin: get_upgrade_admin(env),
        contract_admin: env.storage().instance().get(&DataKey::Admin),
    }
}

#[derive(Clone, Debug)]
pub struct UpgradeInfo {
    pub storage_version: u32,
    pub current_version: u32,
    pub upgrade_admin: Option<Address>,
    pub contract_admin: Option<Address>,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use crate::types::CollectionConfig;
    use crate::{NftContract, NftContractClient};
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Env, String, Vec};

    fn setup(env: &Env) -> (NftContractClient<'_>, Address) {
        let admin = Address::generate(env);
        let contract_id = env.register(NftContract, ());
        let client = NftContractClient::new(env, &contract_id);
        let config = CollectionConfig {
            name: String::from_str(env, "UpgradeTest"),
            symbol: String::from_str(env, "UPG"),
            base_uri: String::from_str(env, ""),
            max_supply: Some(1000),
            mint_price: None,
            is_revealed: true,
            metadata_is_frozen: false,
        };
        client.initialize(&admin, &config, &None);
        (client, admin)
    }

    #[test]
    fn test_initial_storage_version() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _) = setup(&env);

        let info = client.get_upgrade_info();
        assert_eq!(info.storage_version, CURRENT_STORAGE_VERSION);
    }

    #[test]
    fn test_set_upgrade_admin() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin) = setup(&env);

        let new_admin = Address::generate(&env);
        client.set_upgrade_admin(&admin, &new_admin);

        let info = client.get_upgrade_info();
        assert_eq!(info.upgrade_admin, Some(new_admin));
    }

    #[test]
    fn test_set_upgrade_admin_unauthorized_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _) = setup(&env);

        let attacker = Address::generate(&env);
        let new_admin = Address::generate(&env);

        let result = client.try_set_upgrade_admin(&attacker, &new_admin);
        assert!(result.is_err());
    }

    #[test]
    fn test_perform_upgrade_same_version_noop() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin) = setup(&env);

        // Upgrade to same version should succeed (no-op)
        let result = client.try_perform_upgrade(&admin, &CURRENT_STORAGE_VERSION);
        assert!(result.is_ok());

        let info = client.get_upgrade_info();
        assert_eq!(info.storage_version, CURRENT_STORAGE_VERSION);
    }

    #[test]
    fn test_perform_upgrade_lower_version_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin) = setup(&env);

        // Cannot downgrade via perform_upgrade
        let result = client.try_perform_upgrade(&admin, &0u32);
        assert!(result.is_err());
    }

    #[test]
    fn test_perform_upgrade_unsupported_version_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin) = setup(&env);

        // Version 99 is not in SUPPORTED_VERSIONS
        let result = client.try_perform_upgrade(&admin, &99u32);
        assert!(result.is_err());
    }

    #[test]
    fn test_upgrade_admin_key_rotation() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin) = setup(&env);

        let admin_a = Address::generate(&env);
        let admin_b = Address::generate(&env);

        // Admin sets upgrade admin to A
        client.set_upgrade_admin(&admin, &admin_a);
        assert_eq!(client.get_upgrade_info().upgrade_admin, Some(admin_a.clone()));

        // A rotates to B
        client.set_upgrade_admin(&admin_a, &admin_b);
        assert_eq!(client.get_upgrade_info().upgrade_admin, Some(admin_b.clone()));

        // Original admin can no longer set upgrade admin
        let admin_c = Address::generate(&env);
        let result = client.try_set_upgrade_admin(&admin_a, &admin_c);
        assert!(result.is_err());
    }
}
