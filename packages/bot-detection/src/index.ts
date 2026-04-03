import BotDetector from './detector'

async function load() {
  const detector = new BotDetector()
  await detector.collect()
  return detector
}

export { load }
export { BotDetector }
export { DetectorRegistry, BotKind, DetectorCategory, score } from './detectors'
export type {
  BotKindValue,
  Detector,
  DetectionResult,
  DetectorCategoryValue,
  Signal,
} from './detectors'
export type { ScoringOptions } from './detectors/scoring'
