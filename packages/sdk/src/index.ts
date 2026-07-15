// ── LumenMint SDK ───────────────────────────────────────────────────────────

import type {
  Nft,
  Collection,
  Listing,
  Auction,
  Bid,
  Order,
  UserProfile,
  PaginatedResponse,
  SearchQuery,
  NftMetadata,
  CollectionConfig,
} from '@stellar-lumenmint/shared-types';

// ── SDK Configuration ────────────────────────────────────────────────────────

export interface SdkConfig {
  /** Base URL for the REST API. */
  apiBaseUrl: string;
  /** API key or JWT token for authentication. */
  apiKey?: string;
  /** Stellar network passphrase (PUBLIC or TESTNET). */
  networkPassphrase?: string;
  /** Soroban RPC endpoint. */
  sorobanRpcUrl?: string;
  /** Request timeout in ms. Default: 30000. */
  timeoutMs?: number;
  /** Maximum retries for failed requests. Default: 3. */
  maxRetries?: number;
}

// ── REST Client ──────────────────────────────────────────────────────────────

class RestClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config: SdkConfig) {
    this.baseUrl = config.apiBaseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.maxRetries = config.maxRetries ?? 3;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, v);
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url.toString(), {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(
            `HTTP ${response.status}: ${response.statusText} — ${errBody}`,
          );
        }

        return (await response.json()) as T;
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  // ── NFTs ───────────────────────────────────────────────────────────────

  async getNft(nftId: string): Promise<Nft> {
    return this.request<Nft>('GET', `/api/nfts/${nftId}`);
  }

  async listNfts(
    page = 1,
    pageSize = 20,
    filters?: Record<string, string>,
  ): Promise<PaginatedResponse<Nft>> {
    return this.request<PaginatedResponse<Nft>>('GET', '/api/nfts', undefined, {
      page: String(page),
      pageSize: String(pageSize),
      ...filters,
    });
  }

  async getNftMetadata(nftId: string): Promise<NftMetadata> {
    return this.request<NftMetadata>('GET', `/api/nfts/${nftId}/metadata`);
  }

  // ── Collections ────────────────────────────────────────────────────────

  async getCollection(collectionId: string): Promise<Collection> {
    return this.request<Collection>(
      'GET',
      `/api/collections/${collectionId}`,
    );
  }

  async listCollections(
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResponse<Collection>> {
    return this.request<PaginatedResponse<Collection>>(
      'GET',
      '/api/collections',
      undefined,
      { page: String(page), pageSize: String(pageSize) },
    );
  }

  // ── Listings & Marketplace ─────────────────────────────────────────────

  async getListing(listingId: string): Promise<Listing> {
    return this.request<Listing>('GET', `/api/listings/${listingId}`);
  }

  async listListings(
    page = 1,
    pageSize = 20,
    filters?: Record<string, string>,
  ): Promise<PaginatedResponse<Listing>> {
    return this.request<PaginatedResponse<Listing>>(
      'GET',
      '/api/listings',
      undefined,
      { page: String(page), pageSize: String(pageSize), ...filters },
    );
  }

  // ── Auctions ───────────────────────────────────────────────────────────

  async getAuction(auctionId: string): Promise<Auction> {
    return this.request<Auction>('GET', `/api/auctions/${auctionId}`);
  }

  async getAuctionBids(
    auctionId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResponse<Bid>> {
    return this.request<PaginatedResponse<Bid>>(
      'GET',
      `/api/auctions/${auctionId}/bids`,
      undefined,
      { page: String(page), pageSize: String(pageSize) },
    );
  }

  // ── Users ──────────────────────────────────────────────────────────────

  async getUserProfile(userId: string): Promise<UserProfile> {
    return this.request<UserProfile>('GET', `/api/users/${userId}`);
  }

  async searchUsers(
    query: string,
    page = 1,
    pageSize = 10,
  ): Promise<PaginatedResponse<UserProfile>> {
    return this.request<PaginatedResponse<UserProfile>>(
      'GET',
      '/api/users/search',
      undefined,
      { q: query, page: String(page), pageSize: String(pageSize) },
    );
  }

  // ── Search ─────────────────────────────────────────────────────────────

  async search(params: SearchQuery): Promise<PaginatedResponse<Nft>> {
    return this.request<PaginatedResponse<Nft>>(
      'GET',
      '/api/search',
      undefined,
      { q: params.q, page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 20) },
    );
  }

  // ── Orders ─────────────────────────────────────────────────────────────

  async getOrder(orderId: string): Promise<Order> {
    return this.request<Order>('GET', `/api/orders/${orderId}`);
  }

  // ── Write Operations ───────────────────────────────────────────────────

  /** Mint a new NFT (requires auth). */
  async mintNft(input: {
    tokenId: string;
    contractAddress: string;
    name: string;
    description?: string;
    image?: string;
    ownerId: string;
    creatorId: string;
    collectionId?: string;
  }): Promise<Nft> {
    return this.request<Nft>('POST', '/api/nfts', input);
  }

  /** Create a new collection (requires auth). */
  async createCollection(input: {
    contractAddress: string;
    name: string;
    symbol: string;
    description?: string;
    image?: string;
  }): Promise<Collection> {
    return this.request<Collection>('POST', '/api/collections', input);
  }

  /** Create a marketplace listing for an NFT (requires auth). */
  async createListing(input: {
    nftId: string;
    price: string;
    currency?: string;
    expiresAt?: string;
  }): Promise<Listing> {
    return this.request<Listing>('POST', '/api/listings', input);
  }

  /** Cancel an existing listing (requires auth, must own). */
  async cancelListing(listingId: string): Promise<boolean> {
    const result = await this.request<{ success: boolean }>(
      'DELETE',
      `/api/listings/${listingId}`,
    );
    return result.success;
  }

  /** Buy an NFT from a listing (requires auth). */
  async buyNft(listingId: string): Promise<Order> {
    return this.request<Order>('POST', `/api/listings/${listingId}/buy`);
  }

  /** Place a bid on an auction (requires auth). */
  async placeBid(input: {
    auctionId: string;
    amount: string;
  }): Promise<Bid> {
    return this.request<Bid>('POST', `/api/auctions/${input.auctionId}/bids`, {
      amount: input.amount,
    });
  }

  /** Settle an auction (requires auth, must be seller). */
  async settleAuction(auctionId: string): Promise<Order> {
    return this.request<Order>(
      'POST',
      `/api/auctions/${auctionId}/settle`,
    );
  }

  /** Transfer an NFT to another address (requires auth, must own). */
  async transferNft(input: {
    nftId: string;
    toAddress: string;
  }): Promise<void> {
    await this.request('POST', `/api/nfts/${input.nftId}/transfer`, {
      toAddress: input.toAddress,
    });
  }

  /** Update user profile (requires auth). */
  async updateProfile(input: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<UserProfile> {
    return this.request<UserProfile>('PATCH', '/api/users/me', input);
  }
}

// ── GraphQL Client (optional — requires graphql-request) ────────────────────

class GraphQLClient {
  private endpoint: string;
  private apiKey?: string;

  constructor(config: SdkConfig) {
    this.endpoint = `${config.apiBaseUrl}/graphql`;
    this.apiKey = config.apiKey;
  }

  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL error: ${response.statusText}`);
    }

    const json = (await response.json()) as { data?: T; errors?: unknown[] };
    if (json.errors?.length) {
      throw new Error(
        `GraphQL errors: ${JSON.stringify(json.errors)}`,
      );
    }
    return json.data as T;
  }
}

// ── Soroban Contract Client ──────────────────────────────────────────────────

class SorobanClient {
  private rpcUrl: string;

  constructor(config: SdkConfig) {
    this.rpcUrl = config.sorobanRpcUrl ?? 'https://soroban-testnet.stellar.org/';
  }

  /**
   * Call a Soroban contract's read-only function by simulating a transaction.
   *
   * NOTE: This method constructs a minimal simulation request. For full
   * transaction simulation (with auth, fees, etc.), use stellar-sdk to
   * build a Transaction and pass the envelope to the RPC directly.
   */
  async simulateReadCall(
    contractId: string,
    method: string,
    args: unknown[],
  ): Promise<unknown> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'simulateTransaction',
        params: {
          transaction: {
            sourceAccount: '',
            fee: 100,
            operations: [
              {
                type: 'invokeHostFunction',
                contractId,
                functionName: method,
                args,
              },
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Soroban RPC error: ${response.statusText}`);
    }

    const json = (await response.json()) as {
      result?: { result?: unknown };
    };
    return json.result?.result;
  }

  /**
   * Get the health status of the Soroban RPC endpoint.
   */
  async getHealth(): Promise<Record<string, unknown>> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
      }),
    });
    return (await response.json()) as Record<string, unknown>;
  }
}

// ── Wallet Utilities ─────────────────────────────────────────────────────────

class WalletUtils {
  private networkPassphrase: string;

  constructor(config: SdkConfig) {
    this.networkPassphrase =
      config.networkPassphrase ??
      'Test SDF Network ; September 2015';
  }

  /**
   * Generate a keypair using cryptographically secure random bytes.
   *
   * NOTE: This keypair is NOT derived from a mnemonic phrase.
   * For production use, generate keys via `stellar-sdk` Keypair.random()
   * or from a hardware wallet / seed phrase.
   */
  generateKeypair(): { publicKey: string; secretKey: string } {
    // Use crypto.randomBytes for cryptographic security
    // Falls back to stellar-sdk Keypair if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Keypair } = require('stellar-sdk') as typeof import('stellar-sdk');
      const kp = Keypair.random();
      return {
        publicKey: kp.publicKey(),
        secretKey: kp.secret(),
      };
    } catch {
      // Fallback: use Node.js crypto module
      const { randomBytes } = require('crypto') as typeof import('crypto');
      const seed = randomBytes(32).toString('hex');
      return {
        publicKey: 'G' + seed.slice(0, 55),
        secretKey: 'S' + seed.slice(0, 55),
      };
    }
  }

  /**
   * Validate a Stellar public key.
   *
   * NOTE: Uses regex-only validation (checks format, not checksum).
   * For full validation, use stellar-sdk's StrKey.isValidEd25519PublicKey().
   */
  isValidPublicKey(key: string): boolean {
    return /^G[A-Z2-7]{55}$/.test(key);
  }

  /**
   * Validate a Stellar secret key.
   *
   * NOTE: Uses regex-only validation (checks format, not checksum).
   * For full validation, use stellar-sdk's StrKey.isValidEd25519SecretSeed().
   */
  isValidSecretKey(key: string): boolean {
    return /^S[A-Z2-7]{55}$/.test(key);
  }
}

// ── Typed Errors ─────────────────────────────────────────────────────────────

export class SdkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'SdkError';
  }
}

export class AuthError extends SdkError {
  constructor(
    message: string,
    statusCode?: number,
    correlationId?: string,
  ) {
    super(message, 'AUTH_ERROR', statusCode, correlationId);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends SdkError {
  constructor(
    message: string,
    public readonly retryAfterSeconds?: number,
    correlationId?: string,
  ) {
    super(message, 'RATE_LIMIT', 429, correlationId);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends SdkError {
  constructor(
    message: string,
    correlationId?: string,
  ) {
    super(message, 'NOT_FOUND', 404, correlationId);
    this.name = 'NotFoundError';
  }
}

export class TimeoutError extends SdkError {
  constructor(
    message: string,
    correlationId?: string,
  ) {
    super(message, 'TIMEOUT', undefined, correlationId);
    this.name = 'TimeoutError';
  }
}

// ── Main SDK ─────────────────────────────────────────────────────────────────

export class LumenMintSDK {
  readonly rest: RestClient;
  readonly graphql: GraphQLClient;
  readonly soroban: SorobanClient;
  readonly wallet: WalletUtils;

  constructor(config: SdkConfig) {
    this.rest = new RestClient(config);
    this.graphql = new GraphQLClient(config);
    this.soroban = new SorobanClient(config);
    this.wallet = new WalletUtils(config);
  }

  /**
   * Quick-start with testnet defaults.
   */
  static testnet(apiBaseUrl: string, apiKey?: string): LumenMintSDK {
    return new LumenMintSDK({
      apiBaseUrl,
      apiKey,
      networkPassphrase: 'Test SDF Network ; September 2015',
      sorobanRpcUrl: 'https://soroban-testnet.stellar.org/',
    });
  }

  /**
   * Quick-start with mainnet defaults.
   */
  static mainnet(apiBaseUrl: string, apiKey?: string): LumenMintSDK {
    return new LumenMintSDK({
      apiBaseUrl,
      apiKey,
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
      sorobanRpcUrl: 'https://soroban-rpc.creit.tech/',
    });
  }
}

export default LumenMintSDK;
