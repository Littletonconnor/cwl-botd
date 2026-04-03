import type { ScoringOptions } from './detectors/scoring'
import type { BehaviorTrackerOptions } from './behavioral/tracker'

export interface DetectorConfig {
  enabled?: string[]
  disabled?: string[]
}

export interface CollectorConfig {
  enabled?: string[]
  disabled?: string[]
}

export interface PrivacyConfig {
  disableFingerprinting?: boolean
  disableCanvas?: boolean
  disableWebGL?: boolean
  disableAudio?: boolean
  disableFonts?: boolean
}

export interface PerformanceConfig {
  skipExpensive?: boolean
}

export interface BotDetectionConfig {
  detectors?: DetectorConfig
  collectors?: CollectorConfig
  scoring?: ScoringOptions
  behavior?: BehaviorTrackerOptions
  monitoring?: boolean
  privacy?: PrivacyConfig
  performance?: PerformanceConfig
  debug?: boolean
}

const FINGERPRINT_COLLECTORS = [
  'canvasFingerprint',
  'webGlFingerprint',
  'audioFingerprint',
  'fontEnumeration',
] as const

const FINGERPRINT_DETECTORS = [
  'canvasFingerprint',
  'webglAdvanced',
  'audioFingerprint',
  'fontEnumeration',
  'mathFingerprint',
  'spatialConsistency',
  'temporalConsistency',
] as const

const EXPENSIVE_COLLECTORS = [
  'canvasFingerprint',
  'webGlFingerprint',
  'audioFingerprint',
  'fontEnumeration',
] as const

const EXPENSIVE_DETECTORS = [
  'canvasFingerprint',
  'webglAdvanced',
  'audioFingerprint',
  'fontEnumeration',
] as const

const PRIVACY_COLLECTOR_MAP: Record<string, string[]> = {
  disableCanvas: ['canvasFingerprint'],
  disableWebGL: ['webGlFingerprint'],
  disableAudio: ['audioFingerprint'],
  disableFonts: ['fontEnumeration'],
}

const PRIVACY_DETECTOR_MAP: Record<string, string[]> = {
  disableCanvas: ['canvasFingerprint'],
  disableWebGL: ['webglAdvanced'],
  disableAudio: ['audioFingerprint'],
  disableFonts: ['fontEnumeration'],
}

export interface ResolvedFilters {
  disabledCollectors: Set<string>
  disabledDetectors: Set<string>
}

export function resolveFilters(config: BotDetectionConfig): ResolvedFilters {
  const disabledCollectors = new Set<string>()
  const disabledDetectors = new Set<string>()

  if (config.collectors?.disabled) {
    for (const name of config.collectors.disabled) {
      disabledCollectors.add(name)
    }
  }

  if (config.detectors?.disabled) {
    for (const name of config.detectors.disabled) {
      disabledDetectors.add(name)
    }
  }

  if (config.privacy) {
    if (config.privacy.disableFingerprinting) {
      for (const c of FINGERPRINT_COLLECTORS) disabledCollectors.add(c)
      for (const d of FINGERPRINT_DETECTORS) disabledDetectors.add(d)
    }

    for (const [key, collectors] of Object.entries(PRIVACY_COLLECTOR_MAP)) {
      if (config.privacy[key as keyof PrivacyConfig]) {
        for (const c of collectors) disabledCollectors.add(c)
      }
    }

    for (const [key, detectors] of Object.entries(PRIVACY_DETECTOR_MAP)) {
      if (config.privacy[key as keyof PrivacyConfig]) {
        for (const d of detectors) disabledDetectors.add(d)
      }
    }
  }

  if (config.performance?.skipExpensive) {
    for (const c of EXPENSIVE_COLLECTORS) disabledCollectors.add(c)
    for (const d of EXPENSIVE_DETECTORS) disabledDetectors.add(d)
  }

  return { disabledCollectors, disabledDetectors }
}

export function filterByName<T extends Record<string, unknown>>(
  items: T,
  config: { enabled?: string[]; disabled?: string[] } | undefined,
  additionalDisabled: Set<string>,
): T {
  if (!config?.enabled && !config?.disabled && additionalDisabled.size === 0) {
    return items
  }

  const result = {} as Record<string, unknown>
  const enabledSet = config?.enabled ? new Set(config.enabled) : null
  const disabledSet = new Set([...(config?.disabled ?? []), ...additionalDisabled])

  for (const key of Object.keys(items)) {
    if (enabledSet && !enabledSet.has(key)) continue
    if (disabledSet.has(key)) continue
    result[key] = items[key]
  }

  return result as T
}
