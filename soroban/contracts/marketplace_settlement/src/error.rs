use soroban_sdk::{contracterror, contracttype};

/// Every failure this contract can report.
///
/// # Adding a code
///
/// Soroban caps a `#[contracterror]` enum at **50 variants**: the generated
/// union spec is a `VecM<ScSpecUdtUnionCaseV0, 50>` and the derive macro
/// `unwrap()`s the conversion. A 51st variant does not produce a readable
/// diagnostic — it panics with
/// `called Result::unwrap() on an Err value: LengthExceedsMax`, pointing at the
/// `#[contracterror]` attribute. If you hit that, you are over the cap.
///
/// Because of the cap this enum is kept deliberately tight: **a code exists
/// only if some branch actually returns it.** When you need a new code, retire
/// the least useful one rather than appending, and follow the numbering below.
/// Codes are part of the contract's on-chain interface, so never renumber or
/// reuse a retired code for a different meaning; leave the gap.
///
/// # Numbering
///
/// | Range | Domain |
/// |-------|--------|
/// | 1-99    | General (authorization, lookup, amount) |
/// | 100-199 | Transactions and atomic swaps |
/// | 200-299 | Auctions |
/// | 300-399 | Payments and assets |
/// | 400-499 | Royalties |
/// | 500-599 | Disputes |
/// | 600-699 | Security (reentrancy, front-running, pause) |
/// | 700-799 | Fees |
/// | 800-899 | Admin |
/// | 900-999 | Arithmetic |
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum SettlementError {
    // General errors
    /// The caller failed an authorization check. This is the contract's single
    /// authorization code: privileged entrypoints that are called by the wrong
    /// address report this, not a separate "not admin" code.
    Unauthorized = 1,
    NotFound = 2,
    AlreadyExists = 3,
    Expired = 5,
    InvalidAmount = 7,

    // Transaction errors
    TransactionNotFound = 100,
    /// The transaction exists but is not in the state this operation requires.
    InvalidTransactionState = 105,
    /// A counterparty named the same address on both sides of a trade.
    SelfTradeNotAllowed = 106,
    /// An escrowed bid was already repaid; refunding it again would pay twice.
    BidAlreadyRefunded = 107,

    // Auction errors
    AuctionNotFound = 200,
    AuctionAlreadyEnded = 201,
    BidTooLow = 203,
    InvalidBidIncrement = 204,
    CommitmentMismatch = 207,
    BidBelowMinimumIncrement = 208,
    /// A commit-reveal operation was attempted on an auction configured for
    /// open bidding.
    CommitRevealDisabled = 209,
    /// The auction cannot be closed yet: still running, or already closed.
    AuctionNotEndable = 210,
    /// Cancelling would strand bids that have already been escrowed.
    AuctionHasBids = 211,
    /// The auction is still open, so it has no outcome to hand out.
    AuctionStillPending = 212,
    /// The winning bidder's own deposit is what settled the lot; it is not
    /// theirs to withdraw.
    WinningBidderCannotWithdraw = 213,

    // Payment errors
    /// A token transfer was refused. Raised from the token call itself rather
    /// than aborting with the token's own error, so the failure is attributable
    /// to the payment leg.
    PaymentFailed = 300,
    InsufficientPayment = 301,
    InvalidCurrency = 302,
    AssetNotSupported = 303,
    /// The depositor paid an amount that is not the amount this transaction
    /// expects. Distinct from `InsufficientPayment`, which is an amount below a
    /// required minimum: here the amount simply is not the agreed one.
    PaymentAmountMismatch = 304,

    // Royalty errors
    /// A royalty percentage is out of range, or implies a royalty larger than
    /// the sale it is taken from.
    InvalidRoyaltyPercentage = 401,

    // Dispute errors
    DisputeNotFound = 500,
    DisputeAlreadyResolved = 501,
    InsufficientArbitrators = 504,
    /// The dispute has no verdict yet, so there is nothing to execute.
    DisputeNotResolved = 505,
    /// A stored resolution value that no branch of the executor recognises.
    UnknownResolutionOutcome = 506,

    // Security errors
    ReentrancyDetected = 600,
    FrontRunningDetected = 601,
    CooldownActive = 603,
    /// The whole contract is paused, so no module may run.
    ContractPaused = 604,
    /// Only the named module is blocked; the rest of the contract still works.
    ///
    /// Pause failures used to funnel through a `From<PauseError>` impl that
    /// mapped all seven of them onto `ContractPaused`, telling a caller the
    /// contract was down when in fact one feature was.
    ModulePaused = 605,
    PauseTimelockActive = 606,
    PauseAlreadyScheduled = 607,
    PauseNotScheduled = 608,
    NotPaused = 610,

    // Fee errors
    InvalidFeeConfig = 701,
    FeeAlreadyInitialized = 703,

    // Admin errors
    AddressBlocked = 802,
    MaxSupportedAssetsExceeded = 803,
    /// The admin switch that gates emergency withdrawals is off.
    EmergencyWithdrawalDisabled = 804,
    /// The NFT contract is not on the allowlist, so the contract cannot vouch
    /// for its interface.
    NftNotSupported = 805,

    // Math errors
    Overflow = 900,
    Underflow = 901,
    DivisionByZero = 902,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EmergencyWithdrawalReason {
    StuckTransaction,
    SecurityBreach,
    PlatformMaintenance,
    UserRequest,
}

// Dispute resolution constants (u64 values)
pub const DISPUTE_RESOLUTION_NOT_RESOLVED: u64 = 0;
pub const DISPUTE_RESOLUTION_REFUND_BUYER: u64 = 1;
pub const DISPUTE_RESOLUTION_RELEASE_TO_SELLER: u64 = 2;
pub const DISPUTE_RESOLUTION_SPLIT_FUNDS: u64 = 3;
pub const DISPUTE_RESOLUTION_CANCEL_TRANSACTION: u64 = 4;
