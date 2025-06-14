import { State, StateValue } from '../types'

export class BotdError extends Error {
  state: StateValue

  constructor(state: StateValue, message: string) {
    super(message)
    this.state = state
    this.name = 'BotdError'
    Object.setPrototypeOf(this, BotdError.prototype)
  }
}
