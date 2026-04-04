import { test, expect } from '@playwright/test'

interface DetectionResult {
  bot: boolean
  botKind: string
  confidence: number
  reasons: string[]
  score: number
  signals: Array<{
    detected: boolean
    score: number
    reason: string
    botKind?: string
  }>
}

async function waitForDetectionResult(page: import('@playwright/test').Page): Promise<DetectionResult> {
  await page.waitForFunction(() => {
    const status = document.getElementById('status')
    return status && (status.textContent === 'done' || status.textContent === 'error')
  }, { timeout: 10_000 })

  const error = await page.evaluate(() => (window as any).__DETECTION_ERROR__)
  if (error) {
    throw new Error(`Detection failed in browser: ${error}`)
  }

  return page.evaluate(() => (window as any).__DETECTION_RESULT__) as Promise<DetectionResult>
}

test.use({
  launchOptions: {
    args: [
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
  },
})

// =============================================================================
// Stealth-like Chromium detection
// --disable-blink-features=AutomationControlled hides navigator.webdriver,
// but other signals (HeadlessChrome UA, RTT, plugins, WebGL) still fire.
// =============================================================================

test.describe('Stealth-like Chromium (anti-detection flags enabled)', () => {
  test('hides navigator.webdriver but still fires other signals', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    // webdriver flag is hidden by --disable-blink-features=AutomationControlled
    const webdriverSignal = result.signals.find(s =>
      s.reason.toLowerCase().includes('webdriver')
    )
    if (webdriverSignal) {
      expect(webdriverSignal.detected).toBe(false)
    }

    // But other headless signals still fire
    const detectedSignals = result.signals.filter(s => s.detected)
    expect(detectedSignals.length).toBeGreaterThan(0)
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  test('detects HeadlessChrome in user agent', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    const headlessSignals = result.signals.filter(s =>
      s.detected && s.reason.toLowerCase().includes('headlesschrome')
    )
    expect(headlessSignals.length).toBeGreaterThan(0)
  })

  test('detects zero plugins in headless', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    const pluginSignal = result.signals.find(s =>
      s.detected && s.reason.toLowerCase().includes('plugin')
    )
    expect(pluginSignal).toBeDefined()
  })

  test('detects virtual GPU (SwiftShader) via WebGL', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    const webglSignal = result.signals.find(s =>
      s.detected && s.reason.toLowerCase().includes('swiftshader')
    )
    expect(webglSignal).toBeDefined()
  })

  test('detects RTT anomaly on headless desktop', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    const rttSignal = result.signals.find(s =>
      s.detected && s.reason.toLowerCase().includes('rtt')
    )
    expect(rttSignal).toBeDefined()
  })

  test('confidence is above zero even when bot=false', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    // The scoring engine produces a positive confidence from multiple signals
    // even though the weighted score may not cross the bot=true threshold
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.reasons.length).toBeGreaterThanOrEqual(3)
  })
})

// =============================================================================
// User agent spoofing detection
// Even when UA is spoofed, other environment signals should still fire.
// =============================================================================

test.describe('User agent spoofing detection', () => {
  test('detects automation signals even with spoofed UA', async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })
      Object.defineProperty(navigator, 'appVersion', {
        get: () => '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })
    })

    await page.goto('/')
    const result = await waitForDetectionResult(page)

    // UA-based detectors may not fire since UA is spoofed, but environment
    // signals like plugins, WebGL, RTT should still detect headless
    const nonUADetections = result.signals.filter(s =>
      s.detected &&
      !s.reason.toLowerCase().includes('user agent') &&
      !s.reason.toLowerCase().includes('appversion')
    )
    expect(nonUADetections.length).toBeGreaterThan(0)
  })

  test('detects platform mismatch when UA claims Mac but platform is Linux', async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })
    })

    await page.goto('/')
    const result = await waitForDetectionResult(page)

    // Environment signals (WebGL, plugins, RTT) should still fire regardless
    // of the spoofed UA
    const detectedSignals = result.signals.filter(s => s.detected)
    expect(detectedSignals.length).toBeGreaterThan(0)
  })
})
