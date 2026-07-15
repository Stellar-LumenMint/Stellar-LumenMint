# Soroban Contract Versioning

## Upgrade Strategy

Contracts use a proxy/upgrade pattern with storage layout versioning:

1. **Proxy Contract**: Thin delegate that forwards all calls to the implementation
2. **Implementation Contract**: Contains the business logic, can be swapped
3. **Storage Layout**: Versioned with `STORAGE_VERSION` constant for migration detection

## Migration Flow

```
v1 (current) → v2 (new implementation)
                    ↓
              migration.run_v1_to_v2()
                    ↓
              token data, balances, approvals preserved
```

## Key Rotation

Admin keys can be rotated via `rotate_admin(new_admin)` — the old admin loses access, the new admin gains full control. This supports security key rotation without contract redeployment.

## Storage Compatibility

| Version | Changes |
|---|---|
| v1 | Initial schema: tokens, balances, approvals, metadata |
| v2 | v1 + royalty splits, collection references |

Storage layout changes are detected at upgrade time. Data is migrated automatically if needed.
