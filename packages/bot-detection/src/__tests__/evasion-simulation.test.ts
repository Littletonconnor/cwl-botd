import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { State } from '../types'
import type { CollectorDict } from '../types'
import { BotKind } from '../detectors/types'
import { DetectorRegistry } from '../detectors/registry'
import { score } from '../detectors/scoring'
import { createDefaultRegistry } from '../detectors'

import userAgentDetector from '../detectors/automation/user_agent'
import webdriverDetector from '../detectors/automation/webdriver'
import webglAdvancedDetector from '../detectors/fingerprint/webgl_advanced'
import canvasDetector from '../detectors/fingerprint/canvas'
import spatialConsistencyDetector from '../detectors/fingerprint/spatial_consistency'
import crossAttributeDetector from '../detectors/lie_detection/cross_attribute'
import proxyDetectionDetector from '../detectors/lie_detection/proxy_detection'
import prototypeChainDetector from '../detectors/lie_detection/prototype_chain'
import tostringDetector from '../detectors/lie_detection/tostring_inconsistency'

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
// Phase 6.6: Simulated Evasion Testing
// =====================================================

describe('Simulated evasion: UA spoofing', () => {
  it('detects bot when UA is spoofed to Chrome but platform is inconsistent', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
    })

    const signal = spatialConsistencyDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('inconsistent')
  })

  it('detects bot when HeadlessChrome UA is replaced but other signals remain', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      webDriver: true,
      plugins: 0,
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
    })

    const uaSignal = userAgentDetector.detect(data)
    expect(uaSignal.detected).toBe(false)

    const wdSignal = webdriverDetector.detect(data)
    expect(wdSignal.detected).toBe(true)
  })

  it('still flags as bot via full registry when UA is spoofed away from HeadlessChrome', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      webDriver: true,
      plugins: 0,
      language: [[], []],
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
      webGlFingerprint: {
        unmaskedVendor: 'Google Inc.',
        unmaskedRenderer: 'Google SwiftShader',
        extensionCount: 0,
        extensions: [],
        params: {},
        shaderPrecision: {},
      },
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 50 },
      audioFingerprint: { hash: 0, sampleRate: 48000, supported: false },
      fontEnumeration: { fonts: [], count: 0, blocked: true },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.4)

    const detectedReasons = result.reasons
    expect(detectedReasons.some(r => /webdriver/i.test(r))).toBe(true)

    const uaDetected = signals.find(s => s.reason.includes('HeadlessChrome'))
    expect(uaDetected).toBeUndefined()
  })

  it('catches cross-attribute mismatch when UA claims Mac but platform says Win32', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
    })

    const signal = crossAttributeDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('inconsistent')
  })

  it('catches cross-attribute mismatch when UA claims Linux but platform says MacIntel', () => {
    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'MacIntel',
    })

    const signal = crossAttributeDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('inconsistent')
  })

  it('detects timezone-language geographic mismatch from spoofed locale', () => {
    const data = makeCollectorDict({
      timezone: { timezone: 'Asia/Tokyo', locale: 'ja-JP' },
      language: [['pt-BR'], ['pt-BR', 'pt']],
    })

    const signal = spatialConsistencyDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('geographically inconsistent')
  })
})

describe('Simulated evasion: Proxy-based property overrides', () => {
  let originalGetOwnPropertyDescriptor: typeof Object.getOwnPropertyDescriptor

  beforeEach(() => {
    originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.getOwnPropertyDescriptor = originalGetOwnPropertyDescriptor
  })

  it('detects navigator property with non-native getter', () => {
    const fakeGetter = () => 'spoofed'

    Object.defineProperty(navigator, 'userAgent', {
      get: fakeGetter,
      configurable: true,
    })

    const data = makeCollectorDict()
    const signal = proxyDetectionDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('navigator.userAgent')
  })

  it('detects multiple navigator properties overridden via non-native getters', () => {
    const fakePlatformGetter = () => 'FakePlatform'
    const fakeLangGetter = () => ['en-US']

    Object.defineProperty(navigator, 'platform', {
      get: fakePlatformGetter,
      configurable: true,
    })
    Object.defineProperty(navigator, 'languages', {
      get: fakeLangGetter,
      configurable: true,
    })

    const data = makeCollectorDict()
    const signal = proxyDetectionDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('navigator.platform')
    expect(signal.reason).toContain('navigator.languages')
  })

  it('detects prototype chain tampering on native functions', () => {
    const originalPush = Array.prototype.push
    Array.prototype.push = function (...args: unknown[]) {
      return originalPush.apply(this, args)
    } as typeof Array.prototype.push

    const data = makeCollectorDict()
    const signal = prototypeChainDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('Array.prototype.push')

    Array.prototype.push = originalPush
  })

  it('detects toString inconsistency when function toString is patched', () => {
    const original = document.hasFocus
    const patched = function hasFocus() {
      return original.call(document)
    }
    Object.defineProperty(patched, 'toString', {
      value: () => 'function hasFocus() { [native code] }',
      configurable: true,
    })
    Object.defineProperty(document, 'hasFocus', {
      value: patched,
      configurable: true,
    })

    const data = makeCollectorDict()
    const signal = tostringDetector.detect(data)

    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('document.hasFocus')

    Object.defineProperty(document, 'hasFocus', {
      value: original,
      configurable: true,
    })
  })
})

describe('Simulated evasion: Canvas noise injection', () => {
  it('detects overridden toDataURL method', () => {
    const data = makeCollectorDict({
      canvasFingerprint: {
        toDataURLOverridden: true,
        isStable: true,
        length: 5000,
      },
    })

    const signal = canvasDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('toDataURL has been overridden')
  })

  it('detects unstable canvas output from noise injection', () => {
    const data = makeCollectorDict({
      canvasFingerprint: {
        toDataURLOverridden: false,
        isStable: false,
        length: 5000,
      },
    })

    const signal = canvasDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('not stable')
  })

  it('detects both override and instability (aggressive noise injection)', () => {
    const data = makeCollectorDict({
      canvasFingerprint: {
        toDataURLOverridden: true,
        isStable: false,
        length: 5000,
      },
    })

    const signal = canvasDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.score).toBeGreaterThanOrEqual(0.9)
    expect(signal.reason).toContain('toDataURL has been overridden')
    expect(signal.reason).toContain('not stable')
  })

  it('detects suspiciously small canvas data (rendering blocked or faked)', () => {
    const data = makeCollectorDict({
      canvasFingerprint: {
        toDataURLOverridden: false,
        isStable: true,
        length: 10,
      },
    })

    const signal = canvasDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('suspiciously small')
  })

  it('scores higher with all three canvas anomalies combined', () => {
    const data = makeCollectorDict({
      canvasFingerprint: {
        toDataURLOverridden: true,
        isStable: false,
        length: 10,
      },
    })

    const signal = canvasDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.score).toBe(1.0)
  })
})

describe('Simulated evasion: WebGL renderer spoofing', () => {
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
    expect(signal.botKind).toBe(BotKind.HeadlessChrome)
  })

  it('detects llvmpipe software renderer', () => {
    const data = makeCollectorDict({
      webGlFingerprint: {
        unmaskedVendor: 'Mesa/X.org',
        unmaskedRenderer: 'llvmpipe (LLVM 12.0.0, 256 bits)',
        extensionCount: 15,
        extensions: [],
        params: {},
        shaderPrecision: {},
      },
    })

    const signal = webglAdvancedDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('llvmpipe')
  })

  it('detects Mesa OffScreen renderer', () => {
    const data = makeCollectorDict({
      webGlFingerprint: {
        unmaskedVendor: 'Mesa/X.org',
        unmaskedRenderer: 'Mesa OffScreen',
        extensionCount: 10,
        extensions: [],
        params: {},
        shaderPrecision: {},
      },
    })

    const signal = webglAdvancedDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('Mesa OffScreen')
  })

  it('detects null renderer/vendor (debug info unavailable)', () => {
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
    expect(signal.reason).toContain('WEBGL_debug_renderer_info unavailable')
  })

  it('detects zero WebGL extensions', () => {
    const data = makeCollectorDict({
      webGlFingerprint: {
        unmaskedVendor: 'Google Inc. (NVIDIA)',
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

  it('detects GPU/OS mismatch: Apple GPU on Windows', () => {
    const data = makeCollectorDict({
      platform: 'Win32',
      webGlFingerprint: {
        unmaskedVendor: 'Apple Inc.',
        unmaskedRenderer: 'Apple GPU',
        extensionCount: 20,
        extensions: [],
        params: {},
        shaderPrecision: {},
      },
    })

    const signal = webglAdvancedDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('inconsistent with platform')
  })

  it('detects GPU/OS mismatch: Direct3D on Mac', () => {
    const data = makeCollectorDict({
      platform: 'MacIntel',
      webGlFingerprint: {
        unmaskedVendor: 'Google Inc.',
        unmaskedRenderer: 'ANGLE (NVIDIA, Direct3D11)',
        extensionCount: 20,
        extensions: [],
        params: {},
        shaderPrecision: {},
      },
    })

    const signal = webglAdvancedDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('inconsistent with platform')
  })

  it('detects VMware virtual GPU', () => {
    const data = makeCollectorDict({
      webGlFingerprint: {
        unmaskedVendor: 'VMware, Inc.',
        unmaskedRenderer: 'SVGA3D; build: RELEASE; LLVM; VMware SVGA II Adapter',
        extensionCount: 10,
        extensions: [],
        params: {},
        shaderPrecision: {},
      },
    })

    const signal = webglAdvancedDetector.detect(data)
    expect(signal.detected).toBe(true)
    expect(signal.reason).toContain('VMware')
  })
})

describe('Simulated evasion: combined stealth profiles', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'outerWidth', { value: 0, writable: true, configurable: true })
    Object.defineProperty(window, 'outerHeight', { value: 0, writable: true, configurable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'outerWidth', { value: 1024, writable: true, configurable: true })
    Object.defineProperty(window, 'outerHeight', { value: 768, writable: true, configurable: true })
  })

  it('detects stealth bot that hides webdriver and spoofs UA but leaks via WebGL + plugins', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      webDriver: false,
      plugins: 0,
      language: [['en-US'], ['en-US']],
      webGl: { vendor: 'Google Inc.', renderer: 'Google SwiftShader' },
      webGlFingerprint: {
        unmaskedVendor: 'Google Inc.',
        unmaskedRenderer: 'Google SwiftShader',
        extensionCount: 0,
        extensions: [],
        params: {},
        shaderPrecision: {},
      },
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 5000 },
      audioFingerprint: { hash: 0, sampleRate: 48000, supported: false },
      fontEnumeration: { fonts: ['Arial'], count: 1, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)

    const uaDetected = signals.find(s => s.reason.includes('HeadlessChrome'))
    expect(uaDetected).toBeUndefined()

    const wdDetected = signals.find(s => s.detected && s.reason.includes('webdriver'))
    expect(wdDetected).toBeUndefined()

    const swiftshaderDetected = signals.some(s => s.detected && s.reason.includes('SwiftShader'))
    expect(swiftshaderDetected).toBe(true)
  })

  it('detects stealth bot with spoofed renderer but canvas noise gives it away', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      webDriver: false,
      plugins: 5,
      webGl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1080)' },
      webGlFingerprint: {
        unmaskedVendor: 'Google Inc. (NVIDIA)',
        unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Ti Direct3D11)',
        extensionCount: 30,
        extensions: [],
        params: {},
        shaderPrecision: {},
      },
      canvasFingerprint: {
        toDataURLOverridden: true,
        isStable: false,
        length: 5000,
      },
    })

    const signals = registry.run(data)
    const result = score(signals)

    expect(result.bot).toBe(true)

    const canvasDetected = signals.some(s => s.detected && s.reason.includes('Canvas'))
    expect(canvasDetected).toBe(true)
  })

  it('detects sophisticated stealth bot with only subtle inconsistencies', () => {
    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'MacIntel',
      webDriver: false,
      plugins: 5,
      language: [['ja-JP'], ['ja-JP', 'ja']],
      timezone: { timezone: 'America/New_York', locale: 'en-US' },
      webGl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
      webGlFingerprint: {
        unmaskedVendor: 'Apple Inc.',
        unmaskedRenderer: 'Apple GPU',
        extensionCount: 20,
        extensions: [],
        params: {},
        shaderPrecision: {},
      },
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 5000 },
      audioFingerprint: { hash: 123456, sampleRate: 44100, supported: true },
      fontEnumeration: { fonts: ['Arial', 'Helvetica'], count: 2, blocked: false },
    })

    const signals = registry.run(data)
    const result = score(signals)

    const spatialDetected = signals.some(
      s => s.detected && s.reason.includes('geographically inconsistent'),
    )
    expect(spatialDetected).toBe(true)
  })

  it('human-like profile passes all data-driven detectors cleanly', () => {
    Object.defineProperty(window, 'outerWidth', { value: 1920, writable: true, configurable: true })
    Object.defineProperty(window, 'outerHeight', { value: 1080, writable: true, configurable: true })

    const registry = createDefaultRegistry()

    const data = makeCollectorDict({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      webDriver: false,
      plugins: 5,
      language: [['en-US'], ['en-US', 'en']],
      timezone: { timezone: 'America/New_York', locale: 'en-US' },
      webGl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1080)' },
      webGlFingerprint: {
        unmaskedVendor: 'Google Inc. (NVIDIA)',
        unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Ti Direct3D11)',
        extensionCount: 30,
        extensions: [],
        params: {},
        shaderPrecision: {},
      },
      canvasFingerprint: { toDataURLOverridden: false, isStable: true, length: 5000 },
      audioFingerprint: { hash: 987654, sampleRate: 44100, channelCount: 1, supported: true },
      fontEnumeration: {
        fonts: ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Segoe UI'],
        count: 7,
        blocked: false,
      },
    })

    const jsdomArtifactDetectors = [
      'mimeTypesConsistence',
      'screenConsistency',
      'proxyDetection',
      'prototypeChain',
      'tostringInconsistency',
      'propertyDescriptor',
    ]

    const signals = registry.run(data, { disabled: jsdomArtifactDetectors })
    const result = score(signals)

    expect(result.bot).toBe(false)
    expect(result.confidence).toBeLessThan(0.4)
  })
})
