// ── SDK Integration Tests ────────────────────────────────────────────────────

import { LumenMintSDK, SdkError } from './index';
import type { Nft, Collection, Listing, Auction, Bid, Order, UserProfile } from '@stellar-lumenmint/shared-types';

// ── Mock Setup ────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockResponse(status: number, body: unknown, headers?: Record<string, string>) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : status === 401 ? 'Unauthorized' : status === 429 ? 'Too Many Requests' : status >= 500 ? 'Internal Server Error' : 'OK',
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(headers),
  });
}

function getLastFetchCall() {
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1] as [string, RequestInit | undefined];
}

const API_URL = 'https://api.example.com';
const API_KEY = 'sk-test-key-123';

describe('LumenMintSDK', () => {
  let sdk: LumenMintSDK;

  beforeEach(() => {
    jest.clearAllMocks();
    sdk = new LumenMintSDK({
      apiBaseUrl: API_URL,
      apiKey: API_KEY,
      maxRetries: 0, // disable retries for deterministic tests
    });
  });

  // ── Write Operations: Correct URL, Method, Body, Headers ──────────────

  describe('Write Operations', () => {
    // ── mintNft ──────────────────────────────────────────────────────────

    describe('mintNft', () => {
      it('should POST to /api/nfts with correct body and auth header', async () => {
        const mockNft: Nft = { id: 'nft-1', contractId: 'C', tokenId: '1', owner: 'G..', creator: 'G..', metadataUri: '', royaltyPercentage: 500, royaltyRecipient: 'G..', createdAt: new Date().toISOString(), transferCount: 0, lastTransferAt: '', isListed: false };
        mockResponse(201, mockNft);

        await sdk.rest.mintNft({
          tokenId: '1',
          contractAddress: 'CBASE...',
          name: 'Test NFT',
          description: 'A test',
          ownerId: 'user-1',
          creatorId: 'user-1',
        });

        const [url, init] = getLastFetchCall();
        expect(url).toBe(`${API_URL}/api/nfts`);
        expect(init?.method).toBe('POST');
        expect(init?.headers).toEqual({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        });

        const body = JSON.parse(init?.body as string);
        expect(body.name).toBe('Test NFT');
        expect(body.contractAddress).toBe('CBASE...');
      });
    });

    // ── createCollection ─────────────────────────────────────────────────

    describe('createCollection', () => {
      it('should POST to /api/collections with correct body', async () => {
        const mockCollection: Collection = { id: 'col-1', contractId: 'C', name: 'My Collection', symbol: 'MYC', creatorAddress: 'G..', totalSupply: 0, isVerified: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        mockResponse(201, mockCollection);

        await sdk.rest.createCollection({
          contractAddress: 'CBASE...',
          name: 'My Collection',
          symbol: 'MYC',
        });

        const [url, init] = getLastFetchCall();
        expect(url).toBe(`${API_URL}/api/collections`);
        expect(init?.method).toBe('POST');
        const body = JSON.parse(init?.body as string);
        expect(body.name).toBe('My Collection');
        expect(body.symbol).toBe('MYC');
      });
    });

    // ── createListing ────────────────────────────────────────────────────

    describe('createListing', () => {
      it('should POST to /api/listings with price and nftId', async () => {
        const mockListing: Listing = { id: 'list-1', nftId: 'nft-1', sellerAddress: 'G..', type: 'fixed_price', status: 'active', price: '100', currency: 'XLM', startDate: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        mockResponse(201, mockListing);

        await sdk.rest.createListing({
          nftId: 'nft-1',
          price: '100',
          currency: 'XLM',
        });

        const [url, init] = getLastFetchCall();
        expect(url).toBe(`${API_URL}/api/listings`);
        expect(init?.method).toBe('POST');
        const body = JSON.parse(init?.body as string);
        expect(body.nftId).toBe('nft-1');
        expect(body.price).toBe('100');
      });
    });

    // ── cancelListing ────────────────────────────────────────────────────

    describe('cancelListing', () => {
      it('should DELETE /api/listings/:id', async () => {
        mockResponse(200, { success: true });

        const result = await sdk.rest.cancelListing('list-42');

        const [url, init] = getLastFetchCall();
        expect(url).toBe(`${API_URL}/api/listings/list-42`);
        expect(init?.method).toBe('DELETE');
        expect(result).toBe(true);
      });
    });

    // ── buyNft ───────────────────────────────────────────────────────────

    describe('buyNft', () => {
      it('should POST to /api/listings/:id/buy', async () => {
        const mockOrder: Order = { id: 'order-1', buyerAddress: 'G..buyer', sellerAddress: 'G..seller', nftId: 'nft-1', price: '100', currency: 'XLM', platformFee: '2.5', royaltyFee: '5', sellerPayout: '92.5', status: 'confirmed', createdAt: new Date().toISOString() };
        mockResponse(200, mockOrder);

        const result = await sdk.rest.buyNft('list-1');

        const [url, init] = getLastFetchCall();
        expect(url).toBe(`${API_URL}/api/listings/list-1/buy`);
        expect(init?.method).toBe('POST');
        expect(result.id).toBe('order-1');
        expect(result.status).toBe('confirmed');
      });
    });

    // ── placeBid ─────────────────────────────────────────────────────────

    describe('placeBid', () => {
      it('should POST to /api/auctions/:id/bids with amount', async () => {
        const mockBid: Bid = { id: 'bid-1', auctionId: 'auc-1', bidderAddress: 'G..', amount: '50', currency: 'XLM', status: 'confirmed', createdAt: new Date().toISOString() };
        mockResponse(201, mockBid);

        await sdk.rest.placeBid({ auctionId: 'auc-1', amount: '50' });

        const [url, init] = getLastFetchCall();
        expect(url).toBe(`${API_URL}/api/auctions/auc-1/bids`);
        expect(init?.method).toBe('POST');
        const body = JSON.parse(init?.body as string);
        expect(body.amount).toBe('50');
      });
    });

    // ── settleAuction ────────────────────────────────────────────────────

    describe('settleAuction', () => {
      it('should POST to /api/auctions/:id/settle', async () => {
        const mockOrder: Order = { id: 'order-1', buyerAddress: 'G..', sellerAddress: 'G..', nftId: 'nft-1', price: '200', currency: 'XLM', platformFee: '5', royaltyFee: '10', sellerPayout: '185', status: 'confirmed', createdAt: new Date().toISOString() };
        mockResponse(200, mockOrder);

        const result = await sdk.rest.settleAuction('auc-1');

        const [url, init] = getLastFetchCall();
        expect(url).toBe(`${API_URL}/api/auctions/auc-1/settle`);
        expect(init?.method).toBe('POST');
        expect(result.status).toBe('confirmed');
      });
    });

    // ── transferNft ──────────────────────────────────────────────────────

    describe('transferNft', () => {
      it('should POST to /api/nfts/:id/transfer with toAddress', async () => {
        mockResponse(200, { success: true });

        await sdk.rest.transferNft({ nftId: 'nft-1', toAddress: 'GDEST...' });

        const [url, init] = getLastFetchCall();
        expect(url).toBe(`${API_URL}/api/nfts/nft-1/transfer`);
        expect(init?.method).toBe('POST');
        const body = JSON.parse(init?.body as string);
        expect(body.toAddress).toBe('GDEST...');
      });
    });

    // ── updateProfile ────────────────────────────────────────────────────

    describe('updateProfile', () => {
      it('should PATCH /api/users/me with profile fields', async () => {
        const mockProfile: UserProfile = { id: 'user-1', username: 'alice', displayName: 'Alice B', isVerified: false, createdAt: new Date().toISOString() };
        mockResponse(200, mockProfile);

        await sdk.rest.updateProfile({ displayName: 'Alice B', bio: 'NFT creator' });

        const [url, init] = getLastFetchCall();
        expect(url).toBe(`${API_URL}/api/users/me`);
        expect(init?.method).toBe('PATCH');
        const body = JSON.parse(init?.body as string);
        expect(body.displayName).toBe('Alice B');
      });
    });
  });

  // ── Error Handling ─────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should throw on 401 Unauthorized', async () => {
      mockResponse(401, { code: 'AUTH_ERROR', message: 'Invalid token' });

      await expect(sdk.rest.mintNft({
        tokenId: '1', contractAddress: 'C', name: 'X', ownerId: 'u', creatorId: 'u',
      })).rejects.toThrow(/HTTP 401/);
    });

    it('should throw on 404 Not Found', async () => {
      mockResponse(404, { code: 'NOT_FOUND', message: 'NFT not found' });

      await expect(sdk.rest.getNft('nonexistent')).rejects.toThrow(/404/);
    });

    it('should throw on 429 Rate Limited', async () => {
      mockResponse(429, { code: 'RATE_LIMIT', message: 'Too many requests' });

      await expect(sdk.rest.getNft('nft-1')).rejects.toThrow(/429/);
    });

    it('should throw on 500 Internal Server Error', async () => {
      mockResponse(500, { code: 'INTERNAL', message: 'Server error' });

      await expect(sdk.rest.getNft('nft-1')).rejects.toThrow(/500/);
    });
  });

  // ── Retry Behavior ─────────────────────────────────────────────────────

  describe('Retry Behavior', () => {
    it('should retry on failure and succeed eventually', async () => {
      const retrySdk = new LumenMintSDK({
        apiBaseUrl: API_URL,
        maxRetries: 2,
      });

      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ id: 'nft-1', tokenId: '1', contractId: 'C', owner: 'G..', creator: 'G..', metadataUri: '', royaltyPercentage: 500, royaltyRecipient: 'G..', createdAt: new Date().toISOString(), transferCount: 0, lastTransferAt: '', isListed: false } as Nft),
          text: async () => '{}',
          headers: new Headers(),
        });

      const result = await retrySdk.rest.getNft('nft-1');
      expect(result.id).toBe('nft-1');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw after exhausting all retries', async () => {
      const retrySdk = new LumenMintSDK({
        apiBaseUrl: API_URL,
        maxRetries: 2,
      });

      mockFetch
        .mockRejectedValue(new Error('persistent failure'));

      await expect(retrySdk.rest.getNft('nft-1')).rejects.toThrow('persistent failure');
      // 1 initial + 2 retries = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  // ── Timeout ────────────────────────────────────────────────────────────

  describe('Timeout', () => {
    it('should abort after timeout', async () => {
      const timeoutSdk = new LumenMintSDK({
        apiBaseUrl: API_URL,
        timeoutMs: 10,
        maxRetries: 0,
      });

      // Simulate a slow response that never resolves within timeout
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_resolve) => {
          // Never resolve — timeout should trigger abort
        });
      });

      await expect(timeoutSdk.rest.getNft('nft-1')).rejects.toThrow(/abort/i);
    });
  });

  // ── Authorization ──────────────────────────────────────────────────────

  describe('Authorization Header', () => {
    it('should include Bearer token when apiKey is set', async () => {
      mockResponse(200, { id: 'nft-1', tokenId: '1', contractId: 'C', owner: 'G..', creator: 'G..', metadataUri: '', royaltyPercentage: 500, royaltyRecipient: 'G..', createdAt: new Date().toISOString(), transferCount: 0, lastTransferAt: '', isListed: false });
      await sdk.rest.getNft('nft-1');

      const [, init] = getLastFetchCall();
      expect(init?.headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      });
    });

    it('should omit Authorization header when apiKey is not set', async () => {
      const noAuthSdk = new LumenMintSDK({ apiBaseUrl: API_URL, maxRetries: 0 });
      mockResponse(200, { id: 'n-1', tokenId: '1', contractId: 'C', owner: 'G..', creator: 'G..', metadataUri: '', royaltyPercentage: 500, royaltyRecipient: 'G..', createdAt: new Date().toISOString(), transferCount: 0, lastTransferAt: '', isListed: false });

      await noAuthSdk.rest.getNft('nft-1');

      const [, init] = getLastFetchCall();
      expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    });
  });

  // ── Pagination ─────────────────────────────────────────────────────────

  describe('Pagination', () => {
    it('should append page and pageSize query params', async () => {
      mockResponse(200, { data: [], total: 0, page: 2, pageSize: 10, hasNextPage: false });

      await sdk.rest.listNfts(2, 10);

      const [url] = getLastFetchCall();
      expect(url).toContain('page=2');
      expect(url).toContain('pageSize=10');
    });

    it('should include filter params in URL', async () => {
      mockResponse(200, { data: [], total: 0, page: 1, pageSize: 20, hasNextPage: false });

      await sdk.rest.listNfts(1, 20, { collectionId: 'col-1', onSale: 'true' });

      const [url] = getLastFetchCall();
      expect(url).toContain('collectionId=col-1');
      expect(url).toContain('onSale=true');
    });
  });

  // ── Factory Methods ────────────────────────────────────────────────────

  describe('factory methods', () => {
    it('testnet() should configure testnet defaults', () => {
      const testSdk = LumenMintSDK.testnet('https://test.api.com', 'key-1');
      expect(testSdk).toBeInstanceOf(LumenMintSDK);
    });

    it('mainnet() should configure mainnet defaults', () => {
      const mainSdk = LumenMintSDK.mainnet('https://api.com', 'key-2');
      expect(mainSdk).toBeInstanceOf(LumenMintSDK);
    });

    it('should strip trailing slash from apiBaseUrl', async () => {
      const trailingSdk = new LumenMintSDK({ apiBaseUrl: 'https://api.com/', maxRetries: 0 });
      mockResponse(200, { id: 'n-1', tokenId: '1', contractId: 'C', owner: 'G..', creator: 'G..', metadataUri: '', royaltyPercentage: 500, royaltyRecipient: 'G..', createdAt: new Date().toISOString(), transferCount: 0, lastTransferAt: '', isListed: false });

      await trailingSdk.rest.getNft('nft-1');

      const [url] = getLastFetchCall();
      expect(url).toBe('https://api.com/api/nfts/nft-1');
    });
  });
});
