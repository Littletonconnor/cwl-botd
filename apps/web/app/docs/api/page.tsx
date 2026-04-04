import { CodeBlock } from '@/components/code-block'
import { Heading } from '@/components/heading'
import { ApiTable } from '@/components/api-table'

const loadCode = `import { load } from '@cwl-botd/bot-detection'

const detector = await load({
  debug: true,
  monitoring: true,
  scoring: { threshold: 0.5 },
})`

const detectCode = `const result = await detector.detect()
// result.bot       → true
// result.botKind   → "Puppeteer"
// result.score     → 0.95
// result.reasons   → ["webdriver flag", "missing plugins"]
// result.signals   → Signal[]`

const pluginCode = `import { honeypotPlugin } from '@cwl-botd/bot-detection'

await detector.use(honeypotPlugin)`

const fingerprintCode = `const hash = detector.getFingerprint()
// "a3f2b8c1e9d4..." — stable across page loads`

const debugCode = `const report = detector.getDebugReport()
// { timestamp, totalDuration, collectors: [...], detectors: [...] }

const json = detector.exportDebugJSON()
// Compact JSON string for server-side logging`

const signalCode = `interface Signal {
  detected: boolean
  score: number
  reason: string
  botKind?: BotKindValue
}`

const behaviorResultCode = `interface BehaviorResult {
  bot: boolean
  score: number
  reasons: string[]
  duration: number
}`

const detectionResultCode = `interface DetectionResult {
  bot: boolean
  botKind: BotKindValue
  confidence: number
  reasons: string[]
  score: number
  signals: Signal[]
}`

export const metadata = { title: 'API Reference' }

export default async function ApiPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground">API Reference</h1>
      <p className="mt-4 max-w-[56ch] text-base text-pretty text-muted-foreground">
        Complete reference for the BotD library — all functions, classes, types, and configuration options.
      </p>

      {/* load() */}
      <Heading level={2} id="load">load()</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        Initialize the detector, collect initial fingerprint data, and optionally start behavior tracking.
      </p>
      <div className="mt-2 rounded-lg border border-border bg-muted/30 px-4 py-2">
        <code className="font-mono text-sm text-foreground">async function load(options?: BotDetectionConfig): Promise&lt;BotDetector&gt;</code>
      </div>
      <div className="mt-4">
        <CodeBlock code={loadCode} language="typescript" />
      </div>

      <Heading level={3} id="botdetectionconfig">BotDetectionConfig</Heading>
      <ApiTable
        showDefault
        rows={[
          { name: 'detectors', type: 'DetectorConfig', description: 'Enable/disable specific detectors', default: '—' },
          { name: 'collectors', type: 'CollectorConfig', description: 'Enable/disable specific collectors', default: '—' },
          { name: 'scoring', type: 'ScoringOptions', description: 'Custom weights and threshold', default: '—' },
          { name: 'behavior', type: 'BehaviorTrackerOptions', description: 'Behavior tracking config', default: '—' },
          { name: 'monitoring', type: 'boolean', description: 'Auto-start behavior tracking', default: 'false' },
          { name: 'privacy', type: 'PrivacyConfig', description: 'Disable fingerprinting features', default: '—' },
          { name: 'performance', type: 'PerformanceConfig', description: 'Skip expensive operations', default: '—' },
          { name: 'debug', type: 'boolean', description: 'Enable debug logging', default: 'false' },
        ]}
      />

      {/* BotDetector */}
      <Heading level={2} id="botdetector">BotDetector</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        The main class returned by <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]">load()</code>. Provides detection, data access, behavior tracking, and debug methods.
      </p>

      <Heading level={3} id="detect">detect()</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        Run all enabled detectors and return a structured result.
      </p>
      <div className="mt-2 rounded-lg border border-border bg-muted/30 px-4 py-2">
        <code className="font-mono text-sm text-foreground">detect(options?: DetectOptions): Promise&lt;DetectionResult&gt;</code>
      </div>
      <div className="mt-4">
        <CodeBlock code={detectCode} language="typescript" />
      </div>

      <Heading level={3} id="collect">collect()</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">Manually trigger data collection without running detection.</p>
      <div className="mt-2 rounded-lg border border-border bg-muted/30 px-4 py-2">
        <code className="font-mono text-sm text-foreground">collect(): Promise&lt;CollectorDict&gt;</code>
      </div>

      <Heading level={3} id="use">use()</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">Register and initialize a plugin.</p>
      <div className="mt-2 rounded-lg border border-border bg-muted/30 px-4 py-2">
        <code className="font-mono text-sm text-foreground">use(plugin: Plugin): Promise&lt;void&gt;</code>
      </div>
      <div className="mt-4">
        <CodeBlock code={pluginCode} language="typescript" />
      </div>

      <Heading level={3} id="getcollections">getCollections()</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">Access the most recently collected fingerprint data.</p>
      <div className="mt-2 rounded-lg border border-border bg-muted/30 px-4 py-2">
        <code className="font-mono text-sm text-foreground">getCollections(): CollectorDict | undefined</code>
      </div>

      <Heading level={3} id="getfingerprint">getFingerprint()</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">Get a stable hash string derived from collected data. Useful for server-side deduplication.</p>
      <div className="mt-2 rounded-lg border border-border bg-muted/30 px-4 py-2">
        <code className="font-mono text-sm text-foreground">getFingerprint(): string</code>
      </div>
      <div className="mt-4">
        <CodeBlock code={fingerprintCode} language="typescript" />
      </div>

      <Heading level={3} id="behavior-methods">Behavior Tracking</Heading>
      <ApiTable rows={[
        { name: 'startBehaviorTracking()', type: 'void', description: 'Begin monitoring mouse, keyboard, and scroll events' },
        { name: 'stopBehaviorTracking()', type: 'void', description: 'Stop monitoring and freeze event buffers' },
        { name: 'getBehaviorScore()', type: 'BehaviorResult', description: 'Analyze tracked events and return bot likelihood' },
      ]} />

      <Heading level={3} id="debug-methods">Debug</Heading>
      <div className="mt-4">
        <CodeBlock code={debugCode} language="typescript" />
      </div>
      <ApiTable rows={[
        { name: 'getDebugReport()', type: 'DebugReport | undefined', description: 'Detailed timing and result info for all collectors/detectors' },
        { name: 'exportDebugJSON()', type: 'string', description: 'Compact JSON string for server-side logging' },
      ]} />

      <Heading level={3} id="lifecycle">Lifecycle</Heading>
      <ApiTable rows={[
        { name: 'destroy()', type: 'void', description: 'Clean up resources, stop tracking, reset state' },
        { name: 'getDetections()', type: 'DetectionResult | undefined', description: 'Access the last detection result' },
        { name: 'static isBot(result)', type: 'boolean', description: 'Convenience check on a DetectionResult' },
      ]} />

      {/* DetectionResult */}
      <Heading level={2} id="detectionresult">DetectionResult</Heading>
      <div className="mt-4">
        <CodeBlock code={detectionResultCode} language="typescript" />
      </div>
      <ApiTable rows={[
        { name: 'bot', type: 'boolean', description: 'Whether the visitor is classified as a bot' },
        { name: 'botKind', type: 'BotKindValue', description: 'Identified bot type (Puppeteer, Selenium, etc.) or Unknown' },
        { name: 'confidence', type: 'number', description: '0–1 confidence in the classification' },
        { name: 'reasons', type: 'string[]', description: 'Human-readable reasons for the classification' },
        { name: 'score', type: 'number', description: '0–1 normalized detection score' },
        { name: 'signals', type: 'Signal[]', description: 'Individual detector outputs' },
      ]} />

      {/* Configuration */}
      <Heading level={2} id="configuration">Configuration Types</Heading>

      <Heading level={3} id="privacyconfig">PrivacyConfig</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">Disable fingerprinting techniques for privacy compliance (GDPR, CCPA).</p>
      <ApiTable
        showDefault
        rows={[
          { name: 'disableFingerprinting', type: 'boolean', description: 'Disable all fingerprinting', default: 'false' },
          { name: 'disableCanvas', type: 'boolean', description: 'Skip canvas fingerprint', default: 'false' },
          { name: 'disableWebGL', type: 'boolean', description: 'Skip WebGL fingerprint', default: 'false' },
          { name: 'disableAudio', type: 'boolean', description: 'Skip audio fingerprint', default: 'false' },
          { name: 'disableFonts', type: 'boolean', description: 'Skip font enumeration', default: 'false' },
        ]}
      />

      <Heading level={3} id="scoringoptions">ScoringOptions</Heading>
      <ApiTable
        showDefault
        rows={[
          { name: 'weights', type: 'Record<string, number>', description: 'Custom detector weights (0–1)', default: 'built-in' },
          { name: 'threshold', type: 'number', description: 'Score above which visitor is classified as bot', default: '0.4' },
        ]}
      />

      <Heading level={3} id="behaviortrackeroptions">BehaviorTrackerOptions</Heading>
      <ApiTable
        showDefault
        rows={[
          { name: 'maxEvents', type: 'number', description: 'Max events buffered per type', default: '500' },
          { name: 'sampleRate', type: 'number', description: 'Mouse move sampling rate', default: '1' },
        ]}
      />

      {/* Types */}
      <Heading level={2} id="types">Types</Heading>

      <Heading level={3} id="botkind">BotKind</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">Enum of identifiable bot types.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {['HeadlessChrome', 'Puppeteer', 'Playwright', 'Selenium', 'PhantomJS', 'Nightmare', 'Electron', 'NodeJS', 'Rhino', 'CouchJS', 'Sequentum', 'SlimerJS', 'CefSharp', 'Unknown'].map((kind) => (
          <span key={kind} className="rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-xs text-foreground">{kind}</span>
        ))}
      </div>

      <Heading level={3} id="signal">Signal</Heading>
      <div className="mt-4">
        <CodeBlock code={signalCode} language="typescript" />
      </div>

      <Heading level={3} id="behaviorresult">BehaviorResult</Heading>
      <div className="mt-4">
        <CodeBlock code={behaviorResultCode} language="typescript" />
      </div>
    </>
  )
}
