# Contract Invariants

This document defines the formal invariants that must hold true at all times
for each Soroban contract. These invariants serve as:

1. Documentation for auditors and developers
2. Basis for invariant-based testing (fuzz/invariant tests)
3. Foundation for future formal verification with `soroban-verify`

---

## NFT Contract Invariants

### Ownership
| # | Invariant | Enforcement |
|---|---|---|
| N1 | `total_supply` == `count(tokens where !burned)` | Updated atomically on mint/burn |
| N2 | `balance_of(owner)` == `count(tokens where T.owner == owner)` | Updated on transfer/burn |
| N3 | `owner_of(token_id)` returns the current owner or Err(TokenNotFound) | Storage write on mint/transfer/burn |
| N4 | A token cannot have both an owner and `burned == true` | State machine in `burn()` |

### Supply
| # | Invariant | Enforcement |
|---|---|---|
| N5 | `total_supply` ≤ `max_supply` (if configured) | Checked in `mint()` |
| N6 | `next_token_id` == `prev(next_token_id) + 1` | Incremented atomically |
| N7 | `total_supply ≥ 0` at all times | Checked arithmetic |

### Access Control
| # | Invariant | Enforcement |
|---|---|---|
| N8 | Only the token owner (or approved operator) can transfer | `require_auth()` + ownership check |
| N9 | Only an address with MINTER role can mint | RBAC check in `token::mint()` |
| N10 | Only admin/owner can toggle pause | `require_admin_or_owner()` |
| N11 | Paused → all mutating operations reject with `ContractPaused` | Check at top of each mutating fn |

### Royalty
| # | Invariant | Enforcement |
|---|---|---|
| N12 | `royalty_percentage ∈ [0, MAX_ROYALTY_BPS]` | Validate on set |
| N13 | `get_royalty_info(token, price)` == `(recipient, price * bps / 10000)` | Deterministic calculation |

### Metadata
| # | Invariant | Enforcement |
|---|---|---|
| N14 | Once `metadata_is_frozen == true`, no metadata updates | Gate in `set_token_uri`, `set_base_uri` |
| N15 | `is_metadata_frozen` is monotonic (false→true only) | No unfreeze function exists |

---

## Marketplace Settlement Invariants

### State Machine
| # | Invariant | Enforcement |
|---|---|---|
| M1 | Sale state: Pending → Funded → Executed \| Cancelled | Validated in state transitions |
| M2 | Auction state: Pending → Active → Ended \| Cancelled | Time-based + explicit end |
| M3 | Once Executed/Cancelled, transaction cannot change state | Gate at top of mutating functions |
| M4 | `created_at < expires_at` at creation time | Validated in constructor |

### Economic
| # | Invariant | Enforcement |
|---|---|---|
| M5 | `platform_fee_bps ∈ [0, 10000]` (0–100%) | Validated in `update_fee_config` |
| M6 | `minimum_fee ≤ maximum_fee` | Validated in `update_fee_config` |
| M7 | `royalty_percentage ∈ [0, 5000]` (0–50%) | Validated in `set_royalty_info` |
| M8 | At settlement: `seller + creator + platform == total_payment` | Verified in distribution logic |
| M9 | Reserve price must be met for auction to settle | Checked in `end_auction` |

### Auction
| # | Invariant | Enforcement |
|---|---|---|
| M10 | `highest_bid ≥ starting_price` (once any bid placed) | Checked in `place_bid` |
| M11 | Each new bid > previous highest_bid by ≥ bid_increment | Validated in `place_bid` |
| M12 | `bid_increment >= min_bid_increment_bps * starting_price / 10000` | Validated on auction creation |
| M13 | Dutch auction: `current_price` decreases linearly from start to end price | Calculated from remaining time |
| M14 | Cannot bid after `end_time` (extended by `extension_window` for last-minute bids) | Time check in `place_bid` |

### Security
| # | Invariant | Enforcement |
|---|---|---|
| M15 | Reentrancy guard flag is always reset after function exit | RAII-style guard reset |
| M16 | Rate limit windows are per-user and per-function | Keyed by `(user, function_name)` |
| M17 | Blocklisted addresses cannot interact with the contract | Checked on entry |
| M18 | Paused modules reject all state-mutating operations | Gate in `pause_manager` |

### Dispute
| # | Invariant | Enforcement |
|---|---|---|
| M19 | Dispute can only be initiated for Pending/Funded transactions | State check |
| M20 | `required_votes > 0` and `arbitrators ≥ required_votes` | Validated on dispute creation |
| M21 | Dispute resolution is final (monotonic state transition) | Once resolved, cannot change |

---

## Collection Factory Invariants

| # | Invariant | Enforcement |
|---|---|---|
| C1 | Factory can only deploy contracts it owns | Admin auth required |
| C2 | Each collection has a unique contract address | Deterministic deployment |
| C3 | Factory tracks all deployed collections | Storage entry per deployment |
| C4 | Factory admin can upgrade factory logic only | Admin auth |

---

## Transaction Contract Invariants

| # | Invariant | Enforcement |
|---|---|---|
| T1 | Transaction state transitions are a DAG (no cycles) | State machine validation |
| T2 | Required signatures == count of valid signers | Signature manager |
| T3 | Executed transactions cannot be re-executed | State check |
| T4 | Gas-optimized execution path produces same result as standard path | Deterministic |
| T5 | Recovery system can replay from any intermediate state | State snapshot |
| T6 | Dependency resolution produces a valid topological order | Topological sort invariant |

---

## Invariant Testing Guide

These invariants can be tested using:

1. **Unit tests** — Test each invariant isolation (e.g., `test_supply_invariant_holds_after_mint_and_burn`)
2. **Fuzz tests** — Use randomized sequences of operations and verify invariants after each
3. **Property-based tests** — Define pre/post conditions and generate inputs
4. **Formal verification** — Encode invariants in `soroban-verify` or K-framework specifications

Example fuzz test:

```rust
#[test]
fn invariant_total_supply_equals_token_count() {
    let env = Env::default();
    // ... setup ...
    for _ in 0..100 {
        let action = random_action(&env); // mint, burn, transfer
        execute(&env, &client, action);
        // Verify invariant
        let total = client.total_supply();
        let counted = count_active_tokens(&env, &client);
        assert_eq!(total, counted);
    }
}
```
