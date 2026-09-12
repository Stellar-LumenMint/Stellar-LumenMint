# Gas Benchmarks & Optimisation Results

This is the reference for what the LumenMint contracts cost to run: the modelled
resources every entry point consumes, the ceilings that guard against
regressions, and the fees Stellar Testnet actually charged for representative
invocations of the deployed instances.

The benchmark harness lives next to the tests —
`contracts/*/src/test/benchmarks.rs` — and every number in the tables below is
produced by it. Nothing here is estimated by hand.

---

## How to reproduce

```bash
cd soroban
cargo test --package nft_contract            --lib benchmarks -- --nocapture
cargo test --package marketplace_settlement  --lib benchmarks -- --nocapture
cargo test --package collection_factory      --lib benchmarks -- --nocapture
cargo test --package transaction_contract    --lib benchmarks -- --nocapture
```

Each benchmark prints one machine-readable line:

```text
BENCH|nft.transfer|cpu=348978|mem=54250|read=0|write=6|rbytes=0|wbytes=1064|events=212|rent=0
```

and then asserts an instruction ceiling, so the suite fails if a hot path
regresses. `factory.create_collection` needs the collection Wasm built; without
it the benchmark prints `BENCH-SKIP` and returns rather than reporting a
fabricated number:

```bash
cargo build --workspace --release --target wasm32-unknown-unknown
```

---

## What is measured

All figures come from `Env::cost_estimate()`, which meters the last top-level
invocation **including nested calls** into the NFT and asset contracts.

| Field | Meaning |
| --- | --- |
| `cpu` | Modelled CPU instructions. The dominant input to the resource fee. |
| `mem` | Modeled memory in bytes. Does not affect the fee. |
| `read` / `write` | Ledger entries restored from disk / modified. |
| `rbytes` / `wbytes` | Bytes read from / written to the ledger. |
| `events` | Total size of the contract events emitted, in bytes. |
| `rent` | Persistent rent bump in ledger-bytes — the cost of keeping the entries this operation wrote alive for the TTL window. |

### Measurement method

Each benchmark runs the operation once as a warm up, discards that run, then
runs it `RUNS = 3` times and keeps the **cheapest** run. Metering is
deterministic, so the minimum is the run free of residual first-call overhead;
taking the minimum rather than the mean keeps the recorded baseline exact
instead of smeared.

### Why there is no fee figure in the modelled tables

`cost_estimate().fee()` also returns a stroop estimate, and it is deliberately
not reported. In the test host a native test contract's ledger footprint is not
the footprint of the compiled Wasm contract, and the difference is large and
constant: every state-changing invocation carries a fixed ~1.28M stroop
*temporary* rent component from a ~438-byte entry the host keeps for the test
contract, and the first instance-TTL extension is charged against a ~130KB
instance. Both dwarf the operation being measured and neither exists on-chain.

That is also why the `rent` column is only meaningful for operations that write
persistent state. The two `initialize` rows and `collection.init` carry enormous
`rent` values for exactly this reason — they extend the instance TTL of the test
contract, not of the deployed one. For real fees, see
[Network fees on Testnet](#network-fees-on-testnet).

---

## Baseline — NFT contract

| Operation | CPU | Mem (B) | Read | Write | Read B | Write B | Events (B) | Rent |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `nft.initialize` | 145,376 | 14,709 | 0 | 2 | 0 | 1,244 | 0 | † |
| `nft.mint` | 333,578 | 52,648 | 0 | 5 | 0 | 2,100 | 156 | 746,496,000 |
| `nft.batch_mint(10)` | 2,470,448 | 407,870 | 0 | 32 | 0 | 9,804 | 1,560 | 7,464,960,000 |
| `nft.transfer` | 348,978 | 54,250 | 0 | 6 | 0 | 1,064 | 212 | 0 |
| `nft.safe_transfer_from` | 349,432 | 54,250 | 0 | 6 | 0 | 1,064 | 212 | 0 |
| `nft.batch_transfer(10)` | 3,721,580 | 750,445 | 0 | 33 | 0 | 7,544 | 2,120 | 0 |
| `nft.burn` | 336,246 | 58,446 | 0 | 7 | 0 | 1,380 | 156 | 0 |
| `nft.batch_burn(10)` | 3,460,105 | 769,848 | 0 | 43 | 0 | 1,380 | 1,560 | 0 |
| `nft.approve` | 136,462 | 24,906 | 0 | 2 | 0 | 216 | 220 | 0 |
| `nft.set_token_royalty` | 161,218 | 27,976 | 0 | 2 | 0 | 272 | 0 | 0 |
| `nft.owner_of` | 95,768 | 18,926 | 0 | 0 | 0 | 0 | 0 | 0 |
| `nft.token_uri` | 149,359 | 24,907 | 0 | 0 | 0 | 0 | 0 | 0 |
| `nft.token_metadata` | 120,349 | 21,746 | 0 | 0 | 0 | 0 | 0 | 0 |
| `nft.balance_of` | 92,274 | 18,556 | 0 | 0 | 0 | 0 | 0 | 0 |
| `nft.get_royalty_info` | 133,627 | 22,852 | 0 | 0 | 0 | 0 | 0 | 0 |
| `nft.supports_interface` | 79,316 | 17,401 | 0 | 0 | 0 | 0 | 0 | 0 |

† Instance-TTL extension of the test contract — not representative on-chain.

## Baseline — Marketplace settlement

| Operation | CPU | Mem (B) | Read | Write | Read B | Write B | Events (B) | Rent |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `marketplace.initialize` | 116,128 | 16,144 | 0 | 3 | 0 | 1,524 | 524 | † |
| `marketplace.create_sale` | 683,507 | 125,477 | 0 | 6 | 0 | 4,484 | 0 | 2,081,894,400 |
| `marketplace.execute_sale` | 856,370 | 163,810 | 0 | 6 | 0 | 4,860 | 496 | 456,192,000 |
| `marketplace.cancel_sale` | 538,522 | 105,557 | 0 | 5 | 0 | 4,272 | 0 | 0 |
| `marketplace.create_auction` | 507,958 | 94,697 | 0 | 5 | 0 | 3,644 | 576 | 1,210,982,400 |
| `marketplace.place_bid` | 640,895 | 112,523 | 0 | 5 | 0 | 4,048 | 864 | 223,948,800 |
| `marketplace.end_auction` | 592,238 | 116,044 | 0 | 5 | 0 | 3,732 | 800 | 124,416,000 |
| `marketplace.create_bundle` | 428,297 | 81,090 | 0 | 5 | 0 | 2,684 | 452 | 646,963,200 |
| `marketplace.create_bundle(10)` | 1,176,829 | 295,507 | 0 | 14 | 0 | 4,556 | 452 | 1,580,083,200 |
| `marketplace.execute_bundle` | 474,719 | 93,882 | 0 | 5 | 0 | 2,652 | 732 | 37,324,800 |
| `marketplace.create_trade` | 390,430 | 75,667 | 0 | 5 | 0 | 2,712 | 264 | 684,288,000 |
| `marketplace.add_allowed_token_contract` | 173,566 | 33,121 | 0 | 2 | 0 | 204 | 0 | 0 |
| `marketplace.get_sale` | 149,881 | 27,305 | 0 | 0 | 0 | 0 | 0 | 0 |
| `marketplace.get_auction` | 157,343 | 27,931 | 0 | 0 | 0 | 0 | 0 | 0 |
| `marketplace.get_accumulated_fees` | 93,609 | 21,527 | 0 | 0 | 0 | 0 | 0 | 0 |

## Baseline — Collection factory

| Operation | CPU | Mem (B) | Read | Write | Read B | Write B | Events (B) | Rent |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `factory.initialize` | 53,181 | 5,267 | 0 | 1 | 0 | 396 | 0 | † |
| `factory.create_collection` | 1,895,569 | 3,718,374 | 0 | 3 | 0 | 2,772 | 464 | 1,613,260,800 |
| `factory.update_creator_limit` | 94,277 | 12,878 | 0 | 2 | 0 | 468 | 152 | 0 |
| `factory.get_collection_count` | 51,048 | 6,694 | 0 | 0 | 0 | 0 | 0 | 0 |
| `factory.get_collections_page` | 51,555 | 6,790 | 0 | 0 | 0 | 0 | 0 | 0 |
| `collection.init` | 87,310 | 9,125 | 0 | 1 | 0 | 900 | 0 | † |
| `collection.mint` | 270,015 | 40,693 | 0 | 2 | 0 | 1,756 | 236 | 406,425,600 |
| `collection.transfer` | 400,516 | 72,198 | 0 | 2 | 0 | 2,708 | 292 | 87,091,200 |
| `collection.burn` | 266,403 | 44,371 | 0 | 2 | 0 | 1,308 | 236 | 0 |
| `collection.owner_of` | 131,129 | 22,284 | 0 | 0 | 0 | 0 | 0 | 0 |
| `collection.total_supply` | 132,831 | 22,375 | 0 | 0 | 0 | 0 | 0 | 0 |
| `collection.get_token_uri` | 132,315 | 22,393 | 0 | 0 | 0 | 0 | 0 | 0 |
| `collection.get_royalty_info` | 135,507 | 22,625 | 0 | 0 | 0 | 0 | 0 | 0 |

## Baseline — Transaction contract

| Operation | CPU | Mem (B) | Read | Write | Read B | Write B | Events (B) | Rent |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `transaction.create_transaction` | 110,198 | 16,454 | 0 | 4 | 0 | 1,012 | 184 | 3,243,240 |
| `transaction.add_operation` | 169,740 | 25,874 | 0 | 2 | 0 | 1,548 | 0 | 3,603,600 |
| `transaction.add_signature` | 287,435 | 45,144 | 0 | 2 | 0 | 2,836 | 0 | 786,240 |
| `transaction.execute_transaction(2 ops)` | 487,273 | 67,042 | 0 | 3 | 0 | 2,852 | 468 | 835,380 |
| `transaction.cancel_transaction` | 330,217 | 52,424 | 0 | 3 | 0 | 2,768 | 232 | 491,400 |
| `transaction.batch_create(10)` | 1,052,155 | 188,212 | 0 | 21 | 0 | 7,708 | 1,840 | 30,958,200 |
| `transaction.batch_execute(10)` | 936,425 | 216,473 | 0 | 10 | 0 | 720 | 0 | 0 |
| `transaction.verify_signatures` | 140,654 | 16,466 | 0 | 0 | 0 | 0 | 0 | 0 |
| `transaction.estimate_transaction_gas` | 144,776 | 15,213 | 0 | 0 | 0 | 0 | 0 | 0 |
| `transaction.get_transaction_status` | 132,302 | 14,596 | 0 | 0 | 0 | 0 | 0 | 0 |

---

## Regression ceilings

Every benchmark asserts an instruction ceiling and fails the test suite when it
is exceeded, so a gas regression cannot land quietly. Ceilings are the recorded
baseline with roughly 1.6x headroom: loose enough to absorb a toolchain shift,
tight enough that a real algorithmic regression trips them.

| Operation | Ceiling (CPU) | Recorded | Headroom |
| --- | ---: | ---: | ---: |
| `nft.transfer` | 460,000 | 348,978 | 1.32x |
| `nft.mint` | 550,000 | 333,578 | 1.65x |
| `nft.batch_transfer(10)` | 4,800,000 | 3,721,580 | 1.29x |
| `nft.batch_burn(10)` | 5,600,000 | 3,460,105 | 1.62x |
| `nft.owner_of` | 200,000 | 95,768 | 2.09x |
| `marketplace.execute_sale` | 3,500,000 | 856,370 | 4.09x |
| `marketplace.end_auction` | 4,000,000 | 592,238 | 6.75x |
| `marketplace.create_bundle(10)` | 6,000,000 | 1,176,829 | 5.10x |
| `factory.create_collection` | 30,000,000 | 1,895,569 | 15.83x |
| `transaction.batch_execute(10)` | 25,000,000 | 936,425 | 26.70x |

The ceilings are intentionally generous where the operation's cost scales with
caller-supplied input — `create_collection` deploys Wasm, `batch_execute` walks a
dependency graph — and tight on the fixed hot paths, which is where a regression
would actually hurt. The full ceiling list is in each `benchmarks.rs`.

---

## Network fees on Testnet

The modelled counters above are what the fee is computed *from*. This section
records what the network actually charged, measured against the live Testnet
instances deployed from commit `bfd6e80`:

| Contract | Contract ID |
| --- | --- |
| `nft_contract` | `CDQN2A5U6SQLL4NZAMV4SL6BAOK6EXDG4G6HHRDJOOH6XK4LPUPZLHJC` |
| `marketplace_settlement` | `CCCUOZVZDUYF3Z42PQYAM2AGNCZSSF6J4IUC2J6ANF4Q5C3F5G4CJKUN` |
| `collection_factory` | `CBRL37EZ5KR2O4J3ECM5RQCREHMYKCZV4QJTUHI6JCGXWJ5BIRXAV6LQ` |
| `transaction_contract` | `CCM4HGRU7CGLFAHHMTTBAQN6C2LEOJLWTTRMKAQX2W2T5EE7LNMW37FQ` |

A Stellar transaction fee has two components:

```text
total fee = inclusion fee (100 stroops x number of operations) + resource fee
```

`min_resource_fee` below is the resource component returned by RPC simulation of
the exact invocation, which is the figure the network then charges. Measured on
2026-09-12 with `stellar` CLI v28.0.0.

| Invocation | Resource fee (stroops) | ≈ XLM |
| --- | ---: | ---: |
| `nft_contract.version` | 12,917 | 0.0012917 |
| `nft_contract.owner_of(1)` | 13,522 | 0.0013522 |
| `nft_contract.token_uri(1)` | 13,524 | 0.0013524 |
| `nft_contract.set_token_uri(1)` | 136,038 | 0.0136038 |
| `nft_contract.transfer(1)` | 146,014 | 0.0146014 |
| `nft_contract.safe_transfer_from(1)` | 146,123 | 0.0146123 |
| `nft_contract.burn(1)` | 150,644 | 0.0150644 |
| `nft_contract.mint` | 865,066 | 0.0865066 |
| `marketplace_settlement.get_supported_assets` | 13,897 | 0.0013897 |
| `marketplace_settlement.get_accumulated_fees(XLM)` | 14,288 | 0.0014288 |
| `collection_factory.get_collection_count` | 12,844 | 0.0012844 |
| `collection_factory.version` | 12,858 | 0.0012858 |
| `transaction_contract.version` | 12,787 | 0.0012787 |

A registry read with no writes costs about **13,000 stroops (0.0013 XLM)**; an
ownership transfer costs about **146,000 stroops (0.0146 XLM)**; a mint, which
writes the token record, the owner index, the balance and the metadata, costs
about **865,000 stroops (0.0865 XLM)**.

`marketplace.get_sale` and `get_auction` return `0` when the requested id does
not exist: the lookup short-circuits without restoring a ledger entry, so there
is no footprint to charge for. Against a populated record they cost the same
order as the other reads.

One real mint was also submitted to confirm the simulated figure, via
[`91d30d71…ba23e7`](https://stellar.expert/explorer/testnet/tx/91d30d71eb93617e5ce4298019eecfb1e3de5fc96b88012468b39be908ba23e7).

### Re-measuring

```bash
stellar contract invoke \
  --id <CONTRACT_ID> --network testnet --source-account <identity> \
  --send=no --very-verbose -- <entrypoint> <args>
```

The `--send=no` flag simulates without submitting, so fees can be measured
without mutating state. `min_resource_fee` appears in the verbose output.

---

## Optimisations applied

The baseline above is the result of a set of deliberate changes, each of which is
a separate commit:

**Storage layout.** Transactions, auctions, bids, Dutch pricing, escrows and the
fee ledger each live in their own persistent entry. Previously several of these
shared a single `Map<u64, …>` under one key, so writing one record rewrote every
record — the write cost grew with the total number of records in the contract
rather than staying flat per operation, and instance storage grew without bound.

**Instance TTL.** State-changing calls extend the instance TTL, so long-lived
records do not silently expire. Before this, a record written once could become
unreadable while still nominally present.

**Rediscovering the owner.** `transfer` read the owner entry twice per call. It
now reads it once and reuses the value — this is the largest single saving on the
most common state-changing path.

**Execution ordering.** The transaction contract runs operations in dependency
order rather than in declaration order, and returns the gas settings that were
actually applied instead of the ones that were requested. Cycles and unsatisfied
dependencies are detected up front, so a doomed batch fails before it spends gas
on the operations that would have succeeded.

**Dead helpers.** Asset helpers that returned fabricated values on a storage miss
were removed rather than being left to be called; every lookup now returns
`Option`/`Result`, so "not found" cannot be mistaken for a real value. This is a
correctness fix that also removes work from the read path.

---

## Related

- [`CONTRACT_INVARIANTS.md`](./CONTRACT_INVARIANTS.md) — safety invariants the
  contracts must hold, including the monetary arithmetic the benchmarks exercise.
- [`SECURITY.md`](./SECURITY.md) — threat model and the authorization rules that
  every state-changing entry point above enforces.
- [`deployments/README.md`](./deployments/README.md) — how the measured
  deployment was produced and how to reproduce it.
