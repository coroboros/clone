import type { Buffer as NodeBuffer } from 'node:buffer';
import { CloneError } from './error.js';
import { exists, getType, primitives } from './helpers.js';

const BufferRef: typeof NodeBuffer | undefined =
  typeof globalThis.Buffer !== 'undefined' ? globalThis.Buffer : undefined;

export type CloneOptions = {
  ignoreUndefinedProperties?: boolean;
  cycles?: boolean;
  preservePrototype?: boolean;
  copyDescriptors?: boolean;
};

type InternalOpts = {
  ignoreUndefinedProperties: boolean;
  cycles: boolean;
  preservePrototype: boolean;
  copyDescriptors: boolean;
};

const describeUnsupported = (thing: unknown): string => {
  if (typeof thing === 'function') {
    const name = (thing as { name?: string }).name;
    return name ? `function "${name}"` : 'anonymous function';
  }
  const ctor = (thing as { constructor?: { name?: string } } | null)?.constructor;
  const ctorName = ctor?.name;
  return ctorName ? `instance of ${ctorName}` : 'value of unknown type';
};

const notSupportedObjects: ReadonlySet<unknown> = new Set([
  Object.getPrototypeOf(async () => {}).constructor,
  Function,
  Object.getPrototypeOf(function* g() {
    yield 0;
  }).constructor,
  Intl.Collator,
  Intl.DateTimeFormat,
  Intl.NumberFormat,
  Intl.PluralRules,
  Promise,
  WeakMap,
  WeakSet,
]);

const copyWithDescriptors: ReadonlySet<unknown> = new Set([
  Error,
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,
]);

type AnyCtor = new (...args: never[]) => unknown;
type AnyTypedArrayCtor = new (source: ArrayLike<number> | ArrayBufferLike) => unknown;

export const clone = <T>(thing: T, options?: CloneOptions): T => {
  const opts: InternalOpts = {
    ignoreUndefinedProperties: options?.ignoreUndefinedProperties === true,
    cycles: options?.cycles !== false,
    preservePrototype: options?.preservePrototype !== false,
    copyDescriptors: options?.copyDescriptors !== false,
  };
  return internalClone(thing, opts, new WeakMap()) as T;
};

const remember = (
  visited: WeakMap<object, unknown>,
  source: object,
  cloned: unknown,
  cycles: boolean,
): void => {
  if (cycles) {
    visited.set(source, cloned);
  }
};

const internalClone = (
  thing: unknown,
  opts: InternalOpts,
  visited: WeakMap<object, unknown>,
): unknown => {
  if (!exists(thing)) {
    return thing;
  }

  if (opts.cycles && typeof thing === 'object' && thing !== null && visited.has(thing)) {
    return visited.get(thing);
  }

  const typeOfThing = typeof thing;

  if (primitives.has(typeOfThing)) {
    return (thing as { valueOf: () => unknown }).valueOf();
  }

  if (typeOfThing === 'function') {
    throw new CloneError('UNSUPPORTED_TYPE', `cannot clone ${describeUnsupported(thing)}`);
  }

  // Constructor is undefined for null-prototype objects (`Object.create(null)`),
  // which are clonable plain objects — only throw if we recognize an unsupported
  // constructor explicitly.
  const Constructor = getType(thing);

  if (Constructor !== undefined && notSupportedObjects.has(Constructor)) {
    throw new CloneError('UNSUPPORTED_TYPE', `cannot clone ${describeUnsupported(thing)}`);
  }

  const buildDescriptors = (source: object): PropertyDescriptorMap => {
    const descriptors: PropertyDescriptorMap = {};
    for (const key of Reflect.ownKeys(source)) {
      const descriptor = Reflect.getOwnPropertyDescriptor(source, key);
      if (descriptor === undefined) {
        continue;
      }
      if (opts.ignoreUndefinedProperties && descriptor.value === undefined) {
        continue;
      }
      const next: PropertyDescriptor = { ...descriptor };
      if ('value' in descriptor) {
        next.value = internalClone(descriptor.value, opts, visited);
      }
      descriptors[key as PropertyKey] = next;
    }
    return descriptors;
  };

  const source = thing as object;

  if (Constructor === Array) {
    const src = source as unknown[];
    const len = src.length;
    const cloned: unknown[] = new Array(len);
    remember(visited, source, cloned, opts.cycles);
    for (let i = 0; i < len; i += 1) {
      const value = src[i];
      if (!opts.ignoreUndefinedProperties || value !== undefined) {
        cloned[i] = internalClone(value, opts, visited);
      }
    }
    return cloned;
  }

  if (Constructor === Map) {
    const cloned = new Map<unknown, unknown>();
    remember(visited, source, cloned, opts.cycles);
    (source as Map<unknown, unknown>).forEach((value, key) => {
      if (!opts.ignoreUndefinedProperties || value !== undefined) {
        cloned.set(internalClone(key, opts, visited), internalClone(value, opts, visited));
      }
    });
    return cloned;
  }

  if (Constructor === Set) {
    const cloned = new Set<unknown>();
    remember(visited, source, cloned, opts.cycles);
    (source as Set<unknown>).forEach((value) => {
      if (!opts.ignoreUndefinedProperties || value !== undefined) {
        cloned.add(internalClone(value, opts, visited));
      }
    });
    return cloned;
  }

  if (Constructor === DataView) {
    const view = source as DataView;
    const cloned = new DataView(view.buffer.slice(0), view.byteOffset, view.byteLength);
    remember(visited, source, cloned, opts.cycles);
    return cloned;
  }

  if (BufferRef !== undefined && Constructor === BufferRef) {
    const buf = source as NodeBuffer;
    const cloned = BufferRef.allocUnsafe(buf.length);
    buf.copy(cloned);
    remember(visited, source, cloned, opts.cycles);
    return cloned;
  }

  if (Constructor === ArrayBuffer) {
    const cloned = (source as ArrayBuffer).slice(0);
    remember(visited, source, cloned, opts.cycles);
    return cloned;
  }

  if (Constructor === Date) {
    const cloned = new Date((source as Date).valueOf());
    remember(visited, source, cloned, opts.cycles);
    return cloned;
  }

  if (Constructor === RegExp) {
    const rx = source as RegExp;
    const cloned = new RegExp(rx.source, rx.flags);
    remember(visited, source, cloned, opts.cycles);
    return cloned;
  }

  // Any remaining ArrayBufferView at this point is a TypedArray (DataView and
  // Buffer are dispatched above). One isView call replaces a 9-entry Set lookup.
  if (ArrayBuffer.isView(source)) {
    const Ctor = Constructor as AnyTypedArrayCtor;
    const cloned = new Ctor(source as unknown as ArrayLike<number>);
    remember(visited, source, cloned, opts.cycles);
    return cloned;
  }

  if (Constructor === String) {
    const original = source as { valueOf: () => string };
    const cloned = new String(original.valueOf());
    remember(visited, source, cloned as object, opts.cycles);
    if (opts.copyDescriptors) {
      const descriptors = buildDescriptors(source);
      // length is auto-managed by the String wrapper and cannot be redefined.
      for (const key of Object.keys(descriptors)) {
        if (key !== 'length') {
          const descriptor = descriptors[key];
          if (descriptor !== undefined) {
            Object.defineProperty(cloned, key, descriptor);
          }
        }
      }
    }
    return cloned;
  }

  if (Constructor === Number || Constructor === Boolean) {
    const Ctor = Constructor as new (value: unknown) => unknown;
    const cloned = new Ctor((source as { valueOf: () => unknown }).valueOf());
    remember(visited, source, cloned as object, opts.cycles);
    if (opts.copyDescriptors) {
      Object.defineProperties(cloned as object, buildDescriptors(source));
    }
    return cloned;
  }

  if (copyWithDescriptors.has(Constructor)) {
    const Ctor = Constructor as AnyCtor;
    const cloned = new Ctor() as object;
    remember(visited, source, cloned, opts.cycles);
    if (opts.copyDescriptors) {
      Object.defineProperties(cloned, buildDescriptors(source));
    } else {
      const err = source as Error;
      const target = cloned as Error;
      target.message = err.message;
      target.name = err.name;
    }
    return cloned;
  }

  if (typeOfThing === 'object') {
    let placeholder: object;
    if (opts.preservePrototype) {
      const proto = Object.getPrototypeOf(source);
      // Hot path: plain objects with Object.prototype use a literal, which V8
      // compiles into a faster object-creation map than Object.create.
      // Null-prototype objects need explicit Object.create(null) to preserve
      // the prototype-less shape.
      if (proto === Object.prototype) {
        placeholder = {};
      } else if (proto === null) {
        placeholder = Object.create(null);
      } else {
        placeholder = Object.create(proto);
      }
    } else {
      placeholder = {};
    }
    remember(visited, source, placeholder, opts.cycles);
    if (opts.copyDescriptors) {
      Object.defineProperties(placeholder, buildDescriptors(source));
    } else {
      const target = placeholder as Record<PropertyKey, unknown>;
      for (const key in source) {
        if (Object.hasOwn(source, key)) {
          const value = (source as Record<PropertyKey, unknown>)[key];
          if (!opts.ignoreUndefinedProperties || value !== undefined) {
            target[key] = internalClone(value, opts, visited);
          }
        }
      }
    }
    return placeholder;
  }

  throw new CloneError('UNSUPPORTED_TYPE', `cannot clone ${describeUnsupported(thing)}`);
};
