import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

function isProxied(obj: object, prop: string): boolean {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop)
    if (!descriptor) return false
    if (descriptor.get) {
      const getterStr = Function.prototype.toString.call(descriptor.get)
      if (!/\[native code\]/.test(getterStr)) return true
    }
  } catch {
    return true
  }
  return false
}

function checkNavigatorProxy(): string[] {
  if (typeof navigator === 'undefined') return []
  const suspicious: string[] = []

  const props = ['userAgent', 'platform', 'languages', 'hardwareConcurrency', 'deviceMemory', 'webdriver']
  for (const prop of props) {
    if (isProxied(navigator, prop)) {
      suspicious.push(`navigator.${prop}`)
    }
  }

  try {
    const proto = Object.getPrototypeOf(navigator)
    if (proto !== Navigator.prototype) {
      suspicious.push('navigator.__proto__ !== Navigator.prototype')
    }
  } catch {
    // ignore
  }

  return suspicious
}

const detector: Detector = {
  name: 'proxyDetection',
  category: DetectorCategory.Inconsistency,
  detect(_data: CollectorDict): Signal {
    if (typeof window === 'undefined') {
      return { detected: false, score: 0, reason: 'proxyDetection: not in browser' }
    }

    const suspicious = checkNavigatorProxy()

    if (suspicious.length > 0) {
      return {
        detected: true,
        score: 0.9,
        reason: `Proxy/getter override detected on: ${suspicious.join(', ')}`,
      }
    }

    return { detected: false, score: 0, reason: 'proxyDetection: no proxy overrides detected' }
  },
}

export default detector
