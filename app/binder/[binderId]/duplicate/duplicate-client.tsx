'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { AiIndicator } from '@/components/ai-indicator'
import { ReasonDrawer } from '@/components/reason-drawer'
import { DecisionActionButton } from '@/components/decision-action-button'
import { BulkActionsBar } from '@/components/bulk-actions-bar'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel, type DuplicateRecord, type DuplicateDataRecord, type DuplicateDocRecord } from '@/lib/types'

function getItemKey(r: DuplicateRecord): string {
  if (r.itemType === 'DUPLICATE_DATA') return `dup-${(r as DuplicateDataRecord).organizerItemId}`
  const doc = r as DuplicateDocRecord
  return `dup-${doc.docIdA}-${doc.docIdB}`
}

export function DuplicateClient({ data }: { data: DuplicateRecord[] }) {
  const { acceptAllHighConfidence } = useDecisions()
  const dataRecords = data.filter((r): r is DuplicateDataRecord => r.itemType === 'DUPLICATE_DATA')
  const docRecords = data.filter((r): r is DuplicateDocRecord => r.itemType !== 'DUPLICATE_DATA')

  const highCount = data.filter(r => getConfidenceLevel(r.confidenceLevel) === 'high').length

  const handleAcceptAll = () => {
    acceptAllHighConfidence(
      data
        .filter(r => r.confidenceLevel >= 0.9)
        .map(r => ({ key: getItemKey(r), wizardType: 'duplicate' as const, confidence: r.confidenceLevel }))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Duplicate Review</h1>
        <p className="text-sm text-muted-foreground">
          Review data and document duplicate decisions.
        </p>
      </div>

      <BulkActionsBar totalItems={data.length} highCount={highCount} onAcceptAllHigh={handleAcceptAll} />

      <Tabs defaultValue="data">
        <TabsList>
          <TabsTrigger value="data">Data Duplicates ({dataRecords.length})</TabsTrigger>
          <TabsTrigger value="docs">Document Duplicates ({docRecords.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Organizer ID</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Match Type</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataRecords.map((r) => (
                <TableRow key={r.organizerItemId}>
                  <TableCell><AiIndicator /></TableCell>
                  <TableCell className="font-mono text-sm">{r.organizerItemId}</TableCell>
                  <TableCell>
                    <Badge variant={r.decision === 'DuplicateData' ? 'destructive' : 'secondary'}>
                      {r.decision === 'DuplicateData' ? 'Duplicate' : 'Not Duplicate'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.matchType}</TableCell>
                  <TableCell><ConfidenceBadge score={r.confidenceLevel} /></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.fieldsCompared.slice(0, 3).map(f => (
                        <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DecisionActionButton
                      itemKey={getItemKey(r)}
                      wizardType="duplicate"
                      confidence={r.confidenceLevel}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="docs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Doc A</TableHead>
                <TableHead>Doc B</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docRecords.map((r) => (
                <TableRow key={`${r.docIdA}-${r.docIdB}`}>
                  <TableCell><AiIndicator /></TableCell>
                  <TableCell className="font-mono text-sm">{r.docIdA}</TableCell>
                  <TableCell className="font-mono text-sm">{r.docIdB}</TableCell>
                  <TableCell>
                    <Badge variant={r.decision === 'Duplicate' ? 'destructive' : 'secondary'}>
                      {r.decision}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.itemType === 'DUPLICATE_SOURCE_DOC' ? 'Source Doc' : 'Consolidated'}
                  </TableCell>
                  <TableCell><ConfidenceBadge score={r.confidenceLevel} /></TableCell>
                  <TableCell className="text-right">
                    <DecisionActionButton
                      itemKey={getItemKey(r)}
                      wizardType="duplicate"
                      confidence={r.confidenceLevel}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">AI Reasoning</h2>
        {data.map((r) => (
          <ReasonDrawer
            key={getItemKey(r)}
            rule={r.decisionRule}
            reason={r.decisionReason}
            fieldsCompared={r.fieldsCompared}
            escalation={r.escalationReason}
          />
        ))}
      </div>
    </div>
  )
}
