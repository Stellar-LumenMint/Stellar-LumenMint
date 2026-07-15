import { Test, TestingModule } from '@nestjs/testing';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { BadRequestException } from '@nestjs/common';

describe('SocialController', () => {
  let controller: SocialController;
  let socialService: jest.Mocked<Partial<SocialService>>;

  const mockReq = {
    user: { userId: 'user-1' },
  } as any;

  beforeEach(async () => {
    const mockService = {
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
      isFollowing: jest.fn(),
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
      getFollowersCount: jest.fn(),
      getFollowingCount: jest.fn(),
      getFeed: jest.fn(),
      getMutualFollows: jest.fn(),
      getUserActivities: jest.fn(),
      getSuggestedUsers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SocialController],
      providers: [{ provide: SocialService, useValue: mockService }],
    }).compile();

    controller = module.get<SocialController>(SocialController);
    socialService = module.get(SocialService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('followUser', () => {
    it('should call socialService.followUser and return success', async () => {
      socialService.followUser.mockResolvedValue({ id: 'f1' } as any);
      const result = await controller.followUser(mockReq, 'user-2');
      expect(result.success).toBe(true);
      expect(socialService.followUser).toHaveBeenCalledWith('user-1', 'user-2');
    });
  });

  describe('unfollowUser', () => {
    it('should call socialService.unfollowUser and return success', async () => {
      socialService.unfollowUser.mockResolvedValue(undefined);
      const result = await controller.unfollowUser(mockReq, 'user-2');
      expect(result.success).toBe(true);
      expect(socialService.unfollowUser).toHaveBeenCalledWith('user-1', 'user-2');
    });
  });

  describe('getFollowCounts', () => {
    it('should return followers and following counts', async () => {
      socialService.getFollowersCount.mockResolvedValue(10);
      socialService.getFollowingCount.mockResolvedValue(5);
      const result = await controller.getFollowCounts('user-1');
      expect(result).toEqual({ followers: 10, following: 5 });
    });
  });

  describe('checkFollow', () => {
    it('should return isFollowing status', async () => {
      socialService.isFollowing.mockResolvedValue(true);
      const result = await controller.checkFollow(mockReq, 'user-2');
      expect(result).toEqual({ isFollowing: true });
    });
  });

  describe('getFeed', () => {
    it('should return feed with default pagination', async () => {
      socialService.getFeed.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, hasMore: false });
      const result = await controller.getFeed(mockReq);
      expect(result.total).toBe(0);
      expect(socialService.getFeed).toHaveBeenCalledWith('user-1', 1, 20, undefined);
    });

    it('should throw BadRequestException for invalid before date', async () => {
      await expect(
        controller.getFeed(mockReq, '1', '20', 'not-a-date'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSuggestions', () => {
    it('should return suggested users', async () => {
      socialService.getSuggestedUsers.mockResolvedValue([{ id: 'u2' } as any]);
      const result = await controller.getSuggestions(mockReq);
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
    });
  });
});
