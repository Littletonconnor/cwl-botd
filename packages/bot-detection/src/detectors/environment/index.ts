import type { Detector } from '../types'
import evalEngineConsistency from './eval_engine'
import errorStackEngine from './error_stack_engine'
import nativeFunction from './native_function'
import performancePrecision from './performance_precision'
import clockSkew from './clock_skew'
import screenConsistency from './screen_consistency'

export const environmentDetectors: Detector[] = [
  evalEngineConsistency,
  errorStackEngine,
  nativeFunction,
  performancePrecision,
  clockSkew,
  screenConsistency,
]
