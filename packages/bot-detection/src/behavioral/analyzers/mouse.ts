import type { MouseEvent_, ClickEvent_ } from '../tracker'

export interface MouseAnalysis {
  straightLineRatio: number
  teleportCount: number
  avgVelocity: number
  velocityVariance: number
  avgAcceleration: number
  directionChanges: number
  gridAlignedRatio: number
  entropyScore: number
  clicksWithoutMove: number
  totalMoves: number
}

export function analyzeMouseMovement(
  moves: readonly MouseEvent_[],
  clicks: readonly ClickEvent_[],
): MouseAnalysis {
  const result: MouseAnalysis = {
    straightLineRatio: 0,
    teleportCount: 0,
    avgVelocity: 0,
    velocityVariance: 0,
    avgAcceleration: 0,
    directionChanges: 0,
    gridAlignedRatio: 0,
    entropyScore: 1,
    clicksWithoutMove: 0,
    totalMoves: moves.length,
  }

  if (moves.length < 3) return result

  const velocities: number[] = []
  const angles: number[] = []
  let straightSegments = 0
  let totalSegments = 0
  let gridAligned = 0

  for (let i = 1; i < moves.length; i++) {
    const prev = moves[i - 1]!
    const curr = moves[i]!
    const dt = curr.timestamp - prev.timestamp
    const dx = curr.x - prev.x
    const dy = curr.y - prev.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dt > 0) {
      velocities.push(dist / dt)
    }

    if (dt > 0 && dist > 500 && dist / dt > 50) {
      result.teleportCount++
    }

    angles.push(Math.atan2(dy, dx))

    if (dx === 0 || dy === 0) {
      gridAligned++
    }
  }

  // Straight-line detection: check 3-point collinearity
  for (let i = 2; i < moves.length; i++) {
    const a = moves[i - 2]!
    const b = moves[i - 1]!
    const c = moves[i]!

    const crossProduct = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
    totalSegments++
    if (Math.abs(crossProduct) < 10) {
      straightSegments++
    }
  }

  if (totalSegments > 0) {
    result.straightLineRatio = straightSegments / totalSegments
  }

  if (velocities.length > 0) {
    result.avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length
    const mean = result.avgVelocity
    result.velocityVariance =
      velocities.reduce((acc, v) => acc + (v - mean) ** 2, 0) / velocities.length
  }

  // Acceleration
  if (velocities.length > 1) {
    let totalAccel = 0
    for (let i = 1; i < velocities.length; i++) {
      totalAccel += Math.abs(velocities[i]! - velocities[i - 1]!)
    }
    result.avgAcceleration = totalAccel / (velocities.length - 1)
  }

  // Direction changes
  if (angles.length > 1) {
    for (let i = 1; i < angles.length; i++) {
      let diff = Math.abs(angles[i]! - angles[i - 1]!)
      if (diff > Math.PI) diff = 2 * Math.PI - diff
      if (diff > Math.PI / 6) {
        result.directionChanges++
      }
    }
  }

  result.gridAlignedRatio = moves.length > 1 ? gridAligned / (moves.length - 1) : 0

  // Entropy: bin angle values and compute Shannon entropy
  result.entropyScore = computeAngleEntropy(angles)

  // Clicks without preceding mousemove (synthetic click detection)
  result.clicksWithoutMove = countClicksWithoutMove(moves, clicks)

  return result
}

function computeAngleEntropy(angles: number[]): number {
  if (angles.length < 2) return 0

  const bins = 8
  const counts = new Array(bins).fill(0) as number[]

  for (const angle of angles) {
    let normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    const bin = Math.min(Math.floor(normalized / (2 * Math.PI / bins)), bins - 1)
    counts[bin]!++
  }

  let entropy = 0
  for (const count of counts) {
    if (count > 0) {
      const p = count / angles.length
      entropy -= p * Math.log2(p)
    }
  }

  return entropy / Math.log2(bins)
}

function countClicksWithoutMove(
  moves: readonly MouseEvent_[],
  clicks: readonly ClickEvent_[],
): number {
  let count = 0
  const PROXIMITY_MS = 500
  const PROXIMITY_PX = 50

  for (const click of clicks) {
    const hasNearbyMove = moves.some((move) => {
      const timeDiff = Math.abs(click.timestamp - move.timestamp)
      const dist = Math.sqrt((click.x - move.x) ** 2 + (click.y - move.y) ** 2)
      return timeDiff < PROXIMITY_MS && dist < PROXIMITY_PX
    })

    if (!hasNearbyMove) {
      count++
    }
  }

  return count
}
