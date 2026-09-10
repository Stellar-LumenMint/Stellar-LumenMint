import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlaceBidDto {
  /**
   * Bid amount in XLM (e.g. "100.50").
   * The service converts this to stroops internally for on-chain submission.
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,7})?$/, {
    message: 'amount must be a valid XLM decimal (up to 7 decimal places)',
  })
  amount: string;

  /** Bidder's Stellar public key (G...). Used for wallet verification. */
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z2-7]{55}$/, {
    message: 'publicKey must be a valid Stellar Ed25519 public key',
  })
  publicKey: string;

  /**
   * Epoch milliseconds at which the client signed the bid. Bounds the
   * signature's validity so a captured request cannot be replayed
   * indefinitely.
   */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  timestamp: number;

  /**
   * Client-generated unique value (UUID/random) preventing replay of a
   * previously accepted signed bid.
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]{8,128}$/, {
    message: 'nonce must be 8-128 URL-safe characters',
  })
  nonce: string;

  /**
   * Base64-encoded Ed25519 signature over the canonical message:
   *   `bid:{auctionId}:{amount}:{timestamp}:{nonce}`
   */
  @IsString()
  @IsNotEmpty()
  signature: string;

  /** Optional: memo/note attached to the bid */
  @IsString()
  @IsOptional()
  memo?: string;
}
