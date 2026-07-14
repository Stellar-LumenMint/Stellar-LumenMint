import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  checkLive(): Promise<{ status: string; timestamp: string }> {
    return Promise.resolve({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  async checkReady(): Promise<{
    status: string;
    details: {
      postgres: string;
      redis: string;
      meilisearch: string;
      sorobanRpc: string;
    };
    timestamp: string;
  }> {
    const [postgresStatus, redisStatus, meilisearchStatus, sorobanStatus] =
      await Promise.all([
        this.checkPostgres(),
        this.checkRedis(),
        this.checkMeilisearch(),
        this.checkSorobanRpc(),
      ]);

    const isHealthy =
      postgresStatus === 'up' &&
      redisStatus === 'up';

    if (!isHealthy) {
      this.logger.error(
        `Health check failed: Postgres: ${postgresStatus}, Redis: ${redisStatus}, Meilisearch: ${meilisearchStatus}, Soroban RPC: ${sorobanStatus}`,
      );
    }

    return {
      status: isHealthy ? 'ok' : 'error',
      details: {
        postgres: postgresStatus,
        redis: redisStatus,
        meilisearch: meilisearchStatus,
        sorobanRpc: sorobanStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkPostgres(): Promise<string> {
    try {
      if (!this.dataSource.isInitialized) {
        return 'down';
      }
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch (error) {
      this.logger.error('Postgres health check failed', error);
      return 'down';
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      const testKey = 'health-check-test';
      const testValue = 'ok';
      await this.cacheManager.set(testKey, testValue);
      const result = await this.cacheManager.get(testKey);
      return result === testValue ? 'up' : 'down';
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return 'down';
    }
  }

  private async checkMeilisearch(): Promise<string> {
    try {
      const host = this.configService.get<string>('MEILISEARCH_HOST') || 'http://localhost:7700';
      const apiKey = this.configService.get<string>('MEILISEARCH_API_KEY') || '';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${host}/health`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok ? 'up' : 'down';
    } catch {
      return 'degraded';
    }
  }

  private async checkSorobanRpc(): Promise<string> {
    try {
      const rpcUrl = this.configService.get<string>('SOROBAN_RPC_URL');
      if (!rpcUrl) return 'not_configured';

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) return 'down';
      const json = await res.json();
      return json?.result?.status === 'healthy' ? 'up' : 'degraded';
    } catch {
      return 'degraded';
    }
  }
}
