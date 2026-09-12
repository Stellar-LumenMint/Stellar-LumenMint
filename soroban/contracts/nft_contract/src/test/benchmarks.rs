//! Gas benchmarks for the NFT contract's major operations.
//!
//! Each benchmark invokes the operation inside the Soroban test host and
//! reports the resources the host metered for that invocation:
//!
//! ```text
//! BENCH|nft.transfer|cpu=364892|mem=55604|read=0|write=6|rbytes=0|wbytes=1064|events=212|rent=0
//! ```
//!
//! * `cpu` — modelled CPU instructions
//! * `mem` — modelled memory in bytes (does not affect the fee)
//! * `read` / `write` — ledger entries restored from disk / modified
//! * `rbytes` / `wbytes` — bytes read from / written to the ledger
//! * `events` — total size of the contract events emitted, in bytes
//! * `rent` — persistent rent bump in ledger-bytes, i.e. the cost of keeping
//!   the entries this operation wrote alive for the TTL window
//!
//! Everything is read from [`soroban_sdk::Env::cost_estimate`], which meters
//! the last top-level invocation including any nested calls into the NFT or
//! asset contracts.
//!
//! ## Why no fee figure
//!
//! `cost_estimate().fee()` also returns a stroop estimate, and it is not
//! reported here on purpose. In the test host a native test contract's ledger
//! footprint is not the footprint of the compiled Wasm contract, and measuring
//! shows the difference is large and constant: every state-changing invocation
//! carries a fixed ~1.28M stroop *temporary* rent component from a ~438-byte
//! entry the host keeps for the test contract, and the first instance-TTL
//! extension is charged against a ~130KB instance. Both dwarf the operation
//! being measured and neither exists on-chain.
//!
//! The counters above are free of that distortion, so they are what the
//! regression ceilings are built on. For real fees, simulate against RPC or
//! read the fee the network charged — see `soroban/GAS.md`, which records
//! Testnet measurements taken that way.

// The contract crate is `#![no_std]`; the harness needs the standard library to
// write its report to stdout, which the test profile links.
extern crate std;

use crate::types::{CollectionConfig, RoyaltyInfo, TokenAttribute};
use crate::{NftContract, NftContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

/// Measured runs per benchmark. The first invocation is a warm up, discarded so
/// that lazily-created storage is not charged to the measurement.
const RUNS: u32 = 3;

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

/// Read the resources of the invocation that just completed.
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
///
/// Metering is deterministic, so the cheapest run is the one free of residual
/// first-call overhead; taking the minimum rather than the mean keeps the
/// recorded baseline exact instead of smeared.
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

/// Assert an operation's instruction count stays under `ceiling`.
///
/// Ceilings are the recorded baseline with ~1.6x headroom: loose enough to
/// absorb a toolchain shift, tight enough that a real algorithmic regression
/// trips it.
fn assert_cpu_under(name: &str, cost: &Cost, ceiling: i64) {
    assert!(
        cost.cpu <= ceiling,
        "{name}: {} CPU instructions exceeds the {ceiling} ceiling; a hot path regressed",
        cost.cpu
    );
}

fn empty_attrs(env: &Env) -> Vec<TokenAttribute> {
    Vec::new(env)
}

fn make_config(env: &Env) -> CollectionConfig {
    CollectionConfig {
        name: String::from_str(env, "GasBench"),
        symbol: String::from_str(env, "GAS"),
        base_uri: String::from_str(env, ""),
        max_supply: Some(10_000),
        mint_price: None,
        is_revealed: true,
        metadata_is_frozen: false,
    }
}

fn setup(env: &Env) -> (NftContractClient<'_>, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(NftContract, ());
    let client = NftContractClient::new(env, &contract_id);
    let royalty = RoyaltyInfo {
        recipient: admin.clone(),
        percentage: 500,
    };
    client.initialize(&admin, &make_config(env), &Some(royalty));
    (client, admin)
}

fn mint_one(client: &NftContractClient<'_>, env: &Env, admin: &Address, to: &Address) -> u64 {
    client.mint(
        admin,
        to,
        &String::from_str(env, "ipfs://bench"),
        &empty_attrs(env),
        &None,
    )
}

/// Mint `count` tokens to `owner` up front so a repeated benchmark always has
/// fresh state to work on.
fn pre_mint(
    client: &NftContractClient<'_>,
    env: &Env,
    admin: &Address,
    owner: &Address,
    count: u32,
) -> Vec<u64> {
    let mut ids = Vec::new(env);
    for _ in 0..count {
        ids.push_back(mint_one(client, env, admin, owner));
    }
    ids
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

#[test]
fn bench_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(NftContract, ());
    let client = NftContractClient::new(&env, &contract_id);

    // `initialize` can only run once per contract, so it is measured directly
    // rather than through `bench`.
    client.initialize(
        &admin,
        &make_config(&env),
        &Some(RoyaltyInfo {
            recipient: admin.clone(),
            percentage: 500,
        }),
    );
    let cost = snapshot(&env);
    report("nft.initialize", &cost);
    assert_cpu_under("nft.initialize", &cost, 250_000);
}

// ─── Minting ─────────────────────────────────────────────────────────────────

#[test]
fn bench_mint_single() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let user = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://bench");
    let attrs = empty_attrs(&env);

    let cost = bench(&env, "nft.mint", || {
        client.mint(&admin, &user, &uri, &attrs, &None)
    });

    assert_cpu_under("nft.mint", &cost, 550_000);
}

#[test]
fn bench_mint_batch_10() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    let mut recipients = Vec::new(&env);
    let mut uris = Vec::new(&env);
    let mut all_attrs = Vec::new(&env);
    for _ in 0..10u32 {
        recipients.push_back(Address::generate(&env));
        uris.push_back(String::from_str(&env, "ipfs://batch"));
        all_attrs.push_back(empty_attrs(&env));
    }

    let cost = bench(&env, "nft.batch_mint(10)", || {
        client.batch_mint(&admin, &recipients, &uris, &all_attrs)
    });

    // Ten separate mints cost ~3.3M instructions; batching is expected to be
    // materially cheaper than that, not merely equal.
    assert_cpu_under("nft.batch_mint(10)", &cost, 4_000_000);
    assert!(
        cost.cpu < 3_326_130,
        "nft.batch_mint(10) at {} instructions is no cheaper than ten single mints",
        cost.cpu
    );
}

// ─── Transfers ───────────────────────────────────────────────────────────────

#[test]
fn bench_transfer() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let ids = pre_mint(&client, &env, &admin, &alice, RUNS + 1);
    let mut next = 0u32;

    let cost = bench(&env, "nft.transfer", || {
        let token_id = ids.get(next).unwrap();
        next += 1;
        client.transfer(&alice, &alice, &bob, &token_id)
    });

    assert_cpu_under("nft.transfer", &cost, 600_000);
}

#[test]
fn bench_batch_transfer_10() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let ids = pre_mint(&client, &env, &admin, &alice, (RUNS + 1) * 10);
    let mut next = 0u32;

    let cost = bench(&env, "nft.batch_transfer(10)", || {
        let mut batch = Vec::new(&env);
        for _ in 0..10u32 {
            batch.push_back(ids.get(next).unwrap());
            next += 1;
        }
        client.batch_transfer(&alice, &alice, &bob, &batch)
    });

    assert_cpu_under("nft.batch_transfer(10)", &cost, 6_300_000);

    // Recorded so the suite fails loudly if batching ever becomes *worse* than
    // ten individual transfers (3.65M instructions at the time of writing)
    // instead of drifting there unnoticed.
    assert!(
        cost.cpu < 4_500_000,
        "nft.batch_transfer(10) at {} instructions is barely cheaper than ten \
         single transfers (3.65M)",
        cost.cpu
    );
}

// ─── Burn ────────────────────────────────────────────────────────────────────

#[test]
fn bench_burn() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let owner = Address::generate(&env);

    let ids = pre_mint(&client, &env, &admin, &owner, RUNS + 1);
    let mut next = 0u32;

    let cost = bench(&env, "nft.burn", || {
        let token_id = ids.get(next).unwrap();
        next += 1;
        client.burn(&owner, &token_id)
    });

    assert_cpu_under("nft.burn", &cost, 550_000);
}

#[test]
fn bench_batch_burn_10() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let owner = Address::generate(&env);

    let ids = pre_mint(&client, &env, &admin, &owner, (RUNS + 1) * 10);
    let mut next = 0u32;

    let cost = bench(&env, "nft.batch_burn(10)", || {
        let mut batch = Vec::new(&env);
        for _ in 0..10u32 {
            batch.push_back(ids.get(next).unwrap());
            next += 1;
        }
        client.batch_burn(&owner, &batch)
    });

    assert_cpu_under("nft.batch_burn(10)", &cost, 5_600_000);
}

// ─── Approvals ───────────────────────────────────────────────────────────────

#[test]
fn bench_approve() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let owner = Address::generate(&env);
    let operator = Address::generate(&env);
    let token_id = mint_one(&client, &env, &admin, &owner);

    let cost = bench(&env, "nft.approve", || {
        client.approve(&owner, &operator, &token_id)
    });

    assert_cpu_under("nft.approve", &cost, 250_000);
}

// ─── Reads ───────────────────────────────────────────────────────────────────

#[test]
fn bench_reads() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let owner = Address::generate(&env);
    let token_id = mint_one(&client, &env, &admin, &owner);

    let cost = bench(&env, "nft.owner_of", || client.owner_of(&token_id));
    assert_cpu_under("nft.owner_of", &cost, 200_000);

    let cost = bench(&env, "nft.token_uri", || client.token_uri(&token_id));
    assert_cpu_under("nft.token_uri", &cost, 250_000);

    let cost = bench(&env, "nft.token_metadata", || {
        client.token_metadata(&token_id)
    });
    assert_cpu_under("nft.token_metadata", &cost, 220_000);

    let cost = bench(&env, "nft.balance_of", || client.balance_of(&owner));
    assert_cpu_under("nft.balance_of", &cost, 200_000);

    let cost = bench(&env, "nft.supports_interface", || {
        client.supports_interface(&1u32)
    });
    assert_cpu_under("nft.supports_interface", &cost, 180_000);
}

// ─── Royalty ─────────────────────────────────────────────────────────────────

#[test]
fn bench_royalty() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let creator = Address::generate(&env);
    let token_id = mint_one(&client, &env, &admin, &creator);

    let cost = bench(&env, "nft.get_royalty_info", || {
        client.get_royalty_info(&token_id, &1_000_000)
    });
    assert_cpu_under("nft.get_royalty_info", &cost, 250_000);

    let cost = bench(&env, "nft.set_token_royalty", || {
        client.set_token_royalty(&admin, &token_id, &creator, &250u32)
    });
    assert_cpu_under("nft.set_token_royalty", &cost, 300_000);
}
