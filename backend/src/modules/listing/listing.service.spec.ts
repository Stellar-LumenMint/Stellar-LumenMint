import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ListingService } from './listing.service';
import { Listing } from './entities/listing.entity';
import { StellarNft } from '../../nft/entities/stellar-nft.entity';
import { TransactionService } from '../transaction/transaction.service';
import { MarketplaceSettlementClient } from '../stellar/marketplace-settlement.client';

describe('ListingService', () => {
  let service: ListingService;
  let listingRepository: jest.Mocked<Repository<Listing>>;
  let settlementClient: jest.Mocked<Partial<MarketplaceSettlementClient>>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    const mockClient = {
      createSale: jest.fn(),
      cancelSale: jest.fn(),
    };
    const mockNftRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    const mockTransactionService = {
      recordTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingService,
        { provide: getRepositoryToken(Listing), useValue: mockRepo },
        { provide: getRepositoryToken(StellarNft), useValue: mockNftRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: MarketplaceSettlementClient, useValue: mockClient },
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    service = module.get<ListingService>(ListingService);
    listingRepository = module.get(getRepositoryToken(Listing));
    settlementClient = module.get(MarketplaceSettlementClient);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a listing with settlement integration when on-chain is enabled', async () => {
      configService.get.mockReturnValue(true); // ENABLE_ONCHAIN_SETTLEMENT

      const created = { id: 'listing-1', status: 'ACTIVE' } as any;
      listingRepository.create.mockReturnValue(created as Listing);
      settlementClient.createSale.mockResolvedValue({ success: true } as any);

      const result = await service.create(
        {
          nftContractId: 'CCONTRACT',
          nftTokenId: '1',
          price: 100,
          currency: 'XLM',
        },
        'seller-1',
      );

      expect(settlementClient.createSale).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('should reject duplicate active listings', async () => {
      listingRepository.findOne.mockResolvedValue({ id: 'existing' } as any);

      await expect(
        service.create(
          {
            nftContractId: 'CCONTRACT',
            nftTokenId: '1',
            price: 100,
          } as any,
          'seller-1',
        ),
      ).rejects.toThrow('NFT already listed');
    });

    it('should reject a listing for a non-existent NFT', async () => {
      listingRepository.findOne.mockResolvedValue(null);
      listingRepository.create.mockReturnValue({ id: 'listing-1' } as any);
      listingRepository.save.mockResolvedValue({ id: 'listing-1' } as any);

      await expect(
        service.create(
          {
            nftContractId: 'CCONTRACT',
            nftTokenId: '1',
            price: 100,
          } as any,
          'seller-1',
        ),
      ).rejects.toThrow('NFT not found');
    });
  });

  describe('findAll', () => {
    it('should return listings from the query builder', async () => {
      const qb = {
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'listing-1' } as Listing]),
      };
      (listingRepository as any).createQueryBuilder = jest
        .fn()
        .mockReturnValue(qb);

      const result = await service.findAll({
        status: 'ACTIVE',
        page: 1,
        limit: 20,
      } as any);
      expect(result).toHaveLength(1);
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('clamps unbounded caller-supplied pagination to safe values', async () => {
      const qb = {
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      (listingRepository as any).createQueryBuilder = jest
        .fn()
        .mockReturnValue(qb);

      await service.findAll({ page: 999999, limit: 1000000000 });
      expect(qb.skip).toHaveBeenCalledWith(99999800); // page kept (>= 1)
      expect(qb.take).toHaveBeenCalledWith(100); // limit capped at 100

      await service.findAll({ page: -5, limit: -10 });
      expect(qb.skip).toHaveBeenCalledWith(0); // negative page clamped to 1
      expect(qb.take).toHaveBeenCalledWith(20); // default size
    });
  });
});
