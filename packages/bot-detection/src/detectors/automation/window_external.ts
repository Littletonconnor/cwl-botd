import type { CollectorDict } from '../../types'
import { BotKind, DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'windowExternal',
  category: DetectorCategory.Automation,
  detect(_data: CollectorDict): Signal {
    if (typeof window === 'undefined') {
      return { detected: false, score: 0, reason: 'windowExternal: no window' }
    }

    const external = (window as Window & { external?: { toString?: () => string } }).external
    if (!external) {
      return { detected: false, score: 0, reason: 'windowExternal: not present' }
    }

    try {
      const str = external.toString?.()
      if (str === '[object Sequentum]') {
        return {
          detected: true,
          score: 0.9,
          reason: 'window.external identifies as Sequentum',
          botKind: BotKind.Sequentum,
        }
      }
    } catch {
    }

    return { detected: false, score: 0, reason: 'windowExternal: appears normal' }
  },
}

export default detector
