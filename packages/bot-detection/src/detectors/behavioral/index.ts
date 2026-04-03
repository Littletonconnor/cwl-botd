import type { Detector } from '../types'
import mouseMovementDetector from './mouse_movement'
import keyboardDetector from './keyboard'
import scrollBehaviorDetector from './scroll_behavior'
import interactionTimingDetector from './interaction_timing'

export const behavioralDetectors: Detector[] = [
  mouseMovementDetector,
  keyboardDetector,
  scrollBehaviorDetector,
  interactionTimingDetector,
]
