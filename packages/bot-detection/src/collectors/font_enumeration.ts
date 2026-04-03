import { State } from '../types'
import { BotdError } from '../utils'

const TEST_FONTS = [
  'Arial',
  'Courier New',
  'Georgia',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'Helvetica',
  'Impact',
  'Comic Sans MS',
  'Lucida Console',
  'Palatino Linotype',
  'Tahoma',
  'Arial Black',
  'Lucida Sans Unicode',
  'Garamond',
  'MS Serif',
  'Bookman Old Style',
  'Century Gothic',
  'Cambria',
  'Calibri',
  'Segoe UI',
  'Consolas',
  'Franklin Gothic Medium',
  'Candara',
]

const FALLBACK_FONTS = ['monospace', 'sans-serif', 'serif'] as const
const TEST_STRING = 'mmmmmmmmmmlli'
const TEST_SIZE = '72px'

export function getFontEnumeration() {
  if (typeof document === 'undefined') {
    throw new BotdError(State.Undefined, 'document is not available')
  }

  const span = document.createElement('span')
  span.style.position = 'absolute'
  span.style.left = '-9999px'
  span.style.top = '-9999px'
  span.style.fontSize = TEST_SIZE
  span.style.lineHeight = 'normal'
  span.textContent = TEST_STRING
  document.body.appendChild(span)

  const fallbackWidths: Record<string, number> = {}
  for (const fallback of FALLBACK_FONTS) {
    span.style.fontFamily = fallback
    fallbackWidths[fallback] = span.offsetWidth
  }

  const detected: string[] = []
  let blocked = false

  for (const font of TEST_FONTS) {
    let isDetected = false
    for (const fallback of FALLBACK_FONTS) {
      span.style.fontFamily = `"${font}", ${fallback}`
      const width = span.offsetWidth
      if (width !== fallbackWidths[fallback]) {
        isDetected = true
        break
      }
    }
    if (isDetected) {
      detected.push(font)
    }
  }

  document.body.removeChild(span)

  if (detected.length === 0) {
    blocked = true
  }

  return {
    fonts: detected,
    count: detected.length,
    blocked,
  }
}
