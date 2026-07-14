use crate::error::ContractError;
use crate::storage::DataKey;
use crate::types::{LegacyTokenDataV1, TokenData};
use soroban_sdk::{Address, Env, String, panic_with_error, symbol_short};

// ── Storage Layout Version ────────────────────────────────────────────────────

/// The current storage layout version. Increment this when making
/// backwards-incompatible changes to the storage schema.
pub const CURRENT_STORAGE_VERSION: u32 = 2;

/// Supported storage layout versions for migration.
pub const SUPPORTED_VERSIONS: &[u32] = &[1, 2];

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
/// Defaults to 1 if not yet set, so old v1 contracts that upgrade
/// their wasm to a newer version are correctly detected as needing migration.
/// Fresh deployments set StorageVersion explicitly in initialize.
pub fn get_storage_version(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::StorageVersion)
        .unwrap_or(1)
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
/// - Requires upgrade admin authorization (auth checked by contractimpl entry point)
/// - Contract MUST be paused before calling this function
/// - Migrations are run sequentially (v1→v2, v2→v3, etc.)
pub fn perform_upgrade(
    env: &Env,
    caller: &Address,
    target_version: u32,
) -> Result<(), ContractError> {
    // Auth is handled by the contractimpl entry point in lib.rs
    require_upgrade_admin(env, caller)?;

    let current = get_storage_version(env);

    if target_version < current {
        return Err(ContractError::InvalidUpgradeTarget);
    }

    if target_version == current {
        return Ok(()); // No-op: no pause required since nothing changes
    }

    // Guard: contract must be paused for actual migrations to prevent
    // concurrent state mutations during storage transformation
    let is_paused: bool = env
        .storage()
        .instance()
        .get(&DataKey::IsPaused)
        .unwrap_or(false);
    if !is_paused {
        return Err(ContractError::ContractPaused);
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
/// Add new migration cases here as the storage layout evolves.
/// Example migration template for v1→v2 (keep in mind migrations
/// should be idempotent since a partial failure leaves state at
/// the last successful version):
///
/// ```ignore
/// fn migrate_v1_to_v2(env: &Env) -> Result<(), ContractError> {
///     let total: u64 = env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0);
///     for token_id in 1..=total {
///         let old_data = env.storage().persistent().get(&DataKey::TokenData(token_id));
///         if let Some(data) = old_data {
///             let new_data = transform(data);
///             env.storage().persistent().set(&DataKey::TokenDataV2(token_id), &new_data);
///             env.storage().persistent().remove(&DataKey::TokenData(token_id));
///         }
///     }
///     Ok(())
/// }
/// ```
fn run_migration(env: &Env, target_version: u32) -> Result<(), ContractError> {
    match target_version {
        // v1 is the initial version — no migration needed to reach it
        1 => Ok(()),
        // v2: add transfer_count and last_transfer_at to TokenData
        2 => migrate_v1_to_v2(env),
        _ => Err(ContractError::UnsupportedStorageVersion),
    }
}

// ── v1 → v2 Migration ────────────────────────────────────────────────────────

/// Migrate all TokenData from v1 schema to v2 schema.
///
/// Adds `transfer_count` (default 0) and `last_transfer_at` (default 0)
/// to every existing token. Iterates through all tokens by scanning the
/// token ID range from 1 to total_supply.
///
/// # Idempotency
/// This migration is idempotent: it checks whether each token already has
/// v2 data (by attempting to read as TokenData first) before migrating.
/// If a token was already migrated (e.g. after a partial run that was
/// reverted), it is silently skipped.
///
/// # Gas Considerations
/// For production collections with thousands of tokens, this function
/// would exceed transaction limits. In that case, implement chunked
/// migration (e.g. `perform_upgrade_chunked`) that processes a fixed
/// batch of tokens per call, or a lazy-migration strategy that migrates
/// individual tokens on their next interaction.
fn migrate_v1_to_v2(env: &Env) -> Result<(), ContractError> {
    let total: u64 = env
        .storage()
        .instance()
        .get(&DataKey::TotalSupply)
        .unwrap_or(0);

    for token_id in 1..=total {
        // Check if already migrated (idempotent guard)
        let already_v2: Option<TokenData> = env
            .storage()
            .persistent()
            .get(&DataKey::TokenData(token_id));
        if already_v2.is_some() {
            continue; // Already migrated, skip
        }

        // Read as v1 schema and transform to v2
        let legacy: LegacyTokenDataV1 = env
            .storage()
            .persistent()
            .get(&DataKey::TokenData(token_id))
            .ok_or(ContractError::TokenNotFound)?;

        let v2_data = TokenData {
            id: legacy.id,
            owner: legacy.owner,
            metadata_uri: legacy.metadata_uri,
            created_at: legacy.created_at,
            creator: legacy.creator,
            royalty_percentage: legacy.royalty_percentage,
            royalty_recipient: legacy.royalty_recipient,
            attributes: legacy.attributes,
            edition_number: legacy.edition_number,
            total_editions: legacy.total_editions,
            transfer_count: 0,
            last_transfer_at: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::TokenData(token_id), &v2_data);
    }

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
    use crate::types::{CollectionConfig, LegacyTokenDataV1, TokenAttribute, TokenData};
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

    /// Helper: downgrade the contract to v1 storage state by setting
    /// StorageVersion = 1 and overwriting each token's TokenData with
    /// LegacyTokenDataV1 format. This simulates a contract that was
    /// deployed with v1 and then upgraded its wasm to v2.
    fn downgrade_to_v1(env: &Env, token_ids: &Vec<u64>) {
        // Set storage version to 1 (simulate old deployment)
        env.storage()
            .instance()
            .set(&DataKey::StorageVersion, &1u32);

        // Overwrite each token's data with LegacyTokenDataV1 format
        for i in 0..token_ids.len() {
            let token_id = token_ids.get(i).unwrap();
            let v2_data: TokenData = env
                .storage()
                .persistent()
                .get(&DataKey::TokenData(token_id))
                .unwrap();

            let v1_data = LegacyTokenDataV1 {
                id: v2_data.id,
                owner: v2_data.owner,
                metadata_uri: v2_data.metadata_uri,
                created_at: v2_data.created_at,
                creator: v2_data.creator,
                royalty_percentage: v2_data.royalty_percentage,
                royalty_recipient: v2_data.royalty_recipient,
                attributes: v2_data.attributes,
                edition_number: v2_data.edition_number,
                total_editions: v2_data.total_editions,
            };

            env.storage()
                .persistent()
                .set(&DataKey::TokenData(token_id), &v1_data);
        }
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

    // ── v1 → v2 Migration Integration Tests ─────────────────────────────

    #[test]
    fn test_perform_upgrade_to_v2_with_state_migration() {
        // Integration test: set up genuine v1 state (via downgrade),
        // upgrade to v2, and verify all data survives intact with
        // correct v2 field defaults.
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin) = setup(&env);

        // ── Build state ────────────────────────────────────────────────

        let owner_a = Address::generate(&env);
        let owner_b = Address::generate(&env);
        let operator = Address::generate(&env);
        let burner = Address::generate(&env);
        let empty_attrs: Vec<TokenAttribute> = Vec::new(&env);

        // Mint 5 tokens to owner_a
        let mut token_ids: Vec<u64> = Vec::new(&env);
        for i in 0..5u32 {
            let id = client.mint(
                &admin,
                &owner_a,
                &String::from_str(&env, &format!("ipfs://token{}", i)),
                &empty_attrs,
                &None,
            );
            token_ids.push_back(id);
        }
        assert_eq!(client.total_supply(), 5);
        assert_eq!(client.balance_of(&owner_a), 5);

        // Transfer token 3 from owner_a → owner_b
        let token_3 = token_ids.get(2).unwrap();
        client.transfer(&owner_a, &owner_a, &owner_b, &token_3);
        assert_eq!(client.owner_of(&token_3), owner_b.clone());
        assert_eq!(client.balance_of(&owner_a), 4);
        assert_eq!(client.balance_of(&owner_b), 1);

        // Approve operator for token 1
        let token_1 = token_ids.get(0).unwrap();
        client.approve(&owner_a, &operator, &token_1);
        assert_eq!(client.get_approved(&token_1), Some(operator.clone()));

        // Set approval-for-all for owner_a → operator
        client.set_approval_for_all(&owner_a, &operator, &true);
        assert!(client.is_approved_for_all(&owner_a, &operator));

        // Grant BURNER role
        client.grant_role(&admin, &burner, &crate::types::role::BURNER);
        assert!(client.has_role(&burner, &crate::types::role::BURNER));

        // ── Simulate v1 contract state (the critical step) ─────────────

        downgrade_to_v1(&env, &token_ids);

        // Verify storage version is now 1
        assert_eq!(client.get_upgrade_info().storage_version, 1);

        // ── Pause and upgrade to v2 ────────────────────────────────────

        client.set_pause(&admin, &true);
        assert!(client.is_paused());

        client.perform_upgrade(&admin, &2u32);

        let info = client.get_upgrade_info();
        assert_eq!(info.storage_version, 2);

        // ── Verify all state survived the migration ────────────────────

        // Total supply unchanged
        assert_eq!(client.total_supply(), 5);

        // Balances correct
        assert_eq!(client.balance_of(&owner_a), 4);
        assert_eq!(client.balance_of(&owner_b), 1);

        // Token ownership correct
        assert_eq!(client.owner_of(&token_1), owner_a.clone());
        assert_eq!(client.owner_of(&token_3), owner_b.clone());

        // Per-token approval preserved
        assert_eq!(client.get_approved(&token_1), Some(operator.clone()));

        // Approval-for-all preserved
        assert!(client.is_approved_for_all(&owner_a, &operator));

        // Role preserved
        assert!(client.has_role(&burner, &crate::types::role::BURNER));

        // ── Verify v2 fields have correct defaults ─────────────────────

        // Check TokenData via token_metadata (returns TokenData)
        let data = client.token_metadata(&token_1);
        assert_eq!(data.id, token_1);
        assert_eq!(data.transfer_count, 0);
        assert_eq!(data.last_transfer_at, 0);

        // ── Verify new mints get v2 fields ────────────────────────────

        // Unpause, mint a new token, check it has transfer_count=0
        client.set_pause(&admin, &false);
        let new_owner = Address::generate(&env);
        let new_id = client.mint(
            &admin,
            &new_owner,
            &String::from_str(&env, "ipfs://post-upgrade"),
            &empty_attrs,
            &None,
        );
        let new_data = client.token_metadata(&new_id);
        assert_eq!(new_data.id, new_id);
        assert_eq!(new_data.transfer_count, 0);
        assert_eq!(new_data.last_transfer_at, 0);
        assert_eq!(client.total_supply(), 6);
    }

    #[test]
    fn test_migration_idempotent() {
        // Upgrade to v2, downgrade back to v1 (rewriting data as v1),
        // upgrade again — the migration function should handle already-
        // migrated tokens gracefully (idempotent guard).
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin) = setup(&env);

        let owner = Address::generate(&env);
        let empty: Vec<TokenAttribute> = Vec::new(&env);

        let mut token_ids: Vec<u64> = Vec::new(&env);
        let id1 = client.mint(&admin, &owner, &String::from_str(&env, "ipfs://a"), &empty, &None);
        token_ids.push_back(id1);
        let id2 = client.mint(&admin, &owner, &String::from_str(&env, "ipfs://b"), &empty, &None);
        token_ids.push_back(id2);

        // Downgrade to v1
        downgrade_to_v1(&env, &token_ids);

        // First upgrade — should run migration
        client.set_pause(&admin, &true);
        client.perform_upgrade(&admin, &2u32);
        assert_eq!(client.get_upgrade_info().storage_version, 2);

        // Downgrade again to simulate partial failure scenario
        downgrade_to_v1(&env, &token_ids);

        // Second upgrade — migration should handle already-migrated
        // tokens that now appear as v1 format again
        client.perform_upgrade(&admin, &2u32);
        assert_eq!(client.get_upgrade_info().storage_version, 2);

        // Data should still be intact
        assert_eq!(client.total_supply(), 2);
        assert_eq!(client.balance_of(&owner), 2);
        let data = client.token_metadata(&id1);
        assert_eq!(data.transfer_count, 0);
    }

    #[test]
    fn test_upgrade_without_pause_fails() {
        // Upgrade to v2 from v1 while contract is NOT paused should be
        // rejected by the pause guard.
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin) = setup(&env);

        let owner = Address::generate(&env);
        let empty: Vec<TokenAttribute> = Vec::new(&env);
        let mut token_ids: Vec<u64> = Vec::new(&env);
        let id = client.mint(&admin, &owner, &String::from_str(&env, "ipfs://x"), &empty, &None);
        token_ids.push_back(id);

        // Downgrade to v1 so upgrade is actually needed
        downgrade_to_v1(&env, &token_ids);

        // Contract is not paused — upgrade should fail
        let result = client.try_perform_upgrade(&admin, &2u32);
        assert!(result.is_err());
    }

    #[test]
    fn test_upgrade_retains_pagination_state() {
        // Verify NextTokenId and other instance-level state survives.
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin) = setup(&env);

        let owner = Address::generate(&env);
        let empty: Vec<TokenAttribute> = Vec::new(&env);

        let mut token_ids: Vec<u64> = Vec::new(&env);
        for _ in 0..3u32 {
            let id = client.mint(&admin, &owner, &String::from_str(&env, "ipfs://x"), &empty, &None);
            token_ids.push_back(id);
        }

        let supply_before = client.total_supply();
        assert_eq!(supply_before, 3);

        // Downgrade to v1 and upgrade
        downgrade_to_v1(&env, &token_ids);
        client.set_pause(&admin, &true);
        client.perform_upgrade(&admin, &2u32);
        client.set_pause(&admin, &false);

        // Next mint should get id 4 (NextTokenId preserved)
        let next_id = client.mint(
            &admin,
            &owner,
            &String::from_str(&env, "ipfs://4"),
            &empty,
            &None,
        );
        assert_eq!(next_id, 4);
        assert_eq!(client.total_supply(), 4);
    }
}
}
