//! Time-to-live (TTL) and archival management.
//!
//! Soroban ledger entries expire. Each entry has a "live until" ledger, and
//! once that ledger passes, the entry is archived and can no longer be read.
//! The host never extends a TTL on its own: every extension is an explicit
//! call. A factory that never extends its instance TTL would eventually be
//! unable to deploy or resolve collections.
//!
//! Everything this contract keeps in `instance()` storage shares one TTL, so
//! a single `extend_ttl` call on the instance — which also covers the
//! contract code entry — refreshes the whole contract.
//!
//! TTLs are measured in ledgers. With the network's ~5 second close time one
//! day is ~17,280 ledgers; the values below keep the contract alive for at
//! least 30 days and top it up to 60 days.

use soroban_sdk::Env;

/// Approximate number of ledgers in one day (~5 second close time).
pub const DAY_IN_LEDGERS: u32 = 17_280;

/// Extend an entry once it drops below this many ledgers of remaining life.
pub const THRESHOLD: u32 = DAY_IN_LEDGERS * 30;

/// New remaining life applied when an entry is extended.
pub const EXTEND_TO: u32 = DAY_IN_LEDGERS * 60;

/// Bump the TTL shared by all contract instance entries, the contract
/// instance entry itself and the deployed Wasm code.
///
/// Call this from every external entry point so the factory never becomes
/// unreachable through inactivity.
pub fn extend_instance(env: &Env) {
    env.storage().instance().extend_ttl(THRESHOLD, EXTEND_TO);
}
