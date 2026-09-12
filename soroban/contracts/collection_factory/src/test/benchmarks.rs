//! Gas benchmarks for the collection factory and the collection it deploys.
//!
//! See `contracts/nft_contract/src/test/benchmarks.rs` for what each counter
//! means and why the stroop fee estimate is deliberately not reported from the
//! test host. `soroban/GAS.md` records the real figures.
//!
//! `factory.create_collection` is the most expensive operation in the system: it
//! deploys a contract, which uploads code metadata, creates an instance entry
//! and runs the constructor. It is also the one operation no other test covers,
//! because exercising it needs the collection Wasm. The benchmark reads the
//! built Wasm from `target/` at run time; if it is not there yet the benchmark
//! reports `BENCH-SKIP` and returns rather than failing, so a `cargo test` on a
//! clean checkout still works. CI builds the contracts before running tests, so
//! there it always runs.

extern crate std;

use crate::collection::{NftCollection, NftCollectionClient};
use crate::factory::{CollectionFactory, CollectionFactoryClient};
use crate::types::CollectionConfig;
use soroban_sdk::{testutils::Address as _, Address, Bytes, BytesN, Env, String, Vec};

/// Measured runs per benchmark. The first invocation is a warm up.
const RUNS: u32 = 3;

/// Path to the collection Wasm, relative to this crate.
const COLLECTION_WASM: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../target/wasm32-unknown-unknown/release/collection_factory.wasm"
);

/// One invocation's metered resources.
#[derive(Clone, Copy, Default)]
struct Cost {
    cpu: i64,
    mem: i64,
    read_entries: u32,
    write_entries: u32,
    read_bytes: u32,
    write_bytes: u32,
    events_bytes: u32,
    persistent_rent_ledger_bytes: i64,
}

fn snapshot(env: &Env) -> Cost {
    let resources = env.cost_estimate().resources();

    Cost {
        cpu: resources.instructions,
        mem: resources.mem_bytes,
        read_entries: resources.disk_read_entries,
        write_entries: resources.write_entries,
        read_bytes: resources.disk_read_bytes,
        write_bytes: resources.write_bytes,
        events_bytes: resources.contract_events_size_bytes,
        persistent_rent_ledger_bytes: resources.persistent_rent_ledger_bytes,
    }
}

fn report(name: &str, cost: &Cost) {
    std::println!(
        "BENCH|{name}|cpu={}|mem={}|read={}|write={}|rbytes={}|wbytes={}|events={}|rent={}",
        cost.cpu,
        cost.mem,
        cost.read_entries,
        cost.write_entries,
        cost.read_bytes,
        cost.write_bytes,
        cost.events_bytes,
        cost.persistent_rent_ledger_bytes
    );
}

/// Run `op` once as a warm up, then `RUNS` times, returning the cheapest run.
fn bench<R>(env: &Env, name: &str, mut op: impl FnMut() -> R) -> Cost {
    drop(op());

    let mut best: Option<Cost> = None;
    for _ in 0..RUNS {
        drop(op());
        let cost = snapshot(env);
        best = Some(match best {
            None => cost,
            Some(previous) if cost.cpu < previous.cpu => cost,
            Some(previous) => previous,
        });
    }

    let cost = best.unwrap_or_default();
    report(name, &cost);
    cost
}

fn assert_cpu_under(name: &str, cost: &Cost, ceiling: i64) {
    assert!(
        cost.cpu <= ceiling,
        "{name}: {} CPU instructions exceeds the {ceiling} ceiling; a hot path regressed",
        cost.cpu
    );
}

fn config(env: &Env, recipient: &Address) -> CollectionConfig {
    CollectionConfig {
        name: String::from_str(env, "GasBench"),
        symbol: String::from_str(env, "GAS"),
        description: String::from_str(env, "Gas benchmark collection"),
        base_uri: String::from_str(env, "ipfs://bench/"),
        max_supply: Some(1000),
        is_public_mint: true,
        royalty_percentage: 500,
        royalty_recipient: recipient.clone(),
    }
}

fn factory(env: &Env) -> (CollectionFactoryClient<'_>, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(CollectionFactory, ());
    let client = CollectionFactoryClient::new(env, &contract_id);
    client.initialize(&admin, &Address::generate(env));
    (client, admin)
}

fn collection(env: &Env) -> (NftCollectionClient<'_>, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(NftCollection, ());
    let client = NftCollectionClient::new(env, &contract_id);
    client.init(&admin, &admin, &config(env, &admin));
    (client, admin)
}

// ─── Factory ─────────────────────────────────────────────────────────────────

#[test]
fn bench_factory_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let fee_asset = Address::generate(&env);
    let contract_id = env.register(CollectionFactory, ());
    let client = CollectionFactoryClient::new(&env, &contract_id);

    // `initialize` can only run once per contract, so it is measured directly.
    client.initialize(&admin, &fee_asset);
    let cost = snapshot(&env);
    report("factory.initialize", &cost);
    assert_cpu_under("factory.initialize", &cost, 400_000);
}

#[test]
fn bench_create_collection() {
    let env = Env::default();
    env.mock_all_auths();

    let Ok(wasm) = std::fs::read(COLLECTION_WASM) else {
        std::println!(
            "BENCH-SKIP|factory.create_collection|missing {COLLECTION_WASM}; \
             build the contracts first (cargo build --workspace --release --target wasm32-unknown-unknown)"
        );
        return;
    };

    let wasm_hash = env
        .deployer()
        .upload_contract_wasm(Bytes::from_slice(&env, &wasm));

    let (client, admin) = factory(&env);
    let creator = Address::generate(&env);

    // Each deployment needs its own salt, so the counter doubles as the salt.
    let mut round = 0u8;
    let cost = bench(&env, "factory.create_collection", || {
        round = round.wrapping_add(1);
        client.create_collection(
            &creator,
            &wasm_hash,
            &BytesN::from_array(&env, &[round; 32]),
            &config(&env, &admin),
        )
    });

    assert_cpu_under("factory.create_collection", &cost, 30_000_000);
}

#[test]
fn bench_factory_reads() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = factory(&env);

    let cost = bench(&env, "factory.get_collection_count", || {
        client.get_collection_count()
    });
    assert_cpu_under("factory.get_collection_count", &cost, 200_000);

    let cost = bench(&env, "factory.get_collections_page", || {
        client.get_collections_page(&0u32, &10u32)
    });
    assert_cpu_under("factory.get_collections_page", &cost, 300_000);

    let cost = bench(&env, "factory.update_creator_limit", || {
        client.update_creator_limit(&25u32)
    });
    assert_cpu_under("factory.update_creator_limit", &cost, 300_000);
}

// ─── Collection ──────────────────────────────────────────────────────────────

#[test]
fn bench_collection_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(NftCollection, ());
    let client = NftCollectionClient::new(&env, &contract_id);

    client.init(&admin, &admin, &config(&env, &admin));
    let cost = snapshot(&env);
    report("collection.init", &cost);
    assert_cpu_under("collection.init", &cost, 500_000);
}

#[test]
fn bench_collection_mint() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = collection(&env);
    let owner = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://bench");
    let attributes = Vec::new(&env);

    let mut token_id = 0u32;
    let cost = bench(&env, "collection.mint", || {
        token_id += 1;
        client.mint(&admin, &owner, &token_id, &uri, &attributes)
    });

    assert_cpu_under("collection.mint", &cost, 600_000);
}

#[test]
fn bench_collection_transfer() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = collection(&env);
    let owner = Address::generate(&env);
    let other = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://bench");

    // One token per run: a transfer moves a specific token, so repeating on the
    // same id would measure a different path once it is no longer owned.
    for token_id in 1..=(RUNS + 1) {
        client.mint(&admin, &owner, &token_id, &uri, &Vec::new(&env));
    }

    let mut token_id = 0u32;
    let cost = bench(&env, "collection.transfer", || {
        token_id += 1;
        client.transfer(&owner, &other, &token_id)
    });

    assert_cpu_under("collection.transfer", &cost, 600_000);
}

#[test]
fn bench_collection_burn() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = collection(&env);
    let owner = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://bench");

    for token_id in 1..=(RUNS + 1) {
        client.mint(&admin, &owner, &token_id, &uri, &Vec::new(&env));
    }

    let mut token_id = 0u32;
    let cost = bench(&env, "collection.burn", || {
        token_id += 1;
        client.burn(&owner, &token_id)
    });

    assert_cpu_under("collection.burn", &cost, 500_000);
}

#[test]
fn bench_collection_reads() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = collection(&env);
    let owner = Address::generate(&env);
    client.mint(
        &admin,
        &owner,
        &1u32,
        &String::from_str(&env, "ipfs://bench"),
        &Vec::new(&env),
    );

    let cost = bench(&env, "collection.owner_of", || client.owner_of(&1u32));
    assert_cpu_under("collection.owner_of", &cost, 300_000);

    let cost = bench(&env, "collection.total_supply", || client.total_supply());
    assert_cpu_under("collection.total_supply", &cost, 300_000);

    let cost = bench(&env, "collection.get_token_uri", || {
        client.get_token_uri(&1u32)
    });
    assert_cpu_under("collection.get_token_uri", &cost, 300_000);

    let cost = bench(&env, "collection.get_royalty_info", || {
        client.get_royalty_info()
    });
    assert_cpu_under("collection.get_royalty_info", &cost, 300_000);
}
