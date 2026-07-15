# Common Modules

Reusable NestJS infrastructure components shared across the backend.

## Guards
| Guard | Purpose |
|---|---|
| `RedisRateGuard` | Rate limiting using Redis counters |
| `GqlAuthGuard` | GraphQL JWT authentication guard |

## Filters
| Filter | Purpose |
|---|---|
| `HttpExceptionFilter` | Global HTTP exception handler with structured error responses |

## Interceptors
| Interceptor | Purpose |
|---|---|
| `stellar-response.interceptor.ts` | Wraps responses in `{ success, data }` envelope |
| `stellar-logging.interceptor.ts` | Request/response logging |
| `stellar-timeout.interceptor.ts` | Request timeout enforcement |
| `stellar-error.interceptor.ts` | Error normalization |
| `stellar-transform.interceptor.ts` | Response transformation |

## Middleware
| Middleware | Purpose |
|---|---|
| `ApiVersionMiddleware` | Strips `/api/v{N}` prefix for versioned routing |
| `SecurityMiddleware` | Sets CSP, HSTS, X-Frame-Options, and other security headers |

## Queue & Messaging
| Module | Purpose |
|---|---|
| `JobQueueModule` | Redis-backed job queue with retries and DLQ |
| `IdempotencyModule` | Atomic SET NX for safe retry deduplication |
| `PipelineModule` | Sequential step execution with compensation |
| `OutboxModule` | Transactional event publishing with relay cron |

## Observability
| Module | Purpose |
|---|---|
| `AuditModule` | Audit logging for sensitive operations |
| `MetricsModule` | Prometheus metrics export |
