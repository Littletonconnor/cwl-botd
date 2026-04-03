import type { DebugLogger } from '../debug'
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

  run(data: CollectorDict, options?: RegistryRunOptions, debugLogger?: DebugLogger): Signal[] {
    const signals: Signal[] = []
    const enabledSet = options?.enabled ? new Set(options.enabled) : null
    const disabledSet = options?.disabled ? new Set(options.disabled) : null

    for (const detector of this.detectors) {
      if (enabledSet && !enabledSet.has(detector.name)) continue
      if (disabledSet?.has(detector.name)) continue

      const start = debugLogger ? performance.now() : 0
      try {
        const signal = detector.detect(data)
        signals.push(signal)

        if (debugLogger) {
          const duration = performance.now() - start
          debugLogger.addDetectorResult({
            name: detector.name,
            category: detector.category,
            detected: signal.detected,
            score: signal.score,
            reason: signal.reason,
            botKind: signal.botKind,
            duration,
          })
          debugLogger.log('detect', detector.name, signal.reason, { detected: signal.detected, score: signal.score }, duration)
        }
      } catch {
        const signal = {
          detected: false,
          score: 0,
          reason: `${detector.name}: detector threw an error`,
        }
        signals.push(signal)

        if (debugLogger) {
          const duration = performance.now() - start
          debugLogger.addDetectorResult({
            name: detector.name,
            category: detector.category,
            detected: false,
            score: 0,
            reason: signal.reason,
            duration,
          })
          debugLogger.log('detect', detector.name, 'detector threw an error', undefined, duration)
        }
      }
    }

    return signals
  }

  getDetectors(): readonly Detector[] {
    return this.detectors
  }
}
