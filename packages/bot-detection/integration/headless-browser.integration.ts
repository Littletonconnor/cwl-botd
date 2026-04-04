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

// =============================================================================
// Headless Chromium detection (Playwright-driven)
// =============================================================================

test.describe('Headless Chromium detection (Playwright)', () => {
  test('detects headless Chromium as a bot', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    expect(result.bot).toBe(true)
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  test('identifies automation-related signals', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    const detectedSignals = result.signals.filter(s => s.detected)
    expect(detectedSignals.length).toBeGreaterThan(0)

    const signalReasons = detectedSignals.map(s => s.reason.toLowerCase()).join(' | ')
    const hasAutomationSignal =
      signalReasons.includes('webdriver') ||
      signalReasons.includes('headless') ||
      signalReasons.includes('swiftshader') ||
      signalReasons.includes('plugin') ||
      signalReasons.includes('language') ||
      signalReasons.includes('automation')

    expect(hasAutomationSignal).toBe(true)
  })

  test('returns valid DetectionResult structure', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    expect(typeof result.bot).toBe('boolean')
    expect(typeof result.botKind).toBe('string')
    expect(typeof result.confidence).toBe('number')
    expect(typeof result.score).toBe('number')
    expect(Array.isArray(result.reasons)).toBe(true)
    expect(Array.isArray(result.signals)).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)

    for (const signal of result.signals) {
      expect(typeof signal.detected).toBe('boolean')
      expect(typeof signal.score).toBe('number')
      expect(typeof signal.reason).toBe('string')
      expect(signal.score).toBeGreaterThanOrEqual(0)
      expect(signal.score).toBeLessThanOrEqual(1)
    }
  })

  test('detects navigator.webdriver flag', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    const webdriverSignal = result.signals.find(s =>
      s.reason.toLowerCase().includes('webdriver')
    )
    expect(webdriverSignal).toBeDefined()
    expect(webdriverSignal!.detected).toBe(true)
  })

  test('reports multiple detection reasons', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    expect(result.reasons.length).toBeGreaterThanOrEqual(2)
  })
})

// =============================================================================
// Detection completeness — verify specific signal categories fire
// =============================================================================

test.describe('Signal category coverage in headless environment', () => {
  test('fires automation category signals', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    const automationSignals = result.signals.filter(s =>
      s.detected && (
        s.reason.toLowerCase().includes('webdriver') ||
        s.reason.toLowerCase().includes('headless') ||
        s.reason.toLowerCase().includes('automation') ||
        s.reason.toLowerCase().includes('plugin') ||
        s.reason.toLowerCase().includes('language')
      )
    )
    expect(automationSignals.length).toBeGreaterThan(0)
  })

  test('detects WebGL renderer anomalies in headless', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    const webglSignals = result.signals.filter(s =>
      s.reason.toLowerCase().includes('webgl') ||
      s.reason.toLowerCase().includes('swiftshader') ||
      s.reason.toLowerCase().includes('gpu') ||
      s.reason.toLowerCase().includes('renderer')
    )

    expect(webglSignals.length).toBeGreaterThan(0)
  })

  test('runs all detectors without errors', async ({ page }) => {
    await page.goto('/')
    const result = await waitForDetectionResult(page)

    expect(result.signals.length).toBeGreaterThan(0)
    expect(result.signals.length).toBeGreaterThanOrEqual(30)
  })
})

// =============================================================================
// Debug mode integration
// =============================================================================

test.describe('Debug mode in real browser', () => {
  test('produces debug report with timing data', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(
      () => document.getElementById('status')?.textContent === 'done',
      { timeout: 10_000 }
    )

    const debugReport = await page.evaluate(() => (window as any).__DEBUG_REPORT__)

    expect(debugReport).toBeDefined()
    if (debugReport) {
      expect(typeof debugReport.totalDuration).toBe('number')
      expect(debugReport.totalDuration).toBeGreaterThan(0)
    }
  })
})

// =============================================================================
// Re-detection consistency
// =============================================================================

test.describe('Re-detection on page reload', () => {
  test('produces consistent bot classification across page loads', async ({ page }) => {
    await page.goto('/')
    const result1 = await waitForDetectionResult(page)

    await page.reload()
    const result2 = await waitForDetectionResult(page)

    expect(result1.bot).toBe(result2.bot)
    expect(result1.botKind).toBe(result2.botKind)
    expect(Math.abs(result1.confidence - result2.confidence)).toBeLessThan(0.3)
  })
})
