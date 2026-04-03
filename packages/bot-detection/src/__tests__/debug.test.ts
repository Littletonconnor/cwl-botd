import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DebugLogger } from '../debug'
import type { DebugReport } from '../debug'
import { BotDetector } from '../detector'
import { collect } from '../api'
import { State } from '../types'
import { score } from '../detectors/scoring'
import { DetectorRegistry } from '../detectors/registry'
import { DetectorCategory } from '../detectors/types'
import type { Detector, Signal } from '../detectors/types'

describe('DebugLogger', () => {
  let logger: DebugLogger

  beforeEach(() => {
    logger = new DebugLogger()
    logger.start()
  })

  it('records log entries', () => {
    logger.log('collect', 'userAgent', 'collected successfully')
    logger.log('detect', 'webdriver', 'not detected')

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.log).toHaveLength(2)
    expect(report.log[0]!.phase).toBe('collect')
    expect(report.log[0]!.source).toBe('userAgent')
    expect(report.log[1]!.phase).toBe('detect')
  })

  it('records collector results', () => {
    logger.addCollectorResult({ name: 'userAgent', state: 'Success', duration: 0.5, value: 'Mozilla/5.0' })
    logger.addCollectorResult({ name: 'webDriver', state: 'Success', duration: 0.1, value: false })

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.collectors).toHaveLength(2)
    expect(report.collectors[0]!.name).toBe('userAgent')
    expect(report.collectors[0]!.duration).toBe(0.5)
    expect(report.collectors[1]!.value).toBe(false)
  })

  it('records detector results', () => {
    logger.addDetectorResult({
      name: 'webdriver',
      category: 'automation',
      detected: true,
      score: 1.0,
      reason: 'webdriver: navigator.webdriver is true',
      botKind: 'Selenium',
      duration: 0.2,
    })

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.detectors).toHaveLength(1)
    expect(report.detectors[0]!.detected).toBe(true)
    expect(report.detectors[0]!.botKind).toBe('Selenium')
    expect(report.signals).toEqual({ detected: 1, total: 1 })
  })

  it('records scoring result', () => {
    logger.setScoringResult({
      threshold: 0.4,
      weights: { webdriver: 1.0 },
      normalizedScore: 0.8,
      confidence: 0.9,
      totalWeight: 1.0,
      weightedScore: 0.8,
      bot: true,
      botKind: 'Selenium',
    })

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.scoring).not.toBeNull()
    expect(report.scoring!.bot).toBe(true)
    expect(report.scoring!.confidence).toBe(0.9)
  })

  it('includes config in report', () => {
    const report = logger.buildReport({
      disabledCollectors: ['canvasFingerprint'],
      disabledDetectors: ['webglAdvanced'],
      privacy: { disableCanvas: true },
      performance: { skipExpensive: false },
    })

    expect(report.config.disabledCollectors).toEqual(['canvasFingerprint'])
    expect(report.config.disabledDetectors).toEqual(['webglAdvanced'])
    expect(report.config.privacy).toEqual({ disableCanvas: true })
  })

  it('tracks totalDuration', () => {
    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.totalDuration).toBeGreaterThanOrEqual(0)
    expect(report.timestamp).toBeGreaterThan(0)
  })

  it('resets all state', () => {
    logger.log('collect', 'test', 'msg')
    logger.addCollectorResult({ name: 'test', state: 'Success', duration: 1 })
    logger.addDetectorResult({ name: 'test', category: 'automation', detected: false, score: 0, reason: 'test', duration: 1 })
    logger.setScoringResult({
      threshold: 0.4, weights: {}, normalizedScore: 0, confidence: 0,
      totalWeight: 0, weightedScore: 0, bot: false, botKind: 'Unknown',
    })

    logger.reset()
    logger.start()

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.log).toHaveLength(0)
    expect(report.collectors).toHaveLength(0)
    expect(report.detectors).toHaveLength(0)
    expect(report.scoring).toBeNull()
  })
})

describe('collect with debug logger', () => {
  it('logs successful collectors', async () => {
    const logger = new DebugLogger()
    logger.start()

    const collectors = {
      simple: () => 'hello',
      numeric: () => 42,
    }

    await collect(collectors, logger)

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.collectors).toHaveLength(2)
    const names = report.collectors.map((c) => c.name).sort()
    expect(names).toEqual(['numeric', 'simple'])
    for (const c of report.collectors) {
      expect(c.state).toBe('Success')
      expect(c.duration).toBeGreaterThanOrEqual(0)
    }
  })

  it('logs failed collectors', async () => {
    const logger = new DebugLogger()
    logger.start()

    const collectors = {
      failing: () => { throw new Error('oops') },
    }

    await collect(collectors, logger)

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.collectors).toHaveLength(1)
    expect(report.collectors[0]!.state).toBe('Undefined')
    expect(report.collectors[0]!.error).toContain('oops')
  })
})

describe('DetectorRegistry with debug logger', () => {
  it('logs detector results with timing', () => {
    const logger = new DebugLogger()
    logger.start()

    const registry = new DetectorRegistry()
    const mockDetector: Detector = {
      name: 'testDetector',
      category: DetectorCategory.Automation,
      detect: () => ({ detected: true, score: 0.8, reason: 'testDetector: found something' }),
    }
    registry.register(mockDetector)

    const mockData = {
      webDriver: { state: State.Success, value: true },
    } as any

    registry.run(mockData, undefined, logger)

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.detectors).toHaveLength(1)
    expect(report.detectors[0]!.name).toBe('testDetector')
    expect(report.detectors[0]!.detected).toBe(true)
    expect(report.detectors[0]!.duration).toBeGreaterThanOrEqual(0)
  })

  it('logs detector errors', () => {
    const logger = new DebugLogger()
    logger.start()

    const registry = new DetectorRegistry()
    const crashDetector: Detector = {
      name: 'crasher',
      category: DetectorCategory.Automation,
      detect: () => { throw new Error('boom') },
    }
    registry.register(crashDetector)

    registry.run({} as any, undefined, logger)

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.detectors).toHaveLength(1)
    expect(report.detectors[0]!.detected).toBe(false)
    expect(report.detectors[0]!.reason).toContain('threw an error')
  })
})

describe('score with debug logger', () => {
  it('logs scoring results', () => {
    const logger = new DebugLogger()
    logger.start()

    const signals: Signal[] = [
      { detected: true, score: 1.0, reason: 'webdriver: detected' },
      { detected: false, score: 0, reason: 'userAgent: not detected' },
    ]

    score(signals, undefined, logger)

    const report = logger.buildReport({
      disabledCollectors: [],
      disabledDetectors: [],
      privacy: {},
      performance: {},
    })

    expect(report.scoring).not.toBeNull()
    expect(report.scoring!.bot).toBe(true)
    expect(report.scoring!.threshold).toBe(0.4)
    expect(report.scoring!.normalizedScore).toBeGreaterThan(0)
    expect(report.log.some((e) => e.phase === 'score')).toBe(true)
  })
})

describe('BotDetector debug mode', () => {
  it('returns undefined debug report when debug is off', () => {
    const detector = new BotDetector()
    expect(detector.getDebugReport()).toBeUndefined()
    expect(detector.exportDebugJSON()).toBe('{}')
  })

  it('produces a debug report after detect() with debug config', async () => {
    const detector = new BotDetector({ debug: true })
    await detector.detect()

    const report = detector.getDebugReport()
    expect(report).toBeDefined()
    expect(report!.collectors.length).toBeGreaterThan(0)
    expect(report!.detectors.length).toBeGreaterThan(0)
    expect(report!.scoring).not.toBeNull()
    expect(report!.timestamp).toBeGreaterThan(0)
    expect(report!.totalDuration).toBeGreaterThanOrEqual(0)
  })

  it('produces a debug report with per-call debug option', async () => {
    const detector = new BotDetector()
    await detector.detect({ debug: true })

    const report = detector.getDebugReport()
    expect(report).toBeDefined()
    expect(report!.detectors.length).toBeGreaterThan(0)
  })

  it('exportDebugJSON returns valid JSON', async () => {
    const detector = new BotDetector({ debug: true })
    await detector.detect()

    const json = detector.exportDebugJSON()
    const parsed = JSON.parse(json)
    expect(parsed.collectors).toBeDefined()
    expect(parsed.detectors).toBeDefined()
    expect(parsed.scoring).toBeDefined()
    expect(parsed.log).toBeDefined()
  })

  it('debug report includes config info', async () => {
    const detector = new BotDetector({
      debug: true,
      privacy: { disableCanvas: true },
    })
    await detector.detect()

    const report = detector.getDebugReport()
    expect(report!.config.privacy.disableCanvas).toBe(true)
    expect(report!.config.disabledCollectors).toContain('canvasFingerprint')
  })

  it('cleans up debug state on destroy', async () => {
    const detector = new BotDetector({ debug: true })
    await detector.detect()
    expect(detector.getDebugReport()).toBeDefined()

    detector.destroy()
    expect(detector.getDebugReport()).toBeUndefined()
    expect(detector.exportDebugJSON()).toBe('{}')
  })

  it('each detect() call produces a fresh debug report', async () => {
    const detector = new BotDetector({ debug: true })

    await detector.detect()
    const first = detector.getDebugReport()

    await detector.detect()
    const second = detector.getDebugReport()

    expect(first!.timestamp).not.toBe(second!.timestamp)
  })

  it('debug report includes signal summary', async () => {
    const detector = new BotDetector({ debug: true })
    await detector.detect()

    const report = detector.getDebugReport()
    expect(report!.signals.total).toBeGreaterThan(0)
    expect(typeof report!.signals.detected).toBe('number')
  })
})
