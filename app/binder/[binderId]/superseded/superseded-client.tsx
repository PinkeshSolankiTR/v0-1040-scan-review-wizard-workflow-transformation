'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { AiIndicator } from '@/components/ai-indicator'
import { ReasonDrawer } from '@/components/reason-drawer'
import { DecisionActionButton } from '@/components/decision-action-button'
import { BulkActionsBar } from '@/components/bulk-actions-bar'
import { useDecisions } from '@/contexts/decision-context'
import { useDocuments } from '@/contexts/document-context'
import { getConfidenceLevel, type SupersededRecord } from '@/lib/types'
import { cn } from '@/lib/utils'

export function SupersededClient({ data }: { data: SupersededRecord[] }) {
  const { acceptAllHighConfidence } = useDecisions()
  const { selectPageId } = useDocuments()
  const highCount = data.filter(r => getConfidenceLevel(r.confidenceLevel) === 'high').length

  const handleAcceptAll = () => {
    acceptAllHighConfidence(
      data
        .filter(r => r.confidenceLevel >= 0.9)
        .map(r => ({ key: `sup-pg${r.engagementPageId}`, wizardType: 'superseded' as const, confidence: r.confidenceLevel }))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Superseded Review</h1>
        <p className="text-sm text-muted-foreground">
          Review AI decisions on original vs. superseded documents.
        </p>
      </div>

      <BulkActionsBar totalItems={data.length} highCount={highCount} onAcceptAllHigh={handleAcceptAll} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Page ID</TableHead>
            <TableHead>Decision</TableHead>
            <TableHead>Rule Set</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Review</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow
              key={r.engagementPageId}
              className={cn('cursor-pointer', r.reviewRequired && 'bg-[var(--confidence-medium)]/5')}
              onClick={() => selectPageId(r.engagementPageId)}
            >
              <TableCell><AiIndicator /></TableCell>
              <TableCell className="font-mono text-sm">{r.engagementPageId}</TableCell>
              <TableCell>
                <Badge variant={r.decisionType === 'Superseded' ? 'destructive' : 'secondary'}>
                  {r.decisionType}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.appliedRuleSet}</TableCell>
              <TableCell><ConfidenceBadge score={r.confidenceLevel} /></TableCell>
              <TableCell>
                {r.reviewRequired ? (
                  <Badge variant="outline" className="border-[var(--confidence-medium)] text-[var(--confidence-medium)]">
                    Review
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Auto</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DecisionActionButton
                  itemKey={`sup-pg${r.engagementPageId}`}
                  wizardType="superseded"
                  confidence={r.confidenceLevel}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">AI Reasoning</h2>
        {data.map((r) => (
          <ReasonDrawer
            key={r.engagementPageId}
            rule={r.decisionRule}
            reason={r.decisionReason}
            escalation={r.escalationReason}
          />
        ))}
      </div>
    </div>
  )
}
