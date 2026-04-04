import { CodeBlock } from '@/components/code-block'
import { Heading } from '@/components/heading'
import { ApiTable } from '@/components/api-table'

const puppeteerResultCode = `const result = await detector.detect()
// {
//   bot: true,
//   botKind: "Puppeteer",
//   confidence: 0.95,
//   reasons: ["webdriver flag", "missing plugins", "CDP runtime"],
//   score: 0.95,
//   signals: [...]
// }`

const privacyConfigCode = `const detector = await load({
  privacy: {
    disableCanvas: true,
    disableWebGL: true,
    disableAudio: true,
    disableFonts: true,
  },
})`

const behaviorCode = `const detector = await load({ monitoring: true })

// ... wait for user interaction ...

const behavior = detector.getBehaviorScore()
// { bot: false, score: 0.12, reasons: [], duration: 5000 }`

const detectorRows = [
  { name: 'webdriver', type: 'automation', description: 'navigator.webdriver flag detection', default: '1.0' },
  { name: 'userAgent', type: 'automation', description: 'Headless browser UA patterns', default: '0.9' },
  { name: 'evalLength', type: 'automation', description: 'Function.prototype.toString length anomalies', default: '0.6' },
  { name: 'errorTrace', type: 'automation', description: 'Stack trace engine fingerprinting', default: '0.8' },
  { name: 'distinctiveProperties', type: 'automation', description: 'Tool-specific window/document properties', default: '1.0' },
  { name: 'documentElementKeys', type: 'automation', description: 'Extra DOM keys injected by automation', default: '0.9' },
  { name: 'pluginsArray', type: 'automation', description: 'Missing or anomalous navigator.plugins', default: '0.6' },
  { name: 'pluginsInconsistency', type: 'automation', description: 'Plugin count vs type inconsistency', default: '0.7' },
  { name: 'functionBind', type: 'automation', description: 'Native function tampering detection', default: '0.8' },
  { name: 'process', type: 'automation', description: 'Node.js process object leak', default: '0.8' },
  { name: 'appVersion', type: 'automation', description: 'navigator.appVersion anomalies', default: '0.7' },
  { name: 'windowExternal', type: 'automation', description: 'window.external behavior anomalies', default: '0.9' },
  { name: 'productSub', type: 'automation', description: 'navigator.productSub check', default: '0.5' },
  { name: 'nativeFunction', type: 'automation', description: 'Spoofed native function detection', default: '0.7' },
  { name: 'prototypeChain', type: 'inconsistency', description: 'Prototype chain manipulation', default: '0.8' },
  { name: 'proxyDetection', type: 'inconsistency', description: 'Proxy object usage detection', default: '0.9' },
  { name: 'tostringInconsistency', type: 'inconsistency', description: 'toString() behavior anomalies', default: '0.8' },
  { name: 'propertyDescriptor', type: 'inconsistency', description: 'Modified property descriptors', default: '0.8' },
  { name: 'crossAttribute', type: 'inconsistency', description: 'Cross-referencing multiple attributes', default: '0.7' },
  { name: 'evalEngineConsistency', type: 'inconsistency', description: 'JS engine vs claimed browser', default: '0.7' },
  { name: 'errorStackEngine', type: 'inconsistency', description: 'Error stack format vs engine', default: '0.8' },
  { name: 'screenConsistency', type: 'inconsistency', description: 'Screen dimensions vs viewport', default: '0.6' },
  { name: 'languagesInconsistency', type: 'inconsistency', description: 'Navigator languages mismatch', default: '0.7' },
  { name: 'mimeTypesConsistence', type: 'inconsistency', description: 'MIME types consistency check', default: '0.5' },
  { name: 'spatialConsistency', type: 'inconsistency', description: 'Timezone/locale/UA correlation', default: '0.8' },
  { name: 'temporalConsistency', type: 'inconsistency', description: 'Temporal stability checks', default: '0.7' },
  { name: 'clockSkew', type: 'inconsistency', description: 'Timing precision anomalies', default: '0.5' },
  { name: 'performancePrecision', type: 'inconsistency', description: 'Performance API precision', default: '0.5' },
  { name: 'canvasFingerprint', type: 'inconsistency', description: 'Canvas rendering anomalies', default: '0.7' },
  { name: 'webgl', type: 'inconsistency', description: 'WebGL renderer/vendor mismatch', default: '0.8' },
  { name: 'webglAdvanced', type: 'inconsistency', description: 'Advanced WebGL analysis', default: '0.8' },
  { name: 'audioFingerprint', type: 'inconsistency', description: 'AudioContext fingerprint anomalies', default: '0.6' },
  { name: 'fontEnumeration', type: 'inconsistency', description: 'Installed font detection anomalies', default: '0.5' },
  { name: 'mathFingerprint', type: 'inconsistency', description: 'Math function precision checks', default: '0.6' },
  { name: 'mouseMovement', type: 'behavioral', description: 'Movement velocity, acceleration, jitter', default: '0.7' },
  { name: 'keyboardBehavior', type: 'behavioral', description: 'Keystroke timing patterns', default: '0.6' },
  { name: 'scrollBehavior', type: 'behavioral', description: 'Scroll velocity and patterns', default: '0.5' },
  { name: 'interactionTiming', type: 'behavioral', description: 'Event timing distribution', default: '0.6' },
]

export const metadata = { title: 'Detection Capabilities' }

export default async function DetectionPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground">Detection Capabilities</h1>
      <p className="mt-4 max-w-[56ch] text-base text-pretty text-muted-foreground">
        BotD uses a multi-layered approach combining automation detection, browser fingerprinting, behavioral analysis, and environment consistency checking across 40+ individual detectors.
      </p>

      <Heading level={2} id="automation">Automation Detection</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        The automation layer checks for 15+ signals left behind by tools like Puppeteer, Playwright, Selenium, and PhantomJS. These range from obvious flags like <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]">navigator.webdriver</code> to subtle artifacts like modified prototype chains and injected DOM properties.
      </p>
      <div className="mt-4">
        <CodeBlock code={puppeteerResultCode} language="typescript" filename="puppeteer-detection.ts" />
      </div>

      <Heading level={2} id="fingerprinting">Fingerprinting</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        Fingerprint-based detectors analyze canvas rendering, WebGL capabilities, audio processing, font availability, and math function precision to identify headless or virtualized environments that don&apos;t match their claimed identity.
      </p>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        All fingerprint collectors can be individually disabled for privacy compliance.
      </p>
      <div className="mt-4">
        <CodeBlock code={privacyConfigCode} language="typescript" filename="privacy.ts" />
      </div>

      <Heading level={2} id="behavioral">Behavioral Analysis</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        Behavioral detectors monitor real-time user interaction — mouse movements, keyboard timing, scroll patterns, and event distribution. Bots produce unnaturally consistent timing, perfectly linear mouse paths, or completely absent interaction.
      </p>
      <div className="mt-4">
        <CodeBlock code={behaviorCode} language="typescript" filename="behavior.ts" />
      </div>

      <Heading level={2} id="consistency">Consistency &amp; Lie Detection</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        Environment consistency checks cross-reference multiple browser attributes to catch spoofing. If the claimed browser is Chrome but the JS engine behavior matches Firefox, or the timezone doesn&apos;t match the locale, the inconsistency is flagged.
      </p>
      <ul role="list" className="mt-4 space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-3">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-sky-500" />
          <span><strong className="font-medium text-foreground">Spatial consistency</strong> — UA vs platform, timezone vs locale, screen vs viewport</span>
        </li>
        <li className="flex gap-3">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-sky-500" />
          <span><strong className="font-medium text-foreground">Engine verification</strong> — eval behavior, error stack format, function toString</span>
        </li>
        <li className="flex gap-3">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-sky-500" />
          <span><strong className="font-medium text-foreground">Lie detection</strong> — prototype tampering, proxy usage, property descriptor overrides</span>
        </li>
      </ul>

      <Heading level={2} id="detectors">Full Detector Table</Heading>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        All {detectorRows.length} detectors with their category and default scoring weight.
      </p>
      <ApiTable rows={detectorRows} showDefault />
    </>
  )
}
