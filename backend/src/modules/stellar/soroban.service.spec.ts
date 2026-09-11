import { BadRequestException } from '@nestjs/common';
import { Keypair } from 'stellar-sdk';
import {
  assertScValNumericRange,
  describeOperatorKeyMismatch,
} from './soroban.service';

describe('assertScValNumericRange', () => {
  it('accepts valid values', () => {
    expect(() => assertScValNumericRange('i128', '0')).not.toThrow();
    expect(() => assertScValNumericRange('i128', (2n ** 127n - 1n).toString())).not.toThrow();
    expect(() => assertScValNumericRange('u64', (2n ** 64n - 1n).toString())).not.toThrow();
    expect(() => assertScValNumericRange('u32', (2n ** 32n - 1n).toString())).not.toThrow();
  });

  it('rejects non-integer input with a 400', () => {
    expect(() => assertScValNumericRange('u64', 'abc')).toThrow(BadRequestException);
    expect(() => assertScValNumericRange('u64', '1.5')).toThrow(BadRequestException);
    expect(() => assertScValNumericRange('u64', {})).toThrow(BadRequestException);
  });

  it('rejects out-of-range values with a 400', () => {
    expect(() => assertScValNumericRange('u32', '4294967296')).toThrow(BadRequestException);
    expect(() => assertScValNumericRange('u32', '-1')).toThrow(BadRequestException);
    expect(() => assertScValNumericRange('u64', (2n ** 64n).toString())).toThrow(
      BadRequestException,
    );
    expect(() => assertScValNumericRange('u64', '-1')).toThrow(BadRequestException);
    expect(() => assertScValNumericRange('i128', (2n ** 127n).toString())).toThrow(
      BadRequestException,
    );
    expect(() =>
      assertScValNumericRange('i128', (-(2n ** 127n) - 1n).toString()),
    ).toThrow(BadRequestException);
  });
});

describe('describeOperatorKeyMismatch', () => {
  it('returns null when the pair matches', () => {
    const keypair = Keypair.random();
    expect(
      describeOperatorKeyMismatch(keypair.publicKey(), keypair.secret()),
    ).toBeNull();
  });

  it('reports a mismatch between public key and secret', () => {
    const configured = Keypair.random();
    const signer = Keypair.random();

    const problem = describeOperatorKeyMismatch(
      configured.publicKey(),
      signer.secret(),
    );

    expect(problem).toContain('does not match');
  });

  it('reports a malformed secret', () => {
    expect(
      describeOperatorKeyMismatch(Keypair.random().publicKey(), 'not-a-secret'),
    ).toContain('not a valid Stellar secret key');
  });

  it('skips the check when either value is absent', () => {
    const keypair = Keypair.random();
    expect(describeOperatorKeyMismatch(keypair.publicKey(), undefined)).toBeNull();
    expect(describeOperatorKeyMismatch(undefined, keypair.secret())).toBeNull();
  });
});