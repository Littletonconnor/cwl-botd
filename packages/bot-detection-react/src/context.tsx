import { createContext } from 'react'
import type { BotDetector } from '@cwl-botd/bot-detection'

export const BotDetectionContext = createContext<BotDetector | null>(null)
