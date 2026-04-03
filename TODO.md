# CWL-BOTD: Enterprise-Ready Bot Detection Library — Implementation Plan

## Research Basis

Analysis of the following libraries and approaches informed this plan:

| Library/Service | Key Takeaway |
|---|---|
| **FingerprintJS BotD** | 19 detectors, one-file-per-signal architecture, BotKind enum classification |
| **FingerprintJS** | 41 signal sources including math, audio, canvas, fonts, DomRect |
| **CreepJS** | Lie detection system (prototype chain + property descriptor + Proxy detection) |
| **isbot** | Regex UA matching — lightweight but only catches self-identifying bots |
| **puppeteer-extra-plugin-stealth** | 17 evasion modules (discontinued Feb 2025) — tells us exactly what to detect |
| **Cloudflare Bot Management** | JA4 TLS fingerprints, HTTP/2 fingerprints, 50+ heuristics, per-customer ML |
| **DataDome** | Picasso canvas challenge-response, 3-layer engine (direct + signature + ML) |
| **HUMAN/PerimeterX** | Sensor + enforcer + cloud detector architecture, cross-site IP reputation |
| **Apify fingerprint-suite** | Bayesian fingerprint generation — shows what consistency checks must catch |

## Current State

~35% complete. 12 collectors exist (mostly working), but the entire detection engine is empty stubs. Behavioral collectors (mouse, click, scroll) have a sync/async bug — listeners are added but data is returned before events fire. No tests, no scoring engine, no classification output, no build pipeline for the bot-detection package. No npm scripts. Good monorepo foundation (Turborepo, pnpm, TypeScript strict, ESLint).

---

## Phase 1: Foundation & Build Infrastructure

> **Priority: CRITICAL** — Nothing else works without this.

- [x] **1.1 Add build pipeline to `packages/bot-detection`**
  - Add tsup or rollup config for ESM + CJS + UMD bundles
  - Add `build`, `dev`, `lint`, `check-types` scripts to package.json
  - Configure package.json `exports` map (`main`, `module`, `types`, `browser`)
  - Add `files` field to control what gets published to npm
  - Verify turbo pipeline picks up the new build task

- [ ] **1.2 Set up test framework**
  - Install vitest (lightweight, native ESM/TS, fast)
  - Configure `vitest.config.ts` with jsdom environment for browser APIs
  - Add test scripts to bot-detection package.json
  - Add `test` task to `turbo.json` pipeline
  - Create test helpers: mock navigator, mock window, mock document

- [ ] **1.3 Add CI/GitHub Actions workflow**
  - Lint, type-check, test, build on push/PR
  - Matrix: Node 18, 20, 22
  - Cache pnpm store and turbo cache
  - Add status badges to README

- [ ] **1.4 Fix existing collector issues**
  - Fix `mouse_behavior.ts`: returns empty array because addEventListener is async but return is sync — refactor to accumulate over time window
  - Fix `click_behavior.ts`: same sync/async issue
  - Fix `scroll_behavior.ts`: same sync/async issue
  - Add cleanup/teardown for event listeners (memory leak prevention)
  - Add SSR safety checks (`typeof window/document !== 'undefined'`)

---

## Phase 2: Core Detection Engine

> **Priority: CRITICAL** — This is the heart of the library (currently 0% done).

- [ ] **2.1 Design detector interface and registry**
  - Define `Detector` interface: `{ name, category, detect(data) => Signal }`
  - Define `Signal` type: `{ detected: boolean, score: number, reason: string }`
  - Create `DetectorRegistry` class for registering/running detectors
  - Support detector categories: `automation`, `inconsistency`, `behavioral`
  - Allow user-registered custom detectors (plugin system)

- [ ] **2.2 Implement automation artifact detectors (all 19 BotD signals)**
  - `webdriver`: `navigator.webdriver === true` (+ property descriptor validation)
  - `eval_length`: `eval.toString().length` differs by engine (V8=33, SpiderMonkey=37, Webkit=37, IE=39)
  - `error_trace`: `/PhantomJS/i` regex in Error stack traces
  - `distinctive_properties`: Map of bot-specific window/navigator props, return first truthy BotKind
  - `document_element_keys`: Scan `document.documentElement` keys for "selenium", "webdriver", "driver"
  - `window_size`: `outerWidth === 0 && outerHeight === 0` (when document has focus)
  - `rtt`: `navigator.connection.rtt === 0` on non-Android desktop
  - `notification_permissions`: `Notification.permission` in unexpected state (headless = 'denied' without user action)
  - `plugins_inconsistency`: Chrome on non-Android with `plugins.length === 0`
  - `plugins_array`: Examine plugins array prototype/structure integrity
  - `languages_inconsistency`: `navigator.languages.length === 0`
  - `mime_types_consistence`: Expected MIME types missing
  - `product_sub`: Chrome/Safari/Opera must have `productSub === '20030107'`
  - `function_bind`: `Function.prototype.bind` missing (PhantomJS)
  - `process`: `process.type === 'renderer'` or `process.versions.electron`
  - `user_agent`: Parse UA for known bot identifiers
  - `app_version`: Analyze `navigator.appVersion` anomalies
  - `webgl`: Renderer contains "SwiftShader", "Mesa OffScreen", "llvmpipe"
  - `window_external`: Check `window.external` properties

- [ ] **2.3 Implement tool-specific detectors**
  - **Selenium/WebDriver:**
    - `document.$cdc_asdjflasutopfhvcZLmcfl_` (ChromeDriver leak)
    - `window.__selenium_unwrapped`, `__webdriver_evaluate`, `__driver_evaluate`
    - `document.__webdriver_script_fn`, `__selenium_evaluate`
    - `window.callSelenium`, `_selenium`
  - **Puppeteer:**
    - `window.__puppeteer_evaluation_script__`
    - HeadlessChrome UA substring
    - Missing `window.chrome.app`, `window.chrome.csi`
  - **Playwright:**
    - `window.__playwright`, `__pw_manual`
    - Playwright-specific evaluation markers
  - **PhantomJS:**
    - `window.callPhantom`, `window._phantom`
    - PhantomJS UA string
  - **Nightmare/Electron:**
    - `window.__nightmare`, `process.versions.electron`
    - `window.require` presence in browser context

- [ ] **2.4 Implement browser environment detectors**
  - `eval.toString().length` cross-referenced with browser engine
  - Error stack trace format analysis (engine-specific patterns)
  - `Function.prototype.toString` native code check
  - Proxy/getter trap detection on navigator properties (CreepJS lie detection technique)
  - `Object.getOwnPropertyDescriptor` checks on overridden props
  - iframe `contentWindow` consistency checks
  - `Performance.now()` precision analysis (reduced in automation)
  - `Date.now()` vs `performance.now()` clock skew
  - Screen dimensions vs window dimensions consistency

- [ ] **2.5 Implement CreepJS-style lie detection system**
  - Prototype chain analysis: verify native functions return `"function [name]() { [native code] }"`
  - ES6 Proxy wrapper detection on native objects
  - `.toString()` vs `Function.prototype.toString.call()` inconsistency check
  - Property descriptor validation via `Object.getOwnPropertyDescriptor`
  - Cross-attribute consistency (platform vs GPU vs fonts)

- [ ] **2.6 Implement scoring engine**
  - Define score weights per detector (configurable)
  - Implement weighted scoring aggregation
  - Define threshold levels: `definiteBot` (>0.9), `likelyBot` (>0.7), `suspicious` (>0.4), `likelyHuman` (<0.4)
  - Support custom threshold configuration
  - BotKind enum: `HeadlessChrome`, `PhantomJS`, `Nightmare`, `Selenium`, `Electron`, `NodeJS`, `Rhino`, `CouchJS`, `Sequentum`, `SlimerJS`, `CefSharp`, `Puppeteer`, `Playwright`, `Unknown`
  - Return structured result:
    ```typescript
    {
      bot: boolean;
      botKind: BotKind;
      confidence: number;    // 0-1
      reasons: string[];     // human-readable explanations
      score: number;         // raw weighted score
      signals: Signal[];     // individual detector results
    }
    ```

---

## Phase 3: Advanced Fingerprinting & Consistency Checks

> **Priority: HIGH** — Catches sophisticated bots that pass basic checks.

- [ ] **3.1 Implement Canvas fingerprinting detector**
  - Canvas 2D rendering: draw specific shapes/text/gradients, hash via `toDataURL()`
  - Detect canvas read blocking (privacy extensions)
  - Compare canvas hash stability across calls (bots may inject noise)
  - Detect `toDataURL` override/Proxy
  - Canvas noise injection detection (puppeteer-extra-stealth technique)
  - Picasso-style challenge: random drawing instructions + hash verification (DataDome approach — deterministic per OS/browser/GPU)

- [ ] **3.2 Implement WebGL fingerprinting detector**
  - `WEBGL_debug_renderer_info` extension: `UNMASKED_VENDOR_WEBGL` / `UNMASKED_RENDERER_WEBGL`
  - Detect virtual GPU: "SwiftShader", "llvmpipe", "Mesa OffScreen"
  - Extension enumeration: test 50+ WebGL extensions for capability matrix
  - Parameter probing: texture sizes, viewport limits, aliasing support (~100+ params)
  - Rendering fingerprint: draw specific 3D scene, `readPixels()`, hash output
  - Shader precision format consistency
  - Cross-reference GPU with claimed OS (Apple GPU on Windows = spoofed)

- [ ] **3.3 Implement AudioContext fingerprinting**
  - `OfflineAudioContext` + `OscillatorNode` (triangle wave, 1000 Hz)
  - Process through `DynamicsCompressorNode` (gain, knee, ratio, attack, release)
  - Sample waveform via `AnalyserNode`, hash float array output
  - `AudioContext.sampleRate` consistency
  - Detect audio processing anomalies in headless environments
  - Audio fingerprint stability check (43% better bot detection than cookies alone)

- [ ] **3.4 Implement font enumeration detector**
  - Side-channel width measurement: render text with various fonts, measure width difference vs fallback
  - Compare detected fonts vs expected for claimed OS
  - Detect font enumeration blocking (privacy extensions)

- [ ] **3.5 Implement Math function fingerprinting**
  - `Math.tan`, `Math.acos`, `Math.cosh` differ in least-significant bits across engines
  - Provides 2-4 bits of entropy even in privacy-hardened browsers
  - Cross-reference with claimed browser engine

- [ ] **3.6 Implement spatial consistency engine**
  - UA claims Windows but platform says Linux
  - Timezone doesn't match locale/language
  - Screen resolution impossible for claimed device
  - Touch support claimed but no touch events possible
  - GPU (WebGL renderer) inconsistent with claimed OS
  - `navigator.platform` vs `userAgentData.platform` mismatch
  - Language preferences vs timezone geographic mismatch
  - Color depth / pixel ratio anomalies for claimed device

- [ ] **3.7 Implement temporal consistency engine**
  - Store fingerprint hash in sessionStorage/localStorage
  - Detect fingerprint instability between page loads
  - Clock drift analysis: `performance.now()` vs `Date.now()` consistency
  - Detect timezone changes mid-session
  - Monitor for attribute changes that shouldn't change (hardware signals)

---

## Phase 4: Behavioral Analysis

> **Priority: MEDIUM-HIGH** — Catches bots that perfectly spoof environment data.

- [ ] **4.1 Redesign behavioral data collection architecture**
  - Create `BehaviorTracker` class with time-windowed accumulation
  - Implement circular buffer for event storage (bounded memory)
  - Add `start()` / `stop()` / `reset()` lifecycle methods
  - Configurable collection duration and sample rates
  - Passive collection mode (doesn't interfere with page)

- [ ] **4.2 Implement mouse movement analysis**
  - Track movement velocity, acceleration, jerk
  - Detect perfectly straight lines (synthetic movement)
  - Detect zero-duration movements (teleportation)
  - Analyze Bezier curve fitting (humans produce curves, bots don't)
  - Detect grid-aligned movement patterns
  - Calculate entropy of movement paths
  - Detect missing mousemove before click (synthetic clicks via `dispatchEvent`)

- [ ] **4.3 Implement keyboard analysis**
  - Key press/release timing distribution (humans follow log-normal distribution)
  - Detect perfectly uniform typing speed (fixed intervals = bot)
  - Detect impossible key combinations or timing
  - Analyze key hold duration patterns
  - Detect clipboard paste vs typing (where relevant)

- [ ] **4.4 Implement scroll analysis**
  - Scroll velocity and acceleration patterns
  - Detect perfectly uniform scroll increments
  - Detect scroll without preceding mouse/touch activity
  - Analyze scroll direction changes and momentum

- [ ] **4.5 Implement interaction timing analysis**
  - Time-to-first-interaction from page load
  - Click timing distribution (humans follow power law)
  - Detect suspiciously fast form filling
  - Navigation pattern analysis (sequential vs random)

---

## Phase 5: API Refinement & Developer Experience

> **Priority: HIGH** — Enterprise adoption depends on great DX.

- [ ] **5.1 Refine public API surface**
  - `load(options?) => Promise<BotDetector>`
  - `detector.detect(options?) => Promise<DetectionResult>`
  - `detector.collect() => Promise<CollectorData>`
  - `detector.getBehaviorScore() => BehaviorResult` (after observation period)
  - `detector.startBehaviorTracking()` / `stopBehaviorTracking()`
  - `detector.getFingerprint() => string` (compact hash for server-side dedup)
  - `detector.destroy() => void` (cleanup listeners)
  - Static: `BotDetector.isBot(result) => boolean` (convenience helper)

- [ ] **5.2 Implement configuration system**
  - Sensible defaults that work out of the box
  - Configurable detector enable/disable
  - Custom score weights and thresholds
  - Privacy mode: disable specific fingerprinting techniques
  - Performance mode: skip expensive detectors (canvas, audio, WebGL rendering)
  - Debug mode toggle
  - TypeScript: full generic config type with IntelliSense

- [ ] **5.3 Implement debug/telemetry mode**
  - Structured logging with levels: `debug`, `info`, `warn`, `error`
  - Log each collector result and timing
  - Log each detector evaluation and scoring
  - Visual debug panel option (injectable DOM overlay)
  - Export debug report as JSON
  - Performance timing for each detection phase

- [ ] **5.4 Implement plugin system**
  - `defineDetector()` helper for custom detectors
  - `defineCollector()` helper for custom collectors
  - Plugin interface: `{ name, collectors?, detectors?, init? }`
  - `detector.use(plugin)` registration
  - Built-in plugins: honeypot detection, cookie-less browsing detection

- [ ] **5.5 Framework integration packages**
  - `packages/bot-detection-react`: `useBotDetection()` hook
  - `packages/bot-detection-next`: middleware + client hook
  - Ensure SSR compatibility (no window access during SSR)
  - Add framework-specific examples

---

## Phase 6: Comprehensive Testing

> **Priority: CRITICAL (ongoing)** — Enterprise grade requires thorough testing.

- [ ] **6.1 Unit tests for all collectors**
  - Test each collector with mocked browser APIs
  - Test error handling when APIs are missing
  - Test SSR safety (no window/document)
  - Aim for >90% coverage on collectors

- [ ] **6.2 Unit tests for all detectors**
  - Test each detector with known bot fingerprints
  - Test each detector with known human fingerprints
  - Test edge cases: old browsers, privacy extensions, mobile
  - Test scoring accuracy with combined signals

- [ ] **6.3 Unit tests for scoring engine**
  - Test threshold classification accuracy
  - Test custom weight configurations
  - Test edge cases near threshold boundaries
  - Verify score normalization

- [ ] **6.4 Integration tests against headless browsers**
  - Puppeteer detection test (should detect)
  - Playwright detection test (should detect)
  - Selenium/ChromeDriver detection test (should detect)
  - puppeteer-extra-stealth detection test (should detect)
  - Real Chrome test (should NOT detect as bot)
  - Real Firefox test (should NOT detect as bot)
  - Real Safari test via BrowserStack/Sauce Labs (should NOT detect)

- [ ] **6.5 Performance benchmarks**
  - Measure collection time (target: <5ms)
  - Measure detection time (target: <2ms)
  - Memory usage profiling
  - Bundle size tracking (target: <15KB gzipped)
  - Add benchmark CI step to prevent regressions

- [ ] **6.6 Simulated evasion testing**
  - Create mock "stealth bot" fingerprints
  - Test detection of UA spoofing
  - Test detection of property override via Proxy
  - Test detection of canvas noise injection
  - Test detection of WebGL renderer spoofing

---

## Phase 7: Web App / Demo Enhancement

> **Priority: MEDIUM** — Important for adoption and showcasing capabilities.

- [ ] **7.1 Build interactive demo dashboard**
  - Real-time detection result display with visual indicators (bot/human/suspicious)
  - Signal-by-signal breakdown with explanations
  - Score gauge/meter visualization
  - Behavioral tracking visualization (mouse heatmap)
  - Raw collected data explorer (collapsible JSON tree)
  - Side-by-side: "your browser" vs "known bot" comparison

- [ ] **7.2 Add documentation pages to web app**
  - Getting started guide
  - API reference with examples
  - Configuration guide
  - Plugin development guide
  - Architecture overview with diagrams
  - Privacy & compliance guide (GDPR, CCPA)
  - Migration guide from FingerprintJS BotD

---

## Phase 8: Packaging & Distribution

> **Priority: HIGH** — Required for npm publish and enterprise adoption.

- [ ] **8.1 Package configuration for npm publish**
  - Finalize package.json metadata (name, description, keywords, license)
  - Set up semantic versioning with changesets or release-please
  - Configure npm provenance for supply chain security
  - Add LICENSE file (MIT or Apache-2.0)
  - Add CHANGELOG.md automation
  - Verify tree-shaking works (ESM `sideEffects: false`)

- [ ] **8.2 Bundle optimization**
  - Analyze bundle size with size-limit
  - Ensure zero runtime dependencies
  - Code-split detectors for tree-shaking (import only what you need)
  - Add subpath exports: `@cwl-botd/bot-detection/detectors`
  - Verify compatibility: Webpack 4/5, Vite, Rollup, esbuild

- [ ] **8.3 CDN distribution**
  - UMD bundle for `<script>` tag usage
  - Auto-publish to unpkg and jsdelivr via npm
  - Add CDN usage examples to docs

---

## Phase 9: Advanced / Future Enhancements

> **Priority: LOWER** — Differentiators for v2+ roadmap.

- [ ] **9.1 Server-side signal ingestion (optional companion)**
  - TLS fingerprinting (JA3/JA4 hash) via server middleware
  - HTTP/2 settings frame fingerprint (frame ordering, HPACK table size, stream priorities)
  - Request header order analysis
  - IP reputation integration hooks
  - Rate limiting signal integration

- [ ] **9.2 Machine learning scoring model**
  - Collect labeled training data from demo site
  - Train lightweight decision tree / random forest
  - Export model as JSON weights for client-side inference
  - A/B test ML model vs rule-based scoring
  - Research: LSTM, 1D-CNN, hybrid CNN+LSTM achieve 99.7%+ accuracy on behavioral data

- [ ] **9.3 Proof of Work challenge system**
  - Optional computational challenge for suspicious clients (like Cloudflare Turnstile)
  - Adjustable difficulty based on bot score
  - CAPTCHA integration hooks

- [ ] **9.4 WebRTC leak detection**
  - Detect IP leaks via WebRTC
  - Compare WebRTC IP with expected IP
  - Detect WebRTC API absence or override

- [ ] **9.5 Advanced stealth countermeasures**
  - Detect puppeteer-extra-plugin-stealth specifically:
    - `chrome.runtime` restoration detection (fake doesn't actually `connect()`)
    - iframe `contentWindow` Proxy detection (DataDome's known weakness exploit)
    - `navigator.permissions.query` override detection
    - WebGL vendor masking detection via rendering output mismatch
  - Detect undetected-chromedriver patches
  - Detect Playwright's specific CDP usage patterns
  - Detect Camoufox (modified Firefox build)
  - Detect Nodriver (avoids CDP `Runtime.enable`)

- [ ] **9.6 Additional fingerprinting signals (from FingerprintJS/CreepJS)**
  - Emoji rendering fingerprinting (pixel-level differences across OS/browser)
  - DomRect fingerprinting (element bounding box micro-variations)
  - SVG rendering fingerprinting (GPU-dependent filter effects)
  - Worker scope fingerprinting (Web Workers have different API surfaces)
  - Resistance detection (identify Brave shields, Firefox RFP, Tor Browser)
  - CSS media query fingerprinting (color-gamut, HDR, forced-colors, reduced-motion)
  - `Math.*` function precision differences across JS engines

---

## Implementation Order & Dependencies

```
Phase 1 (Foundation)       <-- START HERE, blocks everything
    |
    v
Phase 2 (Detection)        <-- Core value, highest impact
    |
    +---> Phase 5 (API/DX)     <-- Run in parallel with Phase 2
    |
    v
Phase 6 (Testing)          <-- Continuous, start with Phase 2
    |
    v
Phase 3 (Fingerprinting)   <-- Adds sophistication
    |
    v
Phase 4 (Behavioral)       <-- Catches advanced bots
    |
    v
Phase 7 (Demo)             <-- Showcases capabilities
    |
    v
Phase 8 (Distribution)     <-- Ship it
    |
    v
Phase 9 (Advanced)         <-- v2+ roadmap
```

**Estimated total:** ~65-85 individual implementation tasks across all phases.

---

## Architectural Principles

1. **ZERO DEPENDENCIES** — No runtime deps. Everything built from scratch.
2. **TREE-SHAKEABLE** — Every detector independently importable.
3. **SSR-SAFE** — Never access window/document without guards.
4. **PRIVACY-FIRST** — No PII collection. Optional fingerprinting disable.
5. **PERFORMANCE** — Sub-5ms collection, sub-2ms detection, <15KB gzipped.
6. **EXTENSIBLE** — Plugin system for custom detectors and collectors.
7. **TYPE-SAFE** — Full TypeScript with strict mode, exported types.
8. **TRANSPARENT** — Every detection decision includes human-readable reason.

---

## Key Reference Implementations

### FingerprintJS BotD
- One file per signal, each exports a detector function
- Simple boolean per detector, aggregate to `botKind`
- 19 detectors: `app_version`, `document_element_keys`, `error_trace`, `eval_length`, `function_bind`, `languages_inconsistency`, `mime_types_consistence`, `notification_permissions`, `plugins_array`, `plugins_inconsistency`, `process`, `product_sub`, `rtt`, `user_agent`, `webdriver`, `webgl`, `window_external`, `window_size`, `distinctive_properties`

### CreepJS
- Lie detection: prototype chain analysis, property descriptor validation, Proxy detection, `toString()` inconsistency
- 21+ fingerprint categories including Canvas, WebGL, SVG, Audio, Emoji, DomRect, Worker scope
- Trust score computed from: consistency, detected "lies", behavioral patterns

### puppeteer-extra-plugin-stealth (17 evasion modules = 17 things to detect)
- `chrome.app`, `chrome.csi`, `chrome.loadTimes`, `chrome.runtime`
- `iframe.contentWindow`, `media.codecs`
- `navigator.hardwareConcurrency`, `navigator.languages`, `navigator.permissions`, `navigator.plugins`, `navigator.vendor`, `navigator.webdriver`
- `sourceurl`, `user-agent-override`, `webgl.vendor`, `window.outerdimensions`, `defaultArgs`

### DataDome Picasso Technique
- Server sends random seed with N graphical instructions (curves, circles, fonts)
- Client renders on invisible Canvas, hashes output, returns hash
- Canvas output is deterministic per OS/browser/GPU combination
- Claims 100% accuracy distinguishing 52M+ device classes
