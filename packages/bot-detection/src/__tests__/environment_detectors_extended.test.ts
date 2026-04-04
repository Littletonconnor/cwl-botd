import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { State } from '../types'
import type { CollectorDict } from '../types'
import evalEngineDetector from '../detectors/environment/eval_engine'
import errorStackEngineDetector from '../detectors/environment/error_stack_engine'
import nativeFunctionDetector from '../detectors/environment/native_function'
import performancePrecisionDetector from '../detectors/environment/performance_precision'
import clockSkewDetector from '../detectors/environment/clock_skew'
import screenConsistencyDetector from '../detectors/environment/screen_consistency'

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

describe('Environment Detectors - Extended Coverage', () => {
  describe('evalEngineConsistency - engine mismatch detection', () => {
    it('detects mismatch when eval length does not match Firefox/SpiderMonkey', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; rv:120.0) Gecko/20100101 Firefox/120.0',
      })
      const signal = evalEngineDetector.detect(data)
      // jsdom runs on V8 where eval.toString().length = 33, but Firefox claims SpiderMonkey (expects 37)
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.7)
      expect(signal.reason).toContain('SpiderMonkey')
    })

    it('detects mismatch when eval length does not match Safari/WebKit', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      })
      const signal = evalEngineDetector.detect(data)
      // V8 eval length = 33, WebKit expects 37
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.7)
      expect(signal.reason).toContain('WebKit')
    })

    it('detects mismatch when eval length does not match IE', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko',
      })
      const signal = evalEngineDetector.detect(data)
      // V8 eval length = 33, IE expects 39
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.7)
      expect(signal.reason).toContain('IE')
    })

    it('passes for Chrome UA on V8 engine', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0',
      })
      const signal = evalEngineDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('passes for Edge UA on V8 engine', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Edge/120.0.0.0',
      })
      const signal = evalEngineDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('passes for OPR (Opera) UA on V8 engine', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 OPR/106.0.0.0',
      })
      const signal = evalEngineDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('passes for Chromium UA on V8 engine', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chromium/120.0.0.0',
      })
      const signal = evalEngineDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('errorStackEngine - mismatch detection', () => {
    it('detects mismatch when UA claims Firefox but stack is V8 format', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; rv:120.0) Gecko/20100101 Firefox/120.0',
      })
      const signal = errorStackEngineDetector.detect(data)
      // jsdom runs on V8 (stack has "    at "), but UA claims SpiderMonkey
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.8)
      expect(signal.reason).toContain('V8')
      expect(signal.reason).toContain('SpiderMonkey')
    })

    it('detects mismatch when UA claims Safari/WebKit but stack is V8 format', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      })
      const signal = errorStackEngineDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.8)
      expect(signal.reason).toContain('V8')
      expect(signal.reason).toContain('WebKit')
    })

    it('handles unknown claimed engine gracefully', () => {
      const data = makeCollectorDict({
        userAgent: 'SomeCustomBot/1.0',
      })
      const signal = errorStackEngineDetector.detect(data)
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('unknown claimed engine')
    })

    it('passes when Chrome UA matches V8 stack format', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
      })
      const signal = errorStackEngineDetector.detect(data)
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('matches')
    })
  })

  describe('nativeFunction - tampering detection', () => {
    const origToString = Function.prototype.toString

    afterEach(() => {
      Function.prototype.toString = origToString
    })

    it('detects when Function.prototype.toString is overridden', () => {
      const fakeToString = function (this: Function) {
        return origToString.call(this)
      }
      Object.defineProperty(fakeToString, 'name', { value: 'toString' })
      Function.prototype.toString = fakeToString as typeof Function.prototype.toString
      const signal = nativeFunctionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.7)
      expect(signal.reason).toContain('Function.prototype.toString')
    })

    it('passes when all native functions are intact', () => {
      const signal = nativeFunctionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('all checked functions appear native')
    })
  })

  describe('performancePrecision - automation detection', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('detects frozen clock (all identical values)', () => {
      vi.spyOn(performance, 'now').mockReturnValue(12345.0)
      const signal = performancePrecisionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.6)
      expect(signal.reason).toContain('identical values')
    })

    it('detects integer-only precision (heavily rounded)', () => {
      let counter = 100
      vi.spyOn(performance, 'now').mockImplementation(() => counter++)
      const signal = performancePrecisionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.5)
      expect(signal.reason).toContain('integer values')
    })

    it('passes with normal decimal precision', () => {
      let counter = 0
      vi.spyOn(performance, 'now').mockImplementation(() => {
        counter += 0.1234
        return counter
      })
      const signal = performancePrecisionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('normal')
    })

    it('handles missing performance API', () => {
      const origPerformance = globalThis.performance
      Object.defineProperty(globalThis, 'performance', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      const signal = performancePrecisionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('unavailable')
      Object.defineProperty(globalThis, 'performance', {
        value: origPerformance,
        writable: true,
        configurable: true,
      })
    })
  })

  describe('clockSkew - timing anomaly detection', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('handles missing performance API', () => {
      const origPerformance = globalThis.performance
      Object.defineProperty(globalThis, 'performance', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      const signal = clockSkewDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('unavailable')
      Object.defineProperty(globalThis, 'performance', {
        value: origPerformance,
        writable: true,
        configurable: true,
      })
    })

    it('does not false-positive with consistent clocks', () => {
      const signal = clockSkewDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('screenConsistency - extended cases', () => {
    beforeEach(() => {
      Object.defineProperty(window.screen, 'width', { value: 1920, writable: true, configurable: true })
      Object.defineProperty(window.screen, 'height', { value: 1080, writable: true, configurable: true })
    })

    it('passes when window is smaller than screen', () => {
      const data = makeCollectorDict({ dimension: { width: 1024, height: 768 } })
      const signal = screenConsistencyDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('detects when only width exceeds screen', () => {
      Object.defineProperty(window.screen, 'width', { value: 800, writable: true, configurable: true })
      const data = makeCollectorDict({ dimension: { width: 1920, height: 600 } })
      const signal = screenConsistencyDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('exceeds screen')
    })

    it('detects when only height exceeds screen', () => {
      Object.defineProperty(window.screen, 'height', { value: 600, writable: true, configurable: true })
      const data = makeCollectorDict({ dimension: { width: 800, height: 1080 } })
      const signal = screenConsistencyDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('exceeds screen')
    })

    it('passes when window exactly matches screen', () => {
      const data = makeCollectorDict({ dimension: { width: 1920, height: 1080 } })
      const signal = screenConsistencyDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })
})
