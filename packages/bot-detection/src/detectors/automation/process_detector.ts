import type { CollectorDict } from '../../types'
import { BotKind, DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

declare const process: { type?: string; versions?: { electron?: string } } | undefined

const detector: Detector = {
  name: 'process',
  category: DetectorCategory.Automation,
  detect(_data: CollectorDict): Signal {
    if (typeof process !== 'undefined' && process !== null) {
      if (process.type === 'renderer') {
        return {
          detected: true,
          score: 0.8,
          reason: 'process.type is "renderer", indicating Electron environment',
          botKind: BotKind.Electron,
        }
      }

      if (process.versions?.electron) {
        return {
          detected: true,
          score: 0.8,
          reason: 'process.versions.electron exists, indicating Electron',
          botKind: BotKind.Electron,
        }
      }
    }

    return { detected: false, score: 0, reason: 'process: no process object in browser' }
  },
}

export default detector
