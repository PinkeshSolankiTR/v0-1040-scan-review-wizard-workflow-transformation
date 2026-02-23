'use client'

/**
 * DESIGN VARIANT D: "Split Panel / Master-Detail"
 * Compact list on left, rich detail pane on right with field comparison + document preview.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
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

/* ── Shared layout primitives ── */

function SplitShell({
  wizardIcon: WizardIcon, title, count, listItems, selectedId, onSelect, detailContent,
}: {
  wizardIcon: React.ElementType; title: string; count: number
  listItems: { id: string; label: string; sublabel: string; confidence: number; formType?: string }[]
  selectedId: string | null; onSelect: (id: string) => void; detailContent: React.ReactNode
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border" style={{ borderColor: 'oklch(0.88 0.01 240)' }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: 'oklch(0.22 0.03 240)', color: 'oklch(0.92 0 0)' }}>
        <div className="flex items-center gap-2">
          <WizardIcon className="size-4" />
          <h2 className="text-sm font-bold">{title}</h2>
        </div>
        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'oklch(0.35 0.03 240)' }}>{count}</span>
      </div>
      <div className="grid grid-cols-5" style={{ backgroundColor: 'oklch(0.98 0.002 240)' }}>
        <div className="col-span-2 flex flex-col border-r" style={{ borderColor: 'oklch(0.91 0.005 240)' }}>
          {listItems.map((item) => {
            const isSelected = item.id === selectedId
            const dotColor = item.confidence >= 0.9 ? 'oklch(0.55 0.17 160)' : item.confidence >= 0.7 ? 'oklch(0.72 0.14 80)' : 'oklch(0.6 0.18 15)'
            return (
              <button
                key={item.id} onClick={() => onSelect(item.id)}
                className={cn('flex items-center gap-2.5 border-b px-3 py-2.5 text-left transition-colors', isSelected ? 'border-l-2' : 'border-l-2 border-l-transparent')}
                style={{ borderBottomColor: 'oklch(0.93 0.005 240)', ...(isSelected ? { backgroundColor: 'oklch(0.96 0.01 240)', borderLeftColor: 'oklch(0.5 0.15 240)' } : {}) }}
                aria-selected={isSelected} type="button"
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden="true" />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium truncate" style={{ color: 'oklch(0.2 0.01 240)' }}>{item.label}</span>
                  <span className="text-xs truncate" style={{ color: 'oklch(0.5 0.01 240)' }}>{item.sublabel}</span>
                </div>
                <span className="ml-auto shrink-0 font-mono text-xs tabular-nums" style={{ color: dotColor }}>{Math.round(item.confidence * 100)}%</span>
              </button>
            )
          })}
        </div>
        <div className="col-span-3 p-4 min-h-[14rem] overflow-y-auto" style={{ backgroundColor: 'oklch(1 0 0)', maxHeight: '36rem' }}>
          {detailContent || (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm" style={{ color: 'oklch(0.6 0.01 240)' }}>Select an item from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function DetailAction({ accepted, onAccept, onUndo }: { accepted: boolean; onAccept: () => void; onUndo: () => void }) {
  if (accepted) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-sm font-medium" style={{ color: 'oklch(0.55 0.17 160)' }}><CheckCircle2 className="size-4" /> Accepted</span>
        <Button variant="ghost" size="sm" onClick={onUndo} className="text-xs" style={{ color: 'oklch(0.5 0.01 240)' }}><Undo2 className="size-3.5" /> Undo</Button>
      </div>
    )
  }
  return <Button size="sm" onClick={onAccept} className="gap-1.5 text-white" style={{ backgroundColor: 'oklch(0.5 0.15 240)' }}><CheckCircle2 className="size-4" /> Accept Decision</Button>
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'oklch(0.5 0.01 240)' }}>{label}</dt>
      <dd className="text-sm" style={{ color: 'oklch(0.2 0.01 240)' }}>{value}</dd>
    </div>
  )
}

/* ── SUPERSEDED ── */
export function VariantDSuperseded({ data }: { data: SupersededRecord[] }) {
  const [selected, setSelected] = useState<number | null>(data[0]?.engagementPageId ?? null)
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})
  const record = data.find((r) => r.engagementPageId === selected)

  return (
    <SplitShell wizardIcon={FileStack} title="Superseded Review" count={data.length}
      listItems={data.map((r) => ({
        id: String(r.engagementPageId),
        label: r.documentRef?.formLabel ?? `Page ${r.engagementPageId}`,
        sublabel: r.decisionType,
        confidence: r.confidenceLevel,
        formType: r.documentRef?.formType,
      }))}
      selectedId={selected != null ? String(selected) : null}
      onSelect={(id) => setSelected(Number(id))}
      detailContent={record ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 240)' }}>{record.documentRef?.formLabel ?? `Page ${record.engagementPageId}`}</h3>
              <Sparkles className="size-4" style={{ color: 'oklch(0.5 0.15 240)' }} />
            </div>
            <DetailAction accepted={!!accepted[record.engagementPageId]} onAccept={() => setAccepted((p) => ({ ...p, [record.engagementPageId]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [record.engagementPageId]: false }))} />
          </div>
          <dl className="grid grid-cols-3 gap-4">
            <DetailField label="Decision" value={<span className="inline-flex rounded px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: record.decisionType === 'Superseded' ? 'oklch(0.6 0.18 15 / 0.12)' : 'oklch(0.55 0.17 160 / 0.12)', color: record.decisionType === 'Superseded' ? 'oklch(0.45 0.16 15)' : 'oklch(0.35 0.12 160)' }}>{record.decisionType}</span>} />
            <DetailField label="Confidence" value={`${Math.round(record.confidenceLevel * 100)}%`} />
            <DetailField label="Rule Set" value={record.appliedRuleSet} />
          </dl>
          <div className="flex flex-col gap-1.5 rounded-md p-3" style={{ backgroundColor: 'oklch(0.97 0.005 240)' }}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" style={{ color: 'oklch(0.5 0.15 240)' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'oklch(0.5 0.15 240)' }}>AI Reasoning</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.3 0.01 240)' }}>{record.decisionReason}</p>
          </div>
          {record.escalationReason && (
            <div className="flex items-start gap-2 rounded-md p-3" style={{ backgroundColor: 'oklch(0.6 0.18 15 / 0.06)' }}>
              <AlertTriangle className="mt-0.5 size-4 shrink-0" style={{ color: 'oklch(0.6 0.18 15)' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: 'oklch(0.5 0.16 15)' }}>Escalation Required</p>
                <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.35 0.1 15)' }}>{record.escalationReason}</p>
              </div>
            </div>
          )}
          {record.comparedValues && record.comparedValues.length > 0 && <FieldComparison values={record.comparedValues} labelA="Document A" labelB="Document B" />}
          {record.documentRef && <DocumentPreviewButton docRef={record.documentRef} />}
        </div>
      ) : null}
    />
  )
}

/* ── DUPLICATE ── */
export function VariantDDuplicate({ data }: { data: DuplicateRecord[] }) {
  const getKey = (r: DuplicateRecord) => r.itemType === 'DUPLICATE_DATA' ? (r as DuplicateDataRecord).organizerItemId : `${(r as DuplicateDocRecord).docIdA}-${(r as DuplicateDocRecord).docIdB}`
  const [selected, setSelected] = useState<string | null>(data[0] ? getKey(data[0]) : null)
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const record = data.find((r) => getKey(r) === selected)

  return (
    <SplitShell wizardIcon={Copy} title="Duplicate Review" count={data.length}
      listItems={data.map((r) => {
        const isData = r.itemType === 'DUPLICATE_DATA'
        return {
          id: getKey(r),
          label: isData ? (r as DuplicateDataRecord).organizerItemId : `Doc ${(r as DuplicateDocRecord).docIdA}/${(r as DuplicateDocRecord).docIdB}`,
          sublabel: isData ? 'Data' : 'Document',
          confidence: r.confidenceLevel,
        }
      })}
      selectedId={selected} onSelect={setSelected}
      detailContent={record ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 240)' }}>
                {record.itemType === 'DUPLICATE_DATA' ? (record as DuplicateDataRecord).organizerItemId : `Doc ${(record as DuplicateDocRecord).docIdA} / ${(record as DuplicateDocRecord).docIdB}`}
              </h3>
              <Sparkles className="size-4" style={{ color: 'oklch(0.5 0.15 240)' }} />
            </div>
            <DetailAction accepted={!!accepted[getKey(record)]} onAccept={() => setAccepted((p) => ({ ...p, [getKey(record)]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [getKey(record)]: false }))} />
          </div>
          <dl className="grid grid-cols-3 gap-4">
            <DetailField label="Type" value={record.itemType === 'DUPLICATE_DATA' ? 'Data Duplicate' : 'Document Duplicate'} />
            <DetailField label="Confidence" value={`${Math.round(record.confidenceLevel * 100)}%`} />
            <DetailField label="Decision" value={record.decision} />
          </dl>
          <div className="flex flex-col gap-1.5 rounded-md p-3" style={{ backgroundColor: 'oklch(0.97 0.005 240)' }}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" style={{ color: 'oklch(0.5 0.15 240)' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'oklch(0.5 0.15 240)' }}>AI Reasoning</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.3 0.01 240)' }}>{record.decisionReason}</p>
          </div>
          {record.escalationReason && (
            <div className="flex items-start gap-2 rounded-md p-3" style={{ backgroundColor: 'oklch(0.6 0.18 15 / 0.06)' }}>
              <AlertTriangle className="mt-0.5 size-4 shrink-0" style={{ color: 'oklch(0.6 0.18 15)' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: 'oklch(0.5 0.16 15)' }}>Escalation Required</p>
                <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.35 0.1 15)' }}>{record.escalationReason}</p>
              </div>
            </div>
          )}
          {record.comparedValues && record.comparedValues.length > 0 && (
            <FieldComparison values={record.comparedValues} labelA={record.documentRefA?.formLabel ?? 'Source A'} labelB={record.documentRefB?.formLabel ?? 'Source B'} />
          )}
          {record.documentRefA && record.documentRefB && <DualDocumentPreview docRefA={record.documentRefA} docRefB={record.documentRefB} />}
        </div>
      ) : null}
    />
  )
}

/* ── CFA ── */
export function VariantDCfa({ data }: { data: CfaRecord[] }) {
  const [selected, setSelected] = useState<number | null>(data[0]?.EngagementFaxFormId ?? null)
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})
  const record = data.find((r) => r.EngagementFaxFormId === selected)

  return (
    <SplitShell wizardIcon={Link2} title="Child Form Association" count={data.length}
      listItems={data.map((r) => ({
        id: String(r.EngagementFaxFormId),
        label: r.childFormLabel || `Form ${r.EngagementFaxFormId}`,
        sublabel: r.parentFormLabel || `Parent: ${r.ParentEngagementFaxFormId}`,
        confidence: r.ConfidenceLevel,
      }))}
      selectedId={selected != null ? String(selected) : null}
      onSelect={(id) => setSelected(Number(id))}
      detailContent={record ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 240)' }}>{record.childFormLabel || `Form ${record.EngagementFaxFormId}`}</h3>
              <ArrowRight className="size-4" style={{ color: 'oklch(0.5 0.01 240)' }} />
              <span className="text-lg" style={{ color: 'oklch(0.4 0.01 240)' }}>{record.parentFormLabel || String(record.ParentEngagementFaxFormId)}</span>
            </div>
            <DetailAction accepted={!!accepted[record.EngagementFaxFormId]} onAccept={() => setAccepted((p) => ({ ...p, [record.EngagementFaxFormId]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [record.EngagementFaxFormId]: false }))} />
          </div>
          <dl className="grid grid-cols-3 gap-4">
            <DetailField label="Confidence" value={`${Math.round(record.ConfidenceLevel * 100)}%`} />
            <DetailField label="DWP Code" value={record.ParentFaxFormDwpCode} />
            <DetailField label="Type" value={record.IsAddForm ? <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: 'oklch(0.5 0.15 240)' }}>Add Form</span> : 'Standard'} />
          </dl>
          {record.comparedValues && record.comparedValues.length > 0 && <FieldComparison values={record.comparedValues} labelA="Child Form" labelB="Parent Return" />}
          {record.documentRef && <DocumentPreviewButton docRef={record.documentRef} />}
        </div>
      ) : null}
    />
  )
}

/* ── NFR ── */
export function VariantDNfr({ data }: { data: NfrRecord[] }) {
  const [selected, setSelected] = useState<string | null>(data[0] ? `${data[0].EngagementPageId}-${data[0].FaxRowNumber}` : null)
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const record = data.find((r) => `${r.EngagementPageId}-${r.FaxRowNumber}` === selected)

  return (
    <SplitShell wizardIcon={FileSearch} title="New Form Review" count={data.length}
      listItems={data.map((r) => ({
        id: `${r.EngagementPageId}-${r.FaxRowNumber}`,
        label: r.fieldLabel || `Form ${r.EngagementFormId}`,
        sublabel: `${r.sourceValue ?? `Row ${r.FaxRowNumber}`}`,
        confidence: r.ConfidenceLevel,
      }))}
      selectedId={selected} onSelect={setSelected}
      detailContent={record ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 240)' }}>{record.fieldLabel || `Form ${record.EngagementFormId}`}</h3>
              <Sparkles className="size-4" style={{ color: 'oklch(0.5 0.15 240)' }} />
            </div>
            <DetailAction
              accepted={!!accepted[`${record.EngagementPageId}-${record.FaxRowNumber}`]}
              onAccept={() => setAccepted((p) => ({ ...p, [`${record.EngagementPageId}-${record.FaxRowNumber}`]: true }))}
              onUndo={() => setAccepted((p) => ({ ...p, [`${record.EngagementPageId}-${record.FaxRowNumber}`]: false }))}
            />
          </div>
          <dl className="grid grid-cols-4 gap-4">
            <DetailField label="Source" value={record.sourceValue || 'N/A'} />
            <DetailField label="Return" value={record.returnValue || 'N/A'} />
            <DetailField label="Confidence" value={`${Math.round(record.ConfidenceLevel * 100)}%`} />
            <DetailField label="Match" value={
              record.MatchStatus
                ? <span className="flex items-center gap-1 text-sm font-medium" style={{ color: 'oklch(0.55 0.17 160)' }}><CheckCircle className="size-4" /> Matched</span>
                : <span className="flex items-center gap-1 text-sm font-medium" style={{ color: 'oklch(0.6 0.18 15)' }}><XCircle className="size-4" /> Unmatched</span>
            } />
          </dl>
          {record.comparedValues && record.comparedValues.length > 0 && <FieldComparison values={record.comparedValues} labelA="Source Document" labelB="Tax Return" />}
          {record.documentRef && <DocumentPreviewButton docRef={record.documentRef} />}
        </div>
      ) : null}
    />
  )
}
