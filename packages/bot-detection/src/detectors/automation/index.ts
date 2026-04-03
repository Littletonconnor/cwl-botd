import type { Detector } from '../types'
import appVersion from './app_version'
import distinctiveProperties from './distinctive_properties'
import documentElementKeys from './document_element_keys'
import errorTrace from './error_trace'
import evalLength from './eval_length'
import functionBind from './function_bind'
import languagesInconsistency from './languages_inconsistency'
import mimeTypesConsistence from './mime_types_consistence'
import notificationPermissions from './notification_permissions'
import pluginsArray from './plugins_array'
import pluginsInconsistency from './plugins_inconsistency'
import processDetector from './process_detector'
import productSub from './product_sub'
import rtt from './rtt'
import userAgent from './user_agent'
import webdriver from './webdriver'
import webgl from './webgl'
import windowExternal from './window_external'
import windowSize from './window_size'

export const automationDetectors: Detector[] = [
  webdriver,
  userAgent,
  evalLength,
  errorTrace,
  distinctiveProperties,
  documentElementKeys,
  windowSize,
  rtt,
  notificationPermissions,
  pluginsInconsistency,
  pluginsArray,
  languagesInconsistency,
  mimeTypesConsistence,
  productSub,
  functionBind,
  processDetector,
  appVersion,
  webgl,
  windowExternal,
]
