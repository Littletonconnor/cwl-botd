import { collectors } from './collectors'
import type { DetectionResult } from './detectors/types'
import type { ScoringOptions } from './detectors/scoring'
import type { BotDetectionConfig } from './config'

export const State = {
  Success: 'Success',
  Undefined: 'Undefined',
  NotFunction: 'NotFunction',
  Null: 'Null',
} as const

export type StateValue = (typeof State)[keyof typeof State]

export type Component<T> =
  | {
      state: typeof State.Success
      value: T
    }
  | {
      state: Exclude<StateValue, typeof State.Success>
      error: string
    }

export type DefaultCollectorDict = typeof collectors

export type SourceResponse<T> = T extends (...args: any[]) => any ? Awaited<ReturnType<T>> : T

export type AbstractSourceDict = Record<string, SourceResponse<any>>
export type AbstractCollectorDict = Record<string, SourceResponse<any>>

export type CollectorDict<T extends AbstractSourceDict = DefaultCollectorDict> = {
  [K in keyof T]: Component<SourceResponse<T[K]>>
}

export interface DetectOptions extends ScoringOptions {
  debug?: boolean
}

export type LoadOptions = BotDetectionConfig

export interface BehaviorResult {
  bot: boolean
  score: number
  reasons: string[]
  duration: number
}

export interface BotDetectorInterface {
  detect(options?: DetectOptions): Promise<DetectionResult>
  collect(): Promise<CollectorDict>
  getBehaviorScore(): BehaviorResult
  startBehaviorTracking(): void
  stopBehaviorTracking(): void
  getFingerprint(): string
  destroy(): void
  getCollections(): CollectorDict | undefined
  getDetections(): DetectionResult | undefined
}
