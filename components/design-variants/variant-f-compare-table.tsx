'use client'

/**
 * DESIGN VARIANT F: "Compare + Table"
 * Combines the production-style split document viewer (Variant E)
 * with the table-based review UI (baseline). Top section shows
 * side-by-side PDF comparison; bottom section shows the full
 * swimlane table with expandable rows, AI reasoning, and field comparison.
 */

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { FieldComparison } from '@/components/field-comparison'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel, type SupersededRecord } from '@/lib/types'
import {
  Check, Undo2, FileText, AlertTriangle,
  ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, FolderOpen,
  ZoomIn, ZoomOut, RotateCw, Maximize,
  MoveHorizontal, GripVertical,
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
  const [splitOpen, setSplitOpen] = useState(true)

  const activeGroup = groups[selectedGroupIdx] ?? groups[0]
  const leftDoc = activeGroup?.supersededRecords[0] ?? null
  const rightDoc = activeGroup?.originalRecord ?? null

  const comparedValues = useMemo(() => {
    if (!activeGroup) return []
    const all = activeGroup.records.flatMap(r => r.comparedValues ?? [])
    return all.filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)
  }, [activeGroup])

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

        {/* Header bar with toggle + group tabs */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: 'oklch(0.97 0.003 260)',
          borderBlockEnd: splitOpen ? '0.0625rem solid oklch(0.91 0.005 260)' : 'none',
        }}>
          <button
            type="button"
            onClick={() => setSplitOpen(prev => !prev)}
            aria-expanded={splitOpen}
            aria-label={splitOpen ? 'Collapse document comparison' : 'Expand document comparison'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              inlineSize: '1.5rem', blockSize: '1.5rem',
              border: '0.0625rem solid oklch(0.88 0.01 260)',
              borderRadius: '0.25rem',
              backgroundColor: 'oklch(1 0 0)', color: 'oklch(0.35 0.01 260)',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            {splitOpen
              ? <ChevronDown style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
              : <ChevronRight style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
            }
          </button>

          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)', flexShrink: 0 }}>
            Document Comparison
          </span>

          {/* Group selector tabs */}
          <nav aria-label="Form type groups" style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            marginInlineStart: '0.5rem',
            overflowX: 'auto',
            flex: '1 1 auto',
          }}>
            {groups.map((g, gIdx) => {
              const isActive = gIdx === selectedGroupIdx
              const avgConf = Math.round(g.averageConfidence * 100)
              return (
                <button
                  key={g.formType}
                  type="button"
                  onClick={() => selectGroup(gIdx)}
                  aria-current={isActive ? 'true' : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.3125rem 0.625rem',
                    border: isActive ? '0.0625rem solid oklch(0.5 0.18 240)' : '0.0625rem solid oklch(0.88 0.01 260)',
                    borderRadius: '1rem',
                    backgroundColor: isActive ? 'oklch(0.95 0.02 240)' : 'oklch(1 0 0)',
                    color: isActive ? 'oklch(0.3 0.12 240)' : 'oklch(0.35 0.01 260)',
                    cursor: 'pointer',
                    fontSize: '0.6875rem', fontWeight: 600,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {g.formType}
                  <span style={{
                    fontSize: '0.5625rem', fontWeight: 700,
                    padding: '0.0625rem 0.25rem', borderRadius: '0.625rem',
                    backgroundColor: isActive ? 'oklch(0.45 0.18 240)' : 'oklch(0.92 0.005 260)',
                    color: isActive ? 'oklch(1 0 0)' : 'oklch(0.45 0.01 260)',
                  }}>
                    {g.records.length}
                  </span>
                  {g.needsReview && (
                    <AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.6 0.18 60)' }} />
                  )}
                  <span style={{
                    fontSize: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: avgConf >= 90 ? 'oklch(0.55 0.17 145)' : avgConf >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)',
                  }}>
                    {avgConf}%
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {splitOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Superseded / Original labels + doc names */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.3125rem 0.625rem',
                borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                backgroundColor: 'oklch(0.97 0.01 25 / 0.3)',
              }}>
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 700,
                  padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                  backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  Superseded
                </span>
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {leftDoc ? `Pg ${leftDoc.documentRef?.pageNumber} - ${leftDoc.documentRef?.formType}` : 'No document'}
                </span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                borderInline: '0.0625rem solid oklch(0.91 0.005 260)',
                backgroundColor: 'oklch(0.97 0.003 260)', padding: '0 0.1875rem',
              }}>
                <MoveHorizontal style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem', color: 'oklch(0.55 0.01 260)' }} />
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.3125rem 0.625rem',
                borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                backgroundColor: 'oklch(0.97 0.01 145 / 0.3)',
              }}>
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 700,
                  padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                  backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  Original
                </span>
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {rightDoc ? `Pg ${rightDoc.documentRef?.pageNumber} - ${rightDoc.documentRef?.formType}` : 'No document'}
                </span>
              </div>
            </div>

            {/* Field Comparison strip (collapsible) */}
            {comparedValues.length > 0 && (
              <details style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                <summary style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.25rem 0.625rem',
                  fontSize: '0.625rem', fontWeight: 700,
                  color: 'oklch(0.35 0.01 260)',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                  cursor: 'pointer', listStyle: 'none',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  <ChevronRight style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.5 0.01 260)' }} />
                  Field Comparison
                  <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)' }}>
                    {comparedValues.filter(v => !v.match).length} of {comparedValues.length} differ
                  </span>
                </summary>
                <div style={{ padding: '0.375rem 0.625rem', backgroundColor: 'oklch(0.99 0.002 260)' }}>
                  <FieldComparison
                    values={comparedValues}
                    labelA={leftDoc?.documentRef?.formLabel ?? 'Superseded'}
                    labelB={rightDoc?.documentRef?.formLabel ?? 'Original'}
                  />
                </div>
              </details>
            )}

            {/* Dual PDF viewers with center toolbar */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
              flex: '1 1 auto', minBlockSize: '20rem',
            }}>
              <div style={{ overflow: 'auto', padding: '0.375rem' }}>
                {leftDoc?.documentRef ? (
                  <PdfPageViewer documentRef={leftDoc.documentRef} stamp="SUPERSEDED" height="20rem" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.55 0.01 260)', fontSize: '0.8125rem' }}>
                    No superseded document
                  </div>
                )}
              </div>
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
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    title={label}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      inlineSize: '1.5rem', blockSize: '1.5rem',
                      border: '0.0625rem solid oklch(0.88 0.01 260)',
                      borderRadius: '0.25rem',
                      backgroundColor: 'oklch(1 0 0)', color: 'oklch(0.35 0.01 260)',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                  </button>
                ))}
              </div>
              <div style={{ overflow: 'auto', padding: '0.375rem' }}>
                {rightDoc?.documentRef ? (
                  <PdfPageViewer documentRef={rightDoc.documentRef} stamp="ORIGINAL" height="20rem" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.55 0.01 260)', fontSize: '0.8125rem' }}>
                    No original document
                  </div>
                )}
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

              {/* Expanded: compact table rows */}
              {isExpanded && (
                <div>
                  {/* Table header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '3.5rem 1fr 5.5rem minmax(8rem, 16rem) 7rem',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.375rem 1rem 0.375rem 1.25rem',
                    backgroundColor: 'oklch(0.97 0.003 260)',
                    borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                    fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    <span>Page</span>
                    <span>Rule / Reasoning</span>
                    <span>Confidence</span>
                    <span>Flags</span>
                    <span style={{ textAlign: 'end' }}>Actions</span>
                  </div>

                  {group.records.map((r, idx) => {
                    const itemKey = `sup-pg${r.engagementPageId}`
                    const isAccepted = decisions[itemKey] === 'accepted'
                    const level = getConfidenceLevel(r.confidenceLevel)
                    const isSup = r.decisionType === 'Superseded'
                    const borderLeft = level === 'high' ? 'var(--confidence-high)' : level === 'medium' ? 'var(--confidence-medium)' : 'var(--confidence-low)'
                    const hasDiff = r.comparedValues?.some(v => !v.match)

                    return (
                      <div
                        key={r.engagementPageId}
                        onClick={() => selectGroup(gIdx)}
                        role="row"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '3.5rem 1fr 5.5rem minmax(8rem, 16rem) 7rem',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem 0.5rem 1.25rem',
                          borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.95 0.003 260)' : 'none',
                          borderInlineStart: `0.1875rem solid ${borderLeft}`,
                          backgroundColor: isAccepted ? 'oklch(0.985 0.01 145 / 0.25)' : 'oklch(1 0 0)',
                          cursor: 'pointer',
                        }}
                      >
                        {/* Page + Type */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>
                            {r.engagementPageId}
                          </span>
                          <span style={{
                            fontSize: '0.5rem', fontWeight: 700,
                            padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                            backgroundColor: isSup ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 145)',
                            color: isSup ? 'oklch(0.40 0.18 25)' : 'oklch(0.35 0.14 145)',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            alignSelf: 'flex-start',
                          }}>
                            {isSup ? 'Sup' : 'Orig'}
                          </span>
                        </div>

                        {/* Rule + Reasoning (compact single line) */}
                        <div style={{ minInlineSize: 0, overflow: 'hidden' }}>
                          <span style={{
                            fontSize: '0.5625rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                            color: 'oklch(0.45 0.01 260)',
                          }}>
                            {r.decisionRule}
                          </span>
                          <p style={{
                            fontSize: '0.6875rem', color: 'oklch(0.3 0.01 260)', lineHeight: '1.4',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                            marginBlockStart: '0.125rem',
                          }}>
                            {r.decisionReason}
                          </p>
                        </div>

                        {/* Confidence */}
                        <ConfidenceBadge score={r.confidenceLevel} />

                        {/* Flags column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1875rem', minInlineSize: 0 }}>
                          {r.reviewRequired && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.1875rem',
                              fontSize: '0.5625rem', fontWeight: 600, color: 'oklch(0.55 0.18 60)',
                            }}>
                              <AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', flexShrink: 0 }} />
                              Review Required
                            </span>
                          )}
                          {hasDiff && (
                            <span style={{
                              fontSize: '0.5625rem', color: 'oklch(0.4 0.12 25)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {(() => {
                                const m = r.comparedValues!.find(v => !v.match)!
                                return `${m.field}: "${m.valueA}" \u2192 "${m.valueB}"`
                              })()}
                            </span>
                          )}
                          {r.escalationReason && (
                            <span style={{
                              fontSize: '0.5625rem', color: 'oklch(0.45 0.10 60)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              Escalation: {r.escalationReason}
                            </span>
                          )}
                          {!r.reviewRequired && !hasDiff && !r.escalationReason && isAccepted && (
                            <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'oklch(0.45 0.15 145)' }}>
                              Accepted
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          {isAccepted ? (
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); undo(itemKey, 'superseded', r.confidenceLevel) }} style={{ fontSize: '0.625rem', padding: '0.1875rem 0.375rem' }}>
                              <Undo2 style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} /> Undo
                            </Button>
                          ) : (
                            <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); accept(itemKey, 'superseded', r.confidenceLevel, 'manual') }} style={{ fontSize: '0.625rem', padding: '0.1875rem 0.375rem' }}>
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
