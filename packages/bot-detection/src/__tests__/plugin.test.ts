import { describe, it, expect, vi } from 'vitest'
import {
  BotDetector,
  defineDetector,
  defineCollector,
  definePlugin,
  DetectorCategory,
  honeypotPlugin,
  cookielessPlugin,
} from '../index'
import type { Plugin, CollectorFn } from '../plugin'
import type { CollectorDict, Component } from '../types'
import { State } from '../types'

describe('defineDetector', () => {
  it('returns a valid Detector object', () => {
    const detector = defineDetector({
      name: 'testDetector',
      category: DetectorCategory.Automation,
      detect: () => ({ detected: false, score: 0, reason: 'test' }),
    })
    expect(detector.name).toBe('testDetector')
    expect(detector.category).toBe('automation')
    expect(typeof detector.detect).toBe('function')
  })
})

describe('defineCollector', () => {
  it('returns a record with the named collector function', () => {
    const result = defineCollector('myCollector', () => 42)
    expect(typeof result.myCollector).toBe('function')
    expect(result.myCollector()).toBe(42)
  })
})

describe('definePlugin', () => {
  it('returns a Plugin with all fields', () => {
    const plugin = definePlugin({
      name: 'test',
      collectors: { foo: () => 'bar' },
      detectors: [
        defineDetector({
          name: 'd1',
          category: DetectorCategory.Automation,
          detect: () => ({ detected: false, score: 0, reason: 'noop' }),
        }),
      ],
      init: () => {},
    })
    expect(plugin.name).toBe('test')
    expect(plugin.collectors).toBeDefined()
    expect(plugin.detectors).toHaveLength(1)
    expect(typeof plugin.init).toBe('function')
  })
})

describe('BotDetector.use(plugin)', () => {
  it('calls plugin init', async () => {
    const initFn = vi.fn()
    const plugin = definePlugin({ name: 'initTest', init: initFn })
    const detector = new BotDetector()
    await detector.use(plugin)
    expect(initFn).toHaveBeenCalledOnce()
  })

  it('registers plugin detectors that run during detect()', async () => {
    const plugin = definePlugin({
      name: 'customDetect',
      detectors: [
        defineDetector({
          name: 'alwaysDetects',
          category: DetectorCategory.Automation,
          detect: () => ({
            detected: true,
            score: 1.0,
            reason: 'alwaysDetects: always fires',
          }),
        }),
      ],
    })

    const detector = new BotDetector()
    await detector.use(plugin)
    const result = await detector.detect()
    const reasons = result.reasons
    expect(reasons.some((r: string) => r.includes('alwaysDetects'))).toBe(true)
  })

  it('registers plugin collectors that run during collect()', async () => {
    const plugin = definePlugin({
      name: 'customCollect',
      collectors: {
        customValue: () => 'hello from plugin',
      },
    })

    const detector = new BotDetector()
    await detector.use(plugin)
    const data = await detector.collect()
    const component = (data as Record<string, Component<string>>).customValue
    expect(component).toBeDefined()
    expect(component.state).toBe(State.Success)
    if (component.state === State.Success) {
      expect(component.value).toBe('hello from plugin')
    }
  })

  it('supports async init', async () => {
    let initialized = false
    const plugin = definePlugin({
      name: 'asyncInit',
      init: async () => {
        initialized = true
      },
    })

    const detector = new BotDetector()
    await detector.use(plugin)
    expect(initialized).toBe(true)
  })

  it('supports multiple plugins', async () => {
    const p1 = definePlugin({
      name: 'p1',
      collectors: { val1: () => 1 },
    })
    const p2 = definePlugin({
      name: 'p2',
      collectors: { val2: () => 2 },
    })

    const detector = new BotDetector()
    await detector.use(p1)
    await detector.use(p2)
    const data = await detector.collect()
    expect((data as Record<string, Component<number>>).val1?.state).toBe(State.Success)
    expect((data as Record<string, Component<number>>).val2?.state).toBe(State.Success)
  })
})

describe('built-in plugins', () => {
  describe('honeypotPlugin', () => {
    it('has correct name and structure', () => {
      expect(honeypotPlugin.name).toBe('honeypot')
      expect(honeypotPlugin.collectors).toBeDefined()
      expect(honeypotPlugin.collectors!.honeypot).toBeDefined()
      expect(honeypotPlugin.detectors).toHaveLength(1)
      expect(honeypotPlugin.detectors![0]!.name).toBe('honeypotFilled')
    })

    it('collector returns triggered: false when no honeypot fields filled', () => {
      const result = honeypotPlugin.collectors!.honeypot!()
      expect(result).toEqual({ triggered: false, fields: [] })
    })

    it('detector returns not detected when no data', () => {
      const detector = honeypotPlugin.detectors![0]!
      const signal = detector.detect({} as CollectorDict)
      expect(signal.detected).toBe(false)
    })
  })

  describe('cookielessPlugin', () => {
    it('has correct name and structure', () => {
      expect(cookielessPlugin.name).toBe('cookieless')
      expect(cookielessPlugin.collectors).toBeDefined()
      expect(cookielessPlugin.collectors!.cookieless).toBeDefined()
      expect(cookielessPlugin.detectors).toHaveLength(1)
      expect(cookielessPlugin.detectors![0]!.name).toBe('cookielessBrowsing')
    })

    it('collector checks storage availability', () => {
      const result = cookielessPlugin.collectors!.cookieless!() as {
        cookiesEnabled: boolean
        localStorageAvailable: boolean
        sessionStorageAvailable: boolean
      }
      expect(typeof result.cookiesEnabled).toBe('boolean')
      expect(typeof result.localStorageAvailable).toBe('boolean')
      expect(typeof result.sessionStorageAvailable).toBe('boolean')
    })

    it('detector returns not detected when no data', () => {
      const detector = cookielessPlugin.detectors![0]!
      const signal = detector.detect({} as CollectorDict)
      expect(signal.detected).toBe(false)
    })

    it('detector detects when all storage blocked', () => {
      const detector = cookielessPlugin.detectors![0]!
      const data = {
        cookieless: {
          state: State.Success,
          value: {
            cookiesEnabled: false,
            localStorageAvailable: false,
            sessionStorageAvailable: false,
          },
        },
      } as unknown as CollectorDict
      const signal = detector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.6)
    })

    it('detector detects when cookies disabled', () => {
      const detector = cookielessPlugin.detectors![0]!
      const data = {
        cookieless: {
          state: State.Success,
          value: {
            cookiesEnabled: false,
            localStorageAvailable: true,
            sessionStorageAvailable: true,
          },
        },
      } as unknown as CollectorDict
      const signal = detector.detect(data)
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.3)
    })

    it('detector returns not detected when storage available', () => {
      const detector = cookielessPlugin.detectors![0]!
      const data = {
        cookieless: {
          state: State.Success,
          value: {
            cookiesEnabled: true,
            localStorageAvailable: true,
            sessionStorageAvailable: true,
          },
        },
      } as unknown as CollectorDict
      const signal = detector.detect(data)
      expect(signal.detected).toBe(false)
    })
  })
})
