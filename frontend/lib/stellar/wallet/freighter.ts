import {
  isConnected,
  getAddress,
  signTransaction,
  signMessage,
  requestAccess,
  getNetwork,
} from '@stellar/freighter-api';
import { StellarNetwork } from '@/types/stellar';

export async function connectFreighter(): Promise<string> {
  const connected = await isConnected();
  if (!connected.isConnected) {
    throw new Error('Freighter extension is not installed. Please install it from freighter.app');
  }

  await requestAccess();
  const addressResult = await getAddress();

  if (addressResult.error) {
    throw new Error(addressResult.error);
  }

  return addressResult.address;
}

export async function getFreighterAddress(): Promise<string> {
  const result = await getAddress();
  if (result.error) throw new Error(result.error);
  return result.address;
}

export async function getFreighterNetwork(): Promise<StellarNetwork> {
  const result = await getNetwork();
  if (result.error) throw new Error(result.error);
  return result.network.toLowerCase().includes('testnet') ? 'testnet' : 'mainnet';
}

export async function signWithFreighter(
  transactionXdr: string,
  network: StellarNetwork,
): Promise<string> {
  const networkPassphrase =
    network === 'testnet'
      ? 'Test SDF Network ; September 2015'
      : 'Public Global Stellar Network ; September 2015';

  const result = await signTransaction(transactionXdr, {
    networkPassphrase,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result.signedTxXdr;
}

/**
 * Produce a raw Ed25519 signature over an arbitrary message via Freighter.
 * This is what wallet authentication needs: the backend verifies the base64
 * signature against the exact challenge message bytes with Keypair.verify.
 * The previous approach wrapped the message in a transaction memo (28-byte
 * limit) and produced a transaction envelope, which the backend could never
 * verify against its raw signature check.
 */
export async function signMessageWithFreighter(message: string): Promise<string> {
  const result = await signMessage(message);

  if (result.error || result.signedMessage == null) {
    throw new Error(
      typeof result.error === 'string' ? result.error : 'Freighter message signing failed',
    );
  }

  // Freighter v4+ returns a base64 string; older versions return a Buffer
  // (from the `buffer` npm package, which also supports base64 encoding).
  const signed = result.signedMessage;
  return typeof signed === 'string' ? signed : signed.toString('base64');
}

export async function isFreighterConnected(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}
