# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Turborepo monorepo with a Next.js web application and shared packages for building a bot detection library. The project uses TypeScript throughout and includes shared ESLint and TypeScript configurations.

## Bot Detection Library Requirements

The main goal is to develop a robust bot detection npm library inspired by FingerprintJS BotD with the following functional requirements:

### 1. Environment Data Collection

- Gather browser fingerprinting attributes: userAgent, platform, languages, plugins, WebGL, Canvas, fonts, touch support, hardware concurrency, memory, etc.
- Detect automation-specific artifacts: presence of `navigator.webdriver`, unusual permissions API state, `window.chrome` undefined or spoofed, missing headless browser flags
- Record network/request metadata: IP address, TLS fingerprint, request headers anomalies

### 2. Bot Engine & Automation Tool Detection

- Identify known automation tools: Puppeteer, Playwright, Selenium, PhantomJS, Nightmare, Electron, SlimerJS
- Detect stealth or undetected versions using indirect signals—e.g., missing indicators from typical headless flags

### 3. Behavioral & Interaction Signals

- (Optional) Mouse and keyboard biometrics: movement velocity, click timing, randomness—detect synthetic or overly-regular patterns
- Detect usage of browser automation methods like synthetic events without actual user gestures

### 4. Fingerprint Consistency Checking

- Perform spatial consistency checks: ensure interrelated attributes make sense (e.g. timezone aligns with locale or language)
- Perform temporal consistency checks across page loads/sessions: stable clocks, device identifiers, etc.

### 5. Heuristics & Rule-Based Scoring

- Assign scores for suspicious signals (e.g. Headless + `webdriver` flag + missing plugins = high bot risk)
- Allow flexible scoring thresholds or rule-engine configuration for balancing sensitivity

### 6. Bot Classification Feedback

- Return a structured detection result:

```js
{
  bot: boolean,
  botKind: 'headless' | 'selenium' | 'puppeteer' | 'unknown',
  reasons: string[],
  score?: number
}
```

- Provide reasons for the classification for transparency and debugging

### 7. Modular and Extensible Architecture

- Expose plugin hooks for adding custom detectors (e.g. honeypot detection, cookie-less browsing)
- Allow user-supplied custom anomaly rules (e.g. attribute mismatches)

### 8. Performance & Privacy Considerations

- Lightweight execution (sub‑5 ms data collection), non-blocking
- Run fully client-side; no server round-trip required
- Respect privacy: no PII collection, optionally disable fingerprinting if blocked

### 9. Debugging & Telemetry Support

- Offer a debug mode that logs collected attributes and rule triggers
- Optionally export a compact fingerprint hash for server-side verification or deduplication

### 10. API & Integration Design

- Easy-to-consume API:

```js
import { load } from 'your-botd-lib'
const detector = await load()
const result = await detector.detect({ debug: true })
```

- Compatibility with common frameworks (React, Next.js, plain JS)
- Bundled types for TypeScript, minimal dependencies

### 11. Testing & Resilience

- Unit tests for each detector module
- Integration testing against known headless environments and simulated evasive bots
- Simulated inconsistent fingerprint scenarios to validate consistency detection

### 12. Documentation & Best Practices

- Provide clear explanation of signals, scoring, and configuration
- Include a guide on privacy and compliance (GDPR, CCPA)
- Offer migration guide and usage patterns

## Architecture

### Workspace Structure

- `apps/web/` - Next.js application (main app)
- `packages/bot-detection/` - Bot detection functionality (referenced in web app)
- `packages/eslint-config/` - Shared ESLint configurations with exports for base, Next.js, and React
- `packages/typescript-config/` - Shared TypeScript configurations for different project types

### Key Technologies

- **Turborepo**: Monorepo build system with caching and task orchestration
- **Next.js 15**: React framework with Turbopack for development
- **TypeScript 5.8**: Type system across all packages
- **pnpm**: Package manager with workspace support
- **ESLint**: Linting with shared configurations

## Development Commands

### Root Level Commands

```bash
# Start development servers for all apps
pnpm dev

# Build all apps and packages
pnpm build

# Run linting across all packages
pnpm lint

# Run type checking across all packages
pnpm check-types

# Format code with Prettier
pnpm format
```

### App-Specific Commands

```bash
# Run specific app (from root)
turbo run dev --filter=web

# Or work directly in app directory
cd apps/web
pnpm dev        # Starts on port 3000 with Turbopack
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # Lint with max 0 warnings
pnpm check-types # TypeScript type checking
```

## Build System

Turborepo manages task dependencies and caching:

- `build` tasks depend on upstream package builds (`^build`)
- `dev` tasks are persistent and not cached
- `lint` and `check-types` follow dependency order
- Builds output to `.next/` with cache exclusions

## Package Management

- Uses pnpm workspaces with packages in `apps/*` and `packages/*`
- Shared packages use `workspace:*` protocol for internal dependencies
- Node.js 18+ required

## Shared Configurations

### ESLint Config (@cwl-botd/eslint-config)

- `./base` - Base ESLint configuration
- `./next-js` - Next.js specific rules
- `./react-internal` - Internal React component rules

### TypeScript Config (@cwl-botd/typescript-config)

- `base.json` - Base TypeScript configuration
- `nextjs.json` - Next.js specific settings
- `react-library.json` - React library configuration
