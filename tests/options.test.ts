import { describe, expect, it } from 'vitest';
import { clone } from '../src/index.js';

describe('clone options', () => {
  describe('cycles', () => {
    it('default true — handles self-references', () => {
      type Cyclic = { name: string; self?: Cyclic };
      const o: Cyclic = { name: 'a' };
      o.self = o;
      const copy = clone(o);
      expect(copy.self).toBe(copy);
    });

    it('false — caller asserts no cycles, recursion is unrestrained', () => {
      const o = { name: 'a', nested: { x: 1 } };
      const copy = clone(o, { cycles: false });
      expect(copy.name).toBe('a');
      expect(copy.nested.x).toBe(1);
      expect(copy.nested).not.toBe(o.nested);
    });
  });

  describe('preservePrototype', () => {
    it('default true — keeps the class prototype', () => {
      class Pet {
        species(): string {
          return 'pet';
        }
      }
      const original = new Pet();
      const copy = clone(original);
      expect(copy).toBeInstanceOf(Pet);
      expect(copy.species()).toBe('pet');
    });

    it('false — flattens to a plain object', () => {
      class Pet {
        species(): string {
          return 'pet';
        }
      }
      const original = new Pet();
      const copy = clone(original, { preservePrototype: false });
      expect(copy).not.toBeInstanceOf(Pet);
      expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
    });
  });

  describe('copyDescriptors', () => {
    it('default true — preserves non-enumerable + symbol-keyed properties', () => {
      const sym = Symbol('s');
      const original = { visible: 1, [sym]: 'sym' } as Record<PropertyKey, unknown>;
      Object.defineProperty(original, 'hidden', {
        value: 'h',
        enumerable: false,
        writable: true,
        configurable: true,
      });

      const copy = clone(original);
      expect(copy.visible).toBe(1);
      expect(copy[sym]).toBe('sym');
      expect(Object.getOwnPropertyDescriptor(copy, 'hidden')?.value).toBe('h');
      expect(Object.getOwnPropertyDescriptor(copy, 'hidden')?.enumerable).toBe(false);
    });

    it('false — fast path drops non-enumerable + symbol-keyed properties', () => {
      const sym = Symbol('s');
      const original = { visible: 1, [sym]: 'sym' } as Record<PropertyKey, unknown>;
      Object.defineProperty(original, 'hidden', {
        value: 'h',
        enumerable: false,
        writable: true,
        configurable: true,
      });

      const copy = clone(original, { copyDescriptors: false });
      expect(copy.visible).toBe(1);
      expect(copy[sym]).toBeUndefined();
      expect(Object.getOwnPropertyDescriptor(copy, 'hidden')).toBeUndefined();
    });

    it('false — Errors keep message and name only', () => {
      const original = new RangeError('out of range');
      const copy = clone(original, { copyDescriptors: false });
      expect(copy).toBeInstanceOf(RangeError);
      expect(copy.message).toBe('out of range');
      expect(copy.name).toBe('RangeError');
    });

    it('false — boxed wrappers keep value but drop attached props', () => {
      const original = new Number(7) as unknown as { valueOf(): number; tag?: string };
      original.tag = 'attached';

      const copy = clone(original, { copyDescriptors: false });
      expect(copy.valueOf()).toBe(7);
      expect(copy.tag).toBeUndefined();
    });
  });

  describe('combined fast clone (all opt-outs)', () => {
    it('clones plain JSON-like data', () => {
      const original = {
        n: 5,
        s: 'hi',
        arr: [1, 2, { deep: true }],
        nested: { a: { b: { c: 7 } } },
      };
      const copy = clone(original, {
        cycles: false,
        preservePrototype: false,
        copyDescriptors: false,
      });
      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);
      expect(copy.arr).not.toBe(original.arr);
      expect(copy.nested.a.b).not.toBe(original.nested.a.b);
    });
  });
});
