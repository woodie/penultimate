# Picking up penultimate in a new Cowork session

Cross-project conventions are in `~/workspace/woodie/docs/COWORK.md`.

## What this is

`justBeforeEach` for Vitest, the same hook `kwick` adds to Kotest and
`woodie/spec` adds to Go. Created 2026-10-14 from lambada's page spec, after
checking npm: nothing adds `justBeforeEach` to Vitest or Jest. The closest
are Given/When/Then DSLs (jasmine-given, @hirez_io/jest-given), which replace
`it` with `Then`, and given2/given3, which are lazy `let`, not a hook.
Vitest's own `aroundEach` and fixtures both run *before* `beforeEach`, so
neither can do this.

## Name

First called `qvick` (a pun on Quick, like `kwick`), renamed `penultimate`
on 2026-10-15, before any npm publish: the name says when the hook runs,
second to last, right before the test, for readers who don't know Quick.
The `v0.1.0` tag predates the rename (its `package.json` still says
`qvick`), so the first npm release is 0.1.1.

## Design decisions

- **Don't wrap `it`.** A first draft exported its own `it` that ran the
  queue; it broke `it.each`/`it.skip`/`it.concurrent` and turned a forgotten
  import into a silent no-op. Instead, the first `justBeforeEach` to fire for
  a test swaps that test's body (`getFn`/`setFn`) for one that runs the
  queue, then the original. Vitest reads the body only after every
  `beforeEach`, so the order comes out right with the stock `it`.
- **Per-test queues** in a `WeakMap` keyed by the task, cleared by the
  `beforeEach` cleanup, so concurrent tests and retries work.
- **Import from `@vitest/runner`, not `TestRunner`.** Vitest 4.1 deprecated
  `vitest/suite` in favor of static methods on `TestRunner`, but
  `TestRunner.setTestFn` is defined as `getFn` (and `setSuiteHooks` as
  `getHooks`) -- still true in 5.0.5. Vitest 5 also bundles the runner, so
  `@vitest/runner` isn't installed and nothing public can set a test's body.
  Hence `vitest >=4.1.0 <5`.

## Contributing upstream to Vitest

Step 1 is filed: Woodie opened vitest-dev/vitest#11639 ("setTestFn bug")
on 2026-10-19, after the npm publish. As of 2026-10-23 it's `pending
triage`, with no comments and no `approved` label. Next: wait for
`approved`, then file the feature issue (step 2). Researched 2026-10-15
against `main` at v5.0.5 (7a825db), still the latest release on 2026-10-23.

**Order is forced by Vitest's PR policy** (CONTRIBUTING.md, "Pull Request
Policy"): PRs are auto-closed unless they're for an issue labeled `approved`
(or from an approved contributor). So: issue first, wait for `approved`, then
PR from a fork with `Fixes #...`. Their AI_POLICY.md asks that issues and PR
descriptions be written in Woodie's own voice, not pasted from Claude, and
that he can explain every line. Claude gathers facts; Woodie writes the text.
No existing issue mentioned `justBeforeEach` or `setTestFn` as of that date.

1. **Bug issue first (small, easy to approve).** In
   `packages/vitest/src/runtime/runners/test.ts` (lines ~291-292),
   `static setSuiteHooks = getHooks` and `static setTestFn = getFn`: both
   setters are aliased to their getters. They should be `setHooks`/`setFn`
   (both exported from `runtime/runner/map.ts`). `vitest/suite`'s deprecation
   warning points users at these. Fixing it is also what would let
   `penultimate` work on Vitest 5 without a custom runner.
2. **Feature issue: `justBeforeEach`.** Case: Quick, Ginkgo and RSpec-style
   tools have it; `aroundEach` and fixtures both run *before* `beforeEach`, so
   they can't do it; `penultimate` proves the behavior on 4.1 but has to reach
   into runner internals, and on Vitest 5 it can't at all (bug above).
3. **The PR, once approved** -- follows the shape `aroundEach` set in 4.1:
   - `runtime/runner/types.ts`: add `justBeforeEach` to `SuiteHooks`.
   - `runtime/runner/suite.ts`: initialize it to `[]` with the other hooks.
   - `runtime/runner/hooks.ts`: `justBeforeEach()` cloned from
     `beforeEach()` (timeout, fixtures, cleanup keys).
   - `runtime/runner/run.ts`: call `callSuiteHook(..., 'justBeforeEach', ...)`
     right after the `beforeEach` call (~line 633), and extend the
     parent-first condition at ~line 188 (`name === 'beforeEach' &&
     parentSuite`) to include it.
   - `public/index.ts` export, plus `test/unit/test/exports.test.ts`.
   - Docs: `docs/api/hooks.md`, and the order list in
     `docs/guide/lifecycle.md`.
   - Tests: `test/e2e/test/just-before-each.test.ts`, modeled on
     `around-each.test.ts`: parent-first order, after every `beforeEach`,
     re-run on retry, per-test with `concurrent`.

Fork with `cd ~/workspace && gh repo fork vitest-dev/vitest --clone`; the
monorepo needs `pnpm` (`pnpm install && pnpm build`, then
`CI=true pnpm test <file>`).

Until upstream lands, a custom runner (`test.runner`, overriding `runTask`)
would work on Vitest 5 at the cost of one line of config.

## Gotchas

- `npm install` without a lockfile fails in npm 10 with "Cannot read
  properties of null (reading 'edgesOut')" -- vite's optional peer
  `@vitejs/devtools` pulls `vitest@*` (5.x) into the peer set. `.npmrc` sets
  `legacy-peer-deps=true`; with `package-lock.json` committed, `npm ci` works.

## Publishing

CI's `publish` job releases each `v*` tag through npm trusted publishing
(OIDC, no stored token), after tests pass. It checks that the tag matches
`package.json`'s version and skips a version that's already on npm. The npm
accounts (`johnwoodell`, `mrjw`) are covered in
`~/workspace/woodie/docs/COWORK.md`.

## Current status

0.1.1 published to npm on 2026-10-18 from Woodie's Mac (the first release,
before the trusted publisher could be configured); later tags publish from
CI. Works on Vitest 4.1 only, until #11639 is fixed upstream or a custom
runner is added. The upstream bug issue is open and waiting on triage.
