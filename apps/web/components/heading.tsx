interface HeadingProps {
  level: 2 | 3
  id: string
  children: React.ReactNode
}

export function Heading({ level, id, children }: HeadingProps) {
  const Tag = `h${level}` as const
  const sizes = {
    2: 'mt-16 text-xl font-semibold tracking-tight text-foreground',
    3: 'mt-10 text-base font-semibold text-foreground',
  }

  return (
    <Tag id={id} className={`group scroll-mt-20 ${sizes[level]}`}>
      <a href={`#${id}`} className="no-underline">
        {children}
        <span className="ml-2 text-muted-foreground/0 group-hover:text-muted-foreground">#</span>
      </a>
    </Tag>
  )
}
