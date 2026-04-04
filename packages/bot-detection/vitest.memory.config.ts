import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['benchmarks/memory.bench.ts'],
  },
})
