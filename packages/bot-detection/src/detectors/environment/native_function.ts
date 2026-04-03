import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

const NATIVE_RE = /^function \w+\(\) \{\s*\[native code\]\s*\}$/

const FUNCTIONS_TO_CHECK = [
  { obj: () => Function.prototype.toString, name: 'Function.prototype.toString' },
  { obj: () => navigator.getUserMedia ?? navigator.mediaDevices?.getUserMedia, name: 'getUserMedia' },
  { obj: () => (navigator as any).permissions?.query, name: 'Permissions.query' },
]

const detector: Detector = {
  name: 'nativeFunction',
  category: DetectorCategory.Inconsistency,
  detect(_data: CollectorDict): Signal {
    if (typeof window === 'undefined') {
      return { detected: false, score: 0, reason: 'nativeFunction: not in browser' }
    }

    const overridden: string[] = []

    for (const { obj, name } of FUNCTIONS_TO_CHECK) {
      try {
        const fn = obj()
        if (typeof fn !== 'function') continue
        const str = Function.prototype.toString.call(fn)
        if (!NATIVE_RE.test(str)) {
          overridden.push(name)
        }
      } catch {
        // skip inaccessible functions
      }
    }

    if (overridden.length > 0) {
      return {
        detected: true,
        score: 0.7,
        reason: `Native function override detected: ${overridden.join(', ')}`,
      }
    }

    return { detected: false, score: 0, reason: 'nativeFunction: all checked functions appear native' }
  },
}

export default detector
