import { exists, primitives } from './helpers.js';

export const freeze = <T>(thing: T): T => internalFreeze(thing, new WeakSet()) as T;

const internalFreeze = (thing: unknown, visited: WeakSet<object>): unknown => {
  if (!exists(thing)) {
    return Object.freeze(thing);
  }

  if (typeof thing === 'object' && thing !== null) {
    if (visited.has(thing)) {
      return thing;
    }
    visited.add(thing);
  }

  // ArrayBufferView covers TypedArrays + DataView + Buffer — Object.freeze on
  // these throws when the view has elements, so skip them entirely.
  if (ArrayBuffer.isView(thing)) {
    return thing;
  }

  if (primitives.has(typeof thing)) {
    return Object.freeze(thing);
  }

  for (const key of Reflect.ownKeys(thing as object)) {
    const descriptor = Reflect.getOwnPropertyDescriptor(thing as object, key);
    if (descriptor !== undefined && 'value' in descriptor) {
      internalFreeze(descriptor.value, visited);
    }
  }

  return Object.freeze(thing);
};
