# Security Audit Checklist & Threat Model

## Scope

This document covers the four Soroban smart contracts in this workspace:

- `nft_contract` — NFT minting, transfer, royalty, metadata, access control
- `marketplace_settlement` — Sales, auctions, trades, disputes, fees
- `collection_factory` — Factory-pattern contract deployment
- `transaction_contract` — Multi-signature transaction orchestration

---

## Threat Model

### Assets
| Asset | Risk Level | Description |
|---|---|---|
| User funds (XLM/tokens in escrow) | **Critical** | Held during sales, auctions, disputes |
| NFT ownership | **Critical** | Transfer of token ownership |
| Royalty distributions | **High** | Creator/seller/platform fee splits |
| Admin privileges | **High** | Pause, fee config, emergency withdrawal |
| Auction bids | **High** | Commit-reveal bid amounts and salts |
| User reputation | **Medium** | Dispute history, trading volume |

### Threat Actors
| Actor | Motivation | Capability |
|---|---|---|
| Malicious buyer | Steal NFTs without payment | Front-running, reentrancy |
| Malicious seller | Double-sell, rug-pull | Listing manipulation |
| Griefing attacker | Denial of service | Gas exhaustion, spam |
| Compromised admin | Drain escrow, change fees | Full admin access |
| MEV searcher | Extract value from bids | Front-running, sandwiching |

### Attack Vectors

1. **Reentrancy** — External contract calls during NFT transfer or payment release
2. **Front-running** — Observing pending transactions to outbid or snipe
3. **Integer overflow/underflow** — Arithmetic on fees, royalties, bid amounts
4. **Access control bypass** — Exploiting role assignment or auth checks
5. **Denial of Service** — Gas exhaustion via loops, storage bloat
6. **Logic errors** — State machine transitions, auction edge cases
7. **Oracle manipulation** — Price feeds (if used) for dynamic fees
8. **Commit-reveal leakage** — Weak hashing in sealed-bid auctions
9. **Block timestamp manipulation** — Affecting auction end times, Dutch auction prices
10. **Storage collision** — Key reuse across contract upgrades

---

## Audit Checklist

### 1. Access Control
- [x] Admin role initialization (only once, `AlreadyInitialized`)
- [x] Role-based access (OWNER, ADMIN, MINTER, BURNER, METADATA_UPDATER)
- [x] `caller.require_auth()` on all mutating functions
- [x] Admin-only functions: pause, fee config, emergency withdrawal
- [ ] Owner-only functions: metadata freeze (verify owner check)
- [x] Role revocation removes all privileges immediately

### 2. Arithmetic Safety
- [x] Overflow checks in release profile (`overflow-checks = true`)
- [x] Royalty percentage bounded (MAX_ROYALTY_BPS = 10000)
- [x] Fee calculations use checked arithmetic
- [x] Bid increment validation on creation and bidding
- [ ] Explicit checked_add/checked_mul where i128 arithmetic occurs

### 3. Reentrancy Protection
- [x] Reentrancy guard on emergency_withdraw
- [x] Reentrancy guard on update_fee_config
- [x] Reentrancy guard on withdraw_platform_fees
- [ ] Reentrancy guard on execute_sale (NFT transfer callback)
- [ ] Reentrancy guard on settle_auction

### 4. State Machine Integrity
- [x] Valid state transitions only (Pending→Funded→Executed/Cancelled)
- [x] Cannot execute cancelled transactions
- [x] Cannot bid on ended auctions
- [x] Auction end time validated at creation
- [ ] Dutch auction state tracking (price decrement consistency)

### 5. Front-running Protection
- [x] Commit-reveal scheme for sealed bids
- [x] Commitment hash verification on reveal
- [x] Rate limiter per-user per-function
- [ ] Slippage protection on sale execution

### 6. Event Emission
- [x] Mint events
- [x] Transfer events
- [x] Burn events
- [x] Sale creation/cancellation/execution events
- [x] Auction creation/bid/end events
- [ ] Dispute creation/resolution events
- [ ] Fee configuration change events
- [ ] Pause/unpause events

### 7. Denial of Service Resistance
- [x] Batch operations bounded (max 50 per batch)
- [x] Rate limiting on high-frequency functions
- [x] Gas-efficient storage patterns
- [ ] Maximum transaction duration enforced
- [ ] Maximum auction duration enforced

### 8. Upgrade Safety
- [ ] Contract version tracking (version() exists, needs migration support)
- [ ] Storage layout compatibility checks
- [ ] Admin key rotation capability
- [ ] Emergency pause covers all mutating functions

### 9. Economic Security
- [x] Platform fee bounds (min/max)
- [x] Royalty percentage cap (50%)
- [x] Bid increment minimum (1% of current highest)
- [x] Reserve price enforcement
- [ ] Fee-on-transfer token compatibility
- [ ] Dust amount protection (minimum listing price)

### 10. Testing Coverage
- [x] Happy path: mint, transfer, burn, approve
- [x] Happy path: create sale, execute sale, cancel sale
- [x] Happy path: create auction, place bid, end auction
- [x] Error paths: unauthorized actions
- [x] Error paths: expired/ended state
- [x] Error paths: invalid inputs
- [x] Reentrancy guard tests
- [x] Rate limiter tests
- [x] Batch operation edge cases
- [ ] Fuzz testing on arithmetic
- [ ] Invariant-based testing
- [ ] Cross-contract integration tests

---

## Known Limitations

1. **No formal verification** — Contracts have not been formally verified with tools like `soroban-verify`.
2. **No upgrade proxy** — Contract code is immutable once deployed; no proxy pattern implemented.
3. **Single admin** — Admin is a single address; no multisig or timelock on critical operations.
4. **Commit-reveal uses simple hash** — Bids are hashed with `env.crypto().sha256()`; a malicious sequencer could theoretically enumerate bid values for small ranges.
5. **No slashing** — Malicious bidders who don't reveal face no economic penalty.
6. **Commit-reveal bid enumeration** — For small bid ranges, an attacker could precompute hashes. Consider using a domain-separated hash with a contract-specific nonce.

---

## Incident Response

In the event of a security incident:

1. **Pause the contract** — Admin calls `set_pause(true)` to halt all mutating operations.
2. **Assess impact** — Query contract state to determine affected users and assets.
3. **Notify users** — Communicate via official channels.
4. **Deploy fix** — Deploy patched contract and migrate state if necessary.
5. **Post-mortem** — Document root cause, timeline, and remediation steps.
