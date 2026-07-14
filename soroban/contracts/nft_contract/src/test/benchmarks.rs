/// Gas benchmarking tests for NFT contract operations.
///
/// These tests measure the gas cost of common operations
/// to establish baselines and detect regressions.
///
/// Run with: `cargo test --test '' -- --nocapture`
/// (Soroban SDK test environment tracks gas automatically.)

use crate::types::{CollectionConfig, RoyaltyInfo, TokenAttribute};
use crate::{NftContract, NftContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

fn make_config(env: &Env) -> CollectionConfig {
    CollectionConfig {
        name: String::from_str(env, "GasBench"),
        symbol: String::from_str(env, "GAS"),
        base_uri: String::from_str(env, ""),
        max_supply: Some(10000),
        mint_price: None,
        is_revealed: true,
        metadata_is_frozen: false,
    }
}

fn setup_bench(env: &Env) -> (NftContractClient<'_>, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(NftContract, ());
    let client = NftContractClient::new(env, &contract_id);
    client.initialize(&admin, &make_config(env), &None);
    (client, admin)
}

// ─── Gas Benchmarks ──────────────────────────────────────────────────────────

#[test]
fn bench_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    env.budget().reset_unlimited();
    let admin = Address::generate(&env);
    let contract_id = env.register(NftContract, ());
    let client = NftContractClient::new(&env, &contract_id);

    let budget_before = env.budget().cpu_instruction_count();
    client.initialize(&admin, &make_config(&env), &None);
    let budget_after = env.budget().cpu_instruction_count();

    let instructions = budget_after - budget_before;
    // Initialization should be under ~5M instructions
    assert!(
        instructions < 5_000_000,
        "initialize: {} instructions (expected <5M)",
        instructions
    );
}

#[test]
fn bench_mint_single() {
    let env = Env::default();
    env.mock_all_auths();
    env.budget().reset_unlimited();
    let (client, admin) = setup_bench(&env);
    let user = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://bench");
    let attrs: Vec<TokenAttribute> = Vec::new(&env);

    // Warm up with one mint
    let _ = client.mint(&admin, &user, &uri, &attrs, &None);

    let budget_before = env.budget().cpu_instruction_count();
    let _ = client.mint(&admin, &user, &uri, &attrs, &None);
    let budget_after = env.budget().cpu_instruction_count();

    let instructions = budget_after - budget_before;
    assert!(
        instructions < 2_000_000,
        "mint (single): {} instructions (expected <2M)",
        instructions
    );
}

#[test]
fn bench_mint_batch_10() {
    let env = Env::default();
    env.mock_all_auths();
    env.budget().reset_unlimited();
    let (client, admin) = setup_bench(&env);

    let mut recipients: Vec<Address> = Vec::new(&env);
    let mut uris: Vec<String> = Vec::new(&env);
    let mut all_attrs: Vec<Vec<TokenAttribute>> = Vec::new(&env);

    for _ in 0..10u32 {
        recipients.push_back(Address::generate(&env));
        uris.push_back(String::from_str(&env, "ipfs://batch"));
        all_attrs.push_back(Vec::new(&env));
    }

    let budget_before = env.budget().cpu_instruction_count();
    let ids = client.batch_mint(&admin, &recipients, &uris, &all_attrs);
    let budget_after = env.budget().cpu_instruction_count();

    assert_eq!(ids.len(), 10);
    let instructions = budget_after - budget_before;
    assert!(
        instructions < 8_000_000,
        "batch_mint (10): {} instructions (expected <8M)",
        instructions
    );
}

#[test]
fn bench_transfer() {
    let env = Env::default();
    env.mock_all_auths();
    env.budget().reset_unlimited();
    let (client, admin) = setup_bench(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id = client.mint(
        &admin,
        &user1,
        &String::from_str(&env, "ipfs://bench"),
        &Vec::new(&env),
        &None,
    );

    let budget_before = env.budget().cpu_instruction_count();
    client.transfer(&user1, &user1, &user2, &token_id);
    let budget_after = env.budget().cpu_instruction_count();

    let instructions = budget_after - budget_before;
    assert!(
        instructions < 1_500_000,
        "transfer: {} instructions (expected <1.5M)",
        instructions
    );
}

#[test]
fn bench_burn() {
    let env = Env::default();
    env.mock_all_auths();
    env.budget().reset_unlimited();
    let (client, admin) = setup_bench(&env);
    let user = Address::generate(&env);
    let token_id = client.mint(
        &admin,
        &user,
        &String::from_str(&env, "ipfs://bench"),
        &Vec::new(&env),
        &None,
    );

    let budget_before = env.budget().cpu_instruction_count();
    client.burn(&user, &token_id);
    let budget_after = env.budget().cpu_instruction_count();

    let instructions = budget_after - budget_before;
    assert!(
        instructions < 1_000_000,
        "burn: {} instructions (expected <1M)",
        instructions
    );
}

#[test]
fn bench_owner_of() {
    let env = Env::default();
    env.mock_all_auths();
    env.budget().reset_unlimited();
    let (client, admin) = setup_bench(&env);
    let user = Address::generate(&env);
    let token_id = client.mint(
        &admin,
        &user,
        &String::from_str(&env, "ipfs://bench"),
        &Vec::new(&env),
        &None,
    );

    let budget_before = env.budget().cpu_instruction_count();
    let _ = client.owner_of(&token_id);
    let budget_after = env.budget().cpu_instruction_count();

    let instructions = budget_after - budget_before;
    // Read-only operations should be cheap
    assert!(
        instructions < 500_000,
        "owner_of: {} instructions (expected <500K)",
        instructions
    );
}

#[test]
fn bench_batch_burn_10() {
    let env = Env::default();
    env.mock_all_auths();
    env.budget().reset_unlimited();
    let (client, admin) = setup_bench(&env);
    let owner = Address::generate(&env);
    let mut token_ids: Vec<u64> = Vec::new(&env);

    for _ in 0..10u32 {
        let id = client.mint(
            &admin,
            &owner,
            &String::from_str(&env, "ipfs://bench"),
            &Vec::new(&env),
            &None,
        );
        token_ids.push_back(id);
    }

    let budget_before = env.budget().cpu_instruction_count();
    client.batch_burn(&owner, &token_ids);
    let budget_after = env.budget().cpu_instruction_count();

    let instructions = budget_after - budget_before;
    assert!(
        instructions < 4_000_000,
        "batch_burn (10): {} instructions (expected <4M)",
        instructions
    );
}
