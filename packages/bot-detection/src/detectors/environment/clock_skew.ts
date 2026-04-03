import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

const detector: Detector = {
  name: 'clockSkew',
  category: DetectorCategory.Inconsistency,
  detect(_data: CollectorDict): Signal {
    if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
      return { detected: false, score: 0, reason: 'clockSkew: performance API unavailable' }
    }

    const t1Date = Date.now()
    const t1Perf = performance.now()

    let iterations = 0
    while (iterations < 100000) { iterations++ }

    const t2Date = Date.now()
    const t2Perf = performance.now()

    const dateDelta = t2Date - t1Date
    const perfDelta = t2Perf - t1Perf

    if (perfDelta === 0 && dateDelta === 0) {
      return { detected: false, score: 0, reason: 'clockSkew: deltas too small to measure' }
    }

    if (perfDelta > 0 && dateDelta > 0) {
      const ratio = dateDelta / perfDelta
      if (ratio > 10 || ratio < 0.1) {
        return {
          detected: true,
          score: 0.6,
          reason: `Date.now() and performance.now() clock skew ratio is ${ratio.toFixed(2)} (expected ~1.0)`,
        }
      }
    }

    return { detected: false, score: 0, reason: 'clockSkew: clocks appear consistent' }
  },
}

export default detector
