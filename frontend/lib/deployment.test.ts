import {
  DEPLOYED_CONTRACTS,
  DEPLOYMENT_COMMIT,
  DEPLOYMENT_NETWORK,
  getContractExplorerUrl,
  getDeployedContracts,
  getDeploymentSummary,
  getNetworkLabel,
} from './deployment';

const CONTRACT_ID = /^C[A-Z2-7]{55}$/;

describe('deployment', () => {
  describe('DEPLOYED_CONTRACTS', () => {
    it('exposes a well-formed contract id for every contract', () => {
      for (const [name, id] of Object.entries(DEPLOYED_CONTRACTS)) {
        expect({ name, idMatches: CONTRACT_ID.test(id) }).toEqual({ name, idMatches: true });
      }
    });

    it('keeps the four contracts the deployment manifest records', () => {
      expect(Object.keys(DEPLOYED_CONTRACTS).sort()).toEqual([
        'collectionFactory',
        'marketplace',
        'nft',
        'transaction',
      ]);
    });
  });

  describe('getDeployedContracts', () => {
    it('returns every contract with a label', () => {
      const contracts = getDeployedContracts();
      expect(contracts).toHaveLength(4);
      expect(contracts.map((c) => c.label).sort()).toEqual([
        'collection_factory',
        'marketplace_settlement',
        'nft_contract',
        'transaction_contract',
      ]);
    });
  });

  describe('getContractExplorerUrl', () => {
    it('links to the testnet explorer by default', () => {
      expect(getContractExplorerUrl(DEPLOYED_CONTRACTS.nft, 'testnet')).toBe(
        `https://stellar.expert/explorer/testnet/contract/${DEPLOYED_CONTRACTS.nft}`,
      );
    });

    it('links to the public explorer on mainnet', () => {
      expect(getContractExplorerUrl(DEPLOYED_CONTRACTS.nft, 'mainnet')).toBe(
        `https://stellar.expert/explorer/public/contract/${DEPLOYED_CONTRACTS.nft}`,
      );
    });
  });

  describe('getNetworkLabel', () => {
    it('names the known networks', () => {
      expect(getNetworkLabel('testnet')).toBe('Testnet');
      expect(getNetworkLabel('mainnet')).toBe('Mainnet');
    });
  });

  describe('getDeploymentSummary', () => {
    it('defaults to the Testnet deployment and links the settlement contract', () => {
      const summary = getDeploymentSummary();
      expect(summary.network).toBe(DEPLOYMENT_NETWORK);
      expect(summary.label).toBe('Testnet');
      expect(summary.contracts).toHaveLength(4);
      expect(summary.marketplaceExplorerUrl).toBe(
        `https://stellar.expert/explorer/testnet/contract/${DEPLOYED_CONTRACTS.marketplace}`,
      );
    });

    it('pins the commit the deployment was built from', () => {
      expect(DEPLOYMENT_COMMIT).toMatch(/^[0-9a-f]{7,40}$/);
    });
  });
});
