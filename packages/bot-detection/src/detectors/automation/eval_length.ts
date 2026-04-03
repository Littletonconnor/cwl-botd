import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const KNOWN_LENGTHS = new Set([33, 37, 39])

const detector: Detector = {
  name: 'evalLength',
  category: DetectorCategory.Automation,
  detect(_data: CollectorDict): Signal {
    try {
      const length = eval.toString().length
      if (!KNOWN_LENGTHS.has(length)) {
        return {
          detected: true,
          score: 0.6,
          reason: `eval.toString().length is ${length}, expected one of [33, 37, 39]`,
        }
      }
      return { detected: false, score: 0, reason: 'evalLength: matches known engine' }
    } catch {
      return { detected: false, score: 0, reason: 'evalLength: unable to evaluate' }
    }
  },
}

export default detector
