import { HttpStatus } from '@nestjs/common';
import { AppErrorCode } from '../enums/app-error-code.enum';
import {
  errorCodeFrom,
  resolveErrorCode,
  withErrorCode,
} from './error-code.resolver';

describe('resolveErrorCode', () => {
  it('maps every documented status to its default code', () => {
    expect(resolveErrorCode(HttpStatus.BAD_REQUEST)).toBe(AppErrorCode.BAD_REQUEST);
    expect(resolveErrorCode(HttpStatus.UNAUTHORIZED)).toBe(AppErrorCode.UNAUTHORIZED);
    expect(resolveErrorCode(HttpStatus.PAYMENT_REQUIRED)).toBe(
      AppErrorCode.INSUFFICIENT_BALANCE,
    );
    expect(resolveErrorCode(HttpStatus.FORBIDDEN)).toBe(AppErrorCode.FORBIDDEN);
    expect(resolveErrorCode(HttpStatus.NOT_FOUND)).toBe(AppErrorCode.NOT_FOUND);
    expect(resolveErrorCode(HttpStatus.CONFLICT)).toBe(AppErrorCode.CONFLICT);
    expect(resolveErrorCode(HttpStatus.PAYLOAD_TOO_LARGE)).toBe(
      AppErrorCode.FILE_TOO_LARGE,
    );
    expect(resolveErrorCode(HttpStatus.UNPROCESSABLE_ENTITY)).toBe(
      AppErrorCode.UNPROCESSABLE_ENTITY,
    );
    expect(resolveErrorCode(HttpStatus.TOO_MANY_REQUESTS)).toBe(
      AppErrorCode.TOO_MANY_REQUESTS,
    );
    expect(resolveErrorCode(HttpStatus.BAD_GATEWAY)).toBe(
      AppErrorCode.SOROBAN_RPC_ERROR,
    );
    expect(resolveErrorCode(HttpStatus.SERVICE_UNAVAILABLE)).toBe(
      AppErrorCode.SERVICE_UNAVAILABLE,
    );
    expect(resolveErrorCode(HttpStatus.GATEWAY_TIMEOUT)).toBe(
      AppErrorCode.GATEWAY_TIMEOUT,
    );
  });

  it('distinguishes a validation failure from a plain bad request', () => {
    expect(resolveErrorCode(HttpStatus.BAD_REQUEST, { hasValidationErrors: true })).toBe(
      AppErrorCode.VALIDATION_ERROR,
    );
    expect(resolveErrorCode(HttpStatus.BAD_REQUEST)).toBe(AppErrorCode.BAD_REQUEST);
  });

  it('falls back to INTERNAL_SERVER_ERROR for a status with no mapping', () => {
    // 418 is deliberately unmapped; a code is still required.
    expect(resolveErrorCode(418)).toBe(AppErrorCode.INTERNAL_SERVER_ERROR);
  });
});

describe('errorCodeFrom', () => {
  it('reads a flat code', () => {
    expect(errorCodeFrom(withErrorCode(AppErrorCode.UPLOAD_FAILED))).toBe(
      AppErrorCode.UPLOAD_FAILED,
    );
  });

  it('reads the nested shape StellarErrorInterceptor throws', () => {
    expect(
      errorCodeFrom({ ok: false, error: { code: 'SOROBAN_RPC_ERROR' } }),
    ).toBe(AppErrorCode.SOROBAN_RPC_ERROR);
  });

  it('prefers a flat code when both are present', () => {
    expect(
      errorCodeFrom({
        code: 'NOT_FOUND',
        error: { code: 'SOROBAN_RPC_ERROR' },
      }),
    ).toBe(AppErrorCode.NOT_FOUND);
  });

  it('ignores anything that is not a member of the enum', () => {
    // A driver's free-text code must not become a client-visible code, or the
    // set of codes a client can receive stops being enumerable.
    expect(errorCodeFrom({ code: 'ECONNREFUSED' })).toBeUndefined();
    expect(errorCodeFrom({ error: { code: 'something_internal' } })).toBeUndefined();
    expect(errorCodeFrom({ code: 42 })).toBeUndefined();
    expect(errorCodeFrom(null)).toBeUndefined();
    expect(errorCodeFrom('NOT_FOUND')).toBeUndefined();
  });
});
