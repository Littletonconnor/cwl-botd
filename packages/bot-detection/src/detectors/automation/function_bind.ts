import type { CollectorDict } from '../../types'
import { BotKind, DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'functionBind',
  category: DetectorCategory.Automation,
  detect(_data: CollectorDict): Signal {
    if (typeof Function.prototype.bind !== 'function') {
      return {
        detected: true,
        score: 0.9,
        reason: 'Function.prototype.bind is missing, indicating PhantomJS',
        botKind: BotKind.PhantomJS,
      }
    }

    return { detected: false, score: 0, reason: 'functionBind: bind exists' }
  },
}

export default detector
