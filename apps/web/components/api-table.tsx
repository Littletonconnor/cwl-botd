import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ApiTableRow {
  name: string
  type: string
  description: string
  default?: string
}

interface ApiTableProps {
  rows: ApiTableRow[]
  showDefault?: boolean
}

export function ApiTable({ rows, showDefault = false }: ApiTableProps) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">Name</TableHead>
            <TableHead className="text-xs font-semibold">Type</TableHead>
            <TableHead className="text-xs font-semibold">Description</TableHead>
            {showDefault && <TableHead className="text-xs font-semibold">Default</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-mono text-sm text-sky-600 dark:text-sky-400">
                {row.name}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{row.type}</TableCell>
              <TableCell className="text-sm">{row.description}</TableCell>
              {showDefault && (
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.default ?? '—'}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
