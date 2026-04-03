import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory } from '../types'
import type { Detector, Signal } from '../types'
import { analyzeScroll } from '../../behavioral/analyzers/scroll'

const detector: Detector = {
  name: 'scrollBehavior',
  category: DetectorCategory.Behavioral,

  detect(data: CollectorDict): Signal {
    const snapshot = data.behaviorSnapshot
    if (!snapshot || snapshot.state !== State.Success) {
      return { detected: false, score: 0, reason: 'scrollBehavior: no behavioral data' }
    }

    const { scrolls } = snapshot.value
    if (scrolls.length < 3) {
      return { detected: false, score: 0, reason: 'scrollBehavior: insufficient data' }
    }

    const analysis = analyzeScroll(scrolls)
    const anomalies: string[] = []

    if (analysis.uniformIncrementRatio > 0.9 && analysis.totalScrollEvents > 5) {
      anomalies.push('perfectly uniform scroll increments')
    }

    if (analysis.velocityVariance < 0.001 && analysis.totalScrollEvents > 5) {
      anomalies.push('suspiciously constant scroll velocity')
    }

    if (analysis.directionChanges === 0 && analysis.totalScrollEvents > 20) {
      anomalies.push('no direction changes in extended scrolling')
    }

    if (anomalies.length === 0) {
      return { detected: false, score: 0, reason: 'scrollBehavior: patterns appear human' }
    }

    return {
      detected: true,
      score: Math.min(0.3 + anomalies.length * 0.25, 1.0),
      reason: `Scroll anomalies: ${anomalies.join('; ')}`,
    }
  },
}

export default detector
