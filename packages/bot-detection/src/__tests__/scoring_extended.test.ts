import { describe, it, expect } from 'vitest'
import { score } from '../detectors/scoring'
import { BotKind, type Signal } from '../detectors/types'

function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    detected: false,
    score: 0,
    reason: 'test: default signal',
    ...overrides,
  }
}

describe('Scoring Engine - Extended Coverage', () => {
  describe('score normalization', () => {
    it('returns 0 score and confidence for empty signals array', () => {
      const result = score([])
      expect(result.bot).toBe(false)
      expect(result.score).toBe(0)
      expect(result.confidence).toBe(0)
      expect(result.reasons).toEqual([])
    })

    it('returns 0 confidence when all signals are undetected', () => {
      const signals = [
        makeSignal({ reason: 'webdriver: not set' }),
        makeSignal({ reason: 'userAgent: normal' }),
        makeSignal({ reason: 'evalLength: matches' }),
      ]
      const result = score(signals)
      expect(result.confidence).toBe(0)
      expect(result.bot).toBe(false)
    })

    it('normalizes score across weighted signals', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
        makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
      ]
      const result = score(signals)
      expect(result.score).toBeGreaterThan(0)
      expect(result.score).toBeLessThan(1)
    })

    it('uses default weight of 0.5 for unknown signal names', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.9, reason: 'unknownDetector: suspicious' }),
      ]
      const result = score(signals)
      expect(result.score).toBeGreaterThan(0)
      expect(result.bot).toBe(true)
    })
  })

  describe('threshold classification', () => {
    it('classifies as bot when confidence >= default threshold (0.4)', () => {
      const signals = [
        makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
      ]
      const result = score(signals)
      expect(result.bot).toBe(true)
      expect(result.confidence).toBeGreaterThanOrEqual(0.4)
    })

    it('classifies as not-bot when confidence < threshold', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.1, reason: 'notificationPermissions: slightly off' }),
        makeSignal({ detected: false, score: 0, reason: 'webdriver: not set' }),
        makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
        makeSignal({ detected: false, score: 0, reason: 'pluginsInconsistency: normal' }),
        makeSignal({ detected: false, score: 0, reason: 'languagesInconsistency: normal' }),
      ]
      const result = score(signals)
      expect(result.bot).toBe(false)
    })

    it('respects custom threshold', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.5, reason: 'webdriver: detected' }),
      ]
      const resultLow = score(signals, { threshold: 0.1 })
      expect(resultLow.bot).toBe(true)

      const resultHigh = score(signals, { threshold: 0.99 })
      expect(resultHigh.bot).toBe(false)
    })
  })

  describe('confidence computation', () => {
    it('boosts confidence by 0.3 for definitive signal (score >= 1.0)', () => {
      const signals = [
        makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
        makeSignal({ detected: true, score: 0.4, reason: 'rtt: zero' }),
      ]
      const result = score(signals)
      // normalizedScore < 1.0 due to the lower-scoring signal, but confidence gets +0.3 boost
      expect(result.confidence).toBeGreaterThan(result.score)
    })

    it('caps confidence at 1.0 even with definitive signal boost', () => {
      const signals = [
        makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
        makeSignal({ detected: true, score: 1.0, reason: 'distinctiveProperties: found' }),
        makeSignal({ detected: true, score: 0.9, reason: 'userAgent: HeadlessChrome' }),
      ]
      const result = score(signals)
      expect(result.confidence).toBeLessThanOrEqual(1.0)
    })

    it('boosts confidence by 0.2 for 2+ strong signals (score >= 0.7)', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
        makeSignal({ detected: true, score: 0.7, reason: 'pluginsInconsistency: no plugins' }),
      ]
      const result = score(signals)
      expect(result.confidence).toBeGreaterThan(result.score)
    })

    it('does not boost for single strong signal without definitive', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
        makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
      ]
      const result = score(signals)
      // Single strong signal, no definitive -> confidence equals normalizedScore
      const expectedNormalized = result.score
      expect(result.confidence).toBe(expectedNormalized)
    })
  })

  describe('custom weights', () => {
    it('uses custom weights to increase specific detector importance', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.5, reason: 'webdriver: detected' }),
      ]
      const low = score(signals, { weights: { webdriver: 0.1 } })
      const high = score(signals, { weights: { webdriver: 2.0 } })
      // Both have the same signal, but weights affect normalization
      expect(low.score).toBeGreaterThan(0)
      expect(high.score).toBeGreaterThan(0)
    })

    it('merges custom weights with defaults', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.7, reason: 'webdriver: detected' }),
        makeSignal({ detected: true, score: 0.6, reason: 'rtt: zero on desktop' }),
      ]
      const result = score(signals, { weights: { webdriver: 0.0 } })
      // webdriver weight zeroed out, only rtt contributes
      expect(result.score).toBeGreaterThan(0)
    })
  })

  describe('botKind determination', () => {
    it('returns Unknown when no signals have botKind', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
      ]
      const result = score(signals)
      expect(result.botKind).toBe(BotKind.Unknown)
    })

    it('returns the botKind with highest accumulated score', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.9, reason: 'userAgent: HeadlessChrome', botKind: BotKind.HeadlessChrome }),
        makeSignal({ detected: true, score: 0.3, reason: 'process: electron', botKind: BotKind.Electron }),
      ]
      const result = score(signals)
      expect(result.botKind).toBe(BotKind.HeadlessChrome)
    })

    it('accumulates scores for same botKind across multiple signals', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.5, reason: 'userAgent: PhantomJS', botKind: BotKind.PhantomJS }),
        makeSignal({ detected: true, score: 0.9, reason: 'errorTrace: PhantomJS', botKind: BotKind.PhantomJS }),
        makeSignal({ detected: true, score: 0.8, reason: 'process: electron', botKind: BotKind.Electron }),
      ]
      const result = score(signals)
      // PhantomJS: 0.5 + 0.9 = 1.4, Electron: 0.8 -> PhantomJS wins
      expect(result.botKind).toBe(BotKind.PhantomJS)
    })

    it('returns Unknown when detected signals exist but none have botKind', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.7, reason: 'webdriver: detected' }),
        makeSignal({ detected: true, score: 0.6, reason: 'pluginsInconsistency: no plugins' }),
      ]
      const result = score(signals)
      expect(result.botKind).toBe(BotKind.Unknown)
    })

    it('determines Selenium botKind', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.9, reason: 'distinctiveProperties: selenium', botKind: BotKind.Selenium }),
      ]
      const result = score(signals)
      expect(result.botKind).toBe(BotKind.Selenium)
    })

    it('determines Sequentum botKind', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.9, reason: 'windowExternal: Sequentum', botKind: BotKind.Sequentum }),
      ]
      const result = score(signals)
      expect(result.botKind).toBe(BotKind.Sequentum)
    })
  })

  describe('reasons extraction', () => {
    it('only includes reasons from detected signals', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
        makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
        makeSignal({ detected: true, score: 0.6, reason: 'rtt: zero on desktop' }),
      ]
      const result = score(signals)
      expect(result.reasons).toEqual(['webdriver: detected', 'rtt: zero on desktop'])
      expect(result.reasons).not.toContain('userAgent: normal')
    })

    it('returns empty reasons when nothing detected', () => {
      const signals = [
        makeSignal({ detected: false, score: 0, reason: 'webdriver: not set' }),
      ]
      const result = score(signals)
      expect(result.reasons).toEqual([])
    })
  })

  describe('signals passthrough', () => {
    it('includes all original signals in result', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.8, reason: 'webdriver: detected' }),
        makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
      ]
      const result = score(signals)
      expect(result.signals).toBe(signals)
      expect(result.signals).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    it('handles single detected signal correctly', () => {
      const signals = [
        makeSignal({ detected: true, score: 0.7, reason: 'webdriver: detected' }),
      ]
      const result = score(signals)
      expect(result.bot).toBe(true)
      expect(result.score).toBe(0.7)
      expect(result.reasons).toHaveLength(1)
    })

    it('handles many weak signals (below individual threshold)', () => {
      const signals = Array.from({ length: 10 }, (_, i) =>
        makeSignal({ detected: true, score: 0.2, reason: `detector${i}: weak signal` }),
      )
      const result = score(signals)
      expect(result.score).toBeGreaterThan(0)
      expect(result.reasons).toHaveLength(10)
    })

    it('handles mix of high and low score signals', () => {
      const signals = [
        makeSignal({ detected: true, score: 1.0, reason: 'webdriver: detected' }),
        makeSignal({ detected: true, score: 0.1, reason: 'notificationPermissions: slightly off' }),
        makeSignal({ detected: false, score: 0, reason: 'userAgent: normal' }),
      ]
      const result = score(signals)
      expect(result.bot).toBe(true)
      expect(result.confidence).toBeGreaterThan(result.score)
    })
  })
})
