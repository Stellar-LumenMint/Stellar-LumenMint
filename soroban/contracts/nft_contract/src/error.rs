use soroban_sdk::contracterror;

/// Every failure this contract can report.
///
/// Codes are part of the contract's on-chain interface: never renumber one or
/// reuse a retired number for a different meaning. Retired codes are listed at
/// the bottom so the gaps stay explained.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    /// The caller is not permitted to do this. Also covers a caller that is not
    /// the owner, since there is exactly one authorization failure to report.
    NotAuthorized = 1,
    AlreadyInitialized = 2,
    NotFound = 3,
    TokenNotFound = 4,
    SupplyLimitExceeded = 6,
    ContractPaused = 7,
    InvalidRoyalty = 8,
    MetadataFrozen = 10,
    /// The caller does not own the token it is acting on as owner.
    NotOwner = 11,
    NotApproved = 12,
    /// The batch is empty.
    InvalidBatchSize = 13,
    /// The batch is longer than [`crate::storage::MAX_BATCH_SIZE`].
    BatchTooLarge = 14,
    /// The recipient cannot hold the token: it is this contract's own address,
    /// which has no way to release it again.
    InvalidRecipient = 15,
    RoleAlreadyGranted = 16,
    RoleNotGranted = 17,
    NotMinter = 18,
    NotBurner = 19,
    /// The metadata URI is empty, so the token's metadata could never resolve.
    InvalidUri = 20,
    ArithmeticError = 21,
    /// The parallel vectors passed to a batch entrypoint differ in length.
    MismatchedArrays = 22,
    AlreadyBurned = 23,
    InvalidUpgradeTarget = 25,
    UnsupportedStorageVersion = 26,
}

// Retired codes. The gaps above are intentional; these numbers are never reused.
//
//   5  InvalidAmount          - no entrypoint ever returned it; the amount
//                              checks that exist report `InvalidRoyalty` or
//                              `SupplyLimitExceeded`, both more specific.
//   9  TokenAlreadyExists     - token ids come from a monotonic counter seeded
//                              at 1 in `initialize`, so a collision cannot
//                              occur and no mint path ever checked for one.
//  24  BurnNotAllowed         - there is no per-token "burnable" flag, so no
//                              branch could ever refuse a burn on that basis.
