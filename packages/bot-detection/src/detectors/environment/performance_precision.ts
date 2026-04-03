import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

const detector: Detector = {
  name: 'performancePrecision',
  category: DetectorCategory.Inconsistency,
  detect(_data: CollectorDict): Signal {
    if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
      return { detected: false, score: 0, reason: 'performancePrecision: API unavailable' }
    }

    const samples: number[] = []
    for (let i = 0; i < 20; i++) {
      samples.push(performance.now())
    }

    const allIdentical = samples.every((s) => s === samples[0])
    if (allIdentical) {
      return {
        detected: true,
        score: 0.6,
        reason: 'performance.now() returns identical values across 20 calls (reduced precision or frozen clock)',
      }
    }

    const precisions = samples
      .map((s) => {
        const str = String(s)
        const dot = str.indexOf('.')
        return dot === -1 ? 0 : str.length - dot - 1
      })

    const maxPrecision = Math.max(...precisions)
    if (maxPrecision <= 0) {
      return {
        detected: true,
        score: 0.5,
        reason: 'performance.now() returns only integer values (heavily rounded, typical of automation)',
      }
    }

    return { detected: false, score: 0, reason: 'performancePrecision: timing precision appears normal' }
  },
}

export default detector
