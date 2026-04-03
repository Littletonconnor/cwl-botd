import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'webdriver',
  category: DetectorCategory.Automation,
  detect(data: CollectorDict): Signal {
    const component = data.webDriver
    if (component.state !== State.Success) {
      return { detected: false, score: 0, reason: 'webdriver: collector unavailable' }
    }

    const value = component.value
    if (value === true) {
      return {
        detected: true,
        score: 1.0,
        reason: 'navigator.webdriver is true, indicating automation software',
      }
    }

    return { detected: false, score: 0, reason: 'webdriver: not detected' }
  },
}

export default detector
