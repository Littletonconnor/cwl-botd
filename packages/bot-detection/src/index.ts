import BotDetector from './detector'

async function load() {
  const detector = new BotDetector()
  await detector.collect()
  return detector
}

export { load }
