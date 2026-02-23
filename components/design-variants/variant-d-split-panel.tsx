'use client'

/**
 * DESIGN VARIANT D: "Split Panel / Master-Detail"
 * Compact list on left grouped by form type for Superseded,
 * rich detail pane on right with field comparison + PDF page viewer.
 */

import { useState, useMemo } from 'react'
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
  FileText,
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

/* ── Shared layout primitives ── */

function SplitShell({
  wizardIcon: WizardIcon, title, count, listContent, detailContent,
}: {
  wizardIcon: React.ElementType; title: string; count: number
  listContent: React.ReactNode; detailContent: React.ReactNode
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
        <div className="col-span-2 flex flex-col border-r overflow-y-auto" style={{ borderColor: 'oklch(0.91 0.005 240)', maxHeight: '40rem' }}>
          {listContent}
        </div>
        <div className="col-span-3 p-4 min-h-[14rem] overflow-y-auto" style={{ backgroundColor: 'oklch(1 0 0)', maxHeight: '40rem' }}>
          {detailContent}
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

/* ── Superseded grouping ── */
interface FormGroup {
  formType: string
  formEntity: string
  records: SupersededRecord[]
  originalCount: number
  supersededCount: number
  retainBothCount: number
  averageConfidence: number
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
      averageConfidence: records.reduce((sum, r) => sum + r.confidenceLevel, 0) / records.length,
    })
  }
  return groups
}

const smallPill: React.CSSProperties = {
  fontSize: '0.5625rem', fontWeight: 700, padding: '0.0625rem 0.3125rem',
  borderRadius: '1rem', textTransform: 'uppercase' as const, letterSpacing: '0.03em',
}

/* ── SUPERSEDED ── */
export function VariantDSuperseded({ data }: { data: SupersededRecord[] }) {
  const [selected, setSelected] = useState<number | null>(data[0]?.engagementPageId ?? null)
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})
  const groups = useMemo(() => groupByFormType(data), [data])
  const record = data.find((r) => r.engagementPageId === selected)

  const stampLabel = record?.decisionType === 'Original' ? 'ORIGINAL' : record?.decisionType === 'Superseded' ? 'SUPERSEDED' : 'RETAIN BOTH'

  return (
    <SplitShell wizardIcon={FileStack} title="Superseded Review" count={data.length}
      listContent={
        <>
          {groups.map((group) => (
            <div key={group.formType}>
              {/* Form type group header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ backgroundColor: 'oklch(0.96 0.005 240)', borderColor: 'oklch(0.91 0.005 240)' }}>
                <FileText className="size-3.5 shrink-0" style={{ color: 'oklch(0.5 0.15 240)' }} />
                <span className="text-xs font-bold" style={{ color: 'oklch(0.25 0.01 240)' }}>{group.formType}</span>
                <span className="flex size-4 items-center justify-center rounded-full text-[0.5625rem] font-bold text-white" style={{ backgroundColor: 'oklch(0.5 0.15 240)' }}>{group.records.length}</span>
                <span className="text-xs font-mono tabular-nums" style={{ color: group.averageConfidence >= 0.9 ? 'oklch(0.55 0.17 160)' : group.averageConfidence >= 0.7 ? 'oklch(0.72 0.14 80)' : 'oklch(0.6 0.18 15)' }}>{Math.round(group.averageConfidence * 100)}%</span>
                <div className="flex items-center gap-1 ml-auto">
                  {group.originalCount > 0 && <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>{group.originalCount} O</span>}
                  {group.supersededCount > 0 && <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)' }}>{group.supersededCount} S</span>}
                  {group.retainBothCount > 0 && <span style={{ ...smallPill, backgroundColor: 'oklch(0.94 0.04 250)', color: 'oklch(0.35 0.14 250)' }}>{group.retainBothCount} R</span>}
                </div>
              </div>
              {/* Records in group */}
              {group.records.map((r) => {
                const isSelected = r.engagementPageId === selected
                const dotColor = r.confidenceLevel >= 0.9 ? 'oklch(0.55 0.17 160)' : r.confidenceLevel >= 0.7 ? 'oklch(0.72 0.14 80)' : 'oklch(0.6 0.18 15)'
                const decStampBg = r.decisionType === 'Original' ? 'oklch(0.94 0.04 145)' : r.decisionType === 'Superseded' ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 250)'
                const decStampFg = r.decisionType === 'Original' ? 'oklch(0.35 0.14 145)' : r.decisionType === 'Superseded' ? 'oklch(0.40 0.18 25)' : 'oklch(0.35 0.14 250)'

                return (
                  <button
                    key={r.engagementPageId}
                    onClick={() => setSelected(r.engagementPageId)}
                    className={cn('flex items-center gap-2.5 border-b px-3 py-2.5 text-left transition-colors w-full', isSelected ? 'border-l-2' : 'border-l-2 border-l-transparent')}
                    style={{
                      borderBottomColor: 'oklch(0.93 0.005 240)',
                      ...(isSelected ? { backgroundColor: 'oklch(0.96 0.01 240)', borderLeftColor: 'oklch(0.5 0.15 240)' } : {}),
                    }}
                    aria-selected={isSelected} type="button"
                  >
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden="true" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate" style={{ color: 'oklch(0.2 0.01 240)' }}>Pg {r.engagementPageId}</span>
                        <span className="rounded px-1 py-0.5 text-[0.5625rem] font-bold" style={{ backgroundColor: decStampBg, color: decStampFg }}>{r.decisionType}</span>
                      </div>
                      <span className="text-xs truncate" style={{ color: 'oklch(0.5 0.01 240)' }}>{r.documentRef?.formLabel ?? 'No label'}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </>
      }
      detailContent={record ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 240)' }}>{record.documentRef?.formLabel ?? `Page ${record.engagementPageId}`}</h3>
              <Sparkles className="size-4" style={{ color: 'oklch(0.5 0.15 240)' }} />
            </div>
            <DetailAction accepted={!!accepted[record.engagementPageId]} onAccept={() => setAccepted((p) => ({ ...p, [record.engagementPageId]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [record.engagementPageId]: false }))} />
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <DetailField label="Decision" value={
              <span className="inline-flex rounded px-2 py-0.5 text-xs font-semibold" style={{
                backgroundColor: record.decisionType === 'Superseded' ? 'oklch(0.6 0.18 15 / 0.12)' : record.decisionType === 'RetainBoth' ? 'oklch(0.55 0.15 250 / 0.12)' : 'oklch(0.55 0.17 160 / 0.12)',
                color: record.decisionType === 'Superseded' ? 'oklch(0.45 0.16 15)' : record.decisionType === 'RetainBoth' ? 'oklch(0.35 0.14 250)' : 'oklch(0.35 0.12 160)',
              }}>{record.decisionType}</span>
            } />
            <DetailField label="Rule Set" value={record.appliedRuleSet} />
          </dl>
          {record.decisionType === 'Superseded' && record.retainedPageId && (
            <div className="flex items-center gap-2 rounded-md px-3 py-2" style={{ backgroundColor: 'oklch(0.97 0.005 240)' }}>
              <ArrowRight className="size-3.5" style={{ color: 'oklch(0.5 0.15 240)' }} />
              <span className="text-sm" style={{ color: 'oklch(0.3 0.01 240)' }}>
                This page is superseded by <strong>Page {record.retainedPageId}</strong>
              </span>
            </div>
          )}
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
          {/* Key difference callout */}
          {record.comparedValues && record.comparedValues.some(v => !v.match) && (
            <div className="flex items-center gap-2 rounded px-3 py-2" style={{ backgroundColor: 'oklch(0.97 0.015 25 / 0.5)', border: '0.0625rem solid oklch(0.92 0.03 25)' }}>
              <AlertTriangle className="size-4 shrink-0" style={{ color: 'oklch(0.6 0.2 25)' }} />
              <span className="text-xs" style={{ color: 'oklch(0.4 0.12 25)' }}>
                <strong>Key difference:</strong>{' '}
                {(() => { const m = record.comparedValues!.find(v => !v.match)!; return `${m.field}: "${m.valueA}" vs "${m.valueB}"` })()}
              </span>
            </div>
          )}
          {/* Group-level field comparison */}
          {(() => {
            const recordGroup = groups.find(g => g.records.some(r => r.engagementPageId === record.engagementPageId))
            if (!recordGroup) return null
            const allCompared = recordGroup.records.flatMap(r => r.comparedValues ?? [])
            const unique = allCompared.filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)
            if (unique.length === 0) return null
            const originalRec = recordGroup.records.find(r => r.decisionType === 'Original') ?? recordGroup.records[0]
            const supersededRec = recordGroup.records.find(r => r.decisionType === 'Superseded')
            return (
              <div>
                <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'oklch(0.25 0 0)' }}>
                  <Sparkles className="size-3" style={{ color: 'oklch(0.5 0.15 240)' }} />
                  Field Comparison &mdash; {recordGroup.formType}
                </p>
                <FieldComparison
                  values={unique}
                  labelA={originalRec.documentRef?.formLabel ?? 'Original'}
                  labelB={supersededRec?.documentRef?.formLabel ?? 'Superseding Version'}
                />
              </div>
            )
          })()}
          {/* PDF page viewer */}
          {record.documentRef && (
            record.decisionType === 'Superseded' && record.retainedPageId ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'oklch(0.50 0.20 25)' }}>Superseded</p>
                  <PdfPageViewer documentRef={record.documentRef} stamp="SUPERSEDED" height="20rem" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'oklch(0.45 0.17 145)' }}>Retained</p>
                  <PdfPageViewer documentRef={{ pdfPath: record.documentRef.pdfPath, pageNumber: record.retainedPageId, formType: record.documentRef.formType, formLabel: `${record.documentRef.formType} (Corrected)` }} stamp="ORIGINAL" height="20rem" />
                </div>
              </div>
            ) : (
              <PdfPageViewer documentRef={record.documentRef} stamp={record.decisionType === 'Original' ? 'ORIGINAL' : 'RETAIN BOTH'} height="24rem" />
            )
          )}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm" style={{ color: 'oklch(0.6 0.01 240)' }}>Select an item from the list to view details</p>
        </div>
      )}
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
      listContent={
        data.map((r) => {
          const key = getKey(r)
          const isSelected = key === selected
          const dotColor = r.confidenceLevel >= 0.9 ? 'oklch(0.55 0.17 160)' : r.confidenceLevel >= 0.7 ? 'oklch(0.72 0.14 80)' : 'oklch(0.6 0.18 15)'
          return (
            <button key={key} onClick={() => setSelected(key)}
              className={cn('flex items-center gap-2.5 border-b px-3 py-2.5 text-left transition-colors w-full', isSelected ? 'border-l-2' : 'border-l-2 border-l-transparent')}
              style={{ borderBottomColor: 'oklch(0.93 0.005 240)', ...(isSelected ? { backgroundColor: 'oklch(0.96 0.01 240)', borderLeftColor: 'oklch(0.5 0.15 240)' } : {}) }}
              aria-selected={isSelected} type="button"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: 'oklch(0.2 0.01 240)' }}>{r.itemType === 'DUPLICATE_DATA' ? (r as DuplicateDataRecord).organizerItemId : `Doc ${(r as DuplicateDocRecord).docIdA}/${(r as DuplicateDocRecord).docIdB}`}</span>
                <span className="text-xs truncate" style={{ color: 'oklch(0.5 0.01 240)' }}>{r.itemType === 'DUPLICATE_DATA' ? 'Data' : 'Document'}</span>
              </div>
              <span className="ml-auto shrink-0 font-mono text-xs tabular-nums" style={{ color: dotColor }}>{Math.round(r.confidenceLevel * 100)}%</span>
            </button>
          )
        })
      }
      detailContent={record ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 240)' }}>
              {record.itemType === 'DUPLICATE_DATA' ? (record as DuplicateDataRecord).organizerItemId : `Doc ${(record as DuplicateDocRecord).docIdA} / ${(record as DuplicateDocRecord).docIdB}`}
            </h3>
            <DetailAction accepted={!!accepted[getKey(record)]} onAccept={() => setAccepted((p) => ({ ...p, [getKey(record)]: true }))} onUndo={() => setAccepted((p) => ({ ...p, [getKey(record)]: false }))} />
          </div>
          <dl className="grid grid-cols-3 gap-4">
            <DetailField label="Type" value={record.itemType === 'DUPLICATE_DATA' ? 'Data' : 'Document'} />
            <DetailField label="Confidence" value={`${Math.round(record.confidenceLevel * 100)}%`} />
            <DetailField label="Decision" value={record.decision} />
          </dl>
          <div className="flex flex-col gap-1.5 rounded-md p-3" style={{ backgroundColor: 'oklch(0.97 0.005 240)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'oklch(0.5 0.15 240)' }}>AI Reasoning</span>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.3 0.01 240)' }}>{record.decisionReason}</p>
          </div>
          {record.comparedValues && record.comparedValues.length > 0 && <FieldComparison values={record.comparedValues} labelA={record.documentRefA?.formLabel ?? 'A'} labelB={record.documentRefB?.formLabel ?? 'B'} />}
          {record.documentRefA && record.documentRefB && <DualDocumentPreview docRefA={record.documentRefA} docRefB={record.documentRefB} />}
        </div>
      ) : <div className="flex h-full items-center justify-center"><p className="text-sm" style={{ color: 'oklch(0.6 0.01 240)' }}>Select an item</p></div>}
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
      listContent={
        data.map((r) => {
          const isSelected = r.EngagementFaxFormId === selected
          const dotColor = r.ConfidenceLevel >= 0.9 ? 'oklch(0.55 0.17 160)' : r.ConfidenceLevel >= 0.7 ? 'oklch(0.72 0.14 80)' : 'oklch(0.6 0.18 15)'
          return (
            <button key={r.EngagementFaxFormId} onClick={() => setSelected(r.EngagementFaxFormId)}
              className={cn('flex items-center gap-2.5 border-b px-3 py-2.5 text-left transition-colors w-full', isSelected ? 'border-l-2' : 'border-l-2 border-l-transparent')}
              style={{ borderBottomColor: 'oklch(0.93 0.005 240)', ...(isSelected ? { backgroundColor: 'oklch(0.96 0.01 240)', borderLeftColor: 'oklch(0.5 0.15 240)' } : {}) }}
              aria-selected={isSelected} type="button"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: 'oklch(0.2 0.01 240)' }}>{r.childFormLabel || `Form ${r.EngagementFaxFormId}`}</span>
                <span className="text-xs truncate" style={{ color: 'oklch(0.5 0.01 240)' }}>{r.parentFormLabel || `Parent: ${r.ParentEngagementFaxFormId}`}</span>
              </div>
              <span className="ml-auto shrink-0 font-mono text-xs tabular-nums" style={{ color: dotColor }}>{Math.round(r.ConfidenceLevel * 100)}%</span>
            </button>
          )
        })
      }
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
            <DetailField label="Type" value={record.IsAddForm ? 'Add Form' : 'Standard'} />
          </dl>
          {record.comparedValues && record.comparedValues.length > 0 && <FieldComparison values={record.comparedValues} labelA="Child" labelB="Parent" />}
          {record.documentRef && <DocumentPreviewButton docRef={record.documentRef} />}
        </div>
      ) : <div className="flex h-full items-center justify-center"><p className="text-sm" style={{ color: 'oklch(0.6 0.01 240)' }}>Select an item</p></div>}
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
      listContent={
        data.map((r) => {
          const key = `${r.EngagementPageId}-${r.FaxRowNumber}`
          const isSelected = key === selected
          const dotColor = r.ConfidenceLevel >= 0.9 ? 'oklch(0.55 0.17 160)' : r.ConfidenceLevel >= 0.7 ? 'oklch(0.72 0.14 80)' : 'oklch(0.6 0.18 15)'
          return (
            <button key={key} onClick={() => setSelected(key)}
              className={cn('flex items-center gap-2.5 border-b px-3 py-2.5 text-left transition-colors w-full', isSelected ? 'border-l-2' : 'border-l-2 border-l-transparent')}
              style={{ borderBottomColor: 'oklch(0.93 0.005 240)', ...(isSelected ? { backgroundColor: 'oklch(0.96 0.01 240)', borderLeftColor: 'oklch(0.5 0.15 240)' } : {}) }}
              aria-selected={isSelected} type="button"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: 'oklch(0.2 0.01 240)' }}>{r.fieldLabel || `Form ${r.EngagementFormId}`}</span>
                <span className="text-xs truncate" style={{ color: 'oklch(0.5 0.01 240)' }}>{r.sourceValue ?? `Row ${r.FaxRowNumber}`}</span>
              </div>
              <span className="ml-auto shrink-0 font-mono text-xs tabular-nums" style={{ color: dotColor }}>{Math.round(r.ConfidenceLevel * 100)}%</span>
            </button>
          )
        })
      }
      detailContent={record ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold" style={{ color: 'oklch(0.15 0.01 240)' }}>{record.fieldLabel || `Form ${record.EngagementFormId}`}</h3>
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
          {record.comparedValues && record.comparedValues.length > 0 && <FieldComparison values={record.comparedValues} labelA="Source" labelB="Return" />}
          {record.documentRef && <DocumentPreviewButton docRef={record.documentRef} />}
        </div>
      ) : <div className="flex h-full items-center justify-center"><p className="text-sm" style={{ color: 'oklch(0.6 0.01 240)' }}>Select an item</p></div>}
    />
  )
}
