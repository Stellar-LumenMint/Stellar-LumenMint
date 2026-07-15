// ── Payment Controller ───────────────────────────────────────────────────────

import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService, PaymentIntent, PayoutRequest } from './payment.service';
import { PaymentMethod } from './enums/payment-method.enum';

@ApiTags('Payments')
@Controller('api/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('intent')
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiBearerAuth()
  async createIntent(
    @Body() body: { amount: number; currency?: 'XLM' | 'USD'; nftId?: string },
  ): Promise<PaymentIntent> {
    return this.paymentService.createPaymentIntent(body.amount, body.currency ?? 'USD', {
      nftId: body.nftId,
    });
  }

  @Post('payout')
  @ApiOperation({ summary: 'Process a payout to a Stellar address' })
  @ApiBearerAuth()
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
  getSupportedMethods(): { methods: string[] } {
    return {
      methods: [
        PaymentMethod.STELLAR,
        PaymentMethod.STRIPE,
        PaymentMethod.CRYPTO,
      ],
    };
  }

  @Get('validate/:address')
  @ApiOperation({ summary: 'Validate a Stellar address' })
  validateAddress(@Param('address') address: string): { valid: boolean } {
    return { valid: this.paymentService.isValidStellarAddress(address) };
  }
}
