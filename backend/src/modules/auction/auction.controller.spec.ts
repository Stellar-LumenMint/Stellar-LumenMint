import { Test, TestingModule } from '@nestjs/testing';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';

describe('AuctionController', () => {
  let controller: AuctionController;
  let auctionService: jest.Mocked<Partial<AuctionService>>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      placeBid: jest.fn(),
      settle: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findBids: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuctionController],
      providers: [{ provide: AuctionService, useValue: mockService }],
    }).compile();

    controller = module.get<AuctionController>(AuctionController);
    auctionService = module.get(AuctionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call auctionService.create', async () => {
      const dto = { nftId: 'nft-1', startPrice: '100', duration: 3600 } as any;
      auctionService.create.mockResolvedValue({ id: 'auction-1' } as any);
      const result = await controller.create(dto);
      expect(result).toBeDefined();
      expect(auctionService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('placeBid', () => {
    it('should call auctionService.placeBid', async () => {
      auctionService.placeBid.mockResolvedValue({ id: 'bid-1' } as any);
      const result = await controller.placeBid('auction-1', { amount: '150' } as any);
      expect(result).toBeDefined();
    });
  });

  describe('settle', () => {
    it('should call auctionService.settle', async () => {
      auctionService.settle.mockResolvedValue({ success: true } as any);
      const result = await controller.settle('auction-1');
      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should call auctionService.findOne', async () => {
      auctionService.findOne.mockResolvedValue({ id: 'auction-1' } as any);
      const result = await controller.findOne('auction-1');
      expect(result).toBeDefined();
    });
  });
});
