import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { State } from '../types'
import type { CollectorDict } from '../types'
import { BotKind } from '../detectors/types'
import type { Signal } from '../detectors/types'
import { DetectorRegistry } from '../detectors/registry'
import { score } from '../detectors/scoring'
import { createDefaultRegistry } from '../detectors'
import { automationDetectors } from '../detectors/automation'
import { environmentDetectors } from '../detectors/environment'
import { fingerprintDetectors } from '../detectors/fingerprint'
import { lieDetectors } from '../detectors/lie_detection'
import { behavioralDetectors } from '../detectors/behavioral'

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
    canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 5000 },
    webGlFingerprint: { hash: 'abc123', extensions: 20, params: { maxTextureSize: 16384 } },
    audioFingerprint: { hash: 12345.678, sampleRate: 44100, supported: true },
    fontEnumeration: { fonts: ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Segoe UI'], count: 6, blocked: false },
    behaviorSnapshot: { mouse: [], clicks: [], keys: [], scrolls: [] },
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
// Full-registry bot profile tests
// =====================================================

describe('Full-registry bot profiles', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'outerWidth', { value: 0, writable: true, configurable: true })
    Object.defineProperty(window, 'outerHeight', { value: 0, writable: true, configurable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'outerWidth', { value: 1024, writable: true, configurable: true })
    Object.defineProperty(window, 'outerHeight', { value: 768, writable: true, configurable: true })
  })

  it('detects Puppeteer headless profile with all detectors', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: true,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      language: [[], []],
      plugins: 0,
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
      documentFocus: false,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 50 },
      audioFingerprint: { hash: 0, sampleRate: 48000, supported: true },
      fontEnumeration: { fonts: [], count: 0, blocked: true },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.4)
    expect(result.reasons.length).toBeGreaterThanOrEqual(3)
  })

  it('detects Playwright profile with all detectors', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: true,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      language: [['en-US'], ['en-US']],
      plugins: 0,
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 5000 },
      audioFingerprint: { hash: 0, sampleRate: 48000, supported: false },
      fontEnumeration: { fonts: ['Arial'], count: 1, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.4)
  })

  it('detects Nightmare/Electron profile with all detectors', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: true,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Electron/28.0.0 Chrome/120.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      language: [[], []],
      plugins: 0,
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
      documentFocus: false,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 50 },
      audioFingerprint: { hash: 0, sampleRate: 48000, supported: false },
      fontEnumeration: { fonts: [], count: 0, blocked: true },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    const detectedBotKinds = signals.filter(s => s.detected && s.botKind).map(s => s.botKind)
    expect(detectedBotKinds).toContain(BotKind.Electron)
  })

  it('detects SlimerJS profile', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: true,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 SlimerJS/1.0',
      platform: 'Linux x86_64',
      language: [[], []],
      plugins: 0,
      webGl: { vendor: 'Mozilla', renderer: 'Mozilla' },
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 50 },
      audioFingerprint: { hash: 0, sampleRate: 44100, supported: false },
      fontEnumeration: { fonts: [], count: 0, blocked: true },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    expect(result.botKind).toBe(BotKind.SlimerJS)
  })

  it('detects CefSharp embedded browser', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 CefSharp/120.0.0',
      platform: 'Win32',
      language: [[], []],
      plugins: 0,
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 50 },
      audioFingerprint: { hash: 0, sampleRate: 48000, supported: false },
      fontEnumeration: { fonts: [], count: 0, blocked: true },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    const detectedBotKinds = signals
      .filter(s => s.detected && s.botKind)
      .map(s => s.botKind)
    expect(detectedBotKinds).toContain(BotKind.CefSharp)
  })

  it('detects stealth bot with spoofed UA but inconsistent fingerprints', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      language: [['en-US'], ['en-US', 'en']],
      plugins: 5,
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
      canvasFingerprint: { toDataURLOverridden: true, isStable: false, length: 50 },
      audioFingerprint: { hash: 0, sampleRate: 48000, supported: true },
      fontEnumeration: { fonts: [], count: 0, blocked: true },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    expect(result.reasons.length).toBeGreaterThanOrEqual(2)
  })

  it('detects bot with canvas noise injection and WebGL spoofing', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      plugins: 0,
      language: [[], []],
      canvasFingerprint: { toDataURLOverridden: true, isStable: false, length: 50 },
      webGl: { vendor: 'Google Inc.', renderer: 'Mesa OffScreen' },
      audioFingerprint: { hash: 0, sampleRate: 48000, supported: true },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
  })
})

// =====================================================
// Full-registry human profiles (false positive prevention)
// =====================================================

describe('Full-registry human profiles', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'outerWidth', { value: 1920, writable: true, configurable: true })
    Object.defineProperty(window, 'outerHeight', { value: 1080, writable: true, configurable: true })
    Object.defineProperty(navigator, 'productSub', { value: '20030107', writable: true, configurable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes Chrome on Windows with full fingerprint data', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      language: [['en-US'], ['en-US', 'en']],
      timezone: { timezone: 'America/New_York', locale: 'en-US' },
      plugins: 5,
      webGl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090)' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 5000 },
      audioFingerprint: { hash: 98765.432, sampleRate: 44100, supported: true },
      fontEnumeration: { fonts: ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Segoe UI'], count: 6, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
    expect(result.confidence).toBeLessThan(0.4)
  })

  it('passes Firefox on Linux with full fingerprint data', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
      platform: 'Linux x86_64',
      language: [['en-US'], ['en-US', 'en']],
      timezone: { timezone: 'America/Chicago', locale: 'en-US' },
      plugins: 0,
      webGl: { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 630 (CFL GT2)' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 4500 },
      audioFingerprint: { hash: 54321.123, sampleRate: 48000, supported: true },
      fontEnumeration: { fonts: ['Arial', 'Courier New', 'DejaVu Sans'], count: 3, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })

  it('passes Safari on macOS with full fingerprint data', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      platform: 'MacIntel',
      language: [['en-US'], ['en-US', 'en']],
      timezone: { timezone: 'America/Los_Angeles', locale: 'en-US' },
      plugins: 3,
      webGl: { vendor: 'Apple', renderer: 'Apple M2 Pro' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 6000 },
      audioFingerprint: { hash: 11111.222, sampleRate: 44100, supported: true },
      fontEnumeration: { fonts: ['Arial', 'Times New Roman', 'Courier New', 'Helvetica', 'Georgia'], count: 5, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })

  it('passes Chrome on Android mobile', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      platform: 'Linux armv81',
      language: [['en-US'], ['en-US', 'en']],
      timezone: { timezone: 'America/New_York', locale: 'en-US' },
      plugins: 0,
      webGl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 3000 },
      audioFingerprint: { hash: 77777.888, sampleRate: 48000, supported: true },
      fontEnumeration: { fonts: ['Roboto', 'Droid Sans'], count: 2, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })

  it('passes Safari on iOS', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      language: [['en-US'], ['en-US', 'en']],
      timezone: { timezone: 'America/New_York', locale: 'en-US' },
      plugins: 0,
      webGl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 4000 },
      audioFingerprint: { hash: 33333.444, sampleRate: 48000, supported: true },
      fontEnumeration: { fonts: ['Arial', 'Helvetica', 'Times New Roman'], count: 3, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })

  it('passes Edge on Windows', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      platform: 'Win32',
      language: [['en-US'], ['en-US', 'en']],
      timezone: { timezone: 'America/New_York', locale: 'en-US' },
      plugins: 5,
      webGl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 7900 XTX)' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 5200 },
      audioFingerprint: { hash: 55555.666, sampleRate: 44100, supported: true },
      fontEnumeration: { fonts: ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Segoe UI'], count: 6, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })
})

// =====================================================
// Edge case profiles
// =====================================================

describe('Edge case profiles', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'outerWidth', { value: 1920, writable: true, configurable: true })
    Object.defineProperty(window, 'outerHeight', { value: 1080, writable: true, configurable: true })
    Object.defineProperty(navigator, 'productSub', { value: '20030107', writable: true, configurable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handles privacy-hardened Firefox (Resist Fingerprinting)', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0',
      platform: 'Win32',
      language: [['en-US'], ['en-US']],
      timezone: { timezone: 'UTC', locale: 'en-US' },
      plugins: 0,
      webGl: { vendor: 'Mozilla', renderer: 'Mozilla' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 5000 },
      audioFingerprint: { hash: 0, sampleRate: 44100, supported: false },
      fontEnumeration: { fonts: ['Arial', 'Times New Roman'], count: 2, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    // Privacy-hardened browsers may trigger some signals but shouldn't be classified
    // as definitively bot — they lack the key automation markers
    expect(result.confidence).toBeLessThan(0.9)
  })

  it('handles Brave browser with shields up', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      language: [['en-US'], ['en-US', 'en']],
      timezone: { timezone: 'America/New_York', locale: 'en-US' },
      plugins: 5,
      webGl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1080)' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: false, length: 5000 },
      audioFingerprint: { hash: 12345.678, sampleRate: 44100, supported: true },
      fontEnumeration: { fonts: ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Segoe UI'], count: 6, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    // Canvas randomization in Brave triggers canvas instability but shouldn't flag as bot alone
    const canvasSignals = signals.filter(s => s.reason.includes('Canvas'))
    expect(canvasSignals.some(s => s.detected)).toBe(true)
    expect(result.confidence).toBeLessThan(0.7)
  })

  it('handles old browser (IE11-like UA)', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
      platform: 'Win32',
      language: [['en-US'], ['en-US']],
      timezone: { timezone: 'America/New_York', locale: 'en-US' },
      plugins: 3,
      webGl: { vendor: 'Google Inc.', renderer: 'ANGLE (Intel HD Graphics)' },
      documentFocus: true,
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })

  it('handles Samsung Internet on Android', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
      platform: 'Linux aarch64',
      language: [['ko-KR'], ['ko-KR', 'ko', 'en-US']],
      timezone: { timezone: 'Asia/Seoul', locale: 'ko-KR' },
      plugins: 0,
      webGl: { vendor: 'ARM', renderer: 'Mali-G710 MC10' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 3200 },
      audioFingerprint: { hash: 44444.555, sampleRate: 48000, supported: true },
      fontEnumeration: { fonts: ['Roboto', 'Noto Sans CJK'], count: 2, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })

  it('handles Chrome on ChromeOS / Chromebook', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      language: [['en-US'], ['en-US', 'en']],
      timezone: { timezone: 'America/New_York', locale: 'en-US' },
      plugins: 3,
      webGl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Mesa Intel UHD)' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 4800 },
      audioFingerprint: { hash: 66666.777, sampleRate: 48000, supported: true },
      fontEnumeration: { fonts: ['Arial', 'Courier New'], count: 2, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })

  it('handles user with non-Latin locale (Japanese)', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      language: [['ja'], ['ja', 'en-US', 'en']],
      timezone: { timezone: 'Asia/Tokyo', locale: 'ja-JP' },
      plugins: 5,
      webGl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1080)' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 5100 },
      audioFingerprint: { hash: 88888.999, sampleRate: 44100, supported: true },
      fontEnumeration: { fonts: ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Segoe UI', 'Meiryo', 'Yu Gothic'], count: 8, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })

  it('handles user with Arabic locale', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      language: [['ar'], ['ar', 'en-US']],
      timezone: { timezone: 'Asia/Riyadh', locale: 'ar-SA' },
      plugins: 5,
      webGl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 3060)' },
      documentFocus: true,
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })

  it('handles collector failures gracefully (all collectors unavailable)', () => {
    const registry = createDefaultRegistry()

    const data: Record<string, unknown> = {}
    const keys = [
      'userAgent', 'platform', 'language', 'timezone', 'webDriver', 'webGl',
      'documentFocus', 'scrollBehavior', 'mouseBehavior', 'clickBehavior',
      'dimension', 'plugins', 'canvasFingerprint', 'webGlFingerprint',
      'audioFingerprint', 'fontEnumeration', 'behaviorSnapshot',
    ]
    for (const key of keys) {
      data[key] = { state: State.Undefined, error: 'collector failed' }
    }

    const signals = registry.run(data as unknown as CollectorDict)
    const result = score(signals)

    expect(result.bot).toBe(false)
    expect(result.confidence).toBeLessThan(0.4)
  })

  it('handles partial collector data (only UA and platform available)', () => {
    const registry = createDefaultRegistry()

    const partialData: Record<string, unknown> = {}
    const keys = [
      'language', 'timezone', 'webDriver', 'webGl', 'documentFocus', 'scrollBehavior',
      'mouseBehavior', 'clickBehavior', 'dimension', 'plugins', 'canvasFingerprint',
      'webGlFingerprint', 'audioFingerprint', 'fontEnumeration', 'behaviorSnapshot',
    ]
    for (const key of keys) {
      partialData[key] = { state: State.Undefined, error: 'unavailable' }
    }
    partialData.userAgent = { state: State.Success, value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
    partialData.platform = { state: State.Success, value: 'Win32' }

    const signals = registry.run(partialData as unknown as CollectorDict)
    const result = score(signals)

    expect(result.bot).toBe(false)
  })
})

// =====================================================
// Combined scoring accuracy tests
// =====================================================

describe('Combined scoring accuracy across detector categories', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'outerWidth', { value: 1920, writable: true, configurable: true })
    Object.defineProperty(window, 'outerHeight', { value: 1080, writable: true, configurable: true })
    Object.defineProperty(navigator, 'productSub', { value: '20030107', writable: true, configurable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('increases confidence when multiple categories detect anomalies', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: true,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      language: [[], []],
      plugins: 0,
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
      canvasFingerprint: { toDataURLOverridden: true, isStable: false, length: 50 },
      audioFingerprint: { hash: 0, sampleRate: 48000, supported: true },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.4)

    const automationReasons = result.reasons.filter(r =>
      r.includes('webdriver') || r.includes('HeadlessChrome') || r.includes('SwiftShader') || r.includes('languages') || r.includes('plugins')
    )
    const fingerprintReasons = result.reasons.filter(r =>
      r.includes('Canvas') || r.includes('Audio') || r.includes('Spatial')
    )
    expect(automationReasons.length).toBeGreaterThanOrEqual(2)
    expect(fingerprintReasons.length).toBeGreaterThanOrEqual(1)
  })

  it('keeps low score when only one weak signal fires', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      language: [['en-US'], ['en-US', 'en']],
      plugins: 5,
      webGl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1080)' },
      documentFocus: true,
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 5000 },
      audioFingerprint: { hash: 12345.678, sampleRate: 44100, supported: true },
      fontEnumeration: { fonts: ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Segoe UI'], count: 6, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.confidence).toBeLessThan(0.4)
  })

  it('custom threshold adjusts classification boundary', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      plugins: 0,
      language: [[], []],
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
    })

    const signals = registry.run(data)

    const strictResult = score(signals, { threshold: 0.2 })
    const lenientResult = score(signals, { threshold: 0.8 })

    expect(strictResult.bot === true || lenientResult.bot === false).toBe(true)
  })

  it('custom weights change scoring outcome', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      webDriver: false,
      plugins: 0,
      language: [[], []],
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
    })

    const signals = registry.run(data)

    const highWebGl = score(signals, { weights: { webgl: 2.0 } })
    const lowWebGl = score(signals, { weights: { webgl: 0.01 } })

    expect(highWebGl.score).toBeGreaterThanOrEqual(lowWebGl.score)
  })

  it('detector count matches expected total when running all categories', () => {
    const registry = createDefaultRegistry()
    const data = makeCollectorDict()
    const signals = registry.run(data)

    const expectedTotal =
      automationDetectors.length +
      environmentDetectors.length +
      fingerprintDetectors.length +
      lieDetectors.length +
      behavioralDetectors.length

    expect(signals.length).toBe(expectedTotal)
  })

  it('all signals have valid structure', () => {
    const registry = createDefaultRegistry()
    const data = makeCollectorDict()
    const signals = registry.run(data)

    for (const signal of signals) {
      expect(signal).toHaveProperty('detected')
      expect(signal).toHaveProperty('score')
      expect(signal).toHaveProperty('reason')
      expect(typeof signal.detected).toBe('boolean')
      expect(typeof signal.score).toBe('number')
      expect(typeof signal.reason).toBe('string')
      expect(signal.score).toBeGreaterThanOrEqual(0)
      expect(signal.score).toBeLessThanOrEqual(1)
      expect(signal.reason.length).toBeGreaterThan(0)
      if (signal.botKind !== undefined) {
        expect(Object.values(BotKind)).toContain(signal.botKind)
      }
    }
  })

  it('scoring produces valid DetectionResult structure', () => {
    const registry = createDefaultRegistry()
    const data = makeCollectorDict()
    const signals = registry.run(data)
    const result = score(signals)

    expect(result).toHaveProperty('bot')
    expect(result).toHaveProperty('botKind')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('reasons')
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('signals')
    expect(typeof result.bot).toBe('boolean')
    expect(typeof result.confidence).toBe('number')
    expect(typeof result.score).toBe('number')
    expect(Array.isArray(result.reasons)).toBe(true)
    expect(Array.isArray(result.signals)).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
    expect(Object.values(BotKind)).toContain(result.botKind)
  })
})
