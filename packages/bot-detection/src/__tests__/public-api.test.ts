import { describe, it, expect } from 'vitest'
import {
  load,
  BotDetector,
  DetectorRegistry,
  BotKind,
  DetectorCategory,
  score,
  createDefaultRegistry,
  State,
  BehaviorTracker,
} from '../index'

describe('public API surface', () => {
  it('exports load as a function', () => {
    expect(typeof load).toBe('function')
  })

  it('exports BotDetector as a class', () => {
    expect(typeof BotDetector).toBe('function')
    expect(typeof BotDetector.isBot).toBe('function')
  })

  it('exports DetectorRegistry as a class', () => {
    expect(typeof DetectorRegistry).toBe('function')
  })

  it('exports BotKind enum', () => {
    expect(BotKind.HeadlessChrome).toBe('HeadlessChrome')
    expect(BotKind.Puppeteer).toBe('Puppeteer')
    expect(BotKind.Playwright).toBe('Playwright')
    expect(BotKind.Selenium).toBe('Selenium')
    expect(BotKind.Unknown).toBe('Unknown')
  })

  it('exports DetectorCategory enum', () => {
    expect(DetectorCategory.Automation).toBe('automation')
    expect(DetectorCategory.Inconsistency).toBe('inconsistency')
    expect(DetectorCategory.Behavioral).toBe('behavioral')
  })

  it('exports score as a function', () => {
    expect(typeof score).toBe('function')
  })

  it('exports createDefaultRegistry as a function', () => {
    expect(typeof createDefaultRegistry).toBe('function')
  })

  it('exports State enum', () => {
    expect(State.Success).toBe('Success')
    expect(State.Undefined).toBe('Undefined')
    expect(State.NotFunction).toBe('NotFunction')
    expect(State.Null).toBe('Null')
  })

  it('exports BehaviorTracker as a class', () => {
    expect(typeof BehaviorTracker).toBe('function')
  })
})

describe('BotDetector.isBot', () => {
  it('returns true when result.bot is true', () => {
    const result = {
      bot: true,
      botKind: BotKind.Puppeteer,
      confidence: 0.9,
      reasons: ['webdriver detected'],
      score: 0.8,
      signals: [],
    }
    expect(BotDetector.isBot(result)).toBe(true)
  })

  it('returns false when result.bot is false', () => {
    const result = {
      bot: false,
      botKind: BotKind.Unknown,
      confidence: 0.1,
      reasons: [],
      score: 0.1,
      signals: [],
    }
    expect(BotDetector.isBot(result)).toBe(false)
  })
})

describe('BotDetector instance', () => {
  it('has all public methods', () => {
    const detector = new BotDetector()
    expect(typeof detector.detect).toBe('function')
    expect(typeof detector.collect).toBe('function')
    expect(typeof detector.getBehaviorScore).toBe('function')
    expect(typeof detector.startBehaviorTracking).toBe('function')
    expect(typeof detector.stopBehaviorTracking).toBe('function')
    expect(typeof detector.getFingerprint).toBe('function')
    expect(typeof detector.destroy).toBe('function')
    expect(typeof detector.getCollections).toBe('function')
    expect(typeof detector.getDetections).toBe('function')
  })

  it('returns empty fingerprint before collect', () => {
    const detector = new BotDetector()
    expect(detector.getFingerprint()).toBe('')
  })

  it('returns undefined collections and detections before use', () => {
    const detector = new BotDetector()
    expect(detector.getCollections()).toBeUndefined()
    expect(detector.getDetections()).toBeUndefined()
  })

  it('returns default behavior score when no tracker started', () => {
    const detector = new BotDetector()
    const result = detector.getBehaviorScore()
    expect(result).toEqual({
      bot: false,
      score: 0,
      reasons: [],
      duration: 0,
    })
  })

  it('cleans up on destroy', () => {
    const detector = new BotDetector()
    detector.destroy()
    expect(detector.getCollections()).toBeUndefined()
    expect(detector.getDetections()).toBeUndefined()
  })
})

describe('createDefaultRegistry', () => {
  it('returns a registry with detectors', () => {
    const registry = createDefaultRegistry()
    const detectors = registry.getDetectors()
    expect(detectors.length).toBeGreaterThan(0)
  })

  it('includes detectors from all categories', () => {
    const registry = createDefaultRegistry()
    const detectors = registry.getDetectors()
    const categories = new Set(detectors.map((d) => d.category))
    expect(categories.has('automation')).toBe(true)
    expect(categories.has('inconsistency')).toBe(true)
    expect(categories.has('behavioral')).toBe(true)
  })
})

describe('score function', () => {
  it('returns a valid DetectionResult for empty signals', () => {
    const result = score([])
    expect(result).toEqual({
      bot: false,
      botKind: BotKind.Unknown,
      confidence: 0,
      reasons: [],
      score: 0,
      signals: [],
    })
  })

  it('respects custom threshold', () => {
    const signals = [
      { detected: true, score: 0.3, reason: 'test: mild signal' },
    ]
    const low = score(signals, { threshold: 0.1 })
    const high = score(signals, { threshold: 0.9 })
    expect(low.bot).toBe(true)
    expect(high.bot).toBe(false)
  })
})
