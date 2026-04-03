import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BehaviorTracker } from '../behavioral/tracker'
import type { BehaviorSnapshot, MouseEvent_, ClickEvent_, KeyEvent_, ScrollEvent_ } from '../behavioral/tracker'
import { analyzeMouseMovement } from '../behavioral/analyzers/mouse'
import { analyzeKeyboard } from '../behavioral/analyzers/keyboard'
import { analyzeScroll } from '../behavioral/analyzers/scroll'
import { analyzeInteractionTiming } from '../behavioral/analyzers/interaction_timing'
import { State } from '../types'
import type { CollectorDict } from '../types'
import mouseMovementDetector from '../detectors/behavioral/mouse_movement'
import keyboardDetector from '../detectors/behavioral/keyboard'
import scrollBehaviorDetector from '../detectors/behavioral/scroll_behavior'
import interactionTimingDetector from '../detectors/behavioral/interaction_timing'

function makeSnapshot(overrides: Partial<BehaviorSnapshot> = {}): BehaviorSnapshot {
  return {
    mouse: [],
    clicks: [],
    keys: [],
    scrolls: [],
    duration: 1000,
    startedAt: 1000,
    ...overrides,
  }
}

function makeCollectorDict(snapshot?: BehaviorSnapshot): CollectorDict {
  const base: Record<string, unknown> = {
    userAgent: { state: State.Success, value: 'Mozilla/5.0' },
    platform: { state: State.Success, value: 'Win32' },
    language: { state: State.Success, value: [['en-US'], ['en-US', 'en']] },
    timezone: { state: State.Success, value: { timezone: 'America/New_York', locale: 'en-US' } },
    webDriver: { state: State.Success, value: false },
    webGl: { state: State.Success, value: { vendor: 'Google', renderer: 'ANGLE' } },
    documentFocus: { state: State.Success, value: true },
    scrollBehavior: { state: State.Success, value: [] },
    mouseBehavior: { state: State.Success, value: [] },
    clickBehavior: { state: State.Success, value: [] },
    dimension: { state: State.Success, value: { width: 1920, height: 1080 } },
    plugins: { state: State.Success, value: 5 },
  }

  if (snapshot) {
    base.behaviorSnapshot = { state: State.Success, value: snapshot }
  } else {
    base.behaviorSnapshot = { state: State.Undefined, error: 'not available' }
  }

  return base as unknown as CollectorDict
}

// --- CircularBuffer / BehaviorTracker ---

describe('BehaviorTracker', () => {
  it('starts in stopped state', () => {
    const tracker = new BehaviorTracker()
    expect(tracker.isRunning()).toBe(false)
  })

  it('snapshot returns empty data before start', () => {
    const tracker = new BehaviorTracker()
    const snap = tracker.snapshot()
    expect(snap.mouse).toHaveLength(0)
    expect(snap.clicks).toHaveLength(0)
    expect(snap.keys).toHaveLength(0)
    expect(snap.scrolls).toHaveLength(0)
    expect(snap.duration).toBe(0)
  })

  it('does not crash in SSR (no document/window)', () => {
    const origDoc = globalThis.document
    const origWin = globalThis.window
    // @ts-expect-error testing SSR
    delete globalThis.document
    // @ts-expect-error testing SSR
    delete globalThis.window

    const tracker = new BehaviorTracker()
    tracker.start()
    expect(tracker.isRunning()).toBe(false)
    tracker.stop()

    globalThis.document = origDoc
    globalThis.window = origWin
  })

  it('reset clears all buffers', () => {
    const tracker = new BehaviorTracker()
    tracker.start()
    tracker.reset()
    expect(tracker.isRunning()).toBe(false)
    const snap = tracker.snapshot()
    expect(snap.mouse).toHaveLength(0)
    expect(snap.startedAt).toBe(0)
  })
})

// --- Mouse Movement Analyzer ---

describe('analyzeMouseMovement', () => {
  it('returns defaults for insufficient data', () => {
    const result = analyzeMouseMovement([], [])
    expect(result.totalMoves).toBe(0)
    expect(result.straightLineRatio).toBe(0)
  })

  it('detects straight-line movement', () => {
    const moves: MouseEvent_[] = []
    for (let i = 0; i < 20; i++) {
      moves.push({ timestamp: 1000 + i * 50, x: i * 10, y: 100 })
    }
    const result = analyzeMouseMovement(moves, [])
    expect(result.straightLineRatio).toBeGreaterThan(0.8)
  })

  it('detects teleportation', () => {
    const moves: MouseEvent_[] = [
      { timestamp: 1000, x: 100, y: 100 },
      { timestamp: 1010, x: 900, y: 900 },
      { timestamp: 1020, x: 910, y: 910 },
    ]
    const result = analyzeMouseMovement(moves, [])
    expect(result.teleportCount).toBeGreaterThan(0)
  })

  it('detects clicks without mouse movement', () => {
    const moves: MouseEvent_[] = [
      { timestamp: 1000, x: 100, y: 100 },
      { timestamp: 1050, x: 110, y: 110 },
      { timestamp: 1100, x: 120, y: 120 },
    ]
    const clicks: ClickEvent_[] = [
      { timestamp: 5000, x: 800, y: 800, target: 'BUTTON' },
    ]
    const result = analyzeMouseMovement(moves, clicks)
    expect(result.clicksWithoutMove).toBe(1)
  })

  it('recognizes natural movement', () => {
    const moves: MouseEvent_[] = []
    for (let i = 0; i < 30; i++) {
      moves.push({
        timestamp: 1000 + i * 30,
        x: 100 + Math.sin(i * 0.5) * 200 + Math.random() * 10,
        y: 100 + Math.cos(i * 0.3) * 150 + Math.random() * 10,
      })
    }
    const result = analyzeMouseMovement(moves, [])
    expect(result.straightLineRatio).toBeLessThan(0.5)
    expect(result.teleportCount).toBe(0)
  })
})

// --- Keyboard Analyzer ---

describe('analyzeKeyboard', () => {
  it('returns defaults for insufficient data', () => {
    const result = analyzeKeyboard([])
    expect(result.totalKeyPresses).toBe(0)
  })

  it('detects uniform typing speed', () => {
    const events: KeyEvent_[] = []
    for (let i = 0; i < 10; i++) {
      events.push({ timestamp: 1000 + i * 100, key: 'a', type: 'keydown' })
      events.push({ timestamp: 1000 + i * 100 + 50, key: 'a', type: 'keyup' })
    }
    const result = analyzeKeyboard(events)
    expect(result.uniformTimingRatio).toBeGreaterThan(0.8)
    expect(result.holdDurationVariance).toBeLessThan(1)
  })

  it('recognizes human typing variance', () => {
    const events: KeyEvent_[] = []
    const delays = [80, 120, 95, 150, 60, 200, 110, 75, 180, 90]
    let t = 1000
    for (const delay of delays) {
      events.push({ timestamp: t, key: 'a', type: 'keydown' })
      events.push({ timestamp: t + 30 + Math.random() * 80, key: 'a', type: 'keyup' })
      t += delay
    }
    const result = analyzeKeyboard(events)
    expect(result.uniformTimingRatio).toBeLessThan(0.5)
  })
})

// --- Scroll Analyzer ---

describe('analyzeScroll', () => {
  it('returns defaults for insufficient data', () => {
    const result = analyzeScroll([])
    expect(result.totalScrollEvents).toBe(0)
  })

  it('detects uniform scroll increments', () => {
    const events: ScrollEvent_[] = []
    for (let i = 0; i < 10; i++) {
      events.push({ timestamp: 1000 + i * 100, scrollY: i * 100 })
    }
    const result = analyzeScroll(events)
    expect(result.uniformIncrementRatio).toBeGreaterThan(0.8)
  })

  it('detects direction changes', () => {
    const events: ScrollEvent_[] = [
      { timestamp: 1000, scrollY: 0 },
      { timestamp: 1100, scrollY: 100 },
      { timestamp: 1200, scrollY: 200 },
      { timestamp: 1300, scrollY: 150 },
      { timestamp: 1400, scrollY: 250 },
    ]
    const result = analyzeScroll(events)
    expect(result.directionChanges).toBeGreaterThan(0)
  })
})

// --- Interaction Timing Analyzer ---

describe('analyzeInteractionTiming', () => {
  it('returns defaults for empty snapshot', () => {
    const result = analyzeInteractionTiming(makeSnapshot())
    expect(result.totalInteractions).toBe(0)
  })

  it('detects suspiciously fast clicks', () => {
    const clicks: ClickEvent_[] = [
      { timestamp: 1000, x: 100, y: 100, target: 'BUTTON' },
      { timestamp: 1020, x: 100, y: 100, target: 'BUTTON' },
      { timestamp: 1040, x: 100, y: 100, target: 'BUTTON' },
    ]
    const result = analyzeInteractionTiming(makeSnapshot({ clicks, startedAt: 900 }))
    expect(result.suspiciouslyFastClicks).toBe(2)
  })

  it('computes time to first interaction', () => {
    const clicks: ClickEvent_[] = [
      { timestamp: 2500, x: 100, y: 100, target: 'BUTTON' },
    ]
    const result = analyzeInteractionTiming(makeSnapshot({ clicks, startedAt: 1000 }))
    expect(result.timeToFirstInteraction).toBe(1500)
  })
})

// --- Behavioral Detectors ---

describe('behavioral detectors', () => {
  it('mouseMovement: returns not detected without behavioral data', () => {
    const result = mouseMovementDetector.detect(makeCollectorDict())
    expect(result.detected).toBe(false)
  })

  it('mouseMovement: detects bot-like straight lines', () => {
    const mouse: MouseEvent_[] = []
    for (let i = 0; i < 20; i++) {
      mouse.push({ timestamp: 1000 + i * 50, x: i * 10, y: 100 })
    }
    const snapshot = makeSnapshot({ mouse })
    const result = mouseMovementDetector.detect(makeCollectorDict(snapshot))
    expect(result.detected).toBe(true)
    expect(result.reason).toContain('straight lines')
  })

  it('mouseMovement: passes for human-like movement', () => {
    const mouse: MouseEvent_[] = []
    for (let i = 0; i < 30; i++) {
      mouse.push({
        timestamp: 1000 + i * 30,
        x: 100 + Math.sin(i * 0.5) * 200 + Math.random() * 20,
        y: 100 + Math.cos(i * 0.3) * 150 + Math.random() * 20,
      })
    }
    const snapshot = makeSnapshot({ mouse })
    const result = mouseMovementDetector.detect(makeCollectorDict(snapshot))
    expect(result.detected).toBe(false)
  })

  it('keyboardBehavior: detects uniform typing', () => {
    const keys: KeyEvent_[] = []
    for (let i = 0; i < 10; i++) {
      keys.push({ timestamp: 1000 + i * 100, key: 'a', type: 'keydown' })
      keys.push({ timestamp: 1000 + i * 100 + 50, key: 'a', type: 'keyup' })
    }
    const snapshot = makeSnapshot({ keys })
    const result = keyboardDetector.detect(makeCollectorDict(snapshot))
    expect(result.detected).toBe(true)
    expect(result.reason).toContain('uniform')
  })

  it('scrollBehavior: detects uniform scrolling', () => {
    const scrolls: ScrollEvent_[] = []
    for (let i = 0; i < 10; i++) {
      scrolls.push({ timestamp: 1000 + i * 100, scrollY: i * 100 })
    }
    const snapshot = makeSnapshot({ scrolls })
    const result = scrollBehaviorDetector.detect(makeCollectorDict(snapshot))
    expect(result.detected).toBe(true)
    expect(result.reason).toContain('uniform')
  })

  it('interactionTiming: detects fast clicks', () => {
    const clicks: ClickEvent_[] = [
      { timestamp: 1010, x: 100, y: 100, target: 'BUTTON' },
      { timestamp: 1030, x: 100, y: 100, target: 'BUTTON' },
      { timestamp: 1050, x: 100, y: 100, target: 'BUTTON' },
    ]
    const snapshot = makeSnapshot({ clicks, startedAt: 1000 })
    const result = interactionTimingDetector.detect(makeCollectorDict(snapshot))
    expect(result.detected).toBe(true)
    expect(result.reason).toContain('50ms')
  })

  it('interactionTiming: passes with no interactions', () => {
    const snapshot = makeSnapshot()
    const result = interactionTimingDetector.detect(makeCollectorDict(snapshot))
    expect(result.detected).toBe(false)
  })
})
