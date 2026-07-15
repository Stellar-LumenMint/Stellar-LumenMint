import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Security middleware that sets HTTP security headers.
 *
 * Adds:
 * - Content-Security-Policy (restrict script/style sources)
 * - X-Frame-Options (prevent clickjacking)
 * - X-Content-Type-Options (prevent MIME sniffing)
 * - X-XSS-Protection (legacy XSS filter)
 * - Strict-Transport-Security (enforce HTTPS)
 * - Referrer-Policy (limit referrer leakage)
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://horizon-testnet.stellar.org https://soroban-testnet.stellar.org",
    );
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  }
}
