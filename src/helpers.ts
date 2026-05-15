export const exists = (thing: unknown): boolean =>
  !(thing === undefined || thing === null || Number.isNaN(thing));

export const is = (Type: unknown, thing: unknown): boolean => {
  if (!exists(Type) || !exists(thing)) {
    return false;
  }
  const ctor = (thing as { constructor?: unknown }).constructor;
  return (
    ctor === Type ||
    (typeof Type === 'function' && thing instanceof (Type as new (...args: never[]) => unknown))
  );
};

export const getType = (thing: unknown): unknown =>
  exists(thing) ? (thing as { constructor: unknown }).constructor : undefined;

export const primitives: ReadonlySet<string> = new Set(['boolean', 'number', 'string', 'symbol']);

export const typedArrays: ReadonlySet<unknown> = new Set([
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
]);
