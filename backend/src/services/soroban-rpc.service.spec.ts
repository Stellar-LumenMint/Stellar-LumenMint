import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SorobanRpcService } from './soroban-rpc.service';

describe('SorobanRpcService', () => {
  let service: SorobanRpcService;
  let configService: ConfigService;

  const originalFetch = global.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanRpcService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string | undefined> = {
                STELLAR_NETWORK: 'TESTNET',
                STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
                SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
                STELLAR_NETWORK_PASSPHRASE: undefined,
                STELLAR_TIMEOUT_DEFAULT_MS: undefined,
                STELLAR_TIMEOUT_SIMULATION_MS: undefined,
                STELLAR_TIMEOUT_SUBMISSION_MS: undefined,
                STELLAR_LOG_LEVEL: undefined,
                STELLAR_OBFUSCATE_SENSITIVE_ERRORS: undefined,
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SorobanRpcService>(SorobanRpcService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRuntimeConfig', () => {
    it('returns testnet defaults when config is empty', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const config = service.getRuntimeConfig();

      expect(config.network).toBe('testnet');
      expect(config.horizonUrl).toBe('https://horizon-testnet.stellar.org');
    });

    it('respects explicit mainnet config', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'STELLAR_NETWORK') return 'MAINNET';
        if (key === 'STELLAR_HORIZON_URL') return 'https://horizon.stellar.org';
        return undefined;
      });

      const config = service.getRuntimeConfig();

      expect(config.network).toBe('mainnet');
      expect(config.horizonUrl).toBe('https://horizon.stellar.org');
    });
  });

  describe('onModuleInit', () => {
    it('logs success when Horizon is reachable', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.onModuleInit();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://horizon-testnet.stellar.org/',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Horizon health check passed'),
      );
    });

    it('logs a warning but does not throw in non-production when Horizon is unreachable', async () => {
      process.env.NODE_ENV = 'development';
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Horizon health check failed'),
      );
    });

    it('throws in production when Horizon is unreachable', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'STELLAR_NETWORK') return 'MAINNET';
        if (key === 'STELLAR_HORIZON_URL') return 'https://horizon.stellar.org';
        if (key === 'SOROBAN_RPC_URL') return 'https://mainnet.sorobanrpc.com';
        return undefined;
      });

      process.env.NODE_ENV = 'production';
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.onModuleInit()).rejects.toThrow(
        'Horizon health check failed',
      );
    });
  });

  describe('circuit breaker', () => {
    // The breaker snapshots its thresholds from ConfigService at construction
    // time, so build a dedicated instance with the desired env values.
    const buildService = (values: Record<string, string | undefined>) =>
      new SorobanRpcService({
        get: (key: string) => values[key],
      } as unknown as ConfigService);

    it('opens after consecutive retryable failures, then fails fast', async () => {
      const service = buildService({
        SOROBAN_RPC_CIRCUIT_FAILURE_THRESHOLD: '2',
        SOROBAN_RPC_MAX_RETRIES: '1',
      });

      const operation = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(
        service.retryRpcCall(operation, 'getLatestLedger'),
      ).rejects.toThrow('timeout');
      await expect(
        service.retryRpcCall(operation, 'getLatestLedger'),
      ).rejects.toThrow('timeout');

      expect(service.getCircuitState()).toBe('OPEN');

      operation.mockClear();
      await expect(
        service.retryRpcCall(operation, 'getLatestLedger'),
      ).rejects.toThrow(/Circuit is OPEN/);
      expect(operation).not.toHaveBeenCalled();
    });

    it('does not open on caller errors like a failed simulation', async () => {
      const service = buildService({
        SOROBAN_RPC_CIRCUIT_FAILURE_THRESHOLD: '2',
        SOROBAN_RPC_MAX_RETRIES: '1',
      });

      const operation = jest
        .fn()
        .mockRejectedValue(new Error('simulation failed: invalid argument'));

      for (let i = 0; i < 4; i += 1) {
        await expect(
          service.retryRpcCall(operation, 'simulateTransaction'),
        ).rejects.toThrow('simulation failed');
      }

      expect(service.getCircuitState()).toBe('CLOSED');
    });
  });
});
