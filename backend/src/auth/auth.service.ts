import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { MoreThan, Repository } from 'typeorm';
import { EmailLoginDto, EmailRegisterDto } from './dto/email-auth.dto';
import {
  WalletChallengeDto,
  WalletChallengeResponseDto,
} from './dto/wallet-challenge.dto';
import {
  WalletLinkDto,
  WalletUnlinkDto,
  WalletVerifyDto,
} from './dto/wallet-auth.dto';
import { WalletSession } from './entities/wallet-session.entity';
import { UserWallet } from './entities/user-wallet.entity';
import { User } from '../users/user.entity';
import { StellarSignatureStrategy } from './strategies/stellar.strategy';

type JwtUserPayload = {
  sub: string;
  username?: string;
  email?: string;
  walletAddress?: string;
  role?: string;
  isBanned?: boolean;
};

type JwtRefreshPayload = {
  sub: string;
  type: string;
  tokenVersion?: number;
};

// scrypt parameters tuned above Node's defaults (N=2^14) to the OWASP
// minimum for interactive logins (N=2^17). The larger memory cost makes
// offline brute-force of a leaked hash meaningfully more expensive while
// keeping per-login latency well under a second on modern hardware.
const SCRYPT_N = 131072; // 2^17
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

// promisify loses the options overload in older @types/node; wrap it with
// the ScryptOptions signature so the tuned cost parameters typecheck.
const scryptAsync = promisify(crypto.scrypt) as (
  password: string,
  salt: string,
  keylen: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

@Injectable()
export class AuthService {
  private readonly challengeTtlSeconds = parseInt(
    process.env.WALLET_CHALLENGE_TTL_SECONDS || '300',
    10,
  );
  private readonly challengeRateLimitMax = parseInt(
    process.env.WALLET_CHALLENGE_RATE_LIMIT_MAX || '5',
    10,
  );
  private readonly challengeRateLimitWindowMs = parseInt(
    process.env.WALLET_CHALLENGE_RATE_LIMIT_WINDOW_MS || '60000',
    10,
  );
  private readonly refreshTokenTtlSeconds = parseInt(
    process.env.JWT_REFRESH_EXPIRES_IN_SECONDS || '604800',
    10,
  );

  constructor(
    private readonly jwtService: JwtService,
    private readonly stellarStrategy: StellarSignatureStrategy,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserWallet)
    private readonly userWalletRepository: Repository<UserWallet>,
    @InjectRepository(WalletSession)
    private readonly walletSessionRepository: Repository<WalletSession>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Queues a profile-index refresh. Deferred so indexing can never delay or
   * fail the auth response it follows; search is eventually consistent.
   */
  private emitSearchUserUpsert(userId: string): void {
    setImmediate(() => {
      this.eventEmitter.emit('search.user.upsert', { userId });
    });
  }

  async registerWithEmail(dto: EmailRegisterDto) {
    const normalizedEmail = this.normalizeEmail(dto.email);

    const existing = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.userRepository.save(
      this.userRepository.create({
        email: normalizedEmail,
        passwordHash,
        username: dto.username,
        isEmailVerified: false,
      }),
    );

    // Newly registered creators must be searchable without waiting for them
    // to edit their profile.
    this.emitSearchUserUpsert(user.id);

    return this.buildAuthResponse(user);
  }

  async loginWithEmail(dto: EmailLoginDto) {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValidPassword = await this.verifyPassword(
      dto.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return this.buildAuthResponse(user);
  }

  async generateWalletChallenge(
    dto: WalletChallengeDto,
    requestIp?: string,
  ): Promise<WalletChallengeResponseDto> {
    await this.assertChallengeRateLimit(requestIp);

    if (!this.stellarStrategy.isValidPublicKey(dto.walletAddress)) {
      throw new BadRequestException('Invalid Stellar wallet address');
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + this.challengeTtlSeconds * 1000,
    );
    const message = this.buildChallengeMessage(
      dto.walletAddress,
      nonce,
      issuedAt,
    );

    // Store nonce in Redis with TTL
    const sessionKey = `nonce:${dto.walletAddress}`;
    const sessionData = {
      nonce,
      challengeMessage: message,
      walletAddress: dto.walletAddress,
      walletProvider: dto.walletProvider,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ipAddress: requestIp,
    };

    await this.cacheManager.set(
      sessionKey,
      sessionData,
      this.challengeTtlSeconds * 1000,
    );

    return {
      sessionId: sessionKey,
      walletAddress: dto.walletAddress,
      nonce,
      message,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async verifyWalletChallenge(dto: WalletVerifyDto) {
    if (!this.stellarStrategy.isValidPublicKey(dto.walletAddress)) {
      throw new BadRequestException('Invalid Stellar wallet address');
    }

    // Retrieve nonce from Redis
    const sessionKey = `nonce:${dto.walletAddress}`;
    const sessionData = await this.cacheManager.get<{
      nonce: string;
      challengeMessage: string;
      walletAddress: string;
      walletProvider?: string;
      issuedAt: string;
      expiresAt: string;
      ipAddress?: string;
    }>(sessionKey);

    if (!sessionData) {
      throw new UnauthorizedException('Wallet challenge not found');
    }

    // Check if expired
    if (new Date(sessionData.expiresAt) <= new Date()) {
      await this.cacheManager.del(sessionKey);
      throw new UnauthorizedException('Wallet challenge has expired');
    }

    // Check nonce matches
    if (sessionData.nonce !== dto.nonce) {
      throw new UnauthorizedException('Invalid nonce');
    }

    const isValidSignature = this.stellarStrategy.verifySignedMessage(
      dto.walletAddress,
      sessionData.challengeMessage,
      dto.signature,
    );

    if (!isValidSignature) {
      throw new UnauthorizedException('Invalid wallet signature');
    }

    const user = await this.resolveUserByWallet(
      dto.walletAddress,
      dto.walletProvider || sessionData.walletProvider,
    );

    await this.upsertLinkedWallet(
      user.id,
      dto.walletAddress,
      dto.walletProvider,
      true,
    );

    // Delete nonce from Redis after successful verification (one-time use)
    await this.cacheManager.del(sessionKey);

    return this.buildAuthResponse(user);
  }

  async linkWallet(userId: string, dto: WalletLinkDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingWallet = await this.userWalletRepository.findOne({
      where: { walletAddress: dto.walletAddress },
    });

    if (existingWallet && existingWallet.userId !== userId) {
      throw new ConflictException('Wallet is already linked to another user');
    }

    // Challenges issued by generateWalletChallenge are stored in the shared
    // Redis cache under `nonce:<walletAddress>` and consumed on use. They are
    // never written to the WalletSession table, so querying the database here
    // meant linkWallet could never succeed — the rows simply never existed.
    // Read from the same store generateWalletChallenge writes to so the two
    // flows agree on a single source of truth for pending challenges.
    const sessionKey = `nonce:${dto.walletAddress}`;
    const sessionData = await this.cacheManager.get<{
      nonce: string;
      challengeMessage: string;
      walletAddress: string;
      expiresAt: string;
    }>(sessionKey);

    if (!sessionData) {
      throw new UnauthorizedException(
        'Wallet challenge not found or already used',
      );
    }

    if (sessionData.nonce !== dto.nonce) {
      throw new UnauthorizedException('Invalid nonce');
    }

    if (new Date(sessionData.expiresAt) <= new Date()) {
      await this.cacheManager.del(sessionKey);
      throw new UnauthorizedException('Wallet challenge has expired');
    }

    const isValid = this.stellarStrategy.verifySignedMessage(
      dto.walletAddress,
      sessionData.challengeMessage,
      dto.signature,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid wallet signature');
    }

    const linked = await this.upsertLinkedWallet(
      userId,
      dto.walletAddress,
      dto.walletProvider,
      false,
    );

    // One-time use: consume the challenge so the nonce cannot be replayed.
    await this.cacheManager.del(sessionKey);

    return {
      success: true,
      wallet: linked,
    };
  }

  async unlinkWallet(userId: string, dto: WalletUnlinkDto) {
    const wallet = await this.userWalletRepository.findOne({
      where: {
        userId,
        walletAddress: dto.walletAddress,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet is not linked to the current user');
    }

    const linkedWalletCount = await this.userWalletRepository.count({
      where: { userId },
    });

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (linkedWalletCount <= 1 && !user.email) {
      throw new BadRequestException(
        'Cannot unlink the only wallet from a wallet-only account.',
      );
    }

    await this.userWalletRepository.delete({ id: wallet.id });

    if (wallet.isPrimary) {
      const nextPrimary = await this.userWalletRepository.findOne({
        where: { userId },
        order: { createdAt: 'ASC' },
      });

      if (nextPrimary) {
        nextPrimary.isPrimary = true;
        await this.userWalletRepository.save(nextPrimary);

        await this.userRepository.update(
          { id: userId },
          {
            walletAddress: nextPrimary.walletAddress,
            walletPublicKey: nextPrimary.walletAddress,
            walletProvider: nextPrimary.walletProvider,
            walletConnectedAt: new Date(),
          },
        );
      } else {
        await this.userRepository.update(
          { id: userId },
          {
            walletAddress: null,
            walletPublicKey: null,
            walletProvider: null,
            walletConnectedAt: null,
          },
        );
      }
    }

    return { success: true };
  }

  async listActiveWalletSessions(userId: string) {
    return this.walletSessionRepository.find({
      where: {
        userId,
        nonceExpiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async terminateWalletSession(userId: string, sessionId: string) {
    const session = await this.walletSessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Wallet session not found');
    }

    await this.walletSessionRepository.delete({ id: sessionId, userId });
    return { success: true };
  }

  async listUserWallets(userId: string) {
    return this.userWalletRepository.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async generateChallenge(publicKey: string) {
    return this.generateWalletChallenge(
      { walletAddress: publicKey },
      'legacy-route',
    );
  }

  validateStellarTransaction(): null {
    return null;
  }

  login(user: JwtUserPayload) {
    return this.buildTokenPair(user);
  }

  /**
   * Sliding-window rate limit for wallet challenge issuance, stored in the
   * shared Redis cache instead of an in-process Map. The previous in-memory
   * implementation was per-instance (bypassable across replicas) and grew
   * unbounded for every distinct IP that ever called the endpoint.
   */
  private async assertChallengeRateLimit(requestIp?: string) {
    const key = requestIp || 'unknown';
    const cacheKey = `rl:wallet-challenge:${key}`;
    const now = Date.now();

    const record = await this.cacheManager.get<{
      count: number;
      windowStart: number;
    }>(cacheKey);

    let count: number;
    let windowStart: number;
    if (!record || now - record.windowStart > this.challengeRateLimitWindowMs) {
      count = 1;
      windowStart = now;
    } else {
      count = record.count + 1;
      windowStart = record.windowStart;
    }

    if (count > this.challengeRateLimitMax) {
      throw new HttpException(
        'Too many wallet challenge requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // TTL = window length keeps the key bounded; expired keys expire away.
    await this.cacheManager.set(
      cacheKey,
      { count, windowStart },
      this.challengeRateLimitWindowMs,
    );
  }

  private buildChallengeMessage(
    walletAddress: string,
    nonce: string,
    issuedAt: Date,
  ): string {
    return [
      'Stellar-LumenMint Wallet Authentication',
      `Wallet: ${walletAddress}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt.toISOString()}`,
      `Expires In: ${this.challengeTtlSeconds}s`,
    ].join('\n');
  }

  private async resolveUserByWallet(
    walletAddress: string,
    walletProvider?: string,
  ): Promise<User> {
    const existingWallet = await this.userWalletRepository.findOne({
      where: { walletAddress },
    });

    if (existingWallet) {
      const existingUser = await this.userRepository.findOne({
        where: { id: existingWallet.userId },
      });

      if (!existingUser) {
        throw new NotFoundException('Linked user not found');
      }

      return existingUser;
    }

    const byPrimaryWallet = await this.userRepository.findOne({
      where: [{ walletAddress }, { address: walletAddress }],
    });

    if (byPrimaryWallet) {
      return byPrimaryWallet;
    }

    const user = await this.userRepository.save(
      this.userRepository.create({
        address: walletAddress,
        walletAddress,
        walletPublicKey: walletAddress,
        walletProvider: walletProvider || 'freighter',
        walletConnectedAt: new Date(),
      }),
    );

    // Wallet-first accounts are created here; index them so their profile is
    // discoverable as soon as they sign up.
    this.emitSearchUserUpsert(user.id);

    return user;
  }

  private async upsertLinkedWallet(
    userId: string,
    walletAddress: string,
    walletProvider?: string,
    makePrimary = false,
  ) {
    const existing = await this.userWalletRepository.findOne({
      where: { userId, walletAddress },
    });

    if (existing) {
      existing.walletProvider = walletProvider || existing.walletProvider;
      existing.lastUsedAt = new Date();
      if (makePrimary) {
        existing.isPrimary = true;
      }
      const saved = await this.userWalletRepository.save(existing);
      await this.syncPrimaryWallet(
        userId,
        saved.walletAddress,
        saved.walletProvider,
      );
      return saved;
    }

    if (makePrimary) {
      await this.userWalletRepository.update({ userId }, { isPrimary: false });
    }

    const created = await this.userWalletRepository.save(
      this.userWalletRepository.create({
        userId,
        walletAddress,
        walletProvider: walletProvider || 'freighter',
        isPrimary: makePrimary,
        lastUsedAt: new Date(),
      }),
    );

    await this.syncPrimaryWallet(
      userId,
      created.walletAddress,
      created.walletProvider,
    );
    return created;
  }

  private async syncPrimaryWallet(
    userId: string,
    walletAddress: string,
    walletProvider: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const resolvedAddress = user?.address || walletAddress;

    await this.userRepository.update(
      { id: userId },
      {
        address: resolvedAddress,
        walletAddress,
        walletPublicKey: walletAddress,
        walletProvider,
        walletConnectedAt: new Date(),
      },
    );
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scryptAsync(password, salt, 64, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAXMEM,
    });
    return `${salt}:${hash.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    storedPasswordHash: string,
  ): Promise<boolean> {
    const [salt, storedHash] = storedPasswordHash.split(':');
    if (!salt || !storedHash) {
      return false;
    }

    const derivedHash = await scryptAsync(password, salt, 64, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAXMEM,
    });
    const storedHashBuffer = Buffer.from(storedHash, 'hex');

    if (storedHashBuffer.length !== derivedHash.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedHashBuffer, derivedHash);
  }

  private buildAuthResponse(user: User) {
    const resolvedWalletAddress =
      user.walletAddress ?? user.address ?? undefined;
    const resolvedEmail = user.email ?? undefined;

    const tokenPair = this.buildTokenPair({
      sub: user.id,
      username: user.username,
      email: resolvedEmail,
      walletAddress: resolvedWalletAddress,
      role: user.role,
      isBanned: user.isBanned,
      tokenVersion: user.tokenVersion,
    });

    return {
      ...tokenPair,
      user: {
        id: user.id,
        address: user.address,
        email: resolvedEmail,
        username: user.username,
        walletAddress: resolvedWalletAddress,
        walletProvider: user.walletProvider,
        avatarUrl: user.avatarUrl ?? null,
        bannerUrl: user.bannerUrl ?? null,
      },
    };
  }
  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken);
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      // A token issued before the latest token-version bump (password
      // change, forced logout) is stale and must be rejected, no matter
      // how long it still has to live.
      if ((payload.tokenVersion ?? 0) !== user.tokenVersion) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return this.buildAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private buildTokenPair(user: JwtUserPayload & { tokenVersion?: number }) {
    const accessToken = this.jwtService.sign({
      sub: user.sub,
      username: user.username,
      email: user.email,
      walletAddress: user.walletAddress,
      role: user.role,
      isBanned: user.isBanned,
      tokenVersion: user.tokenVersion ?? 0,
      type: 'access',
    });
    const refreshToken = this.jwtService.sign(
      {
        sub: user.sub,
        tokenVersion: user.tokenVersion ?? 0,
        type: 'refresh',
      },
      { expiresIn: this.refreshTokenTtlSeconds },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
