import type { CollectorDict } from '../../types'
import { State } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

interface EngineExpectation {
  acos: number
  acosh: number
  atanh: number
  expm1: number
  cosh: number
  sin: number
}

const V8_EXPECTED: EngineExpectation = {
  acos: 1.4473588658278522,
  acosh: 709.889355822726,
  atanh: 18.714973875118524,
  expm1: 1.718281828459045,
  cosh: 11.591953275521519,
  sin: 0.8178819121159085,
}

const SPIDERMONKEY_EXPECTED: EngineExpectation = {
  acos: 1.4473588658278522,
  acosh: 709.889355822726,
  atanh: 18.714973875118524,
  expm1: 1.718281828459045,
  cosh: 11.591953275521519,
  sin: 0.8178819121159085,
}

const TEST_VALUES = {
  acos: 0.123456789,
  acosh: 1e+308,
  atanh: 1e+308,
  expm1: 1,
  cosh: Math.PI,
  sin: 39.1,
}

function computeMathValues(): EngineExpectation {
  return {
    acos: Math.acos(TEST_VALUES.acos),
    acosh: Math.acosh(TEST_VALUES.acosh),
    atanh: Math.atanh(TEST_VALUES.atanh),
    expm1: Math.expm1(TEST_VALUES.expm1),
    cosh: Math.cosh(TEST_VALUES.cosh),
    sin: Math.sin(TEST_VALUES.sin),
  }
}

function detectEngineFromUA(ua: string): 'v8' | 'spidermonkey' | 'webkit' | 'unknown' {
  if (/Chrome|CriOS|Chromium|Edg|OPR|Brave/.test(ua)) return 'v8'
  if (/Firefox|FxiOS/.test(ua)) return 'spidermonkey'
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'webkit'
  return 'unknown'
}

const detector: Detector = {
  name: 'mathFingerprint',
  category: DetectorCategory.Inconsistency,
  detect(data: CollectorDict): Signal {
    if (typeof Math === 'undefined') {
      return { detected: false, score: 0, reason: 'mathFingerprint: Math not available' }
    }

    const uaComponent = data.userAgent
    if (uaComponent.state !== State.Success) {
      return { detected: false, score: 0, reason: 'mathFingerprint: UA unavailable' }
    }

    const engine = detectEngineFromUA(String(uaComponent.value))
    if (engine === 'unknown') {
      return { detected: false, score: 0, reason: 'mathFingerprint: unknown engine in UA' }
    }

    const computed = computeMathValues()
    const expected = engine === 'v8' ? V8_EXPECTED : SPIDERMONKEY_EXPECTED

    const mismatches: string[] = []
    const keys = Object.keys(expected) as (keyof EngineExpectation)[]

    for (const key of keys) {
      if (computed[key] !== expected[key] && isFinite(expected[key]) && isFinite(computed[key])) {
        mismatches.push(key)
      }
    }

    if (mismatches.length > 0) {
      return {
        detected: true,
        score: Math.min(0.4 + mismatches.length * 0.15, 0.8),
        reason: `Math function mismatch for claimed ${engine} engine: ${mismatches.join(', ')}`,
      }
    }

    return { detected: false, score: 0, reason: 'mathFingerprint: values consistent with claimed engine' }
  },
}

export default detector
