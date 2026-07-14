// ── NFT Lifecycle Pipeline ───────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PipelineService } from '../pipeline.service';
import { PipelineStep, PipelineResult } from '../pipeline.types';

/**
 * Context flowing through the NFT lifecycle pipeline.
 */
export interface NftLifecycleContext {
  nftId: string;
  contractId?: string;
  tokenId?: number;
  ownerAddress: string;
  metadataUri: string;
  creatorAddress?: string;
  collectionId?: string;
  attributes?: Record<string, string>[];
  /** Steps completed so far (for rollback awareness). */
  completedSteps: string[];
}

@Injectable()
export class NftLifecyclePipeline {
  private readonly logger = new Logger(NftLifecyclePipeline.name);

  constructor(
    private readonly pipelineService: PipelineService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Full NFT mint lifecycle pipeline:
   *   1. validateNftData  — Validate required fields
   *   2. indexInSearch    — Add to Meilisearch
   *   3. notifyOwner      — Push notification to the new owner
   *   4. emitDomainEvent  — Emit 'nft.created' domain event
   *
   * @returns PipelineResult with the enriched context.
   */
  async onNftMinted(
    context: NftLifecycleContext,
  ): Promise<PipelineResult<NftLifecycleContext>> {
    const steps: PipelineStep<NftLifecycleContext>[] = [
      {
        name: 'validateNftData',
        execute: async (ctx) => this.validateNftData(ctx),
        continueOnFailure: false,
      },
      {
        name: 'indexInSearch',
        execute: async (ctx) => this.indexInSearch(ctx),
        compensate: async (ctx) => this.unindexFromSearch(ctx),
        maxRetries: 3,
        retryDelayMs: 2000,
      },
      {
        name: 'notifyOwner',
        execute: async (ctx) => this.notifyOwner(ctx),
        continueOnFailure: true, // Non-critical — don't block mint
      },
      {
        name: 'emitDomainEvent',
        execute: async (ctx) => this.emitDomainEvent(ctx),
        maxRetries: 2,
        retryDelayMs: 1000,
      },
    ];

    context.completedSteps = [];
    return this.pipelineService.execute<NftLifecycleContext>(
      'NftLifecycle:mint',
      steps,
      context,
      { haltOnFailure: true, verbose: true },
    );
  }

  /**
   * NFT transfer lifecycle pipeline:
   *   1. updateOwnership  — Emit search update for ownership change
   *   2. notifyRecipient  — Notify new owner
   *   3. emitTransferEvent
   */
  async onNftTransferred(
    context: NftLifecycleContext & { fromAddress: string },
  ): Promise<PipelineResult<NftLifecycleContext>> {
    const steps: PipelineStep<NftLifecycleContext>[] = [
      {
        name: 'updateOwnership',
        execute: async (ctx) => this.updateOwnership(ctx),
        maxRetries: 2,
        retryDelayMs: 1000,
      },
      {
        name: 'notifyRecipient',
        execute: async (ctx) => this.notifyOwner(ctx),
        continueOnFailure: true,
      },
      {
        name: 'emitTransferEvent',
        execute: async (ctx) => this.emitTransferEvent(ctx),
        maxRetries: 2,
        retryDelayMs: 1000,
      },
    ];

    context.completedSteps = [];
    return this.pipelineService.execute<NftLifecycleContext>(
      'NftLifecycle:transfer',
      steps,
      context,
      { haltOnFailure: false, verbose: true },
    );
  }

  // ── Step Implementations ────────────────────────────────────────────────

  private async validateNftData(
    ctx: NftLifecycleContext,
  ): Promise<NftLifecycleContext> {
    if (!ctx.nftId || !ctx.ownerAddress) {
      throw new Error('nftId and ownerAddress are required');
    }
    this.logger.debug(`Validated NFT ${ctx.nftId}`);
    ctx.completedSteps.push('validateNftData');
    return ctx;
  }

  private async indexInSearch(
    ctx: NftLifecycleContext,
  ): Promise<NftLifecycleContext> {
    // Emit to search sync listener (async, handled by SearchSyncListener)
    this.eventEmitter.emit('search.nft.upsert', { nftId: ctx.nftId });
    this.logger.debug(`Search index requested for NFT ${ctx.nftId}`);
    ctx.completedSteps.push('indexInSearch');
    return ctx;
  }

  private async unindexFromSearch(
    ctx: NftLifecycleContext,
  ): Promise<void> {
    this.eventEmitter.emit('search.nft.delete', { nftId: ctx.nftId });
    this.logger.warn(`Rolled back search index for NFT ${ctx.nftId}`);
  }

  private async notifyOwner(
    ctx: NftLifecycleContext,
  ): Promise<NftLifecycleContext> {
    // Emit notification event (handled by NotificationsService)
    this.eventEmitter.emit('notification.send', {
      userId: ctx.ownerAddress,
      type: 'nft.received',
      title: 'NFT Received',
      message: `You received NFT #${ctx.tokenId ?? ctx.nftId}`,
      data: { nftId: ctx.nftId, contractId: ctx.contractId },
    });
    ctx.completedSteps.push('notifyOwner');
    return ctx;
  }

  private async emitDomainEvent(
    ctx: NftLifecycleContext,
  ): Promise<NftLifecycleContext> {
    this.eventEmitter.emit('nft.created', {
      nftId: ctx.nftId,
      contractId: ctx.contractId,
      tokenId: ctx.tokenId,
      owner: ctx.ownerAddress,
      creator: ctx.creatorAddress,
      metadataUri: ctx.metadataUri,
      collectionId: ctx.collectionId,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Emitted nft.created for ${ctx.nftId}`);
    ctx.completedSteps.push('emitDomainEvent');
    return ctx;
  }

  private async updateOwnership(
    ctx: NftLifecycleContext & { fromAddress: string },
  ): Promise<NftLifecycleContext> {
    this.eventEmitter.emit('search.nft.upsert', { nftId: ctx.nftId });
    this.logger.debug(
      `Ownership updated: NFT ${ctx.nftId} ${ctx.fromAddress} → ${ctx.ownerAddress}`,
    );
    ctx.completedSteps.push('updateOwnership');
    return ctx;
  }

  private async emitTransferEvent(
    ctx: NftLifecycleContext & { fromAddress: string },
  ): Promise<NftLifecycleContext> {
    this.eventEmitter.emit('nft.transferred', {
      nftId: ctx.nftId,
      from: ctx.fromAddress,
      to: ctx.ownerAddress,
      tokenId: ctx.tokenId,
      contractId: ctx.contractId,
      timestamp: new Date().toISOString(),
    });
    ctx.completedSteps.push('emitTransferEvent');
    return ctx;
  }
}
