import { DocsSidebar } from '@/components/docs-sidebar'
import { Breadcrumbs } from '@/components/breadcrumbs'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[90rem]">
      <DocsSidebar />
      <main className="min-w-0 flex-1 px-6 py-10 lg:px-16">
        <div className="max-w-3xl">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  )
}
