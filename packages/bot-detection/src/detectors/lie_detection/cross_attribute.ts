import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

function isPlatformConsistentWithUA(platform: string, ua: string): boolean {
  const uaLower = ua.toLowerCase()
  const platLower = platform.toLowerCase()

  if (platLower.includes('win') && (uaLower.includes('windows') || uaLower.includes('win'))) return true
  if (platLower.includes('mac') && uaLower.includes('mac')) return true
  if (platLower.includes('linux') && (uaLower.includes('linux') || uaLower.includes('x11'))) return true
  if (platLower.includes('iphone') && uaLower.includes('iphone')) return true
  if (platLower.includes('android') && uaLower.includes('android')) return true
  if (platLower.includes('arm') && (uaLower.includes('android') || uaLower.includes('mobile'))) return true

  if (!platLower.includes('win') && !platLower.includes('mac') && !platLower.includes('linux') &&
      !platLower.includes('iphone') && !platLower.includes('android') && !platLower.includes('arm')) {
    return true
  }

  return false
}

const detector: Detector = {
  name: 'crossAttribute',
  category: DetectorCategory.Inconsistency,
  detect(data: CollectorDict): Signal {
    const uaComp = data.userAgent
    const platComp = data.platform

    if (uaComp.state !== State.Success || platComp.state !== State.Success) {
      return { detected: false, score: 0, reason: 'crossAttribute: collectors unavailable' }
    }

    const mismatches: string[] = []

    if (!isPlatformConsistentWithUA(platComp.value, uaComp.value)) {
      mismatches.push(`platform "${platComp.value}" inconsistent with UA "${uaComp.value.slice(0, 60)}"`)
    }

    const webGlComp = data.webGl
    if (webGlComp.state === State.Success) {
      const renderer = (webGlComp.value.renderer ?? '').toLowerCase()
      const platform = platComp.value.toLowerCase()

      if (renderer.includes('apple') && platform.includes('win')) {
        mismatches.push('WebGL renderer claims Apple GPU but platform is Windows')
      }
      if (renderer.includes('apple') && platform.includes('linux') && !platform.includes('iphone')) {
        mismatches.push('WebGL renderer claims Apple GPU but platform is Linux')
      }
    }

    if (mismatches.length > 0) {
      return {
        detected: true,
        score: 0.8,
        reason: `Cross-attribute inconsistency: ${mismatches.join('; ')}`,
      }
    }

    return { detected: false, score: 0, reason: 'crossAttribute: attributes appear consistent' }
  },
}

export default detector
