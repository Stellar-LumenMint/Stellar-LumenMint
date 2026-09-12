//! One test per error code that previously had no branch returning it.
//!
//! The main suite asserts `is_err()`, which cannot tell a caller *which* failure
//! happened. These tests pin the exact code, so a change that collapses two
//! conditions back onto one error is caught.

use super::setup;
use crate::error::ContractError;
use crate::storage::MAX_BATCH_SIZE;
use crate::types::role;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

macro_rules! assert_code {
    ($res:expr, $expected:expr) => {{
        let res = $res;
        if let Err(Ok(e)) = res {
            let e: ContractError = e;
            assert_eq!(e, $expected, "unexpected error code");
        } else {
            panic!("expected {:?}, got {:?}", $expected, res);
        }
    }};
}

fn uri(env: &Env) -> String {
    String::from_str(env, "ipfs://token")
}

#[test]
fn minting_to_the_contract_itself_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    let res = client.try_mint(&admin, &client.address, &uri(&env), &Vec::new(&env), &None);
    assert_code!(res, ContractError::InvalidRecipient);
}

#[test]
fn minting_with_an_empty_uri_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let to = Address::generate(&env);

    let res = client.try_mint(
        &admin,
        &to,
        &String::from_str(&env, ""),
        &Vec::new(&env),
        &None,
    );
    assert_code!(res, ContractError::InvalidUri);
}

#[test]
fn an_empty_batch_mint_is_rejected_as_a_size_problem() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    let res = client.try_batch_mint(&admin, &Vec::new(&env), &Vec::new(&env), &Vec::new(&env));
    assert_code!(res, ContractError::InvalidBatchSize);
}

#[test]
fn a_batch_mint_over_the_limit_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    let mut recipients = Vec::new(&env);
    let mut uris = Vec::new(&env);
    let mut attrs = Vec::new(&env);
    for _ in 0..=MAX_BATCH_SIZE {
        recipients.push_back(Address::generate(&env));
        uris.push_back(uri(&env));
        attrs.push_back(Vec::new(&env));
    }

    let res = client.try_batch_mint(&admin, &recipients, &uris, &attrs);
    assert_code!(res, ContractError::BatchTooLarge);
}

#[test]
fn an_empty_batch_transfer_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let to = Address::generate(&env);

    let res = client.try_batch_transfer(&admin, &admin, &to, &Vec::<u64>::new(&env));
    assert_code!(res, ContractError::InvalidBatchSize);
}

#[test]
fn an_empty_batch_burn_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    let res = client.try_batch_burn(&admin, &Vec::<u64>::new(&env));
    assert_code!(res, ContractError::InvalidBatchSize);
}

#[test]
fn transferring_to_the_contract_itself_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let owner = Address::generate(&env);

    let id = client.mint(&admin, &owner, &uri(&env), &Vec::new(&env), &None);
    let res = client.try_transfer(&owner, &owner, &client.address, &id);
    assert_code!(res, ContractError::InvalidRecipient);
}

#[test]
fn updating_a_uri_to_empty_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let owner = Address::generate(&env);

    let id = client.mint(&admin, &owner, &uri(&env), &Vec::new(&env), &None);
    let res = client.try_set_token_uri(&owner, &id, &String::from_str(&env, ""));
    assert_code!(res, ContractError::InvalidUri);
}

#[test]
fn granting_a_role_twice_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let minter = Address::generate(&env);

    client.grant_role(&admin, &minter, &role::MINTER);
    let res = client.try_grant_role(&admin, &minter, &role::MINTER);
    assert_code!(res, ContractError::RoleAlreadyGranted);
}

#[test]
fn revoking_a_role_nobody_holds_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let stranger = Address::generate(&env);

    let res = client.try_revoke_role(&admin, &stranger, &role::BURNER);
    assert_code!(res, ContractError::RoleNotGranted);
}

#[test]
fn a_role_grant_that_is_already_in_place_does_not_hide_a_real_one() {
    // Guard against a fix that makes `grant_role` succeed unconditionally: a
    // role granted to a *different* address must still go through.
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let a = Address::generate(&env);
    let b = Address::generate(&env);

    client.grant_role(&admin, &a, &role::MINTER);
    client.grant_role(&admin, &b, &role::MINTER);
    assert!(client.has_role(&a, &role::MINTER));
    assert!(client.has_role(&b, &role::MINTER));
    // An unknown role discriminator is a distinct slot, so it is not a duplicate.
    client.grant_role(&admin, &a, &999u32);
    assert!(client.has_role(&a, &999u32));
}
