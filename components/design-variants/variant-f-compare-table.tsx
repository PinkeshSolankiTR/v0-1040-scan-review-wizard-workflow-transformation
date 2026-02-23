'use client'

/**
 * DESIGN VARIANT F: "Compare + Table"
 * Combines the production-style split document viewer (Variant E)
 * with the table-based review UI (baseline). Top section shows
 * side-by-side PDF comparison; bottom section shows the full
 * swimlane table with expandable rows, AI reasoning, and field comparison.
 */

import { useState, useMemo, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { AiIndicator } from '@/components/ai-indicator'
import { FieldComparison } from '@/components/field-comparison'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel, type SupersededRecord } from '@/lib/types'
import {
  Sparkles, Check, Undo2, FileText, AlertTriangle,
  Eye, EyeOff, ArrowRight, ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, FolderOpen,
  ZoomIn, ZoomOut, RotateCw, FlipHorizontal, FlipVertical, Maximize,
  MoveHorizontal, GripVertical, TableProperties,
} from 'lucide-react'

/* ── Types ── */

interface FormGroup {
  formType: string
  formEntity: string
  records: SupersededRecord[]
  originalCount: number
  supersededCount: number
  needsReview: boolean
  lowestConfidence: number
  averageConfidence: number
  originalRecord: SupersededRecord | null
  supersededRecords: SupersededRecord[]
}

/* ── Grouping helper ── */

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
      needsReview: records.some(r => r.reviewRequired),
      lowestConfidence: Math.min(...records.map(r => r.confidenceLevel)),
      averageConfidence: records.reduce((sum, r) => sum + r.confidenceLevel, 0) / records.length,
      originalRecord: records.find(r => r.decisionType === 'Original') ?? null,
      supersededRecords: records.filter(r => r.decisionType === 'Superseded'),
    })
  }
  groups.sort((a, b) => {
    if (a.needsReview !== b.needsReview) return a.needsReview ? -1 : 1
    return a.lowestConfidence - b.lowestConfidence
  })
  return groups
}

/* ── Main Component ── */

export function VariantFCompareTable({ data }: { data: SupersededRecord[] }) {
  const { decisions, accept, undo, acceptAllHighConfidence } = useDecisions()
  const groups = useMemo(() => groupByFormType(data), [data])

  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(groups.map(g => g.formType)))
  const [openDocId, setOpenDocId] = useState<number | null>(null)
  const [splitOpen, setSplitOpen] = useState(true)

  const activeGroup = groups[selectedGroupIdx] ?? groups[0]
  const leftDoc = activeGroup?.supersededRecords[0] ?? null
  const rightDoc = activeGroup?.originalRecord ?? null

  const highCount = data.filter(r => getConfidenceLevel(r.confidenceLevel) === 'high').length
  const totalOriginal = data.filter(r => r.decisionType === 'Original').length
  const totalSuperseded = data.filter(r => r.decisionType === 'Superseded').length
  const totalReview = data.filter(r => r.reviewRequired).length

  const toggleGroup = useCallback((formType: string, gIdx: number) => {
    setSelectedGroupIdx(gIdx)
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(formType)) next.delete(formType)
      else next.add(formType)
      return next
    })
  }, [])

  const selectGroup = useCallback((idx: number) => {
    setSelectedGroupIdx(idx)
    const ft = groups[idx]?.formType
    if (ft) {
      setExpandedGroups(prev => {
        if (prev.has(ft)) return prev
        const next = new Set(prev)
        next.add(ft)
        return next
      })
    }
  }, [groups])

  const handleAcceptAll = useCallback(() => {
    acceptAllHighConfidence(
      data
        .filter(r => r.confidenceLevel >= 0.9)
        .map(r => ({ key: `sup-pg${r.engagementPageId}`, wizardType: 'superseded' as const, confidence: r.confidenceLevel }))
    )
  }, [data, acceptAllHighConfidence])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION A: Split Document Comparison (production-style)
         ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        border: '0.0625rem solid oklch(0.88 0.01 260)',
        borderRadius: 'var(--radius) var(--radius) 0 0',
        overflow: 'hidden',
        backgroundColor: 'oklch(1 0 0)',
      }}>

        {/* Toggle header for split view */}
        <button
          type="button"
          onClick={() => setSplitOpen(prev => !prev)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            inlineSize: '100%', padding: '0.625rem 1rem',
            border: 'none', cursor: 'pointer', textAlign: 'start',
            backgroundColor: 'oklch(0.97 0.003 260)',
            borderBlockEnd: splitOpen ? '0.0625rem solid oklch(0.91 0.005 260)' : 'none',
          }}
          aria-expanded={splitOpen}
        >
          {splitOpen
            ? <ChevronDown style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.45 0.01 260)' }} />
            : <ChevronRight style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.45 0.01 260)' }} />
          }
          <FileText style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.45 0.01 260)' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>
            Document Comparison
          </span>
          {activeGroup && (
            <span style={{
              fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.45 0.01 260)',
              marginInlineStart: '0.25rem',
            }}>
              &mdash; {activeGroup.formType}: {activeGroup.formEntity}
            </span>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            inlineSize: '1.375rem', blockSize: '1.375rem', borderRadius: '50%',
            backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)',
            fontSize: '0.6875rem', fontWeight: 700, marginInlineStart: 'auto',
          }}>
            {data.length}
          </span>
        </button>

        {splitOpen && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(12rem, 15rem) 1fr',
            minBlockSize: '28rem',
          }}>

            {/* ── LEFT SIDEBAR: Document tree ── */}
            <nav
              aria-label="Superseded document tree"
              style={{
                borderInlineEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                backgroundColor: 'oklch(0.98 0.003 260)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Instructions */}
              <details style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                <summary style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)',
                  cursor: 'pointer', listStyle: 'none',
                }}>
                  <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                  Instructions
                </summary>
                <div style={{
                  padding: '0.375rem 0.75rem 0.625rem 1.75rem',
                  fontSize: '0.6875rem', lineHeight: '1.5', color: 'oklch(0.4 0.01 260)',
                }}>
                  <p>Review each form group below. Expand to see pages, AI analysis, and field comparisons inline. The selected group drives the PDF viewers.</p>
                </div>
              </details>

              {/* Document tree with inline accordions */}
              <div style={{ flex: '1 1 auto', overflowY: 'auto' }}>
                {groups.map((group, gIdx) => {
                  const isExpanded = expandedGroups.has(group.formType)
                  const isActive = gIdx === selectedGroupIdx
                  const groupAccepted = group.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
                  const avgConf = Math.round(group.averageConfidence * 100)
                  const confColor = avgConf >= 90
                    ? 'oklch(0.55 0.17 145)'
                    : avgConf >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'
                  const groupSuperseded = group.supersededRecords[0]
                  const groupOriginal = group.originalRecord
                  const groupCompared = group.records.flatMap(r => r.comparedValues ?? [])
                    .filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)

                  return (
                    <div key={group.formType} style={{
                      borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                      backgroundColor: isActive ? 'oklch(0.97 0.01 240 / 0.4)' : 'transparent',
                    }}>
                      {/* Group header */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.formType, gIdx)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.375rem',
                          inlineSize: '100%', padding: '0.5rem 0.75rem',
                          border: 'none', cursor: 'pointer', textAlign: 'start',
                          backgroundColor: 'transparent',
                          borderInlineStart: isActive ? '0.1875rem solid oklch(0.5 0.18 240)' : '0.1875rem solid transparent',
                        }}
                      >
                        <input
                          type="checkbox" checked={groupAccepted} readOnly
                          aria-label={`${group.formType} group accepted`}
                          style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0, marginBlockStart: '0.0625rem' }}
                        />
                        <div style={{ flex: '1 1 0', minInlineSize: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {isExpanded
                              ? <ChevronDown style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem', color: 'oklch(0.5 0 0)', flexShrink: 0 }} />
                              : <ChevronRight style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem', color: 'oklch(0.5 0 0)', flexShrink: 0 }} />
                            }
                            <span style={{
                              fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minInlineSize: 0,
                            }}>
                              {group.formType}: {group.formEntity.toUpperCase().substring(0, 20)}...
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockStart: '0.1875rem', paddingInlineStart: '0.9375rem' }}>
                            <span style={{
                              fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                              padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                              backgroundColor: `${confColor} / 0.12`, color: confColor,
                            }}>
                              {avgConf}%
                            </span>
                            <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)' }}>
                              {group.records.length} {group.records.length === 1 ? 'page' : 'pages'}
                            </span>
                            {group.needsReview && (
                              <AlertTriangle style={{ inlineSize: '0.5625rem', blockSize: '0.5625rem', color: 'oklch(0.6 0.18 60)' }} />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div style={{ paddingInlineStart: '0.1875rem' }}>
                          {/* Page items */}
                          {group.records.map(r => {
                            const isAccepted = decisions[`sup-pg${r.engagementPageId}`] === 'accepted'
                            const isSup = r.decisionType === 'Superseded'
                            return (
                              <button
                                key={r.engagementPageId}
                                type="button"
                                onClick={() => selectGroup(gIdx)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                                  inlineSize: '100%', padding: '0.3125rem 0.75rem 0.3125rem 1.75rem',
                                  border: 'none', cursor: 'pointer', textAlign: 'start',
                                  backgroundColor: 'transparent',
                                }}
                              >
                                <input
                                  type="checkbox" checked={isAccepted} readOnly
                                  aria-label={`Page ${r.engagementPageId} accepted`}
                                  style={{ inlineSize: '0.75rem', blockSize: '0.75rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }}
                                />
                                <FileText style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'oklch(0.25 0.01 260)' }}>
                                  {r.engagementPageId} ({r.documentRef?.pageNumber})
                                </span>
                                <span style={{
                                  marginInlineStart: 'auto', flexShrink: 0,
                                  fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                  padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                                  backgroundColor: isSup ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 145)',
                                  color: isSup ? 'oklch(0.45 0.18 25)' : 'oklch(0.35 0.14 145)',
                                }}>
                                  {isSup ? 'Superseded' : 'Original'}
                                </span>
                              </button>
                            )
                          })}

                          {/* Inline: AI Analysis accordion */}
                          <details open={isActive} style={{
                            marginInlineStart: '1.75rem', marginBlockStart: '0.25rem',
                            borderRadius: '0.25rem', overflow: 'hidden',
                            border: '0.0625rem solid oklch(0.92 0.01 240)',
                          }}>
                            <summary style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
                              padding: '0.3125rem 0.5rem',
                              fontSize: '0.625rem', fontWeight: 700,
                              color: 'var(--ai-accent)',
                              backgroundColor: 'oklch(0.97 0.005 240)',
                              cursor: 'pointer', listStyle: 'none',
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              <Sparkles style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                              AI Analysis
                              {groupSuperseded?.reviewRequired && (
                                <AlertTriangle style={{ inlineSize: '0.5625rem', blockSize: '0.5625rem', color: 'oklch(0.6 0.18 60)', marginInlineStart: 'auto' }} />
                              )}
                            </summary>
                            <div style={{
                              padding: '0.375rem 0.5rem', backgroundColor: 'oklch(0.98 0.003 240)',
                              display: 'flex', flexDirection: 'column', gap: '0.375rem',
                            }}>
                              {/* Rule + confidence */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '0.5625rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                                  padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem',
                                  backgroundColor: 'oklch(0.94 0.005 260)', color: 'oklch(0.4 0.01 260)',
                                }}>
                                  {groupSuperseded?.appliedRuleSet} / {groupSuperseded?.decisionRule}
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: confColor }}>
                                  {avgConf}%
                                </span>
                              </div>

                              {/* Reasoning */}
                              <p style={{ fontSize: '0.625rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>
                                {groupSuperseded?.decisionReason}
                              </p>

                              {/* Escalation */}
                              {groupSuperseded?.escalationReason && (
                                <div style={{
                                  display: 'flex', alignItems: 'flex-start', gap: '0.25rem',
                                  padding: '0.25rem 0.375rem', borderRadius: '0.1875rem',
                                  backgroundColor: 'oklch(0.96 0.04 60)', border: '0.0625rem solid oklch(0.88 0.08 60)',
                                }}>
                                  <AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                                  <div>
                                    <p style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.5 0.16 60)' }}>Escalation</p>
                                    <p style={{ fontSize: '0.625rem', color: 'oklch(0.35 0.1 60)', lineHeight: '1.4' }}>{groupSuperseded.escalationReason}</p>
                                  </div>
                                </div>
                              )}

                              {/* Key differences */}
                              {groupCompared.some(v => !v.match) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1875rem' }}>
                                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.45 0.12 25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Key Differences
                                  </span>
                                  {groupCompared.filter(v => !v.match).map(v => (
                                    <div key={v.field} style={{ display: 'flex', flexDirection: 'column', gap: '0.0625rem' }}>
                                      <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'oklch(0.35 0.01 260)' }}>{v.field}</span>
                                      <div style={{ display: 'flex', gap: '0.1875rem', fontSize: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.14 25)' }}>
                                          {v.valueA}
                                        </span>
                                        <span style={{ color: 'oklch(0.55 0.01 260)' }}>&rarr;</span>
                                        <span style={{ padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.12 145)' }}>
                                          {v.valueB}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </details>

                          {/* Inline: Field Comparison accordion */}
                          {groupCompared.length > 0 && (
                            <details style={{
                              marginInlineStart: '1.75rem', marginBlockStart: '0.25rem', marginBlockEnd: '0.5rem',
                              borderRadius: '0.25rem', overflow: 'hidden',
                              border: '0.0625rem solid oklch(0.92 0.005 260)',
                            }}>
                              <summary style={{
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.3125rem 0.5rem',
                                fontSize: '0.625rem', fontWeight: 700,
                                color: 'oklch(0.35 0.01 260)',
                                backgroundColor: 'oklch(0.97 0.003 260)',
                                cursor: 'pointer', listStyle: 'none',
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                              }}>
                                <TableProperties style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                                Field Comparison
                                <span style={{
                                  fontSize: '0.5rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)',
                                  marginInlineStart: 'auto',
                                }}>
                                  {groupCompared.filter(v => !v.match).length}/{groupCompared.length} differ
                                </span>
                              </summary>
                              <div style={{ padding: '0.375rem', backgroundColor: 'oklch(0.99 0.002 260)' }}>
                                <FieldComparison
                                  values={groupCompared}
                                  labelA={groupSuperseded?.documentRef?.formLabel ?? 'Superseded'}
                                  labelB={groupOriginal?.documentRef?.formLabel ?? 'Original'}
                                />
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Next Step button */}
              <div style={{ padding: '0.625rem', borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                <button
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                    inlineSize: '100%', padding: '0.5rem',
                    border: 'none', borderRadius: '0.25rem',
                    backgroundColor: 'oklch(0.50 0.20 25)',
                    fontSize: '0.75rem', fontWeight: 700, color: 'oklch(1 0 0)',
                    cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}
                >
                  Next Step
                  <ArrowRight style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
                </button>
              </div>
            </nav>

            {/* ── RIGHT: Dual PDF comparison ── */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Status headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr' }}>
                {/* Superseded header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.625rem',
                  borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                  backgroundColor: 'oklch(0.97 0.01 25 / 0.3)',
                }}>
                  <span style={{
                    fontSize: '0.625rem', fontWeight: 700,
                    padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                    backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    Superseded
                  </span>
                  <FileText style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.45 0.01 260)', flexShrink: 0 }} />
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.2 0.01 260)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {leftDoc ? `${leftDoc.engagementPageId} (${leftDoc.documentRef?.pageNumber})_${leftDoc.documentRef?.formType}` : 'No document'}
                  </span>
                </div>

                {/* Center divider */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                  borderInline: '0.0625rem solid oklch(0.91 0.005 260)',
                  backgroundColor: 'oklch(0.97 0.003 260)', padding: '0 0.1875rem',
                }}>
                  <MoveHorizontal style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.55 0.01 260)' }} />
                </div>

                {/* Original header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.625rem',
                  borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                  backgroundColor: 'oklch(0.97 0.01 145 / 0.3)',
                }}>
                  <span style={{
                    fontSize: '0.625rem', fontWeight: 700,
                    padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                    backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    Original
                  </span>
                  <FileText style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.45 0.01 260)', flexShrink: 0 }} />
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.2 0.01 260)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {rightDoc ? `${rightDoc.engagementPageId} (${rightDoc.documentRef?.pageNumber})_${rightDoc.documentRef?.formType}` : 'No document'}
                  </span>
                </div>
              </div>

              {/* Dual PDF viewers with center toolbar */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                flex: '1 1 auto', minBlockSize: 0,
              }}>
                {/* Left PDF (Superseded) */}
                <div style={{ overflow: 'auto', padding: '0.375rem' }}>
                  {leftDoc?.documentRef ? (
                    <PdfPageViewer documentRef={leftDoc.documentRef} stamp="SUPERSEDED" height="24rem" />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.55 0.01 260)', fontSize: '0.8125rem' }}>
                      No superseded document
                    </div>
                  )}
                </div>

                {/* Center toolbar */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '0.1875rem', padding: '0.375rem 0.1875rem',
                  borderInline: '0.0625rem solid oklch(0.91 0.005 260)',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                }}>
                  {[
                    { icon: ZoomIn, label: 'Zoom in' },
                    { icon: ZoomOut, label: 'Zoom out' },
                    { icon: Maximize, label: 'Fit to view' },
                    { icon: RotateCw, label: 'Rotate' },
                    { icon: FlipHorizontal, label: 'Flip horizontal' },
                    { icon: FlipVertical, label: 'Flip vertical' },
                  ].map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      type="button"
                      aria-label={label}
                      title={label}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        inlineSize: '1.75rem', blockSize: '1.75rem',
                        border: '0.0625rem solid oklch(0.88 0.01 260)',
                        borderRadius: '0.25rem',
                        backgroundColor: 'oklch(1 0 0)', color: 'oklch(0.35 0.01 260)',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
                    </button>
                  ))}
                </div>

                {/* Right PDF (Original) */}
                <div style={{ overflow: 'auto', padding: '0.375rem' }}>
                  {rightDoc?.documentRef ? (
                    <PdfPageViewer documentRef={rightDoc.documentRef} stamp="ORIGINAL" height="24rem" />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.55 0.01 260)', fontSize: '0.8125rem' }}>
                      No original document
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Resize handle ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        blockSize: '0.5rem', backgroundColor: 'oklch(0.94 0.005 260)',
        borderInline: '0.0625rem solid oklch(0.88 0.01 260)',
        cursor: 'row-resize',
      }}>
        <GripVertical style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.6 0.01 260)', transform: 'rotate(90deg)' }} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION B: Table Review (from baseline SupersededClient)
         ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        border: '0.0625rem solid oklch(0.88 0.01 260)',
        borderBlockStart: 'none',
        borderRadius: '0 0 var(--radius) var(--radius)',
        overflow: 'hidden',
        backgroundColor: 'oklch(1 0 0)',
      }}>

        {/* Summary bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          padding: '0.625rem 1rem', backgroundColor: 'oklch(0.97 0.005 260)',
          borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.25 0 0)' }}>
            <FolderOpen style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0 0)' }} />
            Review Table
          </span>
          <span style={pillStyle}>{groups.length} Groups</span>
          <span style={pillStyle}>{data.length} Documents</span>
          <span style={{ ...pillStyle, backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
            {totalOriginal} Original
          </span>
          <span style={{ ...pillStyle, backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)' }}>
            {totalSuperseded} Superseded
          </span>
          {totalReview > 0 && (
            <span style={{ ...pillStyle, backgroundColor: 'oklch(0.95 0.04 60)', color: 'oklch(0.45 0.15 60)' }}>
              {totalReview} Need Review
            </span>
          )}
          <div style={{ marginInlineStart: 'auto' }}>
            <Button variant="default" size="sm" onClick={handleAcceptAll}>
              <Check style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Accept All High Confidence ({highCount})
            </Button>
          </div>
        </div>

        {/* Category swimlanes */}
        {groups.map((group, gIdx) => {
          const isExpanded = expandedGroups.has(group.formType)
          const allGroupAccepted = group.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
          const isActive = gIdx === selectedGroupIdx

          return (
            <section
              key={group.formType}
              style={{
                borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)',
                backgroundColor: isActive ? 'oklch(0.99 0.005 240)' : 'oklch(1 0 0)',
              }}
            >
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.formType, gIdx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  inlineSize: '100%', padding: '0.75rem 1rem',
                  backgroundColor: allGroupAccepted ? 'oklch(0.95 0.03 145 / 0.35)' : 'oklch(0.965 0.005 260)',
                  border: 'none', cursor: 'pointer', textAlign: 'start',
                  borderBlockEnd: isExpanded ? '0.0625rem solid oklch(0.88 0.01 260)' : 'none',
                  borderInlineStart: isActive
                    ? '0.25rem solid oklch(0.5 0.18 240)'
                    : `0.25rem solid ${group.needsReview ? 'oklch(0.65 0.18 60)' : 'var(--ai-accent)'}`,
                }}
                aria-expanded={isExpanded}
              >
                {isExpanded
                  ? <ChevronDown style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.45 0 0)', flexShrink: 0 }} />
                  : <ChevronRight style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.45 0 0)', flexShrink: 0 }} />
                }
                <FileText style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--ai-accent)', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.0625rem', minInlineSize: 0 }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
                    {group.formType}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'oklch(0.45 0.01 260)', fontWeight: 500 }}>
                    {group.formEntity}
                  </span>
                </div>

                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  inlineSize: '1.375rem', blockSize: '1.375rem', borderRadius: '50%',
                  backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)',
                  fontSize: '0.625rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {group.records.length}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {group.originalCount > 0 && (
                    <span style={{ ...smallPillStyle, backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
                      {group.originalCount} Original
                    </span>
                  )}
                  {group.supersededCount > 0 && (
                    <span style={{ ...smallPillStyle, backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)' }}>
                      {group.supersededCount} Superseded
                    </span>
                  )}
                </div>

                <ConfidenceBadge score={group.averageConfidence} />

                <div style={{ marginInlineStart: 'auto', flexShrink: 0 }}>
                  {group.needsReview ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.55 0.18 60)' }}>
                      <CircleAlert style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
                      Review Required
                    </span>
                  ) : allGroupAccepted ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.45 0.15 145)' }}>
                      <CircleCheck style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
                      All Accepted
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.55 0.15 145)' }}>
                      <CircleCheck style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
                      Auto-Applied
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded rows */}
              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {group.records.map((r, idx) => {
                    const itemKey = `sup-pg${r.engagementPageId}`
                    const isAccepted = decisions[itemKey] === 'accepted'
                    const isDocOpen = openDocId === r.engagementPageId
                    const level = getConfidenceLevel(r.confidenceLevel)
                    const stampLabel = r.decisionType === 'Original' ? 'ORIGINAL' : 'SUPERSEDED'
                    const stampBg = r.decisionType === 'Original' ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)'
                    const stampFg = r.decisionType === 'Original' ? 'oklch(0.35 0.14 145)' : 'oklch(0.40 0.18 25)'
                    const borderLeft = level === 'high' ? 'var(--confidence-high)' : level === 'medium' ? 'var(--confidence-medium)' : 'var(--confidence-low)'

                    return (
                      <article
                        key={r.engagementPageId}
                        style={{
                          borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.93 0.003 260)' : 'none',
                          borderInlineStart: `0.25rem solid ${borderLeft}`,
                          backgroundColor: isAccepted ? 'oklch(0.985 0.01 145 / 0.25)' : 'oklch(1 0 0)',
                        }}
                      >
                        {/* Record header */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.625rem 0.875rem', gap: '0.375rem', flexWrap: 'wrap',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap', minInlineSize: 0 }}>
                            <AiIndicator />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>
                              Page {r.engagementPageId}
                            </span>
                            <span style={{
                              padding: '0.0625rem 0.375rem', borderRadius: '1rem', fontSize: '0.5625rem', fontWeight: 700,
                              backgroundColor: stampBg, color: stampFg,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              {stampLabel}
                            </span>
                            {r.reviewRequired && (
                              <Badge variant="outline" style={{ borderColor: 'var(--confidence-medium)', color: 'var(--confidence-medium)', fontSize: '0.5625rem' }}>
                                Review
                              </Badge>
                            )}
                            {isAccepted && (
                              <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'oklch(0.45 0.15 145)' }}>Accepted</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                            <Button variant="outline" size="sm" onClick={() => setOpenDocId(isDocOpen ? null : r.engagementPageId)} style={{ gap: '0.25rem', fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
                              {isDocOpen
                                ? <><EyeOff style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Hide</>
                                : <><Eye style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> View</>
                              }
                            </Button>
                            {isAccepted ? (
                              <Button variant="outline" size="sm" onClick={() => undo(itemKey, 'superseded', r.confidenceLevel)} style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
                                <Undo2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Undo
                              </Button>
                            ) : (
                              <Button variant="default" size="sm" onClick={() => accept(itemKey, 'superseded', r.confidenceLevel, 'manual')} style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
                                <Check style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Accept
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* AI Reasoning */}
                        <div style={{ padding: '0 0.875rem 0.625rem', borderBlockStart: '0.0625rem solid oklch(0.95 0 0)' }}>
                          <p style={{ fontSize: '0.625rem', color: 'oklch(0.45 0 0)', paddingBlockStart: '0.375rem', marginBlockEnd: '0.1875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Rule: {r.decisionRule} &middot; {r.appliedRuleSet}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'oklch(0.3 0.01 260)', lineHeight: '1.5' }}>
                            {r.decisionReason}
                          </p>

                          {r.comparedValues?.some(v => !v.match) && (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
                              marginBlockStart: '0.375rem', padding: '0.3125rem 0.5rem',
                              backgroundColor: 'oklch(0.97 0.015 25 / 0.5)', borderRadius: '0.25rem',
                              border: '0.0625rem solid oklch(0.92 0.03 25)',
                              fontSize: '0.6875rem', color: 'oklch(0.4 0.12 25)',
                            }}>
                              <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', flexShrink: 0 }} />
                              <span>
                                <strong>Key difference:</strong>{' '}
                                {(() => {
                                  const m = r.comparedValues!.find(v => !v.match)!
                                  return `${m.field}: "${m.valueA}" vs "${m.valueB}"`
                                })()}
                              </span>
                            </div>
                          )}

                          {r.escalationReason && (
                            <div style={{
                              display: 'flex', alignItems: 'flex-start', gap: '0.375rem',
                              marginBlockStart: '0.375rem', padding: '0.3125rem 0.5rem',
                              backgroundColor: 'oklch(0.96 0.04 60)', borderRadius: '0.25rem',
                              border: '0.0625rem solid oklch(0.88 0.08 60)',
                            }}>
                              <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                              <p style={{ fontSize: '0.6875rem', color: 'oklch(0.4 0.08 60)', lineHeight: '1.4' }}>
                                {r.escalationReason}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Inline PDF preview */}
                        {isDocOpen && r.documentRef && (
                          <div style={{
                            borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)',
                            padding: '0.75rem', backgroundColor: 'oklch(0.975 0.003 260)',
                          }}>
                            <PdfPageViewer documentRef={r.documentRef} stamp={stampLabel} height="22rem" />
                          </div>
                        )}
                      </article>
                    )
                  })}

                  {/* Group-level field comparison */}
                  {(() => {
                    const allCompared = group.records.flatMap(r => r.comparedValues ?? [])
                    const unique = allCompared.filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)
                    if (unique.length === 0) return null
                    const originalRec = group.records.find(r => r.decisionType === 'Original') ?? group.records[0]
                    const supersededRec = group.records.find(r => r.decisionType === 'Superseded')
                    return (
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)',
                        backgroundColor: 'oklch(0.98 0.003 260)',
                      }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.25 0 0)', marginBlockEnd: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Sparkles style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'var(--ai-accent)' }} />
                          Field Comparison &mdash; {group.formType}
                        </p>
                        <FieldComparison
                          values={unique}
                          labelA={originalRec.documentRef?.formLabel ?? 'Original'}
                          labelB={supersededRec?.documentRef?.formLabel ?? 'Superseding Version'}
                        />
                      </div>
                    )
                  })()}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

/* ── Style constants ── */

const pillStyle: React.CSSProperties = {
  padding: '0.125rem 0.4375rem',
  borderRadius: '1rem',
  fontSize: '0.6875rem',
  fontWeight: 600,
  backgroundColor: 'oklch(0.94 0.005 260)',
  color: 'oklch(0.35 0.01 260)',
}

const smallPillStyle: React.CSSProperties = {
  padding: '0.0625rem 0.3125rem',
  borderRadius: '1rem',
  fontSize: '0.5625rem',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}
