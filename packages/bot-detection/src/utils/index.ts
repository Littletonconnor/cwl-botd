export class BotdError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BotdError'
  }
}
