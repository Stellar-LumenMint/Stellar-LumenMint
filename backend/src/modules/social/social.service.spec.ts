import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialService } from './social.service';
import { Follow } from './entities/follow.entity';
import { Activity, ActivityType } from './entities/activity.entity';
import { User } from '../../users/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SocialService', () => {
  let service: SocialService;
  let followRepository: jest.Mocked<Repository<Follow>>;
  let activityRepository: jest.Mocked<Repository<Activity>>;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const mockFollowRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockActivityRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockUserRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        { provide: getRepositoryToken(Follow), useValue: mockFollowRepo },
        { provide: getRepositoryToken(Activity), useValue: mockActivityRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<SocialService>(SocialService);
    followRepository = module.get(getRepositoryToken(Follow));
    activityRepository = module.get(getRepositoryToken(Activity));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('followUser', () => {
    it('should throw BadRequestException when trying to self-follow', async () => {
      await expect(service.followUser('user-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.followUser('user-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when already following', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'user-2' } as User);
      followRepository.findOne.mockResolvedValue({ id: 'f1' } as Follow);

      await expect(service.followUser('user-1', 'user-2')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create follow and activity on success', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-2',
        username: 'alice',
        walletAddress: 'GABC...',
      } as User);
      followRepository.findOne.mockResolvedValue(null);
      followRepository.create.mockReturnValue({ followerId: 'user-1', followingId: 'user-2' } as Follow);
      followRepository.save.mockResolvedValue({ id: 'f1', followerId: 'user-1', followingId: 'user-2' } as Follow);
      activityRepository.create.mockReturnValue({ id: 'a1' } as Activity);
      activityRepository.save.mockResolvedValue({ id: 'a1' } as Activity);
      activityRepository.count.mockResolvedValue(5);

      const result = await service.followUser('user-1', 'user-2');

      expect(result).toBeDefined();
      expect(followRepository.save).toHaveBeenCalled();
      expect(activityRepository.save).toHaveBeenCalled();
    });
  });

  describe('unfollowUser', () => {
    it('should throw NotFoundException when follow relationship does not exist', async () => {
      followRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.unfollowUser('user-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete follow on success', async () => {
      followRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.unfollowUser('user-1', 'user-2');

      expect(followRepository.delete).toHaveBeenCalledWith({
        followerId: 'user-1',
        followingId: 'user-2',
      });
    });
  });

  describe('isFollowing', () => {
    it('should return true when following', async () => {
      followRepository.count.mockResolvedValue(1);
      expect(await service.isFollowing('user-1', 'user-2')).toBe(true);
    });

    it('should return false when not following', async () => {
      followRepository.count.mockResolvedValue(0);
      expect(await service.isFollowing('user-1', 'user-2')).toBe(false);
    });
  });

  describe('getFollowersCount / getFollowingCount', () => {
    it('should return follower count', async () => {
      followRepository.count.mockResolvedValue(42);
      expect(await service.getFollowersCount('user-1')).toBe(42);
    });

    it('should return following count', async () => {
      followRepository.count.mockResolvedValue(7);
      expect(await service.getFollowingCount('user-1')).toBe(7);
    });
  });

  describe('getFeed', () => {
    it('should return empty feed when not following anyone', async () => {
      followRepository.find.mockResolvedValue([]);

      const result = await service.getFeed('user-1');
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return activities from followed users', async () => {
      followRepository.find.mockResolvedValue([
        { followingId: 'user-2' } as Follow,
      ]);
      activityRepository.findAndCount.mockResolvedValue([
        [{ id: 'a1', actorId: 'user-2' } as Activity],
        1,
      ]);

      const result = await service.getFeed('user-1');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
