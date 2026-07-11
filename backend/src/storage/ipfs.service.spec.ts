import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { IpfsService } from './ipfs.service';
import type { UploadedFile } from './storage.types';

const createFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => {
  const buffer = overrides.buffer ?? Buffer.from('stellar-lumenmint-ipfs-file');

  return {
    originalname: 'asset.png',
    mimetype: 'image/png',
    ...overrides,
    buffer,
    size: overrides.size ?? buffer.length,
  };
};

describe('IpfsService', () => {
  let configValues: Record<string, string>;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configValues = {
      IPFS_PROVIDER: 'pinata',
      IPFS_GATEWAY_URL: 'https://ipfs.example/ipfs',
      IPFS_MAX_FILE_SIZE_BYTES: `${50 * 1024 * 1024}`,
      IPFS_RETRY_ATTEMPTS: '1',
      IPFS_RETRY_BACKOFF_MS: '0',
      IPFS_PINATA_JWT: 'test-pinata-jwt',
    };

    configService = {
      get: jest.fn((key: string) => configValues[key]),
    };
  });

  describe('upload', () => {
    it('should throw InternalServerErrorException for unsupported provider', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IpfsService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const serviceWithUnsupportedProvider =
        module.get<IpfsService>(IpfsService);

      // Mock getStorageConfig to return unsupported provider
      /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
      jest
        .spyOn(require('./storage.config'), 'getStorageConfig')
        .mockReturnValue({
          ipfs: {
            provider: 'unsupported' as any,
            maxFileSizeBytes: 50 * 1024 * 1024,
            gatewayUrl: 'https://ipfs.example/ipfs',
            retryAttempts: 1,
            retryBackoffMs: 0,
            pinataJwt: 'test-jwt',
            web3StorageToken: 'test-token',
            nftStorageToken: 'test-token',
          },
          arweave: {
            maxFileSizeBytes: 50 * 1024 * 1024,
            gatewayUrl: 'https://arweave.example',
            host: 'arweave.net',
            port: 443,
            protocol: 'https',
            retryAttempts: 1,
            retryBackoffMs: 0,
          },
          fallbackEnabled: true,
        });

      await expect(
        serviceWithUnsupportedProvider.upload(createFile()),
      ).rejects.toBeInstanceOf(InternalServerErrorException);

      jest.restoreAllMocks();
    });

    it('should throw InternalServerErrorException with sanitized message for unsupported provider', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IpfsService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const serviceWithUnsupportedProvider =
        module.get<IpfsService>(IpfsService);

      // Mock getStorageConfig to return unsupported provider
      /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
      jest
        .spyOn(require('./storage.config'), 'getStorageConfig')
        .mockReturnValue({
          ipfs: {
            provider: 'unsupported' as any,
            maxFileSizeBytes: 50 * 1024 * 1024,
            gatewayUrl: 'https://ipfs.example/ipfs',
            retryAttempts: 1,
            retryBackoffMs: 0,
            pinataJwt: 'test-jwt',
            web3StorageToken: 'test-token',
            nftStorageToken: 'test-token',
          },
          arweave: {
            maxFileSizeBytes: 50 * 1024 * 1024,
            gatewayUrl: 'https://arweave.example',
            host: 'arweave.net',
            port: 443,
            protocol: 'https',
            retryAttempts: 1,
            retryBackoffMs: 0,
          },
          fallbackEnabled: true,
        });

      try {
        await serviceWithUnsupportedProvider.upload(createFile());
        fail('Should have thrown InternalServerErrorException');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect((error as InternalServerErrorException).message).toBe(
          'IPFS provider is not configured correctly. Please contact support.',
        );
        expect((error as InternalServerErrorException).message).not.toContain(
          'unsupported',
        );
      }

      jest.restoreAllMocks();
    });
  });

  describe('uploadWithPinata', () => {
    it('should throw InternalServerErrorException when Pinata JWT is not configured', async () => {
      configValues.IPFS_PINATA_JWT = '';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IpfsService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const serviceWithoutJwt = module.get<IpfsService>(IpfsService);

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (serviceWithoutJwt as any).uploadWithPinata(createFile()),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException with sanitized message when Pinata JWT is not configured', async () => {
      configValues.IPFS_PINATA_JWT = '';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IpfsService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const serviceWithoutJwt = module.get<IpfsService>(IpfsService);

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        await (serviceWithoutJwt as any).uploadWithPinata(createFile());
        fail('Should have thrown InternalServerErrorException');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect((error as InternalServerErrorException).message).toBe(
          'IPFS service is not configured correctly. Please contact support.',
        );
        expect((error as InternalServerErrorException).message).not.toContain(
          'PINATA_JWT',
        );
      }
    });
  });

  describe('uploadWithStorageApi', () => {
    it('should throw InternalServerErrorException when web3storage token is not configured', async () => {
      configValues.IPFS_PROVIDER = 'web3storage';
      configValues.IPFS_WEB3STORAGE_TOKEN = '';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IpfsService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const serviceWithoutToken = module.get<IpfsService>(IpfsService);

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (serviceWithoutToken as any).uploadWithStorageApi(
          createFile(),
          'web3storage',
        ),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when nftstorage token is not configured', async () => {
      configValues.IPFS_PROVIDER = 'nftstorage';
      configValues.IPFS_NFTSTORAGE_TOKEN = '';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IpfsService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const serviceWithoutToken = module.get<IpfsService>(IpfsService);

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (serviceWithoutToken as any).uploadWithStorageApi(
          createFile(),
          'nftstorage',
        ),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException with sanitized message when token is not configured', async () => {
      configValues.IPFS_PROVIDER = 'web3storage';
      configValues.IPFS_WEB3STORAGE_TOKEN = '';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IpfsService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const serviceWithoutToken = module.get<IpfsService>(IpfsService);

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        await (serviceWithoutToken as any).uploadWithStorageApi(
          createFile(),
          'web3storage',
        );
        fail('Should have thrown InternalServerErrorException');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect((error as InternalServerErrorException).message).toBe(
          'IPFS service is not configured correctly. Please contact support.',
        );
        expect((error as InternalServerErrorException).message).not.toContain(
          'TOKEN',
        );
      }
    });
  });
});
