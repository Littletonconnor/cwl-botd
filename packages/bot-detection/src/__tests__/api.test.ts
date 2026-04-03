import { describe, it, expect, vi } from 'vitest'
import { collect } from '../api'
import { State } from '../types'
import { BotdError } from '../utils'

describe('collect', () => {
  it('wraps successful collector results with Success state', async () => {
    const collectors = {
      simple: () => 'hello',
      numeric: () => 42,
    }

    const result = await collect(collectors)

    expect(result.simple).toEqual({ state: State.Success, value: 'hello' })
    expect(result.numeric).toEqual({ state: State.Success, value: 42 })
  })

  it('handles async collectors', async () => {
    const collectors = {
      asyncValue: async () => 'async-result',
    }

    const result = await collect(collectors)

    expect(result.asyncValue).toEqual({
      state: State.Success,
      value: 'async-result',
    })
  })

  it('catches BotdError and preserves its state', async () => {
    const collectors = {
      failing: () => {
        throw new BotdError(State.NotFunction, 'test is not a function')
      },
    }

    const result = await collect(collectors)

    expect(result.failing).toEqual({
      state: State.NotFunction,
      error: 'BotdError: test is not a function',
    })
  })

  it('catches generic errors with Undefined state', async () => {
    const collectors = {
      failing: () => {
        throw new Error('something broke')
      },
    }

    const result = await collect(collectors)

    expect(result.failing).toEqual({
      state: State.Undefined,
      error: 'Error: something broke',
    })
  })

  it('handles mixed success and failure collectors', async () => {
    const collectors = {
      good: () => 'ok',
      bad: () => {
        throw new BotdError(State.Null, 'null value')
      },
    }

    const result = await collect(collectors)

    expect(result.good.state).toBe(State.Success)
    expect(result.bad.state).toBe(State.Null)
  })
})
