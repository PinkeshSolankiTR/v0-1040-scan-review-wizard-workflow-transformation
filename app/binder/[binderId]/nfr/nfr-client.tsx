'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { AiIndicator } from '@/components/ai-indicator'
import { DecisionActionButton } from '@/components/decision-action-button'
import { BulkActionsBar } from '@/components/bulk-actions-bar'
import { useDecisions } from '@/contexts/decision-context'
import { useDocuments } from '@/contexts/document-context'
import { getConfidenceLevel, type NfrRecord } from '@/lib/types'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const FIELD_GROUPS: Record<number, string> = {
  100: 'Income',
  200: 'Deductions',
  300: 'Wages',
  400: 'Interest',
  500: 'Business Income',
  600: 'Other Income',
}

export function NfrClient({ data }: { data: NfrRecord[] }) {
  const { acceptAllHighConfidence } = useDecisions()
  const { selectPageId } = useDocuments()
  const highCount = data.filter(r => getConfidenceLevel(r.ConfidenceLevel) === 'high').length

  const handleAcceptAll = () => {
    acceptAllHighConfidence(
      data
        .filter(r => r.ConfidenceLevel >= 0.9)
        .map(r => ({ key: `nfr-${r.EngagementPageId}-${r.FaxRowNumber}`, wizardType: 'nfr' as const, confidence: r.ConfidenceLevel }))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Form Review</h1>
        <p className="text-sm text-muted-foreground">
          Review AI field-group matching between engagement and fax forms.
        </p>
      </div>

      <BulkActionsBar totalItems={data.length} highCount={highCount} onAcceptAllHigh={handleAcceptAll} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Field Group</TableHead>
            <TableHead>Fax Row</TableHead>
            <TableHead>Match</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow
              key={`${r.EngagementPageId}-${r.FaxRowNumber}`}
              className={cn(
                'cursor-pointer',
                !r.MatchStatus && 'bg-[var(--confidence-low)]/5'
              )}
              onClick={() => selectPageId(r.EngagementPageId)}
            >
              <TableCell><AiIndicator /></TableCell>
              <TableCell className="font-mono text-sm">{r.EngagementFormId}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {FIELD_GROUPS[r.FieldGroupId] ?? `Group ${r.FieldGroupId}`}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{r.FaxRowNumber}</TableCell>
              <TableCell>
                {r.MatchStatus ? (
                  <span className="flex items-center gap-1 text-[var(--confidence-high)]">
                    <CheckCircle2 className="size-4" />
                    <span className="text-xs">Matched</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[var(--confidence-low)]">
                    <XCircle className="size-4" />
                    <span className="text-xs">Unmatched</span>
                  </span>
                )}
              </TableCell>
              <TableCell><ConfidenceBadge score={r.ConfidenceLevel} /></TableCell>
              <TableCell className="text-right">
                <DecisionActionButton
                  itemKey={`nfr-${r.EngagementPageId}-${r.FaxRowNumber}`}
                  wizardType="nfr"
                  confidence={r.ConfidenceLevel}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
