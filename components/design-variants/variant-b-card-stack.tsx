'use client'

/**
 * DESIGN VARIANT B: "Card Stack"
 * Vertical cards grouped by form type with confidence strip,
 * inline reasoning, field comparison, and PDF page viewer with stamps.
 */

import { useState, useMemo } from 'react'
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
  ChevronRight,
  FileText,
  CircleAlert,
  CircleCheck,
  FolderOpen,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FieldComparison } from '@/components/field-comparison'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
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

/* ── Superseded grouping logic ── */

interface FormGroup {
  formType: string
  formEntity: string
  records: SupersededRecord[]
  originalCount: number
  supersededCount: number
  retainBothCount: number
  needsReview: boolean
  lowestConfidence: number
}

function groupByFormType(data: SupersededRecord[]): FormGroup[] {
  const map = new Map<string, SupersededRecord[]>()
  for (const r of data) {
    const key = r.documentRef?.formType ?? 'Unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }

  const groups: FormGroup[] = []
  for (const [formType, records] of map.entries()) {
    const entityParts = records[0].documentRef?.formLabel?.replace(formType, '').replace(/[()]/g, '').trim()
    groups.push({
      formType,
      formEntity: entityParts || formType,
      records,
      originalCount: records.filter(r => r.decisionType === 'Original').length,
      supersededCount: records.filter(r => r.decisionType === 'Superseded').length,
      retainBothCount: records.filter(r => r.decisionType === 'RetainBoth').length,
      needsReview: records.some(r => r.reviewRequired),
      lowestConfidence: Math.min(...records.map(r => r.confidenceLevel)),
    })
  }
  groups.sort((a, b) => {
    if (a.needsReview !== b.needsReview) return a.needsReview ? -1 : 1
    return a.lowestConfidence - b.lowestConfidence
  })
  return groups
}

const smallPill: React.CSSProperties = {
  fontSize: '0.625rem', fontWeight: 700, padding: '0.125rem 0.4375rem',
  borderRadius: '1rem', textTransform: 'uppercase' as const, letterSpacing: '0.03em',
}

/* ── SUPERSEDED ── */
export function VariantBSuperseded({ data }: { data: SupersededRecord[] }) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})
  const groups = useMemo(() => groupByFormType(data), [data])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(groups.map(g => g.formType)))
  const [openDocId, setOpenDocId] = useState<number | null>(null)

  const toggleGroup = (formType: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(formType)) next.delete(formType)
      else next.add(formType)
      return next
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center gap-2 px-1">
        <FileStack className="size-5" style={{ color: 'oklch(0.55 0.17 175)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.2 0.01 80)' }}>
          Superseded Review
        </h2>
        <Badge variant="secondary" className="ml-auto text-xs" style={{ backgroundColor: 'oklch(0.94 0.005 80)', color: 'oklch(0.4 0.01 80)' }}>
          {groups.length} form types &middot; {data.length} items
        </Badge>
      </header>

      {/* Summary bar */}
      <div className="flex items-center gap-2 flex-wrap rounded-lg px-4 py-2.5" style={{ backgroundColor: 'oklch(0.97 0.005 175 / 0.3)', border: '0.0625rem solid oklch(0.91 0.02 175)' }}>
        <FolderOpen className="size-4" style={{ color: 'oklch(0.5 0.12 175)' }} />
        <span className="text-xs font-semibold" style={{ color: 'oklch(0.35 0.08 175)' }}>{groups.length} Form Types</span>
        <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
          {data.filter(r => r.decisionType === 'Original').length} Original
        </span>
        <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)' }}>
          {data.filter(r => r.decisionType === 'Superseded').length} Superseded
        </span>
        {data.some(r => r.decisionType === 'RetainBoth') && (
          <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 250)', color: 'oklch(0.35 0.14 250)' }}>
            {data.filter(r => r.decisionType === 'RetainBoth').length} Retain Both
          </span>
        )}
      </div>

      {/* Form type swimlanes */}
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.formType)
        const allAccepted = group.records.every(r => accepted[r.engagementPageId])

        return (
          <div key={group.formType} className="overflow-hidden rounded-lg" style={{ border: '0.0625rem solid oklch(0.88 0.01 80)', boxShadow: '0 0.0625rem 0.1875rem oklch(0 0 0 / 0.05)' }}>
            {/* Category header */}
            <button
              type="button"
              onClick={() => toggleGroup(group.formType)}
              className="flex w-full items-center gap-3 text-left"
              style={{
                padding: '0.875rem 1rem',
                backgroundColor: allAccepted ? 'oklch(0.95 0.03 175 / 0.3)' : 'oklch(0.97 0.003 80)',
                borderBlockEnd: isExpanded ? '0.125rem solid oklch(0.88 0.01 80)' : 'none',
                borderInlineStart: `0.25rem solid ${group.needsReview ? 'oklch(0.65 0.18 60)' : 'oklch(0.55 0.17 175)'}`,
              }}
              aria-expanded={isExpanded}
            >
              {isExpanded
                ? <ChevronDown className="size-4 shrink-0" style={{ color: 'oklch(0.45 0 0)' }} />
                : <ChevronRight className="size-4 shrink-0" style={{ color: 'oklch(0.45 0 0)' }} />
              }
              <FileText className="size-4 shrink-0" style={{ color: 'oklch(0.55 0.17 175)' }} />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-base font-bold" style={{ color: 'oklch(0.2 0.01 80)' }}>{group.formType}</span>
                <span className="text-xs" style={{ color: 'oklch(0.45 0.01 80)' }}>{group.formEntity}</span>
              </div>
              <span className="flex size-6 items-center justify-center rounded-full bg-[oklch(0.55_0.17_175)] text-xs font-bold text-white shrink-0">
                {group.records.length}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {group.originalCount > 0 && <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>{group.originalCount} Original</span>}
                {group.supersededCount > 0 && <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)' }}>{group.supersededCount} Superseded</span>}
                {group.retainBothCount > 0 && <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 250)', color: 'oklch(0.35 0.14 250)' }}>{group.retainBothCount} Retain</span>}
              </div>
              <div className="ml-auto shrink-0">
                {group.needsReview ? (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'oklch(0.55 0.18 60)' }}>
                    <CircleAlert className="size-3.5" /> Review
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'oklch(0.45 0.15 175)' }}>
                    <CircleCheck className="size-3.5" /> {allAccepted ? 'Accepted' : 'Auto'}
                  </span>
                )}
              </div>
            </button>

            {/* Expanded records */}
            {isExpanded && (
              <div className="flex flex-col gap-3 p-3" style={{ backgroundColor: 'oklch(0.985 0.003 80)' }}>
                {group.records.map((r) => {
                  const isDocOpen = openDocId === r.engagementPageId
                  const stripColor =
                    r.confidenceLevel >= 0.9
                      ? 'bg-[oklch(0.55_0.17_175)]'
                      : r.confidenceLevel >= 0.7
                        ? 'bg-[oklch(0.72_0.14_80)]'
                        : 'bg-[oklch(0.6_0.2_15)]'

                  const stampLabel = r.decisionType === 'Original' ? 'ORIGINAL' : r.decisionType === 'Superseded' ? 'SUPERSEDED' : 'RETAIN BOTH'
                  const stampBg = stampLabel === 'ORIGINAL' ? 'oklch(0.94 0.04 145)' : stampLabel === 'SUPERSEDED' ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 250)'
                  const stampFg = stampLabel === 'ORIGINAL' ? 'oklch(0.35 0.14 145)' : stampLabel === 'SUPERSEDED' ? 'oklch(0.40 0.18 25)' : 'oklch(0.35 0.14 250)'

                  return (
                    <Card
                      key={r.engagementPageId}
                      className="relative overflow-hidden border-[oklch(0.88_0.01_80)] transition-shadow hover:shadow-md"
                      style={{ backgroundColor: accepted[r.engagementPageId] ? 'oklch(0.985 0.01 175 / 0.25)' : 'oklch(0.995 0.003 80)' }}
                    >
                      <div className={cn('absolute inset-y-0 left-0 w-1', stripColor)} aria-hidden="true" />
                      <CardContent className="py-4 pl-5 pr-4">
                        <div className="flex flex-col gap-2.5">
                          {/* Record header */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Sparkles className="size-3.5" style={{ color: 'oklch(0.55 0.17 175)' }} />
                              <span className="font-mono text-sm font-medium" style={{ color: 'oklch(0.2 0.01 80)' }}>
                                Page {r.engagementPageId}
                              </span>
                              {r.decisionType === 'Superseded' && r.retainedPageId && (
                                <span className="flex items-center gap-1 text-xs" style={{ color: 'oklch(0.5 0 0)' }}>
                                  <ArrowRight className="size-3" /> Retained Pg {r.retainedPageId}
                                </span>
                              )}
                              <span style={{
                                padding: '0.125rem 0.4375rem', borderRadius: '1rem', fontSize: '0.625rem', fontWeight: 700,
                                backgroundColor: stampBg, color: stampFg, textTransform: 'uppercase', letterSpacing: '0.04em',
                              }}>
                                {stampLabel}
                              </span>
                              <ConfChip score={r.confidenceLevel} />
                              {r.reviewRequired && <Badge variant="outline" className="text-xs" style={{ borderColor: 'oklch(0.72 0.14 80)', color: 'oklch(0.45 0.12 80)' }}>Review</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setOpenDocId(isDocOpen ? null : r.engagementPageId)}>
                                {isDocOpen ? <><EyeOff className="size-3.5" /> Hide</> : <><Eye className="size-3.5" /> View Doc</>}
                              </Button>
                              <ActionPair
                                accepted={!!accepted[r.engagementPageId]}
                                onAccept={() => setAccepted((p) => ({ ...p, [r.engagementPageId]: true }))}
                                onUndo={() => setAccepted((p) => ({ ...p, [r.engagementPageId]: false }))}
                              />
                            </div>
                          </div>

                          {/* Rule + reason */}
                          <div className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                            <span className="font-semibold uppercase tracking-wider">{r.decisionRule}</span>
                            <span className="mx-1">&middot;</span>
                            <span>{r.appliedRuleSet}</span>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.3 0.01 80)' }}>{r.decisionReason}</p>

                          {/* Key difference callout */}
                          {r.comparedValues && r.comparedValues.some(v => !v.match) && (
                            <div className="flex items-center gap-2 rounded px-2.5 py-1.5" style={{ backgroundColor: 'oklch(0.97 0.015 25 / 0.5)', border: '0.0625rem solid oklch(0.92 0.03 25)' }}>
                              <AlertTriangle className="size-3.5 shrink-0" style={{ color: 'oklch(0.6 0.2 25)' }} />
                              <span className="text-xs" style={{ color: 'oklch(0.4 0.12 25)' }}>
                                <strong>Key difference:</strong>{' '}
                                {(() => { const m = r.comparedValues!.find(v => !v.match)!; return `${m.field}: "${m.valueA}" vs "${m.valueB}"` })()}
                              </span>
                            </div>
                          )}

                          {/* Field comparison */}
                          {r.comparedValues && r.comparedValues.length > 0 && (
                            <FieldComparison values={r.comparedValues} labelA={r.documentRef?.formLabel ?? 'Doc A'} labelB="Compared Version" />
                          )}

                          {/* PDF page viewer */}
                          {isDocOpen && r.documentRef && (
                            <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: 'oklch(0.93 0.005 80)' }}>
                              {r.decisionType === 'Superseded' && r.retainedPageId ? (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'oklch(0.50 0.20 25)' }}>This Document (Superseded)</p>
                                    <PdfPageViewer documentRef={r.documentRef} stamp="SUPERSEDED" height="22rem" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'oklch(0.45 0.17 145)' }}>Superseding Document (Retained)</p>
                                    <PdfPageViewer documentRef={{ pdfPath: r.documentRef.pdfPath, pageNumber: r.retainedPageId, formType: r.documentRef.formType, formLabel: `${r.documentRef.formType} (Corrected) - Page ${r.retainedPageId}` }} stamp="ORIGINAL" height="22rem" />
                                  </div>
                                </div>
                              ) : (
                                <PdfPageViewer documentRef={r.documentRef} stamp={r.decisionType === 'Original' ? 'ORIGINAL' : 'RETAIN BOTH'} height="26rem" />
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
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
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.2 0.01 80)' }}>Duplicate Review</h2>
        <Badge variant="secondary" className="ml-auto text-xs" style={{ backgroundColor: 'oklch(0.94 0.005 80)', color: 'oklch(0.4 0.01 80)' }}>{data.length} items</Badge>
      </header>
      {data.map((r) => {
        const key = getKey(r)
        return (
          <Card key={key} className="relative overflow-hidden border-[oklch(0.88_0.01_80)]" style={{ backgroundColor: 'oklch(0.995 0.003 80)' }}>
            <CardContent className="py-4 px-4">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5" style={{ color: 'oklch(0.55 0.17 175)' }} />
                    <span className="font-mono text-sm font-medium">{r.itemType === 'DUPLICATE_DATA' ? (r as DuplicateDataRecord).organizerItemId : `Doc ${(r as DuplicateDocRecord).docIdA}/${(r as DuplicateDocRecord).docIdB}`}</span>
                    <ConfChip score={r.confidenceLevel} />
                  </div>
                  <ActionPair accepted={!!accepted[key]} onAccept={() => setAccepted((p) => ({ ...p, [key]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [key]: false }))} />
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.3 0.01 80)' }}>{r.decisionReason}</p>
                {r.comparedValues && r.comparedValues.length > 0 && <FieldComparison values={r.comparedValues} labelA={r.documentRefA?.formLabel ?? 'A'} labelB={r.documentRefB?.formLabel ?? 'B'} />}
                {r.documentRefA && r.documentRefB && <DualDocumentPreview docRefA={r.documentRefA} docRefB={r.documentRefB} />}
              </div>
            </CardContent>
          </Card>
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
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.2 0.01 80)' }}>Child Form Association</h2>
        <Badge variant="secondary" className="ml-auto text-xs" style={{ backgroundColor: 'oklch(0.94 0.005 80)', color: 'oklch(0.4 0.01 80)' }}>{data.length} items</Badge>
      </header>
      {data.map((r) => (
        <Card key={r.EngagementFaxFormId} className="relative overflow-hidden border-[oklch(0.88_0.01_80)]" style={{ backgroundColor: 'oklch(0.995 0.003 80)' }}>
          <CardContent className="py-4 px-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.childFormLabel || `Form ${r.EngagementFaxFormId}`}</span>
                  <ArrowRight className="size-3.5" style={{ color: 'oklch(0.5 0.01 80)' }} />
                  <span className="text-sm" style={{ color: 'oklch(0.4 0.01 80)' }}>{r.parentFormLabel || `Parent ${r.ParentEngagementFaxFormId}`}</span>
                  <ConfChip score={r.ConfidenceLevel} />
                </div>
                <ActionPair accepted={!!accepted[r.EngagementFaxFormId]} onAccept={() => setAccepted((p) => ({ ...p, [r.EngagementFaxFormId]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [r.EngagementFaxFormId]: false }))} />
              </div>
              {r.comparedValues && r.comparedValues.length > 0 && <FieldComparison values={r.comparedValues} labelA="Child" labelB="Parent" />}
              {r.documentRef && <DocumentPreviewButton docRef={r.documentRef} />}
            </div>
          </CardContent>
        </Card>
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
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.2 0.01 80)' }}>New Form Review</h2>
        <Badge variant="secondary" className="ml-auto text-xs" style={{ backgroundColor: 'oklch(0.94 0.005 80)', color: 'oklch(0.4 0.01 80)' }}>{data.length} items</Badge>
      </header>
      {data.map((r) => {
        const key = `${r.EngagementPageId}-${r.FaxRowNumber}`
        return (
          <Card key={key} className="relative overflow-hidden border-[oklch(0.88_0.01_80)]" style={{ backgroundColor: 'oklch(0.995 0.003 80)' }}>
            <CardContent className="py-4 px-4">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{r.fieldLabel || `Form ${r.EngagementFormId}`}</span>
                    {r.MatchStatus
                      ? <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'oklch(0.55 0.17 175)' }}><CheckCircle className="size-3.5" /> Matched</span>
                      : <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'oklch(0.6 0.2 15)' }}><XCircle className="size-3.5" /> Unmatched</span>
                    }
                    <ConfChip score={r.ConfidenceLevel} />
                  </div>
                  <ActionPair accepted={!!accepted[key]} onAccept={() => setAccepted((p) => ({ ...p, [key]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [key]: false }))} />
                </div>
                {r.comparedValues && r.comparedValues.length > 0 && <FieldComparison values={r.comparedValues} labelA="Source" labelB="Return" />}
                {r.documentRef && <DocumentPreviewButton docRef={r.documentRef} />}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
