import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const EXPECTED_PRODUCT_SUB = '20030107'

const detector: Detector = {
  name: 'productSub',
  category: DetectorCategory.Automation,
  detect(data: CollectorDict): Signal {
    const uaComponent = data.userAgent
    if (uaComponent.state !== State.Success) {
      return { detected: false, score: 0, reason: 'productSub: collector unavailable' }
    }

    if (typeof navigator === 'undefined') {
      return { detected: false, score: 0, reason: 'productSub: no navigator' }
    }

    const ua = uaComponent.value
    const isChromeSafariOpera = /Chrome|Safari|Opera/i.test(ua)

    const productSub = navigator.productSub
    if (productSub === undefined || productSub === null) {
      return { detected: false, score: 0, reason: 'productSub: API not available' }
    }

    if (isChromeSafariOpera && productSub !== EXPECTED_PRODUCT_SUB) {
      return {
        detected: true,
        score: 0.6,
        reason: `productSub is "${productSub}" but expected "${EXPECTED_PRODUCT_SUB}" for Chrome/Safari/Opera`,
      }
    }

    return { detected: false, score: 0, reason: 'productSub: matches expected value' }
  },
}

export default detector
