/**
 * @deprecated Use @stellar-lumenmint/sdk instead.
 *
 * # Legacy SDK Migration Guide
 *
 * This module provides backward compatibility for existing consumers
 * of the legacy Starknet/previous-brand API. New integrations should
 * use the @stellar-lumenmint/sdk package.
 *
 * ## Migration Steps
 *
 * 1. Install `@stellar-lumenmint/sdk`
 * 2. Replace imports from `./legacy` → `@stellar-lumenmint/sdk`
 * 3. Update API base URLs from old endpoint to new
 * 4. Remove legacy client initialization code
 *
 * ```typescript
 * // Before
 * import { LegacyClient } from './legacy';
 * const client = new LegacyClient('https://old-api.lumenmint.com');
 *
 * // After
 * import LumenMintSDK from '@stellar-lumenmint/sdk';
 * const sdk = LumenMintSDK.mainnet('https://api.lumenmint.com');
 * ```
 */

export {};
