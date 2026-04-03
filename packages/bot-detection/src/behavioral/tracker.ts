export interface MouseEvent_  {
  timestamp: number
  x: number
  y: number
}

export interface ClickEvent_ {
  timestamp: number
  x: number
  y: number
  target: string | null
}

export interface KeyEvent_ {
  timestamp: number
  key: string
  type: 'keydown' | 'keyup'
}

export interface ScrollEvent_ {
  timestamp: number
  scrollY: number
}

export interface BehaviorSnapshot {
  mouse: readonly MouseEvent_[]
  clicks: readonly ClickEvent_[]
  keys: readonly KeyEvent_[]
  scrolls: readonly ScrollEvent_[]
  duration: number
  startedAt: number
}

export interface BehaviorTrackerOptions {
  maxEvents?: number
  sampleRate?: number
}

const DEFAULT_MAX_EVENTS = 500
const DEFAULT_SAMPLE_RATE = 1

class CircularBuffer<T> {
  private buffer: T[]
  private head = 0
  private count = 0

  constructor(private capacity: number) {
    this.buffer = new Array(capacity)
  }

  push(item: T): void {
    this.buffer[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this.count < this.capacity) this.count++
  }

  toArray(): T[] {
    if (this.count === 0) return []
    if (this.count < this.capacity) {
      return this.buffer.slice(0, this.count)
    }
    return [...this.buffer.slice(this.head), ...this.buffer.slice(0, this.head)]
  }

  get length(): number {
    return this.count
  }

  clear(): void {
    this.head = 0
    this.count = 0
  }
}

export class BehaviorTracker {
  private mouseBuffer: CircularBuffer<MouseEvent_>
  private clickBuffer: CircularBuffer<ClickEvent_>
  private keyBuffer: CircularBuffer<KeyEvent_>
  private scrollBuffer: CircularBuffer<ScrollEvent_>

  private running = false
  private startedAt = 0
  private sampleCounter = 0
  private sampleRate: number

  private boundMouseHandler: (e: MouseEvent) => void
  private boundClickHandler: (e: MouseEvent) => void
  private boundKeydownHandler: (e: KeyboardEvent) => void
  private boundKeyupHandler: (e: KeyboardEvent) => void
  private boundScrollHandler: () => void

  constructor(options?: BehaviorTrackerOptions) {
    const maxEvents = options?.maxEvents ?? DEFAULT_MAX_EVENTS
    this.sampleRate = options?.sampleRate ?? DEFAULT_SAMPLE_RATE

    this.mouseBuffer = new CircularBuffer(maxEvents)
    this.clickBuffer = new CircularBuffer(maxEvents)
    this.keyBuffer = new CircularBuffer(maxEvents)
    this.scrollBuffer = new CircularBuffer(maxEvents)

    this.boundMouseHandler = this.onMouseMove.bind(this)
    this.boundClickHandler = this.onClick.bind(this)
    this.boundKeydownHandler = this.onKeydown.bind(this)
    this.boundKeyupHandler = this.onKeyup.bind(this)
    this.boundScrollHandler = this.onScroll.bind(this)
  }

  start(): void {
    if (this.running) return
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    this.running = true
    this.startedAt = Date.now()

    document.addEventListener('mousemove', this.boundMouseHandler, { passive: true })
    document.addEventListener('click', this.boundClickHandler, { passive: true })
    document.addEventListener('keydown', this.boundKeydownHandler, { passive: true })
    document.addEventListener('keyup', this.boundKeyupHandler, { passive: true })
    window.addEventListener('scroll', this.boundScrollHandler, { passive: true })
  }

  stop(): void {
    if (!this.running) return
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    this.running = false

    document.removeEventListener('mousemove', this.boundMouseHandler)
    document.removeEventListener('click', this.boundClickHandler)
    document.removeEventListener('keydown', this.boundKeydownHandler)
    document.removeEventListener('keyup', this.boundKeyupHandler)
    window.removeEventListener('scroll', this.boundScrollHandler)
  }

  reset(): void {
    this.stop()
    this.mouseBuffer.clear()
    this.clickBuffer.clear()
    this.keyBuffer.clear()
    this.scrollBuffer.clear()
    this.startedAt = 0
    this.sampleCounter = 0
  }

  snapshot(): BehaviorSnapshot {
    return {
      mouse: this.mouseBuffer.toArray(),
      clicks: this.clickBuffer.toArray(),
      keys: this.keyBuffer.toArray(),
      scrolls: this.scrollBuffer.toArray(),
      duration: this.startedAt > 0 ? Date.now() - this.startedAt : 0,
      startedAt: this.startedAt,
    }
  }

  isRunning(): boolean {
    return this.running
  }

  private onMouseMove(e: MouseEvent): void {
    this.sampleCounter++
    if (this.sampleRate > 1 && this.sampleCounter % this.sampleRate !== 0) return

    this.mouseBuffer.push({
      timestamp: Date.now(),
      x: e.clientX,
      y: e.clientY,
    })
  }

  private onClick(e: MouseEvent): void {
    this.clickBuffer.push({
      timestamp: Date.now(),
      x: e.clientX,
      y: e.clientY,
      target: e.target instanceof Element ? e.target.tagName : null,
    })
  }

  private onKeydown(e: KeyboardEvent): void {
    this.keyBuffer.push({
      timestamp: Date.now(),
      key: e.key,
      type: 'keydown',
    })
  }

  private onKeyup(e: KeyboardEvent): void {
    this.keyBuffer.push({
      timestamp: Date.now(),
      key: e.key,
      type: 'keyup',
    })
  }

  private onScroll(): void {
    this.scrollBuffer.push({
      timestamp: Date.now(),
      scrollY: window.scrollY,
    })
  }
}
