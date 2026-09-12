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

Deployed from commit `bfd6e80` with the `stellar` CLI (v28.0.0). Deployer account:
`GDAWVGP2YPZ3UZJQDKAOPRTO7C2HEAS2U7CHKBZOOURYPTDJL6DMEBNT` (funded via Friendbot).

| Contract | Contract ID | Explorer |
| --- | --- | --- |
| `collection_factory` | `CBRL37EZ5KR2O4J3ECM5RQCREHMYKCZV4QJTUHI6JCGXWJ5BIRXAV6LQ` | [view](https://stellar.expert/explorer/testnet/contract/CBRL37EZ5KR2O4J3ECM5RQCREHMYKCZV4QJTUHI6JCGXWJ5BIRXAV6LQ) |
| `nft_contract` | `CDQN2A5U6SQLL4NZAMV4SL6BAOK6EXDG4G6HHRDJOOH6XK4LPUPZLHJC` | [view](https://stellar.expert/explorer/testnet/contract/CDQN2A5U6SQLL4NZAMV4SL6BAOK6EXDG4G6HHRDJOOH6XK4LPUPZLHJC) |
| `marketplace_settlement` | `CCCUOZVZDUYF3Z42PQYAM2AGNCZSSF6J4IUC2J6ANF4Q5C3F5G4CJKUN` | [view](https://stellar.expert/explorer/testnet/contract/CCCUOZVZDUYF3Z42PQYAM2AGNCZSSF6J4IUC2J6ANF4Q5C3F5G4CJKUN) |
| `transaction_contract` | `CCM4HGRU7CGLFAHHMTTBAQN6C2LEOJLWTTRMKAQX2W2T5EE7LNMW37FQ` | [view](https://stellar.expert/explorer/testnet/contract/CCM4HGRU7CGLFAHHMTTBAQN6C2LEOJLWTTRMKAQX2W2T5EE7LNMW37FQ) |

The marketplace is initialised (admin and fee configuration set) and allowlists the
NFT contract and the XLM Stellar Asset Contract
`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`, which is also registered
as a supported settlement asset — so listings, auctions and trades can settle against
it without further on-chain setup.

All four contracts report version `0.1.0+bfd6e80` on-chain, which is how this record
was checked against the source it claims to come from.

## Redeploying

```bash
cd soroban
NETWORK=testnet SOURCE=<stellar-key-alias> ./scripts/deploy_all.sh
```

The script builds each contract, uploads the wasm, deploys an instance, runs
[`scripts/initialize_all.sh`](./scripts/initialize_all.sh) to write the admin, fee
configuration, settlement asset and allowlists, verifies the state reads back, and
appends the result here. Mainnet requires `MAINNET_CONFIRM=yes`.

Initialisation is a separate script so it can be re-run on its own against an existing
manifest after a partial failure:

```bash
cd soroban
NETWORK=testnet SOURCE=<stellar-key-alias> ./scripts/initialize_all.sh
```

## Consuming the addresses

The backend reads them from the environment:

- `MARKETPLACE_SETTLEMENT_CONTRACT_ID`
- `NFT_CONTRACT_ID`
- `COLLECTION_FACTORY_CONTRACT_ID`
- `TRANSACTION_CONTRACT_ID`
