import { useEffect, useRef, useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import {
  AppApiError,
  normalizeApiError,
  parseResponseError,
} from "@/utils/fetchUtils";

const staticCache = new Map<string, any>();
const dedupeMap = new Map<string, Promise<any>>();

/**
 * Extended hook for fetching data with support for automatic
 * response caching, deduplication, retry validation, and normalized errors.
 */
export function useOptimizedFetch<T = unknown>(
  url: string,
  options?: {
    fetchOptions?: RequestInit;
    cacheKey?: string;
    dedupe?: boolean;
    retry?: number;
    retryDelay?: number;
    enabled?: boolean;
    dependencies?: any[];
  },
) {
  const abortController = useRef<AbortController | null>(null);

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AppApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const cacheKey = options?.cacheKey || url;
  const dedupe = options?.dedupe ?? true;
  const maxRetries = options?.retry ?? 2;
  const retryDelay = options?.retryDelay ?? 500;
  const enabled = options?.enabled ?? true;
  const deps = options?.dependencies || [];

  const fetchData = useCallback(
    async (): Promise<T | null> => {
      if (!enabled) return null;
      setLoading(true);
      setError(null);

      abortController.current?.abort();
      abortController.current = new AbortController();
      const signal = abortController.current.signal;

      if (staticCache.has(cacheKey)) {
        const cachedData = staticCache.get(cacheKey)!;
        setData(cachedData);
        setLoading(false);
        return cachedData;
      }

      if (dedupe && dedupeMap.has(cacheKey)) {
        try {
          const result = await dedupeMap.get(cacheKey)!;
          setData(result);
          setLoading(false);
          return result;
        } catch (err) {
          const normalized = await normalizeApiError(err);
          setError(normalized);
          setLoading(false);
          return null;
        }
      }

      const doFetch = async (): Promise<T> => {
        const res = await fetchWithAuth(url, {
          ...options?.fetchOptions,
          signal,
        });

        // FIX: Check if response failed and map it to an AppApiError
        if (!res.ok) {
          const parsedError = await parseResponseError(res);
          throw parsedError;
        }

        const json = (await res.json()) as T;
        staticCache.set(cacheKey, json);
        return json;
      };

      const fetchPromise = (async (): Promise<T> => {
        let lastError: any;
        for (let i = 0; i <= maxRetries; i++) {
          try {
            return await doFetch();
          } catch (err: any) {
            if (signal.aborted) {
              throw new Error("Request cancelled");
            }

            const normalized = await normalizeApiError(err);
            lastError = normalized;

            // Stop retrying if the error is non-retryable (e.g., 401, 403, 422)
            if (i === maxRetries || !normalized.retryable) {
              throw normalized;
            }

            await new Promise((r) =>
              setTimeout(r, retryDelay * Math.pow(2, i)),
            );
          }
        }
        throw lastError;
      })();

      if (dedupe) dedupeMap.set(cacheKey, fetchPromise);

      try {
        const result = await fetchPromise;
        setData(result);
        setError(null);
        setLoading(false);
        return result;
      } catch (err) {
        if (signal.aborted) return null;
        const normalized = await normalizeApiError(err);
        setError(normalized);
        setData(null);
        setLoading(false);
        return null;
      } finally {
        if (dedupe) dedupeMap.delete(cacheKey);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, cacheKey, dedupe, maxRetries, retryDelay, enabled, ...deps],
  );

  // Initial fetch and dependency tracking
  useEffect(() => {
    if (enabled) fetchData();
    return () => {
      abortController.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  // Cancel function
  const cancel = useCallback(() => {
    abortController.current?.abort();
    setLoading(false);
  }, []);

  // Refetch function
  const refetch = useCallback(() => {
    staticCache.delete(cacheKey);
    fetchData();
  }, [cacheKey, fetchData]);

  return { data, error, loading, refetch, cancel };
}
