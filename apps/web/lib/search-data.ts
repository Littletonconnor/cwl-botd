export interface SearchItem {
  title: string
  description: string
  href: string
  section: string
}

export const searchIndex: SearchItem[] = [
  { title: 'Getting Started', description: 'Install and set up BotD', href: '/docs', section: 'Docs' },
  { title: 'Installation', description: 'npm install @cwl-botd/bot-detection', href: '/docs#installation', section: 'Getting Started' },
  { title: 'Quick Start', description: 'Load, detect, and handle results', href: '/docs#quickstart', section: 'Getting Started' },
  { title: 'Configuration', description: 'Scoring weights, privacy, debug mode', href: '/docs#configuration', section: 'Getting Started' },
  { title: 'Detection Capabilities', description: 'All 40+ detectors explained', href: '/docs/detection', section: 'Detection' },
  { title: 'Automation Detection', description: 'Puppeteer, Playwright, Selenium signals', href: '/docs/detection#automation', section: 'Detection' },
  { title: 'Fingerprinting', description: 'Canvas, WebGL, audio, font detection', href: '/docs/detection#fingerprinting', section: 'Detection' },
  { title: 'Behavioral Analysis', description: 'Mouse, keyboard, scroll patterns', href: '/docs/detection#behavioral', section: 'Detection' },
  { title: 'Consistency Checks', description: 'Environment spoofing and lie detection', href: '/docs/detection#consistency', section: 'Detection' },
  { title: 'API Reference', description: 'Complete method and type documentation', href: '/docs/api', section: 'API' },
  { title: 'load()', description: 'Initialize the detector', href: '/docs/api#load', section: 'API' },
  { title: 'BotDetector', description: 'Main detector class and methods', href: '/docs/api#botdetector', section: 'API' },
  { title: 'detect()', description: 'Run detection and get results', href: '/docs/api#detect', section: 'API' },
  { title: 'DetectionResult', description: 'Bot verdict, score, reasons, signals', href: '/docs/api#detectionresult', section: 'API' },
  { title: 'PrivacyConfig', description: 'Disable fingerprinting for GDPR/CCPA', href: '/docs/api#privacyconfig', section: 'API' },
  { title: 'ScoringOptions', description: 'Custom weights and threshold', href: '/docs/api#scoringoptions', section: 'API' },
  { title: 'BotKind', description: 'Enum of identifiable bot types', href: '/docs/api#botkind', section: 'API' },
  { title: 'React Integration', description: 'Custom hook and component pattern', href: '/docs/integrations#react', section: 'Integrations' },
  { title: 'Next.js Integration', description: 'Client component BotGuard', href: '/docs/integrations#nextjs', section: 'Integrations' },
  { title: 'Vanilla JS', description: 'Script tag and CDN usage', href: '/docs/integrations#vanilla', section: 'Integrations' },
  { title: 'Plugin System', description: 'Extend BotD with custom logic', href: '/docs/plugins', section: 'Plugins' },
  { title: 'honeypotPlugin', description: 'Detect bots filling hidden fields', href: '/docs/plugins#honeypot', section: 'Plugins' },
  { title: 'cookielessPlugin', description: 'Detect blocked storage', href: '/docs/plugins#cookieless', section: 'Plugins' },
  { title: 'Custom Plugins', description: 'definePlugin, defineDetector, defineCollector', href: '/docs/plugins#custom', section: 'Plugins' },
  { title: 'Live Demo', description: 'Run detection in your browser', href: '/docs/demo', section: 'Tools' },
]
