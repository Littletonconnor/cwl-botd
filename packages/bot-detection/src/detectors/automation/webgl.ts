import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { BotKind, DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const HEADLESS_RENDERERS = [
  'SwiftShader',
  'Mesa OffScreen',
  'llvmpipe',
  'Software Rasterizer',
]

const detector: Detector = {
  name: 'webgl',
  category: DetectorCategory.Automation,
  detect(data: CollectorDict): Signal {
    const component = data.webGl
    if (component.state !== State.Success) {
      return { detected: false, score: 0, reason: 'webgl: collector unavailable' }
    }

    const { renderer } = component.value
    if (typeof renderer !== 'string') {
      return { detected: false, score: 0, reason: 'webgl: renderer not a string' }
    }

    for (const pattern of HEADLESS_RENDERERS) {
      if (renderer.includes(pattern)) {
        return {
          detected: true,
          score: 0.8,
          reason: `WebGL renderer "${renderer}" contains "${pattern}", indicating virtual/headless GPU`,
          botKind: BotKind.HeadlessChrome,
        }
      }
    }

    return { detected: false, score: 0, reason: 'webgl: renderer appears normal' }
  },
}

export default detector
