import { Injectable } from '@nestjs/common';
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
  }) {
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
