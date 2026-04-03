import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'canvasFingerprint',
  category: DetectorCategory.Inconsistency,
  detect(data: CollectorDict): Signal {
    const component = data.canvasFingerprint
    if (component.state !== State.Success) {
      return { detected: false, score: 0, reason: 'canvasFingerprint: collector unavailable' }
    }

    const { toDataURLOverridden, isStable, length } = component.value
    const anomalies: string[] = []

    if (toDataURLOverridden) {
      anomalies.push('toDataURL has been overridden (possible noise injection)')
    }

    if (!isStable) {
      anomalies.push('canvas output is not stable across calls (noise injection detected)')
    }

    if (length < 100) {
      anomalies.push('canvas data suspiciously small (rendering may be blocked or faked)')
    }

    if (anomalies.length > 0) {
      return {
        detected: true,
        score: Math.min(0.4 + anomalies.length * 0.25, 1.0),
        reason: `Canvas fingerprint anomalies: ${anomalies.join('; ')}`,
      }
    }

    return { detected: false, score: 0, reason: 'canvasFingerprint: no anomalies detected' }
  },
}

export default detector
