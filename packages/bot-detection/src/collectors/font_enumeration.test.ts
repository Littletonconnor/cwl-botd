import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getFontEnumeration } from './font_enumeration'
import { State } from '../types'
import { BotdError } from '../utils'

function createMockSpan(widthFn: (fontFamily: string) => number) {
  let currentFontFamily = ''
  const style: Record<string, string> = {}

  return {
    style: new Proxy(style, {
      set(_target, prop: string, value: string) {
        if (prop === 'fontFamily') {
          currentFontFamily = value
        }
        _target[prop] = value
        return true
      },
    }),
    textContent: '',
    get offsetWidth() {
      return widthFn(currentFontFamily)
    },
  } as unknown as HTMLSpanElement
}

function fallbackWidth(fontFamily: string): number {
  if (fontFamily === 'monospace') return 100
  if (fontFamily === 'sans-serif') return 110
  if (fontFamily === 'serif') return 120
  if (fontFamily.includes('monospace')) return 100
  if (fontFamily.includes('sans-serif')) return 110
  if (fontFamily.includes('serif')) return 120
  return 100
}

describe('getFontEnumeration', () => {
  let appendChildSpy: ReturnType<typeof vi.spyOn>
  let removeChildSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node) => node)
    removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node) => node)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('detects fonts whose width differs from fallback', () => {
    const detected = new Set(['Arial', 'Georgia', 'Verdana'])
    const span = createMockSpan((ff) => {
      for (const font of detected) {
        if (ff.includes(`"${font}"`)) return 999
      }
      return fallbackWidth(ff)
    })
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    const result = getFontEnumeration()

    expect(result.fonts).toEqual(
      expect.arrayContaining(['Arial', 'Georgia', 'Verdana']),
    )
    expect(result.count).toBe(3)
    expect(result.blocked).toBe(false)
  })

  it('sets blocked to true when no fonts differ from fallback', () => {
    const span = createMockSpan(fallbackWidth)
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    const result = getFontEnumeration()

    expect(result.fonts).toEqual([])
    expect(result.count).toBe(0)
    expect(result.blocked).toBe(true)
  })

  it('detects all 24 test fonts when every font width differs', () => {
    let callIndex = 0
    const span = createMockSpan((ff) => {
      if (['monospace', 'sans-serif', 'serif'].includes(ff)) return 100
      return 200 + callIndex++
    })
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    const result = getFontEnumeration()

    expect(result.count).toBe(24)
    expect(result.blocked).toBe(false)
    expect(result.fonts).toContain('Arial')
    expect(result.fonts).toContain('Calibri')
    expect(result.fonts).toContain('Consolas')
    expect(result.fonts).toContain('Candara')
  })

  it('detects a font when only the monospace fallback width differs', () => {
    const span = createMockSpan((ff) => {
      if (ff.includes('"Consolas"') && ff.includes('monospace')) return 777
      return fallbackWidth(ff)
    })
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    const result = getFontEnumeration()

    expect(result.fonts).toContain('Consolas')
  })

  it('detects a font when only the sans-serif fallback width differs', () => {
    const span = createMockSpan((ff) => {
      if (ff.includes('"Calibri"') && ff.includes('sans-serif')) return 888
      return fallbackWidth(ff)
    })
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    const result = getFontEnumeration()

    expect(result.fonts).toContain('Calibri')
  })

  it('detects a font when only the serif fallback width differs', () => {
    const span = createMockSpan((ff) => {
      if (
        ff.includes('"Cambria"') &&
        ff.includes('serif') &&
        !ff.includes('sans-serif')
      ) {
        return 999
      }
      return fallbackWidth(ff)
    })
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    const result = getFontEnumeration()

    expect(result.fonts).toContain('Cambria')
    expect(result.fonts).toHaveLength(1)
  })

  it('creates a span element via document.createElement', () => {
    const span = createMockSpan(() => 100)
    const createSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(span)

    getFontEnumeration()

    expect(createSpy).toHaveBeenCalledWith('span')
  })

  it('positions the span offscreen with correct styles and test string', () => {
    const span = createMockSpan(() => 100)
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    getFontEnumeration()

    expect(span.style.position).toBe('absolute')
    expect(span.style.left).toBe('-9999px')
    expect(span.style.top).toBe('-9999px')
    expect(span.style.fontSize).toBe('72px')
    expect(span.style.lineHeight).toBe('normal')
    expect(span.textContent).toBe('mmmmmmmmmmlli')
  })

  it('appends and removes the span from document.body', () => {
    const span = createMockSpan(() => 100)
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    getFontEnumeration()

    expect(appendChildSpy).toHaveBeenCalledOnce()
    expect(appendChildSpy).toHaveBeenCalledWith(span)
    expect(removeChildSpy).toHaveBeenCalledOnce()
    expect(removeChildSpy).toHaveBeenCalledWith(span)
  })

  it('removes the span even when fonts are detected', () => {
    const span = createMockSpan((ff) => {
      if (ff.includes('"Arial"')) return 999
      return fallbackWidth(ff)
    })
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    getFontEnumeration()

    expect(removeChildSpy).toHaveBeenCalledOnce()
  })

  it('measures each fallback font individually before testing', () => {
    const measuredFallbacks: string[] = []
    const span = createMockSpan((ff) => {
      if (['monospace', 'sans-serif', 'serif'].includes(ff)) {
        measuredFallbacks.push(ff)
      }
      return fallbackWidth(ff)
    })
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    getFontEnumeration()

    expect(measuredFallbacks).toContain('monospace')
    expect(measuredFallbacks).toContain('sans-serif')
    expect(measuredFallbacks).toContain('serif')
  })

  it('throws BotdError with Undefined state when document is not available', () => {
    const originalDocument = globalThis.document
    Object.defineProperty(globalThis, 'document', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    try {
      expect(() => getFontEnumeration()).toThrow(BotdError)
      expect(() => getFontEnumeration()).toThrow('document is not available')
      try {
        getFontEnumeration()
      } catch (e) {
        expect((e as BotdError).state).toBe(State.Undefined)
      }
    } finally {
      Object.defineProperty(globalThis, 'document', {
        value: originalDocument,
        writable: true,
        configurable: true,
      })
    }
  })

  it('stops checking fallbacks for a font after the first mismatch', () => {
    const checkedFallbacks: string[] = []
    const span = createMockSpan((ff) => {
      if (['monospace', 'sans-serif', 'serif'].includes(ff)) {
        return fallbackWidth(ff)
      }
      if (ff.includes('"Arial"')) {
        if (ff.includes('monospace')) {
          checkedFallbacks.push('monospace')
          return 999
        }
        if (ff.includes('sans-serif')) {
          checkedFallbacks.push('sans-serif')
          return 999
        }
        if (ff.includes('serif')) {
          checkedFallbacks.push('serif')
          return 999
        }
      }
      return fallbackWidth(ff)
    })
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    const result = getFontEnumeration()

    expect(result.fonts).toContain('Arial')
    expect(checkedFallbacks.filter((f) => f === 'monospace')).toHaveLength(1)
  })

  it('uses quoted font names paired with each fallback in fontFamily', () => {
    const observedFontFamilies: string[] = []
    const span = createMockSpan((ff) => {
      if (!['monospace', 'sans-serif', 'serif'].includes(ff)) {
        observedFontFamilies.push(ff)
      }
      return fallbackWidth(ff)
    })
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    getFontEnumeration()

    for (const ff of observedFontFamilies) {
      expect(ff).toMatch(/^"[^"]+", (monospace|sans-serif|serif)$/)
    }
  })

  it('returns a result with fonts array, numeric count, and boolean blocked', () => {
    const span = createMockSpan(() => 100)
    vi.spyOn(document, 'createElement').mockReturnValue(span)

    const result = getFontEnumeration()

    expect(Array.isArray(result.fonts)).toBe(true)
    expect(typeof result.count).toBe('number')
    expect(typeof result.blocked).toBe('boolean')
    expect(result.count).toBe(result.fonts.length)
  })

  it('returns consistent results across multiple calls with same widths', () => {
    const detected = new Set(['Impact', 'Tahoma'])
    const makeSpan = () =>
      createMockSpan((ff) => {
        for (const font of detected) {
          if (ff.includes(`"${font}"`)) return 555
        }
        return fallbackWidth(ff)
      })

    vi.spyOn(document, 'createElement').mockReturnValueOnce(makeSpan())
    const result1 = getFontEnumeration()

    vi.spyOn(document, 'createElement').mockReturnValueOnce(makeSpan())
    const result2 = getFontEnumeration()

    expect(result1.fonts).toEqual(result2.fonts)
    expect(result1.count).toBe(result2.count)
  })
})
