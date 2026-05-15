export const exists = (thing: unknown): boolean =>
  !(thing === undefined || thing === null || Number.isNaN(thing));

type AnyConstructor = (new (...args: never) => unknown) | ((...args: never) => unknown);

export const getType = (thing: unknown): AnyConstructor | undefined =>
  exists(thing) ? (thing as { constructor: AnyConstructor }).constructor : undefined;

export const primitives: ReadonlySet<string> = new Set(['boolean', 'number', 'string', 'symbol']);
