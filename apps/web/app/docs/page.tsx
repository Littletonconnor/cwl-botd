import Link from 'next/link'
import { CodeBlock } from '@/components/code-block'
import { Heading } from '@/components/heading'
import { Badge } from '@/components/ui/badge'

const installCode = `npm install @cwl-botd/bot-detection`

const quickstartCode = `import { load } from '@cwl-botd/bot-detection'

const detector = await load()
const result = await detector.detect()

if (result.bot) {
  console.log(result.botKind)  // "puppeteer" | "selenium" | "headless" | ...
  console.log(result.reasons)  // ["webdriver flag", "missing plugins"]
  console.log(result.score)    // 0.92
}`

const detectionResultCode = `interface DetectionResult {
  bot: boolean
  botKind: BotKindValue
  confidence: number
  reasons: string[]
  score: number
  signals: Signal[]
}`

const configCode = `const detector = await load({
  debug: true,
  scoring: {
    weights: { webdriver: 0.9, plugins: 0.7 },
    threshold: 0.6,
  },
  privacy: {
    disableCanvas: true,
    disableWebGL: true,
  },
})`

const nextSteps = [
  { title: 'Detection deep dive', href: '/docs/detection' },
  { title: 'API Reference', href: '/docs/api' },
  { title: 'Integrations', href: '/docs/integrations' },
  { title: 'Plugins', href: '/docs/plugins' },
  { title: 'Live Demo', href: '/docs/demo' },
]

const detectedItems = [
  { label: 'Automation tools', detail: 'Puppeteer, Playwright, Selenium, PhantomJS, etc.' },
  { label: 'Browser fingerprint anomalies', detail: 'Canvas, WebGL, audio, fonts' },
  { label: 'Behavioral inconsistencies', detail: 'Mouse, keyboard, scroll patterns' },
  { label: 'Environment spoofing', detail: 'Timezone/locale mismatches, lie detection' },
]

export default async function GettingStartedPage() {
  return (
    <article>
      <div className="flex items-center gap-3">
        <Badge variant="outline">v1.0.0</Badge>
      </div>

      <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground">
        Getting Started
      </h1>
      <p className="text-pretty mt-4 max-w-[56ch] text-base text-muted-foreground">
        BotD is an open-source, client-side library for detecting automated
        browsers. It identifies Puppeteer, Playwright, Selenium, PhantomJS, and
        other headless browsers using 50+ signals — running entirely in the
        browser with no server round-trip required.
      </p>

      {/* Installation */}
      <Heading level={2} id="installation">
        Installation
      </Heading>
      <p className="text-pretty mt-3 text-sm text-muted-foreground">
        Install the package from npm. No peer dependencies required.
      </p>
      <div className="mt-4">
        <CodeBlock
          code={installCode}
          language="bash"
          filename="Terminal"
        />
      </div>

      {/* Quick Start */}
      <Heading level={2} id="quickstart">
        Quick Start
      </Heading>
      <p className="text-pretty mt-3 text-sm text-muted-foreground">
        Call <code className="font-mono text-xs text-foreground">load()</code>{' '}
        once to initialize the detector, then{' '}
        <code className="font-mono text-xs text-foreground">detect()</code> to
        run all signals and return a result.
      </p>
      <div className="mt-4">
        <CodeBlock code={quickstartCode} language="typescript" />
      </div>

      {/* Detection Result */}
      <Heading level={2} id="detection-result">
        Detection Result
      </Heading>
      <p className="text-pretty mt-3 text-sm text-muted-foreground">
        The <code className="font-mono text-xs text-foreground">detect()</code>{' '}
        method returns a{' '}
        <code className="font-mono text-xs text-foreground">
          DetectionResult
        </code>{' '}
        with a bot flag, classification, confidence score, and the full signal
        list that contributed to the decision.
      </p>
      <div className="mt-4">
        <CodeBlock code={detectionResultCode} language="typescript" />
      </div>

      {/* Configuration */}
      <Heading level={2} id="configuration">
        Configuration
      </Heading>
      <p className="text-pretty mt-3 text-sm text-muted-foreground">
        Pass an options object to{' '}
        <code className="font-mono text-xs text-foreground">load()</code> to
        enable debug mode, tune scoring weights, or disable specific
        fingerprinting techniques for privacy compliance.
      </p>
      <div className="mt-4">
        <CodeBlock code={configCode} language="typescript" />
      </div>

      {/* What Gets Detected */}
      <Heading level={2} id="what-gets-detected">
        What Gets Detected
      </Heading>
      <p className="text-pretty mt-3 text-sm text-muted-foreground">
        BotD covers four detection categories. See the{' '}
        <Link
          href="/docs/detection"
          className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
        >
          detection deep dive
        </Link>{' '}
        for the full signal breakdown.
      </p>
      <ul role="list" className="mt-4 space-y-3">
        {detectedItems.map((item) => (
          <li key={item.label} className="flex gap-3 text-sm">
            <span className="mt-[0.4375rem] size-1.5 shrink-0 rounded-full bg-sky-500" />
            <span className="text-foreground">
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground"> — {item.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Next Steps */}
      <Heading level={2} id="next-steps">
        Next Steps
      </Heading>
      <ul role="list" className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {nextSteps.map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              {step.title}
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-3.5 shrink-0 text-muted-foreground"
              >
                <path
                  fillRule="evenodd"
                  d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06L7.28 11.78a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06z"
                />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  )
}
