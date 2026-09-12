use soroban_sdk::contracterror;

/// Every failure the factory and the collections it deploys can report.
///
/// The factory deploys collection contracts as separate wasm instances, and both
/// use this enum, so a code has to be unambiguous across the pair. Codes are
/// part of the on-chain interface: never renumber one, and never reuse a
/// retired number for a different meaning.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    /// The caller is not permitted to do this: not the admin, or not the owner
    /// of the token it is acting on.
    NotAuthorized = 1,
    AlreadyInitialized = 2,
    /// The token is not known to this collection.
    NotFound = 3,
    /// A balance would have gone below zero. Raised by the checked subtraction
    /// in `transfer` and `burn` instead of the generic arithmetic panic the raw
    /// `- 1` produced.
    InsufficientBalance = 4,
    /// A configuration value is not usable: an empty collection name, or a
    /// `max_supply` of zero, which would make the collection mintable from the
    /// moment it exists.
    InvalidAmount = 5,
    SupplyLimitExceeded = 6,
    /// The collection contract has no configuration: it was deployed without
    /// `init`, so it has no admin, no config and no minters.
    CollectionNotFound = 7,
    NotMinter = 8,
    ContractPaused = 9,
    /// The royalty percentage exceeds 10 000 basis points.
    InvalidRoyalty = 10,
    /// The recipient cannot hold the token: it is the collection's own address,
    /// which has no entrypoint that would release it again.
    InvalidRecipient = 11,
    /// A token id was minted twice.
    TokenAlreadyExists = 12,
    /// The creator is at `MaxCollectionsPerCreator` and the overflow fee is
    /// unset or zero, so the overflow tier is closed.
    MaxCollectionsExceeded = 13,
}
