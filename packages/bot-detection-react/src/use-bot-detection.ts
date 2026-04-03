import { useState, useEffect, useContext, useRef, useCallback } from 'react'
import {
  load,
  type BotDetector,
  type BotDetectionConfig,
  type DetectionResult,
  type DetectOptions,
} from '@cwl-botd/bot-detection'
import { BotDetectionContext } from './context'

export interface UseBotDetectionOptions extends BotDetectionConfig {
  detectOnLoad?: boolean
  detectOptions?: DetectOptions
}

export interface UseBotDetectionReturn {
  result: DetectionResult | null
  loading: boolean
  error: Error | null
  detector: BotDetector | null
  detect: (options?: DetectOptions) => Promise<DetectionResult | null>
}

export function useBotDetection(options?: UseBotDetectionOptions): UseBotDetectionReturn {
  const contextDetector = useContext(BotDetectionContext)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [detector, setDetector] = useState<BotDetector | null>(contextDetector)
  const detectorRef = useRef<BotDetector | null>(contextDetector)
  const ownsDetector = useRef(false)

  const { detectOnLoad = true, detectOptions, ...config } = options ?? {}

  useEffect(() => {
    if (contextDetector) {
      detectorRef.current = contextDetector
      setDetector(contextDetector)
      ownsDetector.current = false

      if (detectOnLoad) {
        setLoading(true)
        contextDetector
          .detect(detectOptions)
          .then(setResult)
          .catch((e: unknown) => setError(e instanceof Error ? e : new Error(String(e))))
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
      return
    }

    let destroyed = false

    load(config)
      .then(async (d) => {
        if (destroyed) {
          d.destroy()
          return
        }
        detectorRef.current = d
        ownsDetector.current = true
        setDetector(d)

        if (detectOnLoad) {
          const r = await d.detect(detectOptions)
          if (!destroyed) setResult(r)
        }
      })
      .catch((e: unknown) => {
        if (!destroyed) setError(e instanceof Error ? e : new Error(String(e)))
      })
      .finally(() => {
        if (!destroyed) setLoading(false)
      })

    return () => {
      destroyed = true
      if (ownsDetector.current) {
        detectorRef.current?.destroy()
      }
    }
  }, [contextDetector])

  const detect = useCallback(async (opts?: DetectOptions) => {
    const d = detectorRef.current
    if (!d) return null
    setLoading(true)
    try {
      const r = await d.detect(opts)
      setResult(r)
      setError(null)
      return r
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      setError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { result, loading, error, detector, detect }
}
