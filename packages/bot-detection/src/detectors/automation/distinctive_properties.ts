import type { CollectorDict } from '../../types'
import { BotKind, DetectorCategory, type BotKindValue, type Signal } from '../types'
import type { Detector } from '../types'

const DISTINCTIVE_PROPS: Array<{
  object: 'window' | 'navigator' | 'document'
  property: string
  botKind: BotKindValue
}> = [
  { object: 'window', property: 'callPhantom', botKind: BotKind.PhantomJS },
  { object: 'window', property: '_phantom', botKind: BotKind.PhantomJS },
  { object: 'window', property: '__nightmare', botKind: BotKind.Nightmare },
  { object: 'window', property: '__puppeteer_evaluation_script__', botKind: BotKind.Puppeteer },
  { object: 'window', property: '__playwright', botKind: BotKind.Playwright },
  { object: 'window', property: '__pw_manual', botKind: BotKind.Playwright },
  { object: 'window', property: 'callSelenium', botKind: BotKind.Selenium },
  { object: 'window', property: '_selenium', botKind: BotKind.Selenium },
  { object: 'window', property: '__selenium_unwrapped', botKind: BotKind.Selenium },
  { object: 'window', property: '__webdriver_evaluate', botKind: BotKind.Selenium },
  { object: 'window', property: '__driver_evaluate', botKind: BotKind.Selenium },
  { object: 'document', property: '__webdriver_script_fn', botKind: BotKind.Selenium },
  { object: 'document', property: '__selenium_evaluate', botKind: BotKind.Selenium },
]

function getGlobalObject(name: 'window' | 'navigator' | 'document'): Record<string, unknown> | undefined {
  if (name === 'window' && typeof window !== 'undefined') return window as unknown as Record<string, unknown>
  if (name === 'navigator' && typeof navigator !== 'undefined') return navigator as unknown as Record<string, unknown>
  if (name === 'document' && typeof document !== 'undefined') return document as unknown as Record<string, unknown>
  return undefined
}

const detector: Detector = {
  name: 'distinctiveProperties',
  category: DetectorCategory.Automation,
  detect(_data: CollectorDict): Signal {
    for (const { object, property, botKind } of DISTINCTIVE_PROPS) {
      const obj = getGlobalObject(object)
      if (obj && property in obj) {
        return {
          detected: true,
          score: 1.0,
          reason: `${object}.${property} exists, indicating ${botKind}`,
          botKind,
        }
      }
    }

    return { detected: false, score: 0, reason: 'distinctiveProperties: no bot properties found' }
  },
}

export default detector
