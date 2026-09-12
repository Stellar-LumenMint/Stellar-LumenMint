import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const guardsOf = (handler: unknown): unknown[] =>
  (Reflect.getMetadata(GUARDS_METADATA, handler as object) as unknown[]) ?? [];

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: jest.Mocked<Partial<PaymentService>>;

  beforeEach(async () => {
    const mockPaymentService = {
      createPaymentIntent: jest.fn(),
      processPayout: jest.fn(),
      isValidStellarAddress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    paymentService = module.get(PaymentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── POST /api/payments/intent ───────────────────────────────────────────

  describe('createIntent', () => {
    it('should call paymentService.createPaymentIntent with body params', async () => {
      const mockIntent = {
        id: 'pi_123',
        amount: '99',
        currency: 'USD' as const,
        status: 'requires_payment_method' as const,
        clientSecret: 'pi_secret_123',
        createdAt: new Date().toISOString(),
      };
      paymentService.createPaymentIntent.mockResolvedValue(mockIntent);

      const result = await controller.createIntent({
        amount: 99,
        currency: 'USD',
        nftId: 'nft-1',
      });

      expect(result).toEqual(mockIntent);
      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith(
        99,
        'USD',
        {
          nftId: 'nft-1',
        },
      );
    });

    it('should default currency to USD when not provided', async () => {
      paymentService.createPaymentIntent.mockResolvedValue({
        id: 'pi_456',
        amount: '50',
        currency: 'USD',
        status: 'requires_payment_method',
        createdAt: new Date().toISOString(),
      });

      await controller.createIntent({ amount: 50 });

      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith(
        50,
        'USD',
        {
          nftId: undefined,
        },
      );
    });
  });

  // ── POST /api/payments/payout ───────────────────────────────────────────

  describe('processPayout', () => {
    it('should validate address and call processPayout on success', async () => {
      paymentService.isValidStellarAddress.mockReturnValue(true);
      paymentService.processPayout.mockResolvedValue({
        success: true,
        txHash: 'abc123',
      });

      const body = {
        recipientAddress:
          'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS',
        amount: '100',
        currency: 'XLM' as const,
      };

      const result = await controller.processPayout(body);

      expect(result).toEqual({ success: true, txHash: 'abc123' });
      expect(paymentService.isValidStellarAddress).toHaveBeenCalledWith(
        body.recipientAddress,
      );
      expect(paymentService.processPayout).toHaveBeenCalledWith(body);
    });

    it('should reject an invalid Stellar address as a bad request', async () => {
      paymentService.isValidStellarAddress.mockReturnValue(false);

      const body = {
        recipientAddress: 'invalid-address',
        amount: '100',
        currency: 'XLM' as const,
      };

      // A malformed address is client error, not a server fault: a bare
      // `Error` used to surface this as a 500.
      await expect(controller.processPayout(body)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.processPayout(body)).rejects.toThrow(
        'Invalid Stellar address',
      );
      expect(paymentService.processPayout).not.toHaveBeenCalled();
    });
  });

  // ── Authorization ────────────────────────────────────────────────────────
  // The controller advertised `@ApiBearerAuth()` while enforcing nothing, so
  // these pin the guards that now back that claim up.

  describe('authorization', () => {
    it('requires a session to create a payment intent', () => {
      expect(guardsOf(PaymentController.prototype.createIntent)).toContain(
        JwtAuthGuard,
      );
    });

    it('restricts payouts to authenticated admins', () => {
      const guards = guardsOf(PaymentController.prototype.processPayout);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });

    it('leaves the read-only lookup routes public', () => {
      expect(
        guardsOf(PaymentController.prototype.getSupportedMethods),
      ).not.toContain(JwtAuthGuard);
      expect(
        guardsOf(PaymentController.prototype.validateAddress),
      ).not.toContain(JwtAuthGuard);
    });
  });

  // ── GET /api/payments/methods ───────────────────────────────────────────

  describe('getSupportedMethods', () => {
    it('should return the full list of supported payment methods', () => {
      const result = controller.getSupportedMethods();

      expect(result.methods).toBeDefined();
      expect(result.methods.length).toBeGreaterThanOrEqual(3);
      expect(result.methods).toContain('STELLAR');
      expect(result.methods).toContain('STRIPE');
      expect(result.methods).toContain('CRYPTO');
      expect(result.methods).toContain('XLM');
      expect(result.methods).toContain('USDC');
    });
  });

  // ── GET /api/payments/validate/:address ─────────────────────────────────

  describe('validateAddress', () => {
    it('should return valid: true for a valid address', () => {
      paymentService.isValidStellarAddress.mockReturnValue(true);

      const result = controller.validateAddress(
        'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS',
      );

      expect(result).toEqual({ valid: true });
      expect(paymentService.isValidStellarAddress).toHaveBeenCalledWith(
        'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS',
      );
    });

    it('should return valid: false for an invalid address', () => {
      paymentService.isValidStellarAddress.mockReturnValue(false);

      const result = controller.validateAddress('bad-address');

      expect(result).toEqual({ valid: false });
      expect(paymentService.isValidStellarAddress).toHaveBeenCalledWith(
        'bad-address',
      );
    });
  });
});
