# Stellar LumenMint — Soroban Contracts

**The on-chain layer of the LumenMint marketplace: NFTs, settlement, collection deployment and transaction orchestration.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)
![Rust](https://img.shields.io/badge/Rust-1.85%2B-b7410e?logo=rust&logoColor=white)
![Soroban](https://img.shields.io/badge/Soroban%20SDK-23.5.3-0f766e?logo=stellar&logoColor=white)
[![Soroban CI](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-soroban.yml/badge.svg?branch=main)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-soroban.yml)

Four `#![no_std]` contracts, deployed and initialised on Stellar Testnet. Every state-changing entry point requires authorization and a reentrancy guard, every code in every error enum is reachable, and every hot path has a gas ceiling that fails the build when it regresses.

---

## Live on Testnet

Deployed from commit `bfd6e80`; all four report version `0.1.0+bfd6e80` on-chain.

| Contract | Contract ID |
| --- | --- |
| `nft_contract` | `CDQN2A5U6SQLL4NZAMV4SL6BAOK6EXDG4G6HHRDJOOH6XK4LPUPZLHJC` |
| `marketplace_settlement` | `CCCUOZVZDUYF3Z42PQYAM2AGNCZSSF6J4IUC2J6ANF4Q5C3F5G4CJKUN` |
| `collection_factory` | `CBRL37EZ5KR2O4J3ECM5RQCREHMYKCZV4QJTUHI6JCGXWJ5BIRXAV6LQ` |
| `transaction_contract` | `CCM4HGRU7CGLFAHHMTTBAQN6C2LEOJLWTTRMKAQX2W2T5EE7LNMW37FQ` |

The machine-readable record, including wasm hashes and the commit each was built from, is in [`deployments/manifest.json`](./deployments/manifest.json); see [`deployments/README.md`](./deployments/README.md) for the explorer links, the initialisation state, and how to point a local backend at these ids.

> Mainnet has not been deployed. These identifiers are Testnet-only.

---

## Contract packages

| Package | Responsibility | Tests |
| --- | ---: | ---: |
| [`nft_contract`](./contracts/nft_contract) | Minting, metadata, transfers and approvals, per-token royalties, role-based access control, pause, upgrades | 74 |
| [`marketplace_settlement`](./contracts/marketplace_settlement) | Fixed-price sales, auctions with escrowed bids and a reserve, bundles, NFT-for-NFT trades, disputes, fee and royalty distribution | 98 |
| [`collection_factory`](./contracts/collection_factory) | Collection deployment, per-creator limits, factory fee configuration | 37 |
| [`transaction_contract`](./contracts/transaction_contract) | Multi-operation transactions, dependency-ordered execution, signatures, recovery | 41 |

**250 contract tests** in the workspace.

### What the settlement contract actually does

The flows below are real settlement paths, not status flags: escrow moves, splits are paid, and the token changes hands in the same call.

- **Fixed-price sales** — the lot is escrowed on creation; execution splits the price into creator royalty, platform fee and seller proceeds through one validated distribution that must sum exactly to the price, then delivers the token out of escrow.
- **Auctions** — bids are escrowed on placement and a displaced leader is repaid as they are outbid. Ending a met auction pays the split and delivers the lot; an unmet reserve returns both the leading bidder's deposit and the lot to the seller.
- **Bundles** — every item is escrowed, settles in one call, and is released on cancel.
- **Trades** — both sides' items are escrowed and both legs move in the single execution call.
- **Royalties** — keyed by `(nft_contract, token_id)` and opt-in; an unconfigured token still sells with the full price flowing through the normal split.

---

## Prerequisites

- Rust **1.85+** (see `rust-toolchain.toml`)
- The `wasm32-unknown-unknown` target
- The `stellar` CLI for deployment and on-chain calls

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli
```

The SDK is pinned to an exact patch (`soroban-sdk = "=23.5.3"`), not a range. A caret requirement would let `cargo update` move a deployed contract onto a new SDK patch, changing generated code and the Wasm hash without review.

---

## Build and test

```bash
cd soroban

cargo test --workspace                       # 250 tests
cargo clippy --workspace --all-targets -- -D warnings
cargo fmt --all -- --check

# Wasm for deployment
cargo build --workspace --release --target wasm32-unknown-unknown
```

The `release` profile sets `overflow-checks = true`, `panic = "abort"`, `lto = true`, `codegen-units = 1` and `opt-level = "z"`. Overflow checks are on deliberately: wrapping arithmetic in a contract that moves funds is worse than a panic.

CI runs all four gates as hard failures — no `continue-on-error`, no `|| echo "::warning::"`.

### Gas benchmarks

```bash
cargo test --package marketplace_settlement --lib benchmarks -- --nocapture
```

Each benchmark prints `BENCH|<name>|cpu=…|mem=…|read=…|write=…|events=…|rent=…` and asserts an instruction ceiling with ~1.6x headroom, so a hot path cannot regress silently.

Measured baselines, the ceiling for every benched operation, and the fees Stellar Testnet actually charged are recorded in **[`GAS.md`](./GAS.md)**.

---

## Deploy

```bash
cd soroban
NETWORK=testnet SOURCE=<stellar-key-alias> ./scripts/deploy_all.sh
```

`deploy_all.sh` builds each contract, uploads the Wasm, deploys an instance, then calls [`initialize_all.sh`](./scripts/initialize_all.sh), which writes the state a deployment actually needs — the factory's admin and fee asset, the NFT collection metadata and default royalty, and the settlement contract's admin, fee configuration, supported asset and both allowlists — and reads each contract back to prove it worked.

Without that step a deployed instance is inert: no admin, no fee configuration, empty allowlists. Initialisation is a separate script so it can be re-run against an existing manifest after a partial failure.

```bash
NETWORK=testnet SOURCE=<stellar-key-alias> ./scripts/initialize_all.sh
```

Mainnet requires `MAINNET_CONFIRM=yes`. Every script refuses to run without an explicit `NETWORK`.

### Verifying a deployment

```bash
NETWORK=testnet SOURCE=<stellar-key-alias> ./scripts/verify_contract.sh <CONTRACT_ID>
```

### Scripts

| Script | Purpose |
| --- | --- |
| `deploy_all.sh` | Build, upload, deploy all four contracts, then initialise them |
| `initialize_all.sh` | Admin, fee configuration, settlement asset and allowlists; verifies state reads back |
| `deployment_manifest.sh` | Appends a deployment to `deployments/manifest.json` (append-only history) |
| `deploy_factory.sh` | Collection factory only |
| `verify_contract.sh` | Read-only checks against a deployed contract |

---

## Documentation

| Document | Contents |
| --- | --- |
| [`CONTRACT_INVARIANTS.md`](./CONTRACT_INVARIANTS.md) | The safety invariants the contracts must hold |
| [`SECURITY.md`](./SECURITY.md) | Threat model, attack vectors and the audit checklist |
| [`GAS.md`](./GAS.md) | Gas baselines, regression ceilings and Testnet fee measurements |
| [`VERSIONING.md`](./VERSIONING.md) | How contract versions are stamped and compared |
| [`deployments/README.md`](./deployments/README.md) | The live deployment record and how to reproduce it |
| [`../docs/ERROR_CODES.md`](../docs/ERROR_CODES.md) | Every contract error code with its number and meaning (generated) |

---

## Repository layout

```text
soroban/
├── contracts/
│   ├── nft_contract/            # NFT + access control + royalties + upgrades
│   ├── marketplace_settlement/  # sales, auctions, bundles, trades, disputes, fees
│   ├── collection_factory/      # collection deployment
│   └── transaction_contract/    # multi-operation transaction orchestration
├── scripts/
│   ├── deploy_all.sh
│   ├── initialize_all.sh
│   ├── deployment_manifest.sh
│   ├── deploy_factory.sh
│   └── verify_contract.sh
├── deployments/                 # append-only deployment record
├── Cargo.toml                   # workspace, pinned SDK, release profile
├── CONTRACT_INVARIANTS.md
├── GAS.md
├── SECURITY.md
└── VERSIONING.md
```

---

## Error codes

Contract errors are numeric and travel in the on-chain error. Numbers are part of the public interface: a code is never renumbered and a retired number is never reused for a different meaning. Retired codes are listed in a comment in the relevant `error.rs` with the reason they were retired.

Soroban caps a contract error enum at **50 variants**. Current usage — `nft_contract` 23, `marketplace_settlement` 49, `collection_factory` 13, `transaction_contract` 12 — is 97 codes in total. `nft_contract` and `collection_factory` have been audited so that every code is reachable from a real call path, with the unreachable ones retired and their numbers explained; the settlement enum is one variant below the cap, which bounds how much it can grow and is tracked in the issue tracker.

[`../docs/ERROR_CODES.md`](../docs/ERROR_CODES.md) is generated from the enums and gated in CI, so it cannot drift; it also fails the build if any enum exceeds the cap.

---

## Contributing

Contract changes are held to a higher bar than the rest of the repository, because a defect can move funds:

- Every code added to an error enum must be reachable, and every condition that can fail should report a specific code rather than a generic one.
- A hot-path change needs a benchmark and an appropriate ceiling.
- State-changing entry points require authorization and a reentrancy guard.
- Monetary arithmetic goes through the checked helpers; a distribution must be validated to sum exactly before any transfer.
- A storage-layout change requires thought about existing records and the TTL, not just the new shape.

See [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for the general workflow.
