import { API_CONFIG } from "@/lib/config";

export interface NonceChallenge {
  nonce: string;
  expiresAt: number;
  message: string;
}

export async function requestAuthChallenge(publicKey: string): Promise<NonceChallenge> {
  const res = await fetch(`${API_CONFIG.baseUrl}/auth/wallet/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    // The backend DTO is WalletChallengeDto ({ walletAddress, walletProvider }),
    // and the global validation pipe rejects unknown fields.
    body: JSON.stringify({ walletAddress: publicKey }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to request auth challenge");
  }

  const data = await res.json();

  return {
    nonce: data.nonce,
    expiresAt: Date.parse(data.expiresAt),
    // The server-issued challenge message is the single source of truth for
    // what gets signed. buildSignMessage is only a fallback for servers that
    // do not return a message; signing a locally rebuilt message when the
    // server did return one breaks signature verification.
    message: data.message ?? buildSignMessage(publicKey, data.nonce),
  };
}

export function buildSignMessage(publicKey: string, nonce: string): string {
  return `Stellar-LumenMint Authentication\nPublic Key: ${publicKey}\nNonce: ${nonce}`;
}

export function isNonceExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}