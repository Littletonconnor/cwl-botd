import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Detector, type Signal } from '../types'

const ENGINE_EVAL_LENGTHS: Record<string, number[]> = {
  V8: [33],
  SpiderMonkey: [37],
  WebKit: [37],
  IE: [39],
}

function guessEngine(ua: string): string | null {
  if (/Chrome|Chromium|OPR|Edge/.test(ua)) return 'V8'
  if (/Firefox/.test(ua)) return 'SpiderMonkey'
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'WebKit'
  if (/Trident|MSIE/.test(ua)) return 'IE'
  return null
}

const detector: Detector = {
  name: 'evalEngineConsistency',
  category: DetectorCategory.Inconsistency,
  detect(data: CollectorDict): Signal {
    const uaComponent = data.userAgent
    if (uaComponent.state !== State.Success) {
      return { detected: false, score: 0, reason: 'evalEngineConsistency: UA unavailable' }
    }

    const engine = guessEngine(uaComponent.value)
    if (!engine) {
      return { detected: false, score: 0, reason: 'evalEngineConsistency: unknown engine' }
    }

    try {
      const length = eval.toString().length
      const expected = ENGINE_EVAL_LENGTHS[engine]
      if (expected && !expected.includes(length)) {
        return {
          detected: true,
          score: 0.7,
          reason: `eval.toString().length is ${length} but UA claims ${engine} (expected ${expected.join('|')})`,
        }
      }
      return { detected: false, score: 0, reason: 'evalEngineConsistency: engine matches eval length' }
    } catch {
      return { detected: false, score: 0, reason: 'evalEngineConsistency: unable to evaluate' }
    }
  },
}

export default detector
