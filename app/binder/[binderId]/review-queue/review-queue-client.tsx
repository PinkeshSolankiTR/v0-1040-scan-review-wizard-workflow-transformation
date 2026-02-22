'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { AiIndicator } from '@/components/ai-indicator'
import { ReasonDrawer } from '@/components/reason-drawer'
import { DecisionActionButton } from '@/components/decision-action-button'
import { BulkActionsBar } from '@/components/bulk-actions-bar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel } from '@/lib/types'
import type { ReviewItem } from './page'

const WIZARD_COLORS: Record<string, string> = {
  Superseded: 'bg-chart-1/10 text-chart-1',
  Duplicate: 'bg-chart-2/10 text-chart-2',
  CFA: 'bg-chart-4/10 text-chart-4',
  NFR: 'bg-chart-5/10 text-chart-5',
}

export function ReviewQueueClient({ items }: { items: ReviewItem[] }) {
  const { acceptAllHighConfidence } = useDecisions()
  const [wizardFilter, setWizardFilter] = useState<string>('all')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const filtered = wizardFilter === 'all'
    ? items
    : items.filter(i => i.wizardType === wizardFilter)

  const highCount = filtered.filter(i => getConfidenceLevel(i.confidence) === 'high').length

  const handleAcceptAll = () => {
    acceptAllHighConfidence(
      filtered
        .filter(i => i.confidence >= 0.9)
        .map(i => ({ key: i.key, wizardType: i.wizardType, confidence: i.confidence }))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Review Queue</h1>
        <p className="text-sm text-muted-foreground">
          All items requiring manual review across all wizards.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={wizardFilter} onValueChange={setWizardFilter}>
          <SelectTrigger className="w-40" aria-label="Filter by wizard type">
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
        <BulkActionsBar totalItems={filtered.length} highCount={highCount} onAcceptAllHigh={handleAcceptAll} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Wizard</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Decision</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((item) => (
            <TableRow
              key={item.key}
              className="cursor-pointer"
              onClick={() => setExpandedKey(expandedKey === item.key ? null : item.key)}
            >
              <TableCell><AiIndicator /></TableCell>
              <TableCell>
                <Badge className={WIZARD_COLORS[item.wizardLabel] ?? 'bg-muted text-foreground'}>
                  {item.wizardLabel}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{item.key}</TableCell>
              <TableCell className="text-sm">{item.decision}</TableCell>
              <TableCell><ConfidenceBadge score={item.confidence} /></TableCell>
              <TableCell className="text-right">
                <DecisionActionButton
                  itemKey={item.key}
                  wizardType={item.wizardType}
                  confidence={item.confidence}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {expandedKey && (() => {
        const item = items.find(i => i.key === expandedKey)
        if (!item) return null
        return (
          <ReasonDrawer
            rule={item.rule}
            reason={item.reason}
            escalation={item.escalation}
          />
        )
      })()}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-lg font-medium text-foreground">No items to review</p>
          <p className="text-sm text-muted-foreground">All AI decisions are high confidence.</p>
        </div>
      )}
    </div>
  )
}
