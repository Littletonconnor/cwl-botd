import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { SiteHeader } from '@/components/site-header'
import { SearchDialog } from '@/components/search-dialog'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'BotD — Open-Source Bot Detection',
    template: '%s — BotD',
  },
  description:
    'Client-side bot detection library. Identify Puppeteer, Playwright, Selenium, and headless browsers in under 5ms. Zero dependencies.',
  keywords: ['bot detection', 'fingerprinting', 'puppeteer', 'playwright', 'selenium', 'headless browser', 'npm'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased">
        <ThemeProvider>
          <SiteHeader />
          <SearchDialog />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
