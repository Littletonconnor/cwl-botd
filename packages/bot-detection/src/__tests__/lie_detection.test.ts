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

describe('Lie Detection Detectors (2.5)', () => {
  describe('prototypeChain', () => {
    it('passes when prototypes are native', () => {
      const signal = prototypeChainDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('proxyDetection', () => {
    const origDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver')

    afterEach(() => {
      if (origDesc) {
        Object.defineProperty(Navigator.prototype, 'webdriver', origDesc)
      }
      // Clean up any own property on navigator
      const ownDesc = Object.getOwnPropertyDescriptor(navigator, 'webdriver')
      if (ownDesc) {
        delete (navigator as any).webdriver
      }
    })

    it('passes with clean navigator', () => {
      const signal = proxyDetectionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })

    it('detects non-native getter on navigator property', () => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true,
      })
      const signal = proxyDetectionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('navigator.webdriver')
    })
  })

  describe('tostringInconsistency', () => {
    it('passes with native functions', () => {
      const signal = tostringInconsistencyDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('propertyDescriptor', () => {
    const origWebdriverDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver')

    afterEach(() => {
      // Restore original
      const ownDesc = Object.getOwnPropertyDescriptor(navigator, 'webdriver')
      if (ownDesc) {
        delete (navigator as any).webdriver
      }
      if (origWebdriverDesc) {
        Object.defineProperty(Navigator.prototype, 'webdriver', origWebdriverDesc)
      }
    })

    it('passes with normal descriptors', () => {
      const signal = propertyDescriptorDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })

    it('detects own property override on navigator', () => {
      Object.defineProperty(navigator, 'webdriver', {
        value: false,
        configurable: true,
        writable: true,
      })
      const signal = propertyDescriptorDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('overridden as own property')
    })
  })

  describe('crossAttribute', () => {
    it('passes when platform matches UA', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        platform: 'Win32',
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('detects platform/UA mismatch', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        platform: 'MacIntel',
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('inconsistent')
    })

    it('detects Apple GPU on Windows', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        platform: 'Win32',
        webGl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('Apple GPU')
    })

    it('handles unavailable collectors', () => {
      const data = makeCollectorDict({
        userAgent: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('unavailable')
    })

    it('passes Linux platform with Linux UA', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0',
        platform: 'Linux x86_64',
      })
      const signal = crossAttributeDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })
})
