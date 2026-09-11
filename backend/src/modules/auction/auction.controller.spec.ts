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
      settleAuction: jest.fn(),
      cancelAuction: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      getBids: jest.fn(),
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
    it('should call auctionService.create with the authenticated seller', async () => {
      const dto = { nftId: 'nft-1', startPrice: '100', duration: 3600 } as any;
      auctionService.create.mockResolvedValue({ id: 'auction-1' } as any);
      const req = { user: { userId: 'seller-1' } };
      const result = await controller.create(dto, req as any);
      expect(result).toBeDefined();
      expect(auctionService.create).toHaveBeenCalledWith(dto, 'seller-1');
    });
  });

  describe('placeBid', () => {
    it('should call auctionService.placeBid', async () => {
      auctionService.placeBid.mockResolvedValue({ id: 'bid-1' } as any);
      const req = { user: { userId: 'buyer-1' } };
      const result = await controller.placeBid(
        'auction-1',
        { amount: '150' } as any,
        req as any,
      );
      expect(result).toBeDefined();
      expect(auctionService.placeBid).toHaveBeenCalledWith(
        'auction-1',
        'buyer-1',
        { amount: '150' },
      );
    });
  });

  describe('settle', () => {
    it('should call auctionService.settleAuction with the caller id', async () => {
      auctionService.settleAuction.mockResolvedValue({ success: true } as any);
      const req = { user: { userId: 'caller-1' } };
      const result = await controller.settle('auction-1', req as any);
      expect(result).toBeDefined();
      expect(auctionService.settleAuction).toHaveBeenCalledWith(
        'auction-1',
        'caller-1',
      );
    });
  });

  describe('get', () => {
    it('should call auctionService.findOne', async () => {
      auctionService.findOne.mockResolvedValue({ id: 'auction-1' } as any);
      const result = await controller.get('auction-1');
      expect(result).toBeDefined();
      expect(auctionService.findOne).toHaveBeenCalledWith('auction-1');
    });
  });

  describe('cancel', () => {
    it('should call auctionService.cancelAuction with the caller id', async () => {
      auctionService.cancelAuction.mockResolvedValue({ success: true } as any);
      const req = { user: { userId: 'caller-1' } };
      const result = await controller.cancel('auction-1', req as any);
      expect(result).toBeDefined();
      expect(auctionService.cancelAuction).toHaveBeenCalledWith(
        'auction-1',
        'caller-1',
      );
    });
  });

  describe('bids', () => {
    it('should call auctionService.getBids', async () => {
      auctionService.getBids.mockResolvedValue([{ id: 'bid-1' }] as any);
      const result = await controller.bids('auction-1');
      expect(result).toBeDefined();
      expect(auctionService.getBids).toHaveBeenCalledWith('auction-1');
    });
  });

  describe('list', () => {
    it('should call auctionService.findAll with the query', async () => {
      auctionService.findAll.mockResolvedValue([{ id: 'auction-1' }] as any);
      const query = { status: 'ACTIVE' } as any;
      const result = await controller.list(query);
      expect(result).toBeDefined();
      expect(auctionService.findAll).toHaveBeenCalledWith(query);
    });
  });
});
