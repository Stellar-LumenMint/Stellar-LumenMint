# Audit Module

Records security-sensitive operations for compliance and forensic analysis.

## Events Tracked

- User login / logout / registration
- Wallet linking / unlinking
- NFT minting, transfer, listing, sale
- Admin actions (verification, moderation)
- Payment intents and payouts

## Log Format

Audit events are logged as structured JSON via Pino:

```json
{
  "level": "info",
  "event": "audit",
  "action": "nft_transfer",
  "actorId": "user-123",
  "targetId": "nft-456",
  "metadata": { "from": "G...", "to": "G..." },
  "timestamp": "2026-07-15T12:00:00.000Z"
}
```

## GDPR Compliance

- Audit logs do not contain PII beyond wallet addresses
- Logs are retained for 90 days by default
- User deletion requests cascade to anonymize historical audit records
