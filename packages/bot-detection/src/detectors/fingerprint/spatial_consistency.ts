import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const TIMEZONE_LANGUAGE_MAP: Record<string, string[]> = {
  'America/': ['en', 'es', 'fr', 'pt'],
  'Europe/': ['en', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'pl', 'ru', 'cs', 'sv', 'da', 'fi', 'no', 'hu', 'ro', 'bg', 'hr', 'sk', 'sl', 'et', 'lv', 'lt', 'el', 'uk', 'tr'],
  'Asia/': ['zh', 'ja', 'ko', 'hi', 'ar', 'th', 'vi', 'id', 'ms', 'he', 'fa', 'bn', 'ta', 'ur', 'en', 'ru', 'tr'],
  'Africa/': ['en', 'fr', 'ar', 'pt', 'sw', 'am'],
  'Australia/': ['en'],
  'Pacific/': ['en', 'fr'],
}

const PLATFORM_UA_MAP: Record<string, RegExp[]> = {
  Win32: [/Windows/, /Win64/],
  'Win64': [/Windows/, /Win64/, /WOW64/],
  MacIntel: [/Macintosh/, /Mac OS X/],
  Linux: [/Linux/, /X11/],
  'Linux x86_64': [/Linux/, /X11/],
  'Linux armv7l': [/Linux/, /Android/],
  'Linux aarch64': [/Linux/, /Android/],
}

const TOUCH_PLATFORMS = ['Linux armv7l', 'Linux aarch64', 'iPhone', 'iPad', 'iPod']

const detector: Detector = {
  name: 'spatialConsistency',
  category: DetectorCategory.Inconsistency,
  detect(data: CollectorDict): Signal {
    const anomalies: string[] = []

    const platformResult = data.platform
    const uaResult = data.userAgent
    if (platformResult.state === State.Success && uaResult.state === State.Success) {
      const platform = String(platformResult.value)
      const ua = String(uaResult.value)
      const patterns = PLATFORM_UA_MAP[platform]
      if (patterns && !patterns.some((p) => p.test(ua))) {
        anomalies.push(`platform "${platform}" inconsistent with UA "${ua.slice(0, 80)}"`)
      }
    }

    const tzResult = data.timezone
    const langResult = data.language
    if (tzResult.state === State.Success && langResult.state === State.Success) {
      const tzData = tzResult.value as { timezone: string }
      const langData = langResult.value as [string[], string[]]
      const tz = tzData.timezone
      const primaryLang = langData[0]?.[0]?.split('-')[0] ?? ''

      if (tz && primaryLang) {
        const regionKey = Object.keys(TIMEZONE_LANGUAGE_MAP).find((prefix) =>
          tz.startsWith(prefix),
        )
        if (regionKey) {
          const expectedLangs = TIMEZONE_LANGUAGE_MAP[regionKey]!
          if (!expectedLangs.includes(primaryLang)) {
            anomalies.push(
              `timezone "${tz}" geographically inconsistent with language "${primaryLang}"`,
            )
          }
        }
      }
    }

    if (platformResult.state === State.Success && typeof window !== 'undefined') {
      const platform = String(platformResult.value)
      const isTouchPlatform = TOUCH_PLATFORMS.some((p) => platform.includes(p))
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      if (isTouchPlatform && !hasTouch) {
        anomalies.push(`platform "${platform}" claims touch support but no touch API found`)
      }
    }

    const dimResult = data.dimension
    if (dimResult.state === State.Success && typeof window !== 'undefined') {
      const dim = dimResult.value as { width: number; height: number }
      const pixelRatio = window.devicePixelRatio ?? 1
      if (pixelRatio <= 0 || pixelRatio > 10) {
        anomalies.push(`unusual devicePixelRatio: ${pixelRatio}`)
      }
      if (typeof window.screen !== 'undefined') {
        const colorDepth = window.screen.colorDepth
        if (colorDepth !== 24 && colorDepth !== 32 && colorDepth !== 30 && colorDepth !== 48) {
          anomalies.push(`unusual color depth: ${colorDepth}`)
        }
      }
    }

    if (
      platformResult.state === State.Success &&
      typeof navigator !== 'undefined' &&
      'userAgentData' in navigator
    ) {
      const uad = (navigator as { userAgentData?: { platform?: string } }).userAgentData
      if (uad?.platform) {
        const platform = String(platformResult.value)
        const uadPlatform = uad.platform
        const platformNorm = platform.toLowerCase().replace(/\d+/g, '')
        const uadNorm = uadPlatform.toLowerCase().replace(/\d+/g, '')
        if (
          platformNorm.startsWith('win') !== uadNorm.startsWith('win') &&
          platformNorm.startsWith('mac') !== uadNorm.startsWith('mac') &&
          platformNorm.startsWith('linux') !== uadNorm.startsWith('linux')
        ) {
          anomalies.push(
            `navigator.platform "${platform}" vs userAgentData.platform "${uadPlatform}"`,
          )
        }
      }
    }

    if (anomalies.length > 0) {
      return {
        detected: true,
        score: Math.min(0.4 + anomalies.length * 0.2, 1.0),
        reason: `Spatial consistency violations: ${anomalies.join('; ')}`,
      }
    }

    return { detected: false, score: 0, reason: 'spatialConsistency: all checks passed' }
  },
}

export default detector
