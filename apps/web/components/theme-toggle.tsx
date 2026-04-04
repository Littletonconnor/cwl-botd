'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="size-9" />
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
          <path d="M8 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 1M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0m.97-3.53a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0M8 12.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V13a.75.75 0 0 1 .75-.75m4.25-4.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H13a.75.75 0 0 1-.75-.75M1 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 1 8m9.44 2.53a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06m-6.94 1.06a.75.75 0 0 1 1.06-1.06l1.06 1.06a.75.75 0 1 1-1.06 1.06zm1.06-8.12a.75.75 0 0 1 0 1.06L3.5 5.59a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
          <path d="M14.438 10.148c.19-.425-.321-.787-.748-.601A5.5 5.5 0 0 1 6.453 2.31c.186-.427-.176-.938-.6-.748a6.501 6.501 0 1 0 8.585 8.586" />
        </svg>
      )}
    </button>
  )
}
