import Link from 'next/link'
import { CodeBlock } from '@/components/code-block'
import { Badge } from '@/components/ui/badge'

const stats = [
  { label: 'Detection time', value: '< 5ms' },
  { label: 'Signals analyzed', value: '50+' },
  { label: 'Dependencies', value: '0' },
  { label: 'Client-side', value: '100%' },
]

const features = [
  {
    name: 'Browser Fingerprinting',
    description:
      'Collect 40+ browser attributes including WebGL, canvas, fonts, and hardware concurrency.',
  },
  {
    name: 'Automation Detection',
    description:
      'Identify Puppeteer, Playwright, Selenium, PhantomJS, and stealth plugins.',
  },
  {
    name: 'Consistency Checking',
    description:
      'Cross-reference timezone, locale, language, and platform to catch spoofed environments.',
  },
  {
    name: 'Behavioral Signals',
    description:
      'Detect synthetic mouse movements, timed clicks, and keyboard patterns.',
  },
  {
    name: 'Heuristic Scoring',
    description:
      'Combine 50+ weighted signals into a configurable confidence score.',
  },
  {
    name: 'Plugin Architecture',
    description:
      'Extend detection with custom rules and domain-specific anomaly detectors.',
  },
]

const quickstartCode = `import { load } from '@cwl-botd/bot-detection'

const detector = await load()
const result = await detector.detect()

if (result.bot) {
  console.log(result.botKind)  // "puppeteer"
  console.log(result.reasons)  // ["webdriver flag", ...]
  console.log(result.score)    // 0.92
}`

export default async function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Hero */}
      <section className="border-b border-border px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <Badge variant="outline" className="mb-6">
            v1.0.0
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
            Detect bots before they detect you
          </h1>
          <p className="text-pretty mx-auto mt-4 max-w-[52ch] text-base text-muted-foreground">
            Open-source bot detection that runs entirely client-side. Zero
            dependencies, sub-5ms detection, 50+ signals.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="rounded-lg border border-border bg-muted px-4 py-2">
              <code className="font-mono text-sm text-foreground">
                npm install @cwl-botd/bot-detection
              </code>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/docs"
              className="inline-flex h-9 items-center rounded-lg bg-sky-500 px-4 text-sm font-medium text-white hover:bg-sky-600"
            >
              Get Started
            </Link>
            <Link
              href="/docs/demo"
              className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
            >
              Live Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-[90rem] grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          {stats.map((stat) => (
            <div key={stat.label} className="px-8 py-6 text-center">
              <p className="tabular-nums text-2xl font-semibold tracking-tight text-foreground">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[90rem]">
          <h2 className="text-balance text-center text-2xl font-semibold tracking-tight text-foreground">
            Everything you need to stop bots
          </h2>
          <dl className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="rounded-lg border border-border bg-muted/30 p-6"
              >
                <dt className="text-sm font-semibold text-foreground">
                  {feature.name}
                </dt>
                <dd className="text-pretty mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Quick code example */}
      <section className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-balance text-center text-2xl font-semibold tracking-tight text-foreground">
            Simple API, powerful results
          </h2>
          <p className="text-pretty mt-3 text-center text-sm text-muted-foreground">
            Up and running in minutes with a single async call.
          </p>
          <div className="mt-8">
            <CodeBlock code={quickstartCode} language="typescript" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border px-6 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
            Start detecting bots today
          </h2>
          <p className="text-pretty mt-3 text-sm text-muted-foreground">
            Open-source, zero deps, sub-5ms
          </p>
          <div className="mt-6">
            <Link
              href="/docs"
              className="inline-flex h-9 items-center rounded-lg bg-sky-500 px-5 text-sm font-medium text-white hover:bg-sky-600"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between">
          <span className="text-sm font-semibold tracking-tight">
            <span className="text-foreground">bot</span>
            <span className="text-sky-500">d</span>
          </span>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 BotD. Open-source under MIT License.
          </p>
        </div>
      </footer>
    </div>
  )
}
