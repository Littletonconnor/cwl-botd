import type { CollectorDict } from '../types'

export const BotKind = {
  HeadlessChrome: 'HeadlessChrome',
  PhantomJS: 'PhantomJS',
  Nightmare: 'Nightmare',
  Selenium: 'Selenium',
  Electron: 'Electron',
  NodeJS: 'NodeJS',
  Rhino: 'Rhino',
  CouchJS: 'CouchJS',
  Sequentum: 'Sequentum',
  SlimerJS: 'SlimerJS',
  CefSharp: 'CefSharp',
  Puppeteer: 'Puppeteer',
  Playwright: 'Playwright',
  Unknown: 'Unknown',
} as const

export type BotKindValue = (typeof BotKind)[keyof typeof BotKind]

export const DetectorCategory = {
  Automation: 'automation',
  Inconsistency: 'inconsistency',
  Behavioral: 'behavioral',
} as const

export type DetectorCategoryValue =
  (typeof DetectorCategory)[keyof typeof DetectorCategory]

export interface Signal {
  detected: boolean
  score: number
  reason: string
  botKind?: BotKindValue
}

export interface Detector {
  name: string
  category: DetectorCategoryValue
  detect(data: CollectorDict): Signal
}

export interface DetectionResult {
  bot: boolean
  botKind: BotKindValue
  confidence: number
  reasons: string[]
  score: number
  signals: Signal[]
}
