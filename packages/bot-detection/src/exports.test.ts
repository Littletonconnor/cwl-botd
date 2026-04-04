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
  DebugLogger,
  BehaviorTracker,
  defineDetector,
  defineCollector,
  definePlugin,
  honeypotPlugin,
  cookielessPlugin,
} from './index'

import { collectors } from './collectors/index'

import {
  analyzeMouseMovement,
  analyzeKeyboard,
  analyzeScroll,
  analyzeInteractionTiming,
} from './behavioral/index'

import {
  honeypotPlugin as honeypotFromPlugins,
  cookielessPlugin as cookielessFromPlugins,
} from './plugins/index'

describe('main barrel exports', () => {
  it('exports load as a function', () => {
    expect(typeof load).toBe('function')
  })

  it('exports BotDetector as a function (class)', () => {
    expect(typeof BotDetector).toBe('function')
  })

  it('exports DetectorRegistry as a function (class)', () => {
    expect(typeof DetectorRegistry).toBe('function')
  })

  it('exports BotKind as an object with expected keys', () => {
    expect(BotKind).toBeDefined()
    expect(BotKind.HeadlessChrome).toBe('HeadlessChrome')
    expect(BotKind.Puppeteer).toBe('Puppeteer')
    expect(BotKind.Selenium).toBe('Selenium')
    expect(BotKind.Unknown).toBe('Unknown')
  })

  it('exports DetectorCategory as an object with expected keys', () => {
    expect(DetectorCategory).toBeDefined()
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

  it('exports State as an object with expected keys', () => {
    expect(State).toBeDefined()
    expect(State.Success).toBe('Success')
    expect(State.Undefined).toBe('Undefined')
  })

  it('exports DebugLogger as a function (class)', () => {
    expect(typeof DebugLogger).toBe('function')
  })

  it('exports BehaviorTracker as a function (class)', () => {
    expect(typeof BehaviorTracker).toBe('function')
  })

  it('exports defineDetector as a function', () => {
    expect(typeof defineDetector).toBe('function')
  })

  it('exports defineCollector as a function', () => {
    expect(typeof defineCollector).toBe('function')
  })

  it('exports definePlugin as a function', () => {
    expect(typeof definePlugin).toBe('function')
  })

  it('exports honeypotPlugin as an object', () => {
    expect(honeypotPlugin).toBeDefined()
    expect(typeof honeypotPlugin).toBe('object')
    expect(honeypotPlugin.name).toBe('honeypot')
  })

  it('exports cookielessPlugin as an object', () => {
    expect(cookielessPlugin).toBeDefined()
    expect(typeof cookielessPlugin).toBe('object')
    expect(cookielessPlugin.name).toBe('cookieless')
  })
})

describe('collectors barrel exports', () => {
  it('exports collectors as an object with expected collector functions', () => {
    expect(collectors).toBeDefined()
    expect(typeof collectors).toBe('object')
    expect(typeof collectors.userAgent).toBe('function')
    expect(typeof collectors.platform).toBe('function')
    expect(typeof collectors.language).toBe('function')
    expect(typeof collectors.timezone).toBe('function')
    expect(typeof collectors.webDriver).toBe('function')
    expect(typeof collectors.webGl).toBe('function')
    expect(typeof collectors.documentFocus).toBe('function')
    expect(typeof collectors.canvasFingerprint).toBe('function')
    expect(typeof collectors.webGlFingerprint).toBe('function')
    expect(typeof collectors.audioFingerprint).toBe('function')
    expect(typeof collectors.fontEnumeration).toBe('function')
    expect(typeof collectors.behaviorSnapshot).toBe('function')
  })
})

describe('behavioral barrel exports', () => {
  it('exports analyzeMouseMovement as a function', () => {
    expect(typeof analyzeMouseMovement).toBe('function')
  })

  it('exports analyzeKeyboard as a function', () => {
    expect(typeof analyzeKeyboard).toBe('function')
  })

  it('exports analyzeScroll as a function', () => {
    expect(typeof analyzeScroll).toBe('function')
  })

  it('exports analyzeInteractionTiming as a function', () => {
    expect(typeof analyzeInteractionTiming).toBe('function')
  })

  it('re-exports BehaviorTracker as a function (class)', () => {
    expect(typeof BehaviorTracker).toBe('function')
  })
})

describe('plugins barrel exports', () => {
  it('re-exports honeypotPlugin matching the main barrel', () => {
    expect(honeypotFromPlugins).toBe(honeypotPlugin)
  })

  it('re-exports cookielessPlugin matching the main barrel', () => {
    expect(cookielessFromPlugins).toBe(cookielessPlugin)
  })
})
