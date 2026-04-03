import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory } from '../types'
import type { Detector, Signal } from '../types'
import { analyzeInteractionTiming } from '../../behavioral/analyzers/interaction_timing'

const detector: Detector = {
  name: 'interactionTiming',
  category: DetectorCategory.Behavioral,

  detect(data: CollectorDict): Signal {
    const snapshot = data.behaviorSnapshot
    if (!snapshot || snapshot.state !== State.Success) {
      return { detected: false, score: 0, reason: 'interactionTiming: no behavioral data' }
    }

    const analysis = analyzeInteractionTiming(snapshot.value)
    const anomalies: string[] = []

    if (analysis.totalInteractions === 0) {
      return { detected: false, score: 0, reason: 'interactionTiming: no interactions recorded' }
    }

    if (analysis.timeToFirstInteraction < 10 && analysis.totalInteractions > 1) {
      anomalies.push('suspiciously fast first interaction')
    }

    if (analysis.suspiciouslyFastClicks > 0) {
      anomalies.push(`${analysis.suspiciouslyFastClicks} click(s) faster than 50ms apart`)
    }

    if (analysis.clickIntervalVariance < 10 && analysis.avgClickInterval > 0) {
      anomalies.push('machine-like click timing regularity')
    }

    if (anomalies.length === 0) {
      return { detected: false, score: 0, reason: 'interactionTiming: patterns appear human' }
    }

    return {
      detected: true,
      score: Math.min(0.3 + anomalies.length * 0.25, 1.0),
      reason: `Interaction timing anomalies: ${anomalies.join('; ')}`,
    }
  },
}

export default detector
