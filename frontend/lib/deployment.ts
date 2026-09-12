import type { StellarNetwork } from '@/types/stellar';

/**
 * Where this build's contracts live.
 *
 * The defaults are the Testnet deployment recorded in
 * `soroban/deployments/manifest.json`, so a checkout that has not been given
 * any environment variables still points at a working, initialised
 * deployment. Every value can be overridden with the matching
 * `NEXT_PUBLIC_*` variable, which is how a local Soroban node or a future
 * mainnet release is wired up.
 *
 * These are public identifiers — contract addresses, not keys — so it is safe
 * for them to be baked into the client bundle.
 */
export const DEPLOYMENT_NETWORK: StellarNetwork =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK as StellarNetwork | undefined) || 'testnet';

export const DEPLOYED_CONTRACTS = {
  nft:
    process.env.NEXT_PUBLIC_NFT_CONTRACT_ID ||
    'CDQN2A5U6SQLL4NZAMV4SL6BAOK6EXDG4G6HHRDJOOH6XK4LPUPZLHJC',
  marketplace:
    process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID ||
    'CCCUOZVZDUYF3Z42PQYAM2AGNCZSSF6J4IUC2J6ANF4Q5C3F5G4CJKUN',
  collectionFactory:
    process.env.NEXT_PUBLIC_COLLECTION_FACTORY_CONTRACT_ID ||
    'CBRL37EZ5KR2O4J3ECM5RQCREHMYKCZV4QJTUHI6JCGXWJ5BIRXAV6LQ',
  transaction:
    process.env.NEXT_PUBLIC_TRANSACTION_CONTRACT_ID ||
    'CCM4HGRU7CGLFAHHMTTBAQN6C2LEOJLWTTRMKAQX2W2T5EE7LNMW37FQ',
} as const;

/** The source revision the deployed contracts were built from. */
export const DEPLOYMENT_COMMIT = 'bfd6e80';

export function getNetworkLabel(network: StellarNetwork = DEPLOYMENT_NETWORK): string {
  return network === 'testnet' ? 'Testnet' : 'Mainnet';
}

/** Stellar Expert URL for a deployed contract. */
export function getContractExplorerUrl(
  contractId: string,
  network: StellarNetwork = DEPLOYMENT_NETWORK,
): string {
  const base =
    network === 'testnet'
      ? 'https://stellar.expert/explorer/testnet'
      : 'https://stellar.expert/explorer/public';
  return `${base}/contract/${contractId}`;
}

export interface DeployedContract {
  /** Human-readable name used for keys, labels and tests. */
  name: keyof typeof DEPLOYED_CONTRACTS;
  /** Label as it appears on the explorer. */
  label: string;
  contractId: string;
}

const CONTRACT_LABELS: Record<keyof typeof DEPLOYED_CONTRACTS, string> = {
  nft: 'nft_contract',
  marketplace: 'marketplace_settlement',
  collectionFactory: 'collection_factory',
  transaction: 'transaction_contract',
};

/**
 * Every deployed contract with at least a well-formed id. An override that is
 * blank or obviously not a contract address is dropped rather than rendered as
 * a broken explorer link.
 */
export function getDeployedContracts(): DeployedContract[] {
  return (Object.keys(DEPLOYED_CONTRACTS) as (keyof typeof DEPLOYED_CONTRACTS)[])
    .map((name) => ({
      name,
      label: CONTRACT_LABELS[name],
      contractId: DEPLOYED_CONTRACTS[name].trim(),
    }))
    .filter((contract) => /^C[A-Z2-7]{55}$/.test(contract.contractId));
}

export interface DeploymentSummary {
  network: StellarNetwork;
  label: string;
  contracts: DeployedContract[];
  /** Explorer link for the settlement contract, or null if it is not configured. */
  marketplaceExplorerUrl: string | null;
}

export function getDeploymentSummary(): DeploymentSummary {
  const contracts = getDeployedContracts();
  const marketplace = contracts.find((contract) => contract.name === 'marketplace');

  return {
    network: DEPLOYMENT_NETWORK,
    label: getNetworkLabel(DEPLOYMENT_NETWORK),
    contracts,
    marketplaceExplorerUrl: marketplace
      ? getContractExplorerUrl(marketplace.contractId, DEPLOYMENT_NETWORK)
      : null,
  };
}
