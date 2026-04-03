import { State } from '../types'
import { BotdError } from '../utils'

export function getWebGlFingerprint() {
  if (typeof document === 'undefined') {
    throw new BotdError(State.Undefined, 'document is not available')
  }

  const canvas = document.createElement('canvas')
  if (typeof canvas.getContext !== 'function') {
    throw new BotdError(State.NotFunction, 'canvas.getContext is not a function')
  }

  const gl = canvas.getContext('webgl')
  if (!gl) {
    throw new BotdError(State.Null, 'WebGLRenderingContext is null')
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  const unmaskedVendor = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
    : null
  const unmaskedRenderer = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : null

  const extensions = gl.getSupportedExtensions() ?? []

  const params: Record<string, unknown> = {}
  const paramIds: number[] = [
    gl.MAX_TEXTURE_SIZE,
    gl.MAX_RENDERBUFFER_SIZE,
    gl.MAX_VIEWPORT_DIMS,
    gl.MAX_VERTEX_ATTRIBS,
    gl.MAX_VERTEX_UNIFORM_VECTORS,
    gl.MAX_VARYING_VECTORS,
    gl.MAX_FRAGMENT_UNIFORM_VECTORS,
    gl.MAX_TEXTURE_IMAGE_UNITS,
    gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS,
    gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS,
    gl.ALIASED_LINE_WIDTH_RANGE,
    gl.ALIASED_POINT_SIZE_RANGE,
  ]

  for (const id of paramIds) {
    try {
      const val = gl.getParameter(id)
      if (val instanceof Float32Array || val instanceof Int32Array) {
        params[String(id)] = Array.from(val)
      } else {
        params[String(id)] = val
      }
    } catch {
      params[String(id)] = null
    }
  }

  const shaderPrecision = getShaderPrecision(gl)

  return {
    unmaskedVendor,
    unmaskedRenderer,
    extensionCount: extensions.length,
    extensions: extensions.sort(),
    params,
    shaderPrecision,
  }
}

function getShaderPrecision(gl: WebGLRenderingContext) {
  const precisions: Record<string, Record<string, unknown>> = {}

  const shaderTypes = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER] as const
  const precisionTypes = [gl.LOW_FLOAT, gl.MEDIUM_FLOAT, gl.HIGH_FLOAT] as const

  for (const shaderType of shaderTypes) {
    const label = shaderType === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
    precisions[label] = {}
    for (const precType of precisionTypes) {
      try {
        const fmt = gl.getShaderPrecisionFormat(shaderType, precType)
        if (fmt) {
          precisions[label][String(precType)] = {
            rangeMin: fmt.rangeMin,
            rangeMax: fmt.rangeMax,
            precision: fmt.precision,
          }
        }
      } catch {
        precisions[label][String(precType)] = null
      }
    }
  }

  return precisions
}
