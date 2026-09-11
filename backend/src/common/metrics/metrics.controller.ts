import { Controller, Get, Logger, Req, Res } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { PrometheusService } from './prometheus';
import type { Request, Response } from 'express';

/**
 * Prometheus scrape endpoint. Authenticated with a single shared token
 * (METRICS_TOKEN) compared in constant time — previously the route was gated
 * by both a JWT RolesGuard and a naive `req.query.token !== METRICS_TOKEN`
 * string comparison, which leaked timing information and depended on the
 * RBAC claims being present. Ops tooling scrapes /metrics without a user
 * session, so token auth is the only meaningful gate here.
 */
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly prometheusService: PrometheusService) {}

  @Get()
  async getMetrics(@Req() req: Request, @Res() res: Response) {
    const configuredToken = process.env.METRICS_TOKEN;

    // Fail closed: if the operator forgot to configure the token, refuse to
    // serve metrics rather than exposing them unauthenticated.
    if (!configuredToken) {
      this.logger.error(
        'METRICS_TOKEN is not configured; refusing to serve /metrics',
      );
      return res.status(503).json({ error: 'Metrics token not configured' });
    }

    const provided = typeof req.query.token === 'string' ? req.query.token : '';

    if (!provided) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Compare SHA-256 digests of equal length so timingSafeEqual cannot throw
    // on length mismatch and timing is not correlated with the token length.
    const providedHash = createHash('sha256').update(provided).digest();
    const configuredHash = createHash('sha256')
      .update(configuredToken)
      .digest();

    if (!timingSafeEqual(providedHash, configuredHash)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const metrics = await this.prometheusService.getMetrics();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.send(metrics);
  }
}
