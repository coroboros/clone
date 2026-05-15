import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { clone } from '../src/index.js';

const jsonValue = fc.letrec((tie) => ({
  any: fc.oneof(
    { depthSize: 'small' },
    fc.boolean(),
    fc.integer(),
    fc.float({ noNaN: true, noDefaultInfinity: true }),
    fc.string(),
    fc.constant(null),
    fc.array(tie('any'), { maxLength: 6 }),
    fc.dictionary(fc.string(), tie('any'), { maxKeys: 6 }),
  ),
})).any;

describe('clone — properties', () => {
  it('clone(x) is structurally equal to x for any JSON-shaped input', () => {
    fc.assert(
      fc.property(jsonValue, (value) => {
        expect(clone(value)).toEqual(value);
      }),
      { numRuns: 200 },
    );
  });

  it('clone(x) !== x for non-primitive x (identity broken)', () => {
    const compoundValue = fc.oneof(
      fc.array(fc.integer(), { minLength: 1, maxLength: 8 }),
      fc.dictionary(fc.string({ minLength: 1 }), fc.integer(), { minKeys: 1, maxKeys: 6 }),
    );
    fc.assert(
      fc.property(compoundValue, (value) => {
        expect(clone(value)).not.toBe(value);
      }),
      { numRuns: 200 },
    );
  });

  it('mutating the clone does not mutate the original', () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 4 }), fc.integer(), {
          minKeys: 1,
          maxKeys: 5,
        }),
        (original) => {
          const copy = clone(original);
          const firstKey = Object.keys(copy)[0];
          if (firstKey === undefined) return;
          (copy as Record<string, number>)[firstKey] = 999_999;
          expect(original[firstKey]).not.toBe(999_999);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('preserves the prototype chain across class hierarchies', () => {
    class A {
      tag = 'A';
    }
    class B extends A {
      sub = 'B';
    }
    class C extends B {
      leaf = 'C';
    }
    fc.assert(
      fc.property(fc.constant(0), () => {
        const original = new C();
        const copy = clone(original);
        expect(copy).toBeInstanceOf(C);
        expect(copy).toBeInstanceOf(B);
        expect(copy).toBeInstanceOf(A);
        expect(copy.tag).toBe('A');
        expect(copy.sub).toBe('B');
        expect(copy.leaf).toBe('C');
      }),
      { numRuns: 20 },
    );
  });

  it('preserves non-enumerable property descriptors', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 8 }), fc.integer(), (key, value) => {
        const original = {} as Record<string, unknown>;
        Object.defineProperty(original, key, {
          value,
          enumerable: false,
          writable: false,
          configurable: true,
        });
        const copy = clone(original);
        const descriptor = Object.getOwnPropertyDescriptor(copy, key);
        expect(descriptor?.value).toBe(value);
        expect(descriptor?.enumerable).toBe(false);
        expect(descriptor?.writable).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('handles random graphs with cycles without stack overflow', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), (size) => {
        type Node = { id: number; refs: Node[] };
        const nodes: Node[] = Array.from({ length: size }, (_, id) => ({ id, refs: [] }));
        // Random edges including back-edges to create cycles.
        for (const node of nodes) {
          for (const other of nodes) {
            if ((node.id + other.id) % 3 === 0) {
              node.refs.push(other);
            }
          }
        }
        const copy = clone(nodes[0] as Node);
        expect(copy.id).toBe(0);
        expect(Array.isArray(copy.refs)).toBe(true);
      }),
      { numRuns: 30 },
    );
  });
});
