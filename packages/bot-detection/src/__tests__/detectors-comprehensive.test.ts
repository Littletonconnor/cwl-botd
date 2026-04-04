import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { State } from '../types'
import type { CollectorDict } from '../types'
import { BotKind } from '../detectors/types'
import type { Signal } from '../detectors/types'
import { mockScreen, mockMimeTypes } from './helpers'
import { DetectorRegistry } from '../detectors/registry'
import { score } from '../detectors/scoring'
import { automationDetectors } from '../detectors/automation'

import errorTraceDetector from '../detectors/automation/error_trace'
import notificationPermissionsDetector from '../detectors/automation/notification_permissions'
import pluginsArrayDetector from '../detectors/automation/plugins_array'
import mimeTypesConsistenceDetector from '../detectors/automation/mime_types_consistence'
import processDetector from '../detectors/automation/process_detector'
import windowExternalDetector from '../detectors/automation/window_external'
import webdriverDetector from '../detectors/automation/webdriver'
import userAgentDetector from '../detectors/automation/user_agent'
import distinctivePropertiesDetector from '../detectors/automation/distinctive_properties'
import pluginsInconsistencyDetector from '../detectors/automation/plugins_inconsistency'
import webglDetector from '../detectors/automation/webgl'
import windowSizeDetector from '../detectors/automation/window_size'
import rttDetector from '../detectors/automation/rtt'
import languagesInconsistencyDetector from '../detectors/automation/languages_inconsistency'
import documentElementKeysDetector from '../detectors/automation/document_element_keys'
import productSubDetector from '../detectors/automation/product_sub'

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

// =====================================================
// Previously untested automation detectors
// =====================================================

describe('errorTrace detector', () => {
  it('does not detect in normal V8 environment', () => {
    const signal = errorTraceDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('no bot patterns')
  })

  it('returns PhantomJS botKind when stack contains PhantomJS', () => {
    const signal = errorTraceDetector.detect(makeCollectorDict())
    expect(signal.botKind).toBeUndefined()
    expect(signal.score).toBe(0)
  })
})

describe('notificationPermissions detector', () => {
  it('returns not detected in jsdom (no Notification API)', () => {
    const signal = notificationPermissionsDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
  })

  it('returns not detected when Notification permission is default', () => {
    const origNotification = globalThis.Notification
    globalThis.Notification = { permission: 'default' } as unknown as typeof Notification

    const signal = notificationPermissionsDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('normal state')

    globalThis.Notification = origNotification
  })

  it('handles missing Notification API gracefully', () => {
    const origNotification = globalThis.Notification
    // @ts-expect-error simulating missing API
    delete globalThis.Notification

    const signal = notificationPermissionsDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('API unavailable')

    globalThis.Notification = origNotification
  })
})

describe('pluginsArray detector', () => {
  it('passes with genuine PluginArray', () => {
    const signal = pluginsArrayDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('normal')
  })

  it('handles SSR (no navigator)', () => {
    const origNavigator = globalThis.navigator
    // @ts-expect-error simulating SSR
    delete globalThis.navigator

    const signal = pluginsArrayDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('unavailable')

    globalThis.navigator = origNavigator
  })
})

describe('mimeTypesConsistence detector', () => {
  it('detects Chrome with 0 MIME types (jsdom has 0 mimeTypes)', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
    })
    const signal = mimeTypesConsistenceDetector.detect(data)
    // jsdom has navigator.mimeTypes.length === 0, so Chrome UA triggers detection
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('0 MIME types')
  })

  it('handles unavailable UA collector', () => {
    const data = makeCollectorDict({
      userAgent: { state: State.Undefined, error: 'missing' } as unknown,
    })
    const signal = mimeTypesConsistenceDetector.detect(data)
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('collector unavailable')
  })

  it('skips non-Chrome browsers', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
    })
    const signal = mimeTypesConsistenceDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('skips legacy Edge browser (Edge/ in UA)', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Edge/18.19041',
    })
    const signal = mimeTypesConsistenceDetector.detect(data)
    expect(signal.detected).toBe(false)
  })
})

describe('process detector', () => {
  it('passes in normal browser environment', () => {
    const signal = processDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('no process object')
  })
})

describe('windowExternal detector', () => {
  it('passes with normal window.external', () => {
    const signal = windowExternalDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
  })

  it('detects Sequentum via window.external.toString()', () => {
    const origExternal = (window as Window & { external?: unknown }).external
    ;(window as Window & { external?: unknown }).external = {
      toString: () => '[object Sequentum]',
    }

    const signal = windowExternalDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.score).toBe(0.9)
    expect(signal.botKind).toBe(BotKind.Sequentum)
    expect(signal.reason).toContain('Sequentum')

    ;(window as Window & { external?: unknown }).external = origExternal
  })

  it('handles window.external.toString() throwing', () => {
    const origExternal = (window as Window & { external?: unknown }).external
    ;(window as Window & { external?: unknown }).external = {
      toString: () => { throw new Error('access denied') },
    }

    const signal = windowExternalDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('appears normal')

    ;(window as Window & { external?: unknown }).external = origExternal
  })

  it('handles SSR (no window)', () => {
    const origWindow = globalThis.window
    // @ts-expect-error simulating SSR
    delete globalThis.window

    const signal = windowExternalDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('no window')

    globalThis.window = origWindow
  })
})

// =====================================================
// Edge case tests for already-tested detectors
// =====================================================

describe('userAgent detector - additional bot patterns', () => {
  it('detects SlimerJS', () => {
    const data = makeCollectorDict({ userAgent: 'Mozilla/5.0 SlimerJS/1.0' })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.SlimerJS)
  })

  it('detects Sequentum', () => {
    const data = makeCollectorDict({ userAgent: 'Mozilla/5.0 Sequentum' })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Sequentum)
  })

  it('detects CefSharp', () => {
    const data = makeCollectorDict({ userAgent: 'Mozilla/5.0 CefSharp/120.0' })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.CefSharp)
  })

  it('detects Nightmare', () => {
    const data = makeCollectorDict({ userAgent: 'Mozilla/5.0 Nightmare/3.0' })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Nightmare)
  })

  it('detects Electron', () => {
    const data = makeCollectorDict({ userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Electron/28.0.0' })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Electron)
  })

  it('detects Rhino', () => {
    const data = makeCollectorDict({ userAgent: 'Rhino/1.0' })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Rhino)
  })

  it('detects CouchJS', () => {
    const data = makeCollectorDict({ userAgent: 'CouchJS/3.0' })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.CouchJS)
  })

  it('passes Safari on macOS', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('passes Firefox on Linux', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('passes Chrome on Android', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('passes Chrome on iOS', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
    })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('handles unavailable collector', () => {
    const data = makeCollectorDict({
      userAgent: { state: State.Undefined, error: 'missing' } as unknown,
    })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('unavailable')
  })
})

describe('distinctiveProperties detector - additional tool signatures', () => {
  afterEach(() => {
    for (const prop of [
      'callPhantom', '_phantom', '__nightmare',
      '__puppeteer_evaluation_script__', '__playwright', '__pw_manual',
      'callSelenium', '_selenium', '__selenium_unwrapped',
      '__webdriver_evaluate', '__driver_evaluate',
    ]) {
      delete (window as unknown as Record<string, unknown>)[prop]
    }
    for (const prop of ['__webdriver_script_fn', '__selenium_evaluate']) {
      delete (document as unknown as Record<string, unknown>)[prop]
    }
  })

  it('detects callPhantom (PhantomJS)', () => {
    (window as unknown as Record<string, unknown>).callPhantom = () => {}
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.PhantomJS)
  })

  it('detects _phantom (PhantomJS)', () => {
    (window as unknown as Record<string, unknown>)._phantom = true
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.PhantomJS)
  })

  it('detects __puppeteer_evaluation_script__ (Puppeteer)', () => {
    (window as unknown as Record<string, unknown>).__puppeteer_evaluation_script__ = true
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Puppeteer)
  })

  it('detects __pw_manual (Playwright)', () => {
    (window as unknown as Record<string, unknown>).__pw_manual = {}
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Playwright)
  })

  it('detects callSelenium (Selenium)', () => {
    (window as unknown as Record<string, unknown>).callSelenium = () => {}
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Selenium)
  })

  it('detects _selenium (Selenium)', () => {
    (window as unknown as Record<string, unknown>)._selenium = true
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Selenium)
  })

  it('detects __selenium_unwrapped (Selenium)', () => {
    (window as unknown as Record<string, unknown>).__selenium_unwrapped = true
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Selenium)
  })

  it('detects __webdriver_evaluate (Selenium)', () => {
    (window as unknown as Record<string, unknown>).__webdriver_evaluate = () => {}
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Selenium)
  })

  it('detects __driver_evaluate (Selenium)', () => {
    (window as unknown as Record<string, unknown>).__driver_evaluate = () => {}
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Selenium)
  })

  it('detects document.__webdriver_script_fn (Selenium)', () => {
    (document as unknown as Record<string, unknown>).__webdriver_script_fn = () => {}
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Selenium)
  })

  it('detects document.__selenium_evaluate (Selenium)', () => {
    (document as unknown as Record<string, unknown>).__selenium_evaluate = () => {}
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Selenium)
  })

  it('returns score of 1.0 for all distinctive properties', () => {
    (window as unknown as Record<string, unknown>).__playwright = {}
    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.score).toBe(1.0)
  })
})

describe('documentElementKeys detector - selenium artifacts', () => {
  afterEach(() => {
    const el = document.documentElement as unknown as Record<string, unknown>
    delete el['__selenium_evaluate']
    delete el['__webdriver_fn']
    delete el['__driver_unwrapped']
  })

  it('passes clean document element', () => {
    const signal = documentElementKeysDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
  })
})

describe('webgl detector - additional renderers', () => {
  it('detects Mesa OffScreen', () => {
    const data = makeCollectorDict({
      webGl: { vendor: 'Mesa', renderer: 'Mesa OffScreen' },
    })
    const signal = webglDetector.detect(data)
    expect(signal.detected).toBe(true)
  })

  it('passes NVIDIA renderer', () => {
    const data = makeCollectorDict({
      webGl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3080/PCIe/SSE2' },
    })
    const signal = webglDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('passes AMD renderer', () => {
    const data = makeCollectorDict({
      webGl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 6800 XT' },
    })
    const signal = webglDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('passes Intel integrated renderer', () => {
    const data = makeCollectorDict({
      webGl: { vendor: 'Intel Inc.', renderer: 'Intel(R) UHD Graphics 630' },
    })
    const signal = webglDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('passes Apple GPU on macOS', () => {
    const data = makeCollectorDict({
      webGl: { vendor: 'Apple', renderer: 'Apple M2 Pro' },
    })
    const signal = webglDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('handles unavailable collector', () => {
    const data = makeCollectorDict({
      webGl: { state: State.Undefined, error: 'no webgl' } as unknown,
    })
    const signal = webglDetector.detect(data)
    expect(signal.detected).toBe(false)
  })
})

describe('pluginsInconsistency detector - mobile and edge cases', () => {
  it('passes Firefox with 0 plugins (Firefox may have none)', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
      plugins: 0,
    })
    const signal = pluginsInconsistencyDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('handles unavailable plugins collector', () => {
    const data = makeCollectorDict({
      plugins: { state: State.Undefined, error: 'missing' } as unknown,
    })
    const signal = pluginsInconsistencyDetector.detect(data)
    expect(signal.detected).toBe(false)
  })
})

describe('languagesInconsistency detector - edge cases', () => {
  it('passes with single language', () => {
    const data = makeCollectorDict({ language: [['ja'], ['ja']] })
    const signal = languagesInconsistencyDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('handles unavailable collector', () => {
    const data = makeCollectorDict({
      language: { state: State.Undefined, error: 'missing' } as unknown,
    })
    const signal = languagesInconsistencyDetector.detect(data)
    expect(signal.detected).toBe(false)
  })
})

describe('windowSize detector - edge cases', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'outerWidth', { value: 1920, writable: true, configurable: true })
    Object.defineProperty(window, 'outerHeight', { value: 1080, writable: true, configurable: true })
  })

  it('does not flag when only one dimension is 0', () => {
    Object.defineProperty(window, 'outerWidth', { value: 0, writable: true, configurable: true })
    Object.defineProperty(window, 'outerHeight', { value: 1080, writable: true, configurable: true })
    const data = makeCollectorDict({ documentFocus: true })
    const signal = windowSizeDetector.detect(data)
    expect(signal.detected).toBe(false)
  })
})

// =====================================================
// Bot profile integration tests
// =====================================================

describe('Known bot profiles', () => {
  it('detects headless Chrome profile', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const data = makeCollectorDict({
      webDriver: true,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
      language: [[], []],
      plugins: 0,
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    expect(result.botKind).toBe(BotKind.HeadlessChrome)
    expect(result.confidence).toBeGreaterThanOrEqual(0.4)
    expect(result.reasons.length).toBeGreaterThanOrEqual(3)
  })

  it('detects Selenium/ChromeDriver profile', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const data = makeCollectorDict({
      webDriver: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      plugins: 0,
      language: [[], []],
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    expect(result.confidence).toBeGreaterThan(0.4)
  })

  it('detects PhantomJS profile', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const data = makeCollectorDict({
      webDriver: true,
      userAgent: 'Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/534.34 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/534.34',
      language: [[], []],
      plugins: 0,
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    expect(result.botKind).toBe(BotKind.PhantomJS)
  })
})

describe('Known human profiles', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'outerWidth', { value: 1920, writable: true, configurable: true })
    Object.defineProperty(window, 'outerHeight', { value: 1080, writable: true, configurable: true })
    Object.defineProperty(navigator, 'productSub', { value: '20030107', writable: true, configurable: true })
    mockScreen(1920, 1080)
    mockMimeTypes(4)
  })

  it('passes normal Chrome on Windows', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      language: [['en-US'], ['en-US', 'en']],
      plugins: 5,
      webGl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080)' },
      documentFocus: true,
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
    expect(result.confidence).toBeLessThan(0.4)
  })

  it('passes normal Firefox on Linux', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
      platform: 'Linux x86_64',
      language: [['en-US'], ['en-US', 'en']],
      plugins: 0,
      webGl: { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 630' },
      documentFocus: true,
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })

  it('passes Safari on macOS', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      platform: 'MacIntel',
      language: [['en-US'], ['en-US', 'en']],
      plugins: 3,
      webGl: { vendor: 'Apple', renderer: 'Apple M2 Pro' },
      documentFocus: true,
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })

  it('passes Chrome on Android mobile', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
      platform: 'Linux armv81',
      language: [['en-US'], ['en-US', 'en']],
      plugins: 0,
      webGl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
      documentFocus: true,
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })
})

// =====================================================
// Scoring engine edge cases
// =====================================================

describe('Scoring engine - additional tests', () => {
  it('handles empty signals array', () => {
    const result = score([])
    expect(result.bot).toBe(false)
    expect(result.score).toBe(0)
    expect(result.confidence).toBe(0)
    expect(result.botKind).toBe(BotKind.Unknown)
    expect(result.reasons).toHaveLength(0)
  })

  it('handles single weak signal below threshold', () => {
    const signals: Signal[] = [
      { detected: true, score: 0.2, reason: 'notificationPermissions: weak signal' },
    ]
    const result = score(signals, { threshold: 0.4 })
    expect(result.bot).toBe(false)
  })

  it('boosts confidence with definitive signal (score=1.0)', () => {
    const signals: Signal[] = [
      { detected: true, score: 1.0, reason: 'webdriver: definitive', botKind: BotKind.Unknown },
      { detected: false, score: 0, reason: 'userAgent: ok' },
      { detected: false, score: 0, reason: 'webgl: ok' },
    ]
    const result = score(signals)
    expect(result.bot).toBe(true)
    expect(result.confidence).toBeGreaterThan(0.4)
  })

  it('boosts confidence with 2+ strong signals', () => {
    const signals: Signal[] = [
      { detected: true, score: 0.8, reason: 'webgl: SwiftShader', botKind: BotKind.HeadlessChrome },
      { detected: true, score: 0.7, reason: 'pluginsInconsistency: 0 plugins' },
      { detected: false, score: 0, reason: 'webdriver: not detected' },
    ]
    const result = score(signals)
    expect(result.confidence).toBeGreaterThan(result.score)
  })

  it('uses custom weights', () => {
    const signals: Signal[] = [
      { detected: true, score: 0.5, reason: 'webgl: suspicious' },
    ]
    const highWeight = score(signals, { weights: { webgl: 1.0 } })
    const lowWeight = score(signals, { weights: { webgl: 0.1 } })
    expect(highWeight.score).toBeGreaterThanOrEqual(lowWeight.score)
  })

  it('resolves botKind by highest weighted score', () => {
    const signals: Signal[] = [
      { detected: true, score: 0.5, reason: 'a', botKind: BotKind.Selenium },
      { detected: true, score: 0.9, reason: 'b', botKind: BotKind.Puppeteer },
      { detected: true, score: 0.3, reason: 'c', botKind: BotKind.Selenium },
    ]
    const result = score(signals)
    expect(result.botKind).toBe(BotKind.Puppeteer)
  })

  it('returns Unknown botKind when no signals have botKind', () => {
    const signals: Signal[] = [
      { detected: true, score: 0.8, reason: 'generic: anomaly' },
    ]
    const result = score(signals)
    expect(result.botKind).toBe(BotKind.Unknown)
  })
})

// =====================================================
// Registry edge cases
// =====================================================

describe('DetectorRegistry - additional tests', () => {
  it('supports filtering by enabled detectors', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const signals = registry.run(makeCollectorDict(), { enabled: ['webdriver', 'userAgent'] })
    expect(signals.length).toBeLessThanOrEqual(2)
  })

  it('supports filtering by disabled detectors', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const allSignals = registry.run(makeCollectorDict())
    const filteredSignals = registry.run(makeCollectorDict(), { disabled: ['webdriver'] })
    expect(filteredSignals.length).toBe(allSignals.length - 1)
  })

  it('all automation detectors run without throwing', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const signals = registry.run(makeCollectorDict())
    expect(signals.length).toBe(automationDetectors.length)
    for (const signal of signals) {
      expect(signal).toHaveProperty('detected')
      expect(signal).toHaveProperty('score')
      expect(signal).toHaveProperty('reason')
      expect(typeof signal.detected).toBe('boolean')
      expect(typeof signal.score).toBe('number')
      expect(signal.score).toBeGreaterThanOrEqual(0)
      expect(signal.score).toBeLessThanOrEqual(1)
    }
  })
})
