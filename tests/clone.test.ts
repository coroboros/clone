import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { clone } from '../src/index.js';

describe('clone', () => {
  describe('primitives', () => {
    it('clones primitive strings unchanged', () => {
      expect(clone('')).toBe('');
      expect(clone(' ')).toBe(' ');
      expect(clone('x')).toBe('x');
      expect(clone(String(''))).toBe('');
      expect(clone(String('x'))).toBe('x');
    });

    it('clones primitive numbers unchanged', () => {
      expect(clone(5)).toBe(5);
      expect(clone(5.5)).toBe(5.5);
      expect(clone(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
      expect(clone(0xff)).toBe(0xff);
      expect(clone(Number(5))).toBe(5);
    });

    it('clones primitive booleans unchanged', () => {
      expect(clone(true)).toBe(true);
      expect(clone(false)).toBe(false);
    });

    it('clones primitive symbols by identity', () => {
      const s = Symbol('s');
      expect(clone(s)).toBe(s);
    });
  });

  describe('boxed wrappers', () => {
    it('clones a boxed String preserving valueOf, indexed props, and added props', () => {
      const original = new String('origin') as unknown as { [key: string]: unknown; XYZ?: number };
      original.XYZ = 5;
      original[6] = true;

      const copy = clone(original) as unknown as {
        [key: string]: unknown;
        valueOf(): string;
        length: number;
      };

      expect(copy).not.toBe(original);
      expect(copy.valueOf()).toBe('origin');
      expect(copy.XYZ).toBe(5);
      expect(copy[6]).toBe(true);
      expect(copy.length).toBe(6);
    });

    it('clones a boxed Number preserving valueOf and added props', () => {
      const original = new Number(5) as unknown as { valueOf(): number; XYZ?: number };
      original.XYZ = 5;

      const copy = clone(original);

      expect(copy).not.toBe(original);
      expect(copy.valueOf()).toBe(5);
      expect(copy.XYZ).toBe(5);
    });

    it('clones a boxed Boolean preserving valueOf and added props', () => {
      const original = new Boolean(true) as unknown as { valueOf(): boolean; XYZ?: number };
      original.XYZ = 5;

      const copy = clone(original);

      expect(copy).not.toBe(original);
      expect(copy.valueOf()).toBe(true);
      expect(copy.XYZ).toBe(5);
    });
  });

  describe('arrays', () => {
    it('clones a non-empty array', () => {
      const original = [0, 1, 2];
      const copy = clone(original);
      expect(copy).not.toBe(original);
      expect(copy).toEqual([0, 1, 2]);
    });

    it('clones an empty array', () => {
      const original: unknown[] = [];
      const copy = clone(original);
      expect(copy).not.toBe(original);
      expect(copy).toEqual([]);
    });
  });

  describe('binary types', () => {
    it('clones an ArrayBuffer', () => {
      const original = new ArrayBuffer(8);
      const copy = clone(original);
      expect(copy).toBeInstanceOf(ArrayBuffer);
      expect(copy).not.toBe(original);
      expect(copy.byteLength).toBe(8);
    });

    it('clones a Buffer with identical bytes', () => {
      const original = Buffer.from('hello');
      const copy = clone(original);
      expect(Buffer.isBuffer(copy)).toBe(true);
      expect(copy).not.toBe(original);
      expect(copy.equals(original)).toBe(true);
    });

    it('clones a DataView preserving offset and length', () => {
      const buf = new ArrayBuffer(16);
      new Uint8Array(buf).set([1, 2, 3, 4]);
      const original = new DataView(buf, 0, 8);
      const copy = clone(original);
      expect(copy).toBeInstanceOf(DataView);
      expect(copy).not.toBe(original);
      expect(copy.byteOffset).toBe(0);
      expect(copy.byteLength).toBe(8);
      expect(copy.buffer).not.toBe(original.buffer);
      expect(copy.getUint8(0)).toBe(1);
      expect(copy.getUint8(3)).toBe(4);
    });
  });

  describe('typed arrays', () => {
    const factories = [
      ['Int8Array', Int8Array],
      ['Uint8Array', Uint8Array],
      ['Uint8ClampedArray', Uint8ClampedArray],
      ['Int16Array', Int16Array],
      ['Uint16Array', Uint16Array],
      ['Int32Array', Int32Array],
      ['Uint32Array', Uint32Array],
      ['Float32Array', Float32Array],
      ['Float64Array', Float64Array],
    ] as const;

    for (const [name, Ctor] of factories) {
      it(`clones a ${name}`, () => {
        const original = new Ctor([5, 9]);
        const copy = clone(original);
        expect(copy).toBeInstanceOf(Ctor);
        expect(copy).not.toBe(original);
        expect(copy.length).toBe(2);
        expect(copy[0]).toBe(5);
        expect(copy[1]).toBe(9);
      });
    }
  });

  describe('dates and regexps', () => {
    it('clones a Date by value', () => {
      const original = new Date(2026, 4, 15);
      const copy = clone(original);
      expect(copy).toBeInstanceOf(Date);
      expect(copy).not.toBe(original);
      expect(copy.getTime()).toBe(original.getTime());
    });

    it('clones a RegExp preserving source and flags', () => {
      const original = /\w+/gi;
      const copy = clone(original);
      expect(copy).toBeInstanceOf(RegExp);
      expect(copy).not.toBe(original);
      expect(copy.source).toBe(original.source);
      expect(copy.flags).toBe(original.flags);
    });
  });

  describe('error subclasses', () => {
    const subclasses = [
      Error,
      EvalError,
      RangeError,
      ReferenceError,
      SyntaxError,
      TypeError,
      URIError,
    ] as const;

    for (const Ctor of subclasses) {
      it(`clones a ${Ctor.name} preserving name and message`, () => {
        const original = new Ctor('error found');
        const copy = clone(original);
        expect(copy.constructor).toBe(Ctor);
        expect(copy).not.toBe(original);
        expect(copy.message).toBe(original.message);
        expect(copy.name).toBe(original.name);
        expect(typeof copy.stack).toBe('string');
      });
    }
  });

  describe('maps and sets', () => {
    it('clones a Map (primitive keys)', () => {
      const original = new Map<string, unknown>([
        ['a', 5],
        ['b', { o: { x: 9 } }],
      ]);
      const copy = clone(original);
      expect(copy).toBeInstanceOf(Map);
      expect(copy).not.toBe(original);
      expect(copy.get('a')).toBe(5);
      expect(copy.get('b')).toEqual({ o: { x: 9 } });

      original.delete('b');
      expect(copy.get('b')).toEqual({ o: { x: 9 } });
    });

    it('clones a Map deeply when the key is an object', () => {
      const key = { x: 9 };
      const original = new Map<object, string>([[key, 'value']]);
      const copy = clone(original);

      expect(copy.has(key)).toBe(false);
      const clonedKey = copy.keys().next().value as { x: number };
      expect(clonedKey).toEqual({ x: 9 });
      expect(clonedKey).not.toBe(key);
    });

    it('clones a Set (deeply)', () => {
      const o = { x: 9 };
      const original = new Set<unknown>([o, 5]);
      const copy = clone(original);

      expect(copy).toBeInstanceOf(Set);
      expect(copy).not.toBe(original);
      expect(copy.has(5)).toBe(true);
      expect(copy.has(o)).toBe(false);
      const cloned = [...copy].find((v) => typeof v === 'object') as { x: number };
      expect(cloned).toEqual({ x: 9 });
    });
  });

  describe('custom objects', () => {
    it('preserves the prototype chain', () => {
      class Pet {
        species(): string {
          return 'pet';
        }
      }
      class Dog extends Pet {
        bark(): string {
          return 'woof';
        }
      }

      const original = new Dog();
      const copy = clone(original);
      expect(copy).toBeInstanceOf(Dog);
      expect(copy).toBeInstanceOf(Pet);
      expect(copy).not.toBe(original);
      expect(copy.bark()).toBe('woof');
      expect(copy.species()).toBe('pet');
    });

    it('preserves symbol-keyed properties', () => {
      const sym = Symbol('x');
      const original: Record<PropertyKey, unknown> = { [sym]: [1, 2, 3], normal: 'ok' };
      const copy = clone(original);
      expect(copy[sym]).toEqual([1, 2, 3]);
      expect(copy[sym]).not.toBe(original[sym]);
      expect(copy.normal).toBe('ok');
    });

    it('preserves property descriptors', () => {
      const original = {} as { secret?: number };
      Object.defineProperty(original, 'secret', {
        value: 42,
        enumerable: false,
        writable: false,
        configurable: true,
      });
      const copy = clone(original);
      const descriptor = Object.getOwnPropertyDescriptor(copy, 'secret');
      expect(descriptor?.value).toBe(42);
      expect(descriptor?.enumerable).toBe(false);
      expect(descriptor?.writable).toBe(false);
      expect(descriptor?.configurable).toBe(true);
    });

    it('clones a complex object combining native + custom + symbols', () => {
      class Tag {
        constructor(public name: string) {}
      }
      const sym = Symbol('payload');
      const original: Record<PropertyKey, unknown> = {
        n: 5,
        buf: Buffer.from('hello', 'utf-8'),
        err: new RangeError('out of range'),
        tag: new Tag('alpha'),
        [sym]: [1, 2, 3],
      };

      const copy = clone(original);

      expect(copy.n).toBe(5);
      expect(Buffer.isBuffer(copy.buf)).toBe(true);
      expect((copy.buf as Buffer).toString()).toBe('hello');
      expect(copy.err).toBeInstanceOf(RangeError);
      expect((copy.err as RangeError).message).toBe('out of range');
      expect(copy.tag).toBeInstanceOf(Tag);
      expect((copy.tag as Tag).name).toBe('alpha');
      expect(copy[sym]).toEqual([1, 2, 3]);
    });
  });

  describe('unsupported objects', () => {
    it('returns undefined for plain functions', () => {
      expect(clone(() => undefined)).toBeUndefined();
    });

    it('returns undefined for async functions', () => {
      expect(clone(async () => undefined)).toBeUndefined();
    });

    it('returns undefined for generator functions', () => {
      expect(
        clone(function* g() {
          yield 0;
        }),
      ).toBeUndefined();
    });

    it('returns undefined for Intl objects', () => {
      expect(clone(new Intl.Collator())).toBeUndefined();
      expect(clone(new Intl.DateTimeFormat('en-US'))).toBeUndefined();
      expect(
        clone(new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })),
      ).toBeUndefined();
    });

    it('returns undefined for Promises', () => {
      expect(clone(new Promise(() => undefined))).toBeUndefined();
    });

    it('returns undefined for WeakMap and WeakSet', () => {
      expect(clone(new WeakMap())).toBeUndefined();
      expect(clone(new WeakSet())).toBeUndefined();
    });

    it('returns undefined for constructor functions themselves', () => {
      const ctors = [
        Array,
        ArrayBuffer,
        Boolean,
        Buffer,
        DataView,
        Date,
        Error,
        EvalError,
        Float32Array,
        Float64Array,
        Function,
        Int8Array,
        Int16Array,
        Int32Array,
        Map,
        Number,
        Object,
        Promise,
        RangeError,
        ReferenceError,
        RegExp,
        Set,
        String,
        Symbol,
        SyntaxError,
        TypeError,
        URIError,
        Uint8Array,
        Uint8ClampedArray,
        Uint16Array,
        Uint32Array,
        WeakMap,
        WeakSet,
      ];
      for (const Ctor of ctors) {
        expect(clone(Ctor)).toBeUndefined();
      }
    });
  });

  describe('null-ish input', () => {
    it('returns undefined for undefined', () => {
      expect(clone(undefined)).toBeUndefined();
    });

    it('returns null for null', () => {
      expect(clone(null)).toBeNull();
    });

    it('returns NaN for NaN', () => {
      expect(clone(Number.NaN)).toBeNaN();
    });
  });

  describe('ignoreUndefinedProperties', () => {
    it('keeps undefined properties by default', () => {
      expect(clone({ a: undefined })).toEqual({ a: undefined });
      expect(clone({ a: undefined, b: 5 })).toEqual({ a: undefined, b: 5 });
      expect(clone([{ a: undefined, b: 5 }])).toEqual([{ a: undefined, b: 5 }]);
    });

    it('strips undefined properties when option is true', () => {
      expect(clone({ a: undefined }, { ignoreUndefinedProperties: true })).toEqual({});
      expect(clone({ a: undefined, b: 5 }, { ignoreUndefinedProperties: true })).toEqual({ b: 5 });
      expect(clone([{ a: undefined, b: 5 }], { ignoreUndefinedProperties: true })).toEqual([
        { b: 5 },
      ]);
    });

    it('strips undefined values from Set members and Map entries', () => {
      const set = new Set([{ x: undefined }, 5]);
      const cloned = clone(set, { ignoreUndefinedProperties: true });
      const obj = [...cloned].find((v) => typeof v === 'object') as Record<string, unknown>;
      expect(obj).not.toHaveProperty('x');

      const map = new Map<string, unknown>([
        ['a', undefined],
        ['b', { o: { x: undefined } }],
      ]);
      const clonedMap = clone(map, { ignoreUndefinedProperties: true });
      expect(clonedMap.get('b')).toEqual({ o: {} });
    });
  });

  describe('TypeScript inference', () => {
    it('preserves the input type via generics', () => {
      const original = { x: 1, nested: { y: 'hi' } };
      const copy = clone(original);
      // type-level check — copy should be `{ x: number; nested: { y: string } }`
      const _y: string = copy.nested.y;
      const _x: number = copy.x;
      expect(_x).toBe(1);
      expect(_y).toBe('hi');
    });
  });
});
