import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { BotKind, DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

// Virtual or software-emulated GPU patterns that indicate headless or
// automated environments. SwiftShader is Chrome's built-in software renderer —
// the default in headless Chrome and a well-known automation signal.
const VIRTUAL_GPU_PATTERNS = [
  'SwiftShader',
  'llvmpipe',
  'Mesa OffScreen',
  'Software Rasterizer',
  'Microsoft Basic Render Driver',
  'VirtualBox',
  'VMware',
  'Parallels',
  'QEMU',
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

    if (typeof unmaskedRenderer === 'string') {
      for (const pattern of VIRTUAL_GPU_PATTERNS) {
        if (unmaskedRenderer.includes(pattern)) {
          anomalies.push(`virtual GPU detected: "${pattern}"`)
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
