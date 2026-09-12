import {
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
  Logger,
  type OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  StrKey,
  xdr,
} from 'stellar-sdk';
import { assetToScVal } from './scval.encoders';
import { Server as SorobanServer, assembleTransaction } from 'stellar-sdk/rpc';
import {
  calculateExponentialBackoffDelayMs,
  SorobanRpcService,
} from '../../services/soroban-rpc.service';
import {
  getStellarConfig,
  type StellarRuntimeConfig,
} from '../../config/stellar.config';

type SorobanArgType =
  | 'address'
  | 'i128'
  | 'u32'
  | 'u64'
  | 'string'
  | 'symbol'
  | 'bool'
  | 'bytes'
  | 'asset'
  | 'scval'
  | 'raw';

export type SorobanContractArg = {
  type?: SorobanArgType;
  value: unknown;
};

const I128_MIN = -(2n ** 127n);
const I128_MAX = 2n ** 127n - 1n;
const U32_MAX = 2n ** 32n - 1n;
const U64_MAX = 2n ** 64n - 1n;

/**
 * Validate an integer-like argument before conversion to an SCVal.
 * Raw BigInt(String(...)) calls throw untyped RangeErrors on malformed or
 * out-of-range input, which would surface as 500s; these fail fast with a
 * clear 400 instead.
 */
export function assertScValNumericRange(
  type: 'i128' | 'u32' | 'u64',
  raw: unknown,
): void {
  let value: bigint;
  try {
    value = BigInt(String(raw));
  } catch {
    throw new BadRequestException(
      `Invalid ${type} argument: expected an integer, got "${String(raw)}"`,
    );
  }

  if (type === 'i128' && (value < I128_MIN || value > I128_MAX)) {
    throw new BadRequestException(`i128 argument out of range: ${value}`);
  }
  if (type === 'u32' && (value < 0n || value > U32_MAX)) {
    throw new BadRequestException(`u32 argument out of range: ${value}`);
  }
  if (type === 'u64' && (value < 0n || value > U64_MAX)) {
    throw new BadRequestException(`u64 argument out of range: ${value}`);
  }
}

/**
 * Compare a configured operator public key with the key derived from the
 * operator secret.
 *
 * Transactions are built with the public key as source account but signed
 * with the secret. If the two belong to different keypairs, every submission
 * is rejected by the network with a signature error that looks like a
 * transient failure — a mismatch is therefore worth catching at boot.
 *
 * Returns a human-readable problem description, or null when the pair is
 * consistent (or when either value is absent, in which case there is nothing
 * to cross-check).
 */
export function describeOperatorKeyMismatch(
  publicKey?: string | null,
  secret?: string | null,
): string | null {
  if (!publicKey || !secret) {
    return null;
  }

  let derived: string;
  try {
    derived = Keypair.fromSecret(secret).publicKey();
  } catch {
    return 'STELLAR_OPERATOR_SECRET is not a valid Stellar secret key';
  }

  if (derived !== publicKey) {
    return (
      'STELLAR_OPERATOR_PUBLIC_KEY does not match the key derived from ' +
      'STELLAR_OPERATOR_SECRET; transactions would be signed by a different ' +
      'account than the one used as the transaction source'
    );
  }

  return null;
}

export type BuildTransactionResult = {
  transactionXdr: string;
  simulationResult: unknown;
};

export type SubmitTransactionResult = {
  hash: string;
  status: string;
  ledger?: number;
  result?: unknown;
};

export type InvokeContractResult = {
  transaction?: BuildTransactionResult;
  submission?: SubmitTransactionResult;
  returnValue?: unknown;
};

@Injectable()
export class SorobanService implements OnModuleInit {
  private readonly logger = new Logger(SorobanService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly sorobanRpcService: SorobanRpcService,
  ) {}

  /**
   * Validate the Soroban RPC configuration at startup and verify the endpoint
   * is reachable. Invalid configuration (malformed URL, or a missing URL in
   * production) throws here so the application fails fast with a clear error
   * instead of failing later with cryptic runtime errors on the first call.
   */
  async onModuleInit(): Promise<void> {
    let config: StellarRuntimeConfig;
    try {
      config = this.resolveStellarConfig();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid Stellar configuration';
      this.logger.error(`Stellar configuration is invalid: ${message}`);
      throw error;
    }

    this.logger.log(
      `Using Soroban RPC URL: ${config.sorobanRpcUrl} ` +
        `(network=${config.network}${config.sorobanRpcUrlIsFallback ? ', built-in default' : ''})`,
    );

    const nodeEnv = this.resolveNodeEnv();

    const operatorKeyProblem = describeOperatorKeyMismatch(
      this.configService.get<string>('STELLAR_OPERATOR_PUBLIC_KEY'),
      this.configService.get<string>('STELLAR_OPERATOR_SECRET'),
    );
    if (operatorKeyProblem) {
      this.logger.error(operatorKeyProblem);
      if (nodeEnv === 'production') {
        throw new ServiceUnavailableException(operatorKeyProblem);
      }
    }

    const looksLikeTestnet = config.sorobanRpcUrl.includes('testnet');

    if (nodeEnv === 'production' && looksLikeTestnet) {
      this.logger.warn(
        'SOROBAN_RPC_URL appears to point at a testnet endpoint while NODE_ENV=production. ' +
          'Verify this is intentional.',
      );
    }

    if (config.network === 'mainnet' && looksLikeTestnet) {
      this.logger.warn(
        `STELLAR_NETWORK=mainnet but SOROBAN_RPC_URL (${config.sorobanRpcUrl}) ` +
          'looks like a testnet endpoint.',
      );
    }

    // Skip the network round-trip during tests to keep the suite hermetic.
    if (nodeEnv === 'test') {
      return;
    }

    await this.checkRpcHealth(config);
  }

  /**
   * Probe the configured RPC endpoint so an unreachable URL is surfaced at
   * startup rather than on the first contract call. A failed probe is logged
   * but does not crash the app, since transient RPC outages should not make the
   * whole service un-startable.
   */
  private async checkRpcHealth(config: StellarRuntimeConfig): Promise<void> {
    const timeoutMs = config.defaultTimeoutMs;
    try {
      const server = new SorobanServer(config.sorobanRpcUrl);
      const health = await this.withTimeout(
        server.getHealth(),
        timeoutMs,
        'Soroban RPC health check',
      );
      this.logger.log(
        `Soroban RPC health check passed: status=${health?.status ?? 'unknown'}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(
        `Soroban RPC health check failed for ${config.sorobanRpcUrl}: ${message}. ` +
          'Contract calls may fail until the endpoint is reachable.',
      );
    }
  }

  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    label: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  private resolveNodeEnv(): string | undefined {
    return this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
  }

  /**
   * Resolve the validated, normalized Stellar runtime config, preferring values
   * from ConfigService and falling back to process.env.
   */
  private resolveStellarConfig(): StellarRuntimeConfig {
    return getStellarConfig({
      ...process.env,
      NODE_ENV: this.resolveNodeEnv(),
      STELLAR_NETWORK:
        this.configService.get<string>('STELLAR_NETWORK') ??
        process.env.STELLAR_NETWORK,
      SOROBAN_RPC_URL:
        this.configService.get<string>('SOROBAN_RPC_URL') ??
        process.env.SOROBAN_RPC_URL,
    });
  }

  async invokeContract(
    contractId: string,
    method: string,
    args: SorobanContractArg[] = [],
    options?: {
      sourceAccount?: string;
      signature?: string;
      submit?: boolean;
    },
  ): Promise<InvokeContractResult> {
    this.ensureValidContractAddress(contractId);
    this.logger.log(
      `Audit contract invoke: contract=${contractId} method=${method} submit=${Boolean(options?.submit)}`,
    );

    const tx = await this.buildTransaction(
      contractId,
      method,
      args,
      options?.sourceAccount,
    );

    if (options?.submit) {
      const submission = await this.submitTransaction(tx, options.signature);
      return {
        transaction: tx,
        submission,
      };
    }

    return {
      transaction: tx,
      returnValue: this.extractSimulationReturnValue(tx.simulationResult),
    };
  }

  async buildTransaction(
    contractId: string,
    method: string,
    args: SorobanContractArg[] = [],
    sourceAccount?: string,
  ): Promise<BuildTransactionResult> {
    this.ensureValidContractAddress(contractId);
    const source =
      sourceAccount ||
      this.configService.get<string>('STELLAR_OPERATOR_PUBLIC_KEY');

    if (!source || !StrKey.isValidEd25519PublicKey(source)) {
      throw new ServiceUnavailableException(
        'Missing or invalid STELLAR_OPERATOR_PUBLIC_KEY for transaction building',
      );
    }

    const server = this.createRpcServer();
    const networkPassphrase = this.getNetworkPassphrase();
    const timeoutSeconds = this.getTransactionTimeoutSeconds();

    try {
      const account = await this.withRpcRetry('getAccount', () =>
        server.getAccount(source),
      );
      const contract = new Contract(contractId);
      const operation = contract.call(
        method,
        ...args.map((arg) => this.toScVal(arg)),
      );

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(timeoutSeconds)
        .build();

      const simulationResult = await this.withRpcRetry(
        'simulateTransaction',
        () => server.simulateTransaction(tx),
      );

      if ('error' in (simulationResult as { error?: string })) {
        throw new BadRequestException(
          `Soroban simulation failed: ${(simulationResult as { error?: string }).error || 'unknown error'}`,
        );
      }

      this.logger.log(
        `Audit tx built: contract=${contractId} method=${method} source=${source}`,
      );

      return {
        transactionXdr: tx.toXDR(),
        simulationResult,
      };
    } catch (error) {
      throw this.mapSorobanError(error);
    }
  }

  async submitTransaction(
    tx: BuildTransactionResult,
    signature?: string,
  ): Promise<SubmitTransactionResult> {
    const signer =
      signature || this.configService.get<string>('STELLAR_OPERATOR_SECRET');
    if (!signer) {
      throw new ServiceUnavailableException(
        'No transaction signer provided. Configure STELLAR_OPERATOR_SECRET or pass signature.',
      );
    }

    try {
      const server = this.createRpcServer();
      const networkPassphrase = this.getNetworkPassphrase();
      const keypair = Keypair.fromSecret(signer);

      const unsignedTx = TransactionBuilder.fromXDR(
        tx.transactionXdr,
        networkPassphrase,
      ) as Transaction;

      const assembled = assembleTransaction(
        unsignedTx,
        tx.simulationResult as never,
      ).build();

      assembled.sign(keypair);
      const sendResult = await this.withRpcRetry('sendTransaction', () =>
        server.sendTransaction(assembled),
      );

      if (sendResult.status === 'ERROR') {
        throw new BadRequestException(
          `Soroban submission error: ${JSON.stringify(sendResult.errorResult ?? {})}`,
        );
      }

      const finalized = await this.pollTransactionResult(
        server,
        sendResult.hash,
      );

      this.logger.log(
        `Audit tx submitted: hash=${sendResult.hash} status=${finalized.status}`,
      );

      return finalized;
    } catch (error) {
      throw this.mapSorobanError(error);
    }
  }

  ensureValidAccountAddress(address: string): void {
    if (!StrKey.isValidEd25519PublicKey(address)) {
      throw new BadRequestException(
        `Invalid Stellar account address: ${address}`,
      );
    }
  }

  ensureValidContractAddress(address: string): void {
    try {
      Address.fromString(address);
    } catch {
      throw new BadRequestException(
        `Invalid Stellar contract address: ${address}`,
      );
    }
  }

  getRpcServer(): SorobanServer {
    return this.createRpcServer();
  }

  private createRpcServer(): SorobanServer {
    // Route through the validated config so the URL is checked and normalized
    // (trailing slashes removed, protocol validated) before each use.
    const { sorobanRpcUrl } = this.resolveStellarConfig();
    return new SorobanServer(sorobanRpcUrl);
  }

  private getNetworkPassphrase(): string {
    const network =
      this.configService.get<string>('STELLAR_NETWORK') || 'TESTNET';

    if (network.toUpperCase() === 'MAINNET') {
      return Networks.PUBLIC;
    }

    return Networks.TESTNET;
  }

  private getTransactionTimeoutSeconds(): number {
    const raw =
      this.configService.get<string>('TRANSACTION_TIMEOUT_SECONDS') || '60';
    const timeout = Number.parseInt(raw, 10);

    return Number.isFinite(timeout) && timeout > 0 ? timeout : 60;
  }

  private toScVal(arg: SorobanContractArg) {
    const type = arg.type || 'raw';

    if (type === 'address') {
      if (typeof arg.value !== 'string') {
        throw new BadRequestException('Address argument must be a string');
      }
      return Address.fromString(arg.value).toScVal();
    }

    if (type === 'i128') {
      assertScValNumericRange('i128', arg.value);
      return nativeToScVal(BigInt(String(arg.value)), { type: 'i128' });
    }

    if (type === 'u32') {
      assertScValNumericRange('u32', arg.value);
      return nativeToScVal(Number(arg.value), { type: 'u32' });
    }

    if (type === 'u64') {
      assertScValNumericRange('u64', arg.value);
      return nativeToScVal(BigInt(String(arg.value)), { type: 'u64' });
    }

    if (type === 'string') {
      return nativeToScVal(String(arg.value), { type: 'string' });
    }

    if (type === 'symbol') {
      return nativeToScVal(String(arg.value), { type: 'symbol' });
    }

    if (type === 'bool') {
      return nativeToScVal(Boolean(arg.value), { type: 'bool' });
    }

    if (type === 'bytes') {
      return nativeToScVal(Buffer.from(String(arg.value)), { type: 'bytes' });
    }

    // Composite types the contract declares as `#[contracttype]` structs,
    // options, vectors and enums. `nativeToScVal` cannot infer those shapes,
    // so callers build the ScVal through `scval.encoders` and pass it here.
    if (type === 'asset') {
      const asset = arg.value as { contract?: unknown; symbol?: unknown };
      if (
        !asset ||
        typeof asset !== 'object' ||
        typeof asset.contract !== 'string' ||
        typeof asset.symbol !== 'string'
      ) {
        throw new BadRequestException(
          'Asset argument must be an object with string `contract` and `symbol`',
        );
      }
      return assetToScVal({ contract: asset.contract, symbol: asset.symbol });
    }

    if (type === 'scval') {
      if (!(arg.value instanceof xdr.ScVal)) {
        throw new BadRequestException(
          'scval argument must already be an xdr.ScVal',
        );
      }
      return arg.value;
    }

    return nativeToScVal(arg.value);
  }

  private extractSimulationReturnValue(simulationResult: unknown): unknown {
    const maybeResult = simulationResult as {
      result?: {
        retval?: unknown;
      };
    };

    const retval = maybeResult?.result?.retval;
    if (!retval) {
      return null;
    }

    try {
      return scValToNative(retval as never);
    } catch {
      return retval;
    }
  }

  private async pollTransactionResult(
    server: SorobanServer,
    hash: string,
  ): Promise<SubmitTransactionResult> {
    const retryConfig = this.sorobanRpcService.getRuntimeConfig();
    const maxPollAttempts = 10;

    for (let i = 0; i < maxPollAttempts; i += 1) {
      if (i > 0) {
        const pollDelayMs = calculateExponentialBackoffDelayMs(
          i,
          retryConfig.sorobanRpcRetryDelayMs,
          retryConfig.sorobanRpcRetryBackoffMultiplier,
          retryConfig.sorobanRpcRetryMaxDelayMs,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, pollDelayMs));
      }

      const txResult = (await this.withRpcRetry('getTransaction', () =>
        server.getTransaction(hash),
      )) as {
        status?: string;
        ledger?: number;
        returnValue?: unknown;
      };

      if (!txResult?.status || txResult.status === 'NOT_FOUND') {
        continue;
      }

      if (txResult.status === 'FAILED') {
        throw new BadRequestException(`Soroban transaction failed: ${hash}`);
      }

      if (txResult.status === 'SUCCESS') {
        return {
          hash,
          status: txResult.status,
          ledger: txResult.ledger,
          result: txResult.returnValue,
        };
      }
    }

    throw new GatewayTimeoutException(
      `Timed out waiting for transaction finalization: ${hash}`,
    );
  }

  private withRpcRetry<T>(
    methodName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.sorobanRpcService.retryRpcCall(operation, methodName);
  }

  private mapSorobanError(error: unknown): Error {
    if (error instanceof Error && 'getStatus' in error) {
      return error;
    }

    const message =
      (error as { message?: string })?.message || 'Unknown Soroban error';
    const normalized = message.toLowerCase();

    if (normalized.includes('timeout') || normalized.includes('timed out')) {
      return new GatewayTimeoutException(message);
    }

    if (
      normalized.includes('bad sequence') ||
      normalized.includes('tx_bad_seq')
    ) {
      return new ConflictException(message);
    }

    if (
      normalized.includes('insufficient') ||
      normalized.includes('invalid') ||
      normalized.includes('simulation failed')
    ) {
      return new BadRequestException(message);
    }

    if (
      normalized.includes('unavailable') ||
      normalized.includes('network error') ||
      normalized.includes('fetch failed')
    ) {
      return new ServiceUnavailableException(message);
    }

    this.logger.error(`Unhandled Soroban error: ${message}`);
    return new InternalServerErrorException(message);
  }
}
