import type { CollectorDict } from '../../types'
import { BotKind, DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'errorTrace',
  category: DetectorCategory.Automation,
  detect(_data: CollectorDict): Signal {
    try {
      throw new Error('trace')
    } catch (e) {
      const stack = (e as Error).stack ?? ''
      if (/PhantomJS/i.test(stack)) {
        return {
          detected: true,
          score: 0.9,
          reason: 'Error stack trace contains PhantomJS reference',
          botKind: BotKind.PhantomJS,
        }
      }
    }

    return { detected: false, score: 0, reason: 'errorTrace: no bot patterns found' }
  },
}

export default detector
