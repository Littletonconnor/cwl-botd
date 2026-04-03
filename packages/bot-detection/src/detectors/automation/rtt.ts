import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

interface NetworkInformation {
  rtt?: number
}

const detector: Detector = {
  name: 'rtt',
  category: DetectorCategory.Automation,
  detect(data: CollectorDict): Signal {
    if (typeof navigator === 'undefined') {
      return { detected: false, score: 0, reason: 'rtt: no navigator' }
    }

    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
    if (!connection || typeof connection.rtt !== 'number') {
      return { detected: false, score: 0, reason: 'rtt: Network Information API unavailable' }
    }

    const uaComponent = data.userAgent
    if (uaComponent.state !== State.Success) {
      return { detected: false, score: 0, reason: 'rtt: userAgent collector unavailable' }
    }

    const isAndroid = /Android/i.test(uaComponent.value)

    if (connection.rtt === 0 && !isAndroid) {
      return {
        detected: true,
        score: 0.7,
        reason: 'navigator.connection.rtt is 0 on non-Android desktop, indicating headless',
      }
    }

    return { detected: false, score: 0, reason: 'rtt: value appears normal' }
  },
}

export default detector
