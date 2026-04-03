import { vi } from 'vitest'

interface MockWebGLContext {
  VENDOR: number
  RENDERER: number
  getParameter: (param: number) => string
}

interface MockCanvasElement {
  getContext: (type: string) => MockWebGLContext | null
}

function createMockWebGLContext(
  vendor = 'Google Inc. (NVIDIA)',
  renderer = 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Ti)',
): MockWebGLContext {
  const VENDOR = 0x1f00
  const RENDERER = 0x1f01
  return {
    VENDOR,
    RENDERER,
    getParameter(param: number) {
      if (param === VENDOR) return vendor
      if (param === RENDERER) return renderer
      return ''
    },
  }
}

function mockCreateElement(webglContext?: MockWebGLContext | null): void {
  const ctx = webglContext === undefined ? createMockWebGLContext() : webglContext
  const original = document.createElement.bind(document)

  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return { getContext: () => ctx } as unknown as HTMLCanvasElement
    }
    return original(tag)
  })
}

function mockWindowDimensions(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    writable: true,
    configurable: true,
  })
}

export { createMockWebGLContext, mockCreateElement, mockWindowDimensions }
export type { MockWebGLContext, MockCanvasElement }
