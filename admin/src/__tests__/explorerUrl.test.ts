import { describe, it, expect } from 'vitest';
import { explorerUrl } from '../utils/explorerUrl';

describe('explorerUrl', () => {
  it('returns the correct transaction URL', () => {
    const url = explorerUrl('abc123def456', 'tx');
    expect(url).toBe('https://stellar.expert/explorer/public/tx/abc123def456');
  });

  it('returns the correct account URL', () => {
    const url = explorerUrl('GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS', 'account');
    expect(url).toBe(
      'https://stellar.expert/explorer/public/account/GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS',
    );
  });

  it('handles transaction type with special characters in hash', () => {
    const url = explorerUrl('tx+hash/with=special&chars', 'tx');
    expect(url).toContain('stellar.expert/explorer/public/tx/');
  });

  it('generates HTTPS URLs', () => {
    expect(explorerUrl('test', 'tx')).toMatch(/^https:\/\//);
    expect(explorerUrl('test', 'account')).toMatch(/^https:\/\//);
  });
});
