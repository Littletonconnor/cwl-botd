import { definePlugin } from '../plugin'
import { DetectorCategory } from '../detectors/types'
import type { CollectorDict, Component } from '../types'
import { State } from '../types'

interface CookielessState {
  cookiesEnabled: boolean
  localStorageAvailable: boolean
  sessionStorageAvailable: boolean
}

function getCookielessState(): CookielessState {
  const cookiesEnabled =
    typeof navigator !== 'undefined' ? navigator.cookieEnabled : false

  let localStorageAvailable = false
  try {
    if (typeof localStorage !== 'undefined') {
      const key = '__botd_ls_test__'
      localStorage.setItem(key, '1')
      localStorage.removeItem(key)
      localStorageAvailable = true
    }
  } catch {
    // blocked or unavailable
  }

  let sessionStorageAvailable = false
  try {
    if (typeof sessionStorage !== 'undefined') {
      const key = '__botd_ss_test__'
      sessionStorage.setItem(key, '1')
      sessionStorage.removeItem(key)
      sessionStorageAvailable = true
    }
  } catch {
    // blocked or unavailable
  }

  return { cookiesEnabled, localStorageAvailable, sessionStorageAvailable }
}

export const cookielessPlugin = definePlugin({
  name: 'cookieless',
  collectors: {
    cookieless: getCookielessState,
  },
  detectors: [
    {
      name: 'cookielessBrowsing',
      category: DetectorCategory.Inconsistency,
      detect(data: CollectorDict) {
        const component = (data as Record<string, Component<CookielessState>>).cookieless
        if (!component || component.state !== State.Success) {
          return { detected: false, score: 0, reason: 'cookielessBrowsing: no storage data available' }
        }

        const { cookiesEnabled, localStorageAvailable, sessionStorageAvailable } = component.value
        const blockedCount = [cookiesEnabled, localStorageAvailable, sessionStorageAvailable]
          .filter((v) => !v).length

        if (blockedCount === 3) {
          return {
            detected: true,
            score: 0.6,
            reason: 'cookielessBrowsing: all storage mechanisms blocked (cookies, localStorage, sessionStorage)',
          }
        }

        if (blockedCount === 2) {
          return {
            detected: true,
            score: 0.4,
            reason: 'cookielessBrowsing: multiple storage mechanisms blocked',
          }
        }

        if (!cookiesEnabled) {
          return {
            detected: true,
            score: 0.3,
            reason: 'cookielessBrowsing: cookies disabled',
          }
        }

        return { detected: false, score: 0, reason: 'cookielessBrowsing: storage mechanisms available' }
      },
    },
  ],
})
