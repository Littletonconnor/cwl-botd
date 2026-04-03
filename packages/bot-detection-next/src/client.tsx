'use client'

import { useEffect, useRef } from 'react'
import { useBotDetection, type UseBotDetectionOptions } from '@cwl-botd/bot-detection-react'
import type { DetectionResult } from '@cwl-botd/bot-detection'

export interface UseNextBotDetectionOptions extends UseBotDetectionOptions {
  cookieName?: string
  syncToServer?: boolean
}

const DEFAULT_COOKIE = 'botd-result'

function setCookie(name: string, value: string, days = 1) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
}

export function useNextBotDetection(options?: UseNextBotDetectionOptions) {
  const { cookieName = DEFAULT_COOKIE, syncToServer = true, ...hookOptions } = options ?? {}
  const state = useBotDetection(hookOptions)
  const synced = useRef(false)

  useEffect(() => {
    if (!state.result || !syncToServer || synced.current) return
    synced.current = true

    const payload: Pick<DetectionResult, 'bot' | 'botKind' | 'score' | 'confidence'> = {
      bot: state.result.bot,
      botKind: state.result.botKind,
      score: state.result.score,
      confidence: state.result.confidence,
    }
    setCookie(cookieName, JSON.stringify(payload))
  }, [state.result, cookieName, syncToServer])

  return state
}
