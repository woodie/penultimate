# qvick

[![Vitest](https://img.shields.io/badge/Vitest-4.1+-6E9F18?logo=vitest&logoColor=white)](package.json)
[![CI](https://github.com/woodie/qvick/actions/workflows/ci.yml/badge.svg)](https://github.com/woodie/qvick/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/woodie/qvick.svg)](https://github.com/woodie/qvick/releases/latest)
[![License](https://img.shields.io/github/license/woodie/qvick.svg)](LICENSE)

A `justBeforeEach` hook for Vitest -- real nested `context`s with less
duplication between them, inspired by [Quick](https://github.com/Quick/Quick).
Works with Vitest 4.1 and later 4.x releases; Vitest 5 isn't supported yet
(see [Requirements](#requirements)).

## Installation

`qvick` is only ever imported from test files, so it belongs in
`devDependencies`. Until it's published to npm, install it from GitHub:

```
npm install --save-dev github:woodie/qvick#v0.1.0
```

There's nothing to register or configure -- import it and use it.

## `justBeforeEach`

Vitest's own `beforeEach` runs fresh before every `it`, from the outermost
`describe` inward -- but there's no hook that runs *after* every
`beforeEach` at every nesting depth, immediately before the `it` itself.
That's `justBeforeEach`'s job: separate what varies (set by an ordinary
`beforeEach` in each `context`) from the action under test (declared once,
in the parent):

```js
import { beforeEach, describe, expect, it } from 'vitest'
import { justBeforeEach } from 'qvick'

const context = describe

describe('Calculator', () => {
  let calculator

  beforeEach(() => { calculator = new Calculator() })

  context('with 5 entered', () => {
    beforeEach(() => { calculator.enter(5) })

    describe('#divideBy', () => {
      let divisor

      justBeforeEach(() => { calculator.divideBy(divisor) })

      context('when the divisor is 1', () => {
        beforeEach(() => { divisor = 1 })

        it('has no remainder', () => {
          expect(calculator.remainder()).toBe(0)
        })
      })

      context('when the divisor is 3', () => {
        beforeEach(() => { divisor = 3 })

        it('has a remainder of 2', () => {
          expect(calculator.remainder()).toBe(2)
        })
      })
    })
  })
})
```

`calculator.divideBy(divisor)` can't be an ordinary `beforeEach` at the
`#divideBy` level, because Vitest always runs a parent's `beforeEach` before
its children's: it would divide by whatever `divisor` was *before* the leaf
`context` set it. `justBeforeEach` runs after every `beforeEach` at every
depth, so `divisor` is always set first, and each `it` just asks
`calculator` what's true now.

When several `justBeforeEach` blocks apply to one test, they run outermost
first, the same order as `beforeEach`. Each one gets the same test context
a `beforeEach` gets (`({ task }) => ...`), and an `async` one is awaited
before the next.

## Works with Vitest's own `it`

`qvick` doesn't replace `it` or `test` -- you keep importing them from
`vitest`, so `it.each`, `it.skip`, `it.only`, `it.fails`, `it.concurrent`
and `retry` all behave as usual. Each test gets its own queue of
`justBeforeEach` steps, so concurrent tests don't share them, and a retried
test runs them again.

## A step that might throw

The usual reason to hoist an action into `justBeforeEach` is to share it
across sibling `context`s -- including ones where the action is expected to
fail. Left alone, a throw inside the step fails the test before any
expectation runs, so the error-path `context` can't assert on it. Capture
the outcome instead, and let each `it` check whichever half it cares about:

```js
let scans, error

justBeforeEach(() => {
  try { scans = parseListing(reply) } catch (e) { error = e }
})

context('when the reply is a listing', () => {
  beforeEach(() => { reply = listingXml; error = undefined })

  it('reads the files', () => { expect(scans).toHaveLength(1) })
})

context("when the reply isn't XML", () => {
  beforeEach(() => { reply = '<html>405 Not Allowed' })

  it('reports it', () => { expect(error.message).toBe('unreadable listing') })
})
```

## Scoping variables

The usual way to share a value between hooks and tests is a `let` declared
in the `describe` body. Vitest runs that body only once, to collect the
tests, so anything assigned there is shared by every test below it -- and a
test that changes it leaves the change behind for the next one. Assign
starting values in a `beforeEach` instead, so every test begins from the
same place, and let each `context`'s own `beforeEach` change only what it's
about.

## Requirements

Vitest 4.1 or a later 4.x release, and Node 20 or later.

`qvick` works by replacing each test's body with one that runs the queued
steps first, using `getFn` and `setFn` from `@vitest/runner`, which Vitest 4
installs alongside itself. Vitest 5 bundles that package inside `vitest`
instead, and the replacement it offers, `TestRunner.setTestFn`, currently
reads a test's body rather than setting it -- so there's no working way to
do this on Vitest 5 yet.

## Development

```
make build   # tsc -p tsconfig.build.json
make test    # vitest run --reporter=tree
make lint    # eslint . && tsc --noEmit
make check   # terse: lint, typecheck, and tests
```
