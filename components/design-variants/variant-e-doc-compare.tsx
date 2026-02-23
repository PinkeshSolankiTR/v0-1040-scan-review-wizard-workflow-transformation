'use client'

/**
 * DESIGN VARIANT E: "Document Comparison"
 * Production-style split view with left sidebar document tree,
 * two side-by-side PDF viewers, and a vertical toolbar between them.
 * Matches the existing Superseded UI pattern from the production app.
 */

import { useState, useMemo } from 'react'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { FieldComparison } from '@/components/field-comparison'
import { useDecisions } from '@/contexts/decision-context'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Sparkles,
  Check,
  Undo2,
  AlertTriangle,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  MoveHorizontal,
} from 'lucide-react'
import type { SupersededRecord } from '@/lib/types'

/* ── Types ── */

interface FormGroup {
  formType: string
  formEntity: string
  records: SupersededRecord[]
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
      originalRecord: records.find(r => r.decisionType === 'Original') ?? null,
      supersededRecords: records.filter(r => r.decisionType === 'Superseded'),
    })
  }
  return groups
}

/* ── Main Component ── */

export function VariantEDocCompare({ data }: { data: SupersededRecord[] }) {
  const { decisions, accept, undo } = useDecisions()
  const groups = useMemo(() => groupByFormType(data), [data])

  /* Track which group is expanded and which record is selected */
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(groups.map(g => g.formType))
  )
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0)

  const activeGroup = groups[selectedGroupIdx] ?? groups[0]

  const toggleGroup = (formType: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(formType)) next.delete(formType)
      else next.add(formType)
      return next
    })
  }

  const selectGroup = (idx: number) => {
    setSelectedGroupIdx(idx)
    const ft = groups[idx]?.formType
    if (ft) {
      setExpandedGroups(prev => {
        const next = new Set(prev)
        next.add(ft)
        return next
      })
    }
  }

  /* Check if entire group is accepted */
  const allGroupAccepted = activeGroup
    ? activeGroup.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
    : false

  const handleAcceptGroup = () => {
    if (!activeGroup) return
    for (const r of activeGroup.records) {
      const key = `sup-pg${r.engagementPageId}`
      if (decisions[key] !== 'accepted') {
        accept(key, 'superseded', r.confidenceLevel, 'manual')
      }
    }
  }

  const handleUndoGroup = () => {
    if (!activeGroup) return
    for (const r of activeGroup.records) {
      undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
    }
  }

  /* ── Field comparison data for the active group ── */
  const comparedValues = useMemo(() => {
    if (!activeGroup) return []
    const all = activeGroup.records.flatMap(r => r.comparedValues ?? [])
    return all.filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)
  }, [activeGroup])

  /* ── Determine left/right docs ── */
  const leftDoc = activeGroup?.supersededRecords[0] ?? null
  const rightDoc = activeGroup?.originalRecord ?? null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0',
      border: '0.0625rem solid oklch(0.88 0.01 260)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      backgroundColor: 'oklch(1 0 0)',
    }}>
      {/* ── Top header bar ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.625rem 1rem',
        backgroundColor: 'oklch(0.97 0.003 260)',
        borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.45 0.01 260)' }} />
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>
            Superseded Document Review
          </h2>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            inlineSize: '1.375rem', blockSize: '1.375rem', borderRadius: '50%',
            backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)',
            fontSize: '0.6875rem', fontWeight: 700,
          }}>
            {data.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {allGroupAccepted ? (
            <button
              type="button"
              onClick={handleUndoGroup}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.88 0.01 260)',
                borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)',
                fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.45 0.01 260)',
                cursor: 'pointer',
              }}
            >
              <Undo2 style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Undo Group
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAcceptGroup}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem', border: 'none',
                borderRadius: '0.25rem', backgroundColor: 'oklch(0.45 0.18 145)',
                fontSize: '0.75rem', fontWeight: 600, color: 'oklch(1 0 0)',
                cursor: 'pointer',
              }}
            >
              <Check style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Accept All
            </button>
          )}
        </div>
      </header>

      {/* ── Main 3-panel layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(14rem, 18rem) 1fr',
        minBlockSize: '38rem',
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
          {/* Instructions toggle */}
          <details style={{
            borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
          }}>
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
              <p>Review superseded document pairs side by side. The left panel shows the superseded (older) version and the right panel shows the original (corrected) version.</p>
              <p style={{ marginBlockStart: '0.375rem' }}>Accept or undo AI decisions using the top-right buttons.</p>
            </div>
          </details>

          {/* Document tree groups */}
          {groups.map((group, gIdx) => {
            const isExpanded = expandedGroups.has(group.formType)
            const isActiveGroup = gIdx === selectedGroupIdx
            const groupAccepted = group.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')

            return (
              <div key={group.formType} style={{
                borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
              }}>
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => {
                    toggleGroup(group.formType)
                    selectGroup(gIdx)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    inlineSize: '100%', padding: '0.625rem 0.75rem',
                    border: 'none', cursor: 'pointer', textAlign: 'start',
                    backgroundColor: isActiveGroup ? 'oklch(0.94 0.02 240)' : 'transparent',
                    borderInlineStart: isActiveGroup ? '0.1875rem solid oklch(0.5 0.18 240)' : '0.1875rem solid transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={groupAccepted}
                    readOnly
                    aria-label={`${group.formType} group accepted`}
                    style={{ inlineSize: '0.875rem', blockSize: '0.875rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    minInlineSize: 0,
                  }}>
                    {group.formType}: {group.formEntity.toUpperCase()}
                  </span>
                  {isExpanded
                    ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0, marginInlineStart: 'auto' }} />
                    : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0, marginInlineStart: 'auto' }} />
                  }
                </button>

                {/* Child records */}
                {isExpanded && group.records.map((r) => {
                  const isAccepted = decisions[`sup-pg${r.engagementPageId}`] === 'accepted'
                  return (
                    <button
                      key={r.engagementPageId}
                      type="button"
                      onClick={() => selectGroup(gIdx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        inlineSize: '100%', padding: '0.4375rem 0.75rem 0.4375rem 2rem',
                        border: 'none', cursor: 'pointer', textAlign: 'start',
                        backgroundColor: (gIdx === selectedGroupIdx) ? 'oklch(0.92 0.03 240)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isAccepted}
                        readOnly
                        aria-label={`Page ${r.engagementPageId} accepted`}
                        style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }}
                      />
                      <FileText style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 500, color: 'oklch(0.25 0.01 260)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {r.engagementPageId} ({r.documentRef?.pageNumber})
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}

          {/* Next Step button at bottom */}
          <div style={{ marginBlockStart: 'auto', padding: '0.75rem' }}>
            <button
              type="button"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                inlineSize: '100%', padding: '0.625rem',
                border: 'none', borderRadius: '0.25rem',
                backgroundColor: 'oklch(0.50 0.20 25)',
                fontSize: '0.8125rem', fontWeight: 700, color: 'oklch(1 0 0)',
                cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}
            >
              Next Step
              <ArrowRight style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
            </button>
          </div>
        </nav>

        {/* ── RIGHT: Dual document comparison area ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Status headers for left and right docs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
          }}>
            {/* Left doc header (Superseded) */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
              backgroundColor: 'oklch(0.97 0.01 25 / 0.3)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.50 0.18 25)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </span>
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 600,
                  padding: '0.0625rem 0.375rem', borderRadius: '0.1875rem',
                  backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)',
                }}>
                  Superseded
                </span>
              </div>
              <MoveHorizontal style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.01 260)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', minInlineSize: 0 }}>
                <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.45 0.01 260)', flexShrink: 0 }} />
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.2 0.01 260)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {leftDoc
                    ? `${leftDoc.engagementPageId} (${leftDoc.documentRef?.pageNumber})_${leftDoc.documentRef?.formType}:${leftDoc.documentRef?.formLabel?.split('(')[1]?.replace(')', '') ?? ''}`
                    : 'No document'
                  }
                </span>
              </div>
            </div>

            {/* Center divider header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
              borderInlineStart: '0.0625rem solid oklch(0.91 0.005 260)',
              borderInlineEnd: '0.0625rem solid oklch(0.91 0.005 260)',
              backgroundColor: 'oklch(0.97 0.003 260)',
              padding: '0 0.25rem',
            }}>
              <MoveHorizontal style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.55 0.01 260)' }} />
            </div>

            {/* Right doc header (Original) */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
              backgroundColor: 'oklch(0.97 0.01 145 / 0.3)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.45 0.18 145)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </span>
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 600,
                  padding: '0.0625rem 0.375rem', borderRadius: '0.1875rem',
                  backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)',
                }}>
                  Original
                </span>
              </div>
              <MoveHorizontal style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.01 260)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', minInlineSize: 0 }}>
                <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.45 0.01 260)', flexShrink: 0 }} />
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.2 0.01 260)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {rightDoc
                    ? `${rightDoc.engagementPageId} (${rightDoc.documentRef?.pageNumber})_${rightDoc.documentRef?.formType}:${rightDoc.documentRef?.formLabel?.split('(')[1]?.replace(')', '') ?? ''}`
                    : 'No document'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Dual PDF viewers with center toolbar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            flex: '1 1 auto',
            minBlockSize: 0,
          }}>
            {/* Left PDF viewer (Superseded) */}
            <div style={{ overflow: 'auto', padding: '0.5rem' }}>
              {leftDoc?.documentRef ? (
                <PdfPageViewer
                  documentRef={leftDoc.documentRef}
                  stamp="SUPERSEDED"
                  height="30rem"
                />
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  blockSize: '100%', color: 'oklch(0.55 0.01 260)', fontSize: '0.8125rem',
                }}>
                  No superseded document
                </div>
              )}
            </div>

            {/* Center vertical toolbar */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '0.25rem', padding: '0.5rem 0.25rem',
              borderInlineStart: '0.0625rem solid oklch(0.91 0.005 260)',
              borderInlineEnd: '0.0625rem solid oklch(0.91 0.005 260)',
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
                    inlineSize: '2rem', blockSize: '2rem',
                    border: '0.0625rem solid oklch(0.88 0.01 260)',
                    borderRadius: '0.25rem',
                    backgroundColor: 'oklch(1 0 0)', color: 'oklch(0.35 0.01 260)',
                    cursor: 'pointer',
                  }}
                >
                  <Icon style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                </button>
              ))}
            </div>

            {/* Right PDF viewer (Original / Corrected) */}
            <div style={{ overflow: 'auto', padding: '0.5rem' }}>
              {rightDoc?.documentRef ? (
                <PdfPageViewer
                  documentRef={rightDoc.documentRef}
                  stamp="ORIGINAL"
                  height="30rem"
                />
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  blockSize: '100%', color: 'oklch(0.55 0.01 260)', fontSize: '0.8125rem',
                }}>
                  No original document
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom panel: AI reasoning + field comparison ── */}
          <details style={{
            borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)',
            backgroundColor: 'oklch(0.98 0.003 260)',
          }}>
            <summary style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1rem',
              fontSize: '0.8125rem', fontWeight: 700, color: 'oklch(0.25 0.01 260)',
              cursor: 'pointer', listStyle: 'none',
            }}>
              <Sparkles style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--ai-accent)' }} />
              AI Analysis &amp; Field Comparison
              <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
            </summary>

            <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* AI reasoning for superseded doc */}
              {leftDoc && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '0.375rem',
                  padding: '0.625rem 0.75rem', borderRadius: '0.25rem',
                  backgroundColor: 'oklch(0.97 0.005 240)',
                  border: '0.0625rem solid oklch(0.92 0.01 240)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Sparkles style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--ai-accent)' }} />
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--ai-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      AI Reasoning
                    </span>
                    <span style={{
                      fontSize: '0.625rem', fontWeight: 600,
                      padding: '0.0625rem 0.375rem', borderRadius: '1rem',
                      backgroundColor: 'oklch(0.94 0.005 260)', color: 'oklch(0.4 0.01 260)',
                    }}>
                      Rule: {leftDoc.decisionRule} / {leftDoc.appliedRuleSet}
                    </span>
                    <span style={{
                      fontSize: '0.625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                      color: leftDoc.confidenceLevel >= 0.9 ? 'oklch(0.55 0.17 145)' : leftDoc.confidenceLevel >= 0.7 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)',
                      marginInlineStart: 'auto',
                    }}>
                      {Math.round(leftDoc.confidenceLevel * 100)}% confidence
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>
                    {leftDoc.decisionReason}
                  </p>
                </div>
              )}

              {/* Escalation warning */}
              {leftDoc?.escalationReason && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                  padding: '0.5rem 0.75rem', borderRadius: '0.25rem',
                  backgroundColor: 'oklch(0.96 0.04 60)', border: '0.0625rem solid oklch(0.88 0.08 60)',
                }}>
                  <AlertTriangle style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.125rem' }} />
                  <div>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.5 0.16 60)' }}>Escalation</p>
                    <p style={{ fontSize: '0.8125rem', color: 'oklch(0.35 0.1 60)', lineHeight: '1.4' }}>{leftDoc.escalationReason}</p>
                  </div>
                </div>
              )}

              {/* Key difference callout */}
              {comparedValues.some(v => !v.match) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.4375rem 0.625rem', borderRadius: '0.25rem',
                  backgroundColor: 'oklch(0.97 0.015 25 / 0.5)',
                  border: '0.0625rem solid oklch(0.92 0.03 25)',
                  fontSize: '0.75rem', color: 'oklch(0.4 0.12 25)',
                }}>
                  <AlertTriangle style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', flexShrink: 0 }} />
                  <span>
                    <strong>Key difference:</strong>{' '}
                    {(() => {
                      const m = comparedValues.find(v => !v.match)
                      return m ? `${m.field}: "${m.valueA}" vs "${m.valueB}"` : ''
                    })()}
                  </span>
                </div>
              )}

              {/* Field comparison table */}
              {comparedValues.length > 0 && (
                <FieldComparison
                  values={comparedValues}
                  labelA={leftDoc?.documentRef?.formLabel ?? 'Superseded'}
                  labelB={rightDoc?.documentRef?.formLabel ?? 'Original'}
                />
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
