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
on 2026-10-15 before any tag or publish: the name says when the hook runs,
second to last, right before the test, for readers who don't know Quick.

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
  `getHooks`) -- still true in 5.0.4. Vitest 5 also bundles the runner, so
  `@vitest/runner` isn't installed and nothing public can set a test's body.
  Hence `vitest >=4.1.0 <5`.

## Vitest 5 plan

1. PR to Vitest: `setTestFn = setFn`, `setSuiteHooks = setHooks`.
2. Issue, then PR: a real `justBeforeEach` in Vitest, run by the runner right
   after `callSuiteHook(..., 'beforeEach')`.
3. Meanwhile, a custom runner (`test.runner`, overriding `runTask`) would
   work on Vitest 5 at the cost of one line of config.

## Gotchas

- `npm install` without a lockfile fails in npm 10 with "Cannot read
  properties of null (reading 'edgesOut')" -- vite's optional peer
  `@vitejs/devtools` pulls `vitest@*` (5.x) into the peer set. `.npmrc` sets
  `legacy-peer-deps=true`; with `package-lock.json` committed, `npm ci` works.

## Publishing

Same as humane-ts: CI's `publish` job is paused (`if: false`) until npm
account access is recovered. Until then, consumers install from a GitHub tag.
