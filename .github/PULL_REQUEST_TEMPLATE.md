## Summary

<!-- What does this PR change, and why? Link the issue it closes. -->

Closes #

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that changes existing behaviour)
- [ ] Refactor / chore (no functional change)
- [ ] Documentation

## Workspaces touched

- [ ] `backend/`
- [ ] `frontend/`
- [ ] `mobile-app/`
- [ ] `admin/`
- [ ] `soroban/`
- [ ] `packages/`
- [ ] CI / tooling

## How was this tested?

<!-- Commands you ran and what you observed. Screenshots for UI changes. -->

## Checklist

- [ ] `npm test` passes in every workspace I touched
- [ ] `npx tsc --noEmit` passes in every workspace I touched
- [ ] New behaviour is covered by tests (or the PR explains why it cannot be)
- [ ] No secret, key, or credential is added to the diff
- [ ] Public API / contract changes are documented
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)

## Security review

<!-- For auth, payment, wallet, or contract changes: describe the trust
boundary that moved and any new attack surface. -->

- [ ] This change does not weaken authentication, authorization, or rate limiting
- [ ] On-chain inputs are validated and bound to the authenticated user
- [ ] User-controlled data is not logged unredacted
