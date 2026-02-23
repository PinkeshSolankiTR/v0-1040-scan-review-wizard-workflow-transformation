'use client'

/**
 * DESIGN VARIANT C: "Kanban / Swim Lane"
 * ────────────────────────────────────────
 * Style:  Three vertical columns grouped by confidence tier (High / Medium / Low).
 *         Clean white cards with subtle shadows. Indigo accent palette.
 * Layout: 3-column horizontal grid; each column scrolls independently.
 * Interaction: Drag-feel (visual only — no actual DnD in prototype). Click to expand.
 * Color: Cool slate neutrals + indigo primary + emerald success + orange warnings.
 */

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  CheckCircle2,
  Undo2,
  ChevronDown,
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
  high: {
    headerBg: 'oklch(0.94 0.04 160)',
    headerText: 'oklch(0.3 0.08 160)',
    dot: 'oklch(0.55 0.17 160)',
    label: 'High Confidence',
  },
  medium: {
    headerBg: 'oklch(0.94 0.04 80)',
    headerText: 'oklch(0.4 0.1 80)',
    dot: 'oklch(0.7 0.14 80)',
    label: 'Medium - Review',
  },
  low: {
    headerBg: 'oklch(0.94 0.04 25)',
    headerText: 'oklch(0.4 0.15 25)',
    dot: 'oklch(0.6 0.2 25)',
    label: 'Low - Escalate',
  },
} as const

type Tier = 'high' | 'medium' | 'low'

function getTier(score: number): Tier {
  if (score >= 0.9) return 'high'
  if (score >= 0.7) return 'medium'
  return 'low'
}

function LaneColumn({
  tier,
  count,
  children,
}: {
  tier: Tier
  count: number
  children: React.ReactNode
}) {
  const s = COLUMN_STYLES[tier]
  return (
    <div className="flex flex-col gap-0 rounded-lg overflow-hidden border" style={{ borderColor: 'oklch(0.9 0.005 260)' }}>
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: s.headerBg }}
      >
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.dot }} aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: s.headerText }}>
            {s.label}
          </span>
        </div>
        <span
          className="flex size-5 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: s.dot }}
        >
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2 min-h-[8rem]" style={{ backgroundColor: 'oklch(0.985 0.002 260)' }}>
        {children}
      </div>
    </div>
  )
}

function SwimCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2.5 transition-shadow hover:shadow-sm',
        className
      )}
      style={{ backgroundColor: 'oklch(1 0 0)', borderColor: 'oklch(0.92 0.005 260)' }}
    >
      {children}
    </div>
  )
}

function KanbanAction({
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
      <button
        onClick={onUndo}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors"
        style={{ color: 'oklch(0.5 0.01 260)', backgroundColor: 'oklch(0.95 0.005 260)' }}
      >
        <Undo2 className="size-3" /> Undo
      </button>
    )
  }
  return (
    <button
      onClick={onAccept}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-white transition-colors"
      style={{ backgroundColor: 'oklch(0.5 0.15 260)' }}
    >
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

/* ── Generic kanban wrapper that buckets items by tier ── */
function KanbanBoard<T>({
  items,
  getConfidence,
  renderCard,
  wizardIcon: WizardIcon,
  wizardTitle,
}: {
  items: T[]
  getConfidence: (item: T) => number
  renderCard: (item: T) => React.ReactNode
  wizardIcon: React.ElementType
  wizardTitle: string
}) {
  const high = items.filter((i) => getTier(getConfidence(i)) === 'high')
  const medium = items.filter((i) => getTier(getConfidence(i)) === 'medium')
  const low = items.filter((i) => getTier(getConfidence(i)) === 'low')

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2 px-1">
        <WizardIcon className="size-5" style={{ color: 'oklch(0.5 0.15 260)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 260)' }}>
          {wizardTitle}
        </h2>
        <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.4 0.01 260)' }}>
          {items.length} items
        </span>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <LaneColumn tier="high" count={high.length}>
          {high.map(renderCard)}
        </LaneColumn>
        <LaneColumn tier="medium" count={medium.length}>
          {medium.map(renderCard)}
        </LaneColumn>
        <LaneColumn tier="low" count={low.length}>
          {low.map(renderCard)}
        </LaneColumn>
      </div>
    </section>
  )
}

/* ── SUPERSEDED ── */
export function VariantCSuperseded({ data }: { data: SupersededRecord[] }) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})

  return (
    <KanbanBoard
      items={data}
      getConfidence={(r) => r.confidenceLevel}
      wizardIcon={FileStack}
      wizardTitle="Superseded Review"
      renderCard={(r) => (
        <SwimCard key={r.engagementPageId}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: 'oklch(0.15 0.01 260)' }}>
                Page {r.engagementPageId}
              </span>
              <KanbanAction
                accepted={!!accepted[r.engagementPageId]}
                onAccept={() => setAccepted((p) => ({ ...p, [r.engagementPageId]: true }))}
                onUndo={() => setAccepted((p) => ({ ...p, [r.engagementPageId]: false }))}
              />
            </div>
            <KanbanPctBar score={r.confidenceLevel} />
            <div className="flex items-center gap-1.5">
              <span
                className="rounded px-1.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor:
                    r.decisionType === 'Superseded'
                      ? 'oklch(0.6 0.2 25 / 0.12)'
                      : r.decisionType === 'RetainBoth'
                        ? 'oklch(0.7 0.14 80 / 0.15)'
                        : 'oklch(0.55 0.17 160 / 0.12)',
                  color:
                    r.decisionType === 'Superseded'
                      ? 'oklch(0.45 0.18 25)'
                      : r.decisionType === 'RetainBoth'
                        ? 'oklch(0.4 0.12 80)'
                        : 'oklch(0.35 0.12 160)',
                }}
              >
                {r.decisionType}
              </span>
              <Sparkles className="size-3" style={{ color: 'oklch(0.5 0.15 260)' }} />
            </div>
            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'oklch(0.45 0.01 260)' }}>
              {r.decisionReason}
            </p>
          </div>
        </SwimCard>
      )}
    />
  )
}

/* ── DUPLICATE ── */
export function VariantCDuplicate({ data }: { data: DuplicateRecord[] }) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  const getKey = (r: DuplicateRecord) =>
    r.itemType === 'DUPLICATE_DATA'
      ? (r as DuplicateDataRecord).organizerItemId
      : `${(r as DuplicateDocRecord).docIdA}-${(r as DuplicateDocRecord).docIdB}`

  return (
    <KanbanBoard
      items={data}
      getConfidence={(r) => r.confidenceLevel}
      wizardIcon={Copy}
      wizardTitle="Duplicate Review"
      renderCard={(r) => {
        const key = getKey(r)
        const isData = r.itemType === 'DUPLICATE_DATA'
        return (
          <SwimCard key={key}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: 'oklch(0.15 0.01 260)' }}>
                  {isData ? (r as DuplicateDataRecord).organizerItemId : `Doc ${(r as DuplicateDocRecord).docIdA}/${(r as DuplicateDocRecord).docIdB}`}
                </span>
                <KanbanAction
                  accepted={!!accepted[key]}
                  onAccept={() => setAccepted((p) => ({ ...p, [key]: true }))}
                  onUndo={() => setAccepted((p) => ({ ...p, [key]: false }))}
                />
              </div>
              <KanbanPctBar score={r.confidenceLevel} />
              <div className="flex items-center gap-1.5">
                <span className="rounded px-1.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: 'oklch(0.5 0.15 260 / 0.1)', color: 'oklch(0.4 0.12 260)' }}>
                  {isData ? 'Data' : 'Document'}
                </span>
                <Sparkles className="size-3" style={{ color: 'oklch(0.5 0.15 260)' }} />
              </div>
              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'oklch(0.45 0.01 260)' }}>
                {r.decisionReason}
              </p>
            </div>
          </SwimCard>
        )
      }}
    />
  )
}

/* ── CFA ── */
export function VariantCCfa({ data }: { data: CfaRecord[] }) {
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})

  return (
    <KanbanBoard
      items={data}
      getConfidence={(r) => r.ConfidenceLevel}
      wizardIcon={Link2}
      wizardTitle="Child Form Association"
      renderCard={(r) => (
        <SwimCard key={r.EngagementFaxFormId}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold" style={{ color: 'oklch(0.15 0.01 260)' }}>
                  {r.EngagementFaxFormId}
                </span>
                <ArrowRight className="size-3" style={{ color: 'oklch(0.5 0.01 260)' }} />
                <span className="text-sm" style={{ color: 'oklch(0.4 0.01 260)' }}>
                  {r.ParentEngagementFaxFormId}
                </span>
              </div>
              <KanbanAction
                accepted={!!accepted[r.EngagementFaxFormId]}
                onAccept={() => setAccepted((p) => ({ ...p, [r.EngagementFaxFormId]: true }))}
                onUndo={() => setAccepted((p) => ({ ...p, [r.EngagementFaxFormId]: false }))}
              />
            </div>
            <KanbanPctBar score={r.ConfidenceLevel} />
            <div className="flex items-center gap-1.5">
              <span className="rounded px-1.5 py-0.5 text-xs" style={{ backgroundColor: 'oklch(0.94 0.005 260)', color: 'oklch(0.4 0.01 260)' }}>
                {r.ParentFaxFormDwpCode}
              </span>
              {r.IsAddForm && (
                <span className="rounded-full px-1.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: 'oklch(0.5 0.15 260)' }}>
                  Add
                </span>
              )}
            </div>
          </div>
        </SwimCard>
      )}
    />
  )
}

/* ── NFR ── */
const FIELD_GROUPS_C: Record<number, string> = {
  100: 'Income', 200: 'Deductions', 300: 'Wages', 400: 'Interest', 500: 'Business',
}

export function VariantCNfr({ data }: { data: NfrRecord[] }) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  return (
    <KanbanBoard
      items={data}
      getConfidence={(r) => r.ConfidenceLevel}
      wizardIcon={FileSearch}
      wizardTitle="New Form Review"
      renderCard={(r) => {
        const key = `${r.EngagementPageId}-${r.FaxRowNumber}`
        return (
          <SwimCard key={key}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: 'oklch(0.15 0.01 260)' }}>
                  Form {r.EngagementFormId}
                </span>
                <KanbanAction
                  accepted={!!accepted[key]}
                  onAccept={() => setAccepted((p) => ({ ...p, [key]: true }))}
                  onUndo={() => setAccepted((p) => ({ ...p, [key]: false }))}
                />
              </div>
              <KanbanPctBar score={r.ConfidenceLevel} />
              <div className="flex items-center gap-2">
                <span className="rounded px-1.5 py-0.5 text-xs" style={{ backgroundColor: 'oklch(0.94 0.005 260)', color: 'oklch(0.4 0.01 260)' }}>
                  {FIELD_GROUPS_C[r.FieldGroupId] ?? `Group ${r.FieldGroupId}`}
                </span>
                {r.MatchStatus ? (
                  <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: 'oklch(0.55 0.17 160)' }}>
                    <CheckCircle className="size-3" /> Match
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: 'oklch(0.6 0.2 25)' }}>
                    <XCircle className="size-3" /> No Match
                  </span>
                )}
              </div>
            </div>
          </SwimCard>
        )
      }}
    />
  )
}
