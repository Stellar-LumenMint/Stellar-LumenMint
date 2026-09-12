use crate::error::SettlementError;
use crate::ttl;
use crate::types::{BundleTransaction, SaleTransaction, TradeTransaction};
use soroban_sdk::{contracttype, symbol_short, Env, Symbol};

/// Storage key for a single recorded transaction.
///
/// Sales, trades and bundles each used to live in one `Map<u64, T>` held in
/// **instance** storage. The instance entry is a single ledger entry shared by
/// everything the contract keeps there, so every write rewrote the entire map,
/// every read deserialized all of it, and the entry has a hard size ceiling.
/// The cost of listing an NFT therefore grew with the number of listings
/// already on the book, and the contract would eventually stop accepting new
/// ones. Per-record persistent entries keep reads, writes and TTLs
/// proportional to a single transaction.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TransactionKey {
    Sale(u64),
    Trade(u64),
    Bundle(u64),
}

// Id counters stay in instance storage: they are a handful of scalars, not a
// growing collection, and instance storage is the cheapest place for them.
pub const NEXT_SALE_ID: Symbol = symbol_short!("next_sale");
pub const NEXT_TRADE_ID: Symbol = symbol_short!("next_trd");
pub const NEXT_BUNDLE_ID: Symbol = symbol_short!("next_bndl");

/// Storage manager for sale transactions
pub struct SaleTransactionStore;

impl SaleTransactionStore {
    /// Get the next available sale transaction ID
    pub fn next_id(env: &Env) -> u64 {
        let current_id: u64 = env.storage().instance().get(&NEXT_SALE_ID).unwrap_or(1);
        let next_id = current_id + 1;
        env.storage().instance().set(&NEXT_SALE_ID, &next_id);
        current_id
    }

    /// Store a sale transaction
    pub fn put(env: &Env, transaction: &SaleTransaction) -> Result<(), SettlementError> {
        ttl::set(
            env,
            &TransactionKey::Sale(transaction.transaction_id),
            transaction,
        );
        Ok(())
    }

    /// Get a sale transaction by ID
    pub fn get(env: &Env, transaction_id: u64) -> Result<SaleTransaction, SettlementError> {
        ttl::get(env, &TransactionKey::Sale(transaction_id))
            .ok_or(SettlementError::TransactionNotFound)
    }

    /// Update a sale transaction
    pub fn update(env: &Env, transaction: &SaleTransaction) -> Result<(), SettlementError> {
        Self::put(env, transaction)
    }

    /// Remove a sale transaction
    pub fn remove(env: &Env, transaction_id: u64) -> Result<(), SettlementError> {
        if !env
            .storage()
            .persistent()
            .has(&TransactionKey::Sale(transaction_id))
        {
            return Err(SettlementError::TransactionNotFound);
        }
        ttl::remove(env, &TransactionKey::Sale(transaction_id));
        Ok(())
    }
}

/// Storage manager for trade transactions
pub struct TradeTransactionStore;

impl TradeTransactionStore {
    /// Get the next available trade transaction ID
    pub fn next_id(env: &Env) -> u64 {
        let current_id: u64 = env.storage().instance().get(&NEXT_TRADE_ID).unwrap_or(1);
        let next_id = current_id + 1;
        env.storage().instance().set(&NEXT_TRADE_ID, &next_id);
        current_id
    }

    /// Store a trade transaction
    pub fn put(env: &Env, transaction: &TradeTransaction) -> Result<(), SettlementError> {
        ttl::set(
            env,
            &TransactionKey::Trade(transaction.trade_id),
            transaction,
        );
        Ok(())
    }

    /// Get a trade transaction by ID
    pub fn get(env: &Env, trade_id: u64) -> Result<TradeTransaction, SettlementError> {
        ttl::get(env, &TransactionKey::Trade(trade_id)).ok_or(SettlementError::TransactionNotFound)
    }

    /// Update a trade transaction
    pub fn update(env: &Env, transaction: &TradeTransaction) -> Result<(), SettlementError> {
        Self::put(env, transaction)
    }
}

/// Storage manager for bundle transactions
pub struct BundleTransactionStore;

impl BundleTransactionStore {
    /// Get the next available bundle transaction ID
    pub fn next_id(env: &Env) -> u64 {
        let current_id: u64 = env.storage().instance().get(&NEXT_BUNDLE_ID).unwrap_or(1);
        let next_id = current_id + 1;
        env.storage().instance().set(&NEXT_BUNDLE_ID, &next_id);
        current_id
    }

    /// Store a bundle transaction
    pub fn put(env: &Env, transaction: &BundleTransaction) -> Result<(), SettlementError> {
        ttl::set(
            env,
            &TransactionKey::Bundle(transaction.bundle_id),
            transaction,
        );
        Ok(())
    }

    /// Get a bundle transaction by ID
    pub fn get(env: &Env, bundle_id: u64) -> Result<BundleTransaction, SettlementError> {
        ttl::get(env, &TransactionKey::Bundle(bundle_id))
            .ok_or(SettlementError::TransactionNotFound)
    }

    /// Update a bundle transaction
    pub fn update(env: &Env, transaction: &BundleTransaction) -> Result<(), SettlementError> {
        Self::put(env, transaction)
    }
}
