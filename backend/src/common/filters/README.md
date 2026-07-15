# Exception Filters

Global HTTP exception handling for consistent error responses.

## HttpExceptionFilter

Catches all unhandled exceptions and returns a structured error response:

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found",
  "timestamp": "2026-07-15T12:00:00.000Z",
  "path": "/api/users/nonexistent",
  "correlationId": "abc-123"
}
```

## Error Mapping

| NestJS Exception | HTTP Status |
|---|---|
| `BadRequestException` | 400 |
| `UnauthorizedException` | 401 |
| `ForbiddenException` | 403 |
| `NotFoundException` | 404 |
| `ConflictException` | 409 |
| `TooManyRequestsException` | 429 |
| `InternalServerErrorException` | 500 |
| `ServiceUnavailableException` | 503 |
| `GatewayTimeoutException` | 504 |

Pino logs are emitted at appropriate levels (warn for 4xx, error for 5xx) with correlation IDs for request tracing.
