import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── createPaymentIntent ─────────────────────────────────────────────────

  describe('createPaymentIntent', () => {
    it('should create a Stripe intent when STRIPE_SECRET_KEY is configured and currency is USD', async () => {
      configService.get.mockReturnValue('sk_test_123');

      const result = await service.createPaymentIntent(100, 'USD');

      expect(result.currency).toBe('USD');
      expect(result.status).toBe('requires_payment_method');
      expect(result.clientSecret).toBeDefined();
      expect(result.id).toMatch(/^pi_/);
      expect(result.amount).toBe('100');
    });

    it('should create an XLM payment when currency is XLM regardless of Stripe config', async () => {
      configService.get.mockReturnValue('sk_test_123');

      const result = await service.createPaymentIntent(50, 'XLM');

      expect(result.currency).toBe('XLM');
      expect(result.status).toBe('requires_payment_method');
      expect(result.clientSecret).toBeUndefined();
      expect(result.id).toMatch(/^xlm_pay_/);
    });

    it('should fall back to XLM payment when Stripe is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      const result = await service.createPaymentIntent(100, 'USD');

      expect(result.currency).toBe('XLM');
      expect(result.id).toMatch(/^xlm_pay_/);
    });

    it('should default currency to USD', async () => {
      configService.get.mockReturnValue('sk_test_123');

      const result = await service.createPaymentIntent(25);

      expect(result.currency).toBe('USD');
    });

    it('should accept optional metadata', async () => {
      configService.get.mockReturnValue('sk_test_123');

      const result = await service.createPaymentIntent(100, 'USD', {
        nftId: 'nft-1',
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe('100');
    });

    it('should include createdAt timestamp', async () => {
      configService.get.mockReturnValue('sk_test_123');
      const before = new Date();

      const result = await service.createPaymentIntent(100, 'USD');
      const createdAt = new Date(result.createdAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    });
  });

  // ── processPayout ───────────────────────────────────────────────────────

  describe('processPayout', () => {
    it('should return success for a valid payout request', async () => {
      const result = await service.processPayout({
        recipientAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS',
        amount: '100',
        currency: 'XLM',
        memo: 'payout-123',
      });

      expect(result.success).toBe(true);
    });

    it('should handle payout without memo', async () => {
      const result = await service.processPayout({
        recipientAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS',
        amount: '50',
        currency: 'XLM',
      });

      expect(result.success).toBe(true);
    });
  });

  // ── isValidStellarAddress ───────────────────────────────────────────────

  describe('isValidStellarAddress', () => {
    it('should return true for a valid Stellar public key', () => {
      expect(
        service.isValidStellarAddress(
          'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS',
        ),
      ).toBe(true);
    });

    it('should return false for an invalid address (wrong prefix)', () => {
      expect(service.isValidStellarAddress('SBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS')).toBe(
        false,
      );
    });

    it('should return false for a short address', () => {
      expect(service.isValidStellarAddress('GBZX')).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(service.isValidStellarAddress('')).toBe(false);
    });

    it('should return false for lowercase address', () => {
      expect(
        service.isValidStellarAddress(
          'gbzxn7pirzgnmhga7muuuf4gwpy5aypv6ly4uv2gl6vjgiqrxfdnmkjs',
        ),
      ).toBe(false);
    });

    it('should return false for addresses with invalid characters', () => {
      expect(
        service.isValidStellarAddress(
          'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJ0',
        ),
      ).toBe(false);
    });
  });
});
