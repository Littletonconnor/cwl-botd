import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'pluginsArray',
  category: DetectorCategory.Automation,
  detect(_data: CollectorDict): Signal {
    if (typeof navigator === 'undefined' || !navigator.plugins) {
      return { detected: false, score: 0, reason: 'pluginsArray: navigator.plugins unavailable' }
    }

    const plugins = navigator.plugins
    if (!(plugins instanceof PluginArray)) {
      return {
        detected: true,
        score: 0.7,
        reason: 'navigator.plugins is not a genuine PluginArray instance',
      }
    }

    return { detected: false, score: 0, reason: 'pluginsArray: structure appears normal' }
  },
}

export default detector
