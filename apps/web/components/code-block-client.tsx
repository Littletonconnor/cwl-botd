'use client'

import { useEffect, useRef, useState } from 'react'
import type { Highlighter, ThemeRegistrationAny } from 'shiki'
import { CopyButton } from './copy-button'

let cssVarTheme: ThemeRegistrationAny | null = null

async function getCssVarTheme() {
  if (!cssVarTheme) {
    const { createCssVariablesTheme } = await import('shiki')
    cssVarTheme = createCssVariablesTheme({
      name: 'css-variables',
      variablePrefix: '--shiki-',
      variableDefaults: {},
      fontStyle: true,
    })
  }
  return cssVarTheme
}

interface CodeBlockClientProps {
  code: string
  language?: string
  filename?: string
}

export function CodeBlockClient({ code, language = 'typescript', filename }: CodeBlockClientProps) {
  const [html, setHtml] = useState('')
  const highlighterRef = useRef<Highlighter | null>(null)

  useEffect(() => {
    async function highlight() {
      const theme = await getCssVarTheme()

      if (!highlighterRef.current) {
        const { createHighlighter } = await import('shiki')
        highlighterRef.current = await createHighlighter({
          themes: [theme],
          langs: ['typescript', 'tsx', 'javascript', 'bash', 'json'],
        })
      }

      const result = highlighterRef.current!.codeToHtml(code.trim(), {
        lang: language,
        theme: 'css-variables',
      })
      setHtml(result)
    }

    highlight()
  }, [code, language])

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border">
      {filename && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
          <span className="font-mono text-xs text-muted-foreground">{filename}</span>
        </div>
      )}
      <div className="relative">
        <CopyButton
          text={code.trim()}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
        />
        {html ? (
          <div
            className="overflow-x-auto p-4 text-sm leading-6 [&_pre]:!bg-transparent [&_code]:font-mono"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-6 text-muted-foreground">
            <code>{code.trim()}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
