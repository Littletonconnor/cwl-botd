import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

// This detector is intentionally conservative. Modern browsers aggressively
// round performance.now() (to 100μs or 1ms) as a Spectre mitigation.
// Synchronous sampling — even with heavy CPU work between calls — frequently
// produces identical values in real browsers. We only flag when there is
// additional corroborating evidence (integer-only values AND zero variance),
// which is characteristic of fully mocked timing APIs in automation.
const detector: Detector = {
  name: 'performancePrecision',
  category: DetectorCategory.Inconsistency,
  detect(_data: CollectorDict): Signal {
    if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
      return { detected: false, score: 0, reason: 'performancePrecision: API unavailable' }
    }

    const t1 = performance.now()

    // Burn ~5ms of CPU
    let x = 0
    for (let j = 0; j < 500_000; j++) x += Math.sin(j)
    void x

    const t2 = performance.now()
    const elapsed = t2 - t1

    // A real browser with even 1ms rounding should show elapsed > 0 after
    // 500K sin() calls (~5ms). A fully mocked/frozen clock returns 0.
    if (elapsed === 0) {
      // Double-check: take another measurement
      let y = 0
      for (let j = 0; j < 500_000; j++) y += Math.cos(j)
      void y
      const t3 = performance.now()

      if (t3 === t1) {
        return {
          detected: true,
          score: 0.3,
          reason: 'performance.now() returned 0ms elapsed after ~10ms of CPU work (frozen clock)',
        }
      }
    }

    return { detected: false, score: 0, reason: 'performancePrecision: timing appears normal' }
  },
}

export default detector
