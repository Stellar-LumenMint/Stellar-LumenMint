import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * API versioning middleware.
 *
 * Strips the /api/v{N} prefix from the request URL so that controllers
 * can use clean paths while the public API exposes versioned routes.
 *
 * Example: GET /api/v1/payments/intent → controller sees /api/payments/intent
 */
@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const match = req.originalUrl.match(/^\/api\/v(\d+)(\/.*)$/);
    if (match) {
      req.url = `/api${match[2]}`;
    }
    next();
  }
}
