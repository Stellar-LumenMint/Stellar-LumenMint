# Marketplace Settlement Contract — Developer Documentation

## Overview

The `marketplace_settlement` contract is the core settlement engine for the
Stellar-LumenMint marketplace. It handles sale execution, auction management,
trade/bundle transactions, dispute resolution, fee management, and royalty
distribution on the Stellar Soroban smart contract platform.

**Network:** Stellar Soroban  
**SDK:** `soroban-sdk = "23"`  
**Edition:** Rust 2021  

---

## Architecture

```
marketplace_settlement/
├── src/
│   ├── lib.rs                   # Contract entry point + type re-exports
│   ├── settlement_core.rs       # Main contract implementation
│   ├── auction_engine.rs         # English + Dutch auction logic
│   ├── atomic_swap.rs           # NFT-for-NFT trade execution
│   ├── fee_manager.rs           # Platform fee calculation + VIP exemptions
│   ├── royalty_distributor.rs   # Royalty calculation + split logic
│   ├── dispute_resolution.rs    # Multi-arbitrator dispute voting
│   ├── pause_manager.rs         # Module-level pause with timelock
│   ├── security/
│   │   ├── reentrancy_guard.rs  # RAII-style reentrancy protection
│   │   ├── frontrun_protection.rs # Commit-reveal for sealed bids
│   │   └── rate_limiter.rs      # Per-user per-function rate limiting
│   ├── storage/                 # Persistent storage accessors
│   ├── utils/                   # Math, time, asset utilities
│   ├── events.rs                # Contract event emission
│   ├── types.rs                 # Data structures
│   ├── error.rs                 # Error enums
│   └── test.rs                  # Integration tests
```

---

## Module Deep Dives

### 1. Settlement Core (`settlement_core.rs`)

The main contract struct. Entry points:

| Category | Functions |
|---|---|
| Lifecycle | `initialize`, `version`, `get_version` |
| Sales | `create_sale`, `execute_sale`, `get_sale`, `cancel_transaction` |
| Auctions | `create_auction`, `place_bid`, `reveal_bid`, `end_auction`, `cancel_auction_with_refund`, `withdraw_losing_bid`, `get_auction`, `get_dutch_auction_price`, `cleanup_expired_commitments` |
| Trades | `create_trade`, `accept_trade`, `execute_trade`, `cancel_trade`, `get_trade` |
| Bundles | `create_bundle`, `execute_bundle`, `cancel_bundle`, `get_bundle` |
| Royalties | `set_royalty_info`, `update_royalty_percentage`, `get_royalty_info` |
| Disputes | `initiate_dispute`, `vote_on_dispute`, `execute_dispute_resolution` |
| Pause | `pause_contract`, `unpause_contract`, `schedule_pause`, `cancel_scheduled_pause`, `execute_scheduled_pause`, `is_paused`, `is_module_paused`, `get_pause_state`, `get_scheduled_pause_info`, `is_timelock_active`, `get_timelock_remaining`, `get_paused_modules` |
| Fees | `update_fee_config`, `withdraw_platform_fees`, `get_accumulated_fees`, `get_user_volume`, `update_rate_limit`, `get_rate_limit_config` |
| Dispute config | `update_dispute_config` |
| Allow/deny lists | `add_supported_asset`, `remove_supported_asset`, `get_supported_assets`, `add_allowed_nft_contract`, `remove_allowed_nft_contract`, `add_allowed_token_contract`, `remove_allowed_token_contract`, `block_address`, `unblock_address`, `update_block_reason`, `is_blocked`, `get_blocked_addresses`, `get_block_record` |
| Emergency | `set_emergency_withdrawal`, `emergency_withdraw` |

**Custody model.** Listings, trades and bundles escrow their tokens into the
marketplace at creation time. Settlement therefore does not depend on the
seller still holding the token, or on an approval that has not been revoked,
when a buyer appears. `create_trade` escrows the initiator's items and
`accept_trade` escrows the acceptor's, so `execute_trade` moves both sides in
one call.

**Authorization.** Every privileged entry point calls `require_auth()` on the
acting address and then checks it against the stored admin, allowlist or token
ownership. A caller-supplied address is never sufficient on its own —
`update_rate_limit` previously compared `admin_config.admin != admin` without
authorizing, which any caller could satisfy by naming the admin.

### 2. Auction Engine (`auction_engine.rs`)

Supports two auction types:

**English Auction**
- Price increases as bidders compete
- Extension window for last-minute bids (anti-sniping)
- Reserve price enforcement
- Minimum bid increment validation

**Dutch Auction**
- Price decreases linearly from starting to ending price
- First bidder to accept the current price wins
- Price updated on each `get_dutch_auction_price` call

### 3. Fee Manager (`fee_manager.rs`)

Fee calculation with dynamic tiers:

```rust
FeeConfig {
    platform_fee_bps: u64,     // 250 = 2.5%
    minimum_fee: i128,         // Floor
    maximum_fee: i128,         // Ceiling
    fee_recipient: Address,
    dynamic_fee_enabled: bool,
    volume_discounts: Vec<VolumeTier>,  // High-volume traders get discounts
    vip_exemptions: Vec<Address>,        // Zero-fee addresses
}
```

Volume tier example:
```rust
VolumeTier { min_volume: 1_000_000, fee_discount_bps: 50 }  // 0.5% discount
```

### 4. Security Features

**Reentrancy Guard** — Uses a storage flag pattern:
```rust
fn guarded_function(env: &Env) {
    SecurityGuard::activate(env);
    // ... critical section ...
    SecurityGuard::deactivate(env);  // Always called via Drop
}
```

**Rate Limiter** — Per-user, per-function windows, configured per function and
consulted before the work is done:
```rust
RateLimiter::check_rate_limit(env, &user, &Symbol::new(env, "create_sale"))?;
```
Defaults are 10 calls / 60s for listings, bundles and trades, and 5 / 60s for
bids. Only an authenticated admin may change them, and a zero-length window is
rejected because it would silently disable the limiter.

**Commit-Reveal** — For sealed-bid auctions:
1. Bidder submits `hash(amount, salt)` as commitment
2. After bidding closes, bidder reveals `(amount, salt)`
3. Contract verifies `hash(amount, salt) == commitment`

---

## Integration Guide

### Deploying

```bash
# Build
cd soroban/contracts/marketplace_settlement
make build

# Deploy to testnet
soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/marketplace_settlement.wasm \
    --source alice \
    --network testnet
```

### Initializing

```rust
let fee_config = FeeConfig {
    platform_fee_bps: 250,          // 2.5%
    minimum_fee: 1000,              // 0.001 XLM (in stroops)
    maximum_fee: 1_000_000_000,     // 1000 XLM cap
    fee_recipient: platform_wallet,
    dynamic_fee_enabled: false,
    volume_discounts: Vec::new(&env),
    vip_exemptions: Vec::new(&env),
};
client.initialize(&admin, &fee_config);
```

### Creating a Sale

```rust
// 1. NFT owner approves the marketplace contract
nft_client.approve(&owner, &marketplace_address, &token_id);

// 2. Create the sale
let sale_id = client.create_sale(
    &seller,
    &nft_contract_address,
    &token_id,
    &price_in_stroops,      // 1 XLM = 10_000_000 stroops
    &payment_asset,         // Native XLM or token contract
    &duration_seconds,      // 86400 = 24 hours
);
```

### Executing a Sale

```rust
// Buyer pays exactly the sale price
client.execute_sale(&sale_id, &buyer, &price_in_stroops);
// Contract handles: NFT transfer, payment split, royalty distribution
```

### Creating an Auction

```rust
let auction_id = client.create_auction(
    &seller,
    &nft_address,
    &token_id,
    &starting_price,         // 100,000 stroops
    &reserve_price,          // 80,000 stroops (must be met to settle)
    &duration_seconds,       // 3600 = 1 hour
    &bid_increment,          // 1,000 stroops minimum increment
    &AuctionType::English,   // or AuctionType::Dutch
    &payment_asset,
);
```

---

## Error Reference

See `error.rs` for the full enum. Common errors:

| Code | Error | Meaning |
|---|---|---|
| 1 | Unauthorized | Caller lacks required auth |
| 100 | TransactionNotFound | Invalid sale/auction ID |
| 200 | AuctionNotFound | Invalid auction ID |
| 203 | BidTooLow | Bid below current highest |
| 600 | ReentrancyDetected | Reentrant call blocked |
| 601 | FrontRunningDetected | Suspicious timing detected |
| 603 | CooldownActive | Rate limit exceeded |

---

## Testing

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific module
cargo test test_create_sale
```

Coverage spans sales, auctions, trades, bundles, fees, royalties, disputes,
rate limiting, reentrancy guards, storage layout and authorization negatives.

---

## Storage Model

Soroban gives a contract two kinds of storage, and mixing them up is the most
expensive mistake available here.

* **Instance storage** is one ledger entry shared by everything stored in it,
  with a hard size ceiling and a single TTL. It is the right place for a small,
  fixed set of values: the admin configuration, the pause state, the id
  counters, the allow/deny lists and the fee configuration.
* **Persistent storage** is one ledger entry per key. Everything that grows —
  transactions, auctions, bid books, escrows, royalties and per-user volume —
  lives here, addressed by id, so a write touches a constant amount of state
  regardless of how much business the contract has done.

Reading a persistent entry through `ttl::get` refreshes its TTL, and `ttl::set`
writes with a full extension window, so a record cannot age out while the
marketplace is in use. The instance TTL — shared by the admin configuration,
the pause state, the id counters and the allow/deny lists — is refreshed on
every state-changing entry point, because they all pass through
`ReentrancyGuard::execute`. Read-only entry points do not extend it; if an entry
has been archived, the protocol restores it automatically from the transaction's
restore list before the call runs.

---

## Cost Notes

1. **Read once** — a storage read is deserialization; keep locals for values used repeatedly.
2. **One entry per record** — never accumulate records in a single `Map`; the cost and the size ceiling both grow with the map.
3. **Bounded collections only in instance storage** — a counter or an allowlist is fine; a list of transactions is not.
4. **Prefer per-key writes** — each write is priced by the entry it touches.

---

## Upgrade Path (Future)

The contract is currently **immutable** (no proxy pattern). For future upgrades:

1. Deploy new contract version
2. Use a factory or admin-controlled pointer to redirect
3. Migrate state via an `upgrade()` function on the old contract
4. Verify storage layout compatibility between versions
