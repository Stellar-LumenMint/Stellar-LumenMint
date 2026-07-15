# Stellar / Soroban Module

Core module for interacting with the Stellar network and Soroban smart contracts. Provides transaction building, simulation, submission, and contract invocation with retry logic and error normalization.

## Services

### `SorobanService`

Primary contract interaction service. Handles the full lifecycle:

```
buildTransaction → simulateTransaction → sign → sendTransaction → poll
```

**Key methods:**
- `invokeContract(contractId, method, args, options?)` — Build, simulate, and optionally submit a contract call
- `buildTransaction(contractId, method, args, sourceAccount?)` — Build and simulate only (read-only calls)
- `submitTransaction(tx, signature?)` — Sign and submit a pre-built transaction with polling
- `ensureValidAccountAddress(address)` — Validate Stellar public key format
- `ensureValidContractAddress(address)` — Validate Soroban contract address format

**Configuration:**
| Env Variable | Description | Default |
|---|---|---|
| `STELLAR_NETWORK` | `TESTNET` or `MAINNET` | `TESTNET` |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint | Built-in testnet default |
| `STELLAR_OPERATOR_PUBLIC_KEY` | Platform public key for transactions | Required |
| `STELLAR_OPERATOR_SECRET` | Platform secret key for signing | Required for submit |
| `TRANSACTION_TIMEOUT_SECONDS` | Transaction timeout in seconds | `60` |

### `MarketplaceSettlementClient`

Typed client for the marketplace settlement contract. Wraps `SorobanService` with contract-specific method signatures for:

- `createSale(seller, nftContract, tokenId, price, currency)`
- `createAuction(seller, nftContract, tokenId, startPrice, duration, minBidIncrement)`
- `createTrade(buyer, seller, nftContract, tokenId, paymentContract, amount)`

### `TransactionContractClient`

Typed client for the transaction batching contract. Supports:

- `createBundle(seller, items, totalPrice, currency, durationSeconds)`
- `executeBundle(bundleId, buyer, paymentAmount)`
- `cancelBundle(bundleId, seller)`

## Error Handling

All errors are mapped to NestJS HTTP exceptions:

| Error Pattern | Exception |
|---|---|
| `timeout` / `timed out` | `GatewayTimeoutException` |
| `bad sequence` / `tx_bad_seq` | `ConflictException` |
| `insufficient` / `invalid` / simulation failure | `BadRequestException` |
| `unavailable` / network error | `ServiceUnavailableException` |
| Unknown | `InternalServerErrorException` |

## Retry & Resilience

- RPC calls use exponential backoff via `SorobanRpcService.retryRpcCall()`
- Transaction polling retries up to 10 times with backoff
- Health check at startup (non-fatal) to surface RPC connectivity issues early
