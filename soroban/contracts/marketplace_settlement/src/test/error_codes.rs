//! One test per error code that previously had no branch returning it, plus the
//! pause module, which had no coverage at all.
//!
//! The main suite mostly asserts `is_err()`, which cannot tell a caller *which*
//! failure happened. These tests pin the exact code, so a refactor that
//! collapses two conditions back onto one error is caught here.

use super::{mk_asset, new_env, reg, MockNft, MockNftClient};
use crate::error::SettlementError;
use crate::types::{AuctionType, NFTItem};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Bytes, Env, Symbol, Vec,
};

macro_rules! assert_code {
    ($res:expr, $expected:expr) => {{
        let res = $res;
        if let Err(Ok(e)) = res {
            let e: SettlementError = e;
            assert_eq!(e, $expected, "unexpected error code");
        } else {
            panic!("expected {:?}, got {:?}", $expected, res);
        }
    }};
}

fn modules(env: &Env, name: &str) -> Vec<Symbol> {
    Vec::from_array(env, [Symbol::new(env, name)])
}

fn reason(env: &Env) -> Bytes {
    Bytes::from_slice(env, b"maintenance")
}

/// Create an auction over a mock NFT owned by `seller`.
fn auction(
    env: &Env,
    cid: &Address,
    client: &super::MarketplaceSettlementClient,
    admin: &Address,
) -> (Address, u64) {
    let asset = mk_asset(env);
    let seller = Address::generate(env);
    let nft = env.register(MockNft, ());
    reg(env, cid, &nft, &seller, admin, &asset);
    MockNftClient::new(env, &nft).set_owner(&seller);

    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &0i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &asset,
    );
    (seller, id)
}

// ─── Pause ───────────────────────────────────────────────────────────────────

#[test]
fn unpausing_when_the_contract_is_not_paused_is_reported() {
    let (_env, _cid, client, admin) = new_env();
    let res = client.try_unpause_contract(&admin, &None);
    assert_code!(res, SettlementError::NotPaused);
}

#[test]
fn cancelling_a_pause_that_was_never_scheduled_is_reported() {
    let (_env, _cid, client, admin) = new_env();
    let res = client.try_cancel_scheduled_pause(&admin);
    assert_code!(res, SettlementError::PauseNotScheduled);
}

#[test]
fn executing_a_pause_that_was_never_scheduled_is_reported() {
    let (_env, _cid, client, admin) = new_env();
    let res = client.try_execute_scheduled_pause(&admin);
    assert_code!(res, SettlementError::PauseNotScheduled);
}

#[test]
fn scheduling_a_second_pause_is_reported() {
    let (env, _cid, client, admin) = new_env();
    client.schedule_pause(&admin, &3600u64, &modules(&env, "sales"), &reason(&env));

    let res = client.try_schedule_pause(&admin, &3600u64, &modules(&env, "sales"), &reason(&env));
    assert_code!(res, SettlementError::PauseAlreadyScheduled);
}

#[test]
fn executing_a_scheduled_pause_before_its_timelock_is_reported() {
    let (env, _cid, client, admin) = new_env();
    client.schedule_pause(&admin, &3600u64, &modules(&env, "sales"), &reason(&env));

    let res = client.try_execute_scheduled_pause(&admin);
    assert_code!(res, SettlementError::PauseTimelockActive);
}

#[test]
fn a_scheduled_pause_can_be_cancelled_and_then_executed_for_real() {
    // The happy path, so the tests above cannot pass by the pause never working.
    let (env, _cid, client, admin) = new_env();
    let reason_bytes = reason(&env);
    client.schedule_pause(&admin, &3600u64, &modules(&env, "sales"), &reason_bytes);
    client.cancel_scheduled_pause(&admin);
    assert!(!client.is_timelock_active());

    client.schedule_pause(&admin, &3600u64, &modules(&env, "sales"), &reason_bytes);
    env.ledger().with_mut(|l| l.timestamp += 3600);
    client.execute_scheduled_pause(&admin);
    assert!(client.is_paused());
    assert!(client.is_module_paused(&Symbol::new(&env, "sales")));
}

#[test]
fn a_paused_module_blocks_only_that_module() {
    let (env, _cid, client, admin) = new_env();
    client.pause_contract(&admin, &None, &Some(modules(&env, "sales")));

    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());

    let res = client.try_create_sale(&seller, &nft, &1u64, &1000i128, &asset, &3600u64);
    assert_code!(res, SettlementError::ModulePaused);
}

#[test]
fn a_global_pause_reports_the_contract_rather_than_a_module() {
    let (env, _cid, client, admin) = new_env();
    // No module list means "all", which is a contract-wide stop.
    client.pause_contract(&admin, &None, &None);

    let res = client.try_cancel_transaction(&1u64, &Symbol::new(&env, "sale"), &admin);
    assert_code!(res, SettlementError::ContractPaused);
}

// ─── Admin and auction ───────────────────────────────────────────────────────

#[test]
fn emergency_withdrawal_is_off_until_it_is_enabled() {
    let (env, _cid, client, admin) = new_env();
    let res = client.try_emergency_withdraw(&1u64, &reason(&env), &admin);
    assert_code!(res, SettlementError::EmergencyWithdrawalDisabled);
}

#[test]
fn revealing_a_bid_when_commit_reveal_is_off_is_reported() {
    let (env, _cid, client, _admin) = new_env();
    let bidder = Address::generate(&env);

    let res = client.try_reveal_bid(&1u64, &bidder, &1000i128, &Bytes::from_slice(&env, b"salt"));
    assert_code!(res, SettlementError::CommitRevealDisabled);
}

#[test]
fn selling_through_an_unregistered_nft_contract_is_reported() {
    let (env, _cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    // Allowlist the payment asset only; the NFT contract stays unknown.
    client.add_allowed_token_contract(&admin, &asset.contract);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let res = client.try_create_sale(&seller, &nft, &1u64, &1000i128, &asset, &3600u64);
    assert_code!(res, SettlementError::NftNotSupported);
}

#[test]
fn accepting_your_own_trade_offer_is_reported() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let initiator = Address::generate(&env);
    let nft = env.register(MockNft, ());
    reg(&env, &cid, &nft, &initiator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&initiator);

    let items = Vec::from_array(
        &env,
        [NFTItem {
            nft_address: nft.clone(),
            token_id: 1u64,
        }],
    );
    let trade_id = client.create_trade(
        &initiator,
        &None,
        &items,
        &Vec::<NFTItem>::new(&env),
        &3600u64,
    );

    let res = client.try_accept_trade(&trade_id, &initiator);
    assert_code!(res, SettlementError::SelfTradeNotAllowed);
}

#[test]
fn withdrawing_a_bid_while_the_auction_is_still_running_is_reported() {
    let (env, cid, client, admin) = new_env();
    let (seller, auction_id) = auction(&env, &cid, &client, &admin);

    let res = client.try_withdraw_losing_bid(&auction_id, &seller);
    assert_code!(res, SettlementError::AuctionStillPending);
}

#[test]
fn a_bidless_auction_can_be_cancelled_by_its_seller() {
    let (env, cid, client, admin) = new_env();
    let (seller, auction_id) = auction(&env, &cid, &client, &admin);

    client.cancel_transaction(&auction_id, &Symbol::new(&env, "auction"), &seller);
    assert_eq!(
        client.get_auction(&auction_id).state,
        crate::types::TransactionState::Cancelled
    );
}

#[test]
fn cancelling_an_auction_that_already_has_bids_is_reported() {
    let (env, cid, client, admin) = new_env();
    let (seller, auction_id) = auction(&env, &cid, &client, &admin);
    let bidder = Address::generate(&env);
    client.place_bid(&auction_id, &bidder, &100_000i128, &None);

    let res = client.try_cancel_transaction(&auction_id, &Symbol::new(&env, "auction"), &seller);
    assert_code!(res, SettlementError::AuctionHasBids);
}

#[test]
fn cancelling_an_unknown_transaction_type_is_reported() {
    let (env, _cid, client, admin) = new_env();
    let res = client.try_cancel_transaction(&1u64, &Symbol::new(&env, "nonsense"), &admin);
    assert_code!(res, SettlementError::NotFound);
}
