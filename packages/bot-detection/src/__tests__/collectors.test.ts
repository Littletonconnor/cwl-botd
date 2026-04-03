import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest'
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
import { getMouseBehavior } from '../collectors/mouse_behavior'
import { getClickBehavior } from '../collectors/click_behavior'
import { getScrollBehavior } from '../collectors/scroll_behavior'

describe('getUserAgent', () => {
  beforeEach(() => {
    mockNavigator()
  })

  it('returns the user agent string', () => {
    expect(getUserAgent()).toContain('Mozilla')
  })

  it('detects headless chrome UA', () => {
    mockNavigator(HEADLESS_CHROME_NAVIGATOR)
    expect(getUserAgent()).toContain('HeadlessChrome')
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
  it('returns the platform string', () => {
    mockNavigator({ platform: 'Win32' })
    expect(getUserPlatform()).toBe('Win32')
  })

  it('returns Linux for headless environments', () => {
    mockNavigator(HEADLESS_CHROME_NAVIGATOR)
    expect(getUserPlatform()).toBe('Linux x86_64')
  })
})

describe('getLanguage', () => {
  it('returns language arrays for normal browser', () => {
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
})

describe('getTimezone', () => {
  it('returns timezone and locale', () => {
    mockNavigator({ language: 'en-US' })
    const result = getTimezone()
    expect(result).toHaveProperty('timezone')
    expect(result).toHaveProperty('locale')
    expect(typeof result.timezone).toBe('string')
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

  it('throws when plugins is undefined', () => {
    Object.defineProperty(navigator, 'plugins', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    expect(() => getPlugins()).toThrow('navigator.plugins is undefined')
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
})

describe('getDocumentFocus', () => {
  it('returns a boolean', () => {
    const result = getDocumentFocus()
    expect(typeof result).toBe('boolean')
  })
})

describe('getWebGl', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns vendor and renderer', () => {
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

  it('throws when WebGL context is null', () => {
    mockCreateElement(null)
    expect(() => getWebGl()).toThrow('WebGLRenderingContext is null')
  })
})

describe('getMouseBehavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves with empty array when no events occur', async () => {
    const promise = getMouseBehavior()
    vi.advanceTimersByTime(500)
    const result = await promise
    expect(result).toEqual([])
  })

  it('captures mouse events within the collection window', async () => {
    const promise = getMouseBehavior()

    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 100, clientY: 200 }),
    )
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 150, clientY: 250 }),
    )

    vi.advanceTimersByTime(500)
    const result = await promise

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ x: 100, y: 200 })
    expect(result[1]).toMatchObject({ x: 150, y: 250 })
  })
})

describe('getClickBehavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves with empty array when no clicks occur', async () => {
    const promise = getClickBehavior()
    vi.advanceTimersByTime(500)
    const result = await promise
    expect(result).toEqual([])
  })

  it('captures click events', async () => {
    const promise = getClickBehavior()

    document.dispatchEvent(
      new MouseEvent('click', { clientX: 50, clientY: 75, bubbles: true }),
    )

    vi.advanceTimersByTime(500)
    const result = await promise

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ x: 50, y: 75 })
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
    const promise = getScrollBehavior()
    vi.advanceTimersByTime(500)
    const result = await promise
    expect(result).toEqual([])
  })
})
