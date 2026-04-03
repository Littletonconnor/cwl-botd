import type { KeyEvent_ } from '../tracker'

export interface KeyboardAnalysis {
  avgKeyHoldDuration: number
  holdDurationVariance: number
  avgInterKeyDelay: number
  interKeyDelayVariance: number
  uniformTimingRatio: number
  totalKeyPresses: number
}

export function analyzeKeyboard(events: readonly KeyEvent_[]): KeyboardAnalysis {
  const result: KeyboardAnalysis = {
    avgKeyHoldDuration: 0,
    holdDurationVariance: 0,
    avgInterKeyDelay: 0,
    interKeyDelayVariance: 0,
    uniformTimingRatio: 0,
    totalKeyPresses: 0,
  }

  const keydowns = events.filter((e) => e.type === 'keydown')
  const keyups = events.filter((e) => e.type === 'keyup')

  // Compute hold durations by matching keydown/keyup pairs
  const holdDurations: number[] = []
  for (const down of keydowns) {
    const matchingUp = keyups.find(
      (up) => up.key === down.key && up.timestamp > down.timestamp,
    )
    if (matchingUp) {
      holdDurations.push(matchingUp.timestamp - down.timestamp)
    }
  }

  result.totalKeyPresses = keydowns.length

  if (holdDurations.length > 0) {
    result.avgKeyHoldDuration =
      holdDurations.reduce((a, b) => a + b, 0) / holdDurations.length
    const mean = result.avgKeyHoldDuration
    result.holdDurationVariance =
      holdDurations.reduce((acc, v) => acc + (v - mean) ** 2, 0) / holdDurations.length
  }

  // Inter-key delays (time between consecutive keydowns)
  const interKeyDelays: number[] = []
  for (let i = 1; i < keydowns.length; i++) {
    interKeyDelays.push(keydowns[i]!.timestamp - keydowns[i - 1]!.timestamp)
  }

  if (interKeyDelays.length > 0) {
    result.avgInterKeyDelay =
      interKeyDelays.reduce((a, b) => a + b, 0) / interKeyDelays.length
    const mean = result.avgInterKeyDelay
    result.interKeyDelayVariance =
      interKeyDelays.reduce((acc, v) => acc + (v - mean) ** 2, 0) / interKeyDelays.length

    // Uniform timing detection: what fraction of intervals are within 5ms of the mean
    const UNIFORM_THRESHOLD_MS = 5
    const uniformCount = interKeyDelays.filter(
      (d) => Math.abs(d - mean) < UNIFORM_THRESHOLD_MS,
    ).length
    result.uniformTimingRatio = uniformCount / interKeyDelays.length
  }

  return result
}
