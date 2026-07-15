# @stellar-lumenmint/sdk — Error Handling

## Typed Errors

All SDK errors extend `SdkError`:

```typescript
class SdkError extends Error {
  code: string;          // Machine-readable error code
  statusCode?: number;   // HTTP status code (if applicable)
  correlationId?: string; // Request correlation ID for tracing
}
```

## Error Classes

| Class | HTTP Status | When |
|---|---|---|
| `AuthError` | 401 | Invalid or expired token |
| `RateLimitError` | 429 | Too many requests |
| `NotFoundError` | 404 | Resource not found |
| `TimeoutError` | — | Request exceeded timeout |

## Usage

```typescript
import { SdkError, AuthError, RateLimitError } from '@stellar-lumenmint/sdk';

try {
  await sdk.rest.mintNft({ name: 'Test' });
} catch (err) {
  if (err instanceof AuthError) {
    // Re-authenticate
  } else if (err instanceof RateLimitError) {
    // Wait and retry
  } else if (err instanceof SdkError) {
    console.error(err.code, err.correlationId);
  }
}
```

## Retry Behavior

The SDK's `RestClient` automatically retries transient failures (5xx, network errors) up to 3 times with exponential backoff. Non-retryable errors (4xx) are thrown immediately.
