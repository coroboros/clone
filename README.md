<div align="center">

<img src="assets/logo.png" width="288" height="288" alt="@coroboros/clone"/>

<!-- omit in toc -->
# @coroboros/clone

**Deep clone and deep freeze for JavaScript — prototype-aware.**

Deep clones objects while preserving the prototype chain, property descriptors, boxed primitives, and native types (Map, Set, Date, RegExp, Error subclasses, TypedArray, DataView, ArrayBuffer, Buffer). Cycle-safe via a WeakMap visited cache. Deep-freezes recursively, skipping ArrayBuffer views.

[![npm](https://img.shields.io/npm/v/@coroboros/clone?style=flat-square&color=000000)](https://www.npmjs.com/package/@coroboros/clone)
[![ci](https://img.shields.io/github/actions/workflow/status/coroboros/clone/ci.yml?branch=main&style=flat-square&label=ci&color=000000)](https://github.com/coroboros/clone/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-000000?style=flat-square)](https://opensource.org/licenses/MIT)
[![stars](https://img.shields.io/github/stars/coroboros/clone?style=flat-square&label=stars&color=000000)](https://github.com/coroboros/clone)
[![coroboros.com](https://img.shields.io/badge/coroboros.com-000000?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMiAxMmgyME0xMiAyYTE1LjMgMTUuMyAwIDAgMSA0IDEwIDE1LjMgMTUuMyAwIDAgMS00IDEwIDE1LjMgMTUuMyAwIDAgMS00LTEwIDE1LjMgMTUuMyAwIDAgMSA0LTEweiIvPjwvc3ZnPg==)](https://coroboros.com)

</div>

## Why this exists

`structuredClone` ships in every modern runtime. It strips the prototype chain, so class instances come back as plain objects. It drops property descriptors — non-enumerable fields, accessors, and `configurable: false` flags vanish. Boxed primitives throw. ORM entities, builders, event emitters, frozen state objects, and any custom-constructed value lose information when round-tripped.

`@coroboros/clone` keeps all three. Three opt-out flags trade those guarantees for speed on plain JSON-shaped data, landing in `rfdc`-grade territory without switching libraries.

## Requirements

- Node.js `>=22` LTS. Use [fnm](https://github.com/Schniz/fnm) for version management — Rust-based, faster than nvm.
- Any of the following package managers: `pnpm`, `npm`, `yarn`, `bun`.

## Install

```bash
pnpm add @coroboros/clone
```

```bash
npm install @coroboros/clone
```

```bash
yarn add @coroboros/clone
```

```bash
bun add @coroboros/clone
```

## Usage

```ts
// ESM (recommended)
import { clone, freeze } from '@coroboros/clone';
```

```js
// CommonJS
const { clone, freeze } = require('@coroboros/clone');
```

```ts
import { clone, freeze } from '@coroboros/clone';

class Pet {
  constructor(public name: string) {}
  greet(): string {
    return `hello, ${this.name}`;
  }
}

const original = {
  pet: new Pet('Saturn'),
  history: new Map([['adopted', new Date(2026, 0, 1)]]),
  tags: new Set(['cat', 'tabby']),
};

const copy = clone(original);
copy.pet.greet();           // "hello, Saturn"
copy.pet instanceof Pet;    // true — prototype preserved
copy.history.get('adopted') instanceof Date; // true

const locked = freeze(copy);
Object.isFrozen(locked);    // true
Object.isFrozen(locked.pet); // true — recursive
```

## API

### `clone<T>(thing: T, options?: CloneOptions): T`

Returns a deep copy of `thing`. The return type matches the input type via generic inference.

The clone preserves the prototype chain, property descriptors (including non-enumerable, accessor, and `configurable: false` properties), boxed primitive wrappers, and symbol-keyed properties.

**Parameters**

| Option                              | Type      | Default      | Description                                                                                       |
| ----------------------------------- | --------- | ------------ | ------------------------------------------------------------------------------------------------- |
| `thing`                             | `T`       | *(required)* | Value to clone. Any JavaScript value or object.                                                   |
| `options.ignoreUndefinedProperties` | `boolean` | `false`      | When `true`, omit properties whose value is `undefined`. Recursive.                               |
| `options.cycles`                    | `boolean` | `true`       | When `false`, skips the WeakMap visited cache. Caller asserts no cycles. Faster, infinite-recursion if wrong. |
| `options.preservePrototype`         | `boolean` | `true`       | When `false`, custom objects flatten to plain `{}` (lose `instanceof` and method inheritance).    |
| `options.copyDescriptors`           | `boolean` | `true`       | When `false`, plain objects skip `Reflect.ownKeys` + descriptor walk. Symbol keys and non-enumerable fields drop. Errors keep `message` + `name` only; boxed wrappers keep their value only. |

**Returns** — a deep copy of `thing`, typed as `T`.

#### Supported types

Native types clone with type-specific semantics:

- `Array` — element-by-element deep clone.
- `Map`, `Set` — keys and values cloned independently.
- `Date` — by `valueOf()`.
- `RegExp` — `source` and `flags` preserved.
- `TypedArray` (`Int8Array` through `Float64Array`) — cloned via the constructor.
- `DataView` — buffer copied; `byteOffset` and `byteLength` preserved.
- `Buffer` — bytes copied via `Buffer.allocUnsafe` and `Buffer#copy`. Browser bundles skip this branch via a runtime guard; the type is Node-only.
- `ArrayBuffer` — sliced.
- `Error` and subclasses (`EvalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError`, `URIError`) — own properties copied with full descriptors.
- Boxed primitives (`new String()`, `new Number()`, `new Boolean()`) — wrapper recreated with attached properties.
- Custom objects — created via `Object.create(getPrototypeOf(source))`, then own descriptors applied.
- Null-prototype objects (`Object.create(null)`) — preserved with the null prototype.

#### Cycle handling

A `WeakMap` visited cache preserves circular and shared references. Cyclic inputs round-trip correctly:

```ts
const o: Record<string, unknown> = { name: 'cyclic' };
o.self = o;

const c = clone(o);
c.self === c; // true
```

Shared references stay shared. A diamond input produces a diamond output, with each shared subtree cloned exactly once.

#### Fast clone for plain JSON-shaped data

Composing all three opt-out flags gives a `rfdc`-grade fast path for callers who know their data is plain and acyclic:

```ts
const config = clone(largeJsonConfig, {
  cycles: false,
  preservePrototype: false,
  copyDescriptors: false,
});
```

See `bench/baseline.md` for the head-to-head numbers vs `structuredClone`, `lodash.cloneDeep`, `rfdc`, and `fast-copy`.

#### Unsupported types

The following inputs throw `CloneError` with `code: 'UNSUPPORTED_TYPE'`:

- Functions (sync, async, generator).
- `Promise`.
- `Intl.Collator`, `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.PluralRules`.
- `WeakMap`, `WeakSet`.
- Constructor functions themselves (e.g. `clone(Array)`).

`undefined`, `null`, and `NaN` clone to themselves.

### `freeze<T>(thing: T): T`

Recursive deep freeze. Walks own properties, freezes each value, then freezes the container. A `WeakSet` visited cache makes cyclic inputs safe.

**Parameters**

| Option  | Type | Description       |
| ------- | ---- | ----------------- |
| `thing` | `T`  | Value to freeze.  |

**Returns** — the same value, frozen, typed as `T`.

#### Skipped types

`Object.freeze` throws on `ArrayBufferView` instances with elements. `freeze` leaves the following **unfrozen**:

- All `TypedArray` subclasses (`Int8Array` through `Float64Array`, plus `BigInt64Array` / `BigUint64Array`).
- `DataView`.
- `Buffer` (a `Uint8Array` subclass).

Detection uses `ArrayBuffer.isView(thing)`.

### `CloneOptions`

```ts
type CloneOptions = {
  ignoreUndefinedProperties?: boolean;
  cycles?: boolean;
  preservePrototype?: boolean;
  copyDescriptors?: boolean;
};
```

### `CloneError`

```ts
class CloneError extends Error {
  readonly code: CloneErrorCode;
  constructor(code: CloneErrorCode, message: string, options?: { cause?: unknown });
}

type CloneErrorCode = 'UNSUPPORTED_TYPE';
```

Inherits from `Error`. Supports `Error.cause` for wrapping. The `code` field is a stable string discriminant safe for runtime branching.

## Compared to alternatives

| Feature                                                                       | `structuredClone` | `lodash.cloneDeep` |  `rfdc`  | `fast-copy` | **`@coroboros/clone`** |
| ----------------------------------------------------------------------------- | :---------------: | :----------------: | :------: | :---------: | :--------------------: |
| Native types (`Map`, `Set`, `Date`, `TypedArray`, `ArrayBuffer`, `DataView`)  | yes               | yes                | partial  | yes         | yes                    |
| Cycles                                                                        | yes               | yes                | optional | yes         | yes                    |
| Prototype chain preserved                                                     | no                | partial            | no       | no          | yes                    |
| Property descriptors (non-enumerable, accessor, `configurable: false`)        | no                | no                 | no       | no          | yes                    |
| Boxed primitives (`new String()`, `new Number()`, `new Boolean()`)            | throws            | partial            | no       | no          | yes                    |
| `Error` subclasses with descriptors                                           | partial           | no                 | no       | no          | yes                    |
| Functions, Promises, `WeakMap`, `WeakSet`                                     | no                | no                 | no       | no          | no (by design)         |

The market gap is the prototype chain plus property descriptors. `structuredClone` strips the prototype from class instances; they return as plain objects. `lodash.cloneDeep` drops descriptor flags. ORM entities, builders, event emitters, and any custom-constructed state object stay intact through `clone`.

## Contributing

Bug reports and PRs welcome.

- Open an issue before submitting non-trivial PRs.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- Run `pnpm lint && pnpm typecheck && pnpm test` before pushing.
- Run `pnpm bench` against `bench/baseline.md` when touching `src/clone.ts` — no regression > 10 % at fixed feature set.
- Target the `main` branch.

## License

[MIT](LICENSE.md)
