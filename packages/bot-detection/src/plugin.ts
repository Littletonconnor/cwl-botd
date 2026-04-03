import type { Detector, DetectorCategoryValue, Signal } from './detectors/types'
import type { CollectorDict } from './types'

export type CollectorFn = () => unknown | Promise<unknown>

export interface Plugin {
  name: string
  collectors?: Record<string, CollectorFn>
  detectors?: Detector[]
  init?: () => void | Promise<void>
}

export function defineDetector(config: {
  name: string
  category: DetectorCategoryValue
  detect: (data: CollectorDict) => Signal
}): Detector {
  return config
}

export function defineCollector<T>(
  name: string,
  fn: () => T | Promise<T>,
): Record<string, () => T | Promise<T>> {
  return { [name]: fn }
}

export function definePlugin(config: Plugin): Plugin {
  return config
}
