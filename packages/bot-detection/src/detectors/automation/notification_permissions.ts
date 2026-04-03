import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'notificationPermissions',
  category: DetectorCategory.Automation,
  detect(_data: CollectorDict): Signal {
    if (typeof Notification === 'undefined') {
      return { detected: false, score: 0, reason: 'notificationPermissions: API unavailable' }
    }

    if (Notification.permission === 'denied' && !navigator.userAgent) {
      return {
        detected: true,
        score: 0.5,
        reason: 'Notification permission is denied without user interaction',
      }
    }

    return { detected: false, score: 0, reason: 'notificationPermissions: normal state' }
  },
}

export default detector
