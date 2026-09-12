# Marketplace Settlement Smart Contract

A comprehensive Soroban smart contract for secure NFT marketplace settlement on the Stellar blockchain.

## Overview

This contract implements a secure, efficient marketplace settlement system with the following features:

- **Atomic Swaps**: Either both sides of transactions succeed or both fail
- **Multi-Asset Support**: Handle XLM and other Stellar assets as payment
- **Escrow Management**: Secure holding of funds and NFTs during settlement
- **Royalty Distribution**: Automatic splitting of payments to creators, sellers, and platform
- **Auction Mechanics**: Support for English and Dutch auctions with reserve prices
- **Dispute Resolution**: Time-based releases with arbitration support
- **Security Features**: Reentrancy guards, front-running protection, and commitment schemes

## Key Components

### Core Contracts
- `settlement_core.rs`: Main contract functions and public API
- `atomic_swap.rs`: Atomic swap engine and escrow management
- `auction_engine.rs`: Auction mechanics and bidding system
- `royalty_distributor.rs`: Royalty calculation and distribution
- `fee_manager.rs`: Platform fee management and dynamic pricing
- `dispute_resolution.rs`: Dispute handling and arbitration

### Security
- `security/reentrancy_guard.rs`: Protection against reentrant calls
- `security/frontrun_protection.rs`: Anti-front-running measures and commitment schemes

### Utilities
- `utils/math_utils.rs`: Safe mathematical operations
- `utils/time_utils.rs`: Time-based calculations and validation
- `utils/asset_utils.rs`: Asset handling and validation

### Storage
- `storage/transaction_store.rs`: Sale, trade and bundle records (one persistent entry per id)
- `storage/auction_store.rs`: Auction, bid-book and Dutch-price records (one persistent entry per auction)
- `storage/dispute_store.rs`: Dispute records
- `storage/allowlist_store.rs`, `storage/blocklist_store.rs`: Contract and address allow/deny lists
- `ttl.rs`: TTL extension for instance and persistent entries

Each transaction, auction and escrow is stored under its own key rather than in
one shared map, so the cost of a write does not grow with the number of open
listings and a single ledger entry cannot be outgrown.

## Public Functions

### Lifecycle
- `initialize(admin, fee_config)`: Set the admin and fee configuration (once)
- `version()`, `get_version()`: Build metadata for incident response

### Sales
- `create_sale(seller, nft_address, token_id, price, currency, duration_seconds)`: List an NFT; the token is escrowed by this call
- `execute_sale(transaction_id, buyer, payment_amount)`: Buy at the listed price, releasing the NFT and splitting the payment
- `get_sale(transaction_id)`: Read a sale record
- `cancel_transaction(transaction_id, transaction_type, canceller)`: Cancel a `"sale"`, `"trade"` or `"bundle"`, returning every escrowed asset

### Auctions
- `create_auction(seller, nft_address, token_id, starting_price, reserve_price, duration_seconds, bid_increment, auction_type, currency)`: Start an English or Dutch auction
- `place_bid(auction_id, bidder, bid_amount, commitment_hash)`: Bid (a commitment hash enables sealed bidding)
- `reveal_bid(auction_id, bidder, bid_amount, salt)`: Reveal a sealed bid
- `end_auction(auction_id, caller)`: Settle to the highest bidder
- `cancel_auction_with_refund(auction_id, canceller)`: Cancel and refund bidders
- `withdraw_losing_bid(auction_id, bidder)`: Reclaim a bid on a settled auction
- `get_auction(auction_id)`, `get_dutch_auction_price(auction_id)`
- `cleanup_expired_commitments()`: Prune expired sealed-bid commitments

### Trades (NFT-for-NFT)
- `create_trade(initiator, counterparty, initiator_nfts, counterparty_nfts, duration_seconds)`: Offer items; the initiator's items are escrowed immediately
- `accept_trade(trade_id, acceptor)`: Accept, escrowing the acceptor's items
- `execute_trade(trade_id, executor)`: Move both sides in one call
- `cancel_trade(trade_id, canceller)`: Unwind and refund each side
- `get_trade(trade_id)`

### Bundles (multi-item sales)
- `create_bundle(seller, items, total_price, currency, duration_seconds)`: List several NFTs; all of them are escrowed by this call
- `execute_bundle(bundle_id, buyer, payment_amount)`: Buy the bundle, releasing every item
- `cancel_bundle(bundle_id, seller)`: Return every item to the seller
- `get_bundle(bundle_id)`

### Royalties
- `set_royalty_info(setter, nft_contract, token_id, creator, royalty_percentage)`: Configure a royalty. Authorized for the token's current owner or the marketplace admin
- `update_royalty_percentage(updater, nft_contract, token_id, new_percentage)`: Change the percentage; only the recorded creator
- `get_royalty_info(nft_contract, token_id)`

### Disputes
- `initiate_dispute(transaction_id, reason, evidence_uri, initiator)`
- `vote_on_dispute(dispute_id, arbitrator, vote)`
- `execute_dispute_resolution(dispute_id, executor)`

### Administration
- `pause_contract` / `unpause_contract` / `schedule_pause` / `cancel_scheduled_pause` / `execute_scheduled_pause`
- `is_paused` / `is_module_paused` / `get_pause_state` / `get_scheduled_pause_info` / `is_timelock_active` / `get_timelock_remaining` / `get_paused_modules`
- `update_fee_config(new_config, admin)` / `withdraw_platform_fees(asset, recipient, admin)`
- `update_dispute_config(config, admin)`
- `update_rate_limit(function, limit, window_seconds, admin)` / `get_rate_limit_config(function)`
- `add_supported_asset` / `remove_supported_asset` / `get_supported_assets`
- `add_allowed_nft_contract` / `remove_allowed_nft_contract` / `add_allowed_token_contract` / `remove_allowed_token_contract`
- `block_address` / `unblock_address` / `update_block_reason` / `is_blocked` / `get_blocked_addresses` / `get_block_record`
- `set_emergency_withdrawal(admin, enabled)` / `emergency_withdraw(transaction_id, reason, admin)`
- `get_accumulated_fees(asset)` / `get_user_volume(user)`

## Data Structures

### Transactions
- `SaleTransaction`: Fixed-price sales
- `AuctionTransaction`: Auction data
- `TradeTransaction`: NFT-for-NFT trades
- `BundleTransaction`: Multi-item sales

### Assets & Payments
- `Asset`: Asset representation
- `RoyaltyDistribution`: Royalty payment distribution
- `FeeConfig`: Fee configuration

### Security
- `Bid`: Bid data with commitment support
- `Dispute`: Dispute information
- `EscrowHolding`: Escrow holdings

## Usage Examples

### Creating a Sale
```rust
let transaction_id = contract.create_sale(
    seller,
    nft_contract,
    token_id,
    price,
    currency,
    duration_seconds
);
```

### Placing a Bid
```rust
contract.place_bid(
    auction_id,
    bidder,
    bid_amount,
    None // or Some(commitment_hash)
);
```

### Executing a Sale
```rust
let result = contract.execute_sale(
    transaction_id,
    buyer,
    payment_amount
);
```

## Security Features

- **Reentrancy Protection**: Guards against reentrant calls
- **Front-Running Protection**: Commit-reveal schemes for bids
- **Atomic Swaps**: All-or-nothing transaction execution
- **Escrow Security**: Secure fund holding during settlement
- **Arbitration**: Multi-signature dispute resolution

## Testing

Run tests with:
```bash
cargo test
```

## Building

Build the contract with:
```bash
cargo build --target wasm32-unknown-unknown --release
```

## Deployment

Deploy to Stellar network using Soroban CLI:
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/marketplace_settlement.wasm \
  --source <your-secret-key>
```

## Configuration

The contract supports extensive configuration:

- **Fee Management**: Dynamic fees based on volume and user tiers
- **Auction Settings**: Configurable durations, increments, and extensions
- **Dispute Resolution**: Customizable arbitration parameters
- **Royalty Enforcement**: Automatic royalty distribution
- **Emergency Controls**: Admin emergency withdrawal capabilities

## Events

The contract emits comprehensive events for all operations:
- Sale events (created, executed, cancelled)
- Auction events (created, bid placed, ended, extended)
- Trade events (created, accepted, executed)
- Royalty and fee events
- Dispute events
- Security events

## Error Handling

Comprehensive error types for all failure scenarios:
- Authorization errors
- State validation errors
- Payment validation errors
- Mathematical operation errors
- Security violation errors

## Future Enhancements

- Batch operations for efficiency
- Cross-chain settlement support
- Advanced auction types (sealed-bid, Vickrey)
- Reputation-based fee discounts
- Automated market making integration
- Multi-signature escrow options