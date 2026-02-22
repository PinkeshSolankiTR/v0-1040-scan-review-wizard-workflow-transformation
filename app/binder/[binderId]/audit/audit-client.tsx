'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDecisions } from '@/contexts/decision-context'
import { CheckCircle2, Undo2 } from 'lucide-react'

export function AuditClient() {
  const { auditLog } = useDecisions()
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [wizardFilter, setWizardFilter] = useState<string>('all')

  const sorted = [...auditLog].reverse()
  const filtered = sorted
    .filter(e => actionFilter === 'all' || e.action === actionFilter)
    .filter(e => wizardFilter === 'all' || e.wizardType === wizardFilter)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Decision Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          Chronological log of all accept and undo actions in this session.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="secondary">{auditLog.length} entries</Badge>
        <Select value={wizardFilter} onValueChange={setWizardFilter}>
          <SelectTrigger className="w-36" aria-label="Filter by wizard">
            <SelectValue placeholder="All Wizards" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wizards</SelectItem>
            <SelectItem value="superseded">Superseded</SelectItem>
            <SelectItem value="duplicate">Duplicate</SelectItem>
            <SelectItem value="cfa">CFA</SelectItem>
            <SelectItem value="nfr">NFR</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-36" aria-label="Filter by action">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="undone">Undone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Wizard</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Method</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry, idx) => (
              <TableRow key={`${entry.timestamp}-${entry.itemKey}-${idx}`}>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {entry.wizardType}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{entry.itemKey}</TableCell>
                <TableCell>
                  {entry.action === 'accepted' ? (
                    <span className="flex items-center gap-1 text-[var(--confidence-high)]">
                      <CheckCircle2 className="size-3.5" />
                      <span className="text-xs">Accepted</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Undo2 className="size-3.5" />
                      <span className="text-xs">Undone</span>
                    </span>
                  )}
                </TableCell>
                <TableCell><ConfidenceBadge score={entry.confidence} /></TableCell>
                <TableCell>
                  <Badge variant={entry.method === 'bulk' ? 'default' : 'outline'} className="text-xs">
                    {entry.method}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-lg font-medium text-foreground">No audit entries yet</p>
          <p className="text-sm text-muted-foreground">
            Accept or undo decisions on any wizard page to see entries here.
          </p>
        </div>
      )}
    </div>
  )
}
