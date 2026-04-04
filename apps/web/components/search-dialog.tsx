'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Fuse from 'fuse.js'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { searchIndex, type SearchItem } from '@/lib/search-data'

export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const fuse = useMemo(
    () =>
      new Fuse(searchIndex, {
        keys: ['title', 'description', 'section'],
        threshold: 0.3,
      }),
    []
  )

  const [query, setQuery] = useState('')
  const results = query
    ? fuse.search(query).map((r) => r.item)
    : searchIndex

  const grouped = useMemo(() => {
    const map = new Map<string, SearchItem[]>()
    for (const item of results) {
      const group = map.get(item.section) ?? []
      group.push(item)
      map.set(item.section, group)
    }
    return map
  }, [results])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const onSelect = useCallback(
    (href: string) => {
      setOpen(false)
      setQuery('')
      router.push(href)
    },
    [router]
  )

  useEffect(() => {
    const trigger = document.getElementById('search-trigger')
    if (!trigger) return
    const handler = () => setOpen(true)
    trigger.addEventListener('click', handler)
    return () => trigger.removeEventListener('click', handler)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search docs..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {[...grouped.entries()].map(([section, items]) => (
          <CommandGroup key={section} heading={section}>
            {items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.description}`}
                onSelect={() => onSelect(item.href)}
              >
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
