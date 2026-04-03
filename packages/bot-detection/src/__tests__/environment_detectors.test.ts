import { describe, it, expect, beforeEach, vi } from 'vitest'
import { State } from '../types'
import type { CollectorDict } from '../types'
import { BotKind } from '../detectors/types'
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

describe('Environment Detectors (2.4)', () => {
  describe('evalEngineConsistency', () => {
    it('passes when eval length matches claimed engine', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0',
      })
      const signal = evalEngineDetector.detect(data)
      // In jsdom (V8), eval.toString().length should be 33
      expect(signal.detected).toBe(false)
    })

    it('handles unavailable UA', () => {
      const data = makeCollectorDict({
        userAgent: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = evalEngineDetector.detect(data)
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('UA unavailable')
    })

    it('handles unknown engine in UA', () => {
      const data = makeCollectorDict({
        userAgent: 'SomeCustomBot/1.0',
      })
      const signal = evalEngineDetector.detect(data)
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('unknown engine')
    })
  })

  describe('errorStackEngine', () => {
    it('passes when stack format matches Chrome UA', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
      })
      const signal = errorStackEngineDetector.detect(data)
      // jsdom runs on V8, and Chrome UA claims V8
      expect(signal.detected).toBe(false)
    })

    it('handles unavailable UA', () => {
      const data = makeCollectorDict({
        userAgent: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = errorStackEngineDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('nativeFunction', () => {
    it('passes when native functions are intact', () => {
      const signal = nativeFunctionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('performancePrecision', () => {
    it('passes with normal performance.now()', () => {
      const signal = performancePrecisionDetector.detect(makeCollectorDict())
      // jsdom may or may not have full performance.now() support
      expect(signal.score).toBeLessThanOrEqual(0.6)
    })
  })

  describe('clockSkew', () => {
    it('does not false-positive in normal environment', () => {
      const signal = clockSkewDetector.detect(makeCollectorDict())
      expect(signal.score).toBeLessThanOrEqual(0.6)
    })
  })

  describe('screenConsistency', () => {
    beforeEach(() => {
      Object.defineProperty(window.screen, 'width', { value: 1920, writable: true, configurable: true })
      Object.defineProperty(window.screen, 'height', { value: 1080, writable: true, configurable: true })
    })

    it('passes when window fits within screen', () => {
      const data = makeCollectorDict({ dimension: { width: 1920, height: 1080 } })
      const signal = screenConsistencyDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('detects window larger than screen', () => {
      Object.defineProperty(window.screen, 'width', { value: 800, writable: true, configurable: true })
      Object.defineProperty(window.screen, 'height', { value: 600, writable: true, configurable: true })
      const data = makeCollectorDict({ dimension: { width: 1920, height: 1080 } })
      const signal = screenConsistencyDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('exceeds screen')
    })

    it('detects 0x0 screen dimensions', () => {
      Object.defineProperty(window.screen, 'width', { value: 0, writable: true, configurable: true })
      Object.defineProperty(window.screen, 'height', { value: 0, writable: true, configurable: true })
      const data = makeCollectorDict({ dimension: { width: 1920, height: 1080 } })
      const signal = screenConsistencyDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('0x0')
    })

    it('handles unavailable dimension collector', () => {
      const data = makeCollectorDict({
        dimension: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = screenConsistencyDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })
})
