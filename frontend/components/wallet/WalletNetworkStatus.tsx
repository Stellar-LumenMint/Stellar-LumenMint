'use client';

import { StellarNetwork } from '@/types/stellar';
import { defaultNetwork } from '@/lib/stellar/client';

interface WalletNetworkStatusProps {
  network: StellarNetwork;
  /**
   * The network the app is configured to operate on. When the wallet's
   * network differs, the badge switches to a warning state so users are
   * not surprised by failing transactions on the wrong network.
   */
  expectedNetwork?: StellarNetwork;
  className?: string;
}

export function WalletNetworkStatus({
  network,
  expectedNetwork = defaultNetwork,
  className = '',
}: WalletNetworkStatusProps) {
  const isTestnet = network === 'testnet';
  const isMismatch = network !== expectedNetwork;

  if (isMismatch) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/30 ${className}`}
        role="status"
        aria-label={`Wallet connected to ${network}, app expects ${expectedNetwork}`}
        title={`Wrong network: connected to ${network}, app expects ${expectedNetwork}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" aria-hidden="true" />
        {`${network === 'testnet' ? 'Testnet' : 'Mainnet'} — wrong network`}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
        isTestnet
          ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
          : 'bg-green-400/10 text-green-400 border border-green-400/20'
      } ${className}`}
      role="status"
      aria-label={`Connected to ${network}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isTestnet ? 'bg-yellow-400' : 'bg-green-400'}`}
        aria-hidden="true"
      />
      {isTestnet ? 'Testnet' : 'Mainnet'}
    </span>
  );
}
