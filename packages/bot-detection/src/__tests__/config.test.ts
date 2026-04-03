import { describe, it, expect } from 'vitest'
import { resolveFilters, filterByName } from '../config'
import type { BotDetectionConfig } from '../config'
import { DetectorRegistry } from '../detectors/registry'
import { DetectorCategory } from '../detectors/types'
import { BotDetector } from '../detector'

describe('resolveFilters', () => {
  it('returns empty sets with no config', () => {
    const filters = resolveFilters({})
    expect(filters.disabledCollectors.size).toBe(0)
    expect(filters.disabledDetectors.size).toBe(0)
  })

  it('passes through explicit disabled collectors', () => {
    const filters = resolveFilters({
      collectors: { disabled: ['userAgent', 'platform'] },
    })
    expect(filters.disabledCollectors.has('userAgent')).toBe(true)
    expect(filters.disabledCollectors.has('platform')).toBe(true)
    expect(filters.disabledCollectors.size).toBe(2)
  })

  it('passes through explicit disabled detectors', () => {
    const filters = resolveFilters({
      detectors: { disabled: ['webdriver', 'rtt'] },
    })
    expect(filters.disabledDetectors.has('webdriver')).toBe(true)
    expect(filters.disabledDetectors.has('rtt')).toBe(true)
    expect(filters.disabledDetectors.size).toBe(2)
  })

  it('disableFingerprinting disables all fingerprint collectors and detectors', () => {
    const filters = resolveFilters({
      privacy: { disableFingerprinting: true },
    })
    expect(filters.disabledCollectors.has('canvasFingerprint')).toBe(true)
    expect(filters.disabledCollectors.has('webGlFingerprint')).toBe(true)
    expect(filters.disabledCollectors.has('audioFingerprint')).toBe(true)
    expect(filters.disabledCollectors.has('fontEnumeration')).toBe(true)

    expect(filters.disabledDetectors.has('canvasFingerprint')).toBe(true)
    expect(filters.disabledDetectors.has('webglAdvanced')).toBe(true)
    expect(filters.disabledDetectors.has('audioFingerprint')).toBe(true)
    expect(filters.disabledDetectors.has('fontEnumeration')).toBe(true)
    expect(filters.disabledDetectors.has('mathFingerprint')).toBe(true)
    expect(filters.disabledDetectors.has('spatialConsistency')).toBe(true)
    expect(filters.disabledDetectors.has('temporalConsistency')).toBe(true)
  })

  it('disableCanvas only disables canvas-related items', () => {
    const filters = resolveFilters({
      privacy: { disableCanvas: true },
    })
    expect(filters.disabledCollectors.has('canvasFingerprint')).toBe(true)
    expect(filters.disabledDetectors.has('canvasFingerprint')).toBe(true)
    expect(filters.disabledCollectors.has('audioFingerprint')).toBe(false)
    expect(filters.disabledDetectors.has('audioFingerprint')).toBe(false)
  })

  it('disableWebGL only disables WebGL-related items', () => {
    const filters = resolveFilters({
      privacy: { disableWebGL: true },
    })
    expect(filters.disabledCollectors.has('webGlFingerprint')).toBe(true)
    expect(filters.disabledDetectors.has('webglAdvanced')).toBe(true)
    expect(filters.disabledCollectors.has('canvasFingerprint')).toBe(false)
  })

  it('disableAudio only disables audio-related items', () => {
    const filters = resolveFilters({
      privacy: { disableAudio: true },
    })
    expect(filters.disabledCollectors.has('audioFingerprint')).toBe(true)
    expect(filters.disabledDetectors.has('audioFingerprint')).toBe(true)
    expect(filters.disabledCollectors.has('canvasFingerprint')).toBe(false)
  })

  it('disableFonts only disables font-related items', () => {
    const filters = resolveFilters({
      privacy: { disableFonts: true },
    })
    expect(filters.disabledCollectors.has('fontEnumeration')).toBe(true)
    expect(filters.disabledDetectors.has('fontEnumeration')).toBe(true)
    expect(filters.disabledCollectors.has('canvasFingerprint')).toBe(false)
  })

  it('skipExpensive disables expensive collectors and detectors', () => {
    const filters = resolveFilters({
      performance: { skipExpensive: true },
    })
    expect(filters.disabledCollectors.has('canvasFingerprint')).toBe(true)
    expect(filters.disabledCollectors.has('webGlFingerprint')).toBe(true)
    expect(filters.disabledCollectors.has('audioFingerprint')).toBe(true)
    expect(filters.disabledCollectors.has('fontEnumeration')).toBe(true)

    expect(filters.disabledDetectors.has('canvasFingerprint')).toBe(true)
    expect(filters.disabledDetectors.has('webglAdvanced')).toBe(true)
    expect(filters.disabledDetectors.has('audioFingerprint')).toBe(true)
    expect(filters.disabledDetectors.has('fontEnumeration')).toBe(true)
  })

  it('combines explicit disabled with privacy and performance filters', () => {
    const filters = resolveFilters({
      collectors: { disabled: ['timezone'] },
      detectors: { disabled: ['webdriver'] },
      privacy: { disableCanvas: true },
      performance: { skipExpensive: true },
    })
    expect(filters.disabledCollectors.has('timezone')).toBe(true)
    expect(filters.disabledCollectors.has('canvasFingerprint')).toBe(true)
    expect(filters.disabledCollectors.has('audioFingerprint')).toBe(true)
    expect(filters.disabledDetectors.has('webdriver')).toBe(true)
    expect(filters.disabledDetectors.has('canvasFingerprint')).toBe(true)
  })
})

describe('filterByName', () => {
  const items = {
    alpha: () => 'a',
    beta: () => 'b',
    gamma: () => 'c',
    delta: () => 'd',
  }

  it('returns all items with no config and empty disabled set', () => {
    const result = filterByName(items, undefined, new Set())
    expect(Object.keys(result)).toEqual(['alpha', 'beta', 'gamma', 'delta'])
  })

  it('filters to only enabled items', () => {
    const result = filterByName(items, { enabled: ['alpha', 'gamma'] }, new Set())
    expect(Object.keys(result)).toEqual(['alpha', 'gamma'])
  })

  it('removes disabled items', () => {
    const result = filterByName(items, { disabled: ['beta'] }, new Set())
    expect(Object.keys(result)).toEqual(['alpha', 'gamma', 'delta'])
  })

  it('removes additionalDisabled items', () => {
    const result = filterByName(items, undefined, new Set(['alpha', 'delta']))
    expect(Object.keys(result)).toEqual(['beta', 'gamma'])
  })

  it('combines enabled whitelist with disabled blacklist', () => {
    const result = filterByName(
      items,
      { enabled: ['alpha', 'beta', 'gamma'], disabled: ['beta'] },
      new Set(),
    )
    expect(Object.keys(result)).toEqual(['alpha', 'gamma'])
  })

  it('combines config disabled with additionalDisabled', () => {
    const result = filterByName(
      items,
      { disabled: ['alpha'] },
      new Set(['gamma']),
    )
    expect(Object.keys(result)).toEqual(['beta', 'delta'])
  })
})

describe('DetectorRegistry filtering', () => {
  function makeDetector(name: string) {
    return {
      name,
      category: DetectorCategory.Automation,
      detect: () => ({ detected: false, score: 0, reason: `${name}: not detected` }),
    }
  }

  it('runs all detectors with no filter', () => {
    const registry = new DetectorRegistry()
    registry.registerAll([makeDetector('a'), makeDetector('b'), makeDetector('c')])
    const signals = registry.run({} as any)
    expect(signals).toHaveLength(3)
  })

  it('only runs enabled detectors', () => {
    const registry = new DetectorRegistry()
    registry.registerAll([makeDetector('a'), makeDetector('b'), makeDetector('c')])
    const signals = registry.run({} as any, { enabled: ['a', 'c'] })
    expect(signals).toHaveLength(2)
    expect(signals.map((s) => s.reason)).toEqual(['a: not detected', 'c: not detected'])
  })

  it('skips disabled detectors', () => {
    const registry = new DetectorRegistry()
    registry.registerAll([makeDetector('a'), makeDetector('b'), makeDetector('c')])
    const signals = registry.run({} as any, { disabled: ['b'] })
    expect(signals).toHaveLength(2)
    expect(signals.map((s) => s.reason)).toEqual(['a: not detected', 'c: not detected'])
  })
})

describe('BotDetector config integration', () => {
  it('accepts empty config', () => {
    const detector = new BotDetector()
    expect(detector.getCollections()).toBeUndefined()
  })

  it('accepts privacy config', () => {
    const detector = new BotDetector({
      privacy: { disableFingerprinting: true },
    })
    expect(detector.getCollections()).toBeUndefined()
  })

  it('accepts performance config', () => {
    const detector = new BotDetector({
      performance: { skipExpensive: true },
    })
    expect(detector.getCollections()).toBeUndefined()
  })

  it('accepts detector enable/disable config', () => {
    const detector = new BotDetector({
      detectors: { disabled: ['webdriver'] },
    })
    expect(detector.getCollections()).toBeUndefined()
  })

  it('accepts collector enable/disable config', () => {
    const detector = new BotDetector({
      collectors: { disabled: ['canvasFingerprint'] },
    })
    expect(detector.getCollections()).toBeUndefined()
  })

  it('accepts combined config', () => {
    const config: BotDetectionConfig = {
      detectors: { disabled: ['webdriver'] },
      collectors: { disabled: ['timezone'] },
      scoring: { threshold: 0.6 },
      privacy: { disableCanvas: true },
      performance: { skipExpensive: true },
      monitoring: false,
      debug: true,
    }
    const detector = new BotDetector(config)
    expect(detector.getCollections()).toBeUndefined()
  })
})
