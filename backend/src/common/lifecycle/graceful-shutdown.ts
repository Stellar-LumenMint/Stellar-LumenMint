import {
  Injectable,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { INestApplication } from '@nestjs/common';

/**
 * GracefulShutdownService — Handles SIGTERM and SIGINT signals
 * by gracefully closing the NestJS application, draining in-flight
 * requests, and closing database connections.
 */
@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private app: INestApplication | null = null;
  private shutdownInProgress = false;

  /**
   * Attach signal handlers to the NestJS application instance.
   * Call this after app.init() in main.ts.
   */
  attach(app: INestApplication): void {
    this.app = app;

    const handler = this.createSignalHandler();

    process.on('SIGTERM', handler);
    process.on('SIGINT', handler);

    this.logger.log('Graceful shutdown handlers attached (SIGTERM, SIGINT)');
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;

    this.logger.log(`Starting graceful shutdown (signal: ${signal ?? 'unknown'})`);

    try {
      if (this.app) {
        // Stop accepting new connections
        const httpServer = this.app.getHttpServer();
        if (httpServer?.close) {
          await new Promise<void>((resolve) => {
            httpServer.close(() => {
              this.logger.log('HTTP server closed — no longer accepting connections');
              resolve();
            });
          });
        }

        // Close the NestJS application (triggers OnApplicationShutdown hooks)
        await this.app.close();
        this.logger.log('NestJS application closed successfully');
      }
    } catch (error) {
      this.logger.error(`Error during graceful shutdown: ${(error as Error).message}`);
    }

    this.logger.log('Graceful shutdown complete');
    process.exit(0);
  }

  private createSignalHandler(): (signal: string) => void {
    return (signal: string) => {
      this.logger.log(`Received ${signal} — initiating graceful shutdown`);
      this.onApplicationShutdown(signal).catch((err) => {
        this.logger.error(`Shutdown error: ${err.message}`);
        process.exit(1);
      });

      // Force exit after 30s if graceful shutdown doesn't complete
      setTimeout(() => {
        this.logger.error('Forced shutdown after 30s timeout');
        process.exit(1);
      }, 30_000).unref();
    };
  }
}
