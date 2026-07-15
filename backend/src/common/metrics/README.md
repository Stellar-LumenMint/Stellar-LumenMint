# Metrics Module

Prometheus-compatible metrics export for the LumenMint backend.

## Endpoint

`GET /metrics` — Exposes Prometheus scrape endpoint.

## Metric Types

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | method, path, status | Total HTTP requests |
| `http_request_duration_ms` | Histogram | method, path | Request latency |
| `soroban_rpc_calls_total` | Counter | method, status | Soroban RPC call count |
| `soroban_rpc_duration_ms` | Histogram | method | Soroban RPC latency |
| `db_query_duration_ms` | Histogram | operation | Database query timing |
| `cache_hits_total` | Counter | cache | Cache hit count |
| `job_queue_size` | Gauge | queue | Pending jobs in queue |
| `active_connections` | Gauge | type | Active WebSocket/users |

## Grafana Integration

Import the `grafana-dashboard.json` template for pre-built panels covering:
- Request rate and error rate
- P95/P99 latency
- Soroban RPC health and latency
- Cache hit ratio
- Job queue depth
