/**
 * Memory usage profiling.
 *
 * Uses process.memoryUsage() to measure heap growth around key operations.
 * This runs as a vitest test (not a bench loop) because we need precise
 * before/after snapshots rather than throughput numbers.
 */

import { describe, it, expect } from 'vitest'
import { collect } from '../src/api'
import { collectors } from '../src/collectors'
import { score } from '../src/detectors/scoring'
import { BotDetector } from '../src/detector'
import { createHumanCollectorData, createBotCollectorData, createRegistry } from './setup'
import { DETECTION_HEAP_BYTES, PIPELINE_HEAP_BYTES } from './thresholds'

function forceGC() {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc()
  }
}

function heapUsed(): number {
  forceGC()
  return process.memoryUsage().heapUsed
}

describe('Memory usage', () => {
  it(`detection allocates < ${(DETECTION_HEAP_BYTES / 1024).toFixed(0)} KB`, () => {
    const registry = createRegistry()
    const data = createHumanCollectorData()

    const before = heapUsed()
    const signals = registry.run(data)
    score(signals)
    const after = heapUsed()

    const delta = after - before
    console.log(`  Detection heap delta: ${(delta / 1024).toFixed(1)} KB`)
    expect(delta).toBeLessThan(DETECTION_HEAP_BYTES)
  })

  it(`full pipeline allocates < ${(PIPELINE_HEAP_BYTES / 1024).toFixed(0)} KB`, async () => {
    const before = heapUsed()
    const detector = new BotDetector()
    await detector.collect()
    await detector.detect()
    const after = heapUsed()
    detector.destroy()

    const delta = after - before
    console.log(`  Pipeline heap delta: ${(delta / 1024).toFixed(1)} KB`)
    expect(delta).toBeLessThan(PIPELINE_HEAP_BYTES)
  })

  it('destroy() releases references', async () => {
    const detector = new BotDetector({ debug: true })
    await detector.collect()
    await detector.detect()

    const beforeDestroy = heapUsed()
    detector.destroy()
    const afterDestroy = heapUsed()

    const freed = beforeDestroy - afterDestroy
    console.log(`  Memory freed by destroy(): ${(freed / 1024).toFixed(1)} KB`)
    expect(detector.getCollections()).toBeUndefined()
    expect(detector.getDetections()).toBeUndefined()
    expect(detector.getDebugReport()).toBeUndefined()
  })

  it('bot profile detection does not allocate significantly more than human', () => {
    const registry = createRegistry()
    const humanData = createHumanCollectorData()
    const botData = createBotCollectorData()

    const hBefore = heapUsed()
    const hSignals = registry.run(humanData)
    score(hSignals)
    const hDelta = heapUsed() - hBefore

    const bBefore = heapUsed()
    const bSignals = registry.run(botData)
    score(bSignals)
    const bDelta = heapUsed() - bBefore

    console.log(`  Human detection heap: ${(hDelta / 1024).toFixed(1)} KB`)
    console.log(`  Bot detection heap:   ${(bDelta / 1024).toFixed(1)} KB`)

    const ratio = bDelta > 0 && hDelta > 0 ? Math.max(bDelta, hDelta) / Math.min(bDelta, hDelta) : 1
    expect(ratio).toBeLessThan(5)
  })

  it('repeated detections do not leak memory', async () => {
    const detector = new BotDetector()
    await detector.collect()

    // Warmup
    for (let i = 0; i < 5; i++) await detector.detect()

    const before = heapUsed()
    for (let i = 0; i < 100; i++) await detector.detect()
    const after = heapUsed()
    detector.destroy()

    const perIteration = (after - before) / 100
    console.log(`  Per-detection growth: ${(perIteration / 1024).toFixed(2)} KB`)
    expect(perIteration).toBeLessThan(50 * 1024)
  })
})
