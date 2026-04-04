import { describe, it, expect, afterEach } from 'vitest'
import { State } from '../types'
import type { CollectorDict } from '../types'
import prototypeChainDetector from '../detectors/lie_detection/prototype_chain'
import proxyDetectionDetector from '../detectors/lie_detection/proxy_detection'
import tostringInconsistencyDetector from '../detectors/lie_detection/tostring_inconsistency'
import propertyDescriptorDetector from '../detectors/lie_detection/property_descriptor'
import crossAttributeDetector from '../detectors/lie_detection/cross_attribute'

function makeCollectorDict(overrides: Partial<Record<string, unknown>> = {}): CollectorDict {
  const defaults: Record<string, unknown> = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    platform: 'Win32',
    language: [['en-US'], ['en-US', 'en']],
    timezone: { timezone: 'America/New_York', locale: 'en-US' },
    webDriver: false,
    webGl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1080)' },
    documentFocus: true,
    scrollBehavior: [],
    mouseBehavior: [],
    clickBehavior: [],
    dimension: { width: 1920, height: 1080 },
    plugins: 5,
  }

  const merged = { ...defaults, ...overrides }
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(merged)) {
    if (value !== null && typeof value === 'object' && 'state' in (value as Record<string, unknown>)) {
      result[key] = value
    } else {
      result[key] = { state: State.Success, value }
    }
  }

  return result as unknown as CollectorDict
}

describe('Lie Detection Detectors - Extended Coverage', () => {
  describe('prototypeChain - tampering detection', () => {
    const origPush = Array.prototype.push
    const origMap = Array.prototype.map
    const origStringify = JSON.stringify
    const origParse = JSON.parse
    const origKeys = Object.keys

    afterEach(() => {
      Array.prototype.push = origPush
      Array.prototype.map = origMap
      JSON.stringify = origStringify
      JSON.parse = origParse
      Object.keys = origKeys
    })

    it('detects Array.prototype.push override', () => {
      Array.prototype.push = function (...args: any[]) {
        return origPush.apply(this, args)
      }
      const signal = prototypeChainDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.8)
      expect(signal.reason).toContain('Array.prototype.push')
    })

    it('detects Array.prototype.map override', () => {
      Array.prototype.map = function (cb: any) {
        return origMap.call(this, cb)
      } as any
      const signal = prototypeChainDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('Array.prototype.map')
    })

    it('detects JSON.stringify override', () => {
      JSON.stringify = function (...args: any[]) {
        return origStringify.apply(JSON, args as [any])
      } as any
      const signal = prototypeChainDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('JSON.stringify')
    })

    it('detects JSON.parse override', () => {
      JSON.parse = function (...args: any[]) {
        return origParse.apply(JSON, args as [string])
      } as any
      const signal = prototypeChainDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('JSON.parse')
    })

    it('detects Object.keys override', () => {
      Object.keys = function (obj: any) {
        return origKeys(obj)
      } as any
      const signal = prototypeChainDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('Object.keys')
    })

    it('detects multiple tampered prototypes simultaneously', () => {
      Array.prototype.push = function (...args: any[]) {
        return origPush.apply(this, args)
      }
      JSON.stringify = function (...args: any[]) {
        return origStringify.apply(JSON, args as [any])
      } as any
      const signal = prototypeChainDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('Array.prototype.push')
      expect(signal.reason).toContain('JSON.stringify')
    })

    it('passes when all prototypes are native', () => {
      const signal = prototypeChainDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('proxyDetection - navigator proxy override detection', () => {
    afterEach(() => {
      for (const prop of ['userAgent', 'platform', 'languages', 'hardwareConcurrency', 'deviceMemory', 'webdriver']) {
        const ownDesc = Object.getOwnPropertyDescriptor(navigator, prop)
        if (ownDesc) {
          delete (navigator as any)[prop]
        }
      }
    })

    it('detects non-native getter on navigator.userAgent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'FakeAgent',
        configurable: true,
      })
      const signal = proxyDetectionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.9)
      expect(signal.reason).toContain('navigator.userAgent')
    })

    it('detects non-native getter on navigator.platform', () => {
      Object.defineProperty(navigator, 'platform', {
        get: () => 'FakePlatform',
        configurable: true,
      })
      const signal = proxyDetectionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('navigator.platform')
    })

    it('detects non-native getter on navigator.hardwareConcurrency', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 16,
        configurable: true,
      })
      const signal = proxyDetectionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('navigator.hardwareConcurrency')
    })

    it('detects multiple proxied navigator properties', () => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'FakeAgent',
        configurable: true,
      })
      Object.defineProperty(navigator, 'platform', {
        get: () => 'FakePlatform',
        configurable: true,
      })
      const signal = proxyDetectionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('navigator.userAgent')
      expect(signal.reason).toContain('navigator.platform')
    })

    it('passes with clean navigator (no own property overrides)', () => {
      const signal = proxyDetectionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('tostringInconsistency - function toString tampering', () => {
    it('passes when native functions have consistent toString', () => {
      const signal = tostringInconsistencyDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('consistent')
    })

    it('detects toString inconsistency on document.hasFocus', () => {
      const origHasFocus = document.hasFocus
      const fakeHasFocus = function () { return true }
      fakeHasFocus.toString = function () { return 'function hasFocus() { [native code] }' }
      document.hasFocus = fakeHasFocus as typeof document.hasFocus
      const signal = tostringInconsistencyDetector.detect(makeCollectorDict())
      document.hasFocus = origHasFocus
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('document.hasFocus')
    })
  })

  describe('propertyDescriptor - extended override detection', () => {
    afterEach(() => {
      for (const prop of ['webdriver', 'plugins', 'languages', 'hardwareConcurrency', 'platform']) {
        const ownDesc = Object.getOwnPropertyDescriptor(navigator, prop)
        if (ownDesc) {
          delete (navigator as any)[prop]
        }
      }
    })

    it('detects overridden own property on navigator.plugins', () => {
      Object.defineProperty(navigator, 'plugins', {
        value: { length: 5 },
        configurable: true,
        writable: true,
      })
      const signal = propertyDescriptorDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.8)
      expect(signal.reason).toContain('Navigator.plugins')
    })

    it('detects overridden own property on navigator.languages', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['en-US'],
        configurable: true,
        writable: true,
      })
      const signal = propertyDescriptorDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('Navigator.languages')
    })

    it('detects overridden own property on navigator.hardwareConcurrency', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 16,
        configurable: true,
        writable: true,
      })
      const signal = propertyDescriptorDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('Navigator.hardwareConcurrency')
    })

    it('detects overridden own property on navigator.platform', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'FakePlatform',
        configurable: true,
        writable: true,
      })
      const signal = propertyDescriptorDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('Navigator.platform')
    })

    it('detects multiple property descriptor anomalies', () => {
      Object.defineProperty(navigator, 'webdriver', {
        value: false,
        configurable: true,
        writable: true,
      })
      Object.defineProperty(navigator, 'plugins', {
        value: { length: 5 },
        configurable: true,
        writable: true,
      })
      const signal = propertyDescriptorDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('Navigator.webdriver')
      expect(signal.reason).toContain('Navigator.plugins')
    })

    it('passes when no own properties override prototype', () => {
      const signal = propertyDescriptorDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('crossAttribute - extended mismatch scenarios', () => {
    it('detects MacIntel platform with Linux UA', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0',
        platform: 'MacIntel',
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('inconsistent')
    })

    it('detects Linux platform with Windows UA', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        platform: 'Linux x86_64',
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(true)
    })

    it('detects Apple GPU on Linux', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0',
        platform: 'Linux x86_64',
        webGl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('Apple GPU')
    })

    it('passes for macOS platform with macOS UA and Apple GPU', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
        platform: 'MacIntel',
        webGl: { vendor: 'Apple Inc.', renderer: 'Apple M1' },
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('handles unavailable platform collector', () => {
      const data = makeCollectorDict({
        platform: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('handles unavailable WebGL collector gracefully', () => {
      const data = makeCollectorDict({
        webGl: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('passes for Android platform with Android UA', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/120.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        webGl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' },
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })
})
