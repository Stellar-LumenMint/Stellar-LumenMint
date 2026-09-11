import { requestAuthChallenge, buildSignMessage, isNonceExpired } from '../nonce';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function mockFetchResponse(body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe('requestAuthChallenge', () => {
  it('requests a challenge with the walletAddress field the backend DTO expects', async () => {
    mockFetchResponse({
      nonce: 'abc123',
      expiresAt: '2026-09-10T00:00:00.000Z',
      message: 'server-message',
    });

    await requestAuthChallenge('GBRANDOMKEY');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/wallet/challenge'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ walletAddress: 'GBRANDOMKEY' }),
      }),
    );
  });

  it('returns the server-issued message as the message to sign', async () => {
    mockFetchResponse({
      nonce: 'abc123',
      expiresAt: '2026-09-10T00:00:00.000Z',
      message: 'server-message',
    });

    const challenge = await requestAuthChallenge('GBRANDOMKEY');
    expect(challenge.message).toBe('server-message');
    expect(challenge.nonce).toBe('abc123');
  });

  it('parses the ISO expiresAt into a timestamp', async () => {
    const future = '2099-01-01T00:00:00.000Z';
    mockFetchResponse({ nonce: 'abc123', expiresAt: future, message: 'm' });

    const challenge = await requestAuthChallenge('GBRANDOMKEY');
    expect(challenge.expiresAt).toBe(Date.parse(future));
    expect(Number.isNaN(challenge.expiresAt)).toBe(false);
    expect(isNonceExpired(challenge.expiresAt)).toBe(false);
  });

  it('falls back to buildSignMessage only when the server sends no message', async () => {
    mockFetchResponse({ nonce: 'abc123', expiresAt: '2026-09-10T00:00:00.000Z' });

    const challenge = await requestAuthChallenge('GBRANDOMKEY');
    expect(challenge.message).toBe(buildSignMessage('GBRANDOMKEY', 'abc123'));
  });
});
