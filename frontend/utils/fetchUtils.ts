// Simple in-memory cache for fetch responses
const fetchCache = new Map<string, any>();
const dedupeMap = new Map<string, Promise<any>>();

export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR";

export interface ValidationErrorPayload {
  field?: string;
  message: string;
}

export class AppApiError extends Error {
  code: ApiErrorCode;
  technicalDetail?: string;
  retryable: boolean;
  validationErrors?: ValidationErrorPayload[];

  constructor(params: {
    code: ApiErrorCode;
    message: string;
    technicalDetail?: string;
    retryable: boolean;
    validationErrors?: ValidationErrorPayload[];
  }) {
    super(params.message);
    this.name = "AppApiError";
    this.code = params.code;
    this.technicalDetail = params.technicalDetail;
    this.retryable = params.retryable;
    this.validationErrors = params.validationErrors;

    // Maintain clean stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppApiError);
    }
  }
}

/**
 * Normalizes any caught error, server response, or network failure into an AppApiError payload
 */
export async function normalizeApiError(error: unknown): Promise<AppApiError> {
  if (error instanceof AppApiError) {
    return error;
  }

  // Handle Fetch Request Cancellations / Timeouts via AbortController
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AppApiError({
      code: "TIMEOUT",
      message:
        "The server took too long to respond. Please check your network connection and try again.",
      technicalDetail: "Request aborted due to client-side timeout threshold.",
      retryable: true,
    });
  }

  // Handle standard JavaScript Network Dropouts
  if (
    error instanceof TypeError &&
    error.message.toLowerCase().includes("failed to fetch")
  ) {
    return new AppApiError({
      code: "NETWORK_ERROR",
      message:
        "Network disconnected or server unreachable. Please check your internet connection.",
      technicalDetail: error.stack,
      retryable: true,
    });
  }

  return new AppApiError({
    code: "UNKNOWN_ERROR",
    message: "An unexpected error occurred. Please try again later.",
    technicalDetail: error instanceof Error ? error.message : String(error),
    retryable: true,
  });
}

/**
 * Evaluates HTTP status codes and extracts backend payloads into strict error models
 */
export async function parseResponseError(res: Response): Promise<AppApiError> {
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    // Fail silently if body isn't structured JSON
  }

  const status = res.status;
  const msg =
    payload?.message || payload?.error || `HTTP error! status: ${status}`;

  switch (status) {
    case 401:
      return new AppApiError({
        code: "UNAUTHORIZED",
        message: msg || "Your session has expired. Please log in again.",
        retryable: false,
      });
    case 403:
      return new AppApiError({
        code: "FORBIDDEN",
        message: msg || "You do not have permission to perform this action.",
        retryable: false,
      });
    case 422:
    case 400:
      return new AppApiError({
        code: "VALIDATION_ERROR",
        message: msg || "Please correct the invalid inputs highlighted below.",
        retryable: false,
        validationErrors: payload?.errors || [],
      });
    default:
      if (status >= 500) {
        return new AppApiError({
          code: "SERVER_ERROR",
          message:
            "The server encountered an error processing your request. Our engineering team has been notified.",
          technicalDetail: `Status: ${status}, Response: ${JSON.stringify(payload)}`,
          retryable: true,
        });
      }
      return new AppApiError({
        code: "UNKNOWN_ERROR",
        message: msg,
        technicalDetail: `Status: ${status}`,
        retryable: false,
      });
  }
}

/**
 * Enhanced exponential backoff retry adhering to error retry contracts
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 500,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const normalized = await normalizeApiError(err);
    if (retries <= 0 || !normalized.retryable) {
      throw normalized;
    }
    await new Promise((r) => setTimeout(r, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

export function getCache<T>(key: string): T | undefined {
  return fetchCache.get(key);
}
export function setCache<T>(key: string, value: T) {
  fetchCache.set(key, value);
}
export function clearCache(key: string) {
  fetchCache.delete(key);
}
export function getDedupePromise<T>(key: string): Promise<T> | undefined {
  return dedupeMap.get(key);
}
export function setDedupePromise<T>(key: string, promise: Promise<T>) {
  dedupeMap.set(key, promise);
}
export function clearDedupePromise(key: string) {
  dedupeMap.delete(key);
}
export function clearAllCaches() {
  fetchCache.clear();
  dedupeMap.clear();
}

/**
 * Contextual validation field helper extractor.
 * Traverses standardized AppApiError objects to pull validation notes for target inputs.
 */
export function getValidationFieldMessage(
  error: unknown,
  fieldName: string,
): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  const apiError = error as any;

  // 1. Check if the error object directly contains a specific field validation payload
  if (
    apiError.validationErrors &&
    typeof apiError.validationErrors === "object"
  ) {
    const message = apiError.validationErrors[fieldName];
    if (typeof message === "string") return message;
    if (Array.isArray(message) && typeof message[0] === "string")
      return message[0];
  }

  // 2. Fallback check for alternative array structures e.g. [{ field: "email", message: "..." }]
  if (Array.isArray(apiError.errors)) {
    const match = apiError.errors.find(
      (err: any) => err && (err.field === fieldName || err.path === fieldName),
    );
    if (match && typeof match.message === "string") return match.message;
  }

  return undefined;
}
