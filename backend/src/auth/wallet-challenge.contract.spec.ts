import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Keypair } from 'stellar-sdk';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { UserWallet } from './entities/user-wallet.entity';
import { WalletSession } from './entities/wallet-session.entity';
import { StellarSignatureStrategy } from './strategies/stellar.strategy';

/**
 * Contract test between the backend challenge issuer and the wallet signing
 * flow. The frontend signs exactly the `message` the server returns; if the
 * message format ever changes, this test fails and forces the client signing
 * code to be updated in the same change.
 */
describe('AuthService — wallet challenge contract', () => {
  let service: AuthService;

  const userRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const userWalletRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };

  const walletSessionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(),
  };

  const cacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const walletAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

  // In-memory stand-in for Redis so a challenge stored by
  // generateWalletChallenge is observable by verifyWalletChallenge.
  const sessionStore = new Map<string, unknown>();

  beforeEach(async () => {
    jest.clearAllMocks();
    sessionStore.clear();
    cacheManager.get.mockImplementation((key: string) =>
      Promise.resolve(sessionStore.get(key)),
    );
    cacheManager.set.mockImplementation(
      (key: string, value: unknown) => {
        sessionStore.set(key, value);
        return Promise.resolve();
      },
    );
    cacheManager.del.mockImplementation((key: string) => {
      sessionStore.delete(key);
      return Promise.resolve();
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        // Real strategy: we want to prove a genuine Ed25519 signature over
        // the exact server-issued message verifies.
        StellarSignatureStrategy,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(UserWallet), useValue: userWalletRepository },
        { provide: getRepositoryToken(WalletSession), useValue: walletSessionRepository },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  function mockWalletResolution() {
    userWalletRepository.findOne
      .mockResolvedValueOnce(null) // resolveUserByWallet: no linked wallet
      .mockResolvedValueOnce(null); // upsertLinkedWallet: no existing row
    userRepository.findOne.mockResolvedValue(null);
    const createdUser = {
      id: 'user-1',
      address: walletAddress,
      walletAddress,
      walletPublicKey: walletAddress,
      walletProvider: 'freighter',
      walletConnectedAt: new Date(),
      username: null,
    };
    userRepository.create.mockReturnValue(createdUser);
    userRepository.save.mockResolvedValue(createdUser);
    userWalletRepository.update.mockResolvedValue(undefined);
    const createdWallet = {
      id: 'wallet-1',
      userId: 'user-1',
      walletAddress,
      walletProvider: 'freighter',
      isPrimary: true,
      lastUsedAt: new Date(),
    };
    userWalletRepository.create.mockReturnValue(createdWallet);
    userWalletRepository.save.mockResolvedValue(createdWallet);
    userRepository.update.mockResolvedValue(undefined);
    jwtService.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
  }

  it('issues a challenge whose message format matches the client contract', async () => {
    cacheManager.set.mockResolvedValue(undefined);

    const result = await service.generateWalletChallenge({
      walletAddress,
      walletProvider: 'freighter',
    });

    expect(result.message).toMatch(
      /^Stellar-LumenMint Wallet Authentication\nWallet: G[0-9A-Z]{55}\nNonce: [0-9a-f]{64}\nIssued At: \d{4}-\d{2}-\d{2}T.*Z\nExpires In: \d+s$/,
    );
    // The client must sign exactly this message — nothing more, nothing less.
    expect(result.nonce).toBeTruthy();
    expect(result.expiresAt).toBeTruthy();
  });

  it('accepts a real Ed25519 signature over the server-issued message (round trip)', async () => {
    const keypair = Keypair.random();
    const address = keypair.publicKey();
    userWalletRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    userRepository.findOne.mockResolvedValue(null);
    const createdUser = {
      id: 'user-1',
      address,
      walletAddress: address,
      walletPublicKey: address,
      walletProvider: 'freighter',
      walletConnectedAt: new Date(),
      username: null,
    };
    userRepository.create.mockReturnValue(createdUser);
    userRepository.save.mockResolvedValue(createdUser);
    userWalletRepository.update.mockResolvedValue(undefined);
    userWalletRepository.create.mockReturnValue({
      id: 'wallet-1',
      userId: 'user-1',
      walletAddress: address,
      walletProvider: 'freighter',
      isPrimary: true,
      lastUsedAt: new Date(),
    });
    userWalletRepository.save.mockResolvedValue({
      id: 'wallet-1',
      userId: 'user-1',
      walletAddress: address,
      walletProvider: 'freighter',
      isPrimary: true,
      lastUsedAt: new Date(),
    });
    userRepository.update.mockResolvedValue(undefined);
    jwtService.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const challenge = await service.generateWalletChallenge({
      walletAddress: address,
      walletProvider: 'freighter',
    });

    // Sign the exact server message with a real Stellar keypair.
    const signature = keypair
      .sign(Buffer.from(challenge.message, 'utf8'))
      .toString('base64');

    const result = await service.verifyWalletChallenge({
      walletAddress: address,
      nonce: challenge.nonce,
      signature,
    });

    expect(result.access_token).toBe('access-token');
    expect(result.user.id).toBe('user-1');
    // One-time use: the challenge must be consumed.
    expect(cacheManager.del).toHaveBeenCalledWith(`nonce:${address}`);
  });

  it('rejects a signature produced over a tampered message', async () => {
    const keypair = Keypair.random();
    const address = keypair.publicKey();

    const challenge = await service.generateWalletChallenge({
      walletAddress: address,
      walletProvider: 'freighter',
    });

    // Sign a different message than the one the server issued.
    const tampered = challenge.message.replace('Wallet: ', 'Wallet: X');
    const signature = keypair
      .sign(Buffer.from(tampered, 'utf8'))
      .toString('base64');

    await expect(
      service.verifyWalletChallenge({
        walletAddress: address,
        nonce: challenge.nonce,
        signature,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});