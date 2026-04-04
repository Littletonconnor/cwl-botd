import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { BotKind, DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

// SwiftShader is Chrome's built-in software renderer used as a fallback on
// machines without GPU acceleration (Macs, remote desktops, some CI). It is
// NOT a strong headless indicator on its own — real users hit it regularly.
// Only flag clearly virtual/emulated GPUs.
const VIRTUAL_GPU_PATTERNS = [
  'llvmpipe',
  'Mesa OffScreen',
  'Software Rasterizer',
  'Microsoft Basic Render Driver',
  'VirtualBox',
  'VMware',
  'Parallels',
  'QEMU',
]

// Lower-confidence patterns — software renderers that real browsers can use
const SOFT_GPU_PATTERNS = [
  'SwiftShader',
]

const GPU_OS_EXPECTATIONS: Record<string, RegExp[]> = {
  Win: [/ANGLE/, /Direct3D/, /NVIDIA/, /AMD/, /Intel/, /Radeon/],
  Mac: [/Apple/, /ANGLE/, /Intel/, /AMD/],
  Linux: [/Mesa/, /ANGLE/, /NVIDIA/, /AMD/, /Intel/, /llvmpipe/],
}

const detector: Detector = {
  name: 'webglAdvanced',
  category: DetectorCategory.Inconsistency,
  detect(data: CollectorDict): Signal {
    const component = data.webGlFingerprint
    if (component.state !== State.Success) {
      return { detected: false, score: 0, reason: 'webglAdvanced: collector unavailable' }
    }

    const { unmaskedRenderer, unmaskedVendor, extensionCount } = component.value
    const anomalies: string[] = []

    let isSoftGpu = false
    if (typeof unmaskedRenderer === 'string') {
      for (const pattern of VIRTUAL_GPU_PATTERNS) {
        if (unmaskedRenderer.includes(pattern)) {
          anomalies.push(`virtual GPU detected: "${pattern}"`)
        }
      }
      for (const pattern of SOFT_GPU_PATTERNS) {
        if (unmaskedRenderer.includes(pattern)) {
          isSoftGpu = true
        }
      }
    }

    if (unmaskedRenderer === null && unmaskedVendor === null) {
      anomalies.push('WEBGL_debug_renderer_info unavailable (may indicate headless)')
    }

    if (extensionCount === 0) {
      anomalies.push('zero WebGL extensions reported')
    }

    if (typeof unmaskedRenderer === 'string') {
      const platformComponent = data.platform
      if (platformComponent.state === State.Success) {
        const platform = String(platformComponent.value)
        const mismatch = checkGpuOsMismatch(platform, unmaskedRenderer)
        if (mismatch) {
          anomalies.push(mismatch)
        }
      }
    }

    if (anomalies.length > 0) {
      const hasVirtualGpu = anomalies.some((a) => a.includes('virtual GPU'))
      return {
        detected: true,
        score: Math.min(0.5 + anomalies.length * 0.2, 1.0),
        reason: `WebGL advanced anomalies: ${anomalies.join('; ')}`,
        botKind: hasVirtualGpu ? BotKind.HeadlessChrome : undefined,
      }
    }

    // Soft GPU (SwiftShader) alone is not enough to flag — only report as a
    // weak signal without claiming a specific bot kind
    if (isSoftGpu) {
      return {
        detected: false,
        score: 0.15,
        reason: 'WebGL: software renderer (SwiftShader) — common fallback, not flagged',
      }
    }

    return { detected: false, score: 0, reason: 'webglAdvanced: no anomalies detected' }
  },
}

function checkGpuOsMismatch(platform: string, renderer: string): string | null {
  if (platform.startsWith('Win') && /Apple GPU/.test(renderer)) {
    return `GPU "${renderer}" inconsistent with platform "${platform}"`
  }
  if (platform.startsWith('Mac') && /Direct3D/.test(renderer)) {
    return `GPU "${renderer}" inconsistent with platform "${platform}"`
  }
  return null
}

export default detector
