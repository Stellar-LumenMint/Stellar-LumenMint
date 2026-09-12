import { HttpStatus } from '@nestjs/common';
import { AppErrorCode } from '../enums/app-error-code.enum';

/**
 * Every valid code, as plain strings.
 *
 * `AppErrorCode` is a string enum, so its values are the wire format. Keeping
 * them in a set lets a value of unknown provenance be validated with a `has`
 * check rather than an enum comparison, which is both narrower and free of the
 * enum-comparison lint rule.
 */
const VALID_CODES: ReadonlySet<string> = new Set<string>(
  Object.values(AppErrorCode),
);

/** Whether an unknown value is one of the declared error codes. */
export function isAppErrorCode(value: unknown): value is AppErrorCode {
  return typeof value === 'string' && VALID_CODES.has(value);
}

/**
 * The code reported for an HTTP status when the thrown exception does not carry
 * a more specific one.
 *
 * Every client-visible error response needs a machine-readable code. Without a
 * default, a response either has to omit the field (making clients special-case
 * its absence) or the throw site has to remember a code it does not care about.
 * Mapping the status covers the second case, and `withErrorCode` covers the
 * first for the paths where the specific reason matters.
 */
const STATUS_DEFAULT_CODES: Readonly<Record<number, AppErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: AppErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: AppErrorCode.UNAUTHORIZED,
  [HttpStatus.PAYMENT_REQUIRED]: AppErrorCode.INSUFFICIENT_BALANCE,
  [HttpStatus.FORBIDDEN]: AppErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: AppErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: AppErrorCode.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: AppErrorCode.FILE_TOO_LARGE,
  [HttpStatus.UNPROCESSABLE_ENTITY]: AppErrorCode.UNPROCESSABLE_ENTITY,
  [HttpStatus.TOO_MANY_REQUESTS]: AppErrorCode.TOO_MANY_REQUESTS,
  [HttpStatus.INTERNAL_SERVER_ERROR]: AppErrorCode.INTERNAL_SERVER_ERROR,
  [HttpStatus.BAD_GATEWAY]: AppErrorCode.SOROBAN_RPC_ERROR,
  [HttpStatus.SERVICE_UNAVAILABLE]: AppErrorCode.SERVICE_UNAVAILABLE,
  [HttpStatus.GATEWAY_TIMEOUT]: AppErrorCode.GATEWAY_TIMEOUT,
};

/**
 * The payload shape a throw site uses to attach a specific code:
 *
 * ```ts
 * throw new BadRequestException(
 *   withErrorCode(AppErrorCode.WALLET_SIGNATURE_INVALID, 'Signature mismatch'),
 * );
 * ```
 *
 * The code is carried in the exception response object, which is where NestJS
 * looks when it builds the body, so it needs no side channel and cannot be
 * dropped by the filter.
 */
export interface CodedErrorPayload {
  code: AppErrorCode;
  message?: string;
}

/** Attach an explicit error code to an exception response payload. */
export function withErrorCode(
  code: AppErrorCode,
  message?: string,
): CodedErrorPayload {
  return message === undefined ? { code } : { code, message };
}

/**
 * Read the code a throw site attached, if any.
 *
 * Two shapes are accepted, because two exist in the codebase: a flat `{ code }`
 * from `withErrorCode`, and the nested `{ error: { code } }` that
 * `StellarErrorInterceptor` builds. Accepting only the flat shape would mean
 * the interceptor's code — the one part of its payload that survives — was
 * silently replaced by the status default.
 *
 * Only values that are members of `AppErrorCode` are accepted: an arbitrary
 * string smuggled into the payload must not become a client-visible code, or
 * the set of codes a client can receive stops being enumerable.
 */
export function errorCodeFrom(
  exceptionResponse: unknown,
): AppErrorCode | undefined {
  if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
    return undefined;
  }

  const body = exceptionResponse as { code?: unknown; error?: unknown };

  const candidates: unknown[] = [body.code];
  if (typeof body.error === 'object' && body.error !== null) {
    candidates.push((body.error as { code?: unknown }).code);
  }

  return candidates.find(isAppErrorCode);
}

/**
 * The code to report for a response.
 *
 * An explicit code wins. A request that failed DTO validation reports
 * `VALIDATION_ERROR` rather than the generic `BAD_REQUEST`, because that is the
 * distinction a client actually acts on: one means "resubmit with fixed input",
 * the other means "the request was rejected".
 */
/** `400` as a plain number, for comparison against the numeric `status` argument. */
const BAD_REQUEST_STATUS = Number(HttpStatus.BAD_REQUEST);

export function resolveErrorCode(
  status: number,
  options: { hasValidationErrors?: boolean } = {},
): AppErrorCode {
  if (options.hasValidationErrors && status === BAD_REQUEST_STATUS) {
    return AppErrorCode.VALIDATION_ERROR;
  }

  return STATUS_DEFAULT_CODES[status] ?? AppErrorCode.INTERNAL_SERVER_ERROR;
}
