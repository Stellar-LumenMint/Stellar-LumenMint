# CI/CD Pipelines

## Workflow Architecture

```
Push/PR → .github/workflows/
├── stellar-lumenmint-backend.yml    (lint, format, typecheck, test, build)
├── stellar-lumenmint-frontend.yml   (lint, format, typecheck, test, build)
├── stellar-lumenmint-mobile-app.yml (lint, typecheck, test, build)
├── stellar-lumenmint-admin.yml      (lint, typecheck, test, build)
├── stellar-lumenmint-soroban.yml    (fmt, clippy, build wasm, test)
├── stellar-lumenmint-packages.yml   (typecheck, test, build — matrix)
├── stellar-lumenmint-security.yml   (CodeQL, audit, cargo-audit)
├── stellar-lumenmint-release.yml    (semver, changelog, Docker publish)
└── stellar-lumenmint-deploy.yml     (env deploy, health check, rollback)
```

## Trigger Conditions

| Workflow | Push | PR | Schedule | Manual |
|---|---|---|---|---|
| Backend | `main`, `develop` | ✅ | — | — |
| Frontend | `main`, `develop` | ✅ | — | — |
| Mobile | `main`, `develop` | ✅ | — | — |
| Admin | `main`, `develop` | ✅ | — | — |
| Soroban | `soroban/**` | ✅ | — | — |
| Packages | `packages/**` | ✅ | — | — |
| Security | `main`, `develop` | ✅ | Weekly | — |
| Release | Tag `v*` | — | — | ✅ |
| Deploy | — | — | — | ✅ |
