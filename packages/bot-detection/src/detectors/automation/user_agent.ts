import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { BotKind, DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const BOT_UA_PATTERNS: Array<{ pattern: RegExp; botKind: string }> = [
  { pattern: /HeadlessChrome/i, botKind: BotKind.HeadlessChrome },
  { pattern: /PhantomJS/i, botKind: BotKind.PhantomJS },
  { pattern: /Nightmare/i, botKind: BotKind.Nightmare },
  { pattern: /SlimerJS/i, botKind: BotKind.SlimerJS },
  { pattern: /Sequentum/i, botKind: BotKind.Sequentum },
  { pattern: /CefSharp/i, botKind: BotKind.CefSharp },
  { pattern: /Rhino/i, botKind: BotKind.Rhino },
  { pattern: /CouchJS/i, botKind: BotKind.CouchJS },
  { pattern: /Electron/i, botKind: BotKind.Electron },
]

const detector: Detector = {
  name: 'userAgent',
  category: DetectorCategory.Automation,
  detect(data: CollectorDict): Signal {
    const component = data.userAgent
    if (component.state !== State.Success) {
      return { detected: false, score: 0, reason: 'userAgent: collector unavailable' }
    }

    const ua = component.value
    for (const { pattern, botKind } of BOT_UA_PATTERNS) {
      if (pattern.test(ua)) {
        return {
          detected: true,
          score: 0.9,
          reason: `User agent contains "${pattern.source}" indicating ${botKind}`,
          botKind: botKind as Signal['botKind'],
        }
      }
    }

    return { detected: false, score: 0, reason: 'userAgent: no bot patterns found' }
  },
}

export default detector
