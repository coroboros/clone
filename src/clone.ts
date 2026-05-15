import { exists, getType, primitives, typedArrays } from './helpers.js';

export type CloneOptions = {
  ignoreUndefinedProperties?: boolean;
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

export const clone = <T>(thing: T, options?: CloneOptions): T =>
  internalClone(thing, options?.ignoreUndefinedProperties === true, new WeakMap()) as T;

const internalClone = (
  thing: unknown,
  ignoreUndefinedProperties: boolean,
  visited: WeakMap<object, unknown>,
): unknown => {
  if (!exists(thing)) {
    return thing;
  }

  if (typeof thing === 'object' && thing !== null && visited.has(thing)) {
    return visited.get(thing);
  }

  const Constructor = getType(thing);

  if (!exists(Constructor)) {
    return undefined;
  }

  const typeOfThing = typeof thing;

  if (primitives.has(typeOfThing)) {
    return (thing as { valueOf: () => unknown }).valueOf();
  }

  if (
    typeOfThing === 'undefined' ||
    typeOfThing === 'function' ||
    notSupportedObjects.has(Constructor)
  ) {
    return undefined;
  }

  const buildDescriptors = (source: object): PropertyDescriptorMap => {
    const descriptors: PropertyDescriptorMap = {};
    for (const key of Reflect.ownKeys(source)) {
      const descriptor = Reflect.getOwnPropertyDescriptor(source, key);
      if (descriptor === undefined) {
        continue;
      }
      if (ignoreUndefinedProperties && descriptor.value === undefined) {
        continue;
      }
      const next: PropertyDescriptor = { ...descriptor };
      if ('value' in descriptor) {
        next.value = internalClone(descriptor.value, ignoreUndefinedProperties, visited);
      }
      descriptors[key as PropertyKey] = next;
    }
    return descriptors;
  };

  const source = thing as object;

  if (Constructor === Array) {
    const cloned: unknown[] = [];
    visited.set(source, cloned);
    (source as unknown[]).forEach((value, key) => {
      if (!ignoreUndefinedProperties || value !== undefined) {
        cloned[key] = internalClone(value, ignoreUndefinedProperties, visited);
      }
    });
    return cloned;
  }

  if (Constructor === Map) {
    const cloned = new Map<unknown, unknown>();
    visited.set(source, cloned);
    (source as Map<unknown, unknown>).forEach((value, key) => {
      if (!ignoreUndefinedProperties || value !== undefined) {
        cloned.set(
          internalClone(key, ignoreUndefinedProperties, visited),
          internalClone(value, ignoreUndefinedProperties, visited),
        );
      }
    });
    return cloned;
  }

  if (Constructor === Set) {
    const cloned = new Set<unknown>();
    visited.set(source, cloned);
    (source as Set<unknown>).forEach((value) => {
      if (!ignoreUndefinedProperties || value !== undefined) {
        cloned.add(internalClone(value, ignoreUndefinedProperties, visited));
      }
    });
    return cloned;
  }

  if (Constructor === DataView) {
    const view = source as DataView;
    const cloned = new DataView(view.buffer.slice(0), view.byteOffset, view.byteLength);
    visited.set(source, cloned);
    return cloned;
  }

  if (Constructor === Buffer) {
    const buf = source as Buffer;
    const cloned = Buffer.allocUnsafe(buf.length);
    buf.copy(cloned);
    visited.set(source, cloned);
    return cloned;
  }

  if (Constructor === ArrayBuffer) {
    const cloned = (source as ArrayBuffer).slice(0);
    visited.set(source, cloned);
    return cloned;
  }

  if (Constructor === Date) {
    const cloned = new Date((source as Date).valueOf());
    visited.set(source, cloned);
    return cloned;
  }

  if (Constructor === RegExp) {
    const rx = source as RegExp;
    const cloned = new RegExp(rx.source, rx.flags);
    visited.set(source, cloned);
    return cloned;
  }

  if (typedArrays.has(Constructor)) {
    const Ctor = Constructor as AnyTypedArrayCtor;
    const cloned = new Ctor(source as ArrayLike<number>);
    visited.set(source, cloned);
    return cloned;
  }

  if (Constructor === String) {
    const original = source as { valueOf: () => string };
    const cloned = new String(original.valueOf());
    visited.set(source, cloned as object);
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
    return cloned;
  }

  if (Constructor === Number || Constructor === Boolean) {
    const Ctor = Constructor as new (value: unknown) => unknown;
    const cloned = new Ctor((source as { valueOf: () => unknown }).valueOf());
    visited.set(source, cloned as object);
    const descriptors = buildDescriptors(source);
    Object.defineProperties(cloned as object, descriptors);
    return cloned;
  }

  if (copyWithDescriptors.has(Constructor)) {
    const Ctor = Constructor as AnyCtor;
    const cloned = new Ctor() as object;
    visited.set(source, cloned);
    Object.defineProperties(cloned, buildDescriptors(source));
    return cloned;
  }

  if (typeOfThing === 'object') {
    const placeholder = Object.create(Object.getPrototypeOf(source)) as object;
    visited.set(source, placeholder);
    const descriptors = buildDescriptors(source);
    Object.defineProperties(placeholder, descriptors);
    return placeholder;
  }

  return undefined;
};
