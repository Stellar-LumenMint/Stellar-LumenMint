# Health Module

Provides production-ready health check endpoints for load balancers, Kubernetes probes, and Docker healthchecks.

## Endpoints

### `GET /health`

Returns system health status including database connectivity and external service reachability.

```json
{
  "status": "ok",
  "timestamp": "2026-07-15T12:00:00.000Z",
  "checks": {
    "database": { "status": "ok" },
    "sorobanRpc": { "status": "ok" }
  }
}
```

### `GET /health/live`

Liveness probe — returns `200 OK` if the process is alive (used by Kubernetes `livenessProbe`).

### `GET /health/ready`

Readiness probe — returns `200 OK` only when all critical dependencies are connected (used by Kubernetes `readinessProbe`).

## Docker Healthcheck

The `Dockerfile` polls `/health` every 30s:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

## Kubernetes Probe Configuration

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Monitoring Integration

The health endpoint is scraped by Prometheus via the `MetricsModule`. Health check failures are logged at `error` level through Pino and surfaced as metrics alerts.
