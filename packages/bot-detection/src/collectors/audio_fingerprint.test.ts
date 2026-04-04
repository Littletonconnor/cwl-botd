import { describe, it, expect, afterEach, vi } from 'vitest'
import { getAudioFingerprint } from './audio_fingerprint'

function createMockAudioParam() {
  return { setValueAtTime: vi.fn() }
}

function createMockAudioBuffer(sampleRate = 44100, numberOfChannels = 1) {
  const channelData = new Float32Array(4501)
  for (let i = 4000; i <= 4500; i++) {
    channelData[i] = Math.sin(i * 0.1) * 0.5
  }
  return {
    getChannelData: vi.fn().mockReturnValue(channelData),
    sampleRate,
    numberOfChannels,
  }
}

function installOfflineAudioContext(
  overrides: { startRenderingResult?: any; startRenderingError?: Error } = {},
) {
  const mockBuffer = overrides.startRenderingResult ?? createMockAudioBuffer()

  const mockOscillator = {
    type: '',
    frequency: createMockAudioParam(),
    connect: vi.fn(),
    start: vi.fn(),
  }

  const mockCompressor = {
    threshold: createMockAudioParam(),
    knee: createMockAudioParam(),
    ratio: createMockAudioParam(),
    attack: createMockAudioParam(),
    release: createMockAudioParam(),
    connect: vi.fn(),
  }

  const mockContext = {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn().mockReturnValue(mockOscillator),
    createDynamicsCompressor: vi.fn().mockReturnValue(mockCompressor),
    startRendering: overrides.startRenderingError
      ? vi.fn().mockRejectedValue(overrides.startRenderingError)
      : vi.fn().mockResolvedValue(mockBuffer),
  }

  const MockClass = vi.fn().mockImplementation(function () {
    return mockContext
  })
  vi.stubGlobal('OfflineAudioContext', MockClass)

  return { mockContext, mockOscillator, mockCompressor, mockBuffer }
}

describe('getAudioFingerprint', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a fingerprint with hash, sampleRate, channelCount, and supported flag', async () => {
    installOfflineAudioContext()

    const result = await getAudioFingerprint()
    expect(result).toEqual(
      expect.objectContaining({
        hash: expect.any(Number),
        sampleRate: 44100,
        channelCount: 1,
        supported: true,
      }),
    )
  })

  it('produces a non-zero hash from non-zero audio data', async () => {
    installOfflineAudioContext()

    const result = await getAudioFingerprint()
    expect(result.hash).not.toBe(0)
  })

  it('produces a 32-bit integer hash', async () => {
    installOfflineAudioContext()

    const result = await getAudioFingerprint()
    expect(Number.isInteger(result.hash)).toBe(true)
    expect(result.hash).toBeGreaterThanOrEqual(-2147483648)
    expect(result.hash).toBeLessThanOrEqual(2147483647)
  })

  it('produces consistent hashes for identical audio data', async () => {
    installOfflineAudioContext()
    const result1 = await getAudioFingerprint()

    installOfflineAudioContext()
    const result2 = await getAudioFingerprint()

    expect(result1.hash).toBe(result2.hash)
  })

  it('configures the oscillator and compressor correctly', async () => {
    const { mockContext, mockOscillator, mockCompressor } = installOfflineAudioContext()

    await getAudioFingerprint()

    expect(mockOscillator.type).toBe('triangle')
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(10000, 0)
    expect(mockCompressor.threshold.setValueAtTime).toHaveBeenCalledWith(-50, 0)
    expect(mockCompressor.knee.setValueAtTime).toHaveBeenCalledWith(40, 0)
    expect(mockCompressor.ratio.setValueAtTime).toHaveBeenCalledWith(12, 0)
    expect(mockCompressor.attack.setValueAtTime).toHaveBeenCalledWith(0, 0)
    expect(mockCompressor.release.setValueAtTime).toHaveBeenCalledWith(0.25, 0)
    expect(mockOscillator.connect).toHaveBeenCalledWith(mockCompressor)
    expect(mockCompressor.connect).toHaveBeenCalledWith(mockContext.destination)
    expect(mockOscillator.start).toHaveBeenCalledWith(0)
    expect(mockContext.startRendering).toHaveBeenCalled()
  })

  it('creates OfflineAudioContext with correct parameters', async () => {
    installOfflineAudioContext()

    await getAudioFingerprint()

    expect(OfflineAudioContext).toHaveBeenCalledWith(1, 4500, 44100)
  })

  it('rejects with BotdError when OfflineAudioContext is not available', async () => {
    vi.stubGlobal('OfflineAudioContext', undefined)

    await expect(getAudioFingerprint()).rejects.toThrow('OfflineAudioContext is not available')
    await expect(getAudioFingerprint()).rejects.toMatchObject({
      name: 'BotdError',
      state: 'Undefined',
    })
  })

  it('rejects with BotdError when window is undefined', async () => {
    const originalWindow = globalThis.window
    try {
      // @ts-expect-error
      delete globalThis.window
      await expect(getAudioFingerprint()).rejects.toThrow('OfflineAudioContext is not available')
    } finally {
      globalThis.window = originalWindow
    }
  })

  it('returns fallback result when startRendering rejects', async () => {
    installOfflineAudioContext({ startRenderingError: new Error('rendering failed') })

    const result = await getAudioFingerprint()
    expect(result).toEqual({
      hash: 0,
      sampleRate: 0,
      channelCount: 0,
      supported: false,
    })
  })

  it('returns fallback result when getChannelData throws', async () => {
    const brokenBuffer = {
      getChannelData: vi.fn().mockImplementation(() => {
        throw new Error('channel data unavailable')
      }),
      sampleRate: 44100,
      numberOfChannels: 1,
    }
    installOfflineAudioContext({ startRenderingResult: brokenBuffer })

    const result = await getAudioFingerprint()
    expect(result).toEqual({
      hash: 0,
      sampleRate: 0,
      channelCount: 0,
      supported: false,
    })
  })

  it('returns hash of zero when all audio samples are zero', async () => {
    const silentBuffer = {
      getChannelData: vi.fn().mockReturnValue(new Float32Array(4501)),
      sampleRate: 44100,
      numberOfChannels: 1,
    }
    installOfflineAudioContext({ startRenderingResult: silentBuffer })

    const result = await getAudioFingerprint()
    expect(result.hash).toBe(0)
    expect(result.supported).toBe(true)
  })

  it('reflects the buffer sampleRate and numberOfChannels in the result', async () => {
    const customBuffer = createMockAudioBuffer(48000, 2)
    installOfflineAudioContext({ startRenderingResult: customBuffer })

    const result = await getAudioFingerprint()
    expect(result.sampleRate).toBe(48000)
    expect(result.channelCount).toBe(2)
  })
})
