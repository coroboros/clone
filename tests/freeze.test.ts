import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { freeze } from '../src/index.js';

describe('freeze', () => {
  describe('null-ish and primitives', () => {
    it('returns the value unchanged for undefined, null, NaN', () => {
      expect(freeze(undefined)).toBeUndefined();
      expect(freeze(null)).toBeNull();
      expect(freeze(Number.NaN)).toBeNaN();
    });

    it('returns primitives unchanged', () => {
      expect(freeze('string')).toBe('string');
      expect(freeze(5)).toBe(5);
      expect(freeze(true)).toBe(true);
      const sym = Symbol('s');
      expect(freeze(sym)).toBe(sym);
    });
  });

  describe('skipped types (returned unfrozen by spec)', () => {
    it('returns TypedArrays unfrozen', () => {
      const ta = new Uint16Array([5, 9]);
      const result = freeze(ta) as Uint16Array & { hello?: string };
      expect(Object.isFrozen(result)).toBe(false);
      result.hello = 'world';
      expect(result.hello).toBe('world');
    });

    it('returns DataView unfrozen', () => {
      const dv = new DataView(new ArrayBuffer(8));
      const result = freeze(dv) as DataView & { tag?: string };
      expect(Object.isFrozen(result)).toBe(false);
      result.tag = 'world';
      expect(result.tag).toBe('world');
    });

    it('returns Buffers unfrozen (Buffer extends Uint8Array)', () => {
      const buf = Buffer.from('hello');
      const result = freeze(buf);
      expect(Object.isFrozen(result)).toBe(false);
    });
  });

  describe('frozen types', () => {
    it('freezes arrays', () => {
      const arr = freeze([1, 2, 3]);
      expect(Object.isFrozen(arr)).toBe(true);
    });

    it('freezes plain objects', () => {
      const obj = freeze({ x: 1 });
      expect(Object.isFrozen(obj)).toBe(true);
    });

    it('freezes a Date', () => {
      const d = freeze(new Date());
      expect(Object.isFrozen(d)).toBe(true);
    });

    it('freezes an Error', () => {
      const e = freeze(new Error('oops'));
      expect(Object.isFrozen(e)).toBe(true);
    });

    it('freezes Map and Set instances', () => {
      const m = freeze(new Map());
      const s = freeze(new Set());
      expect(Object.isFrozen(m)).toBe(true);
      expect(Object.isFrozen(s)).toBe(true);
    });

    it('freezes WeakMap and WeakSet wrappers', () => {
      expect(Object.isFrozen(freeze(new WeakMap()))).toBe(true);
      expect(Object.isFrozen(freeze(new WeakSet()))).toBe(true);
    });

    it('freezes function-shaped values', () => {
      const fn = freeze(() => undefined);
      const afn = freeze(async () => undefined);
      const gen = freeze(function* g() {
        yield 0;
      });
      expect(Object.isFrozen(fn)).toBe(true);
      expect(Object.isFrozen(afn)).toBe(true);
      expect(Object.isFrozen(gen)).toBe(true);
    });
  });

  describe('deep freezing', () => {
    it('freezes nested objects through symbol keys', () => {
      const sym = Symbol('s');
      const original: Record<PropertyKey, unknown> = {
        hello: 'hello',
        [sym]: { x: 5, y: { z: new Error('error z') } },
      };
      const out = freeze(original) as typeof original & {
        [k: symbol]: { x: number; y: { z: Error } };
      };
      expect(Object.isFrozen(out)).toBe(true);
      expect(Object.isFrozen(out[sym])).toBe(true);
      expect(Object.isFrozen(out[sym].y)).toBe(true);
      expect(Object.isFrozen(out[sym].y.z)).toBe(true);
    });

    it('freezes deeply across array values', () => {
      const out = freeze([{ a: 1 }, { b: { c: 2 } }]);
      expect(Object.isFrozen(out)).toBe(true);
      expect(Object.isFrozen(out[0])).toBe(true);
      expect(Object.isFrozen(out[1])).toBe(true);
      const nested = out[1] as { b: { c: number } };
      expect(Object.isFrozen(nested.b)).toBe(true);
    });
  });
});
