import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, IsIn } from 'class-validator';

/**
 * DTO for creating a payment intent (POST /api/payments/intent).
 *
 * Supports both Stripe (USD) and XLM-native payments depending on
 * currency and whether STRIPE_SECRET_KEY is configured.
 */
export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Payment amount in the specified currency',
    example: 99.99,
    minimum: 0.01,
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    description: 'Payment currency',
    enum: ['XLM', 'USD'],
    default: 'USD',
  })
  @IsOptional()
  @IsIn(['XLM', 'USD'])
  currency?: 'XLM' | 'USD';

  @ApiPropertyOptional({
    description: 'Associated NFT ID for purchase tracking',
    example: 'nft-abc123',
  })
  @IsOptional()
  @IsString()
  nftId?: string;
}

/**
 * DTO for processing a payout to a Stellar address (POST /api/payments/payout).
 */
export class ProcessPayoutDto {
  @ApiProperty({
    description: 'Destination Stellar public key (starts with G)',
    example: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS',
    minLength: 56,
    maxLength: 56,
  })
  @IsString()
  recipientAddress: string;

  @ApiProperty({
    description: 'Payout amount in XLM',
    example: '100.00',
  })
  @IsString()
  amount: string;

  @ApiProperty({
    description: 'Payout currency',
    enum: ['XLM'],
    default: 'XLM',
  })
  @IsIn(['XLM'])
  currency: 'XLM';

  @ApiPropertyOptional({
    description: 'Optional memo for the Stellar transaction',
    example: 'creator-payout-march-2026',
  })
  @IsOptional()
  @IsString()
  memo?: string;
}
