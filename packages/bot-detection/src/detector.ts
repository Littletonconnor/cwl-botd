import { collect, detect } from './api'
import { BehaviorTracker } from './behavioral'
import type { BehaviorTrackerOptions, BehaviorSnapshot } from './behavioral/tracker'
import { setBehaviorSnapshot } from './collectors/behavior_snapshot'
import { collectors } from './collectors'
import type { DetectionResult } from './detectors/types'
import type {
  BehaviorResult,
  BotDetectorInterface,
  CollectorDict,
  DetectOptions,
  LoadOptions,
} from './types'

export class BotDetector implements BotDetectorInterface {
  private collections: CollectorDict | undefined = undefined
  private detections: DetectionResult | undefined = undefined
  private scoringOptions: DetectOptions | undefined
  private behaviorTracker: BehaviorTracker | undefined
  private behaviorOptions: BehaviorTrackerOptions | undefined
  private monitoring: boolean

  constructor(options?: LoadOptions) {
    this.scoringOptions = options?.scoring
    this.behaviorOptions = options?.behavior
    this.monitoring = options?.monitoring ?? false
  }

  public async detect(options?: DetectOptions): Promise<DetectionResult> {
    if (this.collections === undefined) {
      await this.collect()
    }

    if (this.behaviorTracker?.isRunning()) {
      const snapshot = this.behaviorTracker.snapshot()
      setBehaviorSnapshot(snapshot)
      this.collections = await collect(collectors)
    }

    const opts = options ?? this.scoringOptions
    this.detections = detect(this.collections!, opts)
    return this.detections
  }

  public async collect(): Promise<CollectorDict> {
    this.collections = await collect(collectors)
    return this.collections
  }

  public getBehaviorScore(): BehaviorResult {
    if (!this.behaviorTracker) {
      return { bot: false, score: 0, reasons: [], duration: 0 }
    }

    const snapshot = this.behaviorTracker.snapshot()
    const signals = evaluateBehaviorSnapshot(snapshot)

    const totalScore =
      signals.length > 0
        ? signals.reduce((sum, s) => sum + s.score, 0) / signals.length
        : 0

    return {
      bot: totalScore >= 0.4,
      score: totalScore,
      reasons: signals.filter((s) => s.detected).map((s) => s.reason),
      duration: snapshot.duration,
    }
  }

  public startBehaviorTracking(): void {
    if (!this.behaviorTracker) {
      this.behaviorTracker = new BehaviorTracker(this.behaviorOptions)
    }
    this.behaviorTracker.start()
  }

  public stopBehaviorTracking(): void {
    this.behaviorTracker?.stop()
  }

  public getFingerprint(): string {
    if (!this.collections) {
      return ''
    }

    const stable = extractStableComponents(this.collections)
    return simpleHash(JSON.stringify(stable))
  }

  public destroy(): void {
    if (this.behaviorTracker) {
      this.behaviorTracker.reset()
      this.behaviorTracker = undefined
    }
    this.collections = undefined
    this.detections = undefined
  }

  public getCollections(): CollectorDict | undefined {
    return this.collections
  }

  public getDetections(): DetectionResult | undefined {
    return this.detections
  }

  public static isBot(result: DetectionResult): boolean {
    return result.bot
  }
}

interface BehaviorSignal {
  detected: boolean
  score: number
  reason: string
}

function evaluateBehaviorSnapshot(snapshot: BehaviorSnapshot): BehaviorSignal[] {
  const signals: BehaviorSignal[] = []

  if (snapshot.duration < 100) {
    return signals
  }

  const hasMouseMovement = snapshot.mouse.length > 0
  const hasClicks = snapshot.clicks.length > 0
  const hasKeyPresses = snapshot.keys.length > 0
  const hasScrolls = snapshot.scrolls.length > 0

  if (!hasMouseMovement && !hasClicks && !hasKeyPresses && !hasScrolls) {
    signals.push({
      detected: true,
      score: 0.6,
      reason: 'No user interaction detected during observation period',
    })
    return signals
  }

  if (hasMouseMovement) {
    const moves = snapshot.mouse
    let straightLineCount = 0
    for (let i = 2; i < moves.length; i++) {
      const dx1 = moves[i]!.x - moves[i - 1]!.x
      const dy1 = moves[i]!.y - moves[i - 1]!.y
      const dx2 = moves[i - 1]!.x - moves[i - 2]!.x
      const dy2 = moves[i - 1]!.y - moves[i - 2]!.y
      if (dx1 * dy2 === dy1 * dx2) straightLineCount++
    }
    const straightRatio = moves.length > 2 ? straightLineCount / (moves.length - 2) : 0
    if (straightRatio > 0.8) {
      signals.push({
        detected: true,
        score: 0.7,
        reason: 'Mouse movement follows overly straight paths',
      })
    }
  }

  if (hasClicks && !hasMouseMovement) {
    signals.push({
      detected: true,
      score: 0.8,
      reason: 'Clicks detected without preceding mouse movement',
    })
  }

  if (hasKeyPresses) {
    const keydowns = snapshot.keys.filter((k) => k.type === 'keydown')
    if (keydowns.length >= 3) {
      const intervals: number[] = []
      for (let i = 1; i < keydowns.length; i++) {
        intervals.push(keydowns[i]!.timestamp - keydowns[i - 1]!.timestamp)
      }
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0
      if (cv < 0.1) {
        signals.push({
          detected: true,
          score: 0.7,
          reason: 'Keyboard timing is suspiciously uniform',
        })
      }
    }
  }

  return signals
}

function extractStableComponents(collections: CollectorDict): Record<string, unknown> {
  const stable: Record<string, unknown> = {}
  const stableKeys = [
    'userAgent',
    'platform',
    'language',
    'timezone',
    'plugins',
    'canvasFingerprint',
    'webGlFingerprint',
    'audioFingerprint',
    'fontEnumeration',
    'dimension',
    'webGl',
  ]

  for (const key of stableKeys) {
    const component = (collections as Record<string, unknown>)[key]
    if (component && typeof component === 'object' && 'state' in component) {
      const c = component as { state: string; value?: unknown }
      if (c.state === 'Success' && c.value !== undefined) {
        stable[key] = c.value
      }
    }
  }

  return stable
}

function simpleHash(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return combined.toString(36)
}
