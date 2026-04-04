import { CodeBlock } from '@/components/code-block'
import { Heading } from '@/components/heading'

const reactCode = `import { useEffect, useState } from 'react'
import { load, type DetectionResult } from '@cwl-botd/bot-detection'

function useBotDetection() {
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    load()
      .then((detector) => detector.detect())
      .then((r) => {
        if (!cancelled) {
          setResult(r)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  return { result, loading }
}

function App() {
  const { result, loading } = useBotDetection()

  if (loading) return <div>Checking...</div>
  if (result?.bot) return <div>Access denied</div>
  return <div>Welcome!</div>
}`

const nextjsCode = `'use client'

import { useEffect, useState } from 'react'
import { load, type DetectionResult } from '@cwl-botd/bot-detection'

export function BotGuard({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<DetectionResult | null>(null)

  useEffect(() => {
    load().then((d) => d.detect()).then(setResult)
  }, [])

  if (result?.bot) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h1>Access Denied</h1>
      </div>
    )
  }

  return <>{children}</>
}`

const nextjsLayoutCode = `// app/layout.tsx
import { BotGuard } from '@/components/bot-guard'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BotGuard>{children}</BotGuard>
      </body>
    </html>
  )
}`

const vanillaCode = `<script type="module">
  import { load } from '@cwl-botd/bot-detection'

  const detector = await load()
  const { bot, botKind, score } = await detector.detect()

  if (bot) {
    document.body.innerHTML = '<h1>Access Denied</h1>'
  }
</script>`

const serverVerifyCode = `const detector = await load()
const result = await detector.detect()
const fingerprint = detector.getFingerprint()

await fetch('/api/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fingerprint,
    score: result.score,
    bot: result.bot,
  }),
})`

export const metadata = { title: 'Integrations' }

export default async function IntegrationsPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground">Framework Integrations</h1>
      <p className="mt-4 max-w-[56ch] text-base text-pretty text-muted-foreground">
        Drop-in integration with React, Next.js, or vanilla JavaScript. TypeScript types are bundled — no extra <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]">@types</code> package needed.
      </p>

      <Heading level={2} id="react">React</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        Create a custom hook that initializes the detector on mount and exposes the result.
      </p>
      <div className="mt-4">
        <CodeBlock code={reactCode} language="tsx" filename="App.tsx" />
      </div>

      <Heading level={2} id="nextjs">Next.js</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        BotD runs in the browser, so wrap it in a client component. Use it as a guard in your root layout.
      </p>
      <div className="mt-4">
        <CodeBlock code={nextjsCode} language="tsx" filename="components/bot-guard.tsx" />
      </div>
      <div className="mt-4">
        <CodeBlock code={nextjsLayoutCode} language="tsx" filename="app/layout.tsx" />
      </div>

      <Heading level={2} id="vanilla">Vanilla JS</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        Use a module script tag for direct browser usage.
      </p>
      <div className="mt-4">
        <CodeBlock code={vanillaCode} language="html" filename="index.html" />
      </div>

      <Heading level={2} id="server-verification">Server-Side Verification</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        For higher-security use cases, send the fingerprint and score to your server for verification or logging.
      </p>
      <div className="mt-4">
        <CodeBlock code={serverVerifyCode} language="typescript" filename="verify.ts" />
      </div>
    </>
  )
}
