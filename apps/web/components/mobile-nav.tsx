'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { docsNav } from '@/lib/docs-nav'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const basePath = pathname.split('#')[0]

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground lg:hidden" aria-label="Open navigation">
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
          <path d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75m0 3.5A.75.75 0 0 1 2.75 7.5h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8.25m0 3.5a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75" />
        </svg>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto px-4 pt-8">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <nav className="space-y-6">
          {docsNav.map((section) => (
            <div key={section.title}>
              <p className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {section.title}
              </p>
              <ul role="list" className="mt-2 space-y-0.5">
                {section.items.map((item) => {
                  const itemBase = item.href.split('#')[0]
                  const active = itemBase === basePath

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={!item.href.includes('#')}
                        className={cn(
                          'block rounded-md px-2 py-1.5 text-sm',
                          active
                            ? 'bg-sky-50 font-medium text-sky-600 dark:bg-sky-950/50 dark:text-sky-400'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {item.isCode ? (
                          <code className="font-mono text-[0.8125rem]">{item.title}</code>
                        ) : (
                          item.title
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
