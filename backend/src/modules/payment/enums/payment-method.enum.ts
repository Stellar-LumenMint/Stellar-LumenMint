/**
 * Supported payment methods for the LumenMint platform.
 *
 * Stellar-native methods process payments directly on the Stellar network.
 * Off-chain methods integrate with third-party payment processors (e.g., Stripe).
 */
export enum PaymentMethod {
  /** Native Stellar Lumens (XLM) payment */
  XLM = 'XLM',
  /** Stellar USDC stablecoin (anchored on Stellar) */
  USDC = 'USDC',
  /** Bundle payment — grouped transaction with multiple assets */
  BUNDLE = 'BUNDLE',
  /** Credit card payment via Stripe or other processor */
  CREDIT_CARD = 'CREDIT_CARD',
  /** Stripe payment gateway */
  STRIPE = 'STRIPE',
  /** Stellar wallet-based payment (Freighter, Albedo, etc.) */
  STELLAR = 'STELLAR',
  /** Generic cryptocurrency payment fallback */
  CRYPTO = 'CRYPTO',
}

/** All supported payment methods (displayed in UI) */
export const SUPPORTED_PAYMENT_METHODS = [
  PaymentMethod.XLM,
  PaymentMethod.USDC,
  PaymentMethod.STELLAR,
  PaymentMethod.CRYPTO,
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.STRIPE,
  PaymentMethod.BUNDLE,
] as const;

/** Payment methods that settle natively on the Stellar network */
export const NATIVE_PAYMENT_METHODS = [
  PaymentMethod.XLM,
  PaymentMethod.USDC,
  PaymentMethod.STELLAR,
] as const;

/** Payment methods that require off-chain payment processing */
export const OFFCHAIN_PAYMENT_METHODS = [
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.STRIPE,
  PaymentMethod.CRYPTO,
] as const;
