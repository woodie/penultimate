import { beforeEach, type TestContext } from 'vitest'
import { getFn, setFn } from '@vitest/runner'

export type Step = (context: TestContext) => unknown

type Test = TestContext['task']

const queues = new WeakMap<Test, Array<() => unknown>>()

function queueFor (task: Test): Array<() => unknown> {
  const queued = queues.get(task)
  if (queued !== undefined) return queued
  const queue: Array<() => unknown> = []
  queues.set(task, queue)
  const test = getFn(task)
  // Vitest reads the test body only after every beforeEach has run, so the steps land in between.
  setFn(task, async () => {
    for (const step of queue) await step()
    return test()
  })
  return queue
}

export function justBeforeEach (step: Step): void {
  beforeEach((context) => {
    const queue = queueFor(context.task)
    queue.push(() => step(context))
    return () => { queue.length = 0 }
  })
}
