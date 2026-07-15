import { Test, TestingModule } from '@nestjs/testing';
import { OfferController } from './offer.controller';
import { OfferService } from './offer.service';

describe('OfferController', () => {
  let controller: OfferController;
  let offerService: jest.Mocked<Partial<OfferService>>;

  const mockReq = { user: { userId: 'user-1' } } as any;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findByNft: jest.fn(),
      accept: jest.fn(),
      cancel: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OfferController],
      providers: [{ provide: OfferService, useValue: mockService }],
    }).compile();

    controller = module.get<OfferController>(OfferController);
    offerService = module.get(OfferService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOffer', () => {
    it('should call offerService.create with DTO and bidderId', async () => {
      const dto = { nftContractId: 'contract-1', tokenId: '1', price: '100' } as any;
      offerService.create.mockResolvedValue({ id: 'offer-1' } as any);

      const result = await controller.createOffer(dto, mockReq);
      expect(result).toBeDefined();
      expect(offerService.create).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('listOffers', () => {
    it('should parse contractId:tokenId and call findByNft', async () => {
      offerService.findByNft.mockResolvedValue([]);
      await controller.listOffers('contract-1:token-123');
      expect(offerService.findByNft).toHaveBeenCalledWith('contract-1', 'token-123');
    });

    it('should handle token IDs with colons', async () => {
      offerService.findByNft.mockResolvedValue([]);
      await controller.listOffers('contract-1:abc:def');
      expect(offerService.findByNft).toHaveBeenCalledWith('contract-1', 'abc:def');
    });
  });

  describe('acceptOffer', () => {
    it('should call offerService.accept with ownerId', async () => {
      offerService.accept.mockResolvedValue({ success: true } as any);
      const result = await controller.acceptOffer('offer-1', mockReq);
      expect(result).toBeDefined();
      expect(offerService.accept).toHaveBeenCalledWith('offer-1', 'user-1');
    });
  });

  describe('cancelOffer', () => {
    it('should call offerService.cancel with bidderId', async () => {
      offerService.cancel.mockResolvedValue({ success: true } as any);
      const result = await controller.cancelOffer('offer-1', mockReq);
      expect(result).toBeDefined();
      expect(offerService.cancel).toHaveBeenCalledWith('offer-1', 'user-1');
    });
  });

  describe('getOffer', () => {
    it('should call offerService.findOne', async () => {
      offerService.findOne.mockResolvedValue({ id: 'offer-1' } as any);
      const result = await controller.getOffer('offer-1');
      expect(result).toBeDefined();
      expect(offerService.findOne).toHaveBeenCalledWith('offer-1');
    });
  });
});
