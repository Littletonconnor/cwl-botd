import { describe, it, expect, beforeEach, vi } from 'vitest'
import { State } from '../types'
import type { CollectorDict } from '../types'
import canvasDetector from '../detectors/fingerprint/canvas'
import webglAdvancedDetector from '../detectors/fingerprint/webgl_advanced'
import audioDetector from '../detectors/fingerprint/audio'
import fontDetector from '../detectors/fingerprint/font'
import mathDetector from '../detectors/fingerprint/math_fingerprint'
import spatialDetector from '../detectors/fingerprint/spatial_consistency'
import temporalDetector from '../detectors/fingerprint/temporal_consistency'

function makeCollectorDict(overrides: Partial<Record<string, unknown>> = {}): CollectorDict {
  const defaults: Record<string, unknown> = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
    canvasFingerprint: { hash: 123456, toDataURLOverridden: false, isStable: true, length: 5000 },
    webGlFingerprint: {
      unmaskedVendor: 'Google Inc. (NVIDIA)',
      unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Ti Direct3D11 vs_5_0 ps_5_0)',
      extensionCount: 30,
      extensions: ['ANGLE_instanced_arrays', 'EXT_blend_minmax'],
      params: {},
      shaderPrecision: {},
    },
    audioFingerprint: { hash: 987654, sampleRate: 44100, channelCount: 1, supported: true },
    fontEnumeration: {
      fonts: ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Segoe UI'],
      count: 7,
      blocked: false,
    },
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

describe('Fingerprint Detectors (Phase 3)', () => {
  describe('3.1 canvasFingerprint', () => {
    it('passes with normal canvas data', () => {
      const data = makeCollectorDict()
      const signal = canvasDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('detects toDataURL override', () => {
      const data = makeCollectorDict({
        canvasFingerprint: { hash: 123, toDataURLOverridden: true, isStable: true, length: 5000 },
      })
      const signal = canvasDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('overridden')
    })

    it('detects unstable canvas output', () => {
      const data = makeCollectorDict({
        canvasFingerprint: { hash: 123, toDataURLOverridden: false, isStable: false, length: 5000 },
      })
      const signal = canvasDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('not stable')
    })

    it('detects suspiciously small canvas data', () => {
      const data = makeCollectorDict({
        canvasFingerprint: { hash: 0, toDataURLOverridden: false, isStable: true, length: 50 },
      })
      const signal = canvasDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('suspiciously small')
    })

    it('handles unavailable collector', () => {
      const data = makeCollectorDict({
        canvasFingerprint: { state: State.Undefined, error: 'blocked' } as unknown,
      })
      const signal = canvasDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('increases score with multiple anomalies', () => {
      const data = makeCollectorDict({
        canvasFingerprint: { hash: 0, toDataURLOverridden: true, isStable: false, length: 10 },
      })
      const signal = canvasDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.score).toBeGreaterThan(0.7)
    })
  })

  describe('3.2 webglAdvanced', () => {
    it('passes with normal WebGL data', () => {
      const data = makeCollectorDict()
      const signal = webglAdvancedDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('detects SwiftShader virtual GPU', () => {
      const data = makeCollectorDict({
        webGlFingerprint: {
          unmaskedVendor: 'Google Inc.',
          unmaskedRenderer: 'Google SwiftShader',
          extensionCount: 10,
          extensions: [],
          params: {},
          shaderPrecision: {},
        },
      })
      const signal = webglAdvancedDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('SwiftShader')
    })

    it('detects llvmpipe virtual GPU', () => {
      const data = makeCollectorDict({
        webGlFingerprint: {
          unmaskedVendor: 'Mesa',
          unmaskedRenderer: 'llvmpipe (LLVM 12.0.0, 256 bits)',
          extensionCount: 10,
          extensions: [],
          params: {},
          shaderPrecision: {},
        },
      })
      const signal = webglAdvancedDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('llvmpipe')
    })

    it('detects missing debug renderer info', () => {
      const data = makeCollectorDict({
        webGlFingerprint: {
          unmaskedVendor: null,
          unmaskedRenderer: null,
          extensionCount: 10,
          extensions: [],
          params: {},
          shaderPrecision: {},
        },
      })
      const signal = webglAdvancedDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('unavailable')
    })

    it('detects zero WebGL extensions', () => {
      const data = makeCollectorDict({
        webGlFingerprint: {
          unmaskedVendor: 'Google Inc.',
          unmaskedRenderer: 'ANGLE (NVIDIA)',
          extensionCount: 0,
          extensions: [],
          params: {},
          shaderPrecision: {},
        },
      })
      const signal = webglAdvancedDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('zero WebGL extensions')
    })

    it('detects GPU/OS mismatch (Apple GPU on Windows)', () => {
      const data = makeCollectorDict({
        platform: 'Win32',
        webGlFingerprint: {
          unmaskedVendor: 'Apple',
          unmaskedRenderer: 'Apple GPU',
          extensionCount: 20,
          extensions: [],
          params: {},
          shaderPrecision: {},
        },
      })
      const signal = webglAdvancedDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('inconsistent')
    })

    it('handles unavailable collector', () => {
      const data = makeCollectorDict({
        webGlFingerprint: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = webglAdvancedDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('3.3 audioFingerprint', () => {
    it('passes with normal audio data', () => {
      const data = makeCollectorDict()
      const signal = audioDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('detects unsupported audio context', () => {
      const data = makeCollectorDict({
        audioFingerprint: { hash: 0, sampleRate: 0, channelCount: 0, supported: false },
      })
      const signal = audioDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('failed')
    })

    it('detects zero hash with supported audio', () => {
      const data = makeCollectorDict({
        audioFingerprint: { hash: 0, sampleRate: 44100, channelCount: 1, supported: true },
      })
      const signal = audioDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('zero')
    })

    it('handles unavailable collector', () => {
      const data = makeCollectorDict({
        audioFingerprint: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = audioDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('3.4 fontEnumeration', () => {
    it('passes with normal font data', () => {
      const data = makeCollectorDict()
      const signal = fontDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('detects blocked font enumeration', () => {
      const data = makeCollectorDict({
        fontEnumeration: { fonts: [], count: 0, blocked: true },
      })
      const signal = fontDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('blocked')
    })

    it('detects suspiciously low font count', () => {
      const data = makeCollectorDict({
        fontEnumeration: { fonts: ['Arial'], count: 1, blocked: false },
      })
      const signal = fontDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('suspiciously low')
    })

    it('detects missing expected fonts for Windows', () => {
      const data = makeCollectorDict({
        platform: 'Win32',
        fontEnumeration: { fonts: ['Comic Sans MS'], count: 5, blocked: false },
      })
      const signal = fontDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('expected fonts missing')
    })

    it('handles unavailable collector', () => {
      const data = makeCollectorDict({
        fontEnumeration: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = fontDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('3.5 mathFingerprint', () => {
    it('passes when math values match claimed Chrome/V8 engine', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0',
      })
      const signal = mathDetector.detect(data)
      // In jsdom (V8 runtime), math values should match V8 expectations
      expect(signal.score).toBeLessThanOrEqual(0.8)
    })

    it('handles unknown engine UA', () => {
      const data = makeCollectorDict({
        userAgent: 'SomeCustomBot/1.0',
      })
      const signal = mathDetector.detect(data)
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('unknown engine')
    })

    it('handles unavailable UA', () => {
      const data = makeCollectorDict({
        userAgent: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = mathDetector.detect(data)
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('UA unavailable')
    })
  })

  describe('3.6 spatialConsistency', () => {
    it('passes with consistent Windows profile', () => {
      const data = makeCollectorDict({
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        timezone: { timezone: 'America/New_York', locale: 'en-US' },
        language: [['en-US'], ['en-US', 'en']],
      })
      const signal = spatialDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('detects platform/UA mismatch', () => {
      const data = makeCollectorDict({
        platform: 'MacIntel',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      })
      const signal = spatialDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('inconsistent')
    })

    it('detects timezone/language geographic mismatch', () => {
      const data = makeCollectorDict({
        timezone: { timezone: 'Australia/Sydney', locale: 'en-AU' },
        language: [['zh-CN'], ['zh-CN']],
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0',
      })
      const signal = spatialDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('geographically inconsistent')
    })

    it('handles unavailable collectors gracefully', () => {
      const data = makeCollectorDict({
        platform: { state: State.Undefined, error: 'missing' } as unknown,
        timezone: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = spatialDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('3.7 temporalConsistency', () => {
    beforeEach(() => {
      sessionStorage.clear()
    })

    it('passes on first visit (no previous fingerprint)', () => {
      const data = makeCollectorDict()
      const signal = temporalDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('passes when fingerprint is stable across calls', () => {
      const data = makeCollectorDict()
      temporalDetector.detect(data)
      const signal = temporalDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('stores fingerprint in sessionStorage', () => {
      const data = makeCollectorDict()
      temporalDetector.detect(data)
      const stored = sessionStorage.getItem('__botd_fp_session')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveProperty('timestamp')
      expect(parsed).toHaveProperty('platform')
    })
  })
})
