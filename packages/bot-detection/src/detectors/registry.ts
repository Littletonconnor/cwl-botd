import type { CollectorDict } from '../types'
import type { Detector, Signal } from './types'

export class DetectorRegistry {
  private detectors: Detector[] = []

  register(detector: Detector): void {
    this.detectors.push(detector)
  }

  registerAll(detectors: Detector[]): void {
    for (const detector of detectors) {
      this.register(detector)
    }
  }

  run(data: CollectorDict): Signal[] {
    const signals: Signal[] = []

    for (const detector of this.detectors) {
      try {
        signals.push(detector.detect(data))
      } catch {
        signals.push({
          detected: false,
          score: 0,
          reason: `${detector.name}: detector threw an error`,
        })
      }
    }

    return signals
  }

  getDetectors(): readonly Detector[] {
    return this.detectors
  }
}
