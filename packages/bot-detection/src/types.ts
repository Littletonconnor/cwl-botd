import { collectors } from './collectors'
import type { DetectionResult } from './detectors/types'

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

export interface BotDetectorInterface {
  detect(): DetectionResult
  collect(): Promise<CollectorDict>
}
