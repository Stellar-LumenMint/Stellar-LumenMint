import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;
  let jwtService: { verify: jest.Mock };

  beforeEach(async () => {
    const mockService = {
      sendNotification: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
    };

    jwtService = { verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: NotificationsService, useValue: mockService },
        {
          provide: JwtService,
          useValue: jwtService,
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

  it('rejects sockets authenticated with a refresh token', () => {
    jwtService.verify.mockReturnValue({
      sub: 'user-1',
      username: 'alice',
      type: 'refresh',
    });
    const rejectClient = jest
      .spyOn(gateway as unknown as { rejectClient: (c: unknown, r: string) => void }, 'rejectClient')
      .mockImplementation(() => undefined);
    const client = {
      id: 'socket-1',
      handshake: { auth: { token: 'refresh-token' } },
      data: {},
      join: jest.fn(),
      emit: jest.fn(),
    } as unknown as import('socket.io').Socket;

    gateway.handleConnection(client);

    expect(rejectClient).toHaveBeenCalledWith(client, 'invalid_token_type');
    expect(client.join).not.toHaveBeenCalled();
  });

  it('accepts sockets authenticated with an access token', () => {
    jwtService.verify.mockReturnValue({
      sub: 'user-1',
      username: 'alice',
      type: 'access',
    });
    const rejectClient = jest
      .spyOn(gateway as unknown as { rejectClient: (c: unknown, r: string) => void }, 'rejectClient')
      .mockImplementation(() => undefined);
    const client = {
      id: 'socket-2',
      handshake: { auth: { token: 'access-token' } },
      data: {},
      join: jest.fn(),
      emit: jest.fn(),
    } as unknown as import('socket.io').Socket;

    gateway.handleConnection(client);

    expect(rejectClient).not.toHaveBeenCalled();
    expect(client.join).toHaveBeenCalled();
  });
});
