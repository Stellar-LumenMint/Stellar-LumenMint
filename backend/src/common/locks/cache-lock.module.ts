import { Global, Module } from '@nestjs/common';
import { CacheLockService } from './cache-lock.service';

/**
 * Global module so any scheduler or job can inject the distributed lock.
 */
@Global()
@Module({
  providers: [CacheLockService],
  exports: [CacheLockService],
})
export class CacheLockModule {}
