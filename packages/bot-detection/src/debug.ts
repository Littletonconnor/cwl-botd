export interface DebugLogEntry {
  timestamp: number
  phase: 'collect' | 'detect' | 'score' | 'behavior'
  source: string
  message: string
  data?: unknown
  duration?: number
}

export interface CollectorDebugInfo {
  name: string
  state: string
  duration: number
  value?: unknown
  error?: string
}

export interface DetectorDebugInfo {
  name: string
  category: string
  detected: boolean
  score: number
  reason: string
  botKind?: string
  duration: number
}

export interface ScoringDebugInfo {
  threshold: number
  weights: Record<string, number>
  normalizedScore: number
  confidence: number
  totalWeight: number
  weightedScore: number
  bot: boolean
  botKind: string
}

export interface DebugReport {
  timestamp: number
  totalDuration: number
  collectors: CollectorDebugInfo[]
  detectors: DetectorDebugInfo[]
  scoring: ScoringDebugInfo | null
  signals: { detected: number; total: number }
  config: {
    disabledCollectors: string[]
    disabledDetectors: string[]
    privacy: Record<string, boolean>
    performance: Record<string, boolean>
  }
  log: DebugLogEntry[]
}

export class DebugLogger {
  private entries: DebugLogEntry[] = []
  private collectors: CollectorDebugInfo[] = []
  private detectors: DetectorDebugInfo[] = []
  private scoring: ScoringDebugInfo | null = null
  private startTime = 0

  start(): void {
    this.startTime = performance.now()
    this.entries = []
    this.collectors = []
    this.detectors = []
    this.scoring = null
  }

  log(phase: DebugLogEntry['phase'], source: string, message: string, data?: unknown, duration?: number): void {
    this.entries.push({
      timestamp: performance.now() - this.startTime,
      phase,
      source,
      message,
      data,
      duration,
    })
  }

  addCollectorResult(info: CollectorDebugInfo): void {
    this.collectors.push(info)
  }

  addDetectorResult(info: DetectorDebugInfo): void {
    this.detectors.push(info)
  }

  setScoringResult(info: ScoringDebugInfo): void {
    this.scoring = info
  }

  buildReport(config: DebugReport['config']): DebugReport {
    const detected = this.detectors.filter((d) => d.detected).length
    return {
      timestamp: Date.now(),
      totalDuration: performance.now() - this.startTime,
      collectors: this.collectors,
      detectors: this.detectors,
      scoring: this.scoring,
      signals: { detected, total: this.detectors.length },
      config,
      log: this.entries,
    }
  }

  reset(): void {
    this.entries = []
    this.collectors = []
    this.detectors = []
    this.scoring = null
    this.startTime = 0
  }
}
