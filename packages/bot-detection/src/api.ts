import type { DebugLogger } from './debug'
import { createDefaultRegistry, score } from './detectors'
import type { DetectionResult } from './detectors/types'
import type { ScoringOptions } from './detectors/scoring'
import type { RegistryRunOptions } from './detectors/registry'
import { AbstractCollectorDict, CollectorDict, State } from './types'
import { BotdError } from './utils'

const defaultRegistry = createDefaultRegistry()

function detect(
  data: CollectorDict,
  options?: ScoringOptions,
  detectorFilter?: RegistryRunOptions,
  debugLogger?: DebugLogger,
): DetectionResult {
  const signals = defaultRegistry.run(data, detectorFilter, debugLogger)
  return score(signals, options, debugLogger)
}

async function collect<T extends AbstractCollectorDict>(collectors: T, debugLogger?: DebugLogger) {
  const components = {} as CollectorDict<T>
  const collectorKeys = Object.keys(collectors) as (keyof typeof collectors)[]

  await Promise.all(
    collectorKeys.map(async (collectorKey) => {
      const key = collectorKey as string
      const collectorValue = collectors[collectorKey]
      const start = debugLogger ? performance.now() : 0

      try {
        const value = await collectorValue()
        components[collectorKey] = {
          value,
          state: State.Success,
        }

        if (debugLogger) {
          const duration = performance.now() - start
          debugLogger.addCollectorResult({ name: key, state: State.Success, duration, value })
          debugLogger.log('collect', key, 'collected successfully', undefined, duration)
        }
      } catch (error) {
        if (error instanceof BotdError && error.state !== State.Success) {
          components[collectorKey] = {
            state: error.state,
            error: `${error.name}: ${error.message}`,
          }

          if (debugLogger) {
            const duration = performance.now() - start
            debugLogger.addCollectorResult({ name: key, state: error.state, duration, error: `${error.name}: ${error.message}` })
            debugLogger.log('collect', key, `failed: ${error.message}`, undefined, duration)
          }
        } else {
          const errMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
          components[collectorKey] = {
            state: State.Undefined,
            error: errMsg,
          }

          if (debugLogger) {
            const duration = performance.now() - start
            debugLogger.addCollectorResult({ name: key, state: State.Undefined, duration, error: errMsg })
            debugLogger.log('collect', key, `failed: ${errMsg}`, undefined, duration)
          }
        }
      }
    }),
  )

  return components
}

export { detect, collect }
