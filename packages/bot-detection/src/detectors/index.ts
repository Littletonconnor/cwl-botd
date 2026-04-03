import { automationDetectors } from './automation'
import { DetectorRegistry } from './registry'

export { DetectorRegistry } from './registry'
export { score } from './scoring'
export type { ScoringOptions } from './scoring'
export { BotKind, DetectorCategory } from './types'
export type {
  BotKindValue,
  Detector,
  DetectionResult,
  DetectorCategoryValue,
  Signal,
} from './types'

export function createDefaultRegistry(): DetectorRegistry {
  const registry = new DetectorRegistry()
  registry.registerAll(automationDetectors)
  return registry
}
