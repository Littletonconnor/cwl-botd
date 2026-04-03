import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory } from '../types'
import type { Detector, Signal } from '../types'
import { analyzeMouseMovement } from '../../behavioral/analyzers/mouse'

const detector: Detector = {
  name: 'mouseMovement',
  category: DetectorCategory.Behavioral,

  detect(data: CollectorDict): Signal {
    const snapshot = data.behaviorSnapshot
    if (!snapshot || snapshot.state !== State.Success) {
      return { detected: false, score: 0, reason: 'mouseMovement: no behavioral data' }
    }

    const { mouse, clicks } = snapshot.value
    if (mouse.length < 3) {
      return { detected: false, score: 0, reason: 'mouseMovement: insufficient data' }
    }

    const analysis = analyzeMouseMovement(mouse, clicks)
    const anomalies: string[] = []

    if (analysis.straightLineRatio > 0.8) {
      anomalies.push('movement is mostly straight lines')
    }

    if (analysis.teleportCount > 0) {
      anomalies.push(`${analysis.teleportCount} teleportation(s) detected`)
    }

    if (analysis.velocityVariance < 0.001 && analysis.totalMoves > 10) {
      anomalies.push('suspiciously uniform velocity')
    }

    if (analysis.gridAlignedRatio > 0.9 && analysis.totalMoves > 10) {
      anomalies.push('movement is grid-aligned')
    }

    if (analysis.entropyScore < 0.3 && analysis.totalMoves > 10) {
      anomalies.push('low directional entropy')
    }

    if (analysis.clicksWithoutMove > 0) {
      anomalies.push(`${analysis.clicksWithoutMove} click(s) without preceding mouse movement`)
    }

    if (anomalies.length === 0) {
      return { detected: false, score: 0, reason: 'mouseMovement: patterns appear human' }
    }

    return {
      detected: true,
      score: Math.min(0.3 + anomalies.length * 0.2, 1.0),
      reason: `Mouse anomalies: ${anomalies.join('; ')}`,
    }
  },
}

export default detector
