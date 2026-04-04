'use client'

import { useEffect, useState } from 'react'
import { load, type BotDetector, type DetectionResult } from '@cwl-botd/bot-detection'
import { Badge } from '@/components/ui/badge'
import { CodeBlockClient } from '@/components/code-block-client'
import { cn } from '@/lib/utils'

export default function DemoPage() {
  const [detector, setDetector] = useState<BotDetector | null>(null)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [collections, setCollections] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'result' | 'signals' | 'collections' | 'debug'>('result')

  useEffect(() => {
    async function init() {
      const d = await load({ debug: true, monitoring: true })
      const r = await d.detect()
      setDetector(d)
      setResult(r)
      setCollections(d.getCollections() as Record<string, unknown>)
      setLoading(false)
    }
    init()
  }, [])

  async function rerun() {
    if (!detector) return
    setLoading(true)
    const r = await detector.detect()
    setResult(r)
    setCollections(detector.getCollections() as Record<string, unknown>)
    setLoading(false)
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground">Live Demo</h1>
      <p className="mt-4 max-w-[56ch] text-base text-pretty text-muted-foreground">
        Running BotD in your browser right now. The results below are from your actual environment.
      </p>

      {/* Verdict */}
      <div className="mt-8 rounded-lg border border-border p-6">
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="size-3 animate-pulse rounded-full bg-muted-foreground" />
            <span className="text-sm text-muted-foreground">Analyzing...</span>
          </div>
        ) : result ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex size-10 items-center justify-center rounded-full',
                result.bot ? 'bg-red-100 dark:bg-red-950' : 'bg-emerald-100 dark:bg-emerald-950'
              )}>
                <span className={cn(
                  'text-lg',
                  result.bot ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                )}>
                  {result.bot ? '!' : '✓'}
                </span>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {result.bot ? 'Bot Detected' : 'Human'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.botKind !== 'Unknown' ? result.botKind : 'No automation detected'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="tabular-nums text-2xl font-semibold text-foreground">
                {(result.score * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">confidence</p>
            </div>
          </div>
        ) : null}
        {result && result.reasons.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {result.reasons.map((reason, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {reason}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Rerun */}
      <div className="mt-4">
        <button
          onClick={rerun}
          disabled={loading}
          className="inline-flex h-8 items-center rounded-lg bg-sky-500 px-3 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
        >
          Re-run detection
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-border">
        {(['result', 'signals', 'collections', 'debug'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'cursor-pointer border-b-2 px-3 py-2 text-sm font-medium capitalize',
              activeTab === tab
                ? 'border-sky-500 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'result' && result && (
          <CodeBlockClient
            code={JSON.stringify(result, null, 2)}
            language="json"
            filename="DetectionResult"
          />
        )}

        {activeTab === 'signals' && result && (
          <div className="space-y-2">
            {result.signals.map((signal, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-between rounded-lg border border-border px-4 py-3',
                  signal.detected ? 'bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'size-2 shrink-0 rounded-full',
                    signal.detected ? 'bg-red-500' : 'bg-emerald-500'
                  )} />
                  <span className="text-sm text-foreground">{signal.reason}</span>
                </div>
                <span className="tabular-nums font-mono text-xs text-muted-foreground">
                  {signal.score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'collections' && collections && (
          <CodeBlockClient
            code={JSON.stringify(collections, null, 2)}
            language="json"
            filename="CollectorDict"
          />
        )}

        {activeTab === 'debug' && detector && (
          <CodeBlockClient
            code={detector.exportDebugJSON()}
            language="json"
            filename="DebugReport"
          />
        )}
      </div>
    </>
  )
}
