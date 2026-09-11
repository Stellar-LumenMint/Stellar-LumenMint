import { validateUploadFile, FirebaseUploadError } from './uploadtofirebase';

function makeFile(type: string, size = 1024): File {
  return new File([new ArrayBuffer(size)], `image-${size}.png`, { type });
}

describe('validateUploadFile', () => {
  it('accepts an allowed image type within the size limit', () => {
    expect(() => validateUploadFile(makeFile('image/png', 1024))).not.toThrow();
  });

  it('rejects unsupported file types with a typed error', () => {
    expect(() => validateUploadFile(makeFile('text/html'))).toThrow(FirebaseUploadError);
    try {
      validateUploadFile(makeFile('text/html'));
    } catch (e) {
      expect((e as FirebaseUploadError).code).toBe('INVALID_TYPE');
    }
  });

  it('rejects files larger than the limit with a typed error', () => {
    const big = makeFile('image/png', 20 * 1024 * 1024);
    expect(() => validateUploadFile(big)).toThrow(FirebaseUploadError);
    try {
      validateUploadFile(big);
    } catch (e) {
      expect((e as FirebaseUploadError).code).toBe('FILE_TOO_LARGE');
    }
  });

  it('honors custom accepted types and size limits', () => {
    const customTypes = new Set(['application/pdf']);
    expect(() =>
      validateUploadFile(makeFile('application/pdf'), { acceptedTypes: customTypes }),
    ).not.toThrow();
    expect(() => validateUploadFile(makeFile('image/png'), { acceptedTypes: customTypes })).toThrow(
      FirebaseUploadError,
    );
  });
});
