import { API_CONFIG } from '@/lib/config';
import { WalletProvider } from '@/types/stellar';
import { WalletAuthResult } from '@/types/auth';

export interface SignatureVerificationPayload {
  walletAddress: string;
  signature: string;
  nonce: string;
  provider: WalletProvider;
  locale?: string;
}

export async function verifyWalletSignature(
  payload: SignatureVerificationPayload,
): Promise<WalletAuthResult> {
  const res = await fetch(`${API_CONFIG.baseUrl}/auth/wallet/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Signature verification failed');
  }

  const body = await res.json();
  // The API wraps responses as { data: { success, data } }; unwrap so
  // callers receive the token pair directly.
  return (body?.data?.data ?? body) as WalletAuthResult;
}

export async function linkWalletToAccount(
  payload: SignatureVerificationPayload,
  jwt: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_CONFIG.baseUrl}/auth/wallet/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to link wallet to account');
  }

  return res.json();
}
