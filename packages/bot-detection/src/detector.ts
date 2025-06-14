import { collect, detect } from './api'
import { collectors } from './collectors'
import { CollectorDict, DetectionDict } from './types'

/**
 * Class representing a bot detector.
 *
 * @class
 * @implements {BotDetectorInterface}
 */
export default class BotDetector {
  protected components: CollectorDict | undefined = undefined
  protected detections: DetectionDict | undefined = undefined

  public detect() {
    if (this.components === undefined) {
      throw new Error('BotDetector.detect must be called after BotDetector.collect')
    }

    this.detections = detect()
  }

  public async collect() {
    this.components = await collect(collectors)
    return this.components
  }
}
