import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

const TARGETS: Array<{ get: () => Function; name: string }> = [
  { get: () => navigator.geolocation?.getCurrentPosition as Function, name: 'geolocation.getCurrentPosition' },
  { get: () => (navigator as any).permissions?.query, name: 'permissions.query' },
  { get: () => screen.orientation?.lock as Function, name: 'screen.orientation.lock' },
  { get: () => document.hasFocus as Function, name: 'document.hasFocus' },
]

const detector: Detector = {
  name: 'tostringInconsistency',
  category: DetectorCategory.Inconsistency,
  detect(_data: CollectorDict): Signal {
    if (typeof window === 'undefined') {
      return { detected: false, score: 0, reason: 'tostringInconsistency: not in browser' }
    }

    const inconsistent: string[] = []

    for (const { get, name } of TARGETS) {
      try {
        const fn = get()
        if (typeof fn !== 'function') continue

        const direct = fn.toString()
        const viaPrototype = Function.prototype.toString.call(fn)

        if (direct !== viaPrototype) {
          inconsistent.push(name)
        }
      } catch {
      }
    }

    if (inconsistent.length > 0) {
      return {
        detected: true,
        score: 0.8,
        reason: `toString inconsistency: ${inconsistent.join(', ')} differ between direct and Function.prototype.toString`,
      }
    }

    return { detected: false, score: 0, reason: 'tostringInconsistency: all checked functions consistent' }
  },
}

export default detector
