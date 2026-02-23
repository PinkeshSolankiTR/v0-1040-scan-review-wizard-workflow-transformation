'use client'

/**
 * DESIGN VARIANT B: "Card Stack"
 * Vertical cards with confidence strip, inline reasoning, field comparison, and document preview.
 */

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Undo2,
  FileStack,
  Copy,
  Link2,
  FileSearch,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FieldComparison } from '@/components/field-comparison'
import { DocumentPreviewButton, DualDocumentPreview } from '@/components/document-preview'
import type {
  SupersededRecord,
  DuplicateRecord,
  DuplicateDataRecord,
  DuplicateDocRecord,
  CfaRecord,
  NfrRecord,
} from '@/lib/types'

/* ── Shared sub-components ── */

function StripCard({
  confidence,
  children,
  className,
}: {
  confidence: number
  children: React.ReactNode
  className?: string
}) {
  const stripColor =
    confidence >= 0.9
      ? 'bg-[oklch(0.55_0.17_175)]'
      : confidence >= 0.7
        ? 'bg-[oklch(0.72_0.14_80)]'
        : 'bg-[oklch(0.6_0.2_15)]'

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-[oklch(0.88_0.01_80)] transition-shadow hover:shadow-md',
        className
      )}
      style={{ backgroundColor: 'oklch(0.995 0.003 80)' }}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1', stripColor)} aria-hidden="true" />
      <CardContent className="py-4 pl-5 pr-4">{children}</CardContent>
    </Card>
  )
}

function ConfChip({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const bg =
    score >= 0.9
      ? 'bg-[oklch(0.55_0.17_175)]/12 text-[oklch(0.4_0.12_175)]'
      : score >= 0.7
        ? 'bg-[oklch(0.72_0.14_80)]/15 text-[oklch(0.45_0.12_80)]'
        : 'bg-[oklch(0.6_0.2_15)]/12 text-[oklch(0.45_0.18_15)]'
  const label = score >= 0.9 ? 'High' : score >= 0.7 ? 'Medium' : 'Low'

  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', bg)}
      aria-label={`${label} confidence: ${pct}%`}
    >
      {label} {pct}%
    </span>
  )
}

function InlineReason({ reason, escalation }: { reason: string; escalation?: string | null }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-medium hover:underline"
        style={{ color: 'oklch(0.55 0.17 175)' }}
        aria-expanded={open}
        type="button"
      >
        <Sparkles className="size-3" />
        AI Reasoning
        <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="flex flex-col gap-2 rounded-md px-3 py-2" style={{ backgroundColor: 'oklch(0.97 0.005 175 / 0.3)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.25 0.01 80)' }}>
            {reason}
          </p>
          {escalation && (
            <div className="flex items-start gap-1.5 rounded px-2 py-1.5" style={{ backgroundColor: 'oklch(0.6 0.2 15 / 0.08)' }}>
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" style={{ color: 'oklch(0.6 0.2 15)' }} />
              <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.45 0.15 15)' }}>
                {escalation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ActionPair({
  accepted,
  onAccept,
  onUndo,
}: {
  accepted: boolean
  onAccept: () => void
  onUndo: () => void
}) {
  if (accepted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onUndo}
        className="gap-1 text-xs"
        style={{ color: 'oklch(0.5 0.01 80)' }}
      >
        <Undo2 className="size-3.5" /> Undo
      </Button>
    )
  }
  return (
    <Button
      size="sm"
      onClick={onAccept}
      className="gap-1 text-xs text-white"
      style={{ backgroundColor: 'oklch(0.55 0.17 175)' }}
    >
      <CheckCircle2 className="size-3.5" /> Accept
    </Button>
  )
}

/* ── SUPERSEDED ── */
export function VariantBSuperseded({ data }: { data: SupersededRecord[] }) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2 px-1">
        <FileStack className="size-5" style={{ color: 'oklch(0.55 0.17 175)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.2 0.01 80)' }}>
          Superseded Review
        </h2>
        <Badge variant="secondary" className="ml-auto text-xs" style={{ backgroundColor: 'oklch(0.94 0.005 80)', color: 'oklch(0.4 0.01 80)' }}>
          {data.length} items
        </Badge>
      </header>

      {data.map((r) => (
        <StripCard key={r.engagementPageId} confidence={r.confidenceLevel}>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium" style={{ color: 'oklch(0.2 0.01 80)' }}>
                  Page {r.engagementPageId}
                </span>
                <Badge variant="outline" className="text-xs" style={{
                  borderColor: r.decisionType === 'Superseded' ? 'oklch(0.6 0.2 15)' : r.decisionType === 'RetainBoth' ? 'oklch(0.72 0.14 80)' : 'oklch(0.55 0.17 175)',
                  color: r.decisionType === 'Superseded' ? 'oklch(0.5 0.18 15)' : r.decisionType === 'RetainBoth' ? 'oklch(0.45 0.12 80)' : 'oklch(0.4 0.12 175)',
                }}>
                  {r.decisionType}
                </Badge>
                <ConfChip score={r.confidenceLevel} />
              </div>
              <ActionPair
                accepted={!!accepted[r.engagementPageId]}
                onAccept={() => setAccepted((p) => ({ ...p, [r.engagementPageId]: true }))}
                onUndo={() => setAccepted((p) => ({ ...p, [r.engagementPageId]: false }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md px-2 py-0.5 text-xs font-mono" style={{ backgroundColor: 'oklch(0.94 0.005 80)', color: 'oklch(0.4 0.01 80)' }}>
                {r.appliedRuleSet}
              </span>
              <span className="text-xs" style={{ color: 'oklch(0.5 0.01 80)' }}>{r.decisionRule}</span>
            </div>
            <InlineReason reason={r.decisionReason} escalation={r.escalationReason} />
            {r.comparedValues && r.comparedValues.length > 0 && (
              <FieldComparison values={r.comparedValues} labelA="Document A" labelB="Document B" />
            )}
            {r.documentRef && <DocumentPreviewButton docRef={r.documentRef} />}
          </div>
        </StripCard>
      ))}
    </section>
  )
}

/* ── DUPLICATE ── */
export function VariantBDuplicate({ data }: { data: DuplicateRecord[] }) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  const getKey = (r: DuplicateRecord) =>
    r.itemType === 'DUPLICATE_DATA'
      ? (r as DuplicateDataRecord).organizerItemId
      : `${(r as DuplicateDocRecord).docIdA}-${(r as DuplicateDocRecord).docIdB}`

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2 px-1">
        <Copy className="size-5" style={{ color: 'oklch(0.55 0.17 175)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.2 0.01 80)' }}>
          Duplicate Review
        </h2>
        <Badge variant="secondary" className="ml-auto text-xs" style={{ backgroundColor: 'oklch(0.94 0.005 80)', color: 'oklch(0.4 0.01 80)' }}>
          {data.length} items
        </Badge>
      </header>

      {data.map((r) => {
        const key = getKey(r)
        const isData = r.itemType === 'DUPLICATE_DATA'
        const dr = r as DuplicateDataRecord
        const ddoc = r as DuplicateDocRecord
        return (
          <StripCard key={key} confidence={r.confidenceLevel}>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium" style={{ color: 'oklch(0.2 0.01 80)' }}>
                    {isData ? dr.organizerItemId : `Doc ${ddoc.docIdA} / ${ddoc.docIdB}`}
                  </span>
                  <Badge variant="outline" className="text-xs" style={{
                    borderColor: isData ? 'oklch(0.55 0.17 175)' : 'oklch(0.6 0.15 250)',
                    color: isData ? 'oklch(0.4 0.12 175)' : 'oklch(0.45 0.12 250)',
                  }}>
                    {isData ? 'Data' : 'Document'}
                  </Badge>
                  <ConfChip score={r.confidenceLevel} />
                </div>
                <ActionPair
                  accepted={!!accepted[key]}
                  onAccept={() => setAccepted((p) => ({ ...p, [key]: true }))}
                  onUndo={() => setAccepted((p) => ({ ...p, [key]: false }))}
                />
              </div>
              <InlineReason reason={r.decisionReason} escalation={r.escalationReason} />
              {r.comparedValues && r.comparedValues.length > 0 && (
                <FieldComparison
                  values={r.comparedValues}
                  labelA={r.documentRefA?.formLabel ?? 'Source A'}
                  labelB={r.documentRefB?.formLabel ?? 'Source B'}
                />
              )}
              {r.documentRefA && r.documentRefB && (
                <DualDocumentPreview docRefA={r.documentRefA} docRefB={r.documentRefB} />
              )}
            </div>
          </StripCard>
        )
      })}
    </section>
  )
}

/* ── CFA ── */
export function VariantBCfa({ data }: { data: CfaRecord[] }) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2 px-1">
        <Link2 className="size-5" style={{ color: 'oklch(0.55 0.17 175)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.2 0.01 80)' }}>
          Child Form Association
        </h2>
        <Badge variant="secondary" className="ml-auto text-xs" style={{ backgroundColor: 'oklch(0.94 0.005 80)', color: 'oklch(0.4 0.01 80)' }}>
          {data.length} items
        </Badge>
      </header>

      {data.map((r) => (
        <StripCard key={r.EngagementFaxFormId} confidence={r.ConfidenceLevel}>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium" style={{ color: 'oklch(0.2 0.01 80)' }}>
                  {r.childFormLabel || `Form ${r.EngagementFaxFormId}`}
                </span>
                <ArrowRight className="size-3.5" style={{ color: 'oklch(0.5 0.01 80)' }} />
                <span className="text-sm" style={{ color: 'oklch(0.4 0.01 80)' }}>
                  {r.parentFormLabel || `Parent ${r.ParentEngagementFaxFormId}`}
                </span>
                <ConfChip score={r.ConfidenceLevel} />
                {r.IsAddForm && (
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: 'oklch(0.55 0.17 175)' }}>
                    Add Form
                  </span>
                )}
              </div>
              <ActionPair
                accepted={!!accepted[r.EngagementFaxFormId]}
                onAccept={() => setAccepted((p) => ({ ...p, [r.EngagementFaxFormId]: true }))}
                onUndo={() => setAccepted((p) => ({ ...p, [r.EngagementFaxFormId]: false }))}
              />
            </div>
            <span className="rounded-md px-2 py-0.5 text-xs font-mono w-fit" style={{ backgroundColor: 'oklch(0.94 0.005 80)', color: 'oklch(0.4 0.01 80)' }}>
              DWP: {r.ParentFaxFormDwpCode}
            </span>
            {r.comparedValues && r.comparedValues.length > 0 && (
              <FieldComparison values={r.comparedValues} labelA="Child Form" labelB="Parent Return" />
            )}
            {r.documentRef && <DocumentPreviewButton docRef={r.documentRef} />}
          </div>
        </StripCard>
      ))}
    </section>
  )
}

/* ── NFR ── */
export function VariantBNfr({ data }: { data: NfrRecord[] }) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2 px-1">
        <FileSearch className="size-5" style={{ color: 'oklch(0.55 0.17 175)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.2 0.01 80)' }}>
          New Form Review
        </h2>
        <Badge variant="secondary" className="ml-auto text-xs" style={{ backgroundColor: 'oklch(0.94 0.005 80)', color: 'oklch(0.4 0.01 80)' }}>
          {data.length} items
        </Badge>
      </header>

      {data.map((r) => {
        const key = `${r.EngagementPageId}-${r.FaxRowNumber}`
        return (
          <StripCard key={key} confidence={r.ConfidenceLevel}>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: 'oklch(0.2 0.01 80)' }}>
                    {r.fieldLabel || `Form ${r.EngagementFormId}`}
                  </span>
                  {r.MatchStatus ? (
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'oklch(0.55 0.17 175)' }}>
                      <CheckCircle className="size-3.5" /> Matched
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'oklch(0.6 0.2 15)' }}>
                      <XCircle className="size-3.5" /> Unmatched
                    </span>
                  )}
                  <ConfChip score={r.ConfidenceLevel} />
                </div>
                <ActionPair
                  accepted={!!accepted[key]}
                  onAccept={() => setAccepted((p) => ({ ...p, [key]: true }))}
                  onUndo={() => setAccepted((p) => ({ ...p, [key]: false }))}
                />
              </div>
              {(r.sourceValue || r.returnValue) && (
                <div className="flex items-center gap-4 text-xs" style={{ color: 'oklch(0.45 0.01 80)' }}>
                  {r.sourceValue && <span><strong>Source:</strong> {r.sourceValue}</span>}
                  {r.returnValue && <span><strong>Return:</strong> {r.returnValue}</span>}
                </div>
              )}
              {r.comparedValues && r.comparedValues.length > 0 && (
                <FieldComparison values={r.comparedValues} labelA="Source Document" labelB="Tax Return" />
              )}
              {r.documentRef && <DocumentPreviewButton docRef={r.documentRef} />}
            </div>
          </StripCard>
        )
      })}
    </section>
  )
}
