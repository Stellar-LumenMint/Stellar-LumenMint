import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from '../config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(configService.get<string>('JWT_SECRET')),
    });
  }

  validate(payload: {
    sub: string;
    username?: string;
    email?: string;
    role?: string;
    isBanned?: boolean;
    walletAddress?: string;
    type?: string;
  }) {
    // Only access tokens may be used on protected routes. Refresh tokens
    // share the same signing secret but must only be redeemable at the
    // refresh endpoint; accepting them here would let a 7-day refresh
    // token act as a full API credential.
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Return user object with role/ban status from the JWT payload so
    // authorization guards (RolesGuard, admin routes) can evaluate them.
    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      isBanned: payload.isBanned,
      walletAddress: payload.walletAddress,
    };
  }
}
