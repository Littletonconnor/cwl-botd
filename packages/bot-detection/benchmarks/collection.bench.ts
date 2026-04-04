/**
 * Collection phase benchmarks.
 *
 * Measures time to execute all collectors (browser signal gathering).
 * Target: < 5 ms aggregate in a jsdom environment.
 */

import { bench, describe } from 'vitest'
import { collect } from '../src/api'
import { collectors } from '../src/collectors'
import { COLLECTION_TIME_MS } from './thresholds'

describe(`Collection (target: <${COLLECTION_TIME_MS}ms)`, () => {
  bench('all collectors (parallel)', async () => {
    await collect(collectors)
  })

  bench('lightweight collectors only (no fingerprinting)', async () => {
    const { canvasFingerprint, webGlFingerprint, audioFingerprint, fontEnumeration, ...light } = collectors
    await collect(light)
  })
})

describe('Individual collectors', () => {
  for (const [name, fn] of Object.entries(collectors)) {
    bench(name, async () => {
      try {
        await fn()
      } catch {
        // Collectors may throw in jsdom; we still measure the call path
      }
    })
  }
})
