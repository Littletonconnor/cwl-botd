/**
 * Full pipeline benchmarks.
 *
 * Measures end-to-end: load() → detect(), including collection, detection,
 * and scoring. Also benchmarks detect() with debug mode to quantify the
 * telemetry overhead.
 */

import { bench, describe } from 'vitest'
import { BotDetector } from '../src/detector'
import { PIPELINE_TIME_MS } from './thresholds'

describe(`Full pipeline — load + detect (target: <${PIPELINE_TIME_MS}ms)`, () => {
  bench('default config', async () => {
    const detector = new BotDetector()
    await detector.collect()
    await detector.detect()
    detector.destroy()
  })

  bench('performance mode (skipExpensive)', async () => {
    const detector = new BotDetector({ performance: { skipExpensive: true } })
    await detector.collect()
    await detector.detect()
    detector.destroy()
  })

  bench('privacy mode (disableFingerprinting)', async () => {
    const detector = new BotDetector({ privacy: { disableFingerprinting: true } })
    await detector.collect()
    await detector.detect()
    detector.destroy()
  })
})

describe('Debug mode overhead', () => {
  bench('detect() without debug', async () => {
    const detector = new BotDetector()
    await detector.collect()
    await detector.detect()
    detector.destroy()
  })

  bench('detect() with debug', async () => {
    const detector = new BotDetector({ debug: true })
    await detector.collect()
    await detector.detect()
    detector.destroy()
  })
})

describe('Re-detection (cached collections)', () => {
  bench('detect() on already-collected data', async () => {
    const detector = new BotDetector()
    await detector.collect()
    await detector.detect()
    await detector.detect()
    detector.destroy()
  })
})
