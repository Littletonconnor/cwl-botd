'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { docsNav } from '@/lib/docs-nav'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

function useHash() {
  const [hash, setHash] = useState('')

  useEffect(() => {
    setHash(window.location.hash)

    function onHashChange() {
      setHash(window.location.hash)
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return hash
}

export function DocsSidebar() {
  const pathname = usePathname()
  const hash = useHash()
  const fullPath = pathname + hash

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border px-4 py-8 lg:block">
      <nav className="space-y-6">
        {docsNav.map((section) => {
          const sectionActive = section.items.some(
            (item) => item.href.split('#')[0] === pathname
          )

          return (
            <Collapsible key={section.title} defaultOpen={section.defaultOpen || sectionActive}>
              <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {section.title}
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="size-3.5 shrink-0 rotate-[-90deg] transition-transform duration-200 [[data-panel-open]>&]:rotate-0"
                >
                  <path d="M4.47 6.47a.75.75 0 0 1 1.06 0L8 8.94l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06z" />
                </svg>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul role="list" className="mt-2 space-y-0.5">
                  {section.items.map((item) => {
                    const isHashLink = item.href.includes('#')
                    let active: boolean

                    if (isHashLink) {
                      active = fullPath === item.href
                    } else {
                      // Non-hash link is active when on that page AND no hash is set
                      // (or the hash doesn't match any sibling)
                      const onThisPage = pathname === item.href
                      const hashMatchesSibling = section.items.some(
                        (sibling) => sibling.href.includes('#') && fullPath === sibling.href
                      )
                      active = onThisPage && !hashMatchesSibling
                    }

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          prefetch={!isHashLink}
                          onClick={() => {
                            if (isHashLink) {
                              const hashPart = item.href.split('#')[1]
                              if (hashPart) {
                                window.location.hash = hashPart
                              }
                            }
                          }}
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
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </nav>
    </aside>
  )
}
