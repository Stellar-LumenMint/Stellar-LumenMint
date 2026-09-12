import { Address, Keypair, scValToNative, xdr } from 'stellar-sdk';
import {
  AUCTION_TYPE_DISCRIMINANT,
  assetToScVal,
  enumToScVal,
  hexToBytesScVal,
  nftItemToScVal,
  nftItemsToScVal,
  optionToScVal,
} from './scval.encoders';

// Deterministic, structurally valid ed25519 accounts. Derived from fixed seeds
// so the fixtures are stable across runs without depending on a live network.
const ADDR_A = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 1)).publicKey();
const ADDR_B = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 2)).publicKey();

/** Collect the symbol keys of a struct map, in the order they were written. */
function structKeys(value: xdr.ScVal): string[] {
  return (value.map() ?? []).map((entry) => String(scValToNative(entry.key())));
}

describe('scval encoders', () => {
  describe('assetToScVal', () => {
    it('encodes Asset as a map keyed by contract then symbol', () => {
      const scval = assetToScVal({ contract: ADDR_A, symbol: 'XLM' });

      // Soroban requires contracttype struct fields to be ordered
      // lexicographically; the host rejects an unsorted map.
      expect(structKeys(scval)).toEqual(['contract', 'symbol']);
      // Decode with the SDK to prove the result is a valid `Asset` struct.
      expect(scValToNative(scval)).toEqual({
        contract: ADDR_A,
        symbol: 'XLM',
      });
    });
  });

  describe('nftItemToScVal / nftItemsToScVal', () => {
    it('encodes NFTItem as a map keyed by nft_address then token_id', () => {
      const scval = nftItemToScVal({ nftContract: ADDR_B, tokenId: '42' });

      expect(structKeys(scval)).toEqual(['nft_address', 'token_id']);
      expect(scValToNative(scval)).toEqual({
        nft_address: ADDR_B,
        token_id: 42n,
      });
    });

    it('encodes a list as a vector of structs', () => {
      const scval = nftItemsToScVal([
        { nftContract: ADDR_A, tokenId: '1' },
        { nftContract: ADDR_B, tokenId: 2n },
      ]);

      expect(scval.vec()).toHaveLength(2);
      expect(structKeys(scval.vec()![0])).toEqual(['nft_address', 'token_id']);
    });
  });

  describe('optionToScVal', () => {
    it('encodes an absent option as void rather than omitting the argument', () => {
      expect(optionToScVal(undefined).switch()).toBe(xdr.ScValType.scvVoid());
      expect(optionToScVal(null).switch()).toBe(xdr.ScValType.scvVoid());
    });

    it('passes a present option through unchanged', () => {
      const inner = Address.fromString(ADDR_A).toScVal();
      expect(optionToScVal(inner)).toBe(inner);
    });
  });

  describe('hexToBytesScVal', () => {
    it('encodes hex as Bytes, not as a string', () => {
      const scval = hexToBytesScVal('deadbeef');
      expect(scval.switch()).toBe(xdr.ScValType.scvBytes());
      expect(scval.bytes().toString('hex')).toBe('deadbeef');
    });

    it('accepts a 0x prefix', () => {
      expect(hexToBytesScVal('0x00ff').bytes().toString('hex')).toBe('00ff');
    });

    it('rejects non-hex and odd-length input instead of sending garbage', () => {
      expect(() => hexToBytesScVal('not-hex')).toThrow(/hex string/);
      expect(() => hexToBytesScVal('abc')).toThrow(/hex string/);
      expect(() => hexToBytesScVal('')).toThrow(/hex string/);
    });
  });

  describe('enumToScVal', () => {
    it('encodes a contracttype enum as its u32 discriminant', () => {
      const scval = enumToScVal(AUCTION_TYPE_DISCRIMINANT.dutch);
      expect(scval.switch()).toBe(xdr.ScValType.scvU32());
      expect(scval.u32()).toBe(1);
      expect(AUCTION_TYPE_DISCRIMINANT.english).toBe(0);
    });
  });
});
