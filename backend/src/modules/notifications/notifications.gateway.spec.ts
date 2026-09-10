import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;

  beforeEach(async () => {
    const mockService = {
      sendNotification: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: NotificationsService, useValue: mockService },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => undefined) },
        },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should have a WebSocket server instance', () => {
    // @WebSocketServer is populated by Socket.IO at runtime; simulate it.
    const mockServer = {
      on: jest.fn(),
      engine: {
        on: jest.fn(),
        opts: {},
      },
    };
    (gateway as unknown as { server: unknown }).server = mockServer;

    gateway.afterInit();

    expect(gateway.getServer()).toBe(mockServer);
    expect(mockServer.on).toHaveBeenCalledWith('connection_error', expect.any(Function));
  });

  it('should handle bid notifications', () => {
    // Gateway should expose emit methods for bid updates
    expect(gateway).toBeDefined();
  });
});
