/**
 * Detection phase benchmarks.
 *
 * Measures time to run all detectors against pre-collected data and score
 * the results. Target: < 2 ms for registry.run() + score().
 */

import { bench, describe } from 'vitest'
import { score } from '../src/detectors/scoring'
import { createHumanCollectorData, createBotCollectorData, createRegistry } from './setup'
import { DETECTION_TIME_MS } from './thresholds'

const humanData = createHumanCollectorData()
const botData = createBotCollectorData()

describe(`Detection — registry + scoring (target: <${DETECTION_TIME_MS}ms)`, () => {
  bench('human profile', () => {
    const registry = createRegistry()
    const signals = registry.run(humanData)
    score(signals)
  })

  bench('bot profile', () => {
    const registry = createRegistry()
    const signals = registry.run(botData)
    score(signals)
  })
})

describe('Detection — registry.run() only', () => {
  bench('human profile — run detectors', () => {
    const registry = createRegistry()
    registry.run(humanData)
  })

  bench('bot profile — run detectors', () => {
    const registry = createRegistry()
    registry.run(botData)
  })
})

describe('Detection — scoring only', () => {
  const registry = createRegistry()
  const humanSignals = registry.run(humanData)
  const botSignals = registry.run(botData)

  bench('score human signals', () => {
    score(humanSignals)
  })

  bench('score bot signals', () => {
    score(botSignals)
  })
})
