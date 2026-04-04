/**
 * Bundle size analysis.
 *
 * Standalone Node script (not a vitest bench) — run after `pnpm build`.
 * Reports raw and gzip sizes for each output file and compares against
 * the budgets defined in thresholds.ts.
 *
 * Usage:  npx tsx benchmarks/bundle-size.ts
 * Exit code 1 if any budget is exceeded.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { gzipSync } from 'node:zlib'
import { BUNDLE_SIZE_GZIP_BYTES, BUNDLE_SIZE_RAW_BYTES } from './thresholds'

const DIST_DIR = join(import.meta.dirname, '..', 'dist')

interface FileReport {
  file: string
  raw: number
  gzip: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(2)} KB`
}

function analyzeBundle(): { reports: FileReport[]; passed: boolean } {
  let files: string[]
  try {
    files = readdirSync(DIST_DIR)
  } catch {
    console.error('dist/ not found — run `pnpm build` first.')
    process.exit(1)
  }

  const jsFiles = files.filter((f) => {
    const ext = extname(f)
    return ext === '.js' || ext === '.cjs'
  })

  if (jsFiles.length === 0) {
    console.error('No .js or .cjs files found in dist/.')
    process.exit(1)
  }

  const reports: FileReport[] = []
  for (const file of jsFiles) {
    const fullPath = join(DIST_DIR, file)
    const content = readFileSync(fullPath)
    const raw = statSync(fullPath).size
    const gzip = gzipSync(content, { level: 9 }).length
    reports.push({ file, raw, gzip })
  }

  reports.sort((a, b) => a.file.localeCompare(b.file))

  let passed = true

  console.log('┌──────────────────────────────────────────────────────────────┐')
  console.log('│                     Bundle Size Report                       │')
  console.log('├──────────────────────────────────────────────────────────────┤')
  console.log('│ File                         │   Raw        │   Gzip        │')
  console.log('├──────────────────────────────────────────────────────────────┤')

  for (const r of reports) {
    const name = r.file.padEnd(29)
    const raw = formatBytes(r.raw).padStart(12)
    const gz = formatBytes(r.gzip).padStart(12)
    console.log(`│ ${name}│ ${raw} │ ${gz}  │`)
  }

  console.log('├──────────────────────────────────────────────────────────────┤')

  // Check ESM bundle specifically (index.js)
  const esm = reports.find((r) => r.file === 'index.js')
  if (esm) {
    const rawOk = esm.raw <= BUNDLE_SIZE_RAW_BYTES
    const gzipOk = esm.gzip <= BUNDLE_SIZE_GZIP_BYTES

    const rawStatus = rawOk ? 'PASS' : 'FAIL'
    const gzipStatus = gzipOk ? 'PASS' : 'FAIL'

    console.log(`│ ESM raw   ${formatBytes(esm.raw).padStart(10)} / ${formatBytes(BUNDLE_SIZE_RAW_BYTES).padStart(10)}    ${rawStatus.padStart(6)}     │`)
    console.log(`│ ESM gzip  ${formatBytes(esm.gzip).padStart(10)} / ${formatBytes(BUNDLE_SIZE_GZIP_BYTES).padStart(10)}    ${gzipStatus.padStart(6)}     │`)

    if (!rawOk || !gzipOk) passed = false
  }

  // Also report UMD
  const umd = reports.find((r) => r.file.includes('umd'))
  if (umd) {
    console.log(`│ UMD raw   ${formatBytes(umd.raw).padStart(10)}                              │`)
    console.log(`│ UMD gzip  ${formatBytes(umd.gzip).padStart(10)}                              │`)
  }

  console.log('└──────────────────────────────────────────────────────────────┘')

  return { reports, passed }
}

const { passed } = analyzeBundle()

if (!passed) {
  console.error('\nBundle size budget exceeded!')
  process.exit(1)
} else {
  console.log('\nAll bundle size budgets passed.')
}
