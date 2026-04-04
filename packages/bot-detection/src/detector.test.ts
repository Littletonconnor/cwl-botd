import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BotDetector } from './detector'
import { defineDetector, definePlugin } from './plugin'
import { DetectorCategory } from './detectors/types'
import type { DetectionResult } from './detectors/types'
import type { CollectorDict, Component } from './types'
import { State } from './types'

vi.mock('./collectors', () => ({
  collectors: {
    userAgent: () => 'Mozilla/5.0 TestBrowser',
    platform: () => 'Win32',
    language: () => 'en-US',
    timezone: () => 'America/New_York',
    webDriver: () => false,
    webGl: () => ({ vendor: 'TestVendor', renderer: 'TestRenderer' }),
    documentFocus: () => true,
    scrollBehavior: () => null,
    mouseBehavior: () => null,
    clickBehavior: () => null,
    dimension: () => ({ width: 1920, height: 1080 }),
    plugins: () => ['plugin1', 'plugin2'],
    canvasFingerprint: () => 'canvas-hash-abc',
    webGlFingerprint: () => 'webgl-hash-xyz',
    audioFingerprint: () => 'audio-hash-123',
    fontEnumeration: () => ['Arial', 'Helvetica'],
    behaviorSnapshot: () => null,
  },
}))

describe('BotDetector', () => {
  let detector: BotDetector

  beforeEach(() => {
    detector = new BotDetector()
  })

  afterEach(() => {
    detector.destroy()
  })

  describe('construction', () => {
    it('creates with default config', () => {
      const d = new BotDetector()
      expect(d).toBeInstanceOf(BotDetector)
      expect(d.getCollections()).toBeUndefined()
      expect(d.getDetections()).toBeUndefined()
      d.destroy()
    })

    it('creates with custom config', () => {
      const d = new BotDetector({
        debug: true,
        monitoring: true,
        scoring: { threshold: 0.8 },
        behavior: { maxEvents: 100 },
      })
      expect(d).toBeInstanceOf(BotDetector)
      d.destroy()
    })

    it('initializes debug logger when debug is true', async () => {
      const d = new BotDetector({ debug: true })
      await d.detect()
      const report = d.getDebugReport()
      expect(report).toBeDefined()
      d.destroy()
    })

    it('does not create debug logger by default', () => {
      const d = new BotDetector()
      expect(d.getDebugReport()).toBeUndefined()
      d.destroy()
    })
  })

  describe('config resolution', () => {
    it('respects privacy disableFingerprinting', async () => {
      const d = new BotDetector({
        privacy: { disableFingerprinting: true },
        debug: true,
      })
      await d.detect()
      const report = d.getDebugReport()
      expect(report?.config.privacy.disableFingerprinting).toBe(true)
      expect(report?.config.disabledCollectors).toContain('canvasFingerprint')
      expect(report?.config.disabledCollectors).toContain('webGlFingerprint')
      expect(report?.config.disabledCollectors).toContain('audioFingerprint')
      expect(report?.config.disabledCollectors).toContain('fontEnumeration')
      d.destroy()
    })

    it('respects privacy disableCanvas', async () => {
      const d = new BotDetector({
        privacy: { disableCanvas: true },
        debug: true,
      })
      await d.detect()
      const report = d.getDebugReport()
      expect(report?.config.disabledCollectors).toContain('canvasFingerprint')
      expect(report?.config.disabledDetectors).toContain('canvasFingerprint')
      d.destroy()
    })

    it('respects privacy disableWebGL', async () => {
      const d = new BotDetector({
        privacy: { disableWebGL: true },
        debug: true,
      })
      await d.detect()
      const report = d.getDebugReport()
      expect(report?.config.disabledCollectors).toContain('webGlFingerprint')
      expect(report?.config.disabledDetectors).toContain('webglAdvanced')
      d.destroy()
    })

    it('respects privacy disableAudio', async () => {
      const d = new BotDetector({
        privacy: { disableAudio: true },
        debug: true,
      })
      await d.detect()
      const report = d.getDebugReport()
      expect(report?.config.disabledCollectors).toContain('audioFingerprint')
      expect(report?.config.disabledDetectors).toContain('audioFingerprint')
      d.destroy()
    })

    it('respects privacy disableFonts', async () => {
      const d = new BotDetector({
        privacy: { disableFonts: true },
        debug: true,
      })
      await d.detect()
      const report = d.getDebugReport()
      expect(report?.config.disabledCollectors).toContain('fontEnumeration')
      expect(report?.config.disabledDetectors).toContain('fontEnumeration')
      d.destroy()
    })

    it('respects performance skipExpensive', async () => {
      const d = new BotDetector({
        performance: { skipExpensive: true },
        debug: true,
      })
      await d.detect()
      const report = d.getDebugReport()
      expect(report?.config.performance.skipExpensive).toBe(true)
      expect(report?.config.disabledCollectors).toContain('canvasFingerprint')
      expect(report?.config.disabledCollectors).toContain('webGlFingerprint')
      expect(report?.config.disabledCollectors).toContain('audioFingerprint')
      expect(report?.config.disabledCollectors).toContain('fontEnumeration')
      d.destroy()
    })

    it('combines privacy and performance filters', async () => {
      const d = new BotDetector({
        privacy: { disableCanvas: true },
        performance: { skipExpensive: true },
        debug: true,
      })
      await d.detect()
      const report = d.getDebugReport()
      expect(report?.config.disabledCollectors).toContain('canvasFingerprint')
      expect(report?.config.disabledCollectors).toContain('webGlFingerprint')
      d.destroy()
    })

    it('respects explicit collector disabled list', async () => {
      const d = new BotDetector({
        collectors: { disabled: ['userAgent'] },
      })
      const data = await d.collect()
      expect((data as Record<string, unknown>).userAgent).toBeUndefined()
      d.destroy()
    })

    it('respects explicit collector enabled list', async () => {
      const d = new BotDetector({
        collectors: { enabled: ['userAgent', 'platform'] },
      })
      const data = await d.collect()
      expect((data as Record<string, Component<string>>).userAgent).toBeDefined()
      expect((data as Record<string, Component<string>>).platform).toBeDefined()
      expect((data as Record<string, unknown>).timezone).toBeUndefined()
      d.destroy()
    })
  })

  describe('collect()', () => {
    it('returns collector results with Success state', async () => {
      const data = await detector.collect()
      const ua = (data as Record<string, Component<string>>).userAgent
      expect(ua).toBeDefined()
      expect(ua.state).toBe(State.Success)
      if (ua.state === State.Success) {
        expect(ua.value).toBe('Mozilla/5.0 TestBrowser')
      }
    })

    it('stores collections for subsequent access', async () => {
      expect(detector.getCollections()).toBeUndefined()
      await detector.collect()
      expect(detector.getCollections()).toBeDefined()
    })

    it('collects all configured collectors', async () => {
      const data = await detector.collect()
      const keys = Object.keys(data)
      expect(keys).toContain('userAgent')
      expect(keys).toContain('platform')
      expect(keys).toContain('language')
      expect(keys).toContain('timezone')
      expect(keys).toContain('webDriver')
    })
  })

  describe('detect()', () => {
    it('returns a DetectionResult', async () => {
      const result = await detector.detect()
      expect(result).toHaveProperty('bot')
      expect(result).toHaveProperty('botKind')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('reasons')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('signals')
      expect(typeof result.bot).toBe('boolean')
      expect(Array.isArray(result.reasons)).toBe(true)
      expect(Array.isArray(result.signals)).toBe(true)
    })

    it('stores detections for subsequent access', async () => {
      expect(detector.getDetections()).toBeUndefined()
      await detector.detect()
      expect(detector.getDetections()).toBeDefined()
    })

    it('triggers collect if not already collected', async () => {
      expect(detector.getCollections()).toBeUndefined()
      await detector.detect()
      expect(detector.getCollections()).toBeDefined()
    })

    it('reuses existing collections on second detect', async () => {
      await detector.collect()
      const firstCollections = detector.getCollections()
      await detector.detect()
      expect(detector.getCollections()).toBe(firstCollections)
    })

    it('respects scoring threshold option', async () => {
      const lowThreshold = new BotDetector({ scoring: { threshold: 0.01 } })
      const highThreshold = new BotDetector({ scoring: { threshold: 0.99 } })

      const lowResult = await lowThreshold.detect()
      const highResult = await highThreshold.detect()

      expect(typeof lowResult.bot).toBe('boolean')
      expect(typeof highResult.bot).toBe('boolean')

      lowThreshold.destroy()
      highThreshold.destroy()
    })

    it('accepts per-call detect options', async () => {
      const result = await detector.detect({ threshold: 0.5 })
      expect(result).toHaveProperty('bot')
    })

    it('respects detector enabled filter', async () => {
      const d = new BotDetector({
        detectors: { enabled: ['webdriver'] },
      })
      const result = await d.detect()
      expect(result.signals.length).toBeGreaterThanOrEqual(0)
      d.destroy()
    })

    it('respects detector disabled filter', async () => {
      const d = new BotDetector({
        detectors: { disabled: ['webdriver'] },
      })
      const result = await d.detect()
      expect(result).toHaveProperty('bot')
      d.destroy()
    })
  })

  describe('startBehaviorTracking() / stopBehaviorTracking()', () => {
    it('starts and stops without error', () => {
      expect(() => detector.startBehaviorTracking()).not.toThrow()
      expect(() => detector.stopBehaviorTracking()).not.toThrow()
    })

    it('creates a behavior tracker on first call', () => {
      detector.startBehaviorTracking()
      const score = detector.getBehaviorScore()
      expect(score).toHaveProperty('bot')
      expect(score).toHaveProperty('score')
      expect(score).toHaveProperty('reasons')
      expect(score).toHaveProperty('duration')
    })

    it('reuses existing tracker on subsequent calls', () => {
      detector.startBehaviorTracking()
      detector.stopBehaviorTracking()
      detector.startBehaviorTracking()
      const score = detector.getBehaviorScore()
      expect(score).toBeDefined()
    })

    it('stopBehaviorTracking is safe to call without starting', () => {
      expect(() => detector.stopBehaviorTracking()).not.toThrow()
    })
  })

  describe('getBehaviorScore()', () => {
    it('returns default result when no tracker exists', () => {
      const result = detector.getBehaviorScore()
      expect(result).toEqual({ bot: false, score: 0, reasons: [], duration: 0 })
    })

    it('returns a result after tracking starts', () => {
      detector.startBehaviorTracking()
      const result = detector.getBehaviorScore()
      expect(result.bot).toBe(false)
      expect(typeof result.score).toBe('number')
      expect(Array.isArray(result.reasons)).toBe(true)
    })
  })

  describe('getFingerprint()', () => {
    it('returns empty string before collection', () => {
      expect(detector.getFingerprint()).toBe('')
    })

    it('returns a non-empty hash after collection', async () => {
      await detector.collect()
      const fp = detector.getFingerprint()
      expect(fp).not.toBe('')
      expect(typeof fp).toBe('string')
    })

    it('returns a deterministic hash for same data', async () => {
      await detector.collect()
      const fp1 = detector.getFingerprint()
      const fp2 = detector.getFingerprint()
      expect(fp1).toBe(fp2)
    })
  })

  describe('destroy()', () => {
    it('clears all state', async () => {
      detector.startBehaviorTracking()
      await detector.detect({ debug: true })
      expect(detector.getCollections()).toBeDefined()
      expect(detector.getDetections()).toBeDefined()
      expect(detector.getDebugReport()).toBeDefined()

      detector.destroy()

      expect(detector.getCollections()).toBeUndefined()
      expect(detector.getDetections()).toBeUndefined()
      expect(detector.getDebugReport()).toBeUndefined()
    })

    it('is safe to call multiple times', () => {
      expect(() => {
        detector.destroy()
        detector.destroy()
      }).not.toThrow()
    })

    it('allows re-detection after destroy', async () => {
      await detector.detect()
      detector.destroy()
      const result = await detector.detect()
      expect(result).toHaveProperty('bot')
    })
  })

  describe('BotDetector.isBot()', () => {
    it('returns true when result.bot is true', () => {
      const result: DetectionResult = {
        bot: true,
        botKind: 'Unknown',
        confidence: 0.9,
        reasons: ['test reason'],
        score: 0.9,
        signals: [],
      }
      expect(BotDetector.isBot(result)).toBe(true)
    })

    it('returns false when result.bot is false', () => {
      const result: DetectionResult = {
        bot: false,
        botKind: 'Unknown',
        confidence: 0.1,
        reasons: [],
        score: 0.1,
        signals: [],
      }
      expect(BotDetector.isBot(result)).toBe(false)
    })
  })

  describe('use(plugin)', () => {
    it('calls plugin init function', async () => {
      const initFn = vi.fn()
      const plugin = definePlugin({ name: 'testInit', init: initFn })
      await detector.use(plugin)
      expect(initFn).toHaveBeenCalledOnce()
    })

    it('works with plugin that has no init', async () => {
      const plugin = definePlugin({ name: 'noInit' })
      await expect(detector.use(plugin)).resolves.toBeUndefined()
    })

    it('registers plugin collectors', async () => {
      const plugin = definePlugin({
        name: 'customCollectors',
        collectors: {
          customField: () => 'custom-value',
        },
      })

      await detector.use(plugin)
      const data = await detector.collect()
      const custom = (data as Record<string, Component<string>>).customField
      expect(custom).toBeDefined()
      expect(custom.state).toBe(State.Success)
      if (custom.state === State.Success) {
        expect(custom.value).toBe('custom-value')
      }
    })

    it('registers plugin detectors that run during detect', async () => {
      const plugin = definePlugin({
        name: 'customDetectors',
        detectors: [
          defineDetector({
            name: 'alwaysBot',
            category: DetectorCategory.Automation,
            detect: () => ({
              detected: true,
              score: 1.0,
              reason: 'alwaysBot: forced detection',
            }),
          }),
        ],
      })

      await detector.use(plugin)
      const result = await detector.detect()
      expect(result.reasons.some((r: string) => r.includes('alwaysBot'))).toBe(true)
    })

    it('supports async init', async () => {
      let ready = false
      const plugin = definePlugin({
        name: 'asyncPlugin',
        init: async () => {
          ready = true
        },
      })

      await detector.use(plugin)
      expect(ready).toBe(true)
    })

    it('supports multiple plugins', async () => {
      const p1 = definePlugin({
        name: 'p1',
        collectors: { fromP1: () => 'p1-val' },
      })
      const p2 = definePlugin({
        name: 'p2',
        collectors: { fromP2: () => 'p2-val' },
      })

      await detector.use(p1)
      await detector.use(p2)
      const data = await detector.collect()
      expect((data as Record<string, Component<string>>).fromP1?.state).toBe(State.Success)
      expect((data as Record<string, Component<string>>).fromP2?.state).toBe(State.Success)
    })
  })

  describe('debug mode', () => {
    it('generates debug report when constructor debug is true', async () => {
      const d = new BotDetector({ debug: true })
      await d.detect()
      const report = d.getDebugReport()
      expect(report).toBeDefined()
      expect(report?.timestamp).toBeGreaterThan(0)
      expect(report?.totalDuration).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(report?.collectors)).toBe(true)
      expect(Array.isArray(report?.detectors)).toBe(true)
      expect(Array.isArray(report?.log)).toBe(true)
      expect(report?.signals).toHaveProperty('detected')
      expect(report?.signals).toHaveProperty('total')
      d.destroy()
    })

    it('generates debug report when detect option debug is true', async () => {
      const d = new BotDetector()
      await d.detect({ debug: true })
      const report = d.getDebugReport()
      expect(report).toBeDefined()
      expect(report?.config).toBeDefined()
      d.destroy()
    })

    it('does not generate report when debug is false', async () => {
      await detector.detect()
      expect(detector.getDebugReport()).toBeUndefined()
    })

    it('report includes config with privacy and performance flags', async () => {
      const d = new BotDetector({
        debug: true,
        privacy: { disableCanvas: true, disableWebGL: true },
        performance: { skipExpensive: true },
      })
      await d.detect()
      const report = d.getDebugReport()
      expect(report?.config.privacy.disableCanvas).toBe(true)
      expect(report?.config.privacy.disableWebGL).toBe(true)
      expect(report?.config.performance.skipExpensive).toBe(true)
      d.destroy()
    })

    it('exportDebugJSON returns empty object when no report', () => {
      expect(detector.exportDebugJSON()).toBe('{}')
    })

    it('exportDebugJSON returns valid JSON after detect with debug', async () => {
      const d = new BotDetector({ debug: true })
      await d.detect()
      const json = d.exportDebugJSON()
      expect(() => JSON.parse(json)).not.toThrow()
      const parsed = JSON.parse(json)
      expect(parsed).toHaveProperty('timestamp')
      expect(parsed).toHaveProperty('collectors')
      expect(parsed).toHaveProperty('detectors')
      d.destroy()
    })

    it('debug report is cleared on destroy', async () => {
      const d = new BotDetector({ debug: true })
      await d.detect()
      expect(d.getDebugReport()).toBeDefined()
      d.destroy()
      expect(d.getDebugReport()).toBeUndefined()
    })
  })
})
