import type { CollectorDict } from '../types'
import type { Detector, Signal } from './types'

export interface RegistryRunOptions {
  enabled?: string[]
  disabled?: string[]
}

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

  run(data: CollectorDict, options?: RegistryRunOptions): Signal[] {
    const signals: Signal[] = []
    const enabledSet = options?.enabled ? new Set(options.enabled) : null
    const disabledSet = options?.disabled ? new Set(options.disabled) : null

    for (const detector of this.detectors) {
      if (enabledSet && !enabledSet.has(detector.name)) continue
      if (disabledSet?.has(detector.name)) continue

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
