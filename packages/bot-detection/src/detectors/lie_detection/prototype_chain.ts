import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

const NATIVE_CODE_RE = /^function \w+\(\) \{\s*\[native code\]\s*\}$/

const TARGETS: Array<{ get: () => Function; name: string }> = [
  { get: () => Array.prototype.push, name: 'Array.prototype.push' },
  { get: () => Array.prototype.map, name: 'Array.prototype.map' },
  { get: () => JSON.stringify, name: 'JSON.stringify' },
  { get: () => JSON.parse, name: 'JSON.parse' },
  { get: () => Object.keys, name: 'Object.keys' },
]

const detector: Detector = {
  name: 'prototypeChain',
  category: DetectorCategory.Inconsistency,
  detect(_data: CollectorDict): Signal {
    if (typeof window === 'undefined') {
      return { detected: false, score: 0, reason: 'prototypeChain: not in browser' }
    }

    const tampered: string[] = []

    for (const { get, name } of TARGETS) {
      try {
        const fn = get()
        if (typeof fn !== 'function') continue
        const str = Function.prototype.toString.call(fn)
        if (!NATIVE_CODE_RE.test(str)) {
          tampered.push(name)
        }
      } catch {
        // inaccessible or throws — not necessarily tampered
      }
    }

    if (tampered.length > 0) {
      return {
        detected: true,
        score: 0.8,
        reason: `Prototype chain tampering: ${tampered.join(', ')} do not return native code`,
      }
    }

    return { detected: false, score: 0, reason: 'prototypeChain: all checked prototypes appear native' }
  },
}

export default detector
