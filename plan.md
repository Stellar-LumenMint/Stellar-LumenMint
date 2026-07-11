1. **Create `ContractEventDlq` Entity**: Add the requested fields.
2. **Update Event Persistence**: In `ContractEventIndexerJob`, capture failures (and in `IndexerService` if applicable, though the problem describes `ContractEventIndexerJob` having events) and save them to DLQ instead of failing the batch.
3. **Implement Retry Worker**: Create a cron job that finds pending/retrying DLQ entries, attempts to re-process them, updates attempts and next retry time with exponential backoff. Status changes to `exhausted` after max attempts.
4. **Idempotency Guard**: Replay should successfully insert into `ContractEvent` using `orIgnore`, and update the DLQ record status to `resolved`.
5. **Operator Endpoint**: Add endpoints in an existing controller (e.g., `AdminController`) or a new controller to list DLQ records and trigger manual replay.
6. **Pre-commit Checks**: Run tests, linter, formatting.
