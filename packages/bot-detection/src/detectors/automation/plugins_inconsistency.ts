import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'pluginsInconsistency',
  category: DetectorCategory.Automation,
  detect(data: CollectorDict): Signal {
    const pluginsComponent = data.plugins
    const uaComponent = data.userAgent

    if (pluginsComponent.state !== State.Success || uaComponent.state !== State.Success) {
      return { detected: false, score: 0, reason: 'pluginsInconsistency: collector unavailable' }
    }

    const ua = uaComponent.value
    const pluginCount = pluginsComponent.value
    const isChrome = /Chrome/i.test(ua) && !/Edge/i.test(ua)
    const isAndroid = /Android/i.test(ua)

    if (isChrome && !isAndroid && pluginCount === 0) {
      return {
        detected: true,
        score: 0.7,
        reason: 'Chrome on desktop with 0 plugins, likely headless',
      }
    }

    return { detected: false, score: 0, reason: 'pluginsInconsistency: plugins count normal' }
  },
}

export default detector
