'use client'

/**
 * Duplicate wizard: Split Panel / Master-Detail variant.
 * Left panel = record list grouped by form category with matched/unmatched sections.
 * Right panel = detail pane with AI analysis, field comparison, dual PDF viewer.
 */

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { FieldComparison } from '@/components/field-comparison'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel, type DuplicateRecord, type DuplicateDataRecord, type DuplicateDocRecord } from '@/lib/types'
import {
  Sparkles, Check, Undo2, FileText, AlertTriangle,
  ChevronDown, ChevronRight, Copy,
  CircleAlert, CircleCheck, Link2, Unlink2,
} from 'lucide-react'

/* ── helpers ── */

function getItemKey(r: DuplicateRecord): string {
  if (r.itemType === 'DUPLICATE_DATA') return `dup-${(r as DuplicateDataRecord).organizerItemId}`
  const doc = r as DuplicateDocRecord
  return `dup-${doc.docIdA}-${doc.docIdB}`
}

function getRecordLabel(r: DuplicateRecord): string {
  if (r.itemType === 'DUPLICATE_DATA') {
    const d = r as DuplicateDataRecord
    return d.organizerItemId
  }
  const d = r as DuplicateDocRecord
  return `Doc ${d.docIdA} / ${d.docIdB}`
}

function getRecordSubLabel(r: DuplicateRecord): string {
  if (r.itemType === 'DUPLICATE_DATA') return (r as DuplicateDataRecord).matchType
  return r.itemType === 'DUPLICATE_SOURCE_DOC' ? 'Source Doc' : 'Consolidated'
}

function isMatched(r: DuplicateRecord): boolean {
  if (r.itemType === 'DUPLICATE_DATA') return (r as DuplicateDataRecord).decision === 'DuplicateData'
  return (r as DuplicateDocRecord).decision === 'Duplicate'
}

interface FormCategoryGroup {
  formType: string
  records: DuplicateRecord[]
  matchedRecords: DuplicateRecord[]
  unmatchedRecords: DuplicateRecord[]
  needsReview: boolean
  averageConfidence: number
}

function groupByFormCategory(data: DuplicateRecord[]): FormCategoryGroup[] {
  const map = new Map<string, DuplicateRecord[]>()
  for (const r of data) {
    const key = r.documentRefA?.formType ?? 'Unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  const groups: FormCategoryGroup[] = []
  for (const [formType, records] of map.entries()) {
    groups.push({
      formType,
      records,
      matchedRecords: records.filter(r => isMatched(r)),
      unmatchedRecords: records.filter(r => !isMatched(r)),
      needsReview: records.some(r => r.reviewRequired),
      averageConfidence: records.reduce((sum, r) => sum + r.confidenceLevel, 0) / records.length,
    })
  }
  groups.sort((a, b) => {
    if (a.needsReview !== b.needsReview) return a.needsReview ? -1 : 1
    return a.averageConfidence - b.averageConfidence
  })
  return groups
}

/* ── main component ── */

export function DuplicateSplitPanel({ data }: { data: DuplicateRecord[] }) {
  const { decisions, accept, undo } = useDecisions()
  const groups = useMemo(() => groupByFormCategory(data), [data])

  const [selectedKey, setSelectedKey] = useState<string | null>(data[0] ? getItemKey(data[0]) : null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(groups.map(g => g.formType)))
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(['matched', 'unmatched']))

  const selectedRecord = data.find(r => getItemKey(r) === selectedKey)

  const toggleGroup = (formType: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(formType)) next.delete(formType)
      else next.add(formType)
      return next
    })
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  return (
    <section style={{
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      borderRadius: 'var(--radius)',
      border: '0.0625rem solid oklch(0.88 0.01 240)',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.625rem 1rem',
        backgroundColor: 'oklch(0.22 0.03 240)', color: 'oklch(0.92 0 0)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Copy style={{ inlineSize: '1rem', blockSize: '1rem' }} />
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700 }}>Duplicate Review</h2>
        </div>
        <span style={{
          padding: '0.125rem 0.5rem', borderRadius: '1rem',
          fontSize: '0.75rem', fontWeight: 600,
          backgroundColor: 'oklch(0.35 0.03 240)',
        }}>{data.length}</span>
      </div>

      {/* Split layout */}
      <div style={{
        display: 'grid', gridTemplateColumns: '22rem 1fr',
        backgroundColor: 'oklch(0.98 0.002 240)',
      }}>
        {/* ── Left: Record list ── */}
        <div style={{
          borderInlineEnd: '0.0625rem solid oklch(0.91 0.005 240)',
          maxBlockSize: '44rem', overflowY: 'auto',
        }}>
          {groups.map(group => (
            <div key={group.formType}>
              {/* Form category header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.formType)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  inlineSize: '100%', padding: '0.5rem 0.75rem',
                  backgroundColor: 'oklch(0.96 0.005 240)',
                  borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 240)',
                  border: 'none', cursor: 'pointer', textAlign: 'start',
                }}
                aria-expanded={expandedGroups.has(group.formType)}
              >
                {expandedGroups.has(group.formType)
                  ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.45 0 0)' }} />
                  : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.45 0 0)' }} />
                }
                <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0.15 240)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.25 0.01 240)' }}>
                  {group.formType}
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  inlineSize: '1.125rem', blockSize: '1.125rem', borderRadius: '50%',
                  backgroundColor: 'oklch(0.5 0.15 240)', color: 'oklch(1 0 0)',
                  fontSize: '0.5625rem', fontWeight: 700,
                }}>{group.records.length}</span>
                {group.needsReview && (
                  <AlertTriangle style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem', color: 'oklch(0.6 0.18 60)' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginInlineStart: 'auto' }}>
                  <span style={{ ...smallPillStyle, backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
                    {group.matchedRecords.length}M
                  </span>
                  <span style={{ ...smallPillStyle, backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)' }}>
                    {group.unmatchedRecords.length}U
                  </span>
                </div>
              </button>

              {/* Records within group */}
              {expandedGroups.has(group.formType) && (
                <>
                  {/* Matched sub-header */}
                  {group.matchedRecords.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleSection(`matched-${group.formType}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.375rem',
                          inlineSize: '100%', padding: '0.3125rem 0.75rem',
                          backgroundColor: 'oklch(0.94 0.04 145 / 0.2)',
                          borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                          border: 'none', cursor: 'pointer', textAlign: 'start',
                          fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.35 0.14 145)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}
                      >
                        <Link2 style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                        Matched ({group.matchedRecords.length})
                      </button>
                      {expandedSections.has(`matched-${group.formType}`) !== false && group.matchedRecords.map(r => {
                        const key = getItemKey(r)
                        const isSelected = key === selectedKey
                        const isAccepted = decisions[key] === 'accepted'
                        const confColor = r.confidenceLevel >= 0.9 ? 'oklch(0.55 0.17 160)' : r.confidenceLevel >= 0.7 ? 'oklch(0.72 0.14 80)' : 'oklch(0.6 0.18 15)'

                        return (
                          <button
                            key={key} type="button"
                            onClick={() => setSelectedKey(key)}
                            aria-selected={isSelected}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              inlineSize: '100%', padding: '0.5rem 0.75rem 0.5rem 1.5rem',
                              borderBlockEnd: '0.0625rem solid oklch(0.93 0.005 240)',
                              borderInlineStart: isSelected ? '0.1875rem solid oklch(0.5 0.15 240)' : '0.1875rem solid transparent',
                              backgroundColor: isSelected ? 'oklch(0.96 0.01 240)' : isAccepted ? 'oklch(0.985 0.01 145 / 0.25)' : 'transparent',
                              border: 'none', cursor: 'pointer', textAlign: 'start',
                            }}
                          >
                            <span style={{ inlineSize: '0.4375rem', blockSize: '0.4375rem', borderRadius: '50%', backgroundColor: confColor, flexShrink: 0 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.0625rem', minInlineSize: 0, flex: 1 }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.2 0.01 240)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {getRecordLabel(r)}
                              </span>
                              <span style={{ fontSize: '0.6875rem', color: 'oklch(0.5 0.01 240)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {getRecordSubLabel(r)}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: confColor, flexShrink: 0 }}>
                              {Math.round(r.confidenceLevel * 100)}%
                            </span>
                            {isAccepted && <CircleCheck style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.45 0.15 145)', flexShrink: 0 }} />}
                          </button>
                        )
                      })}
                    </>
                  )}

                  {/* Unmatched sub-header */}
                  {group.unmatchedRecords.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleSection(`unmatched-${group.formType}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.375rem',
                          inlineSize: '100%', padding: '0.3125rem 0.75rem',
                          backgroundColor: 'oklch(0.94 0.04 25 / 0.2)',
                          borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                          border: 'none', cursor: 'pointer', textAlign: 'start',
                          fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.40 0.18 25)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}
                      >
                        <Unlink2 style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                        Unmatched ({group.unmatchedRecords.length})
                      </button>
                      {group.unmatchedRecords.map(r => {
                        const key = getItemKey(r)
                        const isSelected = key === selectedKey
                        const isAccepted = decisions[key] === 'accepted'
                        const confColor = r.confidenceLevel >= 0.9 ? 'oklch(0.55 0.17 160)' : r.confidenceLevel >= 0.7 ? 'oklch(0.72 0.14 80)' : 'oklch(0.6 0.18 15)'

                        return (
                          <button
                            key={key} type="button"
                            onClick={() => setSelectedKey(key)}
                            aria-selected={isSelected}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              inlineSize: '100%', padding: '0.5rem 0.75rem 0.5rem 1.5rem',
                              borderBlockEnd: '0.0625rem solid oklch(0.93 0.005 240)',
                              borderInlineStart: isSelected ? '0.1875rem solid oklch(0.5 0.15 240)' : '0.1875rem solid transparent',
                              backgroundColor: isSelected ? 'oklch(0.96 0.01 240)' : 'transparent',
                              border: 'none', cursor: 'pointer', textAlign: 'start',
                            }}
                          >
                            <span style={{ inlineSize: '0.4375rem', blockSize: '0.4375rem', borderRadius: '50%', backgroundColor: confColor, flexShrink: 0 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.0625rem', minInlineSize: 0, flex: 1 }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.2 0.01 240)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {getRecordLabel(r)}
                              </span>
                              <span style={{ fontSize: '0.6875rem', color: 'oklch(0.5 0.01 240)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {getRecordSubLabel(r)}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: confColor, flexShrink: 0 }}>
                              {Math.round(r.confidenceLevel * 100)}%
                            </span>
                            {r.reviewRequired && <CircleAlert style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.55 0.18 60)', flexShrink: 0 }} />}
                          </button>
                        )
                      })}
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* ── Right: Detail pane ── */}
        <div style={{
          padding: '1.25rem', minBlockSize: '14rem', maxBlockSize: '44rem', overflowY: 'auto',
          backgroundColor: 'oklch(1 0 0)',
        }}>
          {selectedRecord ? (() => {
            const itemKey = getItemKey(selectedRecord)
            const isAccepted = decisions[itemKey] === 'accepted'
            const matched = isMatched(selectedRecord)
            const groupCompared = selectedRecord.comparedValues ?? []

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Title + actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'oklch(0.15 0.01 240)' }}>
                      {getRecordLabel(selectedRecord)}
                    </h3>
                    <Sparkles style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.5 0.15 240)' }} />
                    <span style={{
                      fontSize: '0.625rem', fontWeight: 700,
                      padding: '0.125rem 0.375rem', borderRadius: '1rem',
                      backgroundColor: matched ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                      color: matched ? 'oklch(0.35 0.14 145)' : 'oklch(0.40 0.18 25)',
                      textTransform: 'uppercase',
                    }}>
                      {matched ? 'Matched' : 'Unmatched'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isAccepted ? (
                      <>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.55 0.17 160)' }}>
                          <CircleCheck style={{ inlineSize: '1rem', blockSize: '1rem' }} /> Accepted
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => undo(itemKey, 'duplicate', selectedRecord.confidenceLevel)}
                          style={{ fontSize: '0.75rem', color: 'oklch(0.5 0.01 240)' }}>
                          <Undo2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} /> Undo
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => accept(itemKey, 'duplicate', selectedRecord.confidenceLevel, 'manual')}
                        style={{ gap: '0.375rem', backgroundColor: 'oklch(0.5 0.15 240)', color: 'oklch(1 0 0)' }}>
                        <Check style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} /> Accept Decision
                      </Button>
                    )}
                  </div>
                </div>

                {/* Meta row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 240)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type</span>
                    <span style={{ fontSize: '0.8125rem', color: 'oklch(0.2 0.01 240)' }}>
                      {selectedRecord.itemType === 'DUPLICATE_DATA' ? 'Data Match' : 'Document Match'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 240)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confidence</span>
                    <ConfidenceBadge score={selectedRecord.confidenceLevel} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 240)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rule Set</span>
                    <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'oklch(0.2 0.01 240)' }}>
                      {selectedRecord.appliedRuleSet}
                    </span>
                  </div>
                </div>

                {/* AI Reasoning */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '0.375rem',
                  padding: '0.75rem', borderRadius: '0.375rem',
                  backgroundColor: 'oklch(0.97 0.005 240)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Sparkles style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0.15 240)' }} />
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.5 0.15 240)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      AI Reasoning
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 240)' }}>
                    {selectedRecord.decisionReason}
                  </p>
                </div>

                {/* Escalation */}
                {selectedRecord.escalationReason && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                    padding: '0.625rem 0.75rem', borderRadius: '0.375rem',
                    backgroundColor: 'oklch(0.6 0.18 15 / 0.06)',
                  }}>
                    <AlertTriangle style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.6 0.18 15)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                    <div>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.5 0.16 15)' }}>Escalation Required</p>
                      <p style={{ fontSize: '0.8125rem', lineHeight: '1.5', color: 'oklch(0.35 0.1 15)' }}>{selectedRecord.escalationReason}</p>
                    </div>
                  </div>
                )}

                {/* Key differences callout */}
                {groupCompared.some(v => !v.match) && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '0.3125rem',
                    padding: '0.5rem 0.75rem', borderRadius: '0.25rem',
                    backgroundColor: 'oklch(0.97 0.015 25 / 0.5)',
                    border: '0.0625rem solid oklch(0.92 0.03 25)',
                  }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.45 0.12 25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Key Differences
                    </span>
                    {groupCompared.filter(v => !v.match).map(v => (
                      <div key={v.field} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.35 0.01 260)' }}>{v.field}:</span>
                        <span style={{ fontSize: '0.625rem', padding: '0.0625rem 0.3125rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.14 25)' }}>
                          {v.valueA}
                        </span>
                        <span style={{ fontSize: '0.625rem', color: 'oklch(0.55 0.01 260)' }}>&rarr;</span>
                        <span style={{ fontSize: '0.625rem', padding: '0.0625rem 0.3125rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.12 145)' }}>
                          {v.valueB}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Field comparison table */}
                {groupCompared.length > 0 && (
                  <div>
                    <p style={{
                      fontSize: '0.6875rem', fontWeight: 700, marginBlockEnd: '0.5rem',
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      color: 'oklch(0.25 0 0)',
                    }}>
                      <Sparkles style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.15 240)' }} />
                      Field Comparison
                    </p>
                    <FieldComparison
                      values={groupCompared}
                      labelA={selectedRecord.documentRefA?.formLabel ?? 'Doc A'}
                      labelB={selectedRecord.documentRefB?.formLabel ?? 'Doc B'}
                    />
                  </div>
                )}

                {/* Dual PDF preview */}
                {(selectedRecord.documentRefA || selectedRecord.documentRefB) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {selectedRecord.documentRefA && (
                      <div>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', marginBlockEnd: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {selectedRecord.documentRefA.formLabel}
                        </p>
                        <PdfPageViewer documentRef={selectedRecord.documentRefA} stamp="DOC A" height="20rem" />
                      </div>
                    )}
                    {selectedRecord.documentRefB && (
                      <div>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', marginBlockEnd: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {selectedRecord.documentRefB.formLabel}
                        </p>
                        <PdfPageViewer documentRef={selectedRecord.documentRefB} stamp="DOC B" height="20rem" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })() : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              blockSize: '100%',
            }}>
              <p style={{ fontSize: '0.875rem', color: 'oklch(0.6 0.01 240)' }}>
                Select an item from the list to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ── style constants ── */

const smallPillStyle: React.CSSProperties = {
  fontSize: '0.5625rem', fontWeight: 700, padding: '0.0625rem 0.3125rem',
  borderRadius: '1rem', textTransform: 'uppercase', letterSpacing: '0.03em',
}
