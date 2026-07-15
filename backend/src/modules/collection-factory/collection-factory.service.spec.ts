import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CollectionFactoryService } from './collection-factory.service';
import { SorobanService } from '../stellar/soroban.service';
import { BadRequestException } from '@nestjs/common';

describe('CollectionFactoryService', () => {
  let service: CollectionFactoryService;
  let configService: jest.Mocked<ConfigService>;
  let sorobanService: jest.Mocked<Partial<SorobanService>>;

  beforeEach(async () => {
    const mockConfigService = { get: jest.fn() };
    const mockSorobanService = {
      ensureValidAccountAddress: jest.fn(),
      ensureValidContractAddress: jest.fn(),
      invokeContract: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionFactoryService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SorobanService, useValue: mockSorobanService },
      ],
    }).compile();

    service = module.get<CollectionFactoryService>(CollectionFactoryService);
    configService = module.get(ConfigService);
    sorobanService = module.get(SorobanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCollection', () => {
    const validDto = {
      name: 'Test Collection',
      symbol: 'TEST',
      owner: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS',
      metadataUri: 'ipfs://abc',
      royaltyPercentage: 5,
      royaltyRecipient: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS',
    };

    it('should invoke create_collection on the factory contract', async () => {
      configService.get.mockReturnValue('CACTUSFACTORY...');
      sorobanService.invokeContract.mockResolvedValue({ returnValue: 'ok' });

      await service.createCollection(validDto);

      expect(configService.get).toHaveBeenCalledWith('COLLECTION_FACTORY_CONTRACT_ID');
      expect(sorobanService.invokeContract).toHaveBeenCalledWith(
        'CACTUSFACTORY...',
        'create_collection',
        expect.any(Array),
        { submit: true },
      );
    });

    it('should throw if factory contract ID is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.createCollection(validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate owner address', async () => {
      configService.get.mockReturnValue('CACTUSFACTORY...');
      sorobanService.ensureValidAccountAddress.mockImplementation(() => {
        throw new BadRequestException('Invalid address');
      });

      await expect(service.createCollection(validDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCollectionCount', () => {
    it('should return count from contract', async () => {
      configService.get.mockReturnValue('CACTUSFACTORY...');
      sorobanService.invokeContract.mockResolvedValue({ returnValue: 5 });

      const result = await service.getCollectionCount();
      expect(result.count).toBe(5);
    });
  });

  describe('mintToken', () => {
    it('should validate addresses and invoke mint_token', async () => {
      sorobanService.invokeContract.mockResolvedValue({ returnValue: 'ok' });

      await service.mintToken(
        'CABC...',
        'GBZX...',
        'ipfs://metadata',
      );

      expect(sorobanService.ensureValidContractAddress).toHaveBeenCalledWith('CABC...');
      expect(sorobanService.ensureValidAccountAddress).toHaveBeenCalledWith('GBZX...');
      expect(sorobanService.invokeContract).toHaveBeenCalledWith(
        'CABC...',
        'mint_token',
        expect.any(Array),
        { submit: true },
      );
    });
  });

  describe('batchMint', () => {
    it('should throw if recipients and URIs have different lengths', async () => {
      await expect(
        service.batchMint('CABC...', ['addr1', 'addr2'], ['uri1']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should invoke batch_mint on success', async () => {
      sorobanService.invokeContract.mockResolvedValue({ returnValue: 'ok' });
      await service.batchMint('CABC...', ['addr1'], ['uri1']);
      expect(sorobanService.invokeContract).toHaveBeenCalledWith(
        'CABC...',
        'batch_mint',
        expect.any(Array),
        { submit: true },
      );
    });
  });
});
