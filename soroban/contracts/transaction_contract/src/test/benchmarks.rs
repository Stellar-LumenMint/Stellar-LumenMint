//! Gas benchmarks for the transaction contract's major entrypoints.
//!
//! Each benchmark invokes the operation inside the Soroban test host and
//! reports the resources the host metered for that invocation:
//!
//! ```text
//! BENCH|transaction.execute_transaction(2 ops)|cpu=...|mem=...|...
//! ```
//!
//! See `contracts/nft_contract/src/test/benchmarks.rs` for what each counter
//! means and why the stroop fee estimate is deliberately not reported from the
//! test host. `soroban/GAS.md` records the real figures.
//!
//! Note that this contract keeps its own internal gas model in
//! `utils::gas_calculator` — that is an on-chain estimate of what *a blueprint's
//! operations* would cost, not a measurement of what this contract costs. The
//! numbers here are the latter, so the two are not comparable.

extern crate std;

use super::sample_operation;
use crate::transaction_core::{TransactionContract, TransactionContractClient};
use crate::types::{default_gas_config, GasOptimizationConfig};
use crate::TransactionBlueprint;
use soroban_sdk::{map, testutils::Address as _, vec, Address, Bytes, Env, String, Vec};

/// Measured runs per benchmark. The first invocation is a warm up.
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

fn client(env: &Env) -> TransactionContractClient<'_> {
    let contract_id = env.register(TransactionContract, ());
    TransactionContractClient::new(env, &contract_id)
}

fn metadata(env: &Env) -> soroban_sdk::Map<String, String> {
    map![
        env,
        (
            String::from_str(env, "workflow"),
            String::from_str(env, "mint+list")
        )
    ]
}

fn gas_config(env: &Env) -> GasOptimizationConfig {
    default_gas_config(env)
}

/// Create `count` transactions, each holding two dependent operations.
fn pre_create(client: &TransactionContractClient<'_>, env: &Env, count: u32) -> Vec<u64> {
    let creator = Address::generate(env);
    let mut ids = Vec::new(env);
    for _ in 0..count {
        let tx = client.create_transaction(&creator, &metadata(env), &vec![env]);
        client.add_operation(&tx, &sample_operation(env, 1, vec![env]));
        client.add_operation(&tx, &sample_operation(env, 2, vec![env, 1]));
        ids.push_back(tx);
    }
    ids
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

#[test]
fn bench_create_transaction() {
    let env = Env::default();
    env.mock_all_auths();
    let client = client(&env);
    let creator = Address::generate(&env);
    let meta = metadata(&env);

    let cost = bench(&env, "transaction.create_transaction", || {
        client.create_transaction(&creator, &meta, &vec![&env])
    });

    assert_cpu_under("transaction.create_transaction", &cost, 600_000);
}

#[test]
fn bench_add_operation() {
    let env = Env::default();
    env.mock_all_auths();
    let client = client(&env);
    let creator = Address::generate(&env);
    let meta = metadata(&env);

    // One transaction per run, because an operation id must be unique within a
    // transaction and repeated adds would be rejected.
    let mut ids = Vec::new(&env);
    for _ in 0..=(RUNS + 1) {
        ids.push_back(client.create_transaction(&creator, &meta, &vec![&env]));
    }

    let mut next = 0u32;
    let cost = bench(&env, "transaction.add_operation", || {
        let tx = ids.get(next).unwrap();
        next += 1;
        client.add_operation(&tx, &sample_operation(&env, 1, vec![&env]))
    });

    assert_cpu_under("transaction.add_operation", &cost, 600_000);
}

#[test]
fn bench_execute_transaction_two_ops() {
    let env = Env::default();
    env.mock_all_auths();
    let client = client(&env);
    let ids = pre_create(&client, &env, RUNS + 1);

    let mut next = 0u32;
    let cost = bench(&env, "transaction.execute_transaction(2 ops)", || {
        let tx = ids.get(next).unwrap();
        next += 1;
        client.execute_transaction(&tx, &None, &None)
    });

    assert_cpu_under("transaction.execute_transaction(2 ops)", &cost, 6_000_000);
}

#[test]
fn bench_cancel_transaction() {
    let env = Env::default();
    env.mock_all_auths();
    let client = client(&env);
    let ids = pre_create(&client, &env, RUNS + 1);

    let mut next = 0u32;
    let cost = bench(&env, "transaction.cancel_transaction", || {
        let tx = ids.get(next).unwrap();
        next += 1;
        client.cancel_transaction(&tx, &String::from_str(&env, "benchmark"))
    });

    assert_cpu_under("transaction.cancel_transaction", &cost, 1_500_000);
}

// ─── Batching ────────────────────────────────────────────────────────────────

#[test]
fn bench_batch_create_10() {
    let env = Env::default();
    env.mock_all_auths();
    let client = client(&env);
    let creator = Address::generate(&env);

    let cost = bench(&env, "transaction.batch_create(10)", || {
        let mut blueprints = Vec::new(&env);
        for _ in 0..10u32 {
            blueprints.push_back(TransactionBlueprint {
                creator: creator.clone(),
                metadata: map![&env],
                initial_operations: vec![&env],
            });
        }
        client.batch_create_transactions(&blueprints)
    });

    assert_cpu_under("transaction.batch_create(10)", &cost, 4_000_000);
}

#[test]
fn bench_batch_execute_10() {
    let env = Env::default();
    env.mock_all_auths();
    let client = client(&env);
    let creator = Address::generate(&env);

    // Ten transactions per run: execution finalises them, so they cannot repeat.
    let mut batches = Vec::new(&env);
    for _ in 0..=(RUNS + 1) {
        let mut blueprints = Vec::new(&env);
        for _ in 0..10u32 {
            blueprints.push_back(TransactionBlueprint {
                creator: creator.clone(),
                metadata: map![&env],
                initial_operations: vec![&env],
            });
        }
        batches.push_back(client.batch_create_transactions(&blueprints));
    }

    let mut next = 0u32;
    let config = gas_config(&env);
    let cost = bench(&env, "transaction.batch_execute(10)", || {
        let ids = batches.get(next).unwrap();
        next += 1;
        client.batch_execute_transactions(&ids, &config)
    });

    assert_cpu_under("transaction.batch_execute(10)", &cost, 25_000_000);
}

// ─── Signatures and gas ──────────────────────────────────────────────────────

#[test]
fn bench_signatures() {
    let env = Env::default();
    env.mock_all_auths();
    let client = client(&env);
    let ids = pre_create(&client, &env, 1);
    let tx = ids.get(0).unwrap();

    let mut round = 0u8;
    let cost = bench(&env, "transaction.add_signature", || {
        round = round.wrapping_add(1);
        client.add_signature(
            &tx,
            &Address::generate(&env),
            &Bytes::from_slice(&env, &[round; 64]),
        )
    });
    assert_cpu_under("transaction.add_signature", &cost, 800_000);

    let cost = bench(&env, "transaction.verify_signatures", || {
        client.verify_signatures(&tx)
    });
    assert_cpu_under("transaction.verify_signatures", &cost, 600_000);
}

#[test]
fn bench_gas_estimate() {
    let env = Env::default();
    env.mock_all_auths();
    let client = client(&env);
    let ids = pre_create(&client, &env, RUNS + 1);

    let mut next = 0u32;
    let cost = bench(&env, "transaction.estimate_transaction_gas", || {
        let tx = ids.get(next).unwrap();
        next += 1;
        client.estimate_transaction_gas(&tx)
    });

    assert_cpu_under("transaction.estimate_transaction_gas", &cost, 1_200_000);
}

// ─── Reads ───────────────────────────────────────────────────────────────────

#[test]
fn bench_get_status() {
    let env = Env::default();
    env.mock_all_auths();
    let client = client(&env);
    let ids = pre_create(&client, &env, 1);
    let tx = ids.get(0).unwrap();

    let cost = bench(&env, "transaction.get_transaction_status", || {
        client.get_transaction_status(&tx)
    });

    assert_cpu_under("transaction.get_transaction_status", &cost, 400_000);
}
