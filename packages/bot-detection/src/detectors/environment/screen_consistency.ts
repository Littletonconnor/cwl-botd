import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

const detector: Detector = {
  name: 'screenConsistency',
  category: DetectorCategory.Inconsistency,
  detect(data: CollectorDict): Signal {
    if (typeof screen === 'undefined') {
      return { detected: false, score: 0, reason: 'screenConsistency: screen API unavailable' }
    }

    const dimComponent = data.dimension
    if (dimComponent.state !== State.Success) {
      return { detected: false, score: 0, reason: 'screenConsistency: dimension collector unavailable' }
    }

    const { width: innerW, height: innerH } = dimComponent.value
    const screenW = screen.width
    const screenH = screen.height

    if (screenW === 0 && screenH === 0) {
      return {
        detected: true,
        score: 0.7,
        reason: 'screen dimensions are 0x0 (headless environment)',
      }
    }

    if (innerW > screenW || innerH > screenH) {
      return {
        detected: true,
        score: 0.6,
        reason: `Window (${innerW}x${innerH}) exceeds screen (${screenW}x${screenH})`,
      }
    }

    return { detected: false, score: 0, reason: 'screenConsistency: screen dimensions consistent' }
  },
}

export default detector
