import { State } from '../types'
import { BotdError } from '../utils'

export function getCanvasFingerprint() {
  if (typeof document === 'undefined') {
    throw new BotdError(State.Undefined, 'document is not available')
  }

  const canvas = document.createElement('canvas')
  if (typeof canvas.getContext !== 'function') {
    throw new BotdError(State.NotFunction, 'canvas.getContext is not a function')
  }

  canvas.width = 240
  canvas.height = 60

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new BotdError(State.Null, 'CanvasRenderingContext2D is null')
  }

  ctx.fillStyle = '#f60'
  ctx.fillRect(100, 1, 62, 20)

  ctx.fillStyle = '#069'
  ctx.font = '14px Arial'
  ctx.fillText('BotD canvas fp', 2, 15)

  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
  ctx.font = '18px Times New Roman'
  ctx.fillText('BotD canvas fp', 4, 45)

  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = 'rgb(255,0,255)'
  ctx.beginPath()
  ctx.arc(50, 50, 50, 0, Math.PI * 2, true)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = 'rgb(0,255,255)'
  ctx.beginPath()
  ctx.arc(100, 50, 50, 0, Math.PI * 2, true)
  ctx.closePath()
  ctx.fill()

  const gradient = ctx.createLinearGradient(0, 0, 240, 0)
  gradient.addColorStop(0, '#ff0000')
  gradient.addColorStop(0.5, '#00ff00')
  gradient.addColorStop(1, '#0000ff')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 55, 240, 5)

  let dataUrl: string
  try {
    dataUrl = canvas.toDataURL('image/png')
  } catch {
    throw new BotdError(State.Undefined, 'canvas.toDataURL blocked')
  }

  const toDataURLOverridden = isToDataURLOverridden(canvas)

  let isStable = true
  try {
    const dataUrl2 = canvas.toDataURL('image/png')
    isStable = dataUrl === dataUrl2
  } catch {
    isStable = false
  }

  return {
    hash: simpleHash(dataUrl),
    toDataURLOverridden,
    isStable,
    length: dataUrl.length,
  }
}

function isToDataURLOverridden(canvas: HTMLCanvasElement): boolean {
  try {
    const str = Function.prototype.toString.call(canvas.toDataURL)
    return !/\[native code\]/.test(str)
  } catch {
    return true
  }
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash
}
