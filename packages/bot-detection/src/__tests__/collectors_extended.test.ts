import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  mockNavigator,
  HEADLESS_CHROME_NAVIGATOR,
  mockCreateElement,
  createMockWebGLContext,
  mockWindowDimensions,
} from './helpers'
import { getUserAgent } from '../collectors/user_agent'
import { getWebDriver } from '../collectors/webdriver'
import { getUserPlatform } from '../collectors/platform'
import { getLanguage } from '../collectors/language'
import { getTimezone } from '../collectors/timezone'
import { getPlugins } from '../collectors/plugins'
import { getDimension } from '../collectors/dimension'
import { getDocumentFocus } from '../collectors/document_focus'
import { getWebGl } from '../collectors/canvas'
import { getCanvasFingerprint } from '../collectors/canvas_fingerprint'
import { getFontEnumeration } from '../collectors/font_enumeration'
import { getAudioFingerprint } from '../collectors/audio_fingerprint'
import { getBehaviorSnapshot, setBehaviorSnapshot } from '../collectors/behavior_snapshot'
import { getWebGlFingerprint } from '../collectors/webgl_fingerprint'

describe('Collectors - Extended Coverage', () => {
  describe('getUserAgent', () => {
    it('returns a string containing Mozilla', () => {
      mockNavigator()
      expect(getUserAgent()).toContain('Mozilla')
    })

    it('returns HeadlessChrome for headless environment', () => {
      mockNavigator(HEADLESS_CHROME_NAVIGATOR)
      expect(getUserAgent()).toContain('HeadlessChrome')
    })

    it('returns the exact user agent string set', () => {
      mockNavigator({ userAgent: 'CustomBot/1.0' })
      expect(getUserAgent()).toBe('CustomBot/1.0')
    })
  })

  describe('getWebDriver', () => {
    it('returns false for normal browsers', () => {
      mockNavigator({ webdriver: false })
      expect(getWebDriver()).toBe(false)
    })

    it('returns true for automated browsers', () => {
      mockNavigator({ webdriver: true })
      expect(getWebDriver()).toBe(true)
    })
  })

  describe('getUserPlatform', () => {
    it('returns Win32 for Windows', () => {
      mockNavigator({ platform: 'Win32' })
      expect(getUserPlatform()).toBe('Win32')
    })

    it('returns MacIntel for macOS', () => {
      mockNavigator({ platform: 'MacIntel' })
      expect(getUserPlatform()).toBe('MacIntel')
    })

    it('returns Linux x86_64 for headless', () => {
      mockNavigator(HEADLESS_CHROME_NAVIGATOR)
      expect(getUserPlatform()).toBe('Linux x86_64')
    })
  })

  describe('getLanguage', () => {
    it('returns both language and languages arrays', () => {
      mockNavigator({ language: 'en-US', languages: ['en-US', 'en'] })
      const result = getLanguage()
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(['en-US'])
      expect(result[1]).toEqual(['en-US', 'en'])
    })

    it('returns empty languages for headless browsers', () => {
      mockNavigator(HEADLESS_CHROME_NAVIGATOR)
      const result = getLanguage()
      expect(result[1]).toEqual([])
    })

    it('handles multiple languages', () => {
      mockNavigator({ language: 'de-DE', languages: ['de-DE', 'en-US', 'fr-FR'] })
      const result = getLanguage()
      expect(result[0]).toEqual(['de-DE'])
      expect(result[1]).toEqual(['de-DE', 'en-US', 'fr-FR'])
    })
  })

  describe('getTimezone', () => {
    it('returns timezone and locale properties', () => {
      mockNavigator({ language: 'en-US' })
      const result = getTimezone()
      expect(result).toHaveProperty('timezone')
      expect(result).toHaveProperty('locale')
      expect(typeof result.timezone).toBe('string')
      expect(result.timezone.length).toBeGreaterThan(0)
    })

    it('returns locale matching navigator.language', () => {
      mockNavigator({ language: 'fr-FR' })
      const result = getTimezone()
      expect(result.locale).toBe('fr-FR')
    })
  })

  describe('getPlugins', () => {
    it('returns plugin count for normal browser', () => {
      mockNavigator({ plugins: { length: 5 } })
      expect(getPlugins()).toBe(5)
    })

    it('returns 0 for headless browser', () => {
      mockNavigator(HEADLESS_CHROME_NAVIGATOR)
      expect(getPlugins()).toBe(0)
    })

    it('returns correct count for various plugin counts', () => {
      mockNavigator({ plugins: { length: 12 } })
      expect(getPlugins()).toBe(12)
    })

    it('throws when plugins is undefined', () => {
      Object.defineProperty(navigator, 'plugins', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      expect(() => getPlugins()).toThrow()
    })
  })

  describe('getDimension', () => {
    it('returns window dimensions', () => {
      mockWindowDimensions(1920, 1080)
      const result = getDimension()
      expect(result).toEqual({ width: 1920, height: 1080 })
    })

    it('detects zero dimensions (headless indicator)', () => {
      mockWindowDimensions(0, 0)
      const result = getDimension()
      expect(result.width).toBe(0)
      expect(result.height).toBe(0)
    })

    it('returns small dimensions', () => {
      mockWindowDimensions(320, 480)
      const result = getDimension()
      expect(result).toEqual({ width: 320, height: 480 })
    })
  })

  describe('getDocumentFocus', () => {
    it('returns a boolean', () => {
      const result = getDocumentFocus()
      expect(typeof result).toBe('boolean')
    })

    it('returns false when hasFocus is undefined', () => {
      const orig = document.hasFocus
      Object.defineProperty(document, 'hasFocus', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      const result = getDocumentFocus()
      expect(result).toBe(false)
      document.hasFocus = orig
    })
  })

  describe('getWebGl', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('returns vendor and renderer from WebGL context', () => {
      mockCreateElement()
      const result = getWebGl()
      expect(result).toHaveProperty('vendor')
      expect(result).toHaveProperty('renderer')
      expect(result.vendor).toBe('Google Inc. (NVIDIA)')
    })

    it('detects SwiftShader (headless indicator)', () => {
      const ctx = createMockWebGLContext('Google Inc.', 'Google SwiftShader')
      mockCreateElement(ctx)
      const result = getWebGl()
      expect(result.renderer).toContain('SwiftShader')
    })

    it('detects llvmpipe (virtual GPU)', () => {
      const ctx = createMockWebGLContext('VMware, Inc.', 'llvmpipe (LLVM 12.0.0)')
      mockCreateElement(ctx)
      const result = getWebGl()
      expect(result.renderer).toContain('llvmpipe')
    })

    it('detects Mesa OffScreen', () => {
      const ctx = createMockWebGLContext('Mesa', 'Mesa OffScreen')
      mockCreateElement(ctx)
      const result = getWebGl()
      expect(result.renderer).toContain('Mesa OffScreen')
    })

    it('throws when WebGL context is null', () => {
      mockCreateElement(null)
      expect(() => getWebGl()).toThrow('WebGLRenderingContext is null')
    })
  })

  describe('getCanvasFingerprint', () => {
    it('throws when document is unavailable (SSR)', () => {
      const origCreateElement = document.createElement
      vi.spyOn(document, 'createElement').mockImplementation(() => {
        throw new Error('not available')
      })
      expect(() => getCanvasFingerprint()).toThrow()
      vi.restoreAllMocks()
    })
  })

  describe('getWebGlFingerprint', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('throws when WebGL context is null', () => {
      mockCreateElement(null)
      expect(() => getWebGlFingerprint()).toThrow('WebGLRenderingContext is null')
    })
  })

  describe('getAudioFingerprint', () => {
    it('rejects when OfflineAudioContext is unavailable', async () => {
      const origOAC = globalThis.OfflineAudioContext
      Object.defineProperty(globalThis, 'OfflineAudioContext', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      await expect(getAudioFingerprint()).rejects.toThrow('OfflineAudioContext is not available')
      Object.defineProperty(globalThis, 'OfflineAudioContext', {
        value: origOAC,
        writable: true,
        configurable: true,
      })
    })
  })

  describe('getFontEnumeration', () => {
    it('returns fonts, count, and blocked properties', () => {
      const result = getFontEnumeration()
      expect(result).toHaveProperty('fonts')
      expect(result).toHaveProperty('count')
      expect(result).toHaveProperty('blocked')
      expect(Array.isArray(result.fonts)).toBe(true)
      expect(typeof result.count).toBe('number')
      expect(typeof result.blocked).toBe('boolean')
    })

    it('sets blocked=true when no fonts are detected', () => {
      const result = getFontEnumeration()
      // In jsdom, offsetWidth is always 0, so no fonts will be detected
      if (result.count === 0) {
        expect(result.blocked).toBe(true)
      }
    })
  })

  describe('getBehaviorSnapshot', () => {
    it('returns empty snapshot when no data pending', async () => {
      const result = await getBehaviorSnapshot()
      expect(result).toHaveProperty('mouse')
      expect(result).toHaveProperty('clicks')
      expect(result).toHaveProperty('keys')
      expect(result).toHaveProperty('scrolls')
      expect(result).toHaveProperty('duration')
      expect(result.mouse).toEqual([])
      expect(result.clicks).toEqual([])
      expect(result.duration).toBe(0)
    })

    it('returns pending snapshot when set', async () => {
      const snapshot = {
        mouse: [{ x: 100, y: 200, timestamp: 1000 }],
        clicks: [],
        keys: [],
        scrolls: [],
        duration: 5000,
        startedAt: 0,
      }
      setBehaviorSnapshot(snapshot as any)
      const result = await getBehaviorSnapshot()
      expect(result.mouse).toHaveLength(1)
      expect(result.duration).toBe(5000)
    })

    it('clears pending snapshot after retrieval', async () => {
      const snapshot = {
        mouse: [{ x: 100, y: 200, timestamp: 1000 }],
        clicks: [],
        keys: [],
        scrolls: [],
        duration: 5000,
        startedAt: 0,
      }
      setBehaviorSnapshot(snapshot as any)
      await getBehaviorSnapshot()
      const result2 = await getBehaviorSnapshot()
      expect(result2.mouse).toEqual([])
      expect(result2.duration).toBe(0)
    })
  })

  describe('getMouseBehavior', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('captures multiple mouse events with correct coordinates', async () => {
      const { getMouseBehavior } = await import('../collectors/mouse_behavior')
      const promise = getMouseBehavior()

      for (let i = 0; i < 5; i++) {
        document.dispatchEvent(
          new MouseEvent('mousemove', { clientX: i * 50, clientY: i * 30 }),
        )
      }

      vi.advanceTimersByTime(500)
      const result = await promise
      expect(result).toHaveLength(5)
      expect(result[0]).toMatchObject({ x: 0, y: 0 })
      expect(result[4]).toMatchObject({ x: 200, y: 120 })
    })
  })

  describe('getClickBehavior', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('captures multiple click events', async () => {
      const { getClickBehavior } = await import('../collectors/click_behavior')
      const promise = getClickBehavior()

      document.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 20, bubbles: true }))
      document.dispatchEvent(new MouseEvent('click', { clientX: 30, clientY: 40, bubbles: true }))

      vi.advanceTimersByTime(500)
      const result = await promise
      expect(result).toHaveLength(2)
    })
  })

  describe('getScrollBehavior', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('resolves with empty array when no scrolls occur', async () => {
      const { getScrollBehavior } = await import('../collectors/scroll_behavior')
      const promise = getScrollBehavior()
      vi.advanceTimersByTime(500)
      const result = await promise
      expect(result).toEqual([])
    })
  })
})
