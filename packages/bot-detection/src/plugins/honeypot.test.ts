import { describe, it, expect, afterEach } from 'vitest'
import { honeypotPlugin } from './honeypot'
import { DetectorCategory } from '../detectors/types'
import { State } from '../types'
import type { CollectorDict, Component } from '../types'

type HoneypotValue = { triggered: boolean; fields: string[] }

const collector = honeypotPlugin.collectors!.honeypot!
const detector = honeypotPlugin.detectors![0]!

function makeData(
  state: string,
  value?: HoneypotValue,
): Record<string, Component<HoneypotValue>> {
  if (state === State.Success) {
    return { honeypot: { state: State.Success, value: value! } }
  }
  return { honeypot: { state: state as typeof State.Undefined, error: 'no data' } }
}

describe('honeypotPlugin', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('structure', () => {
    it('has correct name, collectors, and detectors', () => {
      expect(honeypotPlugin.name).toBe('honeypot')
      expect(honeypotPlugin.collectors).toBeDefined()
      expect(typeof collector).toBe('function')
      expect(honeypotPlugin.detectors).toHaveLength(1)
      expect(detector.name).toBe('honeypotFilled')
      expect(detector.category).toBe(DetectorCategory.Automation)
    })
  })

  describe('collector', () => {
    it('returns not triggered when no honeypot fields exist', () => {
      const result = collector() as HoneypotValue
      expect(result).toEqual({ triggered: false, fields: [] })
    })

    it('returns not triggered when honeypot fields exist but are empty', () => {
      document.body.innerHTML = '<input name="fax" value="" />'
      const result = collector() as HoneypotValue
      expect(result).toEqual({ triggered: false, fields: [] })
    })

    it('detects filled hidden input matched by name selector', () => {
      document.body.innerHTML = '<input name="fax" value="bot-filled" />'
      const result = collector() as HoneypotValue
      expect(result.triggered).toBe(true)
      expect(result.fields).toContain('fax')
    })

    it('detects filled input with display:none style', () => {
      document.body.innerHTML = '<input name="trap" style="display:none" value="spam" />'
      const result = collector() as HoneypotValue
      expect(result.triggered).toBe(true)
      expect(result.fields).toContain('trap')
    })

    it('detects filled input with visibility:hidden style', () => {
      document.body.innerHTML = '<input name="hidden-trap" style="visibility:hidden" value="data" />'
      const result = collector() as HoneypotValue
      expect(result.triggered).toBe(true)
      expect(result.fields).toContain('hidden-trap')
    })

    it('detects filled input inside .honeypot container', () => {
      document.body.innerHTML = '<div class="honeypot"><input name="hp" value="filled" /></div>'
      const result = collector() as HoneypotValue
      expect(result.triggered).toBe(true)
      expect(result.fields).toContain('hp')
    })

    it('detects filled input with tabindex=-1 and autocomplete=off', () => {
      document.body.innerHTML =
        '<input name="secret" tabindex="-1" autocomplete="off" value="bot" />'
      const result = collector() as HoneypotValue
      expect(result.triggered).toBe(true)
      expect(result.fields).toContain('secret')
    })

    it('falls back to id when name is empty', () => {
      document.body.innerHTML = '<input id="hp-id" name="" style="display:none" value="filled" />'
      const result = collector() as HoneypotValue
      expect(result.triggered).toBe(true)
      expect(result.fields).toContain('hp-id')
    })

    it('falls back to selector when both name and id are empty', () => {
      document.body.innerHTML = '<input style="display:none" value="filled" />'
      const result = collector() as HoneypotValue
      expect(result.triggered).toBe(true)
      expect(result.fields.length).toBe(1)
      expect(result.fields[0]).toContain('display:none')
    })

    it('collects multiple filled honeypot fields', () => {
      document.body.innerHTML = `
        <input name="website" value="http://spam.com" />
        <input name="url" value="http://spam.com" />
        <input name="phone2" value="555" />
      `
      const result = collector() as HoneypotValue
      expect(result.triggered).toBe(true)
      expect(result.fields.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('collector SSR safety', () => {
    it('returns not triggered when document is undefined', () => {
      const origDocument = globalThis.document
      Object.defineProperty(globalThis, 'document', { value: undefined, configurable: true })
      try {
        const result = collector() as HoneypotValue
        expect(result).toEqual({ triggered: false, fields: [] })
      } finally {
        Object.defineProperty(globalThis, 'document', { value: origDocument, configurable: true })
      }
    })
  })

  describe('detector', () => {
    it('returns not detected when no honeypot data is present', () => {
      const signal = detector.detect({} as CollectorDict)
      expect(signal.detected).toBe(false)
      expect(signal.score).toBe(0)
      expect(signal.reason).toContain('no honeypot data available')
    })

    it('returns not detected when component state is not Success', () => {
      const data = makeData(State.Undefined)
      const signal = detector.detect(data as unknown as CollectorDict)
      expect(signal.detected).toBe(false)
      expect(signal.score).toBe(0)
    })

    it('returns not detected when honeypot fields are untouched', () => {
      const data = makeData(State.Success, { triggered: false, fields: [] })
      const signal = detector.detect(data as unknown as CollectorDict)
      expect(signal.detected).toBe(false)
      expect(signal.score).toBe(0)
      expect(signal.reason).toContain('no hidden fields filled')
    })

    it('returns detected with high score when honeypot fields are filled', () => {
      const data = makeData(State.Success, { triggered: true, fields: ['fax', 'website'] })
      const signal = detector.detect(data as unknown as CollectorDict)
      expect(signal.detected).toBe(true)
      expect(signal.score).toBe(0.9)
      expect(signal.reason).toContain('fax')
      expect(signal.reason).toContain('website')
    })

    it('includes field names in the reason string', () => {
      const data = makeData(State.Success, { triggered: true, fields: ['address2'] })
      const signal = detector.detect(data as unknown as CollectorDict)
      expect(signal.reason).toBe('honeypotFilled: hidden fields filled (address2)')
    })
  })
})
