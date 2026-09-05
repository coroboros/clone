# @coroboros/clone

Prototype-aware deep clone and deep freeze for Node.js 22+, with zero runtime dependencies.

## Project constraints

- Preserve the `clone`, `freeze`, options and error contracts in `README.md` and `src/index.ts`, including generic return types, defaults, prototypes and property descriptors.
- Keep cycle-safe traversal enabled by default. Preserve the ArrayBuffer-view exception in `freeze`.
- Keep `exists`, `getType` and `primitives` in `src/helpers.ts` internal. Add no runtime dependencies; use native `fetch` where network access is needed.
- Preserve the public scoped package and dual ESM/CJS exports.

## Validation

Use the scripts in `package.json`. Source or dependency changes require `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`; documentation-only edits need Markdown and reference checks.

For changes to `src/clone.ts`, run `pnpm bench` against the bucket budgets in `bench/baseline.md`. Reuse passing results while the tested inputs remain unchanged.

## Release

Target `main` through a PR and squash-merge the reviewed head. After release approval, tag the merge commit with the next SemVer. `.github/workflows/ci.yml` delegates version updates, changelog, npm publication and GitHub release to the shared package pipeline; leave those generated artifacts to CI. Publishing uses OIDC with provenance; do not add an npm token or publish locally.
