import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const OS_FONT_EXPECTATIONS: Record<string, string[]> = {
  Win: ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Segoe UI'],
  Mac: ['Arial', 'Times New Roman', 'Courier New', 'Helvetica', 'Georgia'],
  Linux: ['Arial', 'Courier New'],
}

const detector: Detector = {
  name: 'fontEnumeration',
  category: DetectorCategory.Inconsistency,
  detect(data: CollectorDict): Signal {
    const component = data.fontEnumeration
    if (component.state !== State.Success) {
      return { detected: false, score: 0, reason: 'fontEnumeration: collector unavailable' }
    }

    const { fonts, count, blocked } = component.value
    const anomalies: string[] = []

    if (blocked) {
      anomalies.push('font enumeration appears blocked (zero fonts detected)')
    }

    const uaComponent = data.userAgent
    const isMobile = uaComponent.state === State.Success &&
      /Mobile|Android|iPhone|iPad/i.test(String(uaComponent.value))

    if (!blocked && !isMobile) {
      const platformComponent = data.platform
      if (platformComponent.state === State.Success) {
        const platform = String(platformComponent.value)
        const osKey = Object.keys(OS_FONT_EXPECTATIONS).find((k) => platform.startsWith(k))
        if (osKey) {
          const expected = OS_FONT_EXPECTATIONS[osKey]!
          const missing = expected.filter((f) => !fonts.includes(f))
          if (missing.length > expected.length / 2) {
            anomalies.push(
              `${missing.length}/${expected.length} expected fonts missing for ${osKey}: ${missing.join(', ')}`,
            )
          }
        }
      }
    }
    const minFontCount = isMobile ? 1 : 3

    if (count > 0 && count < minFontCount) {
      anomalies.push(`suspiciously low font count: ${count}`)
    }

    if (anomalies.length > 0) {
      return {
        detected: true,
        score: Math.min(0.3 + anomalies.length * 0.2, 0.7),
        reason: `Font enumeration anomalies: ${anomalies.join('; ')}`,
      }
    }

    return { detected: false, score: 0, reason: 'fontEnumeration: no anomalies detected' }
  },
}

export default detector
