import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['benchmarks/**/*.bench.ts'],
    exclude: ['benchmarks/memory.bench.ts'],
    benchmark: {
      include: ['benchmarks/**/*.bench.ts'],
      exclude: ['benchmarks/memory.bench.ts'],
    },
  },
})
