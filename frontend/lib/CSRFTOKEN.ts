import { API_CONFIG } from './config';

// The CSRF token is bound to the session cookie and does not rotate per
// request, so fetching it once per page is enough. Caching it here means
// every mutating request in the app can attach the same token without a
// separate round-trip per page or per call.
let cachedToken: string | null = null;
let inflightFetch: Promise<string> | null = null;

function clearCache(): void {
  cachedToken = null;
}

/**
 * Fetches a CSRF token from the server, caching it for the lifetime of the
 * page session and de-duplicating concurrent calls.
 * @returns The CSRF token as a string
 */
export async function getCookie(): Promise<string> {
  if (cachedToken) return cachedToken;

  if (!inflightFetch) {
    inflightFetch = (async () => {
      try {
        const csrfRes = await fetch(`${API_CONFIG.baseUrl}/auth/csrf-token`, {
          credentials: 'include',
        });

        if (!csrfRes.ok) {
          throw new Error('Failed to fetch CSRF token');
        }

        const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
        cachedToken = csrfToken;
        return csrfToken;
      } finally {
        inflightFetch = null;
      }
    })();
  }

  return inflightFetch;
}

export { clearCache as clearCachedCsrfToken };
