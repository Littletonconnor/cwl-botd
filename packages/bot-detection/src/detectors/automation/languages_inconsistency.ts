import { State } from '../../types'
import type { CollectorDict } from '../../types'
import { DetectorCategory, type Signal } from '../types'
import type { Detector } from '../types'

const detector: Detector = {
  name: 'languagesInconsistency',
  category: DetectorCategory.Automation,
  detect(data: CollectorDict): Signal {
    const component = data.language
    if (component.state !== State.Success) {
      return { detected: false, score: 0, reason: 'languagesInconsistency: collector unavailable' }
    }

    const languageArrays = component.value
    const hasLanguage = languageArrays.some((arr: string[]) => arr.length > 0)

    if (!hasLanguage) {
      return {
        detected: true,
        score: 0.7,
        reason: 'navigator.languages is empty, indicating automation environment',
      }
    }

    return { detected: false, score: 0, reason: 'languagesInconsistency: languages present' }
  },
}

export default detector
