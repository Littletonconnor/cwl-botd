import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { BotKind, DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'audioFingerprint',
  category: DetectorCategory.Inconsistency,
  detect(data: CollectorDict): Signal {
    const component = data.audioFingerprint
    if (component.state !== State.Success) {
      return { detected: false, score: 0, reason: 'audioFingerprint: collector unavailable' }
    }

    const { hash, sampleRate, supported } = component.value
    const anomalies: string[] = []

    if (!supported) {
      anomalies.push('OfflineAudioContext processing failed')
    }

    if (supported && hash === 0) {
      anomalies.push('audio fingerprint hash is zero (silent rendering)')
    }

    if (supported && sampleRate !== 44100 && sampleRate !== 48000 && sampleRate !== 0) {
      anomalies.push(`unusual sample rate: ${sampleRate}`)
    }

    if (anomalies.length > 0) {
      return {
        detected: true,
        score: Math.min(0.3 + anomalies.length * 0.25, 0.8),
        reason: `Audio fingerprint anomalies: ${anomalies.join('; ')}`,
        botKind: BotKind.HeadlessChrome,
      }
    }

    return { detected: false, score: 0, reason: 'audioFingerprint: no anomalies detected' }
  },
}

export default detector
