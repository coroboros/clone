# @coroboros/clone

Deep clone and deep freeze for JavaScript — prototype-aware. Preserves the prototype chain, property descriptors, boxed primitives, and native types (Map, Set, Date, RegExp, Error subclasses, TypedArray, DataView, ArrayBuffer, Buffer). Cycle-safe.

## Canonical rules

Global rules (`~/.claude/rules/*`) inherit automatically — tech-standards, writing, find-docs, git-conventions, privacy, overrides. The path-scoped `@~/.claude/rules/changelog.md` applies when editing `CHANGELOG.md`. Git-conventions divergences are stated inline in `## Rules` below.

## Tech Stack
- TypeScript strict, ES modules + CJS dual build (tsdown)
- Vitest + `fast-check` for property tests, Biome for lint/format
- `mitata` for benchmarks (`pnpm bench`)
- Node.js 22 LTS
- Zero runtime dependencies

## Commands
- `pnpm build` — bundle ESM + CJS + types to `dist/`
- `pnpm test` — run Vitest suite (97 tests, incl. property-based)
- `pnpm lint` / `pnpm lint:fix` — Biome check
- `pnpm typecheck` — tsc --noEmit
- `pnpm bench` — build then run `bench/clone.bench.mjs`
- `pnpm dev` — tsdown watch mode

## Important Files
- `src/index.ts` — public entry: `clone`, `freeze`, `CloneOptions`, `CloneError`, `CloneErrorCode`
- `src/clone.ts` — deep clone with prototype + descriptor preservation, cycle-safe via WeakMap
- `src/freeze.ts` — deep freeze (skips ArrayBufferView via `ArrayBuffer.isView`)
- `src/error.ts` — `CloneError` class with `code` + `cause`
- `src/helpers.ts` — internal: `exists`, `getType`, `primitives` (NOT exported)
- `tests/` — one spec per source module + `clone.property.test.ts` for `fast-check` invariants
- `bench/clone.bench.mjs` — mitata bench vs structuredClone, lodash, rfdc, fast-copy
- `bench/baseline.md` — 1.0.0 numbers + regression budget

## Public API (1.0.0 contract)
- `clone<T>(thing: T, options?: CloneOptions): T` — generic-preserving deep clone
- `freeze<T>(thing: T): T` — recursive deep freeze
- `CloneOptions` — `{ ignoreUndefinedProperties?, cycles?, preservePrototype?, copyDescriptors? }` — all booleans, all default `true` except `ignoreUndefinedProperties` which defaults `false`
- `CloneError` — extends `Error`, exposes `code: CloneErrorCode`, supports `Error.cause`
- `CloneErrorCode` — `'UNSUPPORTED_TYPE'`

## Rules
- **NEVER** break the public API above. The signatures and semantics are the 1.0.0 contract.
- **NEVER** add a runtime dependency. Zero-dep is a feature.
- **NEVER** export `exists`, `getType`, `primitives` — they are internal helpers only.
- **NEVER** use `axios`, `request`, or `node-fetch` — use native `fetch` (Node 22+).
- Cycle handling via WeakMap visited-cache is contract — never remove the default.
- Run `pnpm lint && pnpm typecheck && pnpm test` before every commit.
- Run `pnpm bench` against `bench/baseline.md` when touching `src/clone.ts` — no regression > 10 % at fixed feature set.
- Scoped package — `publishConfig.access = "public"` is mandatory, do not remove.
- **Git** — branch `main`; CI owns `npm publish` exclusively (tag-push triggers `ci.yml` → reusable workflow `coroboros/ci/.github/workflows/javascript-npm-packages.yml@v0` → OIDC Trusted Publisher with `npm provenance`, never manual — manual bypasses attestation and the pre-publish gates); run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` locally before tagging; tag MUST equal `package.json` version (the reusable workflow pins `package.json` to the tag automatically); bump via `pnpm version patch|minor`; release body in `gh release create` stays minimal (no install snippet unless the install command changed). All other rules in `@~/.claude/rules/git-conventions.md` apply.
