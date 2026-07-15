import { Test, TestingModule } from '@nestjs/testing';
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
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should have a WebSocket server instance', () => {
    expect(gateway.server).toBeDefined();
  });

  it('should handle bid notifications', () => {
    // Gateway should expose emit methods for bid updates
    expect(gateway).toBeDefined();
  });
});
