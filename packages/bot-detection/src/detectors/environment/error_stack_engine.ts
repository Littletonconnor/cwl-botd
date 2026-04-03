import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

function detectStackEngine(): string | null {
  try {
    throw new Error('test')
  } catch (e) {
    const stack = (e as Error).stack ?? ''
    if (stack.includes('    at ')) return 'V8'
    if (stack.includes('@')) return 'SpiderMonkey'
    if (stack.includes('global code')) return 'WebKit'
    return null
  }
}

function expectedEngine(ua: string): string | null {
  if (/Chrome|Chromium|OPR|Edge/.test(ua)) return 'V8'
  if (/Firefox/.test(ua)) return 'SpiderMonkey'
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'WebKit'
  return null
}

const detector: Detector = {
  name: 'errorStackEngine',
  category: DetectorCategory.Inconsistency,
  detect(data: CollectorDict): Signal {
    const uaComponent = data.userAgent
    if (uaComponent.state !== State.Success) {
      return { detected: false, score: 0, reason: 'errorStackEngine: UA unavailable' }
    }

    const claimed = expectedEngine(uaComponent.value)
    if (!claimed) {
      return { detected: false, score: 0, reason: 'errorStackEngine: unknown claimed engine' }
    }

    const actual = detectStackEngine()
    if (!actual) {
      return { detected: false, score: 0, reason: 'errorStackEngine: could not determine stack engine' }
    }

    if (actual !== claimed) {
      return {
        detected: true,
        score: 0.8,
        reason: `Error stack format indicates ${actual} but UA claims ${claimed}`,
      }
    }

    return { detected: false, score: 0, reason: 'errorStackEngine: stack format matches claimed engine' }
  },
}

export default detector
