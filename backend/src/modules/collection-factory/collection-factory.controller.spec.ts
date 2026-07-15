import { Test, TestingModule } from '@nestjs/testing';
import { CollectionFactoryController } from './collection-factory.controller';
import { CollectionFactoryService } from './collection-factory.service';

describe('CollectionFactoryController', () => {
  let controller: CollectionFactoryController;
  let service: jest.Mocked<Partial<CollectionFactoryService>>;

  beforeEach(async () => {
    const mockService = {
      createCollection: jest.fn(),
      getCollectionCount: jest.fn(),
      getCollectionAddress: jest.fn(),
      mintToken: jest.fn(),
      batchMint: jest.fn(),
      transferToken: jest.fn(),
      setRoyalty: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectionFactoryController],
      providers: [{ provide: CollectionFactoryService, useValue: mockService }],
    }).compile();

    controller = module.get<CollectionFactoryController>(CollectionFactoryController);
    service = module.get(CollectionFactoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCollection', () => {
    it('should call service.createCollection with DTO', async () => {
      const dto = { name: 'Test', symbol: 'TST', owner: 'G...' } as any;
      service.createCollection.mockResolvedValue({ returnValue: 'ok' });
      const result = await controller.createCollection(dto);
      expect(result).toBeDefined();
      expect(service.createCollection).toHaveBeenCalledWith(dto);
    });
  });

  describe('getCollectionCount', () => {
    it('should return collection count', async () => {
      service.getCollectionCount.mockResolvedValue({ count: 3, raw: 3 });
      const result = await controller.getCollectionCount();
      expect(result.count).toBe(3);
    });
  });

  describe('mintToken', () => {
    it('should call service.mintToken with params', async () => {
      const dto = { to: 'G...', metadataUri: 'ipfs://x', attributes: {} } as any;
      service.mintToken.mockResolvedValue({ returnValue: 'ok' });
      const result = await controller.mintToken('CABC...', dto);
      expect(result).toBeDefined();
      expect(service.mintToken).toHaveBeenCalledWith('CABC...', 'G...', 'ipfs://x', {});
    });
  });

  describe('setRoyalty', () => {
    it('should call service.setRoyalty with params', async () => {
      const dto = { recipient: 'G...', percentage: 5 } as any;
      service.setRoyalty.mockResolvedValue({ returnValue: 'ok' });
      const result = await controller.setRoyalty('CABC...', dto);
      expect(result).toBeDefined();
      expect(service.setRoyalty).toHaveBeenCalledWith('CABC...', 'G...', 5);
    });
  });
});
