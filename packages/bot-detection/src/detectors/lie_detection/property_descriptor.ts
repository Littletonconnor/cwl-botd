import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

const PROPS_TO_CHECK = ['webdriver', 'plugins', 'languages', 'hardwareConcurrency', 'platform']

const detector: Detector = {
  name: 'propertyDescriptor',
  category: DetectorCategory.Inconsistency,
  detect(_data: CollectorDict): Signal {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return { detected: false, score: 0, reason: 'propertyDescriptor: not in browser' }
    }

    const anomalies: string[] = []

    for (const prop of PROPS_TO_CHECK) {
      try {
        const protoDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, prop)
        const ownDesc = Object.getOwnPropertyDescriptor(navigator, prop)

        if (ownDesc && ownDesc.value !== undefined) {
          anomalies.push(`Navigator.${prop}: overridden as own property on instance`)
        }

        if (protoDesc) {
          if (typeof protoDesc.value !== 'undefined' && typeof protoDesc.get !== 'undefined') {
            anomalies.push(`Navigator.${prop}: has both value and getter`)
          }
        }
      } catch {
        // skip inaccessible
      }
    }

    if (anomalies.length > 0) {
      return {
        detected: true,
        score: 0.8,
        reason: `Property descriptor anomalies: ${anomalies.join('; ')}`,
      }
    }

    return { detected: false, score: 0, reason: 'propertyDescriptor: all descriptors appear normal' }
  },
}

export default detector
