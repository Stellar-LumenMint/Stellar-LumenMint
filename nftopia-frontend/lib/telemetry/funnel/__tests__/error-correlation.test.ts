import { ErrorCorrelation } from '../error-correlation';

describe('ErrorCorrelation', () => {
  afterEach(() => {
    ErrorCorrelation.clear();
  });

  it('records and retrieves last error', () => {
    ErrorCorrelation.recordError('wallet_connect_failed');
    const last = ErrorCorrelation.getLastError();
    expect(last.code).toBe('wallet_connect_failed');
    expect(typeof last.timestamp).toBe('number');
  });

  it('tracks error sequence', () => {
    ErrorCorrelation.recordError('err1');
    ErrorCorrelation.recordError('err2');
    expect(ErrorCorrelation.getErrorSequence()).toEqual(['err1', 'err2']);
  });

  it('clears state', () => {
    ErrorCorrelation.recordError('err1');
    ErrorCorrelation.clear();
    expect(ErrorCorrelation.getLastError().code).toBeUndefined();
    expect(ErrorCorrelation.getErrorSequence()).toEqual([]);
  });
});
