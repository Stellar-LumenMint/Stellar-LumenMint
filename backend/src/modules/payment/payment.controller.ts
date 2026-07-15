// ── Payment Controller ───────────────────────────────────────────────────────

import { Controller, Post, Body, Get, Param, HttpStatus, HttpCode, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentService, PaymentIntent, PayoutRequest } from './payment.service';
import { SUPPORTED_PAYMENT_METHODS } from './enums/payment-method.enum';

@ApiTags('Payments')
@Controller('api/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('intent')
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body (amount must be positive)' })
  @ApiResponse({ status: 401, description: 'Unauthorized — valid JWT required' })
  @HttpCode(HttpStatus.CREATED)
  async createIntent(
    @Body() body: { amount: number; currency?: 'XLM' | 'USD'; nftId?: string },
  ): Promise<PaymentIntent> {
    if (body.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    return this.paymentService.createPaymentIntent(body.amount, body.currency ?? 'USD', {
      nftId: body.nftId,
    });
  }

  @Post('payout')
  @ApiOperation({ summary: 'Process a payout to a Stellar address' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Payout processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid Stellar address or malformed request' })
  @ApiResponse({ status: 401, description: 'Unauthorized — valid JWT required' })
  async processPayout(
    @Body() body: PayoutRequest,
  ): Promise<{ success: boolean; txHash?: string }> {
    if (!this.paymentService.isValidStellarAddress(body.recipientAddress)) {
      throw new Error('Invalid Stellar address');
    }
    return this.paymentService.processPayout(body);
  }

  @Get('methods')
  @ApiOperation({ summary: 'List supported payment methods' })
  @ApiResponse({ status: 200, description: 'Supported payment methods returned' })
  getSupportedMethods(): { methods: readonly string[] } {
    return { methods: SUPPORTED_PAYMENT_METHODS };
  }

  @Get('validate/:address')
  @ApiOperation({ summary: 'Validate a Stellar address format' })
  @ApiParam({ name: 'address', description: 'Stellar public key (starts with G)', example: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS' })
  @ApiResponse({ status: 200, description: 'Validation result returned' })
  validateAddress(@Param('address') address: string): { valid: boolean } {
    return { valid: this.paymentService.isValidStellarAddress(address) };
  }
}
