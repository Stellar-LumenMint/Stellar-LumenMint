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
├── stellar-lumenmint-vercel.yml     (frontend production + preview deploy)
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
| Vercel | `frontend/**` | ✅ | — | ✅ |
| Deploy | — | — | — | ✅ |

## Required Repository Setup

Most workflows need nothing configured. Two integrations are opt-in and
degrade gracefully when they are missing:

### Vercel frontend deployment

`stellar-lumenmint-vercel.yml` deploys the `frontend` workspace to the
`stellar-indigo-pay` Vercel project. It needs a repository secret:

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | A Vercel access token for an account with access to the project (Vercel → Account Settings → Tokens) |

The project's `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are already set in the
workflow; they are public identifiers, not credentials. The Vercel project's
**Root Directory** must stay `frontend`, and [`.vercelignore`](../../.vercelignore)
keeps the other workspaces out of the upload.

Without the secret the deploy job reports what is missing and exits without
failing the pipeline, so forks and clones still have green CI. There are two
ways to turn it on:

1. Add the `VERCEL_TOKEN` secret above (works from any fork or CI system).
2. Install the [Vercel GitHub App](https://github.com/apps/vercel) on the
   organisation and connect it to the project, which lets Vercel deploy on
   push itself; the workflow then becomes a redundant fallback.

Once deploys are running, superseded builds can be cleaned up with
[`scripts/prune-vercel-deployments.mjs`](../../scripts/prune-vercel-deployments.mjs).

### Secret scanning

`stellar-lumenmint-security.yml` runs the gitleaks **CLI** rather than the
`gitleaks/gitleaks-action` wrapper, because the wrapper refuses to run in an
github *organisation* without a paid licence key. The CLI is free and pinned
by version. Findings are triaged by [`.gitleaks.toml`](../../.gitleaks.toml),
which allow-lists only known placeholder values in test fixtures — every other
finding still fails the job.
