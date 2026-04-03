import { defineConfig } from 'tsup'

export default defineConfig([
  // ESM and CJS builds
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    target: 'es2022',
    splitting: false,
    treeshake: true,
  },
  // UMD build for <script> tag usage
  {
    entry: { 'bot-detection.umd': 'src/index.ts' },
    format: ['iife'],
    outDir: 'dist',
    globalName: 'BotDetection',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    sourcemap: true,
  },
])
