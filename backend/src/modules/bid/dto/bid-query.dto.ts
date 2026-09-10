import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class BidQueryDto {
  /**
   * Cursor for ledger-sequence-based pagination.
   * Pass the `ledgerSequence` of the last bid returned to get the next page.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Type(() => Number)
  cursor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  /** Filter bids by bidder's Stellar public key */
  @IsOptional()
  @IsString()
  publicKey?: string;
}
