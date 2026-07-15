// ── Payment Service ──────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PaymentIntent {
  id: string;
  amount: string; // in XLM or USD
  currency: 'XLM' | 'USD';
  status: 'requires_payment_method' | 'processing' | 'succeeded' | 'failed';
  clientSecret?: string;
  createdAt: string;
}

export interface PayoutRequest {
  recipientAddress: string;
  amount: string;
  currency: 'XLM';
  memo?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create a payment intent for fiat payments (Stripe).
   * Falls back to XLM-native payment if Stripe is not configured.
   */
  async createPaymentIntent(
    amount: number,
    currency: 'XLM' | 'USD' = 'USD',
    metadata?: Record<string, unknown>,
  ): Promise<PaymentIntent> {
    const stripeKey = this.configService.get('STRIPE_SECRET_KEY');

    if (stripeKey && currency === 'USD') {
      this.logger.log({ event: 'payment_intent_create', provider: 'stripe', amount, currency }, 'Creating Stripe payment intent');
      return this.createStripeIntent(amount, metadata);
    }

    this.logger.log({ event: 'payment_intent_create', provider: 'xlm', amount, currency }, 'Creating XLM payment intent');
    return this.createXlmPayment(amount, metadata);
  }

  /**
   * Process a payout to a Stellar address.
   *
   * In production, this would:
   * 1. Build a Stellar transaction with a payment operation
   * 2. Sign with the platform's distribution key
   * 3. Submit to Horizon and return the transaction hash
   */
  async processPayout(request: PayoutRequest): Promise<{ success: boolean; txHash?: string }> {
    const maskedAddress = `${request.recipientAddress.slice(0, 5)}...${request.recipientAddress.slice(-5)}`;
    this.logger.log(
      { event: 'payout_process', amount: request.amount, currency: request.currency, recipient: maskedAddress },
      'Processing payout',
    );

    return {
      success: true,
      txHash: undefined, // Would be the actual Horizon transaction hash
    };
  }

  /**
   * Validate a Stellar address format for payouts.
   * Checks that the address starts with 'G' (public key prefix) and
   * contains 56 valid base32 Stellar characters.
   */
  isValidStellarAddress(address: string): boolean {
    return /^G[A-Z2-7]{55}$/.test(address);
  }

  // ── Private: Stripe ──────────────────────────────────────────────────────

  private async createStripeIntent(
    amount: number,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentIntent> {
    const amountCents = Math.round(amount * 100);

    return {
      id: `pi_${Date.now()}`,
      amount: amount.toString(),
      currency: 'USD',
      status: 'requires_payment_method',
      clientSecret: `pi_secret_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  }

  // ── Private: XLM Native ─────────────────────────────────────────────────

  private createXlmPayment(
    amount: number,
    metadata?: Record<string, unknown>,
  ): PaymentIntent {
    return {
      id: `xlm_pay_${Date.now()}`,
      amount: amount.toString(),
      currency: 'XLM',
      status: 'requires_payment_method',
      createdAt: new Date().toISOString(),
    };
  }
}
