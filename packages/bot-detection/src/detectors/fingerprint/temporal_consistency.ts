import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const STORAGE_KEY = '__botd_fp_session'

interface StoredFingerprint {
  timestamp: number
  timezone: string
  platform: string
  languages: string
  hardwareConcurrency: number
}

function getStoredFingerprint(): StoredFingerprint | null {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return null
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as StoredFingerprint
  } catch {
    return null
  }
}

function storeFingerprint(fp: StoredFingerprint): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fp))
  } catch {
    // storage may be full or blocked
  }
}

function getCurrentFingerprint(): StoredFingerprint {
  const timezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : ''
  const platform = typeof navigator !== 'undefined' ? navigator.platform : ''
  const languages =
    typeof navigator !== 'undefined' ? (navigator.languages ?? []).join(',') : ''
  const hardwareConcurrency =
    typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? 0 : 0

  return {
    timestamp: Date.now(),
    timezone,
    platform,
    languages,
    hardwareConcurrency,
  }
}

const detector: Detector = {
  name: 'temporalConsistency',
  category: DetectorCategory.Inconsistency,
  detect(_data: CollectorDict): Signal {
    if (typeof window === 'undefined') {
      return { detected: false, score: 0, reason: 'temporalConsistency: not in browser' }
    }

    const anomalies: string[] = []

    const previous = getStoredFingerprint()
    const current = getCurrentFingerprint()

    if (previous) {
      if (previous.timezone !== current.timezone) {
        anomalies.push(
          `timezone changed mid-session: "${previous.timezone}" → "${current.timezone}"`,
        )
      }

      if (previous.platform !== current.platform) {
        anomalies.push(
          `platform changed mid-session: "${previous.platform}" → "${current.platform}"`,
        )
      }

      if (previous.hardwareConcurrency !== current.hardwareConcurrency) {
        anomalies.push(
          `hardwareConcurrency changed: ${previous.hardwareConcurrency} → ${current.hardwareConcurrency}`,
        )
      }

      if (previous.languages !== current.languages) {
        anomalies.push(
          `languages changed mid-session: "${previous.languages}" → "${current.languages}"`,
        )
      }
    }

    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      const t1 = performance.now()
      const d1 = Date.now()
      let spinCount = 0
      while (spinCount < 10000) spinCount++
      const t2 = performance.now()
      const d2 = Date.now()

      const perfDelta = t2 - t1
      const dateDelta = d2 - d1

      if (perfDelta > 0 && dateDelta > 0) {
        const drift = Math.abs(perfDelta - dateDelta)
        if (drift > 50) {
          anomalies.push(
            `clock drift between performance.now and Date.now: ${drift.toFixed(1)}ms`,
          )
        }
      }
    }

    storeFingerprint(current)

    if (anomalies.length > 0) {
      return {
        detected: true,
        score: Math.min(0.4 + anomalies.length * 0.25, 0.9),
        reason: `Temporal consistency violations: ${anomalies.join('; ')}`,
      }
    }

    return { detected: false, score: 0, reason: 'temporalConsistency: all checks passed' }
  },
}

export default detector
