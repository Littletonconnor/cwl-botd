import { describe, it, expect, afterEach, vi } from 'vitest'
import { State } from '../types'
import type { CollectorDict } from '../types'
import { BotKind } from '../detectors/types'
import errorTraceDetector from '../detectors/automation/error_trace'
import notificationPermissionsDetector from '../detectors/automation/notification_permissions'
import rttDetector from '../detectors/automation/rtt'
import processDetector from '../detectors/automation/process_detector'
import pluginsArrayDetector from '../detectors/automation/plugins_array'
import windowExternalDetector from '../detectors/automation/window_external'

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

describe('Automation Detectors - Extended Coverage', () => {
  describe('errorTrace', () => {
    it('returns false for clean V8 stack trace', () => {
      const signal = errorTraceDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('no bot patterns')
    })

    it('returns score 0 when not detected', () => {
      const signal = errorTraceDetector.detect(makeCollectorDict())
      expect(signal.score).toBe(0)
    })
  })

  describe('notificationPermissions', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('returns false when Notification API is available with default permission', () => {
      if (typeof Notification !== 'undefined') {
        const signal = notificationPermissionsDetector.detect(makeCollectorDict())
        expect(signal.detected).toBe(false)
        expect(signal.reason).toContain('normal')
      }
    })

    it('returns false when permission is granted', () => {
      const origNotification = globalThis.Notification
      Object.defineProperty(globalThis, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      })
      const signal = notificationPermissionsDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      Object.defineProperty(globalThis, 'Notification', {
        value: origNotification,
        writable: true,
        configurable: true,
      })
    })

    it('returns false when Notification API is unavailable', () => {
      const origNotification = globalThis.Notification
      Object.defineProperty(globalThis, 'Notification', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      const signal = notificationPermissionsDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('unavailable')
      Object.defineProperty(globalThis, 'Notification', {
        value: origNotification,
        writable: true,
        configurable: true,
      })
    })
  })

  describe('rtt', () => {
    afterEach(() => {
      const ownDesc = Object.getOwnPropertyDescriptor(navigator, 'connection')
      if (ownDesc) {
        delete (navigator as any).connection
      }
    })

    it('detects rtt=0 on non-Android desktop', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { rtt: 0 },
        writable: true,
        configurable: true,
      })
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      })
      const signal = rttDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.7)
      expect(signal.reason).toContain('rtt is 0')
    })

    it('passes rtt=0 on Android (expected on mobile)', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { rtt: 0 },
        writable: true,
        configurable: true,
      })
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/120.0.0.0 Mobile Safari/537.36',
      })
      const signal = rttDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('returns false for normal rtt values (> 0)', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { rtt: 50 },
        writable: true,
        configurable: true,
      })
      const signal = rttDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('normal')
    })

    it('returns false when connection API is unavailable', () => {
      const signal = rttDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('unavailable')
    })

    it('returns false when userAgent collector is unavailable', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { rtt: 0 },
        writable: true,
        configurable: true,
      })
      const data = makeCollectorDict({
        userAgent: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = rttDetector.detect(data)
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('unavailable')
    })
  })

  describe('process (Electron detection)', () => {
    const origProcess = typeof process !== 'undefined' ? process : undefined

    afterEach(() => {
      if (origProcess) {
        (globalThis as any).process = origProcess
      }
    })

    it('detects Electron via process.type="renderer"', () => {
      (globalThis as any).process = { type: 'renderer' }
      const signal = processDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.8)
      expect(signal.botKind).toBe(BotKind.Electron)
      expect(signal.reason).toContain('renderer')
    })

    it('detects Electron via process.versions.electron', () => {
      (globalThis as any).process = { versions: { electron: '28.0.0' } }
      const signal = processDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.8)
      expect(signal.botKind).toBe(BotKind.Electron)
      expect(signal.reason).toContain('versions.electron')
    })

    it('returns false when process exists but has neither renderer type nor electron version', () => {
      (globalThis as any).process = { type: 'browser', versions: { node: '20.0.0' } }
      const signal = processDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('pluginsArray', () => {
    it('returns false when navigator.plugins is a genuine PluginArray', () => {
      const signal = pluginsArrayDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('normal')
    })

    it('detects non-PluginArray plugins object', () => {
      const origPlugins = navigator.plugins
      Object.defineProperty(navigator, 'plugins', {
        value: [{ name: 'fake' }],
        writable: true,
        configurable: true,
      })
      const signal = pluginsArrayDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.7)
      expect(signal.reason).toContain('not a genuine PluginArray')
      Object.defineProperty(navigator, 'plugins', {
        value: origPlugins,
        writable: true,
        configurable: true,
      })
    })

    it('returns false when navigator.plugins is unavailable', () => {
      const origPlugins = navigator.plugins
      Object.defineProperty(navigator, 'plugins', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      const signal = pluginsArrayDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      expect(signal.reason).toContain('unavailable')
      Object.defineProperty(navigator, 'plugins', {
        value: origPlugins,
        writable: true,
        configurable: true,
      })
    })
  })

  describe('windowExternal', () => {
    it('returns false in normal browser environment', () => {
      const signal = windowExternalDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })

    it('detects Sequentum via window.external.toString()', () => {
      const origExternal = (window as any).external
      Object.defineProperty(window, 'external', {
        value: {
          toString: () => '[object Sequentum]',
        },
        writable: true,
        configurable: true,
      })
      const signal = windowExternalDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.9)
      expect(signal.reason).toContain('Sequentum')
      expect(signal.botKind).toBe(BotKind.Sequentum)
      Object.defineProperty(window, 'external', {
        value: origExternal,
        writable: true,
        configurable: true,
      })
    })

    it('returns false when window.external is undefined', () => {
      const origExternal = (window as any).external
      Object.defineProperty(window, 'external', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      const signal = windowExternalDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      Object.defineProperty(window, 'external', {
        value: origExternal,
        writable: true,
        configurable: true,
      })
    })

    it('handles window.external.toString() throwing exception', () => {
      const origExternal = (window as any).external
      Object.defineProperty(window, 'external', {
        value: {
          toString: () => { throw new Error('denied') },
        },
        writable: true,
        configurable: true,
      })
      const signal = windowExternalDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
      Object.defineProperty(window, 'external', {
        value: origExternal,
        writable: true,
        configurable: true,
      })
    })
  })
})
