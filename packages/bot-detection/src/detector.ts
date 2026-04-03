import { collect, detect } from './api';
import { collectors } from './collectors';
import type { DetectionResult } from './detectors/types';
import type { ScoringOptions } from './detectors/scoring';
import type { CollectorDict, BotDetectorInterface } from './types';

export default class BotDetector implements BotDetectorInterface {
  private collections: CollectorDict | undefined = undefined;
  private detections: DetectionResult | undefined = undefined;

  public detect(options?: ScoringOptions): DetectionResult {
    if (this.collections === undefined) {
      throw new Error('BotDetector.detect must be called after BotDetector.collect');
    }

    this.detections = detect(this.collections, options);
    return this.detections;
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
