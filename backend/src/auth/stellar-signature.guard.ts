import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { StellarSignatureStrategy } from './strategies/stellar.strategy';
import {
  BID_NONCE_TTL_MS,
  bidNonceCacheKey,
  buildBidMessage,
  isBidTimestampFresh,
} from '../common/stellar/bid-message';

/**
 * Guard that enforces Stellar wallet signature verification on protected routes.
 *
 * Reads `publicKey`, `signature`, `amount`, `timestamp`, and `nonce` from the
 * request body and verifies that the signature is a valid Ed25519 signature
 * over the canonical bid payload:
 *   `bid:{auctionId}:{amount}:{timestamp}:{nonce}`
 *
 * The timestamp bounds how long a signature stays valid and the nonce is
 * consumed exactly once (tracked in the cache for the freshness window), so a
 * captured request cannot be replayed even while its timestamp is still fresh.
 *
 * The route param `auctionId` must be present (as `:auctionId` or `:id`) for
 * the canonical message to be built correctly.
 */
@Injectable()
export class StellarSignatureGuard implements CanActivate {
  constructor(
    private readonly stellarStrategy: StellarSignatureStrategy,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { params?: Record<string, string> }>();

    const body = req.body as Record<string, unknown>;

    const publicKey =
      typeof body?.publicKey === 'string' ? body.publicKey : undefined;
    const signature =
      typeof body?.signature === 'string' ? body.signature : undefined;
    const amount = typeof body?.amount === 'string' ? body.amount : undefined;
    const nonce = typeof body?.nonce === 'string' ? body.nonce : undefined;
    const timestamp =
      typeof body?.timestamp === 'number'
        ? body.timestamp
        : typeof body?.timestamp === 'string'
          ? Number(body.timestamp)
          : undefined;

    if (!publicKey || !signature || !amount) {
      throw new UnauthorizedException(
        'Missing publicKey, signature, or amount in request body',
      );
    }

    if (timestamp === undefined || !nonce) {
      throw new UnauthorizedException(
        'Missing timestamp or nonce in request body',
      );
    }

    if (!isBidTimestampFresh(timestamp)) {
      throw new UnauthorizedException(
        'Bid signature is expired or has an invalid timestamp',
      );
    }

    const auctionId = req.params?.auctionId ?? req.params?.id ?? '';

    const message = buildBidMessage({
      auctionId,
      amount,
      timestamp,
      nonce,
    });

    const valid = this.stellarStrategy.verifySignedMessage(
      publicKey,
      message,
      signature,
    );

    if (!valid) {
      throw new UnauthorizedException('Invalid Stellar wallet signature');
    }

    // Consume the nonce only after the signature has been proven valid, so an
    // invalid request cannot burn a legitimate nonce. A hit means this exact
    // signed message has already been accepted — reject the replay.
    const nonceKey = bidNonceCacheKey(nonce);
    const alreadyUsed = await this.cacheManager.get(nonceKey);
    if (alreadyUsed) {
      throw new UnauthorizedException(
        'This signed bid has already been submitted',
      );
    }
    await this.cacheManager.set(nonceKey, '1', BID_NONCE_TTL_MS);

    return true;
  }
}
