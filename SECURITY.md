# Security Policy

## Supported Versions

Stellar-LumenMint is a monorepo with continuous delivery to `main`; only the
latest `main` and the most recent tagged release receive security fixes.

| Version          | Supported          |
| ---------------- | ------------------ |
| `main`           | ✅                 |
| Latest tag       | ✅                 |
| Older releases   | ❌                 |

## Reporting a Vulnerability

Please **do not** open a public issue for security vulnerabilities. Instead
report privately:

- **GitHub private vulnerability reporting**: use the "Report a vulnerability"
  button on the repository's Security tab (preferred).
- **Email**: `security@stellar-lumenmint.com` with the subject prefix
  `[SECURITY]`.

Include, where possible:

1. A description of the vulnerability and its impact.
2. The affected workspace(s) and file(s) (`backend`, `frontend`, `soroban`,
   `mobile-app`, `admin`, `packages`).
3. Steps to reproduce, or a minimal proof-of-concept.
4. Whether the issue affects a smart contract (soroban), the API, or a client.

### Smart contract vulnerabilities

Contract bugs can affect on-chain funds and are time-sensitive. When
reporting a Soroban contract issue, mark it `[SECURITY][CONTRACT]` and state
whether any deployed contract may already be affected. Do not broadcast
details publicly until a fix (or mitigation, e.g. pausing a contract) is in
place.

## Disclosure

- We acknowledge receipt within **3 business days**.
- We aim to provide a triage assessment within **7 business days**.
- We coordinate disclosure with the reporter and prefer a **90-day** window
  from confirmation to public disclosure, matching the industry standard.
- Fixes are released on `main` and backported to the latest tagged release
  where feasible.

## Security Contact

- Email: `security@stellar-lumenmint.com`
- GitHub Security Advisories: repository Security tab

## Scope

The policy covers the Stellar-LumenMint monorepo: smart contracts in
`soroban/`, the NestJS API in `backend/`, and the clients in `frontend/`,
`mobile-app/`, `admin/` and `packages/`. Infrastructure configuration (CI
workflows, Docker, deployments) is in scope for credential leaks, supply-chain
risks and similar issues. Third-party vulnerabilities should be reported to
the respective maintainers.