'use client'

/**
 * Duplicate wizard: Compare + Table variant.
 * Top section = side-by-side PDF comparison driven by selected record.
 * Bottom section = full review table with form category tabs, matched/unmatched
 * collapsible sections, and group-level AI analysis.
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
  Eye, EyeOff, ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, FolderOpen,
  Link2, Unlink2, Copy, MoveHorizontal,
  ZoomIn, ZoomOut, RotateCw,
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
    return `${d.organizerItemId} / ${d.sourceReferenceId}`
  }
  const d = r as DuplicateDocRecord
  return `Doc ${d.docIdA} / Doc ${d.docIdB}`
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
      formType, records,
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

export function DuplicateCompareTable({ data }: { data: DuplicateRecord[] }) {
  const { decisions, accept, undo, acceptAllHighConfidence } = useDecisions()
  const groups = useMemo(() => groupByFormCategory(data), [data])

  const [selectedKey, setSelectedKey] = useState<string | null>(data[0] ? getItemKey(data[0]) : null)
  const [selectedCategory, setSelectedCategory] = useState<string>(groups[0]?.formType ?? '')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(['matched', 'unmatched']))

  const selectedRecord = data.find(r => getItemKey(r) === selectedKey)
  const activeGroup = groups.find(g => g.formType === selectedCategory) ?? groups[0]
  const highCount = data.filter(r => getConfidenceLevel(r.confidenceLevel) === 'high').length

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const handleAcceptAll = () => {
    acceptAllHighConfidence(
      data
        .filter(r => r.confidenceLevel >= 0.9)
        .map(r => ({ key: getItemKey(r), wizardType: 'duplicate' as const, confidence: r.confidenceLevel }))
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* ══ TOP: Document Comparison Panel ══ */}
      <section style={{
        border: '0.0625rem solid oklch(0.88 0.01 260)',
        borderRadius: 'var(--radius)', overflow: 'hidden',
        backgroundColor: 'oklch(1 0 0)',
      }}>
        {selectedRecord ? (
          <>
            {/* Doc headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                backgroundColor: 'oklch(0.97 0.01 240 / 0.3)',
              }}>
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                  padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
                  backgroundColor: 'oklch(0.94 0.04 240)', color: 'oklch(0.35 0.14 240)',
                }}>Doc A</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)' }}>
                  {selectedRecord.documentRefA?.formLabel ?? 'Unknown'}
                </span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.375rem',
                backgroundColor: 'oklch(0.97 0.003 260)',
                borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
              }}>
                <MoveHorizontal style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                backgroundColor: 'oklch(0.97 0.01 145 / 0.15)',
              }}>
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                  padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
                  backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)',
                }}>Doc B</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)' }}>
                  {selectedRecord.documentRefB?.formLabel ?? 'Unknown'}
                </span>
              </div>
            </div>

            {/* Side-by-side PDFs */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
              minBlockSize: '22rem',
            }}>
              <div style={{ padding: '0.75rem', overflow: 'auto' }}>
                {selectedRecord.documentRefA ? (
                  <PdfPageViewer documentRef={selectedRecord.documentRefA} stamp="DOC A" height="20rem" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.5 0.01 260)', fontSize: '0.8125rem' }}>
                    No document available
                  </div>
                )}
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.5rem',
                backgroundColor: 'oklch(0.97 0.003 260)',
                borderInline: '0.0625rem solid oklch(0.91 0.005 260)',
              }}>
                <button type="button" title="Zoom in" style={toolBtnStyle}><ZoomIn style={toolIconStyle} /></button>
                <button type="button" title="Zoom out" style={toolBtnStyle}><ZoomOut style={toolIconStyle} /></button>
                <button type="button" title="Rotate" style={toolBtnStyle}><RotateCw style={toolIconStyle} /></button>
              </div>
              <div style={{ padding: '0.75rem', overflow: 'auto' }}>
                {selectedRecord.documentRefB ? (
                  <PdfPageViewer documentRef={selectedRecord.documentRefB} stamp="DOC B" height="20rem" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.5 0.01 260)', fontSize: '0.8125rem' }}>
                    No document available
                  </div>
                )}
              </div>
            </div>

            {/* Field comparison strip */}
            {selectedRecord.comparedValues && selectedRecord.comparedValues.length > 0 && (
              <details style={{ borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                <summary style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.4375rem 0.75rem',
                  fontSize: '0.6875rem', fontWeight: 700,
                  color: 'oklch(0.35 0.01 260)', backgroundColor: 'oklch(0.98 0.003 260)',
                  cursor: 'pointer', listStyle: 'none',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                  Field Comparison
                  <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)' }}>
                    {selectedRecord.comparedValues.filter(v => !v.match).length} of {selectedRecord.comparedValues.length} differ
                  </span>
                </summary>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'oklch(0.99 0.002 260)' }}>
                  <FieldComparison
                    values={selectedRecord.comparedValues}
                    labelA={selectedRecord.documentRefA?.formLabel ?? 'Doc A'}
                    labelB={selectedRecord.documentRefB?.formLabel ?? 'Doc B'}
                  />
                </div>
              </details>
            )}
          </>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '3rem', color: 'oklch(0.5 0.01 260)', fontSize: '0.875rem',
          }}>
            Select a pair from the table below to compare documents
          </div>
        )}
      </section>

      {/* ══ BOTTOM: Review Table ══ */}

      {/* Form category tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.125rem',
        borderBlockEnd: '0.125rem solid oklch(0.91 0.005 260)',
        overflowX: 'auto',
      }}>
        {groups.map(g => {
          const isActive = g.formType === selectedCategory
          const allAccepted = g.records.every(r => decisions[getItemKey(r)] === 'accepted')
          return (
            <button
              key={g.formType} type="button"
              onClick={() => setSelectedCategory(g.formType)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 0.875rem',
                border: 'none', cursor: 'pointer', backgroundColor: 'transparent',
                borderBlockEnd: isActive ? '0.1875rem solid oklch(0.3 0.01 260)' : '0.1875rem solid transparent',
                marginBlockEnd: '-0.125rem',
                fontSize: '0.75rem', fontWeight: isActive ? 700 : 600,
                color: isActive ? 'oklch(0.2 0.01 260)' : 'oklch(0.45 0.01 260)',
                whiteSpace: 'nowrap',
              }}
            >
              FORM {g.formType}
              {g.needsReview && <AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.6 0.18 60)' }} />}
              {allAccepted && <CircleCheck style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.45 0.15 145)' }} />}
            </button>
          )
        })}
        <div style={{ marginInlineStart: 'auto' }}>
          <Button variant="default" size="sm" onClick={handleAcceptAll} style={{ fontSize: '0.6875rem' }}>
            <Check style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
            Accept High ({highCount})
          </Button>
        </div>
      </div>

      {activeGroup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

          {/* ── MATCHED section ── */}
          <section style={{
            border: '0.0625rem solid oklch(0.88 0.01 260)',
            borderRadius: 'var(--radius)', overflow: 'hidden',
            backgroundColor: 'oklch(1 0 0)',
          }}>
            <button
              type="button"
              onClick={() => toggleSection('matched')}
              aria-expanded={expandedSections.has('matched')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                inlineSize: '100%', padding: '0.625rem 1rem',
                backgroundColor: 'oklch(0.2 0.01 260)', color: 'oklch(1 0 0)',
                border: 'none', cursor: 'pointer', textAlign: 'start',
              }}
            >
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matched</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                inlineSize: '1.25rem', blockSize: '1.25rem', borderRadius: '50%',
                backgroundColor: 'oklch(0.45 0.15 145)', fontSize: '0.625rem', fontWeight: 700,
              }}>{activeGroup.matchedRecords.length}</span>
              <span style={{ marginInlineStart: 'auto' }}>
                {expandedSections.has('matched')
                  ? <ChevronDown style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                  : <ChevronRight style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                }
              </span>
            </button>

            {expandedSections.has('matched') && activeGroup.matchedRecords.length > 0 && (
              <div>
                {/* AI Analysis */}
                {(() => {
                  const firstRec = activeGroup.matchedRecords[0]
                  return (
                    <details open style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                      <summary style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem', fontSize: '0.6875rem', fontWeight: 700,
                        color: 'var(--ai-accent)', backgroundColor: 'oklch(0.97 0.005 240)',
                        cursor: 'pointer', listStyle: 'none',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        <Sparkles style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                        AI Analysis
                        <span style={{ marginInlineStart: 'auto', fontSize: '0.625rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'oklch(0.45 0.01 260)' }}>
                          {firstRec.appliedRuleSet} / {firstRec.decisionRule}
                        </span>
                      </summary>
                      <div style={{ padding: '0.625rem 1rem', backgroundColor: 'oklch(0.98 0.003 240)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <p style={{ fontSize: '0.75rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>{firstRec.decisionReason}</p>
                        {firstRec.escalationReason && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.96 0.04 60)', border: '0.0625rem solid oklch(0.88 0.08 60)' }}>
                            <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                            <div>
                              <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.5 0.16 60)' }}>Escalation</p>
                              <p style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.1 60)', lineHeight: '1.4' }}>{firstRec.escalationReason}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  )
                })()}

                {/* Compact record rows */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 6rem 5rem 5rem 8rem',
                  alignItems: 'center', gap: '0.375rem',
                  padding: '0.3125rem 1rem',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                  borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                  fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  <span>Pair</span>
                  <span>Match Type</span>
                  <span>Conf.</span>
                  <span>Status</span>
                  <span style={{ textAlign: 'end' }}>Actions</span>
                </div>

                {activeGroup.matchedRecords.map((r, idx) => {
                  const itemKey = getItemKey(r)
                  const isAccepted = decisions[itemKey] === 'accepted'
                  const isSelected = itemKey === selectedKey

                  return (
                    <div
                      key={itemKey}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 6rem 5rem 5rem 8rem',
                        alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 1rem',
                        borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.93 0.003 260)' : 'none',
                        backgroundColor: isSelected ? 'oklch(0.95 0.02 240 / 0.3)' : isAccepted ? 'oklch(0.985 0.01 145 / 0.25)' : 'oklch(1 0 0)',
                        cursor: 'pointer',
                        borderInlineStart: isSelected ? '0.1875rem solid oklch(0.5 0.15 240)' : '0.1875rem solid transparent',
                      }}
                      onClick={() => setSelectedKey(itemKey)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedKey(itemKey) }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.2 0.01 260)' }}>
                        {getRecordLabel(r)}
                      </span>
                      <span style={{
                        fontSize: '0.5625rem', fontWeight: 700,
                        padding: '0.0625rem 0.3125rem', borderRadius: '1rem',
                        backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)',
                        textTransform: 'uppercase', justifySelf: 'start',
                      }}>
                        {r.itemType === 'DUPLICATE_DATA' ? (r as DuplicateDataRecord).matchType : 'Doc Match'}
                      </span>
                      <ConfidenceBadge score={r.confidenceLevel} />
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: isAccepted ? 'oklch(0.45 0.15 145)' : 'oklch(0.5 0.01 260)' }}>
                        {isAccepted ? 'Accepted' : 'Pending'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        {isAccepted ? (
                          <Button variant="outline" size="sm" onClick={() => undo(itemKey, 'duplicate', r.confidenceLevel)} style={{ fontSize: '0.625rem' }}>
                            <Undo2 style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} /> Undo
                          </Button>
                        ) : (
                          <Button variant="default" size="sm" onClick={() => accept(itemKey, 'duplicate', r.confidenceLevel, 'manual')} style={{ fontSize: '0.625rem' }}>
                            <Check style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} /> Accept
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Match / Unmatch bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.25rem' }}>
            <Button variant="outline" size="sm" style={{ gap: '0.25rem', fontSize: '0.75rem' }}>
              <Unlink2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Unmatch
            </Button>
            <Button variant="outline" size="sm" style={{ gap: '0.25rem', fontSize: '0.75rem' }}>
              <Link2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Match
            </Button>
          </div>

          {/* ── UNMATCHED section ── */}
          <section style={{
            border: '0.0625rem solid oklch(0.88 0.01 260)',
            borderRadius: 'var(--radius)', overflow: 'hidden',
            backgroundColor: 'oklch(1 0 0)',
          }}>
            <button
              type="button"
              onClick={() => toggleSection('unmatched')}
              aria-expanded={expandedSections.has('unmatched')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                inlineSize: '100%', padding: '0.625rem 1rem',
                backgroundColor: 'oklch(0.25 0.02 240)', color: 'oklch(1 0 0)',
                border: 'none', cursor: 'pointer', textAlign: 'start',
              }}
            >
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unmatched</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                inlineSize: '1.25rem', blockSize: '1.25rem', borderRadius: '50%',
                backgroundColor: 'oklch(0.55 0.18 25)', fontSize: '0.625rem', fontWeight: 700,
              }}>{activeGroup.unmatchedRecords.length}</span>
              <span style={{ marginInlineStart: 'auto' }}>
                {expandedSections.has('unmatched')
                  ? <ChevronDown style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                  : <ChevronRight style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                }
              </span>
            </button>

            {expandedSections.has('unmatched') && activeGroup.unmatchedRecords.length > 0 && (
              <div>
                {/* AI Analysis for unmatched */}
                {(() => {
                  const firstRec = activeGroup.unmatchedRecords[0]
                  return (
                    <details open style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                      <summary style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem', fontSize: '0.6875rem', fontWeight: 700,
                        color: 'var(--ai-accent)', backgroundColor: 'oklch(0.97 0.005 240)',
                        cursor: 'pointer', listStyle: 'none',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        <Sparkles style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                        AI Analysis
                        {firstRec.reviewRequired && <AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.6 0.18 60)', marginInlineStart: '0.25rem' }} />}
                        <span style={{ marginInlineStart: 'auto', fontSize: '0.625rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'oklch(0.45 0.01 260)' }}>
                          {firstRec.appliedRuleSet} / {firstRec.decisionRule}
                        </span>
                      </summary>
                      <div style={{ padding: '0.625rem 1rem', backgroundColor: 'oklch(0.98 0.003 240)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <p style={{ fontSize: '0.75rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>{firstRec.decisionReason}</p>
                        {firstRec.escalationReason && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.96 0.04 60)', border: '0.0625rem solid oklch(0.88 0.08 60)' }}>
                            <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0 }} />
                            <div>
                              <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.5 0.16 60)' }}>Escalation</p>
                              <p style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.1 60)', lineHeight: '1.4' }}>{firstRec.escalationReason}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  )
                })()}

                {/* Record rows */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 6rem 5rem 5rem 8rem',
                  alignItems: 'center', gap: '0.375rem',
                  padding: '0.3125rem 1rem',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                  borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                  fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  <span>Pair</span>
                  <span>Type</span>
                  <span>Conf.</span>
                  <span>Status</span>
                  <span style={{ textAlign: 'end' }}>Actions</span>
                </div>

                {activeGroup.unmatchedRecords.map((r, idx) => {
                  const itemKey = getItemKey(r)
                  const isAccepted = decisions[itemKey] === 'accepted'
                  const isSelected = itemKey === selectedKey

                  return (
                    <div
                      key={itemKey}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 6rem 5rem 5rem 8rem',
                        alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 1rem',
                        borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.93 0.003 260)' : 'none',
                        backgroundColor: isSelected ? 'oklch(0.95 0.02 240 / 0.3)' : 'oklch(1 0 0)',
                        cursor: 'pointer',
                        borderInlineStart: isSelected ? '0.1875rem solid oklch(0.5 0.15 240)' : '0.1875rem solid transparent',
                      }}
                      onClick={() => setSelectedKey(itemKey)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedKey(itemKey) }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.2 0.01 260)' }}>
                        {getRecordLabel(r)}
                      </span>
                      <span style={{
                        fontSize: '0.5625rem', fontWeight: 700,
                        padding: '0.0625rem 0.3125rem', borderRadius: '1rem',
                        backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)',
                        textTransform: 'uppercase', justifySelf: 'start',
                      }}>
                        {r.itemType === 'DUPLICATE_DATA' ? (r as DuplicateDataRecord).matchType : 'Doc'}
                      </span>
                      <ConfidenceBadge score={r.confidenceLevel} />
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: isAccepted ? 'oklch(0.45 0.15 145)' : 'oklch(0.5 0.01 260)' }}>
                        {isAccepted ? 'Accepted' : 'Pending'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        {isAccepted ? (
                          <Button variant="outline" size="sm" onClick={() => undo(itemKey, 'duplicate', r.confidenceLevel)} style={{ fontSize: '0.625rem' }}>
                            <Undo2 style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} /> Undo
                          </Button>
                        ) : (
                          <Button variant="default" size="sm" onClick={() => accept(itemKey, 'duplicate', r.confidenceLevel, 'manual')} style={{ fontSize: '0.625rem' }}>
                            <Check style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} /> Accept
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {expandedSections.has('unmatched') && activeGroup.unmatchedRecords.length === 0 && (
              <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }}>
                All items in this category are matched.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

/* ── style constants ── */

const toolBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  inlineSize: '1.75rem', blockSize: '1.75rem', borderRadius: '0.25rem',
  border: '0.0625rem solid oklch(0.88 0.01 260)',
  backgroundColor: 'oklch(1 0 0)', color: 'oklch(0.45 0.01 260)', cursor: 'pointer',
}

const toolIconStyle: React.CSSProperties = {
  inlineSize: '0.8125rem', blockSize: '0.8125rem',
}
