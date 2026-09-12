//! Time-to-live (TTL) and archival management.
//!
//! Soroban ledger entries are not permanent. Every entry has a "live until"
//! ledger, and once that ledger is passed the entry is evicted from the live
//! state and archived. Reads of an archived entry fail, which means a contract
//! that never extends its TTLs will eventually stop working — unacceptable for
//! a marketplace that holds escrowed NFTs and buyer payments.
//!
//! Two rules matter:
//!
//! 1. Contract **instance** entries (admin configuration, id counters, the
//!    contract code itself) share one TTL. A single `instance().extend_ttl(...)`
//!    covers all of them, so it is enough to bump the instance on every entry
//!    point that mutates state.
//! 2. **Persistent** entries have an independent TTL per key. Each one has to
//!    be extended explicitly, and extending a key that does not exist is an
//!    error in the host — so every bump here is guarded by an existence check.
//!
//! TTLs are measured in ledgers. With the network's ~5 second close time one
//! day is ~17,280 ledgers; the values below keep entries alive for at least 30
//! days and top them up to 60 days.

use soroban_sdk::{Env, IntoVal, TryFromVal, Val};

/// Approximate number of ledgers in one day (~5 second close time).
pub const DAY_IN_LEDGERS: u32 = 17_280;

/// Extend an entry once it drops below this many ledgers of remaining life.
pub const THRESHOLD: u32 = DAY_IN_LEDGERS * 30;

/// New remaining life applied when an entry is extended.
pub const EXTEND_TO: u32 = DAY_IN_LEDGERS * 60;

/// Bump the TTL shared by all contract instance entries, the contract instance
/// entry itself and the deployed Wasm code.
///
/// Call this from every external entry point so the contract never becomes
/// unreachable through inactivity.
pub fn extend_instance(env: &Env) {
    env.storage().instance().extend_ttl(THRESHOLD, EXTEND_TO);
}

/// Read a persistent entry and refresh its TTL when present.
///
/// The TTL is only extended if the entry exists: the host rejects extensions
/// for keys that are not live, so a missing key must stay a plain `None`.
pub fn get<K, V>(env: &Env, key: &K) -> Option<V>
where
    K: IntoVal<Env, Val>,
    V: TryFromVal<Env, Val>,
{
    let storage = env.storage().persistent();
    let value: Option<V> = storage.get(key);
    if value.is_some() {
        storage.extend_ttl(key, THRESHOLD, EXTEND_TO);
    }
    value
}

/// Write a persistent entry and set its TTL to the full extension window.
///
/// A freshly written entry only receives the host's minimum TTL, so the
/// explicit extension is what makes the entry's lifetime deterministic.
pub fn set<K, V>(env: &Env, key: &K, value: &V)
where
    K: IntoVal<Env, Val>,
    V: IntoVal<Env, Val>,
{
    let storage = env.storage().persistent();
    storage.set(key, value);
    storage.extend_ttl(key, THRESHOLD, EXTEND_TO);
}

/// Remove a persistent entry. No TTL handling is needed for a deleted key.
pub fn remove<K>(env: &Env, key: &K)
where
    K: IntoVal<Env, Val>,
{
    env.storage().persistent().remove(key);
}
