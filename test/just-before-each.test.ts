import { beforeEach, describe, describe as context, expect, it } from 'vitest'
import { justBeforeEach } from '../src/index.js'

describe('justBeforeEach', () => {
  let log: string[]

  beforeEach(() => { log = [] })
  justBeforeEach(() => { log.push('outer justBeforeEach') })

  context('with a beforeEach and a justBeforeEach nested below', () => {
    beforeEach(() => { log.push('inner beforeEach') })
    justBeforeEach(() => { log.push('inner justBeforeEach') })

    it('runs after every beforeEach, outermost first', () => {
      expect(log).toEqual(['inner beforeEach', 'outer justBeforeEach', 'inner justBeforeEach'])
    })
  })

  describe('hoisting the action under test', () => {
    let numerator: number, denominator: number, quotient: number

    beforeEach(() => { numerator = 10 })
    justBeforeEach(() => { quotient = Math.trunc(numerator / denominator) })

    context('when the denominator divides evenly', () => {
      beforeEach(() => { denominator = 2 })

      it('sees the inputs this context set', () => {
        expect(quotient).toBe(5)
      })
    })

    context('when there is a remainder', () => {
      beforeEach(() => { denominator = 3 })

      it('sees the inputs this context set', () => {
        expect(quotient).toBe(3)
      })
    })
  })

  context('with an async step', () => {
    let ready: boolean

    beforeEach(() => { ready = false })
    justBeforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      ready = true
    })

    it('waits for it before the test', () => {
      expect(ready).toBe(true)
    })
  })

  context('with a step that reads the test context', () => {
    let name: string

    justBeforeEach(({ task }) => { name = task.name })

    it('gets the same context beforeEach does', () => {
      expect(name).toBe('gets the same context beforeEach does')
    })
  })

  context('when a step throws', () => {
    justBeforeEach(() => { throw new Error('boom') })

    // eslint-disable-next-line vitest/expect-expect -- an empty body passes, so this only holds if the step's throw fails it
    it.fails('fails the test', () => {})
  })

  describe("with Vitest's own it", () => {
    let runs: number

    beforeEach(() => { runs = 0 })
    justBeforeEach(() => { runs += 1 })

    it.each([1, 2])('runs the steps once for case %i', () => {
      expect(runs).toBe(1)
    })

    context('when tests run concurrently', () => {
      const runsByTest = new Map<string, number>()

      justBeforeEach(async ({ task }) => {
        await new Promise((resolve) => setTimeout(resolve, 1))
        runsByTest.set(task.id, (runsByTest.get(task.id) ?? 0) + 1)
      })

      it.concurrent('gives each test its own steps', ({ task }) => {
        expect(runsByTest.get(task.id)).toBe(1)
      })

      it.concurrent('gives this test its own steps too', ({ task }) => {
        expect(runsByTest.get(task.id)).toBe(1)
      })
    })

    context('when a test is retried', () => {
      let attempts = 0 // never reset by a beforeEach: it has to count across the retry

      justBeforeEach(() => { attempts += 1 })

      it('runs the steps again on the retry', { retry: 1 }, () => {
        expect(attempts).toBe(2)
      })
    })
  })
})
