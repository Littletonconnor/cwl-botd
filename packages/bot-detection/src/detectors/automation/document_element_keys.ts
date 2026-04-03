import type { CollectorDict } from '../../types'
import { BotKind, DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const SUSPICIOUS_PATTERNS = ['selenium', 'webdriver', 'driver']

const detector: Detector = {
  name: 'documentElementKeys',
  category: DetectorCategory.Automation,
  detect(_data: CollectorDict): Signal {
    if (typeof document === 'undefined' || !document.documentElement) {
      return { detected: false, score: 0, reason: 'documentElementKeys: no document' }
    }

    const keys = Object.keys(document.documentElement)
    for (const key of keys) {
      const lowerKey = key.toLowerCase()
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (lowerKey.includes(pattern)) {
          return {
            detected: true,
            score: 0.9,
            reason: `document.documentElement has suspicious key "${key}" containing "${pattern}"`,
            botKind: BotKind.Selenium,
          }
        }
      }
    }

    return { detected: false, score: 0, reason: 'documentElementKeys: no suspicious keys' }
  },
}

export default detector
