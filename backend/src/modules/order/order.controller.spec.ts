import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

const guardsOf = (handler: unknown): unknown[] =>
  (Reflect.getMetadata(GUARDS_METADATA, handler as object) as unknown[]) ?? [];

interface RequestUser {
  user?: { userId: string };
}

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: jest.Mocked<Partial<OrderService>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            updateStatus: jest.fn(),
            getStats: jest.fn(),
            executeBundle: jest.fn(),
            cancelBundle: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get(OrderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Bundle settlement moved funds on behalf of whoever the body named, and the
  // route was open to unauthenticated callers. These pin both halves of the
  // fix: the guard, and binding the actor to the session rather than the body.
  it('requires a session for every route that changes state', () => {
    for (const handler of [
      OrderController.prototype.create,
      OrderController.prototype.updateStatus,
      OrderController.prototype.executeBundle,
      OrderController.prototype.cancelBundle,
    ]) {
      expect(guardsOf(handler)).toContain(JwtAuthGuard);
    }
  });

  it('leaves read-only routes public', () => {
    expect(guardsOf(OrderController.prototype.findAll)).not.toContain(
      JwtAuthGuard,
    );
    expect(guardsOf(OrderController.prototype.findOne)).not.toContain(
      JwtAuthGuard,
    );
  });

  it('settles a bundle for the authenticated buyer, not a body-supplied one', async () => {
    orderService.executeBundle!.mockResolvedValue({ success: true });
    const req: RequestUser = { user: { userId: 'buyer-1' } };

    const result = await controller.executeBundle('42', req as never, '100');

    expect(orderService.executeBundle).toHaveBeenCalledWith(
      '42',
      'buyer-1',
      '100',
    );
    expect(result).toEqual({ success: true });
  });

  it('cancels a bundle for the authenticated seller', async () => {
    orderService.cancelBundle!.mockResolvedValue({ success: true });
    const req: RequestUser = { user: { userId: 'seller-9' } };

    await controller.cancelBundle('42', req as never);

    expect(orderService.cancelBundle).toHaveBeenCalledWith('42', 'seller-9');
  });
});
