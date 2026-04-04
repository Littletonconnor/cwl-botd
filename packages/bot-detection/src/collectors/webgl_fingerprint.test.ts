import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getWebGlFingerprint } from './webgl_fingerprint'
import { State } from '../types'
import { BotdError } from '../utils'

function createMockGLContext(overrides: Partial<WebGLRenderingContext> = {}) {
  const debugExtension = {
    UNMASKED_VENDOR_WEBGL: 0x9245,
    UNMASKED_RENDERER_WEBGL: 0x9246,
  }

  const paramMap: Record<number, unknown> = {
    [0x9245]: 'NVIDIA Corporation',
    [0x9246]: 'NVIDIA GeForce GTX 1080/PCIe/SSE2',
    [0x0d33]: 16384,
    [0x84e8]: 16384,
    [0x0d3a]: new Int32Array([32768, 32768]),
    [0x8869]: 16,
    [0x8dfa]: 4096,
    [0x8dfc]: 31,
    [0x8dfd]: 1024,
    [0x8872]: 32,
    [0x8b4c]: 16,
    [0x8b4d]: 80,
    [0x846e]: new Float32Array([1, 7680]),
    [0x8460]: new Float32Array([1, 1024]),
  }

  return {
    MAX_TEXTURE_SIZE: 0x0d33,
    MAX_RENDERBUFFER_SIZE: 0x84e8,
    MAX_VIEWPORT_DIMS: 0x0d3a,
    MAX_VERTEX_ATTRIBS: 0x8869,
    MAX_VERTEX_UNIFORM_VECTORS: 0x8dfa,
    MAX_VARYING_VECTORS: 0x8dfc,
    MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
    MAX_TEXTURE_IMAGE_UNITS: 0x8872,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
    ALIASED_LINE_WIDTH_RANGE: 0x846e,
    ALIASED_POINT_SIZE_RANGE: 0x8460,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    LOW_FLOAT: 0x8df0,
    MEDIUM_FLOAT: 0x8df1,
    HIGH_FLOAT: 0x8df2,
    getExtension: vi.fn((name: string) => {
      if (name === 'WEBGL_debug_renderer_info') return debugExtension
      return null
    }),
    getParameter: vi.fn((id: number) => paramMap[id] ?? null),
    getSupportedExtensions: vi.fn(() => [
      'WEBGL_debug_renderer_info',
      'OES_texture_float',
      'EXT_blend_minmax',
    ]),
    getShaderPrecisionFormat: vi.fn(() => ({
      rangeMin: 127,
      rangeMax: 127,
      precision: 23,
    })),
    ...overrides,
  } as unknown as WebGLRenderingContext
}

describe('getWebGlFingerprint', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createElementSpy = vi.spyOn(document, 'createElement')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a full fingerprint with all fields populated', () => {
    const mockGl = createMockGLContext()
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    const result = getWebGlFingerprint()

    expect(result.unmaskedVendor).toBe('NVIDIA Corporation')
    expect(result.unmaskedRenderer).toBe(
      'NVIDIA GeForce GTX 1080/PCIe/SSE2'
    )
    expect(result.extensionCount).toBe(3)
    expect(result.extensions).toEqual([
      'EXT_blend_minmax',
      'OES_texture_float',
      'WEBGL_debug_renderer_info',
    ])
    expect(result.shaderPrecision).toBeDefined()
    expect(Object.keys(result.params).length).toBeGreaterThan(0)
  })

  it('creates a canvas element and requests webgl context', () => {
    const mockGl = createMockGLContext()
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    getWebGlFingerprint()

    expect(createElementSpy).toHaveBeenCalledWith('canvas')
    expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl')
  })

  it('queries WEBGL_debug_renderer_info extension', () => {
    const mockGl = createMockGLContext()
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    getWebGlFingerprint()

    expect(mockGl.getExtension).toHaveBeenCalledWith(
      'WEBGL_debug_renderer_info'
    )
  })

  it('returns null vendor/renderer when debug extension is unavailable', () => {
    const mockGl = createMockGLContext({
      getExtension: vi.fn(() => null),
    } as any)
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    const result = getWebGlFingerprint()

    expect(result.unmaskedVendor).toBeNull()
    expect(result.unmaskedRenderer).toBeNull()
  })

  it('calls getParameter for each probed WebGL constant', () => {
    const mockGl = createMockGLContext()
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    getWebGlFingerprint()

    const getParamCalls = (mockGl.getParameter as ReturnType<typeof vi.fn>)
      .mock.calls
    const calledIds = getParamCalls.map((c: unknown[]) => c[0])

    expect(calledIds).toContain(mockGl.MAX_TEXTURE_SIZE)
    expect(calledIds).toContain(mockGl.MAX_RENDERBUFFER_SIZE)
    expect(calledIds).toContain(mockGl.MAX_VIEWPORT_DIMS)
    expect(calledIds).toContain(mockGl.MAX_VERTEX_ATTRIBS)
    expect(calledIds).toContain(mockGl.ALIASED_LINE_WIDTH_RANGE)
    expect(calledIds).toContain(mockGl.ALIASED_POINT_SIZE_RANGE)
  })

  it('converts Float32Array and Int32Array params to regular arrays', () => {
    const mockGl = createMockGLContext()
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    const result = getWebGlFingerprint()

    const viewportKey = String(mockGl.MAX_VIEWPORT_DIMS)
    expect(Array.isArray(result.params[viewportKey])).toBe(true)
    expect(result.params[viewportKey]).toEqual([32768, 32768])

    const lineWidthKey = String(mockGl.ALIASED_LINE_WIDTH_RANGE)
    expect(Array.isArray(result.params[lineWidthKey])).toBe(true)
    expect(result.params[lineWidthKey]).toEqual([1, 7680])
  })

  it('stores scalar params directly', () => {
    const mockGl = createMockGLContext()
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    const result = getWebGlFingerprint()

    const texSizeKey = String(mockGl.MAX_TEXTURE_SIZE)
    expect(result.params[texSizeKey]).toBe(16384)
  })

  it('catches getParameter errors and stores null', () => {
    let callCount = 0
    const mockGl = createMockGLContext({
      getParameter: vi.fn(() => {
        callCount++
        if (callCount <= 2) return null
        throw new Error('GL error')
      }),
    } as any)
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    const result = getWebGlFingerprint()

    for (const value of Object.values(result.params)) {
      expect(value).toBeNull()
    }
  })

  it('collects shader precision for vertex and fragment shaders', () => {
    const mockGl = createMockGLContext()
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    const result = getWebGlFingerprint()

    expect(result.shaderPrecision).toHaveProperty('vertex')
    expect(result.shaderPrecision).toHaveProperty('fragment')
    const vertexPrecision = result.shaderPrecision['vertex'] as Record<
      string,
      unknown
    >
    expect(vertexPrecision[String(mockGl.LOW_FLOAT)]).toEqual({
      rangeMin: 127,
      rangeMax: 127,
      precision: 23,
    })
  })

  it('handles getShaderPrecisionFormat returning null', () => {
    const mockGl = createMockGLContext({
      getShaderPrecisionFormat: vi.fn(() => null),
    } as any)
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    const result = getWebGlFingerprint()

    expect(result.shaderPrecision).toHaveProperty('vertex')
    expect(result.shaderPrecision).toHaveProperty('fragment')
    const vertexPrecision = result.shaderPrecision['vertex'] as Record<
      string,
      unknown
    >
    expect(Object.keys(vertexPrecision)).toHaveLength(0)
  })

  it('handles getShaderPrecisionFormat throwing', () => {
    const mockGl = createMockGLContext({
      getShaderPrecisionFormat: vi.fn(() => {
        throw new Error('not supported')
      }),
    } as any)
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    const result = getWebGlFingerprint()

    const vertexPrecision = result.shaderPrecision['vertex'] as Record<
      string,
      unknown
    >
    for (const val of Object.values(vertexPrecision)) {
      expect(val).toBeNull()
    }
  })

  it('handles getSupportedExtensions returning null', () => {
    const mockGl = createMockGLContext({
      getSupportedExtensions: vi.fn(() => null),
    } as any)
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    const result = getWebGlFingerprint()

    expect(result.extensions).toEqual([])
    expect(result.extensionCount).toBe(0)
  })

  it('sorts extensions alphabetically', () => {
    const mockGl = createMockGLContext({
      getSupportedExtensions: vi.fn(() => ['Z_ext', 'A_ext', 'M_ext']),
    } as any)
    const mockCanvas = {
      getContext: vi.fn(() => mockGl),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    const result = getWebGlFingerprint()

    expect(result.extensions).toEqual(['A_ext', 'M_ext', 'Z_ext'])
  })

  it('throws BotdError when WebGL context is null', () => {
    const mockCanvas = {
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    expect(() => getWebGlFingerprint()).toThrow(BotdError)
    try {
      getWebGlFingerprint()
    } catch (e) {
      expect((e as BotdError).state).toBe(State.Null)
    }
  })

  it('throws BotdError when getContext is not a function', () => {
    const mockCanvas = { getContext: undefined } as unknown as HTMLCanvasElement
    createElementSpy.mockReturnValue(mockCanvas)

    expect(() => getWebGlFingerprint()).toThrow(BotdError)
    try {
      getWebGlFingerprint()
    } catch (e) {
      expect((e as BotdError).state).toBe(State.NotFunction)
    }
  })

  it('throws BotdError when document is undefined', () => {
    const originalDocument = globalThis.document
    Object.defineProperty(globalThis, 'document', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    try {
      expect(() => getWebGlFingerprint()).toThrow(BotdError)
      try {
        getWebGlFingerprint()
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
})
