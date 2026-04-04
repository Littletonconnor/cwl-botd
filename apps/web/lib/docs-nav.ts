export interface NavItem {
  title: string
  href: string
  isCode?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
  defaultOpen?: boolean
}

export const docsNav: NavSection[] = [
  {
    title: 'Getting Started',
    defaultOpen: true,
    items: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Installation', href: '/docs#installation' },
      { title: 'Quick Start', href: '/docs#quickstart' },
    ],
  },
  {
    title: 'Detection',
    defaultOpen: true,
    items: [
      { title: 'Overview', href: '/docs/detection' },
      { title: 'Automation Detection', href: '/docs/detection#automation' },
      { title: 'Fingerprinting', href: '/docs/detection#fingerprinting' },
      { title: 'Behavioral Analysis', href: '/docs/detection#behavioral' },
      { title: 'Consistency Checks', href: '/docs/detection#consistency' },
    ],
  },
  {
    title: 'API Reference',
    defaultOpen: true,
    items: [
      { title: 'load()', href: '/docs/api#load', isCode: true },
      { title: 'BotDetector', href: '/docs/api#botdetector', isCode: true },
      { title: 'DetectionResult', href: '/docs/api#detectionresult', isCode: true },
      { title: 'Configuration', href: '/docs/api#configuration' },
      { title: 'Types', href: '/docs/api#types' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { title: 'React', href: '/docs/integrations#react' },
      { title: 'Next.js', href: '/docs/integrations#nextjs' },
      { title: 'Vanilla JS', href: '/docs/integrations#vanilla' },
    ],
  },
  {
    title: 'Plugins',
    items: [
      { title: 'Plugin System', href: '/docs/plugins' },
      { title: 'Built-in Plugins', href: '/docs/plugins#builtin' },
      { title: 'Custom Plugins', href: '/docs/plugins#custom' },
    ],
  },
  {
    title: 'Tools',
    items: [{ title: 'Live Demo', href: '/docs/demo' }],
  },
]

export function getBreadcrumbs(pathname: string): { title: string; href: string }[] {
  const crumbs: { title: string; href: string }[] = [{ title: 'Docs', href: '/docs' }]

  const basePath = pathname.split('#')[0]
  if (basePath === '/docs') return crumbs

  for (const section of docsNav) {
    for (const item of section.items) {
      const itemBase = item.href.split('#')[0]
      if (itemBase === basePath) {
        if (itemBase !== '/docs') {
          const sectionHref = section.items[0]?.href
          if (sectionHref && sectionHref !== item.href) {
            crumbs.push({ title: section.title, href: sectionHref })
          }
        }
        crumbs.push({ title: item.title, href: item.href })
        return crumbs
      }
    }
  }

  return crumbs
}
