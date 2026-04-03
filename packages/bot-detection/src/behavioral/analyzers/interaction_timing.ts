import type { BehaviorSnapshot } from '../tracker'

export interface InteractionTimingAnalysis {
  timeToFirstInteraction: number
  avgClickInterval: number
  clickIntervalVariance: number
  suspiciouslyFastClicks: number
  totalInteractions: number
}

export function analyzeInteractionTiming(
  snapshot: BehaviorSnapshot,
): InteractionTimingAnalysis {
  const result: InteractionTimingAnalysis = {
    timeToFirstInteraction: 0,
    avgClickInterval: 0,
    clickIntervalVariance: 0,
    suspiciouslyFastClicks: 0,
    totalInteractions: 0,
  }

  const allTimestamps: number[] = []

  for (const e of snapshot.mouse) allTimestamps.push(e.timestamp)
  for (const e of snapshot.clicks) allTimestamps.push(e.timestamp)
  for (const e of snapshot.keys) allTimestamps.push(e.timestamp)
  for (const e of snapshot.scrolls) allTimestamps.push(e.timestamp)

  result.totalInteractions = allTimestamps.length

  if (allTimestamps.length === 0 || snapshot.startedAt === 0) return result

  allTimestamps.sort((a, b) => a - b)
  result.timeToFirstInteraction = allTimestamps[0]! - snapshot.startedAt

  // Click timing analysis
  const clicks = snapshot.clicks
  if (clicks.length < 2) return result

  const intervals: number[] = []
  for (let i = 1; i < clicks.length; i++) {
    intervals.push(clicks[i]!.timestamp - clicks[i - 1]!.timestamp)
  }

  result.avgClickInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const mean = result.avgClickInterval
  result.clickIntervalVariance =
    intervals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / intervals.length

  // Clicks faster than 50ms apart are suspicious (human minimum ~100ms)
  const FAST_CLICK_THRESHOLD_MS = 50
  result.suspiciouslyFastClicks = intervals.filter(
    (i) => i < FAST_CLICK_THRESHOLD_MS,
  ).length

  return result
}
