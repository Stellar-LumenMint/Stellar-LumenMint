import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { GraphqlUser } from '../context/context.interface';

@Injectable()
export class GraphqlAuthMiddleware {
  private readonly logger = new Logger(GraphqlAuthMiddleware.name);

  constructor(private readonly jwtService: JwtService) {}

  async resolveUser(req: Request): Promise<GraphqlUser | undefined> {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();
    if (!token) {
      return undefined;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        username?: string;
        email?: string;
        walletAddress?: string;
        role?: string;
        type?: string;
      }>(token);

      // Reject refresh tokens on GraphQL: only access tokens may act as
      // credentials for protected operations. The GraphQL gateway shares
      // the JWT secret with the REST API, so this mirrors jwt.strategy.
      if (payload.type && payload.type !== 'access') {
        return undefined;
      }

      return {
        userId: payload.sub,
        username: payload.username,
        email: payload.email,
        walletAddress: payload.walletAddress,
        role: payload.role,
        tokenType: payload.type,
      };
    } catch (error) {
      const authError = error as Error;
      this.logger.debug(`Ignoring invalid GraphQL JWT: ${authError.message}`);
      return undefined;
    }
  }
}
