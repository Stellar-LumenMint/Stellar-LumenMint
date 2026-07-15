import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingService } from './listing.service';
import { Listing } from './entities/listing.entity';
import { MarketplaceSettlementClient } from '../stellar/marketplace-settlement.client';

describe('ListingService', () => {
  let service: ListingService;
  let listingRepository: jest.Mocked<Repository<Listing>>;
  let settlementClient: jest.Mocked<Partial<MarketplaceSettlementClient>>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingService,
        { provide: getRepositoryToken(Listing), useValue: mockRepo },
        { provide: MarketplaceSettlementClient, useValue: mockClient },
      ],
    }).compile();

    service = module.get<ListingService>(ListingService);
    listingRepository = module.get(getRepositoryToken(Listing));
    settlementClient = module.get(MarketplaceSettlementClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a listing with settlement integration', async () => {
      settlementClient.createSale.mockResolvedValue({ success: true } as any);
      listingRepository.create.mockReturnValue({ id: 'listing-1' } as any);
      listingRepository.save.mockResolvedValue({ id: 'listing-1' } as any);

      const result = await service.create({
        nftId: 'nft-1',
        price: '100',
        sellerId: 'seller-1',
      } as any);

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return paginated listings', async () => {
      listingRepository.findAndCount.mockResolvedValue([
        [{ id: 'listing-1' } as Listing],
        1,
      ]);

      const result = await service.findAll(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
