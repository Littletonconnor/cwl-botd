import { State } from '../types'
import { BotdError } from '../utils'

export function getAudioFingerprint(): Promise<{
  hash: number
  sampleRate: number
  channelCount: number
  supported: boolean
}> {
  if (typeof window === 'undefined' || typeof OfflineAudioContext === 'undefined') {
    return Promise.reject(
      new BotdError(State.Undefined, 'OfflineAudioContext is not available'),
    )
  }

  const context = new OfflineAudioContext(1, 4500, 44100)

  const oscillator = context.createOscillator()
  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(10000, context.currentTime)

  const compressor = context.createDynamicsCompressor()
  compressor.threshold.setValueAtTime(-50, context.currentTime)
  compressor.knee.setValueAtTime(40, context.currentTime)
  compressor.ratio.setValueAtTime(12, context.currentTime)
  compressor.attack.setValueAtTime(0, context.currentTime)
  compressor.release.setValueAtTime(0.25, context.currentTime)

  oscillator.connect(compressor)
  compressor.connect(context.destination)
  oscillator.start(0)

  return context
    .startRendering()
    .then((buffer) => {
      const data = buffer.getChannelData(0)
      let hash = 0
      for (let i = 4500; i >= 4000; i--) {
        hash = ((hash << 5) - hash + Math.round(data[i]! * 1000)) | 0
      }

      return {
        hash,
        sampleRate: buffer.sampleRate,
        channelCount: buffer.numberOfChannels,
        supported: true,
      }
    })
    .catch(() => {
      return {
        hash: 0,
        sampleRate: 0,
        channelCount: 0,
        supported: false,
      }
    })
}
