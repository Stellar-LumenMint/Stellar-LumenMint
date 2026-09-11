import { buildSchema, parse, validate } from 'graphql';
import {
  createAliasLimitRule,
  createDepthLimitRule,
  MAX_QUERY_ALIASES,
  MAX_QUERY_DEPTH,
} from './graphql-validation';

const schema = buildSchema(`
  type Query {
    node: Node
    id: ID
  }
  type Node {
    id: ID!
    child: Node
  }
`);

const depthRule = createDepthLimitRule(3);

function depthErrors(query: string): string[] {
  return validate(schema, parse(query), [depthRule]).map((e) => e.message);
}

describe('GraphQL query-shape validation', () => {
  describe('depth limit', () => {
    it('allows a query at exactly the configured depth', () => {
      // node -> child -> id => depth 3
      expect(depthErrors('{ node { child { id } } }')).toEqual([]);
    });

    it('allows a shallow query', () => {
      expect(depthErrors('{ node { id } }')).toEqual([]);
    });

    it('rejects a query deeper than the configured depth', () => {
      // depth 4
      const errors = depthErrors(
        '{ node { child { child { child { id } } } } }',
      );
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('too deep');
    });

    it('counts depth through fragment spreads', () => {
      const query = `
        query Deep {
          ...F0
        }
        fragment F0 on Query { node { ...F1 } }
        fragment F1 on Node { child { ...F2 } }
        fragment F2 on Node { child { ...F3 } }
        fragment F3 on Node { child { id } }
      `;
      const errors = validate(schema, parse(query), [depthRule]).map(
        (e) => e.message,
      );
      expect(errors.some((m) => m.includes('too deep'))).toBe(true);
    });

    it('does not hang on a cyclic fragment spread', () => {
      const query = `
        query Cyclic { ...A }
        fragment A on Query { ...B }
        fragment B on Node { child { ...A } }
      `;
      // The depth rule alone must terminate even though the fragment cycle is
      // only reported by another rule.
      expect(() => validate(schema, parse(query), [depthRule])).not.toThrow();
    });

    it('uses a sane production default', () => {
      expect(MAX_QUERY_DEPTH).toBeGreaterThan(0);
      expect(MAX_QUERY_DEPTH).toBeLessThanOrEqual(20);
    });
  });

  describe('alias limit', () => {
    const aliasRule = createAliasLimitRule(2);

    it('allows aliases up to the configured limit', () => {
      const errors = validate(schema, parse('{ a: id b: id }'), [aliasRule]);
      expect(errors).toEqual([]);
    });

    it('rejects a document with too many aliases and reports once', () => {
      const errors = validate(schema, parse('{ a: id b: id c: id d: id }'), [
        aliasRule,
      ]);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Too many aliased fields');
    });

    it('exports a production default alias cap', () => {
      expect(MAX_QUERY_ALIASES).toBeGreaterThan(0);
    });
  });
});
