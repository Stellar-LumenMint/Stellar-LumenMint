import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
  NotFoundException,
  GatewayTimeoutException,
  UnauthorizedException,
  UnprocessableEntityException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import {
  AcceptOfferParams,
  CreateAuctionParams,
  CreateTradeParams,
  CreateSaleParams,
  CreateBundleParams,
} from '../../shared/contracts/marketplace-settlement.types';
import { ConfigService } from '@nestjs/config';
import { Address } from 'stellar-sdk';
import { SorobanService, SorobanContractArg } from './soroban.service';
import {
  AUCTION_TYPE_DISCRIMINANT,
  enumToScVal,
  hexToBytesScVal,
  nftItemsToScVal,
  optionToScVal,
  type ContractAsset,
} from './scval.encoders';

// Custom error classes for better error discrimination
export class SorobanContractError extends UnprocessableEntityException {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ContractError';
  }
}

export class SorobanRpcError extends ServiceUnavailableException {
  constructor(message: string) {
    super(message);
    this.name = 'SorobanRpcError';
  }
}

export class InsufficientBalanceError extends HttpException {
  constructor(message: string) {
    super(message, 402); // Payment Required
    this.name = 'InsufficientBalanceError';
  }
}

export class InvalidSignatureError extends UnauthorizedException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSignatureError';
  }
}

export class TransactionFailedError extends BadRequestException {
  constructor(
    message: string,
    public readonly txHash?: string,
  ) {
    super(message);
    this.name = 'TransactionFailedError';
  }
}

@Injectable()
export class MarketplaceSettlementClient {
  constructor(
    private readonly sorobanService: SorobanService,
    private readonly configService: ConfigService,
  ) {
    const contractId = this.configService.get<string>(
      'MARKETPLACE_SETTLEMENT_CONTRACT_ID',
    );
    if (!contractId) {
      throw new ServiceUnavailableException(
        'MARKETPLACE_SETTLEMENT_CONTRACT_ID not set',
      );
    }
    this.contractId = contractId;
    this.txTimeout =
      this.configService.get<number>('CONTRACT_TRANSACTION_TIMEOUT') ?? 60;
  }

  private readonly logger = new Logger(MarketplaceSettlementClient.name);
  private readonly contractId: string;
  private readonly txTimeout: number;

  /**
   * Retry helper for contract calls. Retries up to 3 times with exponential backoff.
   * Preserves HttpException types when re-throwing after retries.
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError = err;
        const msg = this.extractErrorMessage(err);

        // Only retry on transient errors
        const isTransient =
          msg.includes('timeout') ||
          msg.includes('network') ||
          msg.includes('ServiceUnavailable') ||
          msg.includes('ECONNREFUSED') ||
          msg.includes('502') ||
          msg.includes('503') ||
          msg.includes('504') ||
          msg.includes('GatewayTimeout');

        if (attempt < maxAttempts && isTransient) {
          const backoff = 500 * Math.pow(2, attempt - 1);
          this.logger.warn(
            `Retry ${attempt}/${maxAttempts} after ${backoff}ms: ${msg}`,
          );
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        break;
      }
    }

    // Preserve the original error type if it's already an HttpException
    if (lastError instanceof HttpException) {
      throw lastError;
    }

    // Otherwise, map and throw the appropriate typed exception
    this.handleContractError(lastError);
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    if (
      typeof err === 'object' &&
      err &&
      'message' in err &&
      typeof (err as { message?: unknown }).message === 'string'
    ) {
      return (err as { message: string }).message;
    }
    return '';
  }

  /**
   * Map contract errors to domain-specific HttpExceptions.
   * This method preserves error types and adds proper error codes for the interceptor.
   */
  private handleContractError(err: unknown): never {
    const msg = this.extractErrorMessage(err);

    // Log the error with context
    this.logger.error(
      `Contract error: ${msg}`,
      err instanceof Error ? err.stack : undefined,
    );

    // Check for specific error patterns and throw appropriate typed exceptions
    if (
      msg.includes('insufficient balance') ||
      msg.includes('insufficient funds')
    ) {
      throw new InsufficientBalanceError(
        'Insufficient balance for contract operation',
      );
    }

    if (msg.includes('not found') || msg.includes('does not exist')) {
      throw new NotFoundException('Resource not found in contract');
    }

    if (msg.includes('timeout') || msg.includes('timed out')) {
      throw new GatewayTimeoutException('Contract call timed out');
    }

    if (msg.includes('invalid signature') || msg.includes('signature')) {
      throw new InvalidSignatureError(
        'Invalid signature for contract operation',
      );
    }

    if (
      msg.includes('contract') &&
      (msg.includes('revert') || msg.includes('failed'))
    ) {
      throw new SorobanContractError('Contract execution failed', {
        originalMessage: msg,
      });
    }

    if (
      msg.includes('rpc') ||
      msg.includes('network') ||
      msg.includes('unavailable') ||
      msg.includes('connection')
    ) {
      throw new SorobanRpcError('Soroban RPC service unavailable');
    }

    if (msg.includes('invalid') || msg.includes('validation')) {
      throw new BadRequestException(msg);
    }

    // Unknown error - preserve the original message for debugging
    throw new InternalServerErrorException(
      msg || 'Unknown contract error occurred',
    );
  }

  /**
   * Resolve a currency symbol to the Stellar asset contract the marketplace
   * settles in.
   *
   * The contract identifies a payment asset by its SAC address, not by a
   * ticker, so the mapping has to come from configuration. An unconfigured
   * currency is rejected rather than coerced into a string argument, which the
   * host would refuse to decode anyway.
   */
  private resolveCurrency(symbol: string): ContractAsset {
    const raw = this.configService.get<string>('SUPPORTED_CURRENCY_ASSETS');
    if (!raw) {
      throw new ServiceUnavailableException(
        'SUPPORTED_CURRENCY_ASSETS is not configured; cannot map a currency symbol to an asset contract',
      );
    }

    let registry: Record<string, unknown>;
    try {
      registry = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException(
        'SUPPORTED_CURRENCY_ASSETS must be a JSON object mapping symbol to asset contract id',
      );
    }

    const contract = registry[symbol];
    if (typeof contract !== 'string' || contract.length === 0) {
      throw new BadRequestException(
        `Currency ${symbol} is not configured in SUPPORTED_CURRENCY_ASSETS`,
      );
    }

    return { contract, symbol };
  }

  async createSale(params: CreateSaleParams): Promise<number> {
    return this.withRetry(async () => {
      if (
        !params ||
        typeof params !== 'object' ||
        typeof params.seller !== 'string' ||
        typeof params.nftContract !== 'string' ||
        typeof params.tokenId !== 'string' ||
        typeof params.price !== 'string' ||
        typeof params.currency !== 'string' ||
        typeof params.durationSeconds !== 'number'
      ) {
        throw new BadRequestException('Invalid CreateSaleParams');
      }
      // Order and types must match `create_sale(seller, nft_address, token_id,
      // price, currency, duration_seconds)` exactly.
      const args: SorobanContractArg[] = [
        { type: 'address', value: params.seller },
        { type: 'address', value: params.nftContract },
        { type: 'u64', value: params.tokenId },
        { type: 'i128', value: params.price },
        { type: 'asset', value: this.resolveCurrency(params.currency) },
        { type: 'u64', value: params.durationSeconds },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'create_sale',
        args,
      );
      return result.returnValue as number;
    });
  }

  /**
   * Execute a fixed-price sale. `amount` is required: the contract takes
   * `payment_amount` and rejects any value other than the listed price, so
   * omitting it (as the optional third argument previously allowed) produced a
   * call with the wrong arity.
   */
  async executeSale(txId: number, buyer: string, amount: string): Promise<any> {
    return this.withRetry(async () => {
      const args: SorobanContractArg[] = [
        { type: 'u64', value: txId },
        { type: 'address', value: buyer },
        { type: 'i128', value: amount },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'execute_sale',
        args,
      );
      return result.returnValue;
    });
  }

  async createBundle(params: CreateBundleParams): Promise<number> {
    return this.withRetry(async () => {
      if (
        !params ||
        typeof params !== 'object' ||
        typeof params.seller !== 'string' ||
        !Array.isArray(params.items) ||
        typeof params.totalPrice !== 'string' ||
        typeof params.currency !== 'string' ||
        typeof params.durationSeconds !== 'number'
      ) {
        throw new BadRequestException('Invalid CreateBundleParams');
      }
      // `items` is `Vec<NFTItem>` and `currency` is an `Asset` struct; sending
      // the raw JavaScript objects and a currency ticker produced arguments the
      // host could not decode.
      const args: SorobanContractArg[] = [
        { type: 'address', value: params.seller },
        { type: 'scval', value: nftItemsToScVal(params.items) },
        { type: 'i128', value: params.totalPrice },
        { type: 'asset', value: this.resolveCurrency(params.currency) },
        { type: 'u64', value: params.durationSeconds },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'create_bundle',
        args,
      );
      return result.returnValue as number;
    });
  }

  /**
   * Execute a bundle. `amount` is required: the contract's third parameter is
   * `payment_amount` and must equal the listed total.
   */
  async executeBundle(
    bundleId: number,
    buyer: string,
    amount: string,
  ): Promise<any> {
    return this.withRetry(async () => {
      const args: SorobanContractArg[] = [
        { type: 'u64', value: bundleId },
        { type: 'address', value: buyer },
        { type: 'i128', value: amount },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'execute_bundle',
        args,
      );
      return result.returnValue;
    });
  }

  async cancelBundle(bundleId: number, seller: string): Promise<any> {
    return this.withRetry(async () => {
      const args: SorobanContractArg[] = [
        { type: 'u64', value: bundleId },
        { type: 'address', value: seller },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'cancel_bundle',
        args,
      );
      return result.returnValue;
    });
  }

  async createAuction(params: CreateAuctionParams): Promise<number> {
    return this.withRetry(async () => {
      if (
        !params ||
        typeof params !== 'object' ||
        typeof params.seller !== 'string' ||
        typeof params.nftContract !== 'string' ||
        typeof params.tokenId !== 'string' ||
        typeof params.startPrice !== 'string' ||
        typeof params.reservePrice !== 'string' ||
        typeof params.currency !== 'string' ||
        typeof params.auctionType !== 'string' ||
        typeof params.durationSeconds !== 'number'
      ) {
        throw new BadRequestException('Invalid CreateAuctionParams');
      }
      if (typeof params.bidIncrement !== 'string') {
        throw new BadRequestException('Invalid CreateAuctionParams');
      }
      // `create_auction(seller, nft_address, token_id, starting_price,
      // reserve_price, duration_seconds, bid_increment, auction_type,
      // currency)`. `bid_increment` sits between the duration and the auction
      // type, and the auction type is a u32 enum rather than a symbol.
      const args: SorobanContractArg[] = [
        { type: 'address', value: params.seller },
        { type: 'address', value: params.nftContract },
        { type: 'u64', value: params.tokenId },
        { type: 'i128', value: params.startPrice },
        { type: 'i128', value: params.reservePrice },
        { type: 'u64', value: params.durationSeconds },
        { type: 'i128', value: params.bidIncrement },
        {
          type: 'scval',
          value: enumToScVal(AUCTION_TYPE_DISCRIMINANT[params.auctionType]),
        },
        { type: 'asset', value: this.resolveCurrency(params.currency) },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'create_auction',
        args,
      );
      return result.returnValue as number;
    });
  }

  async placeBid(
    auctionId: number,
    bidder: string,
    amount: string,
    commitment?: string,
  ) {
    return this.withRetry(async () => {
      // `commitment_hash` is `Option<Bytes>` and is a required parameter: passing
      // only three arguments made the call undecodable.
      const args: SorobanContractArg[] = [
        { type: 'u64', value: auctionId },
        { type: 'address', value: bidder },
        { type: 'i128', value: amount },
        {
          type: 'scval',
          value: optionToScVal(
            commitment ? hexToBytesScVal(commitment) : undefined,
          ),
        },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'place_bid',
        args,
      );
      return result.returnValue;
    });
  }

  /** `salt` is `Bytes`, not a string. */
  async revealBid(
    auctionId: number,
    bidder: string,
    amount: string,
    salt: string,
  ) {
    return this.withRetry(async () => {
      const args: SorobanContractArg[] = [
        { type: 'u64', value: auctionId },
        { type: 'address', value: bidder },
        { type: 'i128', value: amount },
        { type: 'scval', value: hexToBytesScVal(salt) },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'reveal_bid',
        args,
      );
      return result.returnValue;
    });
  }

  async endAuction(auctionId: number, caller: string) {
    return this.withRetry(async () => {
      const args: SorobanContractArg[] = [
        { type: 'u64', value: auctionId },
        { type: 'address', value: caller },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'end_auction',
        args,
      );
      return result.returnValue;
    });
  }

  /**
   * Create an NFT-for-NFT trade offer.
   *
   * `create_trade(initiator, counterparty, initiator_nfts, counterparty_nfts,
   * duration_seconds)`. The previous encoding sent six string arguments — a
   * contract-and-token pair plus an `expiresAt` string — against a signature
   * with no such parameters.
   */
  async createTrade(params: CreateTradeParams): Promise<number> {
    return this.withRetry(async () => {
      if (
        !params ||
        typeof params !== 'object' ||
        typeof params.initiator !== 'string' ||
        !Array.isArray(params.offeredItems) ||
        !Array.isArray(params.requestedItems) ||
        typeof params.durationSeconds !== 'number' ||
        (params.counterparty !== undefined &&
          typeof params.counterparty !== 'string')
      ) {
        throw new BadRequestException('Invalid CreateTradeParams');
      }
      if (
        params.offeredItems.length === 0 &&
        params.requestedItems.length === 0
      ) {
        throw new BadRequestException(
          'A trade must offer or request at least one NFT',
        );
      }
      const args: SorobanContractArg[] = [
        { type: 'address', value: params.initiator },
        {
          type: 'scval',
          value: optionToScVal(
            params.counterparty
              ? Address.fromString(params.counterparty).toScVal()
              : undefined,
          ),
        },
        { type: 'scval', value: nftItemsToScVal(params.offeredItems) },
        { type: 'scval', value: nftItemsToScVal(params.requestedItems) },
        { type: 'u64', value: params.durationSeconds },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'create_trade',
        args,
      );
      return result.returnValue as number;
    });
  }

  async acceptTrade(tradeId: number, acceptor: string) {
    return this.withRetry(async () => {
      const args: SorobanContractArg[] = [
        { type: 'u64', value: tradeId },
        { type: 'address', value: acceptor },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'accept_trade',
        args,
      );
      return result.returnValue;
    });
  }

  async executeTrade(tradeId: number, executor: string) {
    return this.withRetry(async () => {
      const args: SorobanContractArg[] = [
        { type: 'u64', value: tradeId },
        { type: 'address', value: executor },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'execute_trade',
        args,
      );
      return result.returnValue;
    });
  }

  // Queries
  async getSale(txId: number): Promise<any> {
    return this.withRetry(async () => {
      const args: SorobanContractArg[] = [{ type: 'u64', value: txId }];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'get_sale',
        args,
      );
      return result.returnValue;
    });
  }

  async getAuction(auctionId: number): Promise<any> {
    return this.withRetry(async () => {
      const args: SorobanContractArg[] = [{ type: 'u64', value: auctionId }];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'get_auction',
        args,
      );
      return result.returnValue;
    });
  }

  async getAccumulatedFees(currency: string): Promise<any> {
    return this.withRetry(async () => {
      const args: SorobanContractArg[] = [
        { type: 'asset', value: this.resolveCurrency(currency) },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'get_accumulated_fees',
        args,
      );
      return result.returnValue;
    });
  }

  async getUserVolume(user: string): Promise<any> {
    return this.withRetry(async () => {
      const args: SorobanContractArg[] = [{ type: 'address', value: user }];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'get_user_volume',
        args,
      );
      return result.returnValue;
    });
  }

  /**
   * Fetch contract events emitted since a given ledger sequence via Soroban RPC.
   * Returns { events, latestLedger } so the caller can advance its cursor even
   * when no events are returned.
   */
  async getEventsSince(
    fromLedger: number,
  ): Promise<{ events: Record<string, unknown>[]; latestLedger: number }> {
    const startLedger = fromLedger > 0 ? fromLedger : undefined;
    const server = this.sorobanService.getRpcServer();

    const fetchStart = Date.now();
    this.logger.debug(
      `getEventsSince: fetching events from ledger=${fromLedger}`,
    );

    try {
      const response = await server.getEvents({
        startLedger,
        filters: [{ type: 'contract', contractIds: [this.contractId] }],
      });

      const latestLedger: number =
        (response as unknown as { latestLedger?: number }).latestLedger ??
        fromLedger;

      const events = (response.events ?? []).map(
        (e) => e as unknown as Record<string, unknown>,
      );

      this.logger.log(
        `getEventsSince: fromLedger=${fromLedger} latestLedger=${latestLedger} ` +
          `eventsCount=${events.length} durationMs=${Date.now() - fetchStart}`,
      );

      return { events, latestLedger };
    } catch (error) {
      this.handleContractError(error);
    }
  }

  /**
   * Build the Soroban transaction XDR for accepting a direct XLM offer on an NFT.
   * Returns the unsigned transaction XDR for the owner to sign and broadcast.
   */
  async acceptOffer(params: AcceptOfferParams): Promise<string> {
    return this.withRetry(async () => {
      if (
        !params ||
        typeof params !== 'object' ||
        typeof params.offerId !== 'string' ||
        typeof params.owner !== 'string' ||
        typeof params.bidder !== 'string' ||
        typeof params.nftContractId !== 'string' ||
        typeof params.nftTokenId !== 'string' ||
        typeof params.amount !== 'string' ||
        typeof params.currency !== 'string'
      ) {
        throw new BadRequestException('Invalid AcceptOfferParams');
      }
      const args: SorobanContractArg[] = [
        { type: 'string', value: params.offerId },
        { type: 'address', value: params.owner },
        { type: 'address', value: params.bidder },
        { type: 'string', value: params.nftContractId },
        { type: 'string', value: params.nftTokenId },
        { type: 'i128', value: params.amount },
        { type: 'string', value: params.currency },
      ];
      const result = await this.sorobanService.invokeContract(
        this.contractId,
        'accept_offer',
        args,
        { submit: false },
      );
      const tx = result.transaction as { transactionXdr?: string } | undefined;
      if (!tx?.transactionXdr) {
        // Returning '' masked the failure: callers treated an empty XDR as a
        // success and tried to sign/broadcast an empty transaction. Surface a
        // typed error instead so the caller can distinguish "simulation
        // failed" from a real transaction.
        throw new SorobanContractError(
          'accept_offer simulation completed but returned no transaction XDR',
        );
      }
      return tx.transactionXdr;
    });
  }
}
