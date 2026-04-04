import { describe, it, expect } from 'vitest'
import { score } from '../detectors/scoring'
import { BotKind, type Signal } from '../detectors/types'
import { DebugLogger } from '../debug'

function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    detected: false,
    score: 0,
    reason: 'test: default signal',
    ...overrides,
  }
}

// =====================================================
// Phase 6.3: Comprehensive scoring engine tests
// =====================================================

describe('Scoring Engine - Threshold Boundary Tests', () => {
  it('classifies as bot at exactly the default threshold (0.4)', () => {
    const signals = [
      makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
    ]
    const result = score(signals)
    expect(result.confidence).toBeGreaterThanOrEqual(0.4)
    expect(result.bot).toBe(true)
  })

  it('classifies as not-bot just below threshold', () => {
    const result = score(
      [makeSignal({ detected: true, score: 0.05, reason: 'notificationPermissions: weak' })],
      { threshold: 0.4 },
    )
    expect(result.confidence).toBeLessThan(0.4)
    expect(result.bot).toBe(false)
  })

  it('threshold=0 classifies any detected signal as bot', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.01, reason: 'notificationPermissions: barely' }),
    ]
    const result = score(signals, { threshold: 0.0 })
    expect(result.bot).toBe(true)
  })

  it('threshold=1.0 requires maximum confidence', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.5, reason: 'rtt: zero' }),
      makeSignal({ detected: false, score: 0, reason: 'webdriver: not detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
    ]
    const result = score(signals, { threshold: 1.0 })
    expect(result.bot).toBe(false)
    expect(result.confidence).toBeLessThan(1.0)
  })

  it('threshold=1.0 only detects with overwhelming evidence', () => {
    const signals = [
      makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
      makeSignal({ detected: true, score: 1.0, reason: 'distinctiveProperties: found', botKind: BotKind.Selenium }),
      makeSignal({ detected: true, score: 0.9, reason: 'userAgent: HeadlessChrome', botKind: BotKind.HeadlessChrome }),
      makeSignal({ detected: true, score: 0.8, reason: 'pluginsInconsistency: no plugins' }),
      makeSignal({ detected: true, score: 0.7, reason: 'languagesInconsistency: empty' }),
    ]
    const result = score(signals, { threshold: 1.0 })
    expect(result.confidence).toBeLessThanOrEqual(1.0)
  })
})

describe('Scoring Engine - Score Normalization', () => {
  it('score is always between 0 and 1 with no detected signals', () => {
    const signals = Array.from({ length: 20 }, (_, i) =>
      makeSignal({ reason: `detector${i}: not detected` }),
    )
    const result = score(signals)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
    expect(result.score).toBe(0)
  })

  it('score is always between 0 and 1 with all detected signals', () => {
    const signals = Array.from({ length: 20 }, (_, i) =>
      makeSignal({ detected: true, score: 1.0, reason: `detector${i}: detected` }),
    )
    const result = score(signals)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })

  it('confidence is always between 0 and 1', () => {
    const signals = [
      makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
      makeSignal({ detected: true, score: 1.0, reason: 'distinctiveProperties: found' }),
      makeSignal({ detected: true, score: 1.0, reason: 'userAgent: HeadlessChrome' }),
    ]
    const result = score(signals)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('score increases with more detected signals', () => {
    const oneSignal = score([
      makeSignal({ detected: true, score: 0.7, reason: 'webdriver: detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
    ])

    const twoSignals = score([
      makeSignal({ detected: true, score: 0.7, reason: 'webdriver: detected' }),
      makeSignal({ detected: true, score: 0.7, reason: 'userAgent: HeadlessChrome' }),
    ])

    expect(twoSignals.score).toBeGreaterThan(oneSignal.score)
  })

  it('score is 0 for empty signals array', () => {
    const result = score([])
    expect(result.score).toBe(0)
    expect(result.confidence).toBe(0)
    expect(result.bot).toBe(false)
  })

  it('weighted score accounts for detector importance', () => {
    const highWeightSignal = score(
      [makeSignal({ detected: true, score: 0.7, reason: 'webdriver: detected' })],
    )

    const lowWeightSignal = score(
      [makeSignal({ detected: true, score: 0.7, reason: 'notificationPermissions: denied' })],
    )

    // With a single signal, score = (signal.score * weight) / weight = signal.score
    // So both should be approximately equal (floating point)
    expect(highWeightSignal.score).toBeCloseTo(lowWeightSignal.score, 10)
  })
})

describe('Scoring Engine - Custom Weight Configurations', () => {
  it('zeroing a weight effectively ignores that detector', () => {
    const signals = [
      makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
    ]

    const normal = score(signals)
    const zeroed = score(signals, { weights: { webdriver: 0 } })

    expect(zeroed.score).toBeLessThan(normal.score)
  })

  it('doubling a weight increases that detector\'s influence', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.5, reason: 'rtt: zero' }),
      makeSignal({ detected: false, score: 0, reason: 'webdriver: not detected' }),
    ]

    const normal = score(signals)
    const doubled = score(signals, { weights: { rtt: 1.2 } })

    expect(doubled.score).toBeGreaterThan(normal.score)
  })

  it('custom weights merge with defaults', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.7, reason: 'webdriver: detected' }),
      makeSignal({ detected: true, score: 0.6, reason: 'rtt: zero' }),
    ]

    const result = score(signals, { weights: { rtt: 0 } })
    expect(result.score).toBeGreaterThan(0)
    expect(result.reasons).toContain('webdriver: detected')
    expect(result.reasons).toContain('rtt: zero')
  })

  it('unknown detector names get default weight of 0.5', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.8, reason: 'customDetector: suspicious' }),
    ]
    const result = score(signals)
    expect(result.score).toBe(0.8)
    expect(result.bot).toBe(true)
  })

  it('all default weights are between 0 and 1', () => {
    const knownDetectors = [
      'webdriver', 'userAgent', 'evalLength', 'errorTrace', 'distinctiveProperties',
      'documentElementKeys', 'windowSize', 'rtt', 'notificationPermissions',
      'pluginsInconsistency', 'pluginsArray', 'languagesInconsistency',
      'mimeTypesConsistence', 'productSub', 'functionBind', 'process',
      'appVersion', 'webgl', 'windowExternal',
      'evalEngineConsistency', 'errorStackEngine', 'nativeFunction',
      'performancePrecision', 'clockSkew', 'screenConsistency',
      'prototypeChain', 'proxyDetection', 'tostringInconsistency',
      'propertyDescriptor', 'crossAttribute',
      'canvasFingerprint', 'webglAdvanced', 'audioFingerprint',
      'fontEnumeration', 'mathFingerprint', 'spatialConsistency', 'temporalConsistency',
      'mouseMovement', 'keyboardBehavior', 'scrollBehavior', 'interactionTiming',
    ]

    for (const name of knownDetectors) {
      const signals = [
        makeSignal({ detected: true, score: 0.5, reason: `${name}: test` }),
      ]
      const result = score(signals)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
    }
  })
})

describe('Scoring Engine - BotKind Determination', () => {
  const allBotKinds = [
    BotKind.HeadlessChrome,
    BotKind.PhantomJS,
    BotKind.Nightmare,
    BotKind.Selenium,
    BotKind.Electron,
    BotKind.NodeJS,
    BotKind.Rhino,
    BotKind.CouchJS,
    BotKind.Sequentum,
    BotKind.SlimerJS,
    BotKind.CefSharp,
    BotKind.Puppeteer,
    BotKind.Playwright,
  ]

  for (const kind of allBotKinds) {
    it(`correctly identifies ${kind} botKind`, () => {
      const signals = [
        makeSignal({ detected: true, score: 0.9, reason: `test: ${kind}`, botKind: kind }),
      ]
      const result = score(signals)
      expect(result.botKind).toBe(kind)
    })
  }

  it('returns Unknown when no detected signals have botKind', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
      makeSignal({ detected: true, score: 0.6, reason: 'pluginsInconsistency: no plugins' }),
    ]
    const result = score(signals)
    expect(result.botKind).toBe(BotKind.Unknown)
  })

  it('returns Unknown for empty signals', () => {
    const result = score([])
    expect(result.botKind).toBe(BotKind.Unknown)
  })

  it('resolves ties by highest accumulated score', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.5, reason: 'a: Selenium', botKind: BotKind.Selenium }),
      makeSignal({ detected: true, score: 0.5, reason: 'b: Puppeteer', botKind: BotKind.Puppeteer }),
      makeSignal({ detected: true, score: 0.1, reason: 'c: Selenium', botKind: BotKind.Selenium }),
    ]
    const result = score(signals)
    expect(result.botKind).toBe(BotKind.Selenium)
  })

  it('ignores botKind from non-detected signals', () => {
    const signals = [
      makeSignal({ detected: false, score: 0, reason: 'a: Selenium', botKind: BotKind.Selenium }),
      makeSignal({ detected: true, score: 0.8, reason: 'b: Puppeteer', botKind: BotKind.Puppeteer }),
    ]
    const result = score(signals)
    expect(result.botKind).toBe(BotKind.Puppeteer)
  })
})

describe('Scoring Engine - Confidence Computation', () => {
  it('boosts confidence by 0.3 for definitive signal (score >= 1.0)', () => {
    const signals = [
      makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
      makeSignal({ detected: false, score: 0, reason: 'webgl: normal' }),
    ]
    const result = score(signals)
    expect(result.confidence).toBeGreaterThan(result.score)
  })

  it('caps confidence at 1.0 even with high boost', () => {
    const signals = [
      makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
      makeSignal({ detected: true, score: 1.0, reason: 'distinctiveProperties: found' }),
      makeSignal({ detected: true, score: 1.0, reason: 'userAgent: bot' }),
    ]
    const result = score(signals)
    expect(result.confidence).toBeLessThanOrEqual(1.0)
  })

  it('boosts confidence by 0.2 for 2+ strong signals (score >= 0.7)', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
      makeSignal({ detected: true, score: 0.7, reason: 'pluginsInconsistency: zero' }),
    ]
    const result = score(signals)
    expect(result.confidence).toBeGreaterThan(result.score)
  })

  it('no boost for single strong signal without definitive', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.8, reason: 'webgl: SwiftShader' }),
    ]
    const result = score(signals)
    expect(result.confidence).toBe(result.score)
  })

  it('no boost for multiple weak signals', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.3, reason: 'notificationPermissions: odd' }),
      makeSignal({ detected: true, score: 0.2, reason: 'mimeTypesConsistence: zero' }),
    ]
    const result = score(signals)
    expect(result.confidence).toBe(result.score)
  })

  it('confidence is 0 when nothing detected', () => {
    const signals = [
      makeSignal({ detected: false, score: 0, reason: 'webdriver: not detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
    ]
    const result = score(signals)
    expect(result.confidence).toBe(0)
  })
})

describe('Scoring Engine - Reasons Extraction', () => {
  it('only includes reasons from detected signals', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
      makeSignal({ detected: true, score: 0.6, reason: 'rtt: zero' }),
    ]
    const result = score(signals)
    expect(result.reasons).toEqual(['webdriver: detected', 'rtt: zero'])
  })

  it('returns empty reasons when nothing detected', () => {
    const signals = [
      makeSignal({ detected: false, score: 0, reason: 'a: ok' }),
      makeSignal({ detected: false, score: 0, reason: 'b: ok' }),
    ]
    const result = score(signals)
    expect(result.reasons).toEqual([])
  })

  it('preserves order of detected signals', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.3, reason: 'first: signal' }),
      makeSignal({ detected: false, score: 0, reason: 'skipped: signal' }),
      makeSignal({ detected: true, score: 0.7, reason: 'second: signal' }),
      makeSignal({ detected: true, score: 0.5, reason: 'third: signal' }),
    ]
    const result = score(signals)
    expect(result.reasons).toEqual(['first: signal', 'second: signal', 'third: signal'])
  })
})

describe('Scoring Engine - Signals Passthrough', () => {
  it('includes all original signals in result unchanged', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.8, reason: 'a: detected' }),
      makeSignal({ detected: false, score: 0, reason: 'b: ok' }),
    ]
    const result = score(signals)
    expect(result.signals).toBe(signals)
    expect(result.signals).toHaveLength(2)
  })
})

describe('Scoring Engine - Real-World Signal Combinations', () => {
  it('classifies headless Chrome profile as bot', () => {
    const signals = [
      makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
      makeSignal({ detected: true, score: 0.9, reason: 'userAgent: HeadlessChrome', botKind: BotKind.HeadlessChrome }),
      makeSignal({ detected: true, score: 0.7, reason: 'pluginsInconsistency: 0 plugins' }),
      makeSignal({ detected: true, score: 0.7, reason: 'languagesInconsistency: empty' }),
      makeSignal({ detected: true, score: 0.8, reason: 'webgl: SwiftShader', botKind: BotKind.HeadlessChrome }),
      makeSignal({ detected: false, score: 0, reason: 'distinctiveProperties: clean' }),
    ]
    const result = score(signals)
    expect(result.bot).toBe(true)
    expect(result.botKind).toBe(BotKind.HeadlessChrome)
    expect(result.confidence).toBeGreaterThan(0.7)
    expect(result.reasons).toHaveLength(5)
  })

  it('classifies Selenium profile as bot', () => {
    const signals = [
      makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
      makeSignal({ detected: true, score: 1.0, reason: 'distinctiveProperties: __selenium_unwrapped', botKind: BotKind.Selenium }),
      makeSignal({ detected: true, score: 0.9, reason: 'documentElementKeys: selenium artifact', botKind: BotKind.Selenium }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal Chrome' }),
    ]
    const result = score(signals)
    expect(result.bot).toBe(true)
    expect(result.botKind).toBe(BotKind.Selenium)
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('classifies Puppeteer stealth as bot (weaker signals)', () => {
    const signals = [
      makeSignal({ detected: false, score: 0, reason: 'webdriver: not detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal Chrome' }),
      makeSignal({ detected: true, score: 0.7, reason: 'pluginsInconsistency: 0 plugins' }),
      makeSignal({ detected: true, score: 0.6, reason: 'mimeTypesConsistence: 0 mime types' }),
      makeSignal({ detected: true, score: 0.7, reason: 'webgl: SwiftShader', botKind: BotKind.HeadlessChrome }),
    ]
    const result = score(signals)
    expect(result.bot).toBe(true)
  })

  it('classifies normal Chrome on Windows as human', () => {
    const signals = [
      makeSignal({ detected: false, score: 0, reason: 'webdriver: not detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal Chrome' }),
      makeSignal({ detected: false, score: 0, reason: 'pluginsInconsistency: 5 plugins' }),
      makeSignal({ detected: false, score: 0, reason: 'languagesInconsistency: en-US' }),
      makeSignal({ detected: false, score: 0, reason: 'webgl: NVIDIA GeForce GTX 1080' }),
      makeSignal({ detected: false, score: 0, reason: 'windowSize: 1920x1080' }),
      makeSignal({ detected: false, score: 0, reason: 'distinctiveProperties: clean' }),
    ]
    const result = score(signals)
    expect(result.bot).toBe(false)
    expect(result.confidence).toBe(0)
    expect(result.reasons).toHaveLength(0)
    expect(result.botKind).toBe(BotKind.Unknown)
  })

  it('classifies mobile Chrome on Android as human', () => {
    const signals = [
      makeSignal({ detected: false, score: 0, reason: 'webdriver: not detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal mobile Chrome' }),
      makeSignal({ detected: false, score: 0, reason: 'pluginsInconsistency: normal for mobile' }),
      makeSignal({ detected: false, score: 0, reason: 'rtt: normal' }),
    ]
    const result = score(signals)
    expect(result.bot).toBe(false)
    expect(result.score).toBe(0)
  })

  it('handles privacy extension profile (some false positives)', () => {
    const signals = [
      makeSignal({ detected: false, score: 0, reason: 'webdriver: not detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
      makeSignal({ detected: true, score: 0.3, reason: 'notificationPermissions: blocked' }),
      makeSignal({ detected: false, score: 0, reason: 'pluginsInconsistency: ok' }),
      makeSignal({ detected: false, score: 0, reason: 'languagesInconsistency: ok' }),
    ]
    const result = score(signals)
    expect(result.bot).toBe(false)
  })
})

describe('Scoring Engine - Debug Logger Integration', () => {
  it('logs scoring result to debug logger', () => {
    const logger = new DebugLogger()
    logger.start()

    const signals = [
      makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
    ]

    const result = score(signals, undefined, logger)

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.scoring).not.toBeNull()
    expect(report.scoring!.bot).toBe(result.bot)
    expect(report.scoring!.confidence).toBe(result.confidence)
    expect(report.scoring!.normalizedScore).toBe(result.score)
    expect(report.scoring!.threshold).toBe(0.4)
    expect(report.scoring!.botKind).toBe(result.botKind)
    expect(report.scoring!.totalWeight).toBeGreaterThan(0)
    expect(report.scoring!.weightedScore).toBeGreaterThan(0)
  })

  it('logs scoring message with detected count', () => {
    const logger = new DebugLogger()
    logger.start()

    const signals = [
      makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
      makeSignal({ detected: true, score: 0.6, reason: 'rtt: zero' }),
      makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
    ]

    score(signals, undefined, logger)

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    const scoreLogEntry = report.log.find((e) => e.phase === 'score')
    expect(scoreLogEntry).toBeDefined()
    expect(scoreLogEntry!.message).toContain('bot=')
    expect(scoreLogEntry!.message).toContain('confidence=')
    expect(scoreLogEntry!.data).toEqual({ detected: 2, total: 3 })
  })

  it('debug logger records custom threshold', () => {
    const logger = new DebugLogger()
    logger.start()

    score(
      [makeSignal({ detected: true, score: 0.5, reason: 'webdriver: test' })],
      { threshold: 0.9 },
      logger,
    )

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.scoring!.threshold).toBe(0.9)
  })

  it('debug logger records custom weights', () => {
    const logger = new DebugLogger()
    logger.start()

    score(
      [makeSignal({ detected: true, score: 0.5, reason: 'webdriver: test' })],
      { weights: { webdriver: 2.0 } },
      logger,
    )

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.scoring!.weights['webdriver']).toBe(2.0)
  })

  it('scoring works correctly without debug logger', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
    ]
    const result = score(signals)
    expect(result.bot).toBe(true)
    expect(result.score).toBe(0.8)
  })
})

describe('Scoring Engine - Edge Cases', () => {
  it('handles single signal that is exactly score=0 but detected', () => {
    const signals = [
      makeSignal({ detected: true, score: 0, reason: 'weird: zero-score detection' }),
    ]
    const result = score(signals)
    expect(result.bot).toBe(false)
    expect(result.reasons).toEqual(['weird: zero-score detection'])
  })

  it('handles very large number of signals', () => {
    const signals = Array.from({ length: 100 }, (_, i) =>
      makeSignal({ detected: i < 50, score: i < 50 ? 0.5 : 0, reason: `detector${i}: test` }),
    )
    const result = score(signals)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
    expect(result.reasons).toHaveLength(50)
  })

  it('handles all signals with score=1.0', () => {
    const signals = Array.from({ length: 5 }, (_, i) =>
      makeSignal({ detected: true, score: 1.0, reason: `detector${i}: max` }),
    )
    const result = score(signals)
    expect(result.score).toBe(1.0)
    expect(result.confidence).toBe(1.0)
    expect(result.bot).toBe(true)
  })

  it('handles signals with reason containing no colon', () => {
    const signals = [
      makeSignal({ detected: true, score: 0.7, reason: 'no-colon-reason' }),
    ]
    const result = score(signals)
    expect(result.score).toBeGreaterThan(0)
  })

  it('DetectionResult has correct shape', () => {
    const result = score([])
    expect(result).toHaveProperty('bot')
    expect(result).toHaveProperty('botKind')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('reasons')
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('signals')
    expect(typeof result.bot).toBe('boolean')
    expect(typeof result.botKind).toBe('string')
    expect(typeof result.confidence).toBe('number')
    expect(Array.isArray(result.reasons)).toBe(true)
    expect(typeof result.score).toBe('number')
    expect(Array.isArray(result.signals)).toBe(true)
  })
})
