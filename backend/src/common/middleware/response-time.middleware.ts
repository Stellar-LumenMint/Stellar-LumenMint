import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * ResponseTimeMiddleware — Adds an X-Response-Time header (in ms)
 * to every response for latency monitoring.
 */
@Injectable()
export class ResponseTimeMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();

    // Hook into the response finish event
    res.on('finish', () => {
      const diff = process.hrtime.bigint() - start;
      const ms = Number(diff) / 1_000_000;
      res.setHeader('X-Response-Time', `${ms.toFixed(2)}ms`);
    });

    next();
  }
}
