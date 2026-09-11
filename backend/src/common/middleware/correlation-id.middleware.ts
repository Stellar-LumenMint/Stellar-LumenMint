import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

/**
 * CorrelationIdMiddleware — Injects a unique X-Correlation-Id header
 * into every incoming request for end-to-end request tracing.
 *
 * If the client sends an X-Correlation-Id header, it is reused.
 * Otherwise a new UUID v4 is generated.
 * The correlation ID is also stored in the AsyncLocalStorage
 * for use throughout the request lifecycle.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private static readonly HEADER_NAME = 'x-correlation-id';

  constructor(
    @InjectPinoLogger(CorrelationIdMiddleware.name)
    private readonly logger: PinoLogger,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const incomingId = req.headers[CorrelationIdMiddleware.HEADER_NAME] as
      | string
      | undefined;

    const correlationId = incomingId?.trim() || randomUUID();

    // Attach to request for downstream use
    (req as Request & { correlationId: string }).correlationId = correlationId;

    // Set response header so clients can trace their requests
    res.setHeader(CorrelationIdMiddleware.HEADER_NAME, correlationId);

    // Inject into pino log context for this request. `req.log` comes from
    // pino-http and is not structurally typed in the request interface, so
    // narrow it before use instead of falling back to `any`.
    const requestLogger = req.log as
      | { setBindings?: (bindings: Record<string, unknown>) => void }
      | undefined;
    if (typeof requestLogger?.setBindings === 'function') {
      requestLogger.setBindings({ correlationId });
    }

    next();
  }
}
