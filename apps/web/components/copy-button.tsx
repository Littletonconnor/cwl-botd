'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150',
        copied
          ? 'text-emerald-500'
          : 'text-muted-foreground/60 hover:text-muted-foreground',
        className
      )}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      <div className="relative size-4">
        {/* Copy icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            'absolute inset-0 transition-all duration-200',
            copied ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
          )}
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {/* Check icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            'absolute inset-0 transition-all duration-200',
            copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          )}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </button>
  )
}
