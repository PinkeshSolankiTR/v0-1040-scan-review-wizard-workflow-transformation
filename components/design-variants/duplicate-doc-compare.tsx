'use client'

/**
 * Duplicate wizard: Document Compare variant.
 * Left sidebar = form category tree with matched/unmatched records + inline AI analysis.
 * Right area = side-by-side PDF viewers (Doc A vs Doc B) with field comparison strip.
 */

import { useState, useMemo } from 'react'
import { FieldComparison } from '@/components/field-comparison'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { useDecisions } from '@/contexts/decision-context'
import { type DuplicateRecord, type DuplicateDataRecord, type DuplicateDocRecord } from '@/lib/types'
import {
  Sparkles, Check, Undo2, FileText, AlertTriangle,
  ChevronDown, ChevronRight, Copy, ArrowRight,
  Link2, Unlink2, MoveHorizontal,
  ZoomIn, ZoomOut, RotateCw,
} from 'lucide-react'

/* ── helpers ── */

function getItemKey(r: DuplicateRecord): string {
  if (r.itemType === 'DUPLICATE_DATA') return `dup-${(r as DuplicateDataRecord).organizerItemId}`
  const doc = r as DuplicateDocRecord
  return `dup-${doc.docIdA}-${doc.docIdB}`
}

function getRecordLabel(r: DuplicateRecord): string {
  if (r.itemType === 'DUPLICATE_DATA') return (r as DuplicateDataRecord).organizerItemId
  const d = r as DuplicateDocRecord
  return `Doc ${d.docIdA} / ${d.docIdB}`
}

function isRecordMatched(
  r: DuplicateRecord,
  key: string,
  decisions: Record<string, string>,
  showAutoMatched: boolean
): boolean {
  if (decisions[key] === 'accepted') return true
  if (decisions[key] === 'rejected') return false
  if (showAutoMatched && r.confidenceLevel >= 0.9) return true
  return false
}

interface FormCategoryGroup {
  formType: string
  records: DuplicateRecord[]
  matchedRecords: DuplicateRecord[]
  unmatchedRecords: DuplicateRecord[]
  needsReview: boolean
  averageConfidence: number
}

function groupByFormCategory(
  data: DuplicateRecord[],
  decisions: Record<string, string>,
  showAutoMatched: boolean
): FormCategoryGroup[] {
  const map = new Map<string, DuplicateRecord[]>()
  for (const r of data) {
    const key = r.documentRefA?.formType ?? 'Unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  const groups: FormCategoryGroup[] = []
  for (const [formType, records] of map.entries()) {
    const matched = records.filter(r => isRecordMatched(r, getItemKey(r), decisions, showAutoMatched))
    const unmatched = records.filter(r => !isRecordMatched(r, getItemKey(r), decisions, showAutoMatched))
    groups.push({
      formType, records,
      matchedRecords: matched,
      unmatchedRecords: unmatched,
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

export function DuplicateDocCompare({ data }: { data: DuplicateRecord[] }) {
  const { decisions, accept, undo } = useDecisions()
  const [showAutoMatched, setShowAutoMatched] = useState(true)
  const groups = useMemo(() => groupByFormCategory(data, decisions, showAutoMatched), [data, decisions, showAutoMatched])

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(groups.map(g => g.formType)))
  const [selectedKey, setSelectedKey] = useState<string | null>(data[0] ? getItemKey(data[0]) : null)

  const selectedRecord = data.find(r => getItemKey(r) === selectedKey)

  const toggleGroup = (formType: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(formType)) next.delete(formType)
      else next.add(formType)
      return next
    })
  }

  const handleAcceptAll = () => {
    for (const r of data) {
      const key = getItemKey(r)
      if (decisions[key] !== 'accepted') {
        accept(key, 'duplicate', r.confidenceLevel, 'manual')
      }
    }
  }

  const handleUndoAll = () => {
    for (const r of data) {
      undo(getItemKey(r), 'duplicate', r.confidenceLevel)
    }
  }

  const allAccepted = data.every(r => decisions[getItemKey(r)] === 'accepted')

  /* Compare values for the selected record */
  const comparedValues = useMemo(() => {
    if (!selectedRecord) return []
    return selectedRecord.comparedValues ?? []
  }, [selectedRecord])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '0',
      border: '0.0625rem solid oklch(0.88 0.01 260)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
      backgroundColor: 'oklch(1 0 0)',
    }}>
      {/* ── Top header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.625rem 1rem',
        backgroundColor: 'oklch(0.97 0.003 260)',
        borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Copy style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.45 0.01 260)' }} />
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>
            Duplicate Document Review
          </h2>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            inlineSize: '1.375rem', blockSize: '1.375rem', borderRadius: '50%',
            backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)',
            fontSize: '0.6875rem', fontWeight: 700,
          }}>{data.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {allAccepted ? (
            <button type="button" onClick={handleUndoAll} style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.88 0.01 260)',
              borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)',
              fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.45 0.01 260)', cursor: 'pointer',
            }}>
              <Undo2 style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Undo All
            </button>
          ) : (
            <button type="button" onClick={handleAcceptAll} style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.75rem', border: 'none',
              borderRadius: '0.25rem', backgroundColor: 'oklch(0.45 0.18 145)',
              fontSize: '0.75rem', fontWeight: 600, color: 'oklch(1 0 0)', cursor: 'pointer',
            }}>
              <Check style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Accept All
            </button>
          )}
        </div>
      </header>

      {/* ── Main 2-panel layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(14rem, 18rem) 1fr',
        minBlockSize: '38rem',
      }}>
        {/* ── LEFT SIDEBAR ── */}
        <aside
          aria-label="Duplicate document sidebar"
          style={{
            borderInlineEnd: '0.0625rem solid oklch(0.91 0.005 260)',
            backgroundColor: 'oklch(0.98 0.003 260)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          {/* Instructions */}
          <details style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
            <summary style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 0.75rem',
              fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)',
              cursor: 'pointer', listStyle: 'none',
            }}>
              <ChevronRight style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0.01 260)' }} />
              Instructions
            </summary>
            <div style={{
              padding: '0.5rem 0.75rem 0.75rem 2rem',
              fontSize: '0.75rem', lineHeight: '1.5', color: 'oklch(0.4 0.01 260)',
            }}>
              <p>Select a pair to compare documents side-by-side. Expand each form category to see its matched and unmatched pairs with AI analysis.</p>
            </div>
          </details>

          {/* Scrollable form groups */}
          <div style={{ flex: '1 1 auto', overflowY: 'auto' }}>
            {groups.map(group => {
              const isExpanded = expandedGroups.has(group.formType)
              const avgConf = Math.round(group.averageConfidence * 100)
              const confColor = avgConf >= 90 ? 'oklch(0.55 0.17 145)' : avgConf >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'

              return (
                <div key={group.formType} style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.formType)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                      inlineSize: '100%', padding: '0.625rem 0.75rem',
                      border: 'none', cursor: 'pointer', textAlign: 'start',
                      backgroundColor: 'transparent',
                    }}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded
                      ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0, marginBlockStart: '0.125rem' }} />
                      : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0, marginBlockStart: '0.125rem' }} />
                    }
                    <div style={{ flex: '1 1 0', minInlineSize: 0 }}>
                      <span style={{
                        display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {group.formType}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockStart: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                          padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                          backgroundColor: `${confColor} / 0.12`, color: confColor,
                        }}>{avgConf}%</span>
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)' }}>
                          {group.matchedRecords.length}M / {group.unmatchedRecords.length}U
                        </span>
                        {group.needsReview && (
                          <AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.6 0.18 60)' }} />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded: record items + AI analysis */}
                  {isExpanded && (
                    <div style={{ paddingInlineStart: '0.1875rem' }}>
                      {/* Matched items */}
                      {group.matchedRecords.length > 0 && (
                        <div style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.35 0.14 145)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          backgroundColor: 'oklch(0.94 0.04 145 / 0.15)',
                        }}>
                          <Link2 style={{ inlineSize: '0.5rem', blockSize: '0.5rem', display: 'inline', verticalAlign: 'middle', marginInlineEnd: '0.25rem' }} />
                          Matched ({group.matchedRecords.length})
                        </div>
                      )}
                      {group.matchedRecords.map(r => {
                        const key = getItemKey(r)
                        const isSelected = key === selectedKey
                        const isAccepted = decisions[key] === 'accepted'
                        return (
                          <button
                            key={key} type="button"
                            onClick={() => setSelectedKey(key)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
                              inlineSize: '100%', padding: '0.375rem 0.75rem 0.375rem 2rem',
                              border: 'none', cursor: 'pointer', textAlign: 'start',
                              backgroundColor: isSelected ? 'oklch(0.96 0.01 240)' : 'transparent',
                              borderInlineStart: isSelected ? '0.1875rem solid oklch(0.5 0.18 240)' : '0.1875rem solid transparent',
                            }}
                          >
                            <input type="checkbox" checked={isAccepted} readOnly
                              style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }} />
                            <FileText style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'oklch(0.25 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {getRecordLabel(r)}
                            </span>
                          </button>
                        )
                      })}

                      {/* Unmatched items */}
                      {group.unmatchedRecords.length > 0 && (
                        <div style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.40 0.18 25)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          backgroundColor: 'oklch(0.94 0.04 25 / 0.15)',
                        }}>
                          <Unlink2 style={{ inlineSize: '0.5rem', blockSize: '0.5rem', display: 'inline', verticalAlign: 'middle', marginInlineEnd: '0.25rem' }} />
                          Unmatched ({group.unmatchedRecords.length})
                        </div>
                      )}
                      {group.unmatchedRecords.map(r => {
                        const key = getItemKey(r)
                        const isSelected = key === selectedKey
                        const isAccepted = decisions[key] === 'accepted'
                        return (
                          <button
                            key={key} type="button"
                            onClick={() => setSelectedKey(key)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
                              inlineSize: '100%', padding: '0.375rem 0.75rem 0.375rem 2rem',
                              border: 'none', cursor: 'pointer', textAlign: 'start',
                              backgroundColor: isSelected ? 'oklch(0.96 0.01 240)' : 'transparent',
                              borderInlineStart: isSelected ? '0.1875rem solid oklch(0.5 0.18 240)' : '0.1875rem solid transparent',
                            }}
                          >
                            <input type="checkbox" checked={isAccepted} readOnly
                              style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }} />
                            <FileText style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'oklch(0.25 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {getRecordLabel(r)}
                            </span>
                            {r.reviewRequired && (
                              <AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0 }} />
                            )}
                          </button>
                        )
                      })}

                      {/* AI Analysis inline accordion */}
                      {(() => {
                        const firstRec = group.records[0]
                        const groupCompared = group.records.flatMap(r => r.comparedValues ?? [])
                          .filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)
                        return (
                          <details style={{
                            marginInlineStart: '2rem', marginBlock: '0.375rem',
                            borderRadius: '0.25rem', overflow: 'hidden',
                            border: '0.0625rem solid oklch(0.92 0.01 240)',
                          }}>
                            <summary style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
                              padding: '0.375rem 0.5rem',
                              fontSize: '0.6875rem', fontWeight: 700,
                              color: 'var(--ai-accent)',
                              backgroundColor: 'oklch(0.97 0.005 240)',
                              cursor: 'pointer', listStyle: 'none',
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              <Sparkles style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} />
                              AI Analysis
                              {firstRec.reviewRequired && (
                                <AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.6 0.18 60)', marginInlineStart: 'auto' }} />
                              )}
                            </summary>
                            <div style={{
                              padding: '0.5rem', backgroundColor: 'oklch(0.98 0.003 240)',
                              display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '0.625rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                                  padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                                  backgroundColor: 'oklch(0.94 0.005 260)', color: 'oklch(0.4 0.01 260)',
                                }}>{firstRec.appliedRuleSet} / {firstRec.decisionRule}</span>
                                <span style={{
                                  fontSize: '0.8125rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                                  color: Math.round(group.averageConfidence * 100) >= 90 ? 'oklch(0.55 0.17 145)' : Math.round(group.averageConfidence * 100) >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)',
                                }}>{Math.round(group.averageConfidence * 100)}%</span>
                              </div>
                              <p style={{ fontSize: '0.6875rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>
                                {firstRec.decisionReason}
                              </p>
                              {firstRec.escalationReason && (
                                <div style={{
                                  display: 'flex', alignItems: 'flex-start', gap: '0.375rem',
                                  padding: '0.375rem 0.5rem', borderRadius: '0.25rem',
                                  backgroundColor: 'oklch(0.96 0.04 60)', border: '0.0625rem solid oklch(0.88 0.08 60)',
                                }}>
                                  <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                                  <div>
                                    <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.5 0.16 60)' }}>Escalation</p>
                                    <p style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.1 60)', lineHeight: '1.4' }}>{firstRec.escalationReason}</p>
                                  </div>
                                </div>
                              )}
                              {groupCompared.some(v => !v.match) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.45 0.12 25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Key Differences
                                  </span>
                                  {groupCompared.filter(v => !v.match).map(v => (
                                    <div key={v.field} style={{ display: 'flex', flexDirection: 'column', gap: '0.0625rem' }}>
                                      <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.35 0.01 260)' }}>{v.field}</span>
                                      <div style={{ display: 'flex', gap: '0.1875rem', fontSize: '0.5625rem', flexWrap: 'wrap' }}>
                                        <span style={{ padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.14 25)' }}>{v.valueA}</span>
                                        <span style={{ color: 'oklch(0.55 0.01 260)' }}>&rarr;</span>
                                        <span style={{ padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.12 145)' }}>{v.valueB}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </details>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Next Step button */}
          <div style={{ padding: '0.75rem', borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)' }}>
            <button type="button" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
              inlineSize: '100%', padding: '0.625rem',
              border: 'none', borderRadius: '0.25rem',
              backgroundColor: 'oklch(0.50 0.20 25)',
              fontSize: '0.8125rem', fontWeight: 700, color: 'oklch(1 0 0)',
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Next Step <ArrowRight style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
            </button>
          </div>
        </aside>

        {/* ── RIGHT: Dual document comparison ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedRecord ? (
            <>
              {/* Doc headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr' }}>
                {/* Doc A header */}
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

                {/* Center divider */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 0.375rem',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                  borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                }}>
                  <MoveHorizontal style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                </div>

                {/* Doc B header */}
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

              {/* Side-by-side PDF viewers */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                flex: '1 1 auto', overflow: 'hidden',
              }}>
                {/* Left PDF */}
                <div style={{ padding: '0.75rem', overflow: 'auto' }}>
                  {selectedRecord.documentRefA ? (
                    <PdfPageViewer documentRef={selectedRecord.documentRefA} stamp="DOC A" height="100%" />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.5 0.01 260)', fontSize: '0.8125rem' }}>
                      No document available
                    </div>
                  )}
                </div>

                {/* Center toolbar */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '0.5rem', padding: '0.5rem',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                  borderInline: '0.0625rem solid oklch(0.91 0.005 260)',
                }}>
                  <button type="button" title="Zoom in" style={toolBtnStyle}><ZoomIn style={toolIconStyle} /></button>
                  <button type="button" title="Zoom out" style={toolBtnStyle}><ZoomOut style={toolIconStyle} /></button>
                  <button type="button" title="Rotate" style={toolBtnStyle}><RotateCw style={toolIconStyle} /></button>
                  <div style={{ inlineSize: '1.5rem', borderBlockStart: '0.0625rem solid oklch(0.88 0.01 260)', marginBlock: '0.125rem' }} />
                  {/* Accept / Undo for selected */}
                  {decisions[getItemKey(selectedRecord)] === 'accepted' ? (
                    <button type="button" title="Undo" onClick={() => undo(getItemKey(selectedRecord), 'duplicate', selectedRecord.confidenceLevel)}
                      style={{ ...toolBtnStyle, backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.18 25)' }}>
                      <Undo2 style={toolIconStyle} />
                    </button>
                  ) : (
                    <button type="button" title="Accept" onClick={() => accept(getItemKey(selectedRecord), 'duplicate', selectedRecord.confidenceLevel, 'manual')}
                      style={{ ...toolBtnStyle, backgroundColor: 'oklch(0.45 0.18 145)', color: 'oklch(1 0 0)' }}>
                      <Check style={toolIconStyle} />
                    </button>
                  )}
                </div>

                {/* Right PDF */}
                <div style={{ padding: '0.75rem', overflow: 'auto' }}>
                  {selectedRecord.documentRefB ? (
                    <PdfPageViewer documentRef={selectedRecord.documentRefB} stamp="DOC B" height="100%" />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.5 0.01 260)', fontSize: '0.8125rem' }}>
                      No document available
                    </div>
                  )}
                </div>
              </div>

              {/* Field comparison strip at bottom */}
              {comparedValues.length > 0 && (
                <div style={{
                  borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)',
                  padding: '0.625rem 0.75rem',
                  backgroundColor: 'oklch(0.98 0.003 260)',
                }}>
                  <details>
                    <summary style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      fontSize: '0.6875rem', fontWeight: 700,
                      color: 'oklch(0.35 0.01 260)',
                      cursor: 'pointer', listStyle: 'none',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                      Field Comparison
                      <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)' }}>
                        {comparedValues.filter(v => !v.match).length} of {comparedValues.length} differ
                      </span>
                    </summary>
                    <div style={{ marginBlockStart: '0.5rem' }}>
                      <FieldComparison
                        values={comparedValues}
                        labelA={selectedRecord.documentRefA?.formLabel ?? 'Doc A'}
                        labelB={selectedRecord.documentRefB?.formLabel ?? 'Doc B'}
                      />
                    </div>
                  </details>
                </div>
              )}
            </>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              blockSize: '100%', color: 'oklch(0.5 0.01 260)', fontSize: '0.875rem',
            }}>
              Select a pair from the sidebar to compare documents
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── style constants ── */

const toolBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  inlineSize: '1.75rem', blockSize: '1.75rem', borderRadius: '0.25rem',
  border: '0.0625rem solid oklch(0.88 0.01 260)',
  backgroundColor: 'oklch(1 0 0)', color: 'oklch(0.45 0.01 260)',
  cursor: 'pointer',
}

const toolIconStyle: React.CSSProperties = {
  inlineSize: '0.8125rem', blockSize: '0.8125rem',
}
