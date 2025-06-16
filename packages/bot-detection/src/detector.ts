import { collect, detect } from './api';
import { collectors } from './collectors';
import { CollectorDict, DetectionDict } from './types';

/**
 * Class representing a bot detector.
 *
 * @class
 * @implements {BotDetectorInterface}
 */
export default class BotDetector {
  private collections: CollectorDict | undefined = undefined;
  private detections: DetectionDict | undefined = undefined;

  public detect() {
    if (this.collections === undefined) {
      throw new Error('BotDetector.detect must be called after BotDetector.collect');
    }

    this.detections = detect();
  }

  public async collect() {
    this.collections = await collect(collectors);
    return this.collections;
  }

  public getCollections() {
    return this.collections;
  }

  public getDetections() {
    return this.detections;
  }
}
