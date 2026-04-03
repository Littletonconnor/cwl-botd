import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory } from '../types'
import type { Detector, Signal } from '../types'
import { analyzeKeyboard } from '../../behavioral/analyzers/keyboard'

const detector: Detector = {
  name: 'keyboardBehavior',
  category: DetectorCategory.Behavioral,

  detect(data: CollectorDict): Signal {
    const snapshot = data.behaviorSnapshot
    if (!snapshot || snapshot.state !== State.Success) {
      return { detected: false, score: 0, reason: 'keyboardBehavior: no behavioral data' }
    }

    const { keys } = snapshot.value
    if (keys.length < 4) {
      return { detected: false, score: 0, reason: 'keyboardBehavior: insufficient data' }
    }

    const analysis = analyzeKeyboard(keys)
    const anomalies: string[] = []

    if (analysis.uniformTimingRatio > 0.9 && analysis.totalKeyPresses > 5) {
      anomalies.push('perfectly uniform typing speed')
    }

    if (analysis.holdDurationVariance < 1 && analysis.totalKeyPresses > 5) {
      anomalies.push('suspiciously uniform key hold duration')
    }

    if (analysis.avgKeyHoldDuration > 0 && analysis.avgKeyHoldDuration < 5) {
      anomalies.push('impossibly short key hold times')
    }

    if (analysis.interKeyDelayVariance < 1 && analysis.totalKeyPresses > 5) {
      anomalies.push('machine-like inter-key timing')
    }

    if (anomalies.length === 0) {
      return { detected: false, score: 0, reason: 'keyboardBehavior: patterns appear human' }
    }

    return {
      detected: true,
      score: Math.min(0.3 + anomalies.length * 0.25, 1.0),
      reason: `Keyboard anomalies: ${anomalies.join('; ')}`,
    }
  },
}

export default detector
