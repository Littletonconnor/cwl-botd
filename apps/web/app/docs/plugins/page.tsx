import { CodeBlock } from '@/components/code-block'
import { Heading } from '@/components/heading'
import { ApiTable } from '@/components/api-table'

const pluginInterfaceCode = `interface Plugin {
  name: string
  collectors?: Record<string, CollectorFn>
  detectors?: Detector[]
  init?: () => void | Promise<void>
}`

const honeypotCode = `import { load, honeypotPlugin } from '@cwl-botd/bot-detection'

const detector = await load()
await detector.use(honeypotPlugin)
const result = await detector.detect()`

const cookielessCode = `import { load, cookielessPlugin } from '@cwl-botd/bot-detection'

const detector = await load()
await detector.use(cookielessPlugin)`

const customPluginCode = `import {
  definePlugin,
  defineDetector,
  defineCollector,
} from '@cwl-botd/bot-detection'

const myPlugin = definePlugin({
  name: 'my-custom-plugin',
  collectors: defineCollector('honeypotField', () => {
    return document.querySelector<HTMLInputElement>('#hp')?.value || null
  }),
  detectors: [
    defineDetector({
      name: 'honeypotCheck',
      category: 'automation',
      detect: (data) => ({
        detected: data.honeypotField?.value !== null,
        score: 0.8,
        reason: 'Honeypot field was filled',
      }),
    }),
  ],
})`

const detectorCode = `interface Detector {
  name: string
  category: 'automation' | 'inconsistency' | 'behavioral'
  detect(data: CollectorDict): Signal
}`

const fullExampleCode = `import {
  load,
  honeypotPlugin,
  cookielessPlugin,
  definePlugin,
  defineDetector,
  defineCollector,
} from '@cwl-botd/bot-detection'

const recaptchaPlugin = definePlugin({
  name: 'recaptcha-verify',
  collectors: defineCollector('recaptchaScore', async () => {
    const token = await grecaptcha.execute('SITE_KEY', { action: 'verify' })
    const res = await fetch('/api/recaptcha', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
    const { score } = await res.json()
    return score
  }),
  detectors: [
    defineDetector({
      name: 'recaptchaBot',
      category: 'automation',
      detect: (data) => {
        const score = data.recaptchaScore?.value ?? 1
        return {
          detected: score < 0.5,
          score: 1 - score,
          reason: \`reCAPTCHA score \${score} below threshold\`,
        }
      },
    }),
  ],
})

const detector = await load({ debug: true })
await detector.use(honeypotPlugin)
await detector.use(cookielessPlugin)
await detector.use(recaptchaPlugin)

const result = await detector.detect()`

export const metadata = { title: 'Plugin System' }

export default async function PluginsPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground">Plugin System</h1>
      <p className="mt-4 max-w-[56ch] text-base text-pretty text-muted-foreground">
        Extend BotD with custom collectors, detectors, and initialization logic. Plugins integrate seamlessly with the detection pipeline and scoring engine.
      </p>

      <Heading level={2} id="interface">Plugin Interface</Heading>
      <div className="mt-4">
        <CodeBlock code={pluginInterfaceCode} language="typescript" />
      </div>
      <ApiTable rows={[
        { name: 'name', type: 'string', description: 'Unique plugin identifier' },
        { name: 'collectors', type: 'Record<string, CollectorFn>', description: 'Custom data collection functions (optional)' },
        { name: 'detectors', type: 'Detector[]', description: 'Custom detection rules (optional)' },
        { name: 'init', type: '() => void | Promise<void>', description: 'Initialization hook, called when plugin is registered (optional)' },
      ]} />

      <Heading level={2} id="builtin">Built-in Plugins</Heading>

      <Heading level={3} id="honeypot">honeypotPlugin</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        Detects bots that fill hidden honeypot form fields. Add hidden inputs to your forms and this plugin will flag any visitor that fills them.
      </p>
      <div className="mt-4">
        <CodeBlock code={honeypotCode} language="typescript" />
      </div>

      <Heading level={3} id="cookieless">cookielessPlugin</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        Detects privacy-mode browsing or blocked cookie/localStorage storage — common in automated environments.
      </p>
      <div className="mt-4">
        <CodeBlock code={cookielessCode} language="typescript" />
      </div>

      <Heading level={2} id="custom">Creating Custom Plugins</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        Use the <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]">definePlugin</code>, <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]">defineDetector</code>, and <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]">defineCollector</code> helpers for type-safe plugin creation.
      </p>
      <div className="mt-4">
        <CodeBlock code={customPluginCode} language="typescript" filename="my-plugin.ts" />
      </div>

      <Heading level={3} id="detector-interface">Detector Interface</Heading>
      <div className="mt-4">
        <CodeBlock code={detectorCode} language="typescript" />
      </div>
      <ApiTable rows={[
        { name: 'name', type: 'string', description: 'Detector identifier — must be unique across all plugins' },
        { name: 'category', type: 'DetectorCategoryValue', description: '"automation", "inconsistency", or "behavioral"' },
        { name: 'detect', type: '(data: CollectorDict) => Signal', description: 'Detection function receiving all collected data' },
      ]} />

      <Heading level={2} id="full-example">Full Example</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        Combining built-in and custom plugins with a reCAPTCHA verification layer.
      </p>
      <div className="mt-4">
        <CodeBlock code={fullExampleCode} language="typescript" filename="full-setup.ts" />
      </div>
    </>
  )
}
