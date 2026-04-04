/**
 * Shared fixtures for benchmarks.
 *
 * Provides pre-built mock collector data and a registry factory so that
 * benchmark loops measure only execution time, not setup overhead.
 */

import { State } from '../src/types'
import type { CollectorDict } from '../src/types'
import { createDefaultRegistry } from '../src/detectors'
import type { DetectorRegistry } from '../src/detectors/registry'

// ---------------------------------------------------------------------------
// Collector data fixtures
// ---------------------------------------------------------------------------

function component<T>(value: T) {
  return { state: State.Success as const, value }
}

/**
 * Realistic "normal human browser" collector snapshot.
 * All values mimic a genuine Chrome 120 on Windows 10.
 */
export function createHumanCollectorData(): CollectorDict {
  const data: Record<string, unknown> = {
    userAgent: component(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ),
    platform: component('Win32'),
    language: component([['en-US'], ['en-US', 'en']]),
    timezone: component({ timezone: 'America/New_York', locale: 'en-US' }),
    webDriver: component(false),
    webGl: component({ vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1080)' }),
    documentFocus: component(true),
    scrollBehavior: component([]),
    mouseBehavior: component([]),
    clickBehavior: component([]),
    dimension: component({ width: 1920, height: 1080 }),
    plugins: component(5),
    canvasFingerprint: component({ toDataURLOverridden: false, isStable: true, length: 5000 }),
    webGlFingerprint: component({ hash: 'abc123', extensions: 20, params: { maxTextureSize: 16384 } }),
    audioFingerprint: component({ hash: 12345.678, sampleRate: 44100, supported: true }),
    fontEnumeration: component({
      fonts: ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Segoe UI'],
      count: 6,
      blocked: false,
    }),
    behaviorSnapshot: component({ mouse: [], clicks: [], keys: [], scrolls: [], duration: 0 }),
  }
  return data as unknown as CollectorDict
}

/**
 * Headless Chromium / Puppeteer bot profile.
 * Triggers most automation detectors.
 */
export function createBotCollectorData(): CollectorDict {
  const data: Record<string, unknown> = {
    userAgent: component(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
    ),
    platform: component('Linux x86_64'),
    language: component([[], []]),
    timezone: component({ timezone: 'UTC', locale: 'en-US' }),
    webDriver: component(true),
    webGl: component({ vendor: 'Google Inc.', renderer: 'Google SwiftShader' }),
    documentFocus: component(false),
    scrollBehavior: component([]),
    mouseBehavior: component([]),
    clickBehavior: component([]),
    dimension: component({ width: 800, height: 600 }),
    plugins: component(0),
    canvasFingerprint: component({ toDataURLOverridden: false, isStable: true, length: 50 }),
    webGlFingerprint: component({ hash: 'def456', extensions: 5, params: { maxTextureSize: 4096 } }),
    audioFingerprint: component({ hash: 0, sampleRate: 48000, supported: true }),
    fontEnumeration: component({ fonts: [], count: 0, blocked: true }),
    behaviorSnapshot: component({ mouse: [], clicks: [], keys: [], scrolls: [], duration: 0 }),
  }
  return data as unknown as CollectorDict
}

// ---------------------------------------------------------------------------
// Registry factory
// ---------------------------------------------------------------------------

/** Creates a fresh default registry with all built-in detectors. */
export function createRegistry(): DetectorRegistry {
  return createDefaultRegistry()
}
