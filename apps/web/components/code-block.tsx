import { codeToHtml, createCssVariablesTheme } from 'shiki'
import { CopyButton } from './copy-button'

const cssVarTheme = createCssVariablesTheme({
  name: 'css-variables',
  variablePrefix: '--shiki-',
  variableDefaults: {},
  fontStyle: true,
})

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
}

export async function CodeBlock({ code, language = 'typescript', filename }: CodeBlockProps) {
  const html = await codeToHtml(code.trim(), {
    lang: language,
    theme: cssVarTheme,
  })

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
        <div
          className="overflow-x-auto p-4 text-sm leading-6 [&_pre]:!bg-transparent [&_code]:font-mono"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
