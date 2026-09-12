//! Tests pinning the error codes that had no branch returning them before.
//!
//! The main suite asserts `is_err()`, which cannot tell a caller *which* failure
//! happened. These tests pin the exact code so a refactor that collapses two
//! conditions back onto one error is caught.

use crate::collection::{NftCollection, NftCollectionClient};
use crate::error::ContractError;
use crate::storage::DataKey;
use crate::types::CollectionConfig;
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

fn config(env: &Env, admin: &Address) -> CollectionConfig {
    CollectionConfig {
        name: String::from_str(env, "Test NFT"),
        symbol: String::from_str(env, "TNFT"),
        description: String::from_str(env, "Test Description"),
        base_uri: String::from_str(env, "https://test.com/"),
        max_supply: Some(100),
        is_public_mint: true,
        royalty_percentage: 500,
        royalty_recipient: admin.clone(),
    }
}

/// Register a collection. The admin is returned because `init` makes it the
/// only minter, so it is the address a mint has to come from.
fn collection(env: &Env) -> (Address, NftCollectionClient<'_>, Address) {
    let id = env.register(NftCollection, ());
    let client = NftCollectionClient::new(env, &id);
    let admin = Address::generate(env);
    client.init(&admin, &Address::generate(env), &config(env, &admin));
    (id, client, admin)
}

fn uri(env: &Env) -> String {
    String::from_str(env, "ipfs://token")
}

#[test]
fn minting_to_the_collection_itself_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (id, client, admin) = collection(&env);

    let res = client.try_mint(&admin, &id, &1u32, &uri(&env), &Vec::new(&env));
    assert_code!(res, ContractError::InvalidRecipient);
}

#[test]
fn transferring_to_the_collection_itself_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (id, client, admin) = collection(&env);
    let owner = Address::generate(&env);

    client.mint(&admin, &owner, &1u32, &uri(&env), &Vec::new(&env));
    let res = client.try_transfer(&owner, &id, &1u32);
    assert_code!(res, ContractError::InvalidRecipient);
}

#[test]
fn minting_on_a_collection_that_was_never_initialised_is_reported() {
    // The factory always calls `init` right after deploying, but the wasm can be
    // deployed directly. That used to fail on an `unwrap` with no diagnostic.
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(NftCollection, ());
    let client = NftCollectionClient::new(&env, &id);
    let caller = Address::generate(&env);

    let res = client.try_mint(&caller, &caller, &1u32, &uri(&env), &Vec::new(&env));
    assert_code!(res, ContractError::CollectionNotFound);
}

#[test]
fn burning_a_token_whose_balance_is_missing_reports_the_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let (id, client, admin) = collection(&env);
    let owner = Address::generate(&env);

    client.mint(&admin, &owner, &1u32, &uri(&env), &Vec::new(&env));
    // Corrupt the balance the way a bad migration would, leaving the owner
    // entry in place: the burn must report the missing balance rather than
    // panicking on the subtraction.
    env.as_contract(&id, || {
        env.storage()
            .instance()
            .set(&DataKey::Balance(owner.clone(), 1u32), &0u32);
    });

    let res = client.try_burn(&owner, &1u32);
    assert_code!(res, ContractError::InsufficientBalance);
}
