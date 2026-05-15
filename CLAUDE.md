# @coroboros/clone

Deep clone and deep freeze for JavaScript — prototype-aware. Preserves the prototype chain, property descriptors, boxed primitives, and native types (Map, Set, Date, RegExp, Error subclasses, TypedArray, DataView, ArrayBuffer, Buffer). Cycle-safe.

## Canonical rules

Global rules (`~/.claude/rules/*`) inherit automatically — tech-standards, writing, find-docs, git-conventions, privacy, overrides. The path-scoped `@~/.claude/rules/changelog.md` applies when editing `CHANGELOG.md`. Git-conventions divergences are stated inline in `## Rules` below.

## Tech Stack
- TypeScript strict, ES modules + CJS dual build (tsdown)
- Vitest for tests, Biome for lint/format
- Node.js 22 LTS
- Zero runtime dependencies

## Commands
- `pnpm build` — bundle ESM + CJS + types to `dist/`
- `pnpm test` — run Vitest suite
- `pnpm lint` / `pnpm lint:fix` — Biome check
- `pnpm typecheck` — tsc --noEmit
- `pnpm dev` — tsdown watch mode

## Important Files
- `src/index.ts` — public entry: `clone`, `freeze`, `CloneOptions`
- `src/clone.ts` — deep clone with prototype + descriptor preservation, cycle-safe via WeakMap
- `src/freeze.ts` — deep freeze (skips TypedArray + DataView)
- `src/helpers.ts` — internal: `exists`, `is`, `getType` (NOT exported)
- `tests/` — Vitest suites

## Public API (1.0.0 contract)
- `clone<T>(thing: T, options?: CloneOptions): T` — generic-preserving deep clone
- `freeze<T>(thing: T): T` — recursive deep freeze
- `CloneOptions` — `{ ignoreUndefinedProperties?: boolean }`

## Rules
- **NEVER** break the public API above. The signatures and semantics are the 1.0.0 contract.
- **NEVER** add a runtime dependency. Zero-dep is a feature.
- **NEVER** export `exists`, `is`, `getType` — they are internal helpers only.
- **NEVER** use `axios`, `request`, or `node-fetch` — use native `fetch` (Node 22+).
- Cycle handling via WeakMap visited-cache is contract — never remove.
- Run `pnpm lint && pnpm typecheck && pnpm test` before every commit.
- Scoped package — `publishConfig.access = "public"` is mandatory, do not remove.
