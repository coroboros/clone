# Changelog

## v1.0.1 - 15/05/2026

### Documentation
- `clone` — align badges with sparkline + switch publish to OIDC (#38)

### Configuration
- `clone` — bump packageManager to pnpm@11.1.2 for OIDC publishing (#39)


## v1.0.0 - 15/05/2026

Initial release of `@coroboros/clone`.

### Features
- `clone<T>(thing, options?)` — deep clone preserving the prototype chain, property descriptors, boxed primitives, native types (`Map`, `Set`, `Date`, `RegExp`, `Error` subclasses, `TypedArray`, `DataView`, `ArrayBuffer`, `Buffer`), and null-prototype objects. Cycle-safe via a `WeakMap` visited cache.
- `freeze<T>(thing)` — recursive deep freeze with a `WeakSet` cycle guard. Skips `ArrayBufferView` instances (`TypedArray`, `DataView`, `Buffer`) since `Object.freeze` throws on them.
- Three granular opt-out flags on `CloneOptions`: `cycles`, `preservePrototype`, `copyDescriptors`. All default `true`. Composing all three `false` gives a fast plain-JSON path competitive with `rfdc`.
- `CloneError` with `code: 'UNSUPPORTED_TYPE'` and `Error.cause` support. `clone` throws it on functions, `Promise`, `Intl.*`, `WeakMap`, `WeakSet`, and constructor functions.
- Browser-safe — the Buffer branch reads `globalThis.Buffer` at module init, so the package works in non-Node bundles.

### Documentation
- README ships with a full API reference, the comparison table vs `structuredClone` / `lodash.cloneDeep` / `rfdc` / `fast-copy`, and the rationale for the prototype + descriptor preservation contract.
- `bench/baseline.md` documents the 1.0.0 numbers across five fixture buckets (flat-10, nested-100, large-1000, with-cycles, class-instances) on Apple M1 / Node 22.22.2.

### Configuration
- TypeScript strict, ES modules + CJS dual build via `tsdown` targeting Node 22 LTS. Zero runtime dependencies.
- `mitata` benchmark suite via `pnpm bench`. `fast-check` property-test suite alongside the unit tests.
- `.github/workflows/ci.yml` calls the `coroboros/ci@v0` reusable workflow with OIDC Trusted Publisher and `npm provenance`.
