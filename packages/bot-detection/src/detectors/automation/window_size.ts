import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'windowSize',
  category: DetectorCategory.Automation,
  detect(data: CollectorDict): Signal {
    const focus = data.documentFocus
    if (focus.state !== State.Success || !focus.value) {
      return { detected: false, score: 0, reason: 'windowSize: document not focused, skipping' }
    }

    if (typeof window === 'undefined') {
      return { detected: false, score: 0, reason: 'windowSize: no window object' }
    }

    const outerWidth = window.outerWidth
    const outerHeight = window.outerHeight

    if (outerWidth === 0 && outerHeight === 0) {
      return {
        detected: true,
        score: 0.8,
        reason: 'outerWidth and outerHeight are both 0, indicating headless browser',
      }
    }

    return { detected: false, score: 0, reason: 'windowSize: dimensions normal' }
  },
}

export default detector
