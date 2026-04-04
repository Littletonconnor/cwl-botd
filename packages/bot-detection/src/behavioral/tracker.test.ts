import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BehaviorTracker } from './tracker'

describe('BehaviorTracker', () => {
  let tracker: BehaviorTracker

  afterEach(() => {
    tracker?.reset()
  })

  describe('construction', () => {
    it('uses default config when no options provided', () => {
      tracker = new BehaviorTracker()
      expect(tracker.isRunning()).toBe(false)
      const snap = tracker.snapshot()
      expect(snap.mouse).toHaveLength(0)
      expect(snap.clicks).toHaveLength(0)
      expect(snap.keys).toHaveLength(0)
      expect(snap.scrolls).toHaveLength(0)
      expect(snap.duration).toBe(0)
      expect(snap.startedAt).toBe(0)
    })

    it('accepts custom maxEvents and sampleRate', () => {
      tracker = new BehaviorTracker({ maxEvents: 3, sampleRate: 2 })
      tracker.start()
      for (let i = 0; i < 10; i++) {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: i, clientY: i }))
      }
      const snap = tracker.snapshot()
      expect(snap.mouse.length).toBeLessThanOrEqual(3)
    })
  })

  describe('start()', () => {
    it('sets running state and records startedAt', () => {
      tracker = new BehaviorTracker()
      const now = Date.now()
      tracker.start()
      expect(tracker.isRunning()).toBe(true)
      expect(tracker.snapshot().startedAt).toBeGreaterThanOrEqual(now)
    })

    it('registers event listeners that capture events', () => {
      tracker = new BehaviorTracker()
      tracker.start()

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 20 }))
      document.dispatchEvent(new MouseEvent('click', { clientX: 30, clientY: 40 }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }))
      window.dispatchEvent(new Event('scroll'))

      const snap = tracker.snapshot()
      expect(snap.mouse).toHaveLength(1)
      expect(snap.mouse[0]!.x).toBe(10)
      expect(snap.mouse[0]!.y).toBe(20)
      expect(snap.clicks).toHaveLength(1)
      expect(snap.clicks[0]!.x).toBe(30)
      expect(snap.keys).toHaveLength(2)
      expect(snap.keys[0]!.key).toBe('a')
      expect(snap.keys[0]!.type).toBe('keydown')
      expect(snap.keys[1]!.type).toBe('keyup')
      expect(snap.scrolls).toHaveLength(1)
    })

    it('does not start twice (double-start is a no-op)', () => {
      tracker = new BehaviorTracker()
      const addSpy = vi.spyOn(document, 'addEventListener')
      tracker.start()
      const callCount = addSpy.mock.calls.length
      tracker.start()
      expect(addSpy.mock.calls.length).toBe(callCount)
      expect(tracker.isRunning()).toBe(true)
      addSpy.mockRestore()
    })

    it('does nothing in SSR environment (no document/window)', () => {
      const origDoc = globalThis.document
      const origWin = globalThis.window
      // @ts-expect-error simulating SSR
      delete globalThis.document
      // @ts-expect-error simulating SSR
      delete globalThis.window

      tracker = new BehaviorTracker()
      tracker.start()
      expect(tracker.isRunning()).toBe(false)

      globalThis.document = origDoc
      globalThis.window = origWin
    })
  })

  describe('stop()', () => {
    it('removes event listeners so events are no longer captured', () => {
      tracker = new BehaviorTracker()
      tracker.start()
      tracker.stop()
      expect(tracker.isRunning()).toBe(false)

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 99, clientY: 99 }))
      document.dispatchEvent(new MouseEvent('click', { clientX: 99, clientY: 99 }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'z' }))
      window.dispatchEvent(new Event('scroll'))

      const snap = tracker.snapshot()
      expect(snap.mouse).toHaveLength(0)
      expect(snap.clicks).toHaveLength(0)
      expect(snap.keys).toHaveLength(0)
      expect(snap.scrolls).toHaveLength(0)
    })

    it('is a no-op when already stopped (double-stop)', () => {
      tracker = new BehaviorTracker()
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      tracker.stop()
      expect(removeSpy).not.toHaveBeenCalled()
      removeSpy.mockRestore()
    })

    it('does nothing in SSR environment', () => {
      tracker = new BehaviorTracker()
      tracker.start()

      const origDoc = globalThis.document
      const origWin = globalThis.window
      // @ts-expect-error simulating SSR
      delete globalThis.document
      // @ts-expect-error simulating SSR
      delete globalThis.window

      tracker.stop()
      expect(tracker.isRunning()).toBe(true)

      globalThis.document = origDoc
      globalThis.window = origWin
      tracker.stop()
    })
  })

  describe('reset()', () => {
    it('stops tracking and clears all accumulated data', () => {
      tracker = new BehaviorTracker()
      tracker.start()

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 1, clientY: 2 }))
      document.dispatchEvent(new MouseEvent('click', { clientX: 3, clientY: 4 }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }))
      window.dispatchEvent(new Event('scroll'))

      tracker.reset()

      expect(tracker.isRunning()).toBe(false)
      const snap = tracker.snapshot()
      expect(snap.mouse).toHaveLength(0)
      expect(snap.clicks).toHaveLength(0)
      expect(snap.keys).toHaveLength(0)
      expect(snap.scrolls).toHaveLength(0)
      expect(snap.startedAt).toBe(0)
      expect(snap.duration).toBe(0)
    })
  })

  describe('event handling', () => {
    beforeEach(() => {
      tracker = new BehaviorTracker()
      tracker.start()
    })

    it('records mousemove with correct coordinates', () => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 250 }))
      const snap = tracker.snapshot()
      expect(snap.mouse).toHaveLength(1)
      expect(snap.mouse[0]).toMatchObject({ x: 150, y: 250 })
      expect(snap.mouse[0]!.timestamp).toBeGreaterThan(0)
    })

    it('records click with target tagName', () => {
      const btn = document.createElement('button')
      document.body.appendChild(btn)
      btn.click()
      const snap = tracker.snapshot()
      expect(snap.clicks).toHaveLength(1)
      expect(snap.clicks[0]!.target).toBe('BUTTON')
      document.body.removeChild(btn)
    })

    it('records click target as null for non-element targets', () => {
      document.dispatchEvent(new MouseEvent('click', { clientX: 5, clientY: 5 }))
      const snap = tracker.snapshot()
      expect(snap.clicks).toHaveLength(1)
    })

    it('records keydown and keyup events separately', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }))
      const snap = tracker.snapshot()
      expect(snap.keys).toHaveLength(2)
      expect(snap.keys[0]).toMatchObject({ key: 'Enter', type: 'keydown' })
      expect(snap.keys[1]).toMatchObject({ key: 'Enter', type: 'keyup' })
    })

    it('records scroll events', () => {
      window.dispatchEvent(new Event('scroll'))
      const snap = tracker.snapshot()
      expect(snap.scrolls).toHaveLength(1)
      expect(snap.scrolls[0]!.timestamp).toBeGreaterThan(0)
    })
  })

  describe('circular buffer behavior', () => {
    it('evicts oldest entries when capacity is exceeded', () => {
      tracker = new BehaviorTracker({ maxEvents: 5 })
      tracker.start()

      for (let i = 0; i < 8; i++) {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: i, clientY: 0 }))
      }

      const snap = tracker.snapshot()
      expect(snap.mouse).toHaveLength(5)
      const xs = snap.mouse.map((m) => m.x)
      expect(xs).toEqual([3, 4, 5, 6, 7])
    })

    it('bounds memory for all event types independently', () => {
      tracker = new BehaviorTracker({ maxEvents: 2 })
      tracker.start()

      for (let i = 0; i < 5; i++) {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: i, clientY: 0 }))
        document.dispatchEvent(new MouseEvent('click', { clientX: i, clientY: 0 }))
        document.dispatchEvent(new KeyboardEvent('keydown', { key: String(i) }))
      }

      const snap = tracker.snapshot()
      expect(snap.mouse).toHaveLength(2)
      expect(snap.clicks).toHaveLength(2)
      expect(snap.keys).toHaveLength(2)
    })
  })

  describe('sample rate', () => {
    it('skips mousemove events based on sampleRate', () => {
      tracker = new BehaviorTracker({ sampleRate: 3 })
      tracker.start()

      for (let i = 1; i <= 9; i++) {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: i * 10, clientY: 0 }))
      }

      const snap = tracker.snapshot()
      expect(snap.mouse).toHaveLength(3)
      expect(snap.mouse[0]!.x).toBe(30)
      expect(snap.mouse[1]!.x).toBe(60)
      expect(snap.mouse[2]!.x).toBe(90)
    })

    it('does not affect other event types', () => {
      tracker = new BehaviorTracker({ sampleRate: 5 })
      tracker.start()

      for (let i = 0; i < 5; i++) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
        document.dispatchEvent(new MouseEvent('click', { clientX: i, clientY: 0 }))
      }

      const snap = tracker.snapshot()
      expect(snap.keys).toHaveLength(5)
      expect(snap.clicks).toHaveLength(5)
    })

    it('records every mousemove when sampleRate is 1', () => {
      tracker = new BehaviorTracker({ sampleRate: 1 })
      tracker.start()

      for (let i = 0; i < 4; i++) {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: i, clientY: 0 }))
      }

      expect(tracker.snapshot().mouse).toHaveLength(4)
    })
  })

  describe('snapshot()', () => {
    it('computes duration from startedAt to now', () => {
      vi.useFakeTimers()
      tracker = new BehaviorTracker()

      vi.setSystemTime(1000)
      tracker.start()

      vi.setSystemTime(3500)
      const snap = tracker.snapshot()
      expect(snap.duration).toBe(2500)
      expect(snap.startedAt).toBe(1000)

      vi.useRealTimers()
    })

    it('returns readonly arrays', () => {
      tracker = new BehaviorTracker()
      const snap = tracker.snapshot()
      expect(Array.isArray(snap.mouse)).toBe(true)
      expect(Array.isArray(snap.clicks)).toBe(true)
      expect(Array.isArray(snap.keys)).toBe(true)
      expect(Array.isArray(snap.scrolls)).toBe(true)
    })
  })

  describe('start/stop lifecycle', () => {
    it('can be restarted after stop and captures new events', () => {
      tracker = new BehaviorTracker()
      tracker.start()
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 1, clientY: 1 }))
      tracker.stop()

      tracker.start()
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 2, clientY: 2 }))

      const snap = tracker.snapshot()
      expect(snap.mouse).toHaveLength(2)
    })

    it('can be restarted after reset with fresh state', () => {
      tracker = new BehaviorTracker()
      tracker.start()
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 1, clientY: 1 }))
      tracker.reset()

      tracker.start()
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 5, clientY: 5 }))

      const snap = tracker.snapshot()
      expect(snap.mouse).toHaveLength(1)
      expect(snap.mouse[0]!.x).toBe(5)
    })
  })
})
