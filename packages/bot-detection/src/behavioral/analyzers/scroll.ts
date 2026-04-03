import type { ScrollEvent_ } from '../tracker'

export interface ScrollAnalysis {
  avgVelocity: number
  velocityVariance: number
  uniformIncrementRatio: number
  directionChanges: number
  totalScrollEvents: number
}

export function analyzeScroll(events: readonly ScrollEvent_[]): ScrollAnalysis {
  const result: ScrollAnalysis = {
    avgVelocity: 0,
    velocityVariance: 0,
    uniformIncrementRatio: 0,
    directionChanges: 0,
    totalScrollEvents: events.length,
  }

  if (events.length < 2) return result

  const velocities: number[] = []
  const increments: number[] = []
  let directionChanges = 0
  let prevDirection = 0

  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1]!
    const curr = events[i]!
    const dt = curr.timestamp - prev.timestamp
    const dy = curr.scrollY - prev.scrollY

    increments.push(Math.abs(dy))

    if (dt > 0) {
      velocities.push(Math.abs(dy) / dt)
    }

    const direction = Math.sign(dy)
    if (direction !== 0 && prevDirection !== 0 && direction !== prevDirection) {
      directionChanges++
    }
    if (direction !== 0) prevDirection = direction
  }

  result.directionChanges = directionChanges

  if (velocities.length > 0) {
    result.avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length
    const mean = result.avgVelocity
    result.velocityVariance =
      velocities.reduce((acc, v) => acc + (v - mean) ** 2, 0) / velocities.length
  }

  // Uniform increment detection
  if (increments.length > 1) {
    const avgIncrement = increments.reduce((a, b) => a + b, 0) / increments.length
    const UNIFORM_THRESHOLD = 2
    const uniformCount = increments.filter(
      (inc) => Math.abs(inc - avgIncrement) < UNIFORM_THRESHOLD,
    ).length
    result.uniformIncrementRatio = uniformCount / increments.length
  }

  return result
}
