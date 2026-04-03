import { automationDetectors } from './automation'
import { environmentDetectors } from './environment'
import { fingerprintDetectors } from './fingerprint'
import { lieDetectors } from './lie_detection'
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
  registry.registerAll(environmentDetectors)
  registry.registerAll(lieDetectors)
  registry.registerAll(fingerprintDetectors)
  return registry
}
