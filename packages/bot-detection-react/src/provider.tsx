import { useState, useEffect, type ReactNode } from 'react'
import { load, type BotDetectionConfig, type BotDetector } from '@cwl-botd/bot-detection'
import { BotDetectionContext } from './context'

export interface BotDetectionProviderProps {
  children: ReactNode
  config?: BotDetectionConfig
}

export function BotDetectionProvider({ children, config }: BotDetectionProviderProps) {
  const [detector, setDetector] = useState<BotDetector | null>(null)

  useEffect(() => {
    let destroyed = false
    let instance: BotDetector | undefined

    load(config).then((d) => {
      if (destroyed) {
        d.destroy()
        return
      }
      instance = d
      setDetector(d)
    })

    return () => {
      destroyed = true
      instance?.destroy()
    }
  }, [])

  return (
    <BotDetectionContext.Provider value={detector}>
      {children}
    </BotDetectionContext.Provider>
  )
}
