#![cfg(test)]

use crate::{
    error::SettlementError,
    royalty_distributor::RoyaltyDistributor,
    settlement_core::{MarketplaceSettlement, MarketplaceSettlementClient},
    types::{Asset, AuctionType, FeeConfig, NFTItem, TransactionState},
};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Bytes, Env, Symbol,
};

// --- Mock Contracts ---
#[soroban_sdk::contract]
pub struct MockToken;
#[soroban_sdk::contractimpl]
impl MockToken {
    pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {}
    pub fn balance(_env: Env, _id: Address) -> i128 {
        100_000_000
    }
}

#[soroban_sdk::contract]
pub struct MockNft;
#[soroban_sdk::contractimpl]
impl MockNft {
    pub fn set_owner(env: Env, owner: Address) {
        env.storage()
            .instance()
            .set(&soroban_sdk::Symbol::new(&env, "owner"), &owner);
    }
    pub fn owner_of(env: Env, _id: u64) -> Address {
        if env
            .storage()
            .instance()
            .has(&soroban_sdk::Symbol::new(&env, "owner"))
        {
            env.storage()
                .instance()
                .get(&soroban_sdk::Symbol::new(&env, "owner"))
                .unwrap()
        } else {
            Address::generate(&env)
        }
    }
    /// Record the new owner so tests can assert the token actually moved. The
    /// production contract enforces authorization here; the mock only needs to
    /// capture the effect.
    ///
    /// The argument list mirrors `NftContract::transfer` — the marketplace
    /// invokes it as `transfer(caller, from, to, token_id)` — so a mismatch in
    /// the real ABI surfaces here as an arity error.
    pub fn transfer(env: Env, _caller: Address, _from: Address, to: Address, _token_id: u64) {
        env.storage()
            .instance()
            .set(&soroban_sdk::Symbol::new(&env, "owner"), &to);
    }
}

fn mk_asset(env: &Env) -> Asset {
    let contract = env.register(MockToken, ());
    Asset {
        contract,
        symbol: Symbol::new(env, "XLM"),
    }
}

fn default_fee_config(env: &Env, fee_recipient: Address) -> FeeConfig {
    FeeConfig {
        platform_fee_bps: 250,
        minimum_fee: 1000,
        maximum_fee: 1_000_000,
        fee_recipient,
        dynamic_fee_enabled: true,
        volume_discounts: soroban_sdk::Vec::new(env),
        vip_exemptions: soroban_sdk::Vec::new(env),
    }
}

fn new_env() -> (Env, Address, MarketplaceSettlementClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register(MarketplaceSettlement, ());
    let client = MarketplaceSettlementClient::new(&env, &cid);
    let admin = Address::generate(&env);
    let fee_config = default_fee_config(&env, admin.clone());
    client.initialize(&admin, &fee_config);
    let client: MarketplaceSettlementClient<'static> = unsafe { core::mem::transmute(client) };
    (env, cid, client, admin)
}

fn reg(env: &Env, cid: &Address, nft: &Address, creator: &Address, admin: &Address, asset: &Asset) {
    let client = MarketplaceSettlementClient::new(env, cid);
    client.add_allowed_nft_contract(admin, nft);
    client.add_allowed_token_contract(admin, &asset.contract);

    // Configure through the admin so the helper works for callers that pass a
    // bare address rather than a registered NFT contract. The owner-anchored
    // path is covered by its own tests.
    client.set_royalty_info(admin, nft, &1u64, creator, &500u64);
    assert_eq!(
        client.get_royalty_info(nft, &1u64).creator,
        *creator,
        "reg must record the royalty it promises"
    );
}

// ─── Init ────────────────────────────────────────────────────────────────────

#[test]
fn test_initialize_success() {
    new_env();
}

#[test]
fn test_reinitialize_fee_config_fails() {
    let (env, _cid, client, admin) = new_env();
    let fee_config = default_fee_config(&env, admin.clone());
    // A second initialize on the same contract must fail with FeeAlreadyInitialized.
    let result = client.try_initialize(&admin, &fee_config);
    assert!(result.is_err());
}

#[test]
fn test_accumulated_fees_start_zero() {
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    assert_eq!(client.get_accumulated_fees(&_asset), 0i128);
}

// ─── Sale ────────────────────────────────────────────────────────────────────

#[test]
fn test_create_sale_success() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert_eq!(id, 1u64);
}

#[test]
fn test_get_sale_after_create() {
    let (env, cid, client, _admin) = new_env();
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    let cur = mk_asset(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &cur);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &500_000i128, &cur, &3600u64);
    let sale = client.get_sale(&id);
    assert_eq!(sale.seller, seller);
    assert_eq!(sale.price, 500_000i128);
}

#[test]
fn test_cancel_sale_by_seller() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    client.cancel_transaction(&id, &Symbol::new(&env, "sale"), &seller);
}

/// Transaction records must live in their own persistent entries.
///
/// They previously shared one `Map<u64, T>` in instance storage, so every write
/// rewrote the whole book and the entry grew without bound. Asserting the
/// storage location directly is what distinguishes the two implementations;
/// a read-back test passes either way.
#[test]
fn test_transaction_records_use_per_id_persistent_storage() {
    use crate::storage::transaction_store::TransactionKey;

    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let first = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    let second = client.create_sale(&seller, &nft, &1u64, &2_000_000i128, &asset, &86400u64);
    assert_ne!(first, second);

    env.as_contract(&cid, || {
        assert!(env.storage().persistent().has(&TransactionKey::Sale(first)));
        assert!(env
            .storage()
            .persistent()
            .has(&TransactionKey::Sale(second)));
    });

    // Each sale keeps its own price rather than the last one written.
    assert_eq!(client.get_sale(&first).price, 1_000_000i128);
    assert_eq!(client.get_sale(&second).price, 2_000_000i128);
}

/// Auctions, their bid books and Dutch pricing data must each occupy their own
/// persistent entry. Previously all three were `Map<u64, ...>` values in the
/// shared instance entry, so one bid rewrote every auction on the book.
#[test]
fn test_auction_records_use_per_id_persistent_storage() {
    use crate::storage::auction_store::AuctionKey;

    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    client.add_supported_asset(&admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let auction_id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &100_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &asset,
    );
    client.place_bid(&auction_id, &bidder, &100_000i128, &None);

    env.as_contract(&cid, || {
        assert!(env
            .storage()
            .persistent()
            .has(&AuctionKey::Auction(auction_id)));
        assert!(env
            .storage()
            .persistent()
            .has(&AuctionKey::Bids(auction_id)));
    });

    assert_eq!(client.get_auction(&auction_id).highest_bid, 100_000i128);
}

/// Each escrow must be its own entry, addressed by transaction id.
///
/// Escrows used to share one `Map<u64, AtomicSwap>` in instance storage keyed by
/// a generated swap id, and lookups scanned every escrow comparing transaction
/// ids. Asserting the storage key pins both halves of the fix: the location and
/// the fact that the transaction id is the key.
#[test]
fn test_escrow_records_use_per_transaction_storage() {
    use crate::atomic_swap::EscrowKey;

    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);

    env.as_contract(&cid, || {
        assert!(env.storage().persistent().has(&EscrowKey::Swap(id)));
        let swap = crate::atomic_swap::AtomicSwapEngine::get_swap_by_transaction(&env, id)
            .expect("escrow must be readable by transaction id");
        assert_eq!(swap.transaction_id, id);
    });
}

/// Fee balances and per-user volume must not share the instance entry: the
/// volume map grew with every account that ever traded.
#[test]
fn test_fee_ledger_uses_per_key_persistent_storage() {
    use crate::fee_manager::FeeKey;

    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    client.execute_sale(&id, &buyer, &1_000_000i128);

    env.as_contract(&cid, || {
        assert!(env
            .storage()
            .persistent()
            .has(&FeeKey::UserVolume(buyer.clone())));
    });
    assert!(client.get_user_volume(&buyer) > 0);
}

#[test]
fn test_cancel_sale_non_seller_fails() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let attacker = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert!(client
        .try_cancel_transaction(&id, &Symbol::new(&env, "sale"), &attacker)
        .is_err());
}

#[test]
fn test_create_sale_escrows_the_nft() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    let nft_client = MockNftClient::new(&env, &nft);
    nft_client.set_owner(&seller);

    client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);

    // The listing holds the token so settlement does not need the seller.
    assert_eq!(nft_client.owner_of(&1u64), cid);
}

#[test]
fn test_execute_sale_completes() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    let nft_client = MockNftClient::new(&env, &nft);
    nft_client.set_owner(&seller);

    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);

    client.execute_sale(&id, &buyer, &1_000_000i128);

    let sale = client.get_sale(&id);
    assert_eq!(sale.buyer, Some(buyer.clone()));
    assert_eq!(sale.state, TransactionState::Executed);
    assert_eq!(sale.seller, seller);
    // The escrowed token reaches the buyer, not back to the seller.
    assert_eq!(nft_client.owner_of(&1u64), buyer);
}

#[test]
fn test_execute_sale_twice_fails() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    client.execute_sale(&id, &buyer, &1_000_000i128);

    assert!(client
        .try_execute_sale(&id, &buyer, &1_000_000i128)
        .is_err());
}

#[test]
fn test_cancel_sale_returns_the_escrowed_nft() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    let nft_client = MockNftClient::new(&env, &nft);
    nft_client.set_owner(&seller);

    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    client.cancel_transaction(&id, &Symbol::new(&env, "sale"), &seller);

    // Cancelling must not strand the token in the contract.
    assert_eq!(nft_client.owner_of(&1u64), seller);
}

#[test]
fn test_execute_sale_wrong_payment_fails() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert!(client.try_execute_sale(&id, &buyer, &999_999i128).is_err());
}

#[test]
fn test_execute_sale_requires_buyer_authorization() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);

    // Drop every mocked credential so the buyer's require_auth() has nothing
    // to satisfy it. The payment amount is correct, so the only reason this
    // can fail is the missing authorization.
    env.mock_auths(&[]);

    assert!(client
        .try_execute_sale(&id, &buyer, &1_000_000i128)
        .is_err());
}

#[test]
fn test_create_sale_requires_seller_authorization() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    env.mock_auths(&[]);

    assert!(client
        .try_create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64)
        .is_err());
}

#[test]
fn test_get_nonexistent_sale_fails() {
    let (_env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&_env);
    assert!(client.try_get_sale(&9999u64).is_err());
}

// ─── Auction ─────────────────────────────────────────────────────────────────

#[test]
fn test_create_english_auction_success() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &_asset,
    );
    assert_eq!(id, 1u64);
}

#[test]
fn test_create_dutch_auction_success() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &200_000i128,
        &50_000i128,
        &7200u64,
        &1_000i128,
        &AuctionType::Dutch,
        &_asset,
    );
    assert!(id > 0);
}

#[test]
fn test_create_auction_zero_price_fails() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    assert!(client
        .try_create_auction(
            &seller,
            &nft,
            &1u64,
            &0i128,
            &0i128,
            &3600u64,
            &1_000i128,
            &AuctionType::English,
            &_asset,
        )
        .is_err());
}

#[test]
fn test_bid_below_starting_price_fails() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &_asset,
    );
    assert!(client
        .try_place_bid(&id, &bidder, &50_000i128, &None)
        .is_err());
}

#[test]
fn test_get_dutch_auction_price() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &200_000i128,
        &50_000i128,
        &7200u64,
        &1_000i128,
        &AuctionType::Dutch,
        &_asset,
    );
    let price = client.get_dutch_auction_price(&id);
    assert!(price > 0);
}

#[test]
fn test_get_nonexistent_auction_fails() {
    let (_env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&_env);
    assert!(client.try_get_auction(&9999u64).is_err());
}

// ─── Fee Manager ─────────────────────────────────────────────────────────────

#[test]
fn test_update_fee_config_by_admin() {
    let (env, _cid, _client, _admin) = new_env();
    let admin = Address::generate(&env);
    let cfg = FeeConfig {
        platform_fee_bps: 300,
        minimum_fee: 500,
        maximum_fee: 2_000_000,
        fee_recipient: admin.clone(),
        dynamic_fee_enabled: false,
        volume_discounts: soroban_sdk::Vec::new(&env),
        vip_exemptions: soroban_sdk::Vec::new(&env),
    };
    // re-initialize with known admin so we can update
    let cid2 = env.register(MarketplaceSettlement, ());
    let c2 = MarketplaceSettlementClient::new(&env, &cid2);
    let init_cfg = default_fee_config(&env, admin.clone());
    c2.initialize(&admin, &init_cfg);
    c2.update_fee_config(&cfg, &admin);
}

#[test]
fn test_update_fee_config_non_admin_fails() {
    use crate::types::FeeConfig;
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let cfg = FeeConfig {
        platform_fee_bps: 300,
        minimum_fee: 500,
        maximum_fee: 2_000_000,
        fee_recipient: admin.clone(),
        dynamic_fee_enabled: false,
        volume_discounts: soroban_sdk::Vec::new(&env),
        vip_exemptions: soroban_sdk::Vec::new(&env),
    };
    assert!(client.try_update_fee_config(&cfg, &attacker).is_err());
}

#[test]
fn test_get_user_volume_starts_zero() {
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let user = Address::generate(&env);
    assert_eq!(client.get_user_volume(&user), 0i128);
}

// ─── Royalty Distributor ─────────────────────────────────────────────────────

#[test]
fn test_set_and_get_royalty_info() {
    let (env, _cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    client.add_allowed_nft_contract(&admin, &nft);
    MockNftClient::new(&env, &nft).set_owner(&creator);

    client.set_royalty_info(&creator, &nft, &1u64, &creator, &500u64);
    let info = client.get_royalty_info(&nft, &1u64);
    assert_eq!(info.royalty_percentage, 500);
    assert_eq!(info.creator, creator);

    let _ = asset;
}

/// A caller with no claim on the token must not be able to install itself as
/// the royalty recipient. `mock_all_auths` is deliberately disabled here so the
/// ownership check, not the auth check, is what rejects the call.
#[test]
fn test_set_royalty_info_by_stranger_fails() {
    let (env, _cid, client, admin) = new_env();
    let nft = env.register(MockNft, ());
    let owner = Address::generate(&env);
    let stranger = Address::generate(&env);
    client.add_allowed_nft_contract(&admin, &nft);
    MockNftClient::new(&env, &nft).set_owner(&owner);

    // `mock_all_auths` is on for the whole test env; the ownership anchor is
    // what has to stop the stranger, so assert on the returned error.
    assert_eq!(
        client.try_set_royalty_info(&stranger, &nft, &1u64, &stranger, &500u64),
        Err(Ok(SettlementError::Unauthorized))
    );

    // And no configuration was written as a side effect.
    assert!(client.try_get_royalty_info(&nft, &1u64).is_err());
}

/// The marketplace admin may repair a royalty record it cannot own.
#[test]
fn test_set_royalty_info_by_admin_succeeds() {
    let (env, _cid, client, admin) = new_env();
    let nft = env.register(MockNft, ());
    let owner = Address::generate(&env);
    let creator = Address::generate(&env);
    client.add_allowed_nft_contract(&admin, &nft);
    MockNftClient::new(&env, &nft).set_owner(&owner);

    client.set_royalty_info(&admin, &nft, &1u64, &creator, &250u64);
    let info = client.get_royalty_info(&nft, &1u64);
    assert_eq!(info.creator, creator);
    assert_eq!(info.royalty_percentage, 250);
}

/// Royalty configurations are keyed by `(nft_contract, token_id)`.
///
/// The previous implementation built the storage key with a helper that
/// returned an empty `Bytes` regardless of its arguments, so every NFT shared
/// a single record: configuring token 1 overwrote the configuration for every
/// other token, and each read returned whatever was written last. This test
/// pins the isolation, which the old implementation could not satisfy.
#[test]
fn test_royalty_configs_are_isolated_per_token() {
    let (env, _cid, client, admin) = new_env();
    let nft_a = env.register(MockNft, ());
    let nft_b = env.register(MockNft, ());
    let creator_a = Address::generate(&env);
    let creator_b = Address::generate(&env);
    client.add_allowed_nft_contract(&admin, &nft_a);
    client.add_allowed_nft_contract(&admin, &nft_b);

    // The admin can configure either token, so the assertions isolate the
    // storage key rather than any per-caller ownership difference.
    client.set_royalty_info(&admin, &nft_a, &1u64, &creator_a, &500u64);
    client.set_royalty_info(&admin, &nft_a, &2u64, &creator_b, &1000u64);
    client.set_royalty_info(&admin, &nft_b, &1u64, &creator_b, &2000u64);

    let a1 = client.get_royalty_info(&nft_a, &1u64);
    let a2 = client.get_royalty_info(&nft_a, &2u64);
    let b1 = client.get_royalty_info(&nft_b, &1u64);

    assert_eq!(a1.royalty_percentage, 500);
    assert_eq!(a1.creator, creator_a);
    assert_eq!(a2.royalty_percentage, 1000);
    assert_eq!(a2.creator, creator_b);
    assert_eq!(b1.royalty_percentage, 2000);
    assert_eq!(b1.creator, creator_b);
}

/// An NFT with no recorded royalty must still be sellable.
///
/// Royalties are opt-in, but `calculate_royalties` used to propagate the
/// `NotFound` from `get_royalty_info`, which made `create_sale` revert for
/// every token on a deployment where no creator had configured one.
#[test]
fn test_create_sale_without_configured_royalty_succeeds() {
    let (env, _cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    // Deliberately register the allowlists without setting any royalty config.
    client.add_allowed_nft_contract(&admin, &nft);
    client.add_allowed_token_contract(&admin, &asset.contract);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    let sale = client.get_sale(&id);
    assert_eq!(sale.royalty_info.creator_percentage, 0);
    assert!(sale.royalty_info.amounts.contains_key(seller));
}

#[test]
fn test_royalty_exceeds_max_fails() {
    let (env, _cid, client, admin) = new_env();
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    client.add_allowed_nft_contract(&admin, &nft);
    MockNftClient::new(&env, &nft).set_owner(&creator);

    assert_eq!(
        client.try_set_royalty_info(&creator, &nft, &1u64, &creator, &5001u64),
        Err(Ok(SettlementError::InvalidRoyaltyPercentage))
    );
}

#[test]
fn test_get_royalty_not_found_fails() {
    let (env, cid, _client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let nft = Address::generate(&env);
    env.as_contract(&cid, || {
        assert_eq!(
            RoyaltyDistributor::get_royalty_info(&env, &nft, 99),
            Err(SettlementError::NotFound)
        );
    });
}

// ─── Trade ───────────────────────────────────────────────────────────────────

#[test]
fn test_create_trade_success() {
    let (env, _cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let initiator = Address::generate(&env);
    let offered = env.register(MockNft, ());
    client.add_allowed_nft_contract(&admin, &offered);
    MockNftClient::new(&env, &offered).set_owner(&initiator);

    let mut i_nfts = soroban_sdk::Vec::new(&env);
    i_nfts.push_back(NFTItem {
        nft_address: offered.clone(),
        token_id: 1,
    });
    let empty = soroban_sdk::Vec::new(&env);
    let id = client.create_trade(&initiator, &None, &i_nfts, &empty, &3600u64);
    assert!(id > 0);
    let _ = asset;
}

#[test]
fn test_create_trade_empty_nfts_fails() {
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let initiator = Address::generate(&env);
    let empty: soroban_sdk::Vec<crate::types::NFTItem> = soroban_sdk::Vec::new(&env);
    assert!(client
        .try_create_trade(&initiator, &None, &empty, &empty, &3600u64)
        .is_err());
}

/// A trade must move both sides. The previous `execute_trade` marked the trade
/// executed without transferring anything, so the chain recorded a completed
/// swap while every token stayed where it was.
#[test]
fn test_execute_trade_swaps_both_sides() {
    let (env, _cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let initiator = Address::generate(&env);
    let acceptor = Address::generate(&env);
    let offered = env.register(MockNft, ());
    let requested = env.register(MockNft, ());
    client.add_allowed_nft_contract(&admin, &offered);
    client.add_allowed_nft_contract(&admin, &requested);
    MockNftClient::new(&env, &offered).set_owner(&initiator);
    MockNftClient::new(&env, &requested).set_owner(&acceptor);

    let mut i_nfts = soroban_sdk::Vec::new(&env);
    i_nfts.push_back(NFTItem {
        nft_address: offered.clone(),
        token_id: 11,
    });
    let mut c_nfts = soroban_sdk::Vec::new(&env);
    c_nfts.push_back(NFTItem {
        nft_address: requested.clone(),
        token_id: 22,
    });

    let trade_id = client.create_trade(&initiator, &None, &i_nfts, &c_nfts, &3600u64);
    client.accept_trade(&trade_id, &acceptor);
    client.execute_trade(&trade_id, &initiator);

    assert_eq!(
        MockNftClient::new(&env, &offered).owner_of(&11u64),
        acceptor
    );
    assert_eq!(
        MockNftClient::new(&env, &requested).owner_of(&22u64),
        initiator
    );
    assert_eq!(
        client.get_trade(&trade_id).state,
        TransactionState::Executed
    );
    let _ = asset;
}

/// A directed offer may only be accepted by the account it names.
#[test]
fn test_accept_trade_rejects_wrong_counterparty() {
    let (env, _cid, client, admin) = new_env();
    let initiator = Address::generate(&env);
    let named = Address::generate(&env);
    let stranger = Address::generate(&env);
    let offered = env.register(MockNft, ());
    client.add_allowed_nft_contract(&admin, &offered);
    MockNftClient::new(&env, &offered).set_owner(&initiator);

    let mut i_nfts = soroban_sdk::Vec::new(&env);
    i_nfts.push_back(NFTItem {
        nft_address: offered.clone(),
        token_id: 5,
    });
    let empty = soroban_sdk::Vec::new(&env);
    let trade_id = client.create_trade(&initiator, &Some(named.clone()), &i_nfts, &empty, &3600u64);

    assert_eq!(
        client.try_accept_trade(&trade_id, &stranger),
        Err(Ok(SettlementError::Unauthorized))
    );
    client.accept_trade(&trade_id, &named);
    assert_eq!(client.get_trade(&trade_id).state, TransactionState::Funded);
}

/// Cancelling an accepted trade returns each side's escrowed items.
#[test]
fn test_cancel_funded_trade_refunds_both_sides() {
    let (env, _cid, client, admin) = new_env();
    let initiator = Address::generate(&env);
    let acceptor = Address::generate(&env);
    let offered = env.register(MockNft, ());
    let requested = env.register(MockNft, ());
    client.add_allowed_nft_contract(&admin, &offered);
    client.add_allowed_nft_contract(&admin, &requested);
    MockNftClient::new(&env, &offered).set_owner(&initiator);
    MockNftClient::new(&env, &requested).set_owner(&acceptor);

    let mut i_nfts = soroban_sdk::Vec::new(&env);
    i_nfts.push_back(NFTItem {
        nft_address: offered.clone(),
        token_id: 31,
    });
    let mut c_nfts = soroban_sdk::Vec::new(&env);
    c_nfts.push_back(NFTItem {
        nft_address: requested.clone(),
        token_id: 32,
    });

    let trade_id = client.create_trade(&initiator, &None, &i_nfts, &c_nfts, &3600u64);
    client.accept_trade(&trade_id, &acceptor);
    client.cancel_trade(&trade_id, &acceptor);

    assert_eq!(
        MockNftClient::new(&env, &offered).owner_of(&31u64),
        initiator
    );
    assert_eq!(
        MockNftClient::new(&env, &requested).owner_of(&32u64),
        acceptor
    );
    assert_eq!(
        client.get_trade(&trade_id).state,
        TransactionState::Cancelled
    );
}

/// A trade cannot be created for tokens the initiator does not own.
#[test]
fn test_create_trade_requires_ownership() {
    let (env, _cid, client, admin) = new_env();
    let initiator = Address::generate(&env);
    let owner = Address::generate(&env);
    let offered = env.register(MockNft, ());
    client.add_allowed_nft_contract(&admin, &offered);
    MockNftClient::new(&env, &offered).set_owner(&owner);

    let mut i_nfts = soroban_sdk::Vec::new(&env);
    i_nfts.push_back(NFTItem {
        nft_address: offered.clone(),
        token_id: 41,
    });
    let empty = soroban_sdk::Vec::new(&env);
    assert_eq!(
        client.try_create_trade(&initiator, &None, &i_nfts, &empty, &3600u64),
        Err(Ok(SettlementError::Unauthorized))
    );
}

// ─── Bundle ───────────────────────────────────────────────────────────────────

#[test]
fn test_create_bundle_success() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let creator = Address::generate(&env);
    let nft = env.register(MockNft, ());

    // Register NFT contract and add asset to whitelist
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    // Add the asset to supported assets list
    client.add_supported_asset(&admin, &asset);

    let mut items = soroban_sdk::Vec::new(&env);
    items.push_back(NFTItem {
        nft_address: nft,
        token_id: 1,
    });
    let id = client.create_bundle(&seller, &items, &500_000i128, &asset, &86400u64);
    assert!(id > 0);
}

/// A bundle is escrowed at creation: the tokens sit in the marketplace, so a
/// buyer can settle even if the seller never signs again.
#[test]
fn test_create_bundle_escrows_every_item() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft_a = env.register(MockNft, ());
    let nft_b = env.register(MockNft, ());
    let creator = Address::generate(&env);
    client.add_allowed_nft_contract(&admin, &nft_a);
    client.add_allowed_nft_contract(&admin, &nft_b);
    client.add_allowed_token_contract(&admin, &asset.contract);
    client.add_supported_asset(&admin, &asset);
    let _ = creator;

    MockNftClient::new(&env, &nft_a).set_owner(&seller);
    MockNftClient::new(&env, &nft_b).set_owner(&seller);

    let mut items = soroban_sdk::Vec::new(&env);
    items.push_back(NFTItem {
        nft_address: nft_a.clone(),
        token_id: 1,
    });
    items.push_back(NFTItem {
        nft_address: nft_b.clone(),
        token_id: 2,
    });

    client.create_bundle(&seller, &items, &500_000i128, &asset, &86400u64);

    assert_eq!(MockNftClient::new(&env, &nft_a).owner_of(&1u64), cid);
    assert_eq!(MockNftClient::new(&env, &nft_b).owner_of(&2u64), cid);
}

/// Executing a bundle must move the payment and every token, and must do both
/// exactly once. The previous implementation had no `execute_bundle` at all,
/// while the API client already called it.
#[test]
fn test_execute_bundle_settles_and_releases_items() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let nft = env.register(MockNft, ());
    client.add_allowed_nft_contract(&admin, &nft);
    client.add_allowed_token_contract(&admin, &asset.contract);
    client.add_supported_asset(&admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let mut items = soroban_sdk::Vec::new(&env);
    items.push_back(NFTItem {
        nft_address: nft.clone(),
        token_id: 7,
    });
    let bundle_id = client.create_bundle(&seller, &items, &500_000i128, &asset, &86400u64);

    let result = client.execute_bundle(&bundle_id, &buyer, &500_000i128);
    assert!(result.success);
    assert!(result.transferred_nft);
    assert!(result.transferred_payment);

    assert_eq!(MockNftClient::new(&env, &nft).owner_of(&7u64), buyer);
    let bundle = client.get_bundle(&bundle_id);
    assert_eq!(bundle.state, TransactionState::Executed);

    // A second execution must not move anything again.
    assert!(client
        .try_execute_bundle(&bundle_id, &buyer, &500_000i128)
        .is_err());
    assert_eq!(MockNftClient::new(&env, &nft).owner_of(&7u64), buyer);
    let _ = cid;
}

/// Cancelling returns the escrowed items instead of stranding them.
#[test]
fn test_cancel_bundle_returns_items_to_seller() {
    let (env, _cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    client.add_allowed_nft_contract(&admin, &nft);
    client.add_allowed_token_contract(&admin, &asset.contract);
    client.add_supported_asset(&admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let mut items = soroban_sdk::Vec::new(&env);
    items.push_back(NFTItem {
        nft_address: nft.clone(),
        token_id: 9,
    });
    let bundle_id = client.create_bundle(&seller, &items, &500_000i128, &asset, &86400u64);
    client.cancel_bundle(&bundle_id, &seller);

    assert_eq!(MockNftClient::new(&env, &nft).owner_of(&9u64), seller);
    assert_eq!(
        client.get_bundle(&bundle_id).state,
        TransactionState::Cancelled
    );
}

/// The same token cannot be listed twice in one bundle, and a non-owner cannot
/// list someone else's token.
#[test]
fn test_create_bundle_rejects_duplicates_and_non_owner() {
    let (env, _cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let stranger = Address::generate(&env);
    let nft = env.register(MockNft, ());
    client.add_allowed_nft_contract(&admin, &nft);
    client.add_allowed_token_contract(&admin, &asset.contract);
    client.add_supported_asset(&admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let mut duplicated = soroban_sdk::Vec::new(&env);
    duplicated.push_back(NFTItem {
        nft_address: nft.clone(),
        token_id: 3,
    });
    duplicated.push_back(NFTItem {
        nft_address: nft.clone(),
        token_id: 3,
    });
    assert_eq!(
        client.try_create_bundle(&seller, &duplicated, &500_000i128, &asset, &86400u64),
        Err(Ok(SettlementError::AlreadyExists))
    );

    let mut single = soroban_sdk::Vec::new(&env);
    single.push_back(NFTItem {
        nft_address: nft.clone(),
        token_id: 3,
    });
    assert_eq!(
        client.try_create_bundle(&stranger, &single, &500_000i128, &asset, &86400u64),
        Err(Ok(SettlementError::Unauthorized))
    );
}

#[test]
fn test_create_bundle_empty_items_fails() {
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let empty: soroban_sdk::Vec<crate::types::NFTItem> = soroban_sdk::Vec::new(&env);
    assert!(client
        .try_create_bundle(&seller, &empty, &500_000i128, &_asset, &86400u64)
        .is_err());
}

// ─── Emergency Withdrawal ────────────────────────────────────────────────────

#[test]
fn test_emergency_withdraw_non_admin_fails() {
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let attacker = Address::generate(&env);
    let reason = Bytes::from_slice(&env, b"stuck");
    assert!(client
        .try_emergency_withdraw(&1u64, &reason, &attacker)
        .is_err());
}

#[test]
fn test_emergency_withdrawal_disabled_by_default() {
    let (env, _cid, client, admin) = new_env();
    let reason = Bytes::from_slice(&env, b"stuck");
    // Emergency withdrawal must start disabled: even the admin cannot
    // withdraw until it has been explicitly enabled.
    assert!(client
        .try_emergency_withdraw(&1u64, &reason, &admin)
        .is_err());
}

#[test]
fn test_admin_can_toggle_emergency_withdrawal() {
    let (env, _cid, client, admin) = new_env();

    // Enable the capability; withdrawal itself still requires a real stuck
    // transaction, so only the toggle is asserted here.
    client.set_emergency_withdrawal(&admin, &true);

    // Non-admin cannot toggle the capability.
    let attacker = Address::generate(&env);
    assert!(client
        .try_set_emergency_withdrawal(&attacker, &true)
        .is_err());
}

#[test]
fn test_supported_assets_are_capped() {
    let (env, _cid, client, admin) = new_env();
    // Fill the whitelist up to MAX_SUPPORTED_ASSETS (64). Each mk_asset
    // registers a fresh MockToken contract, so every asset is distinct.
    for _ in 0..64u32 {
        client.add_supported_asset(&admin, &mk_asset(&env));
    }
    // Adding one more must fail instead of growing the unbounded Vec.
    let result = client.try_add_supported_asset(&admin, &mk_asset(&env));
    assert!(result.is_err());
}

#[test]
fn test_reentrancy_guard_emergency_withdraw() {
    let (env, cid, client, admin) = new_env();
    client.set_emergency_withdrawal(&admin, &true);
    env.as_contract(&cid, || {
        env.storage()
            .instance()
            .set(&soroban_sdk::symbol_short!("reentrant"), &true);
    });
    let reason = Bytes::from_slice(&env, b"test");
    assert!(client
        .try_emergency_withdraw(&1u64, &reason, &admin)
        .is_err());
}

#[test]
fn test_reentrancy_guard_update_fee_config() {
    use crate::types::FeeConfig;
    let (env, cid, client, admin) = new_env();
    env.as_contract(&cid, || {
        env.storage()
            .instance()
            .set(&soroban_sdk::symbol_short!("reentrant"), &true);
    });
    let cfg = FeeConfig {
        platform_fee_bps: 300,
        minimum_fee: 500,
        maximum_fee: 2_000_000,
        fee_recipient: admin.clone(),
        dynamic_fee_enabled: false,
        volume_discounts: soroban_sdk::Vec::new(&env),
        vip_exemptions: soroban_sdk::Vec::new(&env),
    };
    assert!(client.try_update_fee_config(&cfg, &admin).is_err());
}

#[test]
fn test_reentrancy_guard_withdraw_platform_fees() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let recipient = Address::generate(&env);
    env.as_contract(&cid, || {
        env.storage()
            .instance()
            .set(&soroban_sdk::symbol_short!("reentrant"), &true);
    });
    assert!(client
        .try_withdraw_platform_fees(&asset, &recipient, &admin)
        .is_err());
}

// ─── Commit-Reveal ───────────────────────────────────────────────────────────

#[test]
fn test_reveal_wrong_salt_fails() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &_asset,
    );
    let commitment = Bytes::from_slice(&env, b"commitment_hash");
    client.place_bid(&id, &bidder, &110_000i128, &Some(commitment));
    let wrong_salt = Bytes::from_slice(&env, b"wrong_salt");
    assert!(client
        .try_reveal_bid(&id, &bidder, &110_000i128, &wrong_salt)
        .is_err());
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

#[test]
fn test_cleanup_expired_commitments() {
    let (_env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&_env);
    client.cleanup_expired_commitments();
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

#[test]
fn test_rate_limiter_defaults_and_cooldown_active() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    for _ in 0..10 {
        let _id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    }

    // The 11th call must fail with CooldownActive
    let res = client.try_create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);

    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::CooldownActive);
    } else {
        panic!("Expected Err(Ok(CooldownActive)), got: {:?}", res);
    }
}

#[test]
fn test_rate_limiter_independent_users_and_functions() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller_1 = Address::generate(&env);
    let seller_2 = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller_1);

    for _ in 0..10 {
        let _id = client.create_sale(&seller_1, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    }

    let res = client.try_create_sale(&seller_1, &nft, &1u64, &1_000_000i128, &asset, &86400u64);

    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::CooldownActive);
    } else {
        panic!("Expected Err(Ok(CooldownActive)), got: {:?}", res);
    }

    // seller_2 should NOT be blocked
    MockNftClient::new(&env, &nft).set_owner(&seller_2);
    let id_2 = client.create_sale(&seller_2, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert!(id_2 > 0);

    // seller_1 can still create_auction
    let auc_id = client.create_auction(
        &seller_1,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &asset,
    );
    assert!(auc_id > 0);
}

#[test]
fn test_rate_limiter_window_reset() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    for _ in 0..10 {
        let _id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    }

    let res = client.try_create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);

    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::CooldownActive);
    } else {
        panic!("Expected Err(Ok(CooldownActive)), got: {:?}", res);
    }

    // Move ledger time forward by 60 seconds
    let new_timestamp = env.ledger().timestamp() + 61;
    env.ledger().set_timestamp(new_timestamp);

    // Now it should succeed again!
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert!(id > 0);
}

/// `update_rate_limit` must not accept a caller who merely names the admin.
///
/// The address comparison alone passed for anyone who supplied the admin's
/// public address; only the missing `require_auth()` stood between an
/// unauthenticated caller and the marketplace's abuse controls. Auth mocking is
/// cleared for this test so a genuinely unauthorized call is exercised.
#[test]
fn test_update_rate_limit_requires_admin_authorization() {
    let (env, _cid, client, admin) = new_env();
    let function = Symbol::new(&env, "place_bid");

    env.mock_auths(&[]);
    assert!(client
        .try_update_rate_limit(&function, &2u32, &30u64, &admin)
        .is_err());

    // The default configuration must be untouched after the rejected call.
    let config = client.get_rate_limit_config(&function).unwrap();
    assert_eq!(config.limit, 5);
    assert_eq!(config.window_seconds, 60);
}

/// Degenerate rate-limit windows must be rejected: `check_rate_limit` treats a
/// zero-length window as "always a new window", which disables the limiter.
#[test]
fn test_update_rate_limit_rejects_degenerate_config() {
    let (env, _cid, client, admin) = new_env();
    let function = Symbol::new(&env, "place_bid");

    assert_eq!(
        client.try_update_rate_limit(&function, &0u32, &60u64, &admin),
        Err(Ok(SettlementError::InvalidAmount))
    );
    assert_eq!(
        client.try_update_rate_limit(&function, &5u32, &0u64, &admin),
        Err(Ok(SettlementError::InvalidAmount))
    );
}

#[test]
fn test_rate_limiter_admin_update_config() {
    let (env, _cid, _client, _admin) = new_env();
    let admin = Address::generate(&env);
    let asset = mk_asset(&env);

    // Setup known admin (using second client initialized with admin)
    let cid2 = env.register(MarketplaceSettlement, ());
    let c2 = MarketplaceSettlementClient::new(&env, &cid2);
    let init_cfg = default_fee_config(&env, admin.clone());
    c2.initialize(&admin, &init_cfg);

    let bidder = Address::generate(&env);
    let seller = Address::generate(&env);
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);
    reg(&env, &cid2, &nft, &creator, &admin, &asset);

    let id = c2.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &asset,
    );

    // Default rate limit for place_bid is 5 calls / 60s
    // Admin updates limit to 2 calls / 30s
    let place_bid_sym = Symbol::new(&env, "place_bid");
    c2.update_rate_limit(&place_bid_sym, &2u32, &30u64, &admin);

    // Retrieve config to verify update
    let config_opt = c2.get_rate_limit_config(&place_bid_sym);
    assert!(config_opt.is_some());
    let cfg = config_opt.unwrap();
    assert_eq!(cfg.limit, 2u32);
    assert_eq!(cfg.window_seconds, 30u64);

    // place 2 bids successfully
    c2.place_bid(&id, &bidder, &110_000i128, &None);
    c2.place_bid(&id, &bidder, &120_000i128, &None);

    // 3rd bid should fail under new configuration
    let res = c2.try_place_bid(&id, &bidder, &130_000i128, &None);

    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::CooldownActive);
    } else {
        panic!("Expected Err(Ok(CooldownActive)), got: {:?}", res);
    }
}

#[test]
fn test_minimum_bid_increment_enforcement() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    // Create auction with 100 starting price and 1% bid increment (100 bps)
    let auction_id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128, // 1% of starting price
        &AuctionType::English,
        &asset,
    );

    // First bid at starting price should succeed
    client.place_bid(&auction_id, &bidder, &100_000i128, &None);

    // Second bid with only 0.5% increment should fail (below 1% minimum)
    let res = client.try_place_bid(&auction_id, &bidder, &100_500i128, &None);
    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::BidBelowMinimumIncrement);
    } else {
        panic!("Expected Err(Ok(BidBelowMinimumIncrement)), got: {:?}", res);
    }

    // Bid with 1% increment should succeed
    client.place_bid(&auction_id, &bidder, &101_000i128, &None);
}

#[test]
fn test_auction_bid_increment_validation_on_creation() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    // Try to create auction with bid_increment below minimum (0.5% instead of 1%)
    let res = client.try_create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &500i128, // 0.5% of starting price - should fail
        &AuctionType::English,
        &asset,
    );

    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::InvalidBidIncrement);
    } else {
        panic!("Expected Err(Ok(InvalidBidIncrement)), got: {:?}", res);
    }

    // Create auction with valid bid_increment (1%)
    let auction_id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128, // 1% of starting price - should succeed
        &AuctionType::English,
        &asset,
    );
    assert!(auction_id > 0);
}

#[test]
fn test_admin_update_min_bid_increment() {}
