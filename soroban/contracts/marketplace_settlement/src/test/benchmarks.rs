//! Gas benchmarks for the marketplace settlement contract's major flows.
//!
//! Each benchmark invokes the operation inside the Soroban test host and
//! reports the resources the host metered for that invocation:
//!
//! ```text
//! BENCH|marketplace.execute_sale|cpu=1234567|mem=234567|read=0|write=9|...
//! ```
//!
//! See `contracts/nft_contract/src/test/benchmarks.rs` for what each counter
//! means, why the stroop fee estimate is deliberately not reported from the
//! test host, and how `soroban/GAS.md` records the real figures.
//!
//! The settlement flows are the expensive ones in this codebase: each one
//! writes a transaction record, moves an NFT, moves payment and pays out
//! royalty and platform fee, so the counters here are the ones to watch when a
//! change touches storage layout or the payout path.

// The contract crate is `#![no_std]`; the harness needs the standard library to
// write its report to stdout, which the test profile links.
extern crate std;

use super::{default_fee_config, mk_asset, new_env, reg, MockNft, MockNftClient};
use crate::settlement_core::{MarketplaceSettlement, MarketplaceSettlementClient};
use crate::types::{AuctionType, NFTItem};
use soroban_sdk::{
    contract, contractimpl, testutils::Address as _, testutils::Ledger as _, Address, Env, Symbol,
    Vec,
};

/// An NFT that tracks ownership per token id.
///
/// The mock defined for the behavioural tests keeps a single owner slot that it
/// overwrites on every transfer, which is fine for a test that moves one token
/// once. Benchmarks repeat an operation, so they need real per-token escrow: a
/// flow that checks `owner_of` against the seller has to see the *next* token
/// still owned by that seller after the previous one was escrowed.
#[contract]
pub struct BenchNft;

#[contractimpl]
impl BenchNft {
    /// Assign a token without going through `transfer`, so setup is not
    /// measured as part of the operation under test.
    pub fn seed_owner(env: Env, token_id: u64, owner: Address) {
        env.storage().persistent().set(&token_id, &owner);
    }

    pub fn owner_of(env: Env, token_id: u64) -> Address {
        env.storage()
            .persistent()
            .get(&token_id)
            .unwrap_or_else(|| panic!("token {token_id} has no owner"))
    }

    /// Mirrors `NftContract::transfer`'s argument list so an ABI mismatch in the
    /// production contract surfaces here as an arity error.
    pub fn transfer(env: Env, _caller: Address, _from: Address, to: Address, token_id: u64) {
        env.storage().persistent().set(&token_id, &to);
    }
}

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

/// Assert an operation's instruction count stays under `ceiling`.
fn assert_cpu_under(name: &str, cost: &Cost, ceiling: i64) {
    assert!(
        cost.cpu <= ceiling,
        "{name}: {} CPU instructions exceeds the {ceiling} ceiling; a hot path regressed",
        cost.cpu
    );
}

/// A marketplace with one allowlisted NFT contract and one allowlisted asset,
/// plus rate limits raised so a benchmark measuring a single call is not
/// throttled by the per-function limits meant for real traffic.
struct Fixture {
    env: Env,
    client: MarketplaceSettlementClient<'static>,
    admin: Address,
    asset: crate::types::Asset,
    nft: Address,
}

fn fixture() -> Fixture {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);

    for name in [
        "create_sale",
        "create_auction",
        "place_bid",
        "create_bundle",
        "create_trade",
    ] {
        client.update_rate_limit(&Symbol::new(&env, name), &10_000u32, &60u64, &admin);
    }

    Fixture {
        env,
        client,
        admin,
        asset,
        nft,
    }
}

fn item(_env: &Env, nft: &Address, token_id: u64) -> NFTItem {
    NFTItem {
        nft_address: nft.clone(),
        token_id,
    }
}

/// Fixture whose NFT tracks ownership per token id.
fn escrow_fixture() -> Fixture {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let nft = env.register(BenchNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);

    for name in ["create_bundle", "create_trade"] {
        client.update_rate_limit(&Symbol::new(&env, name), &10_000u32, &60u64, &admin);
    }

    Fixture {
        env,
        client,
        admin,
        asset,
        nft,
    }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

#[test]
fn bench_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register(MarketplaceSettlement, ());
    let client = MarketplaceSettlementClient::new(&env, &cid);
    let admin = Address::generate(&env);

    // `initialize` can only run once per contract, so it is measured directly.
    client.initialize(&admin, &default_fee_config(&env, admin.clone()));
    let cost = snapshot(&env);
    report("marketplace.initialize", &cost);
    assert_cpu_under("marketplace.initialize", &cost, 400_000);
}

// ─── Sales ───────────────────────────────────────────────────────────────────

#[test]
fn bench_create_sale() {
    let f = fixture();
    let seller = Address::generate(&f.env);
    MockNftClient::new(&f.env, &f.nft).set_owner(&seller);

    let mut token_id = 0u64;
    let cost = bench(&f.env, "marketplace.create_sale", || {
        token_id += 1;
        f.client.create_sale(
            &seller,
            &f.nft,
            &token_id,
            &1_000_000i128,
            &f.asset,
            &86_400u64,
        )
    });

    assert_cpu_under("marketplace.create_sale", &cost, 1_500_000);
}

#[test]
fn bench_execute_sale() {
    let f = fixture();
    let seller = Address::generate(&f.env);
    let buyer = Address::generate(&f.env);
    MockNftClient::new(&f.env, &f.nft).set_owner(&seller);

    let mut sales = Vec::new(&f.env);
    for token_id in 1..=(RUNS + 1) as u64 {
        sales.push_back(f.client.create_sale(
            &seller,
            &f.nft,
            &token_id,
            &1_000_000i128,
            &f.asset,
            &86_400u64,
        ));
    }

    let mut next = 0u32;
    let cost = bench(&f.env, "marketplace.execute_sale", || {
        let id = sales.get(next).unwrap();
        next += 1;
        f.client.execute_sale(&id, &buyer, &1_000_000i128)
    });

    assert_cpu_under("marketplace.execute_sale", &cost, 3_500_000);
}

#[test]
fn bench_cancel_sale() {
    let f = fixture();
    let seller = Address::generate(&f.env);
    MockNftClient::new(&f.env, &f.nft).set_owner(&seller);
    let sale = Symbol::new(&f.env, "sale");

    let mut sales = Vec::new(&f.env);
    for token_id in 1..=(RUNS + 1) as u64 {
        sales.push_back(f.client.create_sale(
            &seller,
            &f.nft,
            &token_id,
            &1_000_000i128,
            &f.asset,
            &86_400u64,
        ));
    }

    let mut next = 0u32;
    let cost = bench(&f.env, "marketplace.cancel_sale", || {
        let id = sales.get(next).unwrap();
        next += 1;
        f.client.cancel_transaction(&id, &sale, &seller)
    });

    assert_cpu_under("marketplace.cancel_sale", &cost, 1_500_000);
}

// ─── Auctions ────────────────────────────────────────────────────────────────

#[test]
fn bench_create_auction() {
    let f = fixture();
    let seller = Address::generate(&f.env);
    MockNftClient::new(&f.env, &f.nft).set_owner(&seller);

    let mut token_id = 0u64;
    let cost = bench(&f.env, "marketplace.create_auction", || {
        token_id += 1;
        f.client.create_auction(
            &seller,
            &f.nft,
            &token_id,
            &100_000i128,
            &80_000i128,
            &86_400u64,
            &1_000i128,
            &AuctionType::English,
            &f.asset,
        )
    });

    assert_cpu_under("marketplace.create_auction", &cost, 1_800_000);
}

#[test]
fn bench_place_bid() {
    let f = fixture();
    let seller = Address::generate(&f.env);
    let bidder = Address::generate(&f.env);
    MockNftClient::new(&f.env, &f.nft).set_owner(&seller);

    let auction_id = f.client.create_auction(
        &seller,
        &f.nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &86_400u64,
        &1_000i128,
        &AuctionType::English,
        &f.asset,
    );

    // Each bid has to clear the previous one by the increment, so the amount
    // climbs run over run.
    let mut amount = 100_000i128;
    let cost = bench(&f.env, "marketplace.place_bid", || {
        amount += 10_000;
        f.client.place_bid(&auction_id, &bidder, &amount, &None)
    });

    assert_cpu_under("marketplace.place_bid", &cost, 1_800_000);
}

#[test]
fn bench_end_auction() {
    let f = fixture();
    let seller = Address::generate(&f.env);
    let bidder = Address::generate(&f.env);
    MockNftClient::new(&f.env, &f.nft).set_owner(&seller);

    // One auction per run: settlement closes the lot, so it cannot be repeated.
    let mut auctions = Vec::new(&f.env);
    for token_id in 1..=(RUNS + 1) as u64 {
        let id = f.client.create_auction(
            &seller,
            &f.nft,
            &token_id,
            &100_000i128,
            &80_000i128,
            &3_600u64,
            &1_000i128,
            &AuctionType::English,
            &f.asset,
        );
        f.client.place_bid(&id, &bidder, &150_000i128, &None);
        auctions.push_back(id);
    }

    f.env
        .ledger()
        .set_timestamp(f.env.ledger().timestamp() + 3_601);

    let mut next = 0u32;
    let cost = bench(&f.env, "marketplace.end_auction", || {
        let id = auctions.get(next).unwrap();
        next += 1;
        f.client.end_auction(&id, &f.admin)
    });

    assert_cpu_under("marketplace.end_auction", &cost, 4_000_000);
}

// ─── Bundles ─────────────────────────────────────────────────────────────────

#[test]
fn bench_create_bundle() {
    let f = escrow_fixture();
    let seller = Address::generate(&f.env);
    let nft = BenchNftClient::new(&f.env, &f.nft);

    // Seed every token the runs will consume up front, so the ownership check
    // sees a seller-owned token each time and setup stays out of the timer.
    for token_id in 1..=(RUNS + 1) as u64 {
        nft.seed_owner(&token_id, &seller);
    }

    let mut token_id = 0u64;
    let cost = bench(&f.env, "marketplace.create_bundle", || {
        token_id += 1;
        let items = Vec::from_array(&f.env, [item(&f.env, &f.nft, token_id)]);
        f.client
            .create_bundle(&seller, &items, &1_000_000i128, &f.asset, &86_400u64)
    });

    assert_cpu_under("marketplace.create_bundle", &cost, 1_800_000);
}

#[test]
fn bench_create_bundle_10_items() {
    let f = escrow_fixture();
    let seller = Address::generate(&f.env);
    let nft = BenchNftClient::new(&f.env, &f.nft);

    // Warm up plus `RUNS` measured runs, ten tokens each.
    for token_id in 1..=((RUNS + 2) * 10) as u64 {
        nft.seed_owner(&token_id, &seller);
    }

    let mut round = 0u64;
    let cost = bench(&f.env, "marketplace.create_bundle(10)", || {
        round += 1;
        let mut items = Vec::new(&f.env);
        for offset in 0..10u64 {
            items.push_back(item(&f.env, &f.nft, round * 10 + offset));
        }
        f.client
            .create_bundle(&seller, &items, &1_000_000i128, &f.asset, &86_400u64)
    });

    // Escrowing ten tokens instead of one should scale roughly linearly with
    // the item count, not super-linearly.
    assert_cpu_under("marketplace.create_bundle(10)", &cost, 6_000_000);
}

#[test]
fn bench_execute_bundle() {
    let f = escrow_fixture();
    let seller = Address::generate(&f.env);
    let buyer = Address::generate(&f.env);
    let nft = BenchNftClient::new(&f.env, &f.nft);

    let mut bundles = Vec::new(&f.env);
    for token_id in 1..=(RUNS + 1) as u64 {
        nft.seed_owner(&token_id, &seller);
        let items = Vec::from_array(&f.env, [item(&f.env, &f.nft, token_id)]);
        bundles.push_back(f.client.create_bundle(
            &seller,
            &items,
            &1_000_000i128,
            &f.asset,
            &86_400u64,
        ));
    }

    let mut next = 0u32;
    let cost = bench(&f.env, "marketplace.execute_bundle", || {
        let id = bundles.get(next).unwrap();
        next += 1;
        f.client.execute_bundle(&id, &buyer, &1_000_000i128)
    });

    assert_cpu_under("marketplace.execute_bundle", &cost, 3_500_000);
}

// ─── Trades ──────────────────────────────────────────────────────────────────

#[test]
fn bench_create_trade() {
    let f = escrow_fixture();
    let initiator = Address::generate(&f.env);
    let counterparty = Address::generate(&f.env);
    let nft = BenchNftClient::new(&f.env, &f.nft);

    for token_id in 1..=(RUNS + 1) as u64 {
        nft.seed_owner(&token_id, &initiator);
    }

    let mut token_id = 0u64;
    let cost = bench(&f.env, "marketplace.create_trade", || {
        token_id += 1;
        let mine = Vec::from_array(&f.env, [item(&f.env, &f.nft, token_id)]);
        let theirs = Vec::from_array(&f.env, [item(&f.env, &f.nft, token_id)]);
        f.client.create_trade(
            &initiator,
            &Some(counterparty.clone()),
            &mine,
            &theirs,
            &86_400u64,
        )
    });

    assert_cpu_under("marketplace.create_trade", &cost, 2_500_000);
}

// ─── Reads ───────────────────────────────────────────────────────────────────

#[test]
fn bench_reads() {
    let f = fixture();
    let seller = Address::generate(&f.env);
    MockNftClient::new(&f.env, &f.nft).set_owner(&seller);

    let sale_id =
        f.client
            .create_sale(&seller, &f.nft, &1u64, &1_000_000i128, &f.asset, &86_400u64);

    let auction_id = f.client.create_auction(
        &seller,
        &f.nft,
        &2u64,
        &100_000i128,
        &80_000i128,
        &86_400u64,
        &1_000i128,
        &AuctionType::English,
        &f.asset,
    );

    let cost = bench(&f.env, "marketplace.get_sale", || {
        f.client.get_sale(&sale_id)
    });
    assert_cpu_under("marketplace.get_sale", &cost, 400_000);

    let cost = bench(&f.env, "marketplace.get_auction", || {
        f.client.get_auction(&auction_id)
    });
    assert_cpu_under("marketplace.get_auction", &cost, 400_000);

    let cost = bench(&f.env, "marketplace.get_accumulated_fees", || {
        f.client.get_accumulated_fees(&f.asset)
    });
    assert_cpu_under("marketplace.get_accumulated_fees", &cost, 300_000);
}

// ─── Admin configuration ─────────────────────────────────────────────────────

#[test]
fn bench_allowlists() {
    let f = fixture();
    let extra = Address::generate(&f.env);

    let cost = bench(&f.env, "marketplace.add_allowed_token_contract", || {
        f.client.add_allowed_token_contract(&f.admin, &extra)
    });
    assert_cpu_under("marketplace.add_allowed_token_contract", &cost, 600_000);
}
