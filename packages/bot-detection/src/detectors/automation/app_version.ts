import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'appVersion',
  category: DetectorCategory.Automation,
  detect(_data: CollectorDict): Signal {
    if (typeof navigator === 'undefined') {
      return { detected: false, score: 0, reason: 'appVersion: no navigator' }
    }

    const appVersion = navigator.appVersion
    if (!appVersion || appVersion.length === 0) {
      return { detected: false, score: 0, reason: 'appVersion: empty or missing (deprecated API)' }
    }

    if (/HeadlessChrome/i.test(appVersion)) {
      return {
        detected: true,
        score: 0.8,
        reason: 'navigator.appVersion contains "HeadlessChrome"',
      }
    }

    return { detected: false, score: 0, reason: 'appVersion: appears normal' }
  },
}

export default detector
