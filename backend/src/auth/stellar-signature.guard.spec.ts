import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Keypair } from 'stellar-sdk';

import { StellarSignatureGuard } from './stellar-signature.guard';
import { StellarSignatureStrategy } from './strategies/stellar.strategy';
import {
  BID_NONCE_TTL_MS,
  bidNonceCacheKey,
  buildBidMessage,
} from '../common/stellar/bid-message';

const keypair = Keypair.random();
const publicKey = keypair.publicKey();
const auctionId = 'auction-uuid-1';
const amount = '15.0000000';

function makeContext(body: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ body, params: { auctionId } }),
    }),
  } as unknown as ExecutionContext;
}

function signedBody(
  overrides: Record<string, unknown> = {},
  timestamp = Date.now(),
  nonce = `nonce-${Math.random().toString(36).slice(2)}`,
): Record<string, unknown> {
  const message = buildBidMessage({ auctionId, amount, timestamp, nonce });
  const signature = Buffer.from(
    keypair.sign(Buffer.from(message, 'utf8')),
  ).toString('base64');
  return {
    amount,
    publicKey,
    timestamp,
    nonce,
    signature,
    ...overrides,
  };
}

describe('StellarSignatureGuard', () => {
  let guard: StellarSignatureGuard;
  const mockCache = { get: jest.fn(), set: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.get.mockResolvedValue(undefined);
    mockCache.set.mockResolvedValue(undefined);
    guard = new StellarSignatureGuard(
      new StellarSignatureStrategy(),
      mockCache as never,
    );
  });

  it('accepts a valid fresh signature and consumes the nonce', async () => {
    const body = signedBody();

    await expect(guard.canActivate(makeContext(body))).resolves.toBe(true);
    expect(mockCache.set).toHaveBeenCalledWith(
      bidNonceCacheKey(body.nonce as string),
      '1',
      BID_NONCE_TTL_MS,
    );
  });

  it('rejects a replayed nonce that was already consumed', async () => {
    mockCache.get.mockResolvedValue('1');
    const body = signedBody();

    await expect(guard.canActivate(makeContext(body))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it('rejects a missing timestamp or nonce', async () => {
    await expect(
      guard.canActivate(makeContext(signedBody({ timestamp: undefined }))),
    ).rejects.toThrow('Missing timestamp or nonce');
    await expect(
      guard.canActivate(makeContext(signedBody({ nonce: undefined }))),
    ).rejects.toThrow('Missing timestamp or nonce');
  });

  it('rejects a stale timestamp outside the freshness window', async () => {
    const stale = Date.now() - 60 * 60 * 1000;
    await expect(
      guard.canActivate(makeContext(signedBody({}, stale))),
    ).rejects.toThrow('expired');
    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it('rejects an invalid signature without consuming the nonce', async () => {
    await expect(
      guard.canActivate(
        makeContext(signedBody({ signature: 'aW52YWxpZA==' })),
      ),
    ).rejects.toThrow('Invalid Stellar wallet signature');
    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it('rejects a request missing publicKey, signature or amount', async () => {
    await expect(
      guard.canActivate(makeContext({ amount })),
    ).rejects.toThrow('Missing publicKey, signature, or amount');
  });
});
