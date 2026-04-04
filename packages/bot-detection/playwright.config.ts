import { defineConfig } from '@playwright/test'
import path from 'node:path'

export default defineConfig({
  testDir: './integration',
  testMatch: '**/*.integration.ts',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3999',
  },
  webServer: {
    command: `node ${path.join(import.meta.dirname, 'integration', 'serve.mjs')}`,
    port: 3999,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chromium-headless',
      use: {
        browserName: 'chromium',
        headless: true,
      },
    },
  ],
})
