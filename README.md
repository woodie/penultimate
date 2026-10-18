# penultimate

[![Vitest](https://img.shields.io/badge/Vitest-4.1+-6E9F18?logo=vitest&logoColor=white)](package.json)
[![CI](https://github.com/woodie/penultimate/actions/workflows/ci.yml/badge.svg)](https://github.com/woodie/penultimate/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/penultimate.svg)](https://www.npmjs.com/package/penultimate)
[![Release](https://img.shields.io/github/v/release/woodie/penultimate.svg)](https://github.com/woodie/penultimate/releases/latest)
[![License](https://img.shields.io/github/license/woodie/penultimate.svg)](LICENSE)

A `justBeforeEach` hook for Vitest -- real nested `context`s with less
duplication between them, inspired by [Quick](https://github.com/Quick/Quick).
The name says when it runs: penultimate, second to last, right before the
test itself. Works with Vitest 4.1 and later 4.x releases; Vitest 5 isn't
supported yet (see [Requirements](#requirements)).

## Installation

Since `penultimate` is only ever imported from test files, it belongs in
`devDependencies`:

```
npm install --save-dev penultimate
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
import { justBeforeEach } from 'penultimate'

const context = describe

describe('Calculator', () => {
  let calculator

  beforeEach(() => { calculator = new Calculator() })

  describe('#divide', () => {
    let numerator, denominator, result

    beforeEach(() => { numerator = 10; denominator = 2 })

    justBeforeEach(() => { result = calculator.divide(numerator, denominator) })

    it('returns the quotient', () => {
      expect(result).toBe(5)
    })

    context('when the numerator leaves a remainder', () => {
      beforeEach(() => { numerator = 7 })

      it('drops the remainder', () => {
        expect(result).toBe(3)
      })
    })

    context('when the denominator is 1', () => {
      beforeEach(() => { denominator = 1 })

      it('returns the numerator', () => {
        expect(result).toBe(10)
      })
    })
  })
})
```

Here, `#divide` sets default inputs in an ordinary `beforeEach`, and each
`context` overrides only the one it's about. The call itself can't go in
that `beforeEach`, because Vitest runs a parent's `beforeEach` before its
children's: it would divide 10 by 2 every time, before any `context` had
changed an input. Because `justBeforeEach` runs after every `beforeEach` at
every depth, it always sees the final inputs, and each `it` just checks
`result`. In RSpec terms, the defaults play the part of `let`, and
`justBeforeEach` plays `subject`, which RSpec can leave lazy instead.

When several `justBeforeEach` blocks apply to one test, they run outermost
first, the same order as `beforeEach`. Each one gets the same test context
a `beforeEach` gets (`({ task }) => ...`), and an `async` one is awaited
before the next.

## Works with Vitest's own `it`

You keep importing `it` and `test` from `vitest`, since `penultimate`
doesn't replace them, so `it.each`, `it.skip`, `it.only`, `it.fails`, `it.concurrent`
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
describe('#divide', () => {
  let numerator, denominator, result, error

  beforeEach(() => { numerator = 10; denominator = 2 })

  justBeforeEach(() => {
    result = error = undefined
    try { result = calculator.divide(numerator, denominator) } catch (e) { error = e }
  })

  it('returns the quotient', () => {
    expect(result).toBe(5)
  })

  context('when the denominator is 0', () => {
    beforeEach(() => { denominator = 0 })

    it('reports it', () => {
      expect(error.message).toBe('division by zero')
    })
  })
})
```

Clearing `result` and `error` at the top of the step means no test can see
an outcome left over from the one before it.

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

Under the hood, `penultimate` works by replacing each test's body with one that runs the queued
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
