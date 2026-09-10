// lib/firebase/uploadtofirebase.ts
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase.config';
import { useAuthStore } from '@/lib/stores/auth-store';
import { v4 as uuidv4 } from 'uuid';

const ACCEPTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);

// 8 MB — uploads are NFT artwork and profile media; anything larger is
// almost certainly a mistake and would burn user bandwidth.
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export class FirebaseUploadError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_TYPE'
      | 'FILE_TOO_LARGE'
      | 'STORAGE_UPLOAD_FAILED',
  ) {
    super(message);
    this.name = 'FirebaseUploadError';
  }
}

function sanitizeFileName(name: string): string {
  // Keep the original extension, strip anything that is not a safe
  // alphanumeric/dash/dot so the object key cannot contain path segments.
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.length > 0 ? cleaned : 'upload';
}

/**
 * Validate a file before upload. Throws a typed FirebaseUploadError so
 * callers can surface a specific message instead of a generic failure.
 */
export function validateUploadFile(
  file: File,
  options: { acceptedTypes?: Set<string>; maxSizeBytes?: number } = {},
): void {
  const { acceptedTypes = ACCEPTED_IMAGE_TYPES, maxSizeBytes = MAX_FILE_SIZE_BYTES } =
    options;

  if (!acceptedTypes.has(file.type)) {
    throw new FirebaseUploadError(
      `Unsupported file type "${file.type || 'unknown'}".`,
      'INVALID_TYPE',
    );
  }

  if (file.size > maxSizeBytes) {
    throw new FirebaseUploadError(
      `File is ${Math.ceil(file.size / (1024 * 1024))}MB; the limit is ${Math.floor(
        maxSizeBytes / (1024 * 1024),
      )}MB.`,
      'FILE_TOO_LARGE',
    );
  }
}

/**
 * Upload a file to Firebase Storage under a user-scoped, collision-free
 * path: `users/{userId}/{uuid}-{sanitizedName}`.
 *
 * The previous implementation wrote every upload to the shared
 * `stellar-lumenmint/{file.name}` prefix: files could overwrite each
 * other, there was no way to attribute or moderate an object, and a
 * maliciously named file could carry path separators into the object key.
 */
export async function uploadToFirebase(
  file: File,
  options: { userId?: string } = {},
): Promise<string> {
  validateUploadFile(file);

  const userId = options.userId || useAuthStore.getState().user?.id || 'anonymous';
  const uniqueId = uuidv4();
  const storageRef = ref(
    storage,
    `users/${userId}/${uniqueId}-${sanitizeFileName(file.name)}`,
  );

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    throw new FirebaseUploadError(
      'Upload failed. Please try again.',
      'STORAGE_UPLOAD_FAILED',
    );
  }
}