import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

const NUM_SAMPLES = 5
const WORK_PER_SAMPLE = 500_000

function cpuBurn(iterations: number): void {
  let x = 0
  for (let j = 0; j < iterations; j++) x += Math.sin(j)
  void x
}

const detector: Detector = {
  name: 'performancePrecision',
  category: DetectorCategory.Inconsistency,
  detect(_data: CollectorDict): Signal {
    if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
      return { detected: false, score: 0, reason: 'performancePrecision: API unavailable' }
    }

    const samples: number[] = [performance.now()]
    for (let i = 0; i < NUM_SAMPLES; i++) {
      cpuBurn(WORK_PER_SAMPLE)
      samples.push(performance.now())
    }

    const allIdentical = samples.every((s) => s === samples[0])
    if (allIdentical) {
      return {
        detected: true,
        score: 0.6,
        reason:
          'performance.now() returned identical values across ' +
          `${NUM_SAMPLES + 1} samples — frozen clock`,
      }
    }

    const allInteger = samples.every((s) => Number.isInteger(s))
    const totalElapsed = samples[samples.length - 1]! - samples[0]!
    if (allInteger && totalElapsed <= NUM_SAMPLES) {
      return {
        detected: true,
        score: 0.5,
        reason:
          'performance.now() returned only integer values with minimal elapsed time — ' +
          'heavily rounded or mocked timer',
      }
    }

    return { detected: false, score: 0, reason: 'performancePrecision: timing appears normal' }
  },
}

export default detector
