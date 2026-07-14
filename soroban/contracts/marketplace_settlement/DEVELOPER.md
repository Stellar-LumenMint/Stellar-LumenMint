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

| Function | Description |
|---|---|
| `initialize` | Set admin + initial fee config (once) |
| `create_sale` | List an NFT for direct sale |
| `execute_sale` | Buyer purchases at listed price |
| `cancel_transaction` | Seller cancels a pending listing |
| `create_auction` | Start an English or Dutch auction |
| `place_bid` | Submit a bid (supports commit-reveal) |
| `reveal_bid` | Reveal a sealed bid |
| `end_auction` | Conclude auction, settle to highest bidder |
| `create_trade` | Initiate an NFT-for-NFT swap |
| `create_bundle` | List multiple NFTs as a bundle |
| `emergency_withdraw` | Admin withdrawal (guarded) |

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

**Rate Limiter** — Per-user, per-function windows:
```
RateLimiter::check_and_increment(env, user, "create_sale", limit, window_seconds)
```

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

Test coverage: 40+ tests across sales, auctions, trades, bundles, fees,
royalties, disputes, rate limiting, reentrancy guards, and edge cases.

---

## Gas Optimization Notes

1. **Storage reads are cached** — Read once, use multiple times.
2. **Batch operations** — Use `batch_mint`, `batch_transfer` for multi-item ops.
3. **Vec capacity** — Pre-allocate Vec capacity when size is known.
4. **Instance storage** — Use `instance()` storage for frequently accessed data.
5. **Persistent storage** — Use `persistent()` for large, infrequently accessed data.

---

## Upgrade Path (Future)

The contract is currently **immutable** (no proxy pattern). For future upgrades:

1. Deploy new contract version
2. Use a factory or admin-controlled pointer to redirect
3. Migrate state via an `upgrade()` function on the old contract
4. Verify storage layout compatibility between versions
