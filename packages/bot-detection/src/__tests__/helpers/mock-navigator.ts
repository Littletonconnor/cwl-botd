interface MockNavigatorOptions {
  userAgent?: string
  webdriver?: boolean
  platform?: string
  language?: string
  languages?: string[]
  plugins?: { length: number }
  hardwareConcurrency?: number
  deviceMemory?: number
  connection?: { rtt: number }
  permissions?: { query: (desc: { name: string }) => Promise<{ state: string }> }
}

const DEFAULT_NAVIGATOR: MockNavigatorOptions = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  webdriver: false,
  platform: 'Win32',
  language: 'en-US',
  languages: ['en-US', 'en'],
  plugins: { length: 5 },
  hardwareConcurrency: 8,
}

const HEADLESS_CHROME_NAVIGATOR: MockNavigatorOptions = {
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
  webdriver: true,
  platform: 'Linux x86_64',
  language: 'en-US',
  languages: [],
  plugins: { length: 0 },
  hardwareConcurrency: 2,
}

function mockNavigator(overrides: MockNavigatorOptions = {}): void {
  const values = { ...DEFAULT_NAVIGATOR, ...overrides }

  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(navigator, key, {
      value,
      writable: true,
      configurable: true,
    })
  }
}

export { mockNavigator, DEFAULT_NAVIGATOR, HEADLESS_CHROME_NAVIGATOR }
export type { MockNavigatorOptions }
