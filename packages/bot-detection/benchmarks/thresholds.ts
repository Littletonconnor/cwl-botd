/**
 * Performance budget constants for the bot-detection library.
 *
 * Each threshold represents the maximum acceptable time (in milliseconds)
 * or size (in bytes) for a given operation. Benchmarks reference these
 * constants so budgets are defined in exactly one place.
 */

/** Maximum time for collecting all browser signals (ms). */
export const COLLECTION_TIME_MS = 5

/** Maximum time for running all detectors + scoring (ms). */
export const DETECTION_TIME_MS = 2

/** Maximum time for a full load() → detect() pipeline (ms). */
export const PIPELINE_TIME_MS = 10

/** Maximum gzipped bundle size for the ESM build (bytes). */
export const BUNDLE_SIZE_GZIP_BYTES = 30 * 1024

/** Maximum raw (uncompressed) bundle size for the ESM build (bytes). */
export const BUNDLE_SIZE_RAW_BYTES = 120 * 1024

/** Maximum heap growth during a single detect() call (bytes). */
export const DETECTION_HEAP_BYTES = 2 * 1024 * 1024

/** Maximum heap growth during a full load() + detect() cycle (bytes). */
export const PIPELINE_HEAP_BYTES = 4 * 1024 * 1024
