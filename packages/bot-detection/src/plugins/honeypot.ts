import { definePlugin } from '../plugin'
import { DetectorCategory } from '../detectors/types'
import type { CollectorDict, Component } from '../types'
import { State } from '../types'

function getHoneypotState() {
  if (typeof document === 'undefined') return { triggered: false, fields: [] as string[] }

  const fields: string[] = []
  const honeypotSelectors = [
    'input[tabindex="-1"][autocomplete="off"]',
    'input[style*="display:none"]',
    'input[style*="display: none"]',
    'input[style*="visibility:hidden"]',
    'input[style*="visibility: hidden"]',
    'input[style*="position:absolute"][style*="left:-"]',
    '.honeypot input',
    'input[name="website"]',
    'input[name="url"]',
    'input[name="fax"]',
    'input[name="phone2"]',
    'input[name="address2"]',
  ]

  for (const selector of honeypotSelectors) {
    try {
      const els = document.querySelectorAll<HTMLInputElement>(selector)
      for (let i = 0; i < els.length; i++) {
        const el = els[i]!
        if (el.value && el.value.length > 0) {
          fields.push(el.name || el.id || selector)
        }
      }
    } catch {
      // selector may be invalid in some environments
    }
  }

  return { triggered: fields.length > 0, fields }
}

export const honeypotPlugin = definePlugin({
  name: 'honeypot',
  collectors: {
    honeypot: getHoneypotState,
  },
  detectors: [
    {
      name: 'honeypotFilled',
      category: DetectorCategory.Automation,
      detect(data: CollectorDict) {
        const component = (data as Record<string, Component<{ triggered: boolean; fields: string[] }>>).honeypot
        if (!component || component.state !== State.Success) {
          return { detected: false, score: 0, reason: 'honeypotFilled: no honeypot data available' }
        }

        const { triggered, fields } = component.value
        if (triggered) {
          return {
            detected: true,
            score: 0.9,
            reason: `honeypotFilled: hidden fields filled (${fields.join(', ')})`,
          }
        }

        return { detected: false, score: 0, reason: 'honeypotFilled: no hidden fields filled' }
      },
    },
  ],
})
