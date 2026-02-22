'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { AiIndicator } from '@/components/ai-indicator'
import { DecisionActionButton } from '@/components/decision-action-button'
import { BulkActionsBar } from '@/components/bulk-actions-bar'
import { useDecisions } from '@/contexts/decision-context'
import { useDocuments } from '@/contexts/document-context'
import { getConfidenceLevel, type CfaRecord } from '@/lib/types'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CfaClient({ data }: { data: CfaRecord[] }) {
  const { acceptAllHighConfidence } = useDecisions()
  const { selectPageId } = useDocuments()
  const highCount = data.filter(r => getConfidenceLevel(r.ConfidenceLevel) === 'high').length

  const handleAcceptAll = () => {
    acceptAllHighConfidence(
      data
        .filter(r => r.ConfidenceLevel >= 0.9)
        .map(r => ({ key: `cfa-${r.EngagementFaxFormId}`, wizardType: 'cfa' as const, confidence: r.ConfidenceLevel }))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Child Form Association</h1>
        <p className="text-sm text-muted-foreground">
          Review AI-determined parent-child form relationships.
        </p>
      </div>

      <BulkActionsBar totalItems={data.length} highCount={highCount} onAcceptAllHigh={handleAcceptAll} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Child Form</TableHead>
            <TableHead></TableHead>
            <TableHead>Parent Form</TableHead>
            <TableHead>DWP Code</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow
              key={r.EngagementFaxFormId}
              className={cn('cursor-pointer', getConfidenceLevel(r.ConfidenceLevel) !== 'high' && 'bg-[var(--confidence-medium)]/5')}
              onClick={() => selectPageId(r.EngagementPageId)}
            >
              <TableCell><AiIndicator /></TableCell>
              <TableCell className="font-mono text-sm">{r.EngagementFaxFormId}</TableCell>
              <TableCell>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </TableCell>
              <TableCell className="font-mono text-sm">{r.ParentEngagementFaxFormId}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">{r.ParentFaxFormDwpCode}</Badge>
              </TableCell>
              <TableCell><ConfidenceBadge score={r.ConfidenceLevel} /></TableCell>
              <TableCell>
                {r.IsAddForm ? (
                  <Badge className="bg-[var(--ai-accent)] text-white">Add Form</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Standard</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DecisionActionButton
                  itemKey={`cfa-${r.EngagementFaxFormId}`}
                  wizardType="cfa"
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
