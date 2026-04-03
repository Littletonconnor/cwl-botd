import type { Detector } from '../types'
import prototypeChain from './prototype_chain'
import proxyDetection from './proxy_detection'
import tostringInconsistency from './tostring_inconsistency'
import propertyDescriptor from './property_descriptor'
import crossAttribute from './cross_attribute'

export const lieDetectors: Detector[] = [
  prototypeChain,
  proxyDetection,
  tostringInconsistency,
  propertyDescriptor,
  crossAttribute,
]
