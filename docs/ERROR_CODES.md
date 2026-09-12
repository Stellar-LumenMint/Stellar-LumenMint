# Error Codes

> **Generated file — do not edit by hand.** Run `npm run errors:build` after
> changing any error enum. CI runs `npm run errors:check` and fails if this
> document is out of date.

170 codes are declared across the contracts, the backend API and the
frontend telemetry layer.

| Layer | Codes | Where |
| --- | ---: | --- |
| Soroban contracts | 97 | `soroban/contracts/*/src/error.rs` |
| Backend API | 45 | `backend/src/common/enums/app-error-code.enum.ts` |
| Frontend telemetry | 28 | `frontend/lib/telemetry/*-error-codes.ts` |

Codes are part of each layer's public interface. Never renumber a contract
code or reuse a retired number for a different meaning; clients switch on
these values.

---

## Soroban contracts

Contract codes are numeric and travel in the on-chain error, so they are
capped by Soroban at 50 variants per enum. Gaps in the
numbering are retired codes; each one is explained in a comment in the source
and its number is never reused.

### `ContractError` — `soroban/contracts/collection_factory/src/error.rs`

_13 of 50 codes used._

| Code | Value | Meaning |
| --- | ---: | --- |
| `NotAuthorized` | 1 | The caller is not permitted to do this: not the admin, or not the owner of the token it is acting on. |
| `AlreadyInitialized` | 2 | — |
| `NotFound` | 3 | The token is not known to this collection. |
| `InsufficientBalance` | 4 | A balance would have gone below zero. Raised by the checked subtraction in `transfer` and `burn` instead of the generic arithmetic panic the raw `- 1` produced. |
| `InvalidAmount` | 5 | A configuration value is not usable: an empty collection name, or a `max_supply` of zero, which would make the collection mintable from the moment it exists. |
| `SupplyLimitExceeded` | 6 | — |
| `CollectionNotFound` | 7 | The collection contract has no configuration: it was deployed without `init`, so it has no admin, no config and no minters. |
| `NotMinter` | 8 | — |
| `ContractPaused` | 9 | — |
| `InvalidRoyalty` | 10 | The royalty percentage exceeds 10 000 basis points. |
| `InvalidRecipient` | 11 | The recipient cannot hold the token: it is the collection's own address, which has no entrypoint that would release it again. |
| `TokenAlreadyExists` | 12 | A token id was minted twice. |
| `MaxCollectionsExceeded` | 13 | The creator is at `MaxCollectionsPerCreator` and the overflow fee is unset or zero, so the overflow tier is closed. |

### `SettlementError` — `soroban/contracts/marketplace_settlement/src/error.rs`

_49 of 50 codes used._

| Code | Value | Meaning |
| --- | ---: | --- |
| `Unauthorized` | 1 | The caller failed an authorization check. This is the contract's single authorization code: privileged entrypoints that are called by the wrong address report this, not a separate "not admin" code. |
| `NotFound` | 2 | — |
| `AlreadyExists` | 3 | — |
| `Expired` | 5 | — |
| `InvalidAmount` | 7 | — |
| `TransactionNotFound` | 100 | — |
| `InvalidTransactionState` | 105 | The transaction exists but is not in the state this operation requires. |
| `SelfTradeNotAllowed` | 106 | A counterparty named the same address on both sides of a trade. |
| `BidAlreadyRefunded` | 107 | An escrowed bid was already repaid; refunding it again would pay twice. |
| `AuctionNotFound` | 200 | — |
| `AuctionAlreadyEnded` | 201 | — |
| `BidTooLow` | 203 | — |
| `InvalidBidIncrement` | 204 | — |
| `CommitmentMismatch` | 207 | — |
| `BidBelowMinimumIncrement` | 208 | — |
| `CommitRevealDisabled` | 209 | A commit-reveal operation was attempted on an auction configured for open bidding. |
| `AuctionNotEndable` | 210 | The auction cannot be closed yet: still running, or already closed. |
| `AuctionHasBids` | 211 | Cancelling would strand bids that have already been escrowed. |
| `AuctionStillPending` | 212 | The auction is still open, so it has no outcome to hand out. |
| `WinningBidderCannotWithdraw` | 213 | The winning bidder's own deposit is what settled the lot; it is not theirs to withdraw. |
| `PaymentFailed` | 300 | A token transfer was refused. Raised from the token call itself rather than aborting with the token's own error, so the failure is attributable to the payment leg. |
| `InsufficientPayment` | 301 | — |
| `InvalidCurrency` | 302 | — |
| `AssetNotSupported` | 303 | — |
| `PaymentAmountMismatch` | 304 | The depositor paid an amount that is not the amount this transaction expects. Distinct from `InsufficientPayment`, which is an amount below a required minimum: here the amount simply is not the agreed one. |
| `InvalidRoyaltyPercentage` | 401 | A royalty percentage is out of range, or implies a royalty larger than the sale it is taken from. |
| `DisputeNotFound` | 500 | — |
| `DisputeAlreadyResolved` | 501 | — |
| `InsufficientArbitrators` | 504 | — |
| `DisputeNotResolved` | 505 | The dispute has no verdict yet, so there is nothing to execute. |
| `UnknownResolutionOutcome` | 506 | A stored resolution value that no branch of the executor recognises. |
| `ReentrancyDetected` | 600 | — |
| `FrontRunningDetected` | 601 | — |
| `CooldownActive` | 603 | — |
| `ContractPaused` | 604 | The whole contract is paused, so no module may run. |
| `ModulePaused` | 605 | Only the named module is blocked; the rest of the contract still works.  Pause failures used to funnel through a `From<PauseError>` impl that mapped all seven of them onto `ContractPaused`, telling a caller the contract was down when in fact one feature was. |
| `PauseTimelockActive` | 606 | — |
| `PauseAlreadyScheduled` | 607 | — |
| `PauseNotScheduled` | 608 | — |
| `NotPaused` | 610 | — |
| `InvalidFeeConfig` | 701 | — |
| `FeeAlreadyInitialized` | 703 | — |
| `AddressBlocked` | 802 | — |
| `MaxSupportedAssetsExceeded` | 803 | — |
| `EmergencyWithdrawalDisabled` | 804 | The admin switch that gates emergency withdrawals is off. |
| `NftNotSupported` | 805 | The NFT contract is not on the allowlist, so the contract cannot vouch for its interface. |
| `Overflow` | 900 | — |
| `Underflow` | 901 | — |
| `DivisionByZero` | 902 | — |

### `ContractError` — `soroban/contracts/nft_contract/src/error.rs`

_23 of 50 codes used._

| Code | Value | Meaning |
| --- | ---: | --- |
| `NotAuthorized` | 1 | The caller is not permitted to do this. Also covers a caller that is not the owner, since there is exactly one authorization failure to report. |
| `AlreadyInitialized` | 2 | — |
| `NotFound` | 3 | — |
| `TokenNotFound` | 4 | — |
| `SupplyLimitExceeded` | 6 | — |
| `ContractPaused` | 7 | — |
| `InvalidRoyalty` | 8 | — |
| `MetadataFrozen` | 10 | — |
| `NotOwner` | 11 | The caller does not own the token it is acting on as owner. |
| `NotApproved` | 12 | — |
| `InvalidBatchSize` | 13 | The batch is empty. |
| `BatchTooLarge` | 14 | The batch is longer than [`crate::storage::MAX_BATCH_SIZE`]. |
| `InvalidRecipient` | 15 | The recipient cannot hold the token: it is this contract's own address, which has no way to release it again. |
| `RoleAlreadyGranted` | 16 | — |
| `RoleNotGranted` | 17 | — |
| `NotMinter` | 18 | — |
| `NotBurner` | 19 | — |
| `InvalidUri` | 20 | The metadata URI is empty, so the token's metadata could never resolve. |
| `ArithmeticError` | 21 | — |
| `MismatchedArrays` | 22 | The parallel vectors passed to a batch entrypoint differ in length. |
| `AlreadyBurned` | 23 | — |
| `InvalidUpgradeTarget` | 25 | — |
| `UnsupportedStorageVersion` | 26 | — |

### `TransactionError` — `soroban/contracts/transaction_contract/src/error.rs`

_12 of 50 codes used._

| Code | Value | Meaning |
| --- | ---: | --- |
| `TransactionNotFound` | 1 | — |
| `Unauthorized` | 2 | — |
| `InvalidStateTransition` | 3 | — |
| `InvalidOperation` | 4 | — |
| `DependencyNotMet` | 5 | — |
| `GasLimitExceeded` | 6 | — |
| `SignatureMissing` | 7 | — |
| `AlreadyFinalized` | 8 | — |
| `AtomicityViolation` | 9 | — |
| `DuplicateOperationId` | 10 | — |
| `ResourceLimitExceeded` | 11 | — |
| `OperationTimedOut` | 12 | — |

---

## Backend API

Returned in the `code` field of every error response by
`HttpExceptionFilter`. A code attached by the throw site wins; otherwise the
HTTP status selects the default, so the field is never absent.

### General

| Code |
| --- |
| `VALIDATION_ERROR` |
| `INTERNAL_SERVER_ERROR` |
| `NOT_FOUND` |
| `UNAUTHORIZED` |
| `FORBIDDEN` |
| `TOO_MANY_REQUESTS` |
| `CONFLICT` |
| `BAD_REQUEST` |
| `UNPROCESSABLE_ENTITY` |
| `SERVICE_UNAVAILABLE` |
| `GATEWAY_TIMEOUT` |

### Auth

| Code |
| --- |
| `INVALID_CREDENTIALS` |
| `TOKEN_EXPIRED` |
| `TOKEN_INVALID` |
| `REFRESH_TOKEN_INVALID` |
| `EMAIL_NOT_VERIFIED` |
| `USER_BANNED` |
| `WALLET_SIGNATURE_INVALID` |
| `WALLET_CHALLENGE_EXPIRED` |

### NFT

| Code |
| --- |
| `NFT_NOT_FOUND` |
| `NFT_ALREADY_MINTED` |
| `NFT_MINT_FAILED` |
| `NFT_TRANSFER_FAILED` |

### Collection

| Code |
| --- |
| `COLLECTION_NOT_FOUND` |
| `COLLECTION_LIMIT_EXCEEDED` |

### Marketplace

| Code |
| --- |
| `LISTING_NOT_FOUND` |
| `LISTING_ALREADY_SOLD` |
| `INSUFFICIENT_BALANCE` |
| `BID_TOO_LOW` |
| `AUCTION_ENDED` |
| `AUCTION_NOT_FOUND` |
| `ORDER_NOT_FOUND` |

### Stellar / Soroban

| Code |
| --- |
| `SOROBAN_RPC_ERROR` |
| `SOROBAN_TIMEOUT` |
| `SOROBAN_CONTRACT_ERROR` |
| `STELLAR_TRANSACTION_FAILED` |
| `STELLAR_NETWORK_ERROR` |
| `STELLAR_UNKNOWN_ERROR` |
| `INVALID_SIGNATURE` |
| `CONTRACT_CALL_FAILED` |

### Storage

| Code |
| --- |
| `FILE_TOO_LARGE` |
| `UNSUPPORTED_FILE_TYPE` |
| `UPLOAD_FAILED` |

### Search

| Code |
| --- |
| `SEARCH_INDEX_ERROR` |
| `SEARCH_QUERY_INVALID` |

---

## Frontend telemetry

Emitted with client-side telemetry events. These are deliberately not the
backend codes: they describe where a user flow failed on the client, which
the backend never observes.

### `AuthErrorCode`

| Code |
| --- |
| `auth_validation_missing_fields` |
| `auth_validation_invalid_email` |
| `auth_validation_password_mismatch` |
| `auth_validation_password_too_short` |
| `auth_wallet_not_connected` |
| `auth_wallet_signature_rejected` |
| `auth_wallet_provider_unavailable` |
| `auth_csrf_fetch_failed` |
| `auth_request_timeout` |
| `auth_invalid_credentials` |
| `auth_user_exists` |
| `auth_rate_limited` |
| `auth_server_unavailable` |
| `auth_unknown_error` |

### `CreatorErrorCode`

| Code |
| --- |
| `creator_validation_missing_required` |
| `creator_validation_invalid_length` |
| `creator_validation_invalid_price` |
| `creator_validation_missing_media` |
| `creator_validation_missing_collection` |
| `creator_upload_failed` |
| `creator_upload_timeout` |
| `creator_csrf_fetch_failed` |
| `creator_auth_required` |
| `creator_request_timeout` |
| `creator_api_rejected` |
| `creator_server_unavailable` |
| `creator_redirect_failed` |
| `creator_unknown_error` |

---

## See also

- [`soroban/GAS.md`](../soroban/GAS.md) — the fee cost of the paths these codes guard.
- [`soroban/CONTRACT_INVARIANTS.md`](../soroban/CONTRACT_INVARIANTS.md) — the invariants whose violation the contract codes report.
- [`packages/sdk/ERRORS.md`](../packages/sdk/ERRORS.md) — the SDK's typed error classes.
