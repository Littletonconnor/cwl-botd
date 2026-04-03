import { BotDetector } from './detector'
import type { BotDetectionConfig } from './config'

async function load(options?: BotDetectionConfig): Promise<BotDetector> {
  const detector = new BotDetector(options)
  await detector.collect()

  if (options?.monitoring) {
    detector.startBehaviorTracking()
  }

  return detector
}

export { load }
export { BotDetector }

export {
  DetectorRegistry,
  BotKind,
  DetectorCategory,
  score,
  createDefaultRegistry,
} from './detectors'
export type {
  BotKindValue,
  Detector,
  DetectionResult,
  DetectorCategoryValue,
  Signal,
} from './detectors'

export type { ScoringOptions } from './detectors/scoring'

export type {
  DetectOptions,
  BehaviorResult,
  CollectorDict,
  Component,
  StateValue,
} from './types'
export { State } from './types'

export type {
  BotDetectionConfig,
  DetectorConfig,
  CollectorConfig,
  PrivacyConfig,
  PerformanceConfig,
} from './config'

export { DebugLogger } from './debug'
export type {
  DebugReport,
  DebugLogEntry,
  CollectorDebugInfo,
  DetectorDebugInfo,
  ScoringDebugInfo,
} from './debug'

export { BehaviorTracker } from './behavioral'
export type {
  BehaviorSnapshot,
  BehaviorTrackerOptions,
  MouseEvent_,
  ClickEvent_,
  KeyEvent_,
  ScrollEvent_,
} from './behavioral'
