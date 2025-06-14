import { AbstractCollectorDict, CollectorDict, State } from './types'
import { BotdError } from './utils'

function detect() {}

async function collect<T extends AbstractCollectorDict>(collectors: T) {
  const components = {} as CollectorDict<T>
  const collectorKeys = Object.keys(collectors) as (keyof typeof collectors)[]

  await Promise.all(
    collectorKeys.map(async (collectorKey) => {
      const collectorValue = collectors[collectorKey]

      try {
        components[collectorKey] = {
          value: await collectorValue(),
          state: State.Success,
        }
      } catch (error) {
        if (error instanceof BotdError) {
          components[collectorKey] = {
            state: error.state,
            error: `${error.name}: ${error.message}`,
          }
        } else {
          components[collectorKey] = {
            state: State.Undefined,
            error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          }
        }
      }
    }),
  )

  return components
}

export { detect, collect }
