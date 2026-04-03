import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { State } from '../types'
import type { CollectorDict } from '../types'
import { DetectorRegistry } from '../detectors/registry'
import { score } from '../detectors/scoring'
import { BotKind } from '../detectors/types'
import type { Detector, Signal } from '../detectors/types'
import { automationDetectors } from '../detectors/automation'
import webdriverDetector from '../detectors/automation/webdriver'
import userAgentDetector from '../detectors/automation/user_agent'
import evalLengthDetector from '../detectors/automation/eval_length'
import pluginsInconsistencyDetector from '../detectors/automation/plugins_inconsistency'
import languagesInconsistencyDetector from '../detectors/automation/languages_inconsistency'
import webglDetector from '../detectors/automation/webgl'
import windowSizeDetector from '../detectors/automation/window_size'
import distinctivePropertiesDetector from '../detectors/automation/distinctive_properties'
import documentElementKeysDetector from '../detectors/automation/document_element_keys'
import functionBindDetector from '../detectors/automation/function_bind'
import productSubDetector from '../detectors/automation/product_sub'
import appVersionDetector from '../detectors/automation/app_version'
import rttDetector from '../detectors/automation/rtt'

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

describe('DetectorRegistry', () => {
  it('registers and runs detectors', () => {
    const registry = new DetectorRegistry()
    const mockDetector: Detector = {
      name: 'test',
      category: 'automation',
      detect: () => ({ detected: false, score: 0, reason: 'test: ok' }),
    }
    registry.register(mockDetector)
    expect(registry.getDetectors()).toHaveLength(1)

    const signals = registry.run(makeCollectorDict())
    expect(signals).toHaveLength(1)
    expect(signals[0]!.reason).toBe('test: ok')
  })

  it('catches errors from detectors', () => {
    const registry = new DetectorRegistry()
    const throwingDetector: Detector = {
      name: 'broken',
      category: 'automation',
      detect: () => { throw new Error('boom') },
    }
    registry.register(throwingDetector)

    const signals = registry.run(makeCollectorDict())
    expect(signals).toHaveLength(1)
    expect(signals[0]!.detected).toBe(false)
    expect(signals[0]!.reason).toContain('threw an error')
  })

  it('registerAll adds multiple detectors', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)
    expect(registry.getDetectors().length).toBe(automationDetectors.length)
  })
})

describe('Automation Detectors', () => {
  describe('webdriver', () => {
    it('detects webdriver=true', () => {
      const data = makeCollectorDict({ webDriver: true })
      const signal = webdriverDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(1.0)
    })

    it('passes when webdriver=false', () => {
      const data = makeCollectorDict({ webDriver: false })
      const signal = webdriverDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('handles unavailable collector', () => {
      const data = makeCollectorDict({
        webDriver: { state: State.Undefined, error: 'missing' } as unknown,
      })
      const signal = webdriverDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('userAgent', () => {
    it('detects HeadlessChrome', () => {
      const data = makeCollectorDict({ userAgent: 'Mozilla/5.0 HeadlessChrome/120.0.0.0' })
      const signal = userAgentDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.botKind).toBe(BotKind.HeadlessChrome)
    })

    it('detects PhantomJS', () => {
      const data = makeCollectorDict({ userAgent: 'Mozilla/5.0 PhantomJS/2.1.1' })
      const signal = userAgentDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.botKind).toBe(BotKind.PhantomJS)
    })

    it('passes normal Chrome UA', () => {
      const data = makeCollectorDict()
      const signal = userAgentDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('evalLength', () => {
    it('does not flag standard eval length', () => {
      const signal = evalLengthDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('pluginsInconsistency', () => {
    it('detects Chrome with 0 plugins', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
        plugins: 0,
      })
      const signal = pluginsInconsistencyDetector.detect(data)
      expect(signal.detected).toBe(true)
    })

    it('passes Chrome with plugins', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
        plugins: 5,
      })
      const signal = pluginsInconsistencyDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('passes Android Chrome with 0 plugins', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0',
        plugins: 0,
      })
      const signal = pluginsInconsistencyDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('languagesInconsistency', () => {
    it('detects empty languages', () => {
      const data = makeCollectorDict({ language: [[], []] })
      const signal = languagesInconsistencyDetector.detect(data)
      expect(signal.detected).toBe(true)
    })

    it('passes with languages present', () => {
      const data = makeCollectorDict()
      const signal = languagesInconsistencyDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('webgl', () => {
    it('detects SwiftShader renderer', () => {
      const data = makeCollectorDict({
        webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
      })
      const signal = webglDetector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.reason).toContain('SwiftShader')
    })

    it('detects llvmpipe renderer', () => {
      const data = makeCollectorDict({
        webGl: { vendor: 'Mesa', renderer: 'llvmpipe (LLVM 12.0.0)' },
      })
      const signal = webglDetector.detect(data)
      expect(signal.detected).toBe(true)
    })

    it('passes normal GPU', () => {
      const data = makeCollectorDict()
      const signal = webglDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('windowSize', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'outerWidth', { value: 1920, writable: true, configurable: true })
      Object.defineProperty(window, 'outerHeight', { value: 1080, writable: true, configurable: true })
    })

    it('detects 0x0 outer dimensions', () => {
      Object.defineProperty(window, 'outerWidth', { value: 0, writable: true, configurable: true })
      Object.defineProperty(window, 'outerHeight', { value: 0, writable: true, configurable: true })
      const data = makeCollectorDict({ documentFocus: true })
      const signal = windowSizeDetector.detect(data)
      expect(signal.detected).toBe(true)
    })

    it('skips when document not focused', () => {
      const data = makeCollectorDict({ documentFocus: false })
      const signal = windowSizeDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('passes normal dimensions', () => {
      const data = makeCollectorDict({ documentFocus: true })
      const signal = windowSizeDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })

  describe('distinctiveProperties', () => {
    afterEach(() => {
      // Clean up any properties we may have added
      for (const prop of ['__nightmare', '__playwright', 'callPhantom', '_phantom', 'callSelenium']) {
        delete (window as unknown as Record<string, unknown>)[prop]
      }
    })

    it('detects __nightmare', () => {
      (window as unknown as Record<string, unknown>).__nightmare = {}
      const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.botKind).toBe(BotKind.Nightmare)
    })

    it('detects __playwright', () => {
      (window as unknown as Record<string, unknown>).__playwright = {}
      const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
      expect(signal.botKind).toBe(BotKind.Playwright)
    })

    it('passes clean window', () => {
      const signal = distinctivePropertiesDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('documentElementKeys', () => {
    it('passes clean document element', () => {
      const signal = documentElementKeysDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('functionBind', () => {
    it('passes when bind exists', () => {
      const signal = functionBindDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(false)
    })
  })

  describe('productSub', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'productSub', {
        value: '20030107',
        writable: true,
        configurable: true,
      })
    })

    it('passes with correct productSub', () => {
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
      })
      const signal = productSubDetector.detect(data)
      expect(signal.detected).toBe(false)
    })

    it('detects wrong productSub for Chrome', () => {
      Object.defineProperty(navigator, 'productSub', {
        value: '20100101',
        writable: true,
        configurable: true,
      })
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
      })
      const signal = productSubDetector.detect(data)
      expect(signal.detected).toBe(true)
    })
  })

  describe('appVersion', () => {
    it('detects HeadlessChrome in appVersion', () => {
      Object.defineProperty(navigator, 'appVersion', {
        value: '5.0 (X11; Linux) HeadlessChrome/120.0.0.0',
        writable: true,
        configurable: true,
      })
      const signal = appVersionDetector.detect(makeCollectorDict())
      expect(signal.detected).toBe(true)
    })
  })

  describe('rtt', () => {
    it('detects rtt=0 on non-Android', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { rtt: 0 },
        writable: true,
        configurable: true,
      })
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0',
      })
      const signal = rttDetector.detect(data)
      expect(signal.detected).toBe(true)
    })

    it('passes rtt=0 on Android', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { rtt: 0 },
        writable: true,
        configurable: true,
      })
      const data = makeCollectorDict({
        userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0',
      })
      const signal = rttDetector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })
})

describe('Scoring Engine', () => {
  it('returns not-bot for clean signals', () => {
    const signals: Signal[] = [
      { detected: false, score: 0, reason: 'webdriver: not detected' },
      { detected: false, score: 0, reason: 'userAgent: no bot patterns' },
      { detected: false, score: 0, reason: 'webgl: renderer normal' },
    ]
    const result = score(signals)
    expect(result.bot).toBe(false)
    expect(result.confidence).toBe(0)
    expect(result.reasons).toHaveLength(0)
    expect(result.botKind).toBe(BotKind.Unknown)
  })

  it('returns bot for definitive webdriver signal', () => {
    const signals: Signal[] = [
      { detected: true, score: 1.0, reason: 'webdriver: true' },
      { detected: false, score: 0, reason: 'userAgent: ok' },
    ]
    const result = score(signals)
    expect(result.bot).toBe(true)
    expect(result.confidence).toBeGreaterThan(0.4)
    expect(result.reasons).toContain('webdriver: true')
  })

  it('classifies botKind from multiple signals', () => {
    const signals: Signal[] = [
      { detected: true, score: 0.9, reason: 'UA: HeadlessChrome', botKind: BotKind.HeadlessChrome },
      { detected: true, score: 0.8, reason: 'webgl: SwiftShader', botKind: BotKind.HeadlessChrome },
    ]
    const result = score(signals)
    expect(result.bot).toBe(true)
    expect(result.botKind).toBe(BotKind.HeadlessChrome)
  })

  it('respects custom threshold', () => {
    const signals: Signal[] = [
      { detected: true, score: 0.3, reason: 'weak signal' },
    ]
    const lenient = score(signals, { threshold: 0.8 })
    expect(lenient.bot).toBe(false)

    const strict = score(signals, { threshold: 0.1 })
    expect(strict.bot).toBe(true)
  })

  it('includes all signals in result', () => {
    const signals: Signal[] = [
      { detected: true, score: 1.0, reason: 'a' },
      { detected: false, score: 0, reason: 'b' },
    ]
    const result = score(signals)
    expect(result.signals).toHaveLength(2)
  })
})

describe('Full Pipeline Integration', () => {
  it('detects headless Chrome fingerprint', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const data = makeCollectorDict({
      webDriver: true,
      userAgent: 'Mozilla/5.0 HeadlessChrome/120.0.0.0',
      language: [[], []],
      plugins: 0,
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    expect(result.confidence).toBeGreaterThan(0.5)
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  it('passes normal browser fingerprint', () => {
    const registry = new DetectorRegistry()
    registry.registerAll(automationDetectors)

    const data = makeCollectorDict()
    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
    expect(result.confidence).toBeLessThan(0.4)
  })
})
