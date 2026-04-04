'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getBreadcrumbs } from '@/lib/docs-nav'

export function Breadcrumbs() {
  const pathname = usePathname()
  const crumbs = getBreadcrumbs(pathname)

  if (crumbs.length <= 1) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol role="list" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {crumbs.map((crumb, i) => (
          <li key={`${i}-${crumb.href}`} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg viewBox="0 0 16 16" fill="currentColor" className="size-3 shrink-0">
                <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06" />
              </svg>
            )}
            {i === crumbs.length - 1 ? (
              <span className="text-foreground">{crumb.title}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
