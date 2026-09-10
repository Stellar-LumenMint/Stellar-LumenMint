import {
  GraphQLError,
  Kind,
  type ASTVisitor,
  type DocumentNode,
  type FragmentDefinitionNode,
  type SelectionSetNode,
  type ValidationContext,
  type ValidationRule,
} from 'graphql';

/**
 * Query-shape limits for the GraphQL gateway.
 *
 * Apollo has no built-in bound on how deep or how wide a client query can be,
 * so a single request such as `{ a { a { a { ... } } } }` or a field aliased
 * thousands of times can force unbounded resolver work — a cheap denial of
 * service. These validation rules reject such documents before any resolver
 * runs.
 */

/** Maximum selection-set nesting an operation may request. */
export const MAX_QUERY_DEPTH = 10;

/** Maximum number of aliased fields allowed in a single document. */
export const MAX_QUERY_ALIASES = 100;

function collectFragments(
  document: DocumentNode,
): Map<string, FragmentDefinitionNode> {
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments.set(definition.name.value, definition);
    }
  }
  return fragments;
}

function selectionSetDepth(
  selectionSet: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  fragmentStack: ReadonlySet<string>,
  limit: number,
): number {
  let maxChildDepth = 0;

  for (const selection of selectionSet.selections) {
    let childDepth = 0;

    if (selection.kind === Kind.FIELD || selection.kind === Kind.INLINE_FRAGMENT) {
      childDepth = selection.selectionSet
        ? selectionSetDepth(
            selection.selectionSet,
            fragments,
            fragmentStack,
            limit,
          )
        : 0;
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const name = selection.name.value;
      // Ignore cycles; the "no fragment cycles" validation rule reports them.
      if (!fragmentStack.has(name)) {
        const fragment = fragments.get(name);
        if (fragment) {
          const nextStack = new Set(fragmentStack);
          nextStack.add(name);
          childDepth = selectionSetDepth(
            fragment.selectionSet,
            fragments,
            nextStack,
            limit,
          );
        }
      }
    }

    if (childDepth > maxChildDepth) {
      maxChildDepth = childDepth;
    }

    // Early exit: no need to walk the rest of an already-too-deep branch.
    if (maxChildDepth + 1 > limit) {
      return maxChildDepth + 1;
    }
  }

  return maxChildDepth + 1;
}

/**
 * Rejects operations nested deeper than `maxDepth`. Depth is counted as the
 * number of nested selection sets, so `{ a { b { c } } }` has depth 3.
 */
export function createDepthLimitRule(
  maxDepth: number = MAX_QUERY_DEPTH,
): ValidationRule {
  return (context: ValidationContext): ASTVisitor => {
    const fragments = collectFragments(context.getDocument());

    return {
      OperationDefinition(node) {
        const depth = selectionSetDepth(
          node.selectionSet,
          fragments,
          new Set<string>(),
          maxDepth,
        );

        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(
              `Query is too deep: maximum allowed depth is ${maxDepth}`,
              { nodes: [node] },
            ),
          );
        }
      },
    };
  };
}

/**
 * Rejects documents that alias more than `maxAliases` fields. Aliases bypass
 * the operation-name deduplication that normally collapses repeated fields,
 * so this bounds alias-based amplification.
 */
export function createAliasLimitRule(
  maxAliases: number = MAX_QUERY_ALIASES,
): ValidationRule {
  return (context: ValidationContext): ASTVisitor => {
    let aliasCount = 0;
    let reported = false;

    return {
      Field(node) {
        if (!node.alias) {
          return;
        }

        aliasCount += 1;
        if (!reported && aliasCount > maxAliases) {
          reported = true;
          context.reportError(
            new GraphQLError(
              `Too many aliased fields: maximum allowed is ${maxAliases}`,
              { nodes: [node] },
            ),
          );
        }
      },
    };
  };
}

/**
 * The validation rules applied to every document sent to the gateway.
 * Overrides can be supplied for tests or to tune per deployment.
 */
export function getGraphqlValidationRules(
  maxDepth: number = MAX_QUERY_DEPTH,
  maxAliases: number = MAX_QUERY_ALIASES,
): ValidationRule[] {
  return [
    createDepthLimitRule(maxDepth),
    createAliasLimitRule(maxAliases),
  ];
}
