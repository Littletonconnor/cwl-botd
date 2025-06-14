import { collectors } from './collectors'
import { detectors } from './detectors'

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
      state: StateValue
      error: string
    }

export type DefaultCollectorDict = typeof collectors

export type DefaultDetectorDict = typeof detectors

export type SourceResponse<T> = T extends (...args: any[]) => any ? Awaited<ReturnType<T>> : T

export type AbstractSourceDict = Record<string, SourceResponse<any>>
export type AbstractCollectorDict = Record<string, SourceResponse<any>>

export type CollectorDict<T extends AbstractSourceDict = DefaultCollectorDict> = {
  [K in keyof T]: Component<SourceResponse<T[K]>>
}

export type DetectionDict = any

export interface BotDetectorInterface {
  /**
   * Performs bot detection. Must be called after collect()
   */
  detect(): any

  /**
   * Collects data from sources.
   */
  collect(): any
}
