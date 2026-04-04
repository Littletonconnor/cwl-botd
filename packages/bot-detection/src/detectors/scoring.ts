import type { DebugLogger } from '../debug'
import { BotKind, type BotKindValue, type DetectionResult, type Signal } from './types'

const DEFAULT_WEIGHTS: Record<string, number> = {
  webdriver: 1.0,
  userAgent: 0.9,
  evalLength: 0.6,
  errorTrace: 0.8,
  distinctiveProperties: 1.0,
  documentElementKeys: 0.9,
  windowSize: 0.7,
  rtt: 0.6,
  notificationPermissions: 0.4,
  pluginsInconsistency: 0.7,
  pluginsArray: 0.6,
  languagesInconsistency: 0.7,
  mimeTypesConsistence: 0.5,
  productSub: 0.5,
  functionBind: 0.8,
  process: 0.8,
  appVersion: 0.7,
  webgl: 0.8,
  windowExternal: 0.9,
  evalEngineConsistency: 0.7,
  errorStackEngine: 0.8,
  nativeFunction: 0.7,
  performancePrecision: 0.3,
  clockSkew: 0.5,
  screenConsistency: 0.6,
  prototypeChain: 0.8,
  proxyDetection: 0.9,
  tostringInconsistency: 0.8,
  propertyDescriptor: 0.8,
  crossAttribute: 0.7,
  canvasFingerprint: 0.7,
  webglAdvanced: 0.8,
  audioFingerprint: 0.6,
  fontEnumeration: 0.5,
  mathFingerprint: 0.6,
  spatialConsistency: 0.8,
  temporalConsistency: 0.7,
  mouseMovement: 0.7,
  keyboardBehavior: 0.6,
  scrollBehavior: 0.5,
  interactionTiming: 0.6,
}

const DEFAULT_THRESHOLD = 0.4

export interface ScoringOptions {
  weights?: Record<string, number>
  threshold?: number
}

export function score(signals: Signal[], options?: ScoringOptions, debugLogger?: DebugLogger): DetectionResult {
  const weights = { ...DEFAULT_WEIGHTS, ...options?.weights }
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD

  const detectedSignals = signals.filter((s) => s.detected)
  const reasons = detectedSignals.map((s) => s.reason)

  let totalWeight = 0
  let weightedScore = 0

  for (const signal of detectedSignals) {
    const weight = weights[signal.reason.split(':')[0]!] ?? 0.5
    totalWeight += weight
    weightedScore += signal.score * weight
  }

  const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0

  const botKind = determineBotKind(detectedSignals)
  const confidence = computeConfidence(detectedSignals, normalizedScore)

  const result: DetectionResult = {
    bot: confidence >= threshold,
    botKind,
    confidence,
    reasons,
    score: normalizedScore,
    signals,
  }

  if (debugLogger) {
    debugLogger.setScoringResult({
      threshold,
      weights,
      normalizedScore,
      confidence,
      totalWeight,
      weightedScore,
      bot: result.bot,
      botKind: result.botKind,
    })
    debugLogger.log('score', 'scoring', `bot=${result.bot} confidence=${confidence.toFixed(3)} score=${normalizedScore.toFixed(3)}`, {
      detected: detectedSignals.length,
      total: signals.length,
    })
  }

  return result
}

function determineBotKind(detectedSignals: Signal[]): BotKindValue {
  const kindCounts = new Map<BotKindValue, number>()

  for (const signal of detectedSignals) {
    if (signal.botKind) {
      kindCounts.set(signal.botKind, (kindCounts.get(signal.botKind) ?? 0) + signal.score)
    }
  }

  if (kindCounts.size === 0) {
    return detectedSignals.length > 0 ? BotKind.Unknown : BotKind.Unknown
  }

  let bestKind = BotKind.Unknown as BotKindValue
  let bestScore = 0
  for (const [kind, score] of kindCounts) {
    if (score > bestScore) {
      bestScore = score
      bestKind = kind
    }
  }

  return bestKind
}

function computeConfidence(detectedSignals: Signal[], normalizedScore: number): number {
  if (detectedSignals.length === 0) return 0

  const hasDefinitiveSignal = detectedSignals.some((s) => s.score >= 1.0)
  if (hasDefinitiveSignal) return Math.min(normalizedScore + 0.3, 1.0)

  const hasStrongSignals = detectedSignals.filter((s) => s.score >= 0.7).length >= 2
  if (hasStrongSignals) return Math.min(normalizedScore + 0.2, 1.0)

  return normalizedScore
}
