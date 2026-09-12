use crate::types::Operation;
use soroban_sdk::{Env, Vec};

// Returns true when all dependencies of `operation` are already completed.
pub fn dependencies_satisfied(completed_operation_ids: &Vec<u64>, operation: &Operation) -> bool {
    for dep in operation.dependencies.iter() {
        if !completed_operation_ids.contains(dep) {
            return false;
        }
    }
    true
}

/// Order operations so every dependency runs before the operation that needs it.
///
/// This previously returned the operations in insertion order, which made the
/// executor's `dependencies_satisfied` check a trap: a transaction whose
/// operations were added in any order other than the dependency order failed
/// with `DependencyNotMet` even though a valid order existed. Declaring `C`
/// before the `A` it depends on is normal when the operations come from
/// different subsystems, so this rejected structurally valid transactions.
///
/// Kahn's algorithm, always taking the lowest-numbered available operation, so
/// the result is deterministic for a given input — a vertex with several
/// equally-valid positions always lands in the same one.
///
/// If some operations cannot be placed — a dependency cycle, or a dependency on
/// an id that was never added — they are appended in their original order
/// rather than dropped. The executor then reports `DependencyNotMet`, so the
/// transaction fails loudly instead of silently running a subset.
pub fn resolve_execution_order(env: &Env, operations: &Vec<Operation>) -> Vec<Operation> {
    let mut ordered = Vec::new(env);
    let mut completed_ids: Vec<u64> = Vec::new(env);
    let mut placed_ids: Vec<u64> = Vec::new(env);

    loop {
        let mut next: Option<Operation> = None;

        for op in operations.iter() {
            if placed_ids.contains(op.operation_id) {
                continue;
            }
            if !dependencies_satisfied(&completed_ids, &op) {
                continue;
            }
            next = match next {
                Some(current) if current.operation_id <= op.operation_id => Some(current),
                _ => Some(op),
            };
        }

        match next {
            Some(op) => {
                completed_ids.push_back(op.operation_id);
                placed_ids.push_back(op.operation_id);
                ordered.push_back(op);
            }
            None => break,
        }
    }

    for op in operations.iter() {
        if !placed_ids.contains(op.operation_id) {
            ordered.push_back(op);
        }
    }

    ordered
}
