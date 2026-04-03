import type { BehaviorSnapshot } from '../behavioral/tracker'

let pendingSnapshot: BehaviorSnapshot | null = null

export function setBehaviorSnapshot(snapshot: BehaviorSnapshot): void {
  pendingSnapshot = snapshot
}

export function getBehaviorSnapshot(): Promise<BehaviorSnapshot> {
  if (pendingSnapshot) {
    const snapshot = pendingSnapshot
    pendingSnapshot = null
    return Promise.resolve(snapshot)
  }

  return Promise.resolve({
    mouse: [],
    clicks: [],
    keys: [],
    scrolls: [],
    duration: 0,
    startedAt: 0,
  })
}
