# Deployment Manifest

`manifest.json` is the machine-readable record of every contract deployment. It is
appended to by `scripts/deployment_manifest.sh`, which `scripts/deploy_all.sh` calls
once per contract, so the file always reflects what was actually deployed rather than
what someone remembered to write down.

## Structure

```json
{
  "deployments": [
    {
      "contract": "marketplace_settlement",
      "contract_id": "C...",
      "wasm_hash": "…",
      "network": "testnet",
      "version": "0.1.0",
      "git_commit": "abc1234",
      "deployed_at": "2026-09-12T10:17:24Z",
      "rustc_version": "rustc 1.98.1"
    }
  ]
}
```

Entries are append-only history: the most recent entry for a contract on a network is
the live one, and earlier entries record what it replaced.

## Live testnet deployment

Deployed from commit `ed2bf67` with the `stellar` CLI (v28.0.0). Deployer account:
`GDAWVGP2YPZ3UZJQDKAOPRTO7C2HEAS2U7CHKBZOOURYPTDJL6DMEBNT` (funded via Friendbot).

| Contract | Contract ID | Explorer |
| --- | --- | --- |
| `collection_factory` | `CDSNB4N3YHEAHWHQT7XZB6HAEQEFRPRIZWUCEEYGJRPIRBBBOO3NS4CS` | [view](https://stellar.expert/explorer/testnet/contract/CDSNB4N3YHEAHWHQT7XZB6HAEQEFRPRIZWUCEEYGJRPIRBBBOO3NS4CS) |
| `nft_contract` | `CDJB7TJ4FKYDHRMBQ2ZQKLL6MPHFIRZA2RNP2ENUE3D7CQR3I4IRMPQ2` | [view](https://stellar.expert/explorer/testnet/contract/CDJB7TJ4FKYDHRMBQ2ZQKLL6MPHFIRZA2RNP2ENUE3D7CQR3I4IRMPQ2) |
| `marketplace_settlement` | `CC3S7SSYEMRKD4Y6SUFC3ENHN3D3TJAPVT557R22K6IN36BXHH2X2GCU` | [view](https://stellar.expert/explorer/testnet/contract/CC3S7SSYEMRKD4Y6SUFC3ENHN3D3TJAPVT557R22K6IN36BXHH2X2GCU) |
| `transaction_contract` | `CAEMECNI3D34TESV36PCUBKORP3PPY4MHRDJJCQNB4D2LK4TOBDOKCJ5` | [view](https://stellar.expert/explorer/testnet/contract/CAEMECNI3D34TESV36PCUBKORP3PPY4MHRDJJCQNB4D2LK4TOBDOKCJ5) |

The marketplace is initialised (admin and fee configuration set) and allowlists the
NFT contract and the XLM Stellar Asset Contract
`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`, which is also registered
as a supported settlement asset — so listings, auctions and trades can settle against
it without further on-chain setup.

## Redeploying

```bash
cd soroban
NETWORK=testnet SOURCE=<stellar-key-alias> ./scripts/deploy_all.sh
```

The script builds each contract, uploads the wasm, deploys an instance and appends the
result here. Mainnet requires `MAINNET_CONFIRM=yes`.

## Consuming the addresses

The backend reads them from the environment:

- `MARKETPLACE_SETTLEMENT_CONTRACT_ID`
- `NFT_CONTRACT_ID`
- `COLLECTION_FACTORY_CONTRACT_ID`
- `TRANSACTION_CONTRACT_ID`
