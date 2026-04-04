import { describe, it, expect, afterEach, vi } from 'vitest'
import { State } from '../types'
import type { CollectorDict } from '../types'
import { BotKind } from '../detectors/types'
import functionBindDetector from '../detectors/automation/function_bind'
import evalLengthDetector from '../detectors/automation/eval_length'
import documentElementKeysDetector from '../detectors/automation/document_element_keys'
import errorTraceDetector from '../detectors/automation/error_trace'
import notificationPermissionsDetector from '../detectors/automation/notification_permissions'
import mimeTypesConsistenceDetector from '../detectors/automation/mime_types_consistence'
import appVersionDetector from '../detectors/automation/app_version'
import productSubDetector from '../detectors/automation/product_sub'
import rttDetector from '../detectors/automation/rtt'
import windowSizeDetector from '../detectors/automation/window_size'
import webdriverDetector from '../detectors/automation/webdriver'
import pluginsInconsistencyDetector from '../detectors/automation/plugins_inconsistency'
import languagesInconsistencyDetector from '../detectors/automation/languages_inconsistency'
import webglDetector from '../detectors/automation/webgl'
import processDetector from '../detectors/automation/process_detector'
import pluginsArrayDetector from '../detectors/automation/plugins_array'
import windowExternalDetector from '../detectors/automation/window_external'
import distinctivePropertiesDetector from '../detectors/automation/distinctive_properties'
import userAgentDetector from '../detectors/automation/user_agent'

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

// =====================================================
// Phase 6.2: Complete unit test coverage for all detectors
// Fills gaps identified in coverage analysis
// =====================================================

describe('functionBind detector', () => {
  it('detects missing Function.prototype.bind (PhantomJS signature)', () => {
    const origBind = Function.prototype.bind
    Object.defineProperty(Function.prototype, 'bind', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const signal = functionBindDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.score).toBe(0.9)
    expect(signal.botKind).toBe(BotKind.PhantomJS)
    expect(signal.reason).toContain('bind')

    Object.defineProperty(Function.prototype, 'bind', {
      value: origBind,
      writable: true,
      configurable: true,
    })
  })

  it('passes when bind is a function', () => {
    const signal = functionBindDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.score).toBe(0)
  })
})

describe('evalLength detector', () => {
  it('detects non-standard eval.toString().length', () => {
    const origEval = globalThis.eval
    const fakeEval = function evaluate(x: string) { return origEval(x) }
    Object.defineProperty(fakeEval, 'toString', {
      value: () => 'function eval() { [non-standard] }',
      configurable: true,
    })
    globalThis.eval = fakeEval as typeof eval

    const signal = evalLengthDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.score).toBe(0.6)
    expect(signal.reason).toContain('eval.toString().length')

    globalThis.eval = origEval
  })

  it('passes for V8 engine eval length (33)', () => {
    const signal = evalLengthDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('matches known engine')
  })

  it('handles eval.toString() throwing', () => {
    const origEval = globalThis.eval
    const fakeEval = function () {} as typeof eval
    Object.defineProperty(fakeEval, 'toString', {
      value: () => { throw new Error('denied') },
      configurable: true,
    })
    globalThis.eval = fakeEval

    const signal = evalLengthDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('unable to evaluate')

    globalThis.eval = origEval
  })
})

describe('documentElementKeys detector', () => {
  afterEach(() => {
    const el = document.documentElement as unknown as Record<string, unknown>
    delete el['__selenium_evaluate']
    delete el['__webdriver_fn']
    delete el['__driver_unwrapped']
    delete el['seleniumHelper']
  })

  it('detects selenium artifact on document.documentElement', () => {
    const el = document.documentElement as unknown as Record<string, unknown>
    el['__selenium_evaluate'] = () => {}

    const signal = documentElementKeysDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.score).toBe(0.9)
    expect(signal.botKind).toBe(BotKind.Selenium)
    expect(signal.reason).toContain('selenium')
  })

  it('detects webdriver artifact on document.documentElement', () => {
    const el = document.documentElement as unknown as Record<string, unknown>
    el['__webdriver_fn'] = true

    const signal = documentElementKeysDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.Selenium)
    expect(signal.reason).toContain('webdriver')
  })

  it('detects driver artifact on document.documentElement', () => {
    const el = document.documentElement as unknown as Record<string, unknown>
    el['__driver_unwrapped'] = {}

    const signal = documentElementKeysDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('driver')
  })

  it('passes clean document element', () => {
    const signal = documentElementKeysDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('no suspicious keys')
  })

  it('handles SSR (no document)', () => {
    const origDocument = globalThis.document
    // @ts-expect-error simulating SSR
    delete globalThis.document

    const signal = documentElementKeysDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('no document')

    globalThis.document = origDocument
  })
})

describe('errorTrace detector', () => {
  it('does not detect in normal V8 environment', () => {
    const signal = errorTraceDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.score).toBe(0)
  })

  it('has correct category and name', () => {
    expect(errorTraceDetector.name).toBe('errorTrace')
    expect(errorTraceDetector.category).toBe('automation')
  })
})

describe('notificationPermissions detector', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('detects denied permission with empty userAgent (headless signature)', () => {
    const origNotification = globalThis.Notification
    const origUA = navigator.userAgent

    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'denied' },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'userAgent', {
      value: '',
      writable: true,
      configurable: true,
    })

    const signal = notificationPermissionsDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.score).toBe(0.5)
    expect(signal.reason).toContain('denied')

    Object.defineProperty(globalThis, 'Notification', {
      value: origNotification,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'userAgent', {
      value: origUA,
      writable: true,
      configurable: true,
    })
  })

  it('passes when Notification API is unavailable', () => {
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

  it('passes when permission is granted', () => {
    const origNotification = globalThis.Notification
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'granted' },
      writable: true,
      configurable: true,
    })

    const signal = notificationPermissionsDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('normal')

    Object.defineProperty(globalThis, 'Notification', {
      value: origNotification,
      writable: true,
      configurable: true,
    })
  })

  it('passes when permission is denied but userAgent is present (normal browser)', () => {
    const origNotification = globalThis.Notification
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'denied' },
      writable: true,
      configurable: true,
    })

    const signal = notificationPermissionsDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('normal')

    Object.defineProperty(globalThis, 'Notification', {
      value: origNotification,
      writable: true,
      configurable: true,
    })
  })
})

describe('mimeTypesConsistence detector', () => {
  it('skips non-Chrome browsers (Firefox)', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    })
    const signal = mimeTypesConsistenceDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('skips Edge browser', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 Edge/120.0.0.0',
    })
    const signal = mimeTypesConsistenceDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('handles unavailable userAgent collector', () => {
    const data = makeCollectorDict({
      userAgent: { state: State.Undefined, error: 'missing' } as unknown,
    })
    const signal = mimeTypesConsistenceDetector.detect(data)
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('collector unavailable')
  })

  it('handles SSR (no navigator)', () => {
    const origNavigator = globalThis.navigator
    // @ts-expect-error simulating SSR
    delete globalThis.navigator

    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
    })
    const signal = mimeTypesConsistenceDetector.detect(data)
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('no navigator')

    globalThis.navigator = origNavigator
  })
})

describe('appVersion detector', () => {
  it('detects HeadlessChrome in appVersion', () => {
    Object.defineProperty(navigator, 'appVersion', {
      value: '5.0 (X11; Linux x86_64) HeadlessChrome/120.0.0.0',
      writable: true,
      configurable: true,
    })
    const signal = appVersionDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.score).toBe(0.8)
    expect(signal.reason).toContain('HeadlessChrome')
  })

  it('detects empty appVersion', () => {
    Object.defineProperty(navigator, 'appVersion', {
      value: '',
      writable: true,
      configurable: true,
    })
    const signal = appVersionDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(true)
    expect(signal.score).toBe(0.5)
    expect(signal.reason).toContain('empty')
  })

  it('passes normal Chrome appVersion', () => {
    Object.defineProperty(navigator, 'appVersion', {
      value: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      writable: true,
      configurable: true,
    })
    const signal = appVersionDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('normal')
  })

  it('passes Firefox appVersion', () => {
    Object.defineProperty(navigator, 'appVersion', {
      value: '5.0 (X11)',
      writable: true,
      configurable: true,
    })
    const signal = appVersionDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
  })

  it('handles SSR (no navigator)', () => {
    const origNavigator = globalThis.navigator
    // @ts-expect-error simulating SSR
    delete globalThis.navigator

    const signal = appVersionDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('no navigator')

    globalThis.navigator = origNavigator
  })
})

describe('productSub detector', () => {
  it('passes Firefox UA (non-Chrome/Safari/Opera)', () => {
    Object.defineProperty(navigator, 'productSub', {
      value: '20100101',
      writable: true,
      configurable: true,
    })
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    })
    const signal = productSubDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('detects wrong productSub for Safari', () => {
    Object.defineProperty(navigator, 'productSub', {
      value: '99999999',
      writable: true,
      configurable: true,
    })
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) Safari/605.1.15',
    })
    const signal = productSubDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.score).toBe(0.6)
  })

  it('passes correct productSub for Opera', () => {
    Object.defineProperty(navigator, 'productSub', {
      value: '20030107',
      writable: true,
      configurable: true,
    })
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Opera/100.0.0.0',
    })
    const signal = productSubDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('handles unavailable userAgent collector', () => {
    const data = makeCollectorDict({
      userAgent: { state: State.Undefined, error: 'missing' } as unknown,
    })
    const signal = productSubDetector.detect(data)
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('collector unavailable')
  })

  it('handles SSR (no navigator)', () => {
    const origNavigator = globalThis.navigator
    // @ts-expect-error simulating SSR
    delete globalThis.navigator

    const signal = productSubDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('no navigator')

    globalThis.navigator = origNavigator
  })
})

describe('rtt detector - additional edge cases', () => {
  afterEach(() => {
    const ownDesc = Object.getOwnPropertyDescriptor(navigator, 'connection')
    if (ownDesc) {
      delete (navigator as any).connection
    }
  })

  it('passes with normal rtt > 0 on desktop', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { rtt: 50 },
      writable: true,
      configurable: true,
    })
    const signal = rttDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('normal')
  })

  it('passes with high rtt value', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { rtt: 300 },
      writable: true,
      configurable: true,
    })
    const signal = rttDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
  })

  it('returns false when connection.rtt is undefined', () => {
    Object.defineProperty(navigator, 'connection', {
      value: {},
      writable: true,
      configurable: true,
    })
    const signal = rttDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('unavailable')
  })
})

describe('windowSize detector - additional edge cases', () => {
  it('handles SSR (no window)', () => {
    const origWindow = globalThis.window
    // @ts-expect-error simulating SSR
    delete globalThis.window

    const data = makeCollectorDict({ documentFocus: true })
    const signal = windowSizeDetector.detect(data)
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('no window')

    globalThis.window = origWindow
  })

  it('handles unavailable documentFocus collector', () => {
    const data = makeCollectorDict({
      documentFocus: { state: State.Undefined, error: 'missing' } as unknown,
    })
    const signal = windowSizeDetector.detect(data)
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('not focused')
  })
})

describe('webdriver detector - additional coverage', () => {
  it('returns score of 1.0 for definitive detection', () => {
    const data = makeCollectorDict({ webDriver: true })
    const signal = webdriverDetector.detect(data)
    expect(signal.score).toBe(1.0)
    expect(signal.reason).toContain('navigator.webdriver')
  })

  it('returns score of 0 when not detected', () => {
    const data = makeCollectorDict({ webDriver: false })
    const signal = webdriverDetector.detect(data)
    expect(signal.score).toBe(0)
  })
})

describe('pluginsInconsistency detector - additional coverage', () => {
  it('passes Edge browser with 0 plugins', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 Edge/120.0.0.0',
      plugins: 0,
    })
    const signal = pluginsInconsistencyDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('passes Safari with 0 plugins', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 Safari/605.1.15',
      plugins: 0,
    })
    const signal = pluginsInconsistencyDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('passes Chrome on iOS with 0 plugins', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) CriOS/120.0.0.0',
      plugins: 0,
    })
    const signal = pluginsInconsistencyDetector.detect(data)
    expect(signal.detected).toBe(false)
  })
})

describe('languagesInconsistency detector - additional coverage', () => {
  it('detects when both language arrays are empty', () => {
    const data = makeCollectorDict({ language: [[], []] })
    const signal = languagesInconsistencyDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.score).toBe(0.7)
    expect(signal.reason).toContain('empty')
  })

  it('passes with multiple languages', () => {
    const data = makeCollectorDict({ language: [['en-US', 'fr', 'de'], ['en-US', 'fr', 'de']] })
    const signal = languagesInconsistencyDetector.detect(data)
    expect(signal.detected).toBe(false)
  })
})

describe('webgl detector - additional coverage', () => {
  it('detects Mesa OffScreen renderer', () => {
    const data = makeCollectorDict({
      webGl: { vendor: 'Mesa/X.org', renderer: 'Mesa OffScreen' },
    })
    const signal = webglDetector.detect(data)
    expect(signal.detected).toBe(true)
  })

  it('passes Apple GPU', () => {
    const data = makeCollectorDict({
      webGl: { vendor: 'Apple', renderer: 'Apple M3 Max' },
    })
    const signal = webglDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('handles missing webGl collector', () => {
    const data = makeCollectorDict({
      webGl: { state: State.Undefined, error: 'no webgl' } as unknown,
    })
    const signal = webglDetector.detect(data)
    expect(signal.detected).toBe(false)
  })
})

describe('process detector - additional coverage', () => {
  const origProcess = (globalThis as any).process

  afterEach(() => {
    if (origProcess) {
      (globalThis as any).process = origProcess
    }
  })

  it('returns false when process is null', () => {
    (globalThis as any).process = null
    const signal = processDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
  })

  it('returns false when process exists without electron markers', () => {
    (globalThis as any).process = { type: 'worker', versions: { node: '20.0.0' } }
    const signal = processDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
  })
})

describe('pluginsArray detector - additional coverage', () => {
  it('detects plain array masquerading as PluginArray', () => {
    const origPlugins = navigator.plugins
    Object.defineProperty(navigator, 'plugins', {
      value: [{ name: 'Chrome PDF Plugin' }, { name: 'Native Client' }],
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
})

describe('windowExternal detector - additional coverage', () => {
  it('returns false when external has normal toString', () => {
    const origExternal = (window as any).external
    Object.defineProperty(window, 'external', {
      value: { toString: () => '[object External]' },
      writable: true,
      configurable: true,
    })

    const signal = windowExternalDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('normal')

    Object.defineProperty(window, 'external', {
      value: origExternal,
      writable: true,
      configurable: true,
    })
  })
})

describe('distinctiveProperties detector - SSR safety', () => {
  it('handles SSR (no window)', () => {
    const origWindow = globalThis.window
    const origDocument = globalThis.document
    // @ts-expect-error simulating SSR
    delete globalThis.window
    // @ts-expect-error simulating SSR
    delete globalThis.document

    const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
    expect(signal.detected).toBe(false)
    expect(signal.reason).toContain('no bot properties')

    globalThis.window = origWindow
    globalThis.document = origDocument
  })
})

describe('userAgent detector - additional edge cases', () => {
  it('passes Opera browser', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 OPR/106.0.0.0',
    })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('passes Brave browser', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('passes Samsung Internet', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(false)
  })

  it('detects case-insensitive HeadlessChrome', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 headlesschrome/120.0.0.0',
    })
    const signal = userAgentDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.botKind).toBe(BotKind.HeadlessChrome)
  })
})

// =====================================================
// All detectors: structural validation
// =====================================================

describe('All automation detectors - structural validation', () => {
  const detectors = [
    webdriverDetector,
    userAgentDetector,
    evalLengthDetector,
    errorTraceDetector,
    distinctivePropertiesDetector,
    documentElementKeysDetector,
    windowSizeDetector,
    rttDetector,
    notificationPermissionsDetector,
    pluginsInconsistencyDetector,
    pluginsArrayDetector,
    languagesInconsistencyDetector,
    mimeTypesConsistenceDetector,
    productSubDetector,
    functionBindDetector,
    processDetector,
    appVersionDetector,
    webglDetector,
    windowExternalDetector,
  ]

  for (const detector of detectors) {
    it(`${detector.name} has valid structure`, () => {
      expect(detector.name).toBeTruthy()
      expect(detector.category).toBe('automation')
      expect(typeof detector.detect).toBe('function')
    })

    it(`${detector.name} returns valid signal shape`, () => {
      const signal = detector.detect(makeCollectorDict())
      expect(typeof signal.detected).toBe('boolean')
      expect(typeof signal.score).toBe('number')
      expect(signal.score).toBeGreaterThanOrEqual(0)
      expect(signal.score).toBeLessThanOrEqual(1)
      expect(typeof signal.reason).toBe('string')
      expect(signal.reason.length).toBeGreaterThan(0)
    })
  }
})
