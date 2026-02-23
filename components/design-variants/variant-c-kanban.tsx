'use client'

/**
 * DESIGN VARIANT C: "Kanban / Swim Lane"
 * Three-column board by confidence tier with form-type category grouping
 * for Superseded, expandable card details, field comparison, and PDF viewer.
 */

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  CheckCircle2,
  Undo2,
  ChevronDown,
  FileStack,
  Copy,
  Link2,
  FileSearch,
  ArrowRight,
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  AlertTriangle,
  FolderOpen,
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

/* ── Shared column / card primitives ── */

const COLUMN_STYLES = {
  high: { headerBg: 'oklch(0.94 0.04 160)', headerText: 'oklch(0.3 0.08 160)', dot: 'oklch(0.55 0.17 160)', label: 'High Confidence' },
  medium: { headerBg: 'oklch(0.94 0.04 80)', headerText: 'oklch(0.4 0.1 80)', dot: 'oklch(0.7 0.14 80)', label: 'Medium - Review' },
  low: { headerBg: 'oklch(0.94 0.04 25)', headerText: 'oklch(0.4 0.15 25)', dot: 'oklch(0.6 0.2 25)', label: 'Low - Escalate' },
} as const

type Tier = 'high' | 'medium' | 'low'
function getTier(score: number): Tier {
  if (score >= 0.9) return 'high'
  if (score >= 0.7) return 'medium'
  return 'low'
}

function LaneColumn({ tier, count, children }: { tier: Tier; count: number; children: React.ReactNode }) {
  const s = COLUMN_STYLES[tier]
  return (
    <div className="flex flex-col gap-0 rounded-lg overflow-hidden border" style={{ borderColor: 'oklch(0.9 0.005 260)' }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: s.headerBg }}>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.dot }} aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: s.headerText }}>{s.label}</span>
        </div>
        <span className="flex size-5 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: s.dot }}>{count}</span>
      </div>
      <div className="flex flex-col gap-2 p-2 min-h-[8rem]" style={{ backgroundColor: 'oklch(0.985 0.002 260)' }}>{children}</div>
    </div>
  )
}

function KanbanAction({ accepted, onAccept, onUndo }: { accepted: boolean; onAccept: () => void; onUndo: () => void }) {
  if (accepted) {
    return (
      <button onClick={onUndo} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium" style={{ color: 'oklch(0.5 0.01 260)', backgroundColor: 'oklch(0.95 0.005 260)' }} type="button">
        <Undo2 className="size-3" /> Undo
      </button>
    )
  }
  return (
    <button onClick={onAccept} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: 'oklch(0.5 0.15 260)' }} type="button">
      <CheckCircle2 className="size-3" /> Accept
    </button>
  )
}

function KanbanPctBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = score >= 0.9 ? 'oklch(0.55 0.17 160)' : score >= 0.7 ? 'oklch(0.7 0.14 80)' : 'oklch(0.6 0.2 25)'
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'oklch(0.93 0.005 260)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  )
}

/* ── Expandable Swim Card ── */
function SwimCard({ children, expandedContent }: { children: React.ReactNode; expandedContent?: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-md border transition-shadow hover:shadow-sm" style={{ backgroundColor: 'oklch(1 0 0)', borderColor: 'oklch(0.92 0.005 260)' }}>
      <div className="px-3 py-2.5">{children}</div>
      {expandedContent && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-center gap-1 border-t py-1 text-xs font-medium"
            style={{ borderColor: 'oklch(0.93 0.005 260)', color: 'oklch(0.5 0.15 260)' }}
            type="button" aria-expanded={expanded}
          >
            {expanded ? 'Hide' : 'Show'} Details
            <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
          </button>
          {expanded && (
            <div className="flex flex-col gap-2 border-t px-3 py-2.5" style={{ borderColor: 'oklch(0.93 0.005 260)', backgroundColor: 'oklch(0.985 0.002 260)' }}>
              {expandedContent}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Generic kanban wrapper ── */
function KanbanBoard<T>({
  items, getConfidence, renderCard, wizardIcon: WizardIcon, wizardTitle,
}: {
  items: T[]; getConfidence: (item: T) => number; renderCard: (item: T) => React.ReactNode; wizardIcon: React.ElementType; wizardTitle: string
}) {
  const high = items.filter((i) => getTier(getConfidence(i)) === 'high')
  const medium = items.filter((i) => getTier(getConfidence(i)) === 'medium')
  const low = items.filter((i) => getTier(getConfidence(i)) === 'low')

  return (
    <div className="grid grid-cols-3 gap-3">
      <LaneColumn tier="high" count={high.length}>{high.map(renderCard)}</LaneColumn>
      <LaneColumn tier="medium" count={medium.length}>{medium.map(renderCard)}</LaneColumn>
      <LaneColumn tier="low" count={low.length}>{low.map(renderCard)}</LaneColumn>
    </div>
  )
}

/* ── Superseded grouping ── */
interface FormGroup {
  formType: string
  formEntity: string
  records: SupersededRecord[]
  originalCount: number
  supersededCount: number
  retainBothCount: number
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
    })
  }
  return groups
}

const smallPill: React.CSSProperties = {
  fontSize: '0.5625rem', fontWeight: 700, padding: '0.0625rem 0.375rem',
  borderRadius: '1rem', textTransform: 'uppercase' as const, letterSpacing: '0.03em',
}

/* ── SUPERSEDED ── */
export function VariantCSuperseded({ data }: { data: SupersededRecord[] }) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})
  const groups = useMemo(() => groupByFormType(data), [data])

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-center gap-2 px-1">
        <FileStack className="size-5" style={{ color: 'oklch(0.5 0.15 260)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 260)' }}>Superseded Review</h2>
        <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.4 0.01 260)' }}>
          {groups.length} form types &middot; {data.length} items
        </span>
      </header>

      {/* Each form type gets its own Kanban board */}
      {groups.map((group) => (
        <div key={group.formType} className="flex flex-col gap-2">
          {/* Form type sub-header */}
          <div className="flex items-center gap-2 px-1">
            <FileText className="size-4" style={{ color: 'oklch(0.5 0.15 260)' }} />
            <span className="text-sm font-bold" style={{ color: 'oklch(0.2 0.01 260)' }}>{group.formType}</span>
            <span className="text-xs" style={{ color: 'oklch(0.5 0.01 260)' }}>{group.formEntity}</span>
            <span className="flex size-5 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: 'oklch(0.5 0.15 260)' }}>{group.records.length}</span>
            <div className="flex items-center gap-1">
              {group.originalCount > 0 && <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>{group.originalCount} Orig</span>}
              {group.supersededCount > 0 && <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)' }}>{group.supersededCount} Sup</span>}
              {group.retainBothCount > 0 && <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 250)', color: 'oklch(0.35 0.14 250)' }}>{group.retainBothCount} Ret</span>}
            </div>
          </div>

          <KanbanBoard
            items={group.records}
            getConfidence={(r) => r.confidenceLevel}
            wizardIcon={FileStack}
            wizardTitle={group.formType}
            renderCard={(r) => {
              const stampLabel = r.decisionType === 'Original' ? 'ORIGINAL' : r.decisionType === 'Superseded' ? 'SUPERSEDED' : 'RETAIN BOTH'
              const stampBg = stampLabel === 'ORIGINAL' ? 'oklch(0.94 0.04 145)' : stampLabel === 'SUPERSEDED' ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 250)'
              const stampFg = stampLabel === 'ORIGINAL' ? 'oklch(0.35 0.14 145)' : stampLabel === 'SUPERSEDED' ? 'oklch(0.40 0.18 25)' : 'oklch(0.35 0.14 250)'

              return (
                <SwimCard
                  key={r.engagementPageId}
                  expandedContent={
                    <>
                      <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.35 0.01 260)' }}>{r.decisionReason}</p>
                      {r.comparedValues && r.comparedValues.some(v => !v.match) && (
                        <div className="flex items-center gap-1.5 rounded px-2 py-1" style={{ backgroundColor: 'oklch(0.97 0.015 25 / 0.5)', border: '0.0625rem solid oklch(0.92 0.03 25)' }}>
                          <AlertTriangle className="size-3 shrink-0" style={{ color: 'oklch(0.6 0.2 25)' }} />
                          <span className="text-xs" style={{ color: 'oklch(0.4 0.12 25)' }}>
                            {(() => { const m = r.comparedValues!.find(v => !v.match)!; return `${m.field}: "${m.valueA}" vs "${m.valueB}"` })()}
                          </span>
                        </div>
                      )}
                      {r.comparedValues && r.comparedValues.length > 0 && <FieldComparison values={r.comparedValues} labelA="Doc A" labelB="Doc B" />}
                      {r.documentRef && (
                        r.decisionType === 'Superseded' && r.retainedPageId ? (
                          <div className="flex flex-col gap-2">
                            <PdfPageViewer documentRef={r.documentRef} stamp="SUPERSEDED" height="16rem" />
                            <PdfPageViewer documentRef={{ pdfPath: r.documentRef.pdfPath, pageNumber: r.retainedPageId, formType: r.documentRef.formType, formLabel: `${r.documentRef.formType} (Corrected)` }} stamp="ORIGINAL" height="16rem" />
                          </div>
                        ) : (
                          <PdfPageViewer documentRef={r.documentRef} stamp={r.decisionType === 'Original' ? 'ORIGINAL' : 'RETAIN BOTH'} height="18rem" />
                        )
                      )}
                    </>
                  }
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: 'oklch(0.15 0.01 260)' }}>Pg {r.engagementPageId}</span>
                      <KanbanAction accepted={!!accepted[r.engagementPageId]} onAccept={() => setAccepted((p) => ({ ...p, [r.engagementPageId]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [r.engagementPageId]: false }))} />
                    </div>
                    <KanbanPctBar score={r.confidenceLevel} />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: stampBg, color: stampFg }}>{stampLabel}</span>
                      {r.decisionType === 'Superseded' && r.retainedPageId && (
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: 'oklch(0.5 0 0)' }}><ArrowRight className="size-2.5" />Pg {r.retainedPageId}</span>
                      )}
                      <Sparkles className="size-3" style={{ color: 'oklch(0.5 0.15 260)' }} />
                    </div>
                  </div>
                </SwimCard>
              )
            }}
          />
        </div>
      ))}
    </section>
  )
}

/* ── DUPLICATE ── */
export function VariantCDuplicate({ data }: { data: DuplicateRecord[] }) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const getKey = (r: DuplicateRecord) => r.itemType === 'DUPLICATE_DATA' ? (r as DuplicateDataRecord).organizerItemId : `${(r as DuplicateDocRecord).docIdA}-${(r as DuplicateDocRecord).docIdB}`

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2 px-1">
        <Copy className="size-5" style={{ color: 'oklch(0.5 0.15 260)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 260)' }}>Duplicate Review</h2>
        <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.4 0.01 260)' }}>{data.length} items</span>
      </header>
      <KanbanBoard items={data} getConfidence={(r) => r.confidenceLevel} wizardIcon={Copy} wizardTitle="Duplicate"
        renderCard={(r) => {
          const key = getKey(r)
          return (
            <SwimCard key={key} expandedContent={
              <>
                <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.35 0.01 260)' }}>{r.decisionReason}</p>
                {r.comparedValues && r.comparedValues.length > 0 && <FieldComparison values={r.comparedValues} labelA="A" labelB="B" />}
                {r.documentRefA && r.documentRefB && <DualDocumentPreview docRefA={r.documentRefA} docRefB={r.documentRefB} />}
              </>
            }>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: 'oklch(0.15 0.01 260)' }}>{r.itemType === 'DUPLICATE_DATA' ? (r as DuplicateDataRecord).organizerItemId : `Doc ${(r as DuplicateDocRecord).docIdA}`}</span>
                  <KanbanAction accepted={!!accepted[key]} onAccept={() => setAccepted((p) => ({ ...p, [key]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [key]: false }))} />
                </div>
                <KanbanPctBar score={r.confidenceLevel} />
              </div>
            </SwimCard>
          )
        }}
      />
    </section>
  )
}

/* ── CFA ── */
export function VariantCCfa({ data }: { data: CfaRecord[] }) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2 px-1">
        <Link2 className="size-5" style={{ color: 'oklch(0.5 0.15 260)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 260)' }}>Child Form Association</h2>
        <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.4 0.01 260)' }}>{data.length} items</span>
      </header>
      <KanbanBoard items={data} getConfidence={(r) => r.ConfidenceLevel} wizardIcon={Link2} wizardTitle="CFA"
        renderCard={(r) => (
          <SwimCard key={r.EngagementFaxFormId} expandedContent={
            <>
              {r.comparedValues && r.comparedValues.length > 0 && <FieldComparison values={r.comparedValues} labelA="Child" labelB="Parent" />}
              {r.documentRef && <DocumentPreviewButton docRef={r.documentRef} />}
            </>
          }>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: 'oklch(0.15 0.01 260)' }}>{r.childFormLabel || String(r.EngagementFaxFormId)}</span>
                <KanbanAction accepted={!!accepted[r.EngagementFaxFormId]} onAccept={() => setAccepted((p) => ({ ...p, [r.EngagementFaxFormId]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [r.EngagementFaxFormId]: false }))} />
              </div>
              <KanbanPctBar score={r.ConfidenceLevel} />
              <div className="flex items-center gap-1.5">
                <ArrowRight className="size-3" style={{ color: 'oklch(0.5 0.01 260)' }} />
                <span className="text-xs" style={{ color: 'oklch(0.4 0.01 260)' }}>{r.parentFormLabel || String(r.ParentEngagementFaxFormId)}</span>
              </div>
            </div>
          </SwimCard>
        )}
      />
    </section>
  )
}

/* ── NFR ── */
export function VariantCNfr({ data }: { data: NfrRecord[] }) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2 px-1">
        <FileSearch className="size-5" style={{ color: 'oklch(0.5 0.15 260)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 260)' }}>New Form Review</h2>
        <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.4 0.01 260)' }}>{data.length} items</span>
      </header>
      <KanbanBoard items={data} getConfidence={(r) => r.ConfidenceLevel} wizardIcon={FileSearch} wizardTitle="NFR"
        renderCard={(r) => {
          const key = `${r.EngagementPageId}-${r.FaxRowNumber}`
          return (
            <SwimCard key={key} expandedContent={
              <>
                {r.comparedValues && r.comparedValues.length > 0 && <FieldComparison values={r.comparedValues} labelA="Source" labelB="Return" />}
                {r.documentRef && <DocumentPreviewButton docRef={r.documentRef} />}
              </>
            }>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: 'oklch(0.15 0.01 260)' }}>{r.fieldLabel || `Form ${r.EngagementFormId}`}</span>
                  <KanbanAction accepted={!!accepted[key]} onAccept={() => setAccepted((p) => ({ ...p, [key]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [key]: false }))} />
                </div>
                <KanbanPctBar score={r.ConfidenceLevel} />
                {r.MatchStatus
                  ? <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: 'oklch(0.55 0.17 160)' }}><CheckCircle className="size-3" /> Match</span>
                  : <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: 'oklch(0.6 0.2 25)' }}><XCircle className="size-3" /> No Match</span>
                }
              </div>
            </SwimCard>
          )
        }}
      />
    </section>
  )
}
