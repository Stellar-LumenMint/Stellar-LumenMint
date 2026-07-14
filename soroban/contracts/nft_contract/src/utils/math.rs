use crate::error::ContractError;
use soroban_sdk::Env;

/// Multiply two u64 values with overflow protection.
/// Returns ContractError::ArithmeticError on overflow.
pub fn checked_mul_u64(env: &Env, a: u64, b: u64) -> Result<u64, ContractError> {
    a.checked_mul(b).ok_or_else(|| {
        soroban_sdk::log!(env, "checked_mul_u64 overflow: {} * {}", a, b);
        ContractError::ArithmeticError
    })
}

/// Multiply two i128 values with overflow protection.
/// Returns ContractError::ArithmeticError on overflow.
pub fn checked_mul_i128(env: &Env, a: i128, b: i128) -> Result<i128, ContractError> {
    a.checked_mul(b).ok_or_else(|| {
        soroban_sdk::log!(env, "checked_mul_i128 overflow: {} * {}", a, b);
        ContractError::ArithmeticError
    })
}

/// Add two u64 values with overflow protection.
pub fn checked_add_u64(env: &Env, a: u64, b: u64) -> Result<u64, ContractError> {
    a.checked_add(b).ok_or_else(|| {
        soroban_sdk::log!(env, "checked_add_u64 overflow: {} + {}", a, b);
        ContractError::ArithmeticError
    })
}

/// Add two i128 values with overflow protection.
pub fn checked_add_i128(env: &Env, a: i128, b: i128) -> Result<i128, ContractError> {
    a.checked_add(b).ok_or_else(|| {
        soroban_sdk::log!(env, "checked_add_i128 overflow: {} + {}", a, b);
        ContractError::ArithmeticError
    })
}

/// Subtract b from a with underflow protection.
pub fn checked_sub_u64(env: &Env, a: u64, b: u64) -> Result<u64, ContractError> {
    a.checked_sub(b).ok_or_else(|| {
        soroban_sdk::log!(env, "checked_sub_u64 underflow: {} - {}", a, b);
        ContractError::ArithmeticError
    })
}

/// Subtract b from a with underflow protection.
pub fn checked_sub_i128(env: &Env, a: i128, b: i128) -> Result<i128, ContractError> {
    a.checked_sub(b).ok_or_else(|| {
        soroban_sdk::log!(env, "checked_sub_i128 underflow: {} - {}", a, b);
        ContractError::ArithmeticError
    })
}

/// Divide a by b with division-by-zero protection.
pub fn checked_div_i128(env: &Env, a: i128, b: i128) -> Result<i128, ContractError> {
    if b == 0 {
        soroban_sdk::log!(env, "checked_div_i128: division by zero");
        return Err(ContractError::ArithmeticError);
    }
    a.checked_div(b).ok_or_else(|| {
        soroban_sdk::log!(env, "checked_div_i128 overflow: {} / {}", a, b);
        ContractError::ArithmeticError
    })
}

/// Compute royalty amount: (price * basis_points) / 10000
/// All arithmetic is checked for overflow.
pub fn compute_royalty(
    env: &Env,
    sale_price: i128,
    basis_points: u32,
) -> Result<i128, ContractError> {
    let bps = basis_points as i128;
    let numerator = checked_mul_i128(env, sale_price, bps)?;
    checked_div_i128(env, numerator, 10_000)
}

/// Compute platform fee: (amount * fee_bps) / 10000
/// Clamped between minimum_fee and maximum_fee.
pub fn compute_platform_fee(
    env: &Env,
    amount: i128,
    fee_bps: u64,
    minimum_fee: i128,
    maximum_fee: i128,
) -> Result<i128, ContractError> {
    let fee = compute_royalty(env, amount, fee_bps as u32)?;
    Ok(fee.clamp(minimum_fee, maximum_fee))
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_compute_royalty() {
        let env = Env::default();
        // 5% of 10000 = 500
        assert_eq!(compute_royalty(&env, 10_000, 500).unwrap(), 500);
        // 0% = 0
        assert_eq!(compute_royalty(&env, 10_000, 0).unwrap(), 0);
        // 100% = 10000
        assert_eq!(compute_royalty(&env, 10_000, 10_000).unwrap(), 10_000);
    }

    #[test]
    fn test_checked_mul_u64_overflow() {
        let env = Env::default();
        assert!(checked_mul_u64(&env, u64::MAX, 2).is_err());
        assert_eq!(checked_mul_u64(&env, 10, 20).unwrap(), 200);
    }

    #[test]
    fn test_checked_div_by_zero() {
        let env = Env::default();
        assert!(checked_div_i128(&env, 100, 0).is_err());
        assert_eq!(checked_div_i128(&env, 100, 4).unwrap(), 25);
    }

    #[test]
    fn test_checked_add_overflow() {
        let env = Env::default();
        assert!(checked_add_u64(&env, u64::MAX, 1).is_err());
    }

    #[test]
    fn test_checked_sub_underflow() {
        let env = Env::default();
        assert!(checked_sub_u64(&env, 0, 1).is_err());
        assert_eq!(checked_sub_u64(&env, 10, 3).unwrap(), 7);
    }

    #[test]
    fn test_compute_platform_fee_clamping() {
        let env = Env::default();
        // 2.5% of 1000 = 25, clamp between 10 and 50
        assert_eq!(
            compute_platform_fee(&env, 1000, 250, 10, 50).unwrap(),
            25
        );
        // Below minimum
        assert_eq!(
            compute_platform_fee(&env, 1000, 250, 30, 50).unwrap(),
            30
        );
        // Above maximum
        assert_eq!(
            compute_platform_fee(&env, 1000, 250, 10, 20).unwrap(),
            20
        );
    }
}
