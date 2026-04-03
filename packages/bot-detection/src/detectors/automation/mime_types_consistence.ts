import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'mimeTypesConsistence',
  category: DetectorCategory.Automation,
  detect(data: CollectorDict): Signal {
    if (typeof navigator === 'undefined') {
      return { detected: false, score: 0, reason: 'mimeTypesConsistence: no navigator' }
    }

    const uaComponent = data.userAgent
    if (uaComponent.state !== State.Success) {
      return { detected: false, score: 0, reason: 'mimeTypesConsistence: collector unavailable' }
    }

    const isChrome = /Chrome/i.test(uaComponent.value) && !/Edge/i.test(uaComponent.value)

    if (isChrome && navigator.mimeTypes && navigator.mimeTypes.length === 0) {
      return {
        detected: true,
        score: 0.6,
        reason: 'Chrome browser with 0 MIME types, likely headless',
      }
    }

    return { detected: false, score: 0, reason: 'mimeTypesConsistence: MIME types present' }
  },
}

export default detector
