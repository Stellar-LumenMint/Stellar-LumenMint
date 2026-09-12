// ScVal encoders for the composite types the marketplace settlement contract
// expects.
//
// The contract's entry points take `Asset` and `NFTItem` structs and
// `Option<...>` parameters. `nativeToScVal` cannot infer those shapes, and the
// previous client encoded everything as plain strings, which the host rejects
// with a type error before the contract body ever runs. Soroban encodes a
// `#[contracttype]` struct as a map whose keys are symbols sorted
// lexicographically, so these helpers build that map explicitly.

import { Address, nativeToScVal, xdr } from 'stellar-sdk';

/** The contract-side `Asset { contract: Address, symbol: Symbol }`. */
export interface ContractAsset {
  /** Stellar asset contract (SAC) address for the currency. */
  contract: string;
  /** Currency symbol, e.g. `XLM`. */
  symbol: string;
}

/** The contract-side `NFTItem { nft_address: Address, token_id: u64 }`. */
export interface ContractNftItem {
  nftContract: string;
  tokenId: string | number | bigint;
}

function structEntry(key: string, value: xdr.ScVal): xdr.ScMapEntry {
  return new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(key), val: value });
}

/**
 * Encode an `Asset`.
 *
 * Field order is lexicographic (`contract` before `symbol`) because the host
 * requires map keys to be sorted; an out-of-order map fails to decode into the
 * contract struct.
 */
export function assetToScVal(asset: ContractAsset): xdr.ScVal {
  return xdr.ScVal.scvMap([
    structEntry('contract', Address.fromString(asset.contract).toScVal()),
    structEntry('symbol', xdr.ScVal.scvSymbol(asset.symbol)),
  ]);
}

/** Encode an `NFTItem` (`nft_address` before `token_id`). */
export function nftItemToScVal(item: ContractNftItem): xdr.ScVal {
  return xdr.ScVal.scvMap([
    structEntry('nft_address', Address.fromString(item.nftContract).toScVal()),
    structEntry(
      'token_id',
      nativeToScVal(BigInt(item.tokenId), { type: 'u64' }),
    ),
  ]);
}

/** Encode a `Vec<NFTItem>`. */
export function nftItemsToScVal(items: ContractNftItem[]): xdr.ScVal {
  return xdr.ScVal.scvVec(items.map(nftItemToScVal));
}

/** Encode an `Option<T>`: the value itself, or `void` when absent. */
export function optionToScVal(value: xdr.ScVal | null | undefined): xdr.ScVal {
  return value ?? xdr.ScVal.scvVoid();
}

/**
 * Encode a hex string as `Bytes`.
 *
 * Soroban has no string type for byte payloads; the contract's `salt` and
 * `commitment_hash` parameters are `Bytes`, and the client previously sent an
 * `ScString`, which cannot decode into them.
 */
export function hexToBytesScVal(hex: string): xdr.ScVal {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalized.length === 0 || normalized.length % 2 !== 0) {
    throw new Error(
      `Expected a non-empty even-length hex string, received ${JSON.stringify(hex)}`,
    );
  }
  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    throw new Error(`Expected a hex string, received ${JSON.stringify(hex)}`);
  }
  return xdr.ScVal.scvBytes(Buffer.from(normalized, 'hex'));
}

/**
 * Encode a `#[contracttype]` enum. Soroban represents these as a `u32` holding
 * the variant's discriminant.
 */
export function enumToScVal(discriminant: number): xdr.ScVal {
  return nativeToScVal(discriminant, { type: 'u32' });
}

/** Discriminants of the contract's `AuctionType` enum. */
export const AUCTION_TYPE_DISCRIMINANT: Record<'english' | 'dutch', number> = {
  english: 0,
  dutch: 1,
};
