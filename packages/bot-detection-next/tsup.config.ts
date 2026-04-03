import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/middleware.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  target: 'es2022',
  splitting: false,
  treeshake: true,
  external: ['react', 'next', '@cwl-botd/bot-detection', '@cwl-botd/bot-detection-react'],
})
