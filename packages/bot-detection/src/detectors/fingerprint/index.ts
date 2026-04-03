import type { Detector } from '../types'
import canvas from './canvas'
import webglAdvanced from './webgl_advanced'
import audio from './audio'
import font from './font'
import mathFingerprint from './math_fingerprint'
import spatialConsistency from './spatial_consistency'
import temporalConsistency from './temporal_consistency'

export const fingerprintDetectors: Detector[] = [
  canvas,
  webglAdvanced,
  audio,
  font,
  mathFingerprint,
  spatialConsistency,
  temporalConsistency,
]
