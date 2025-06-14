export type ComponentDict = any
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
