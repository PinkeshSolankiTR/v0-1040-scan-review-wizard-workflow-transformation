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

  const toggleGroup = (formType: string, gIdx: number) => {
    setSelectedGroupIdx(gIdx)
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
        if (prev.has(ft)) return prev
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

        {/* ── LEFT SIDEBAR: Inline accordions per form group ── */}
        <aside
          aria-label="Superseded document sidebar"
          style={{
            borderInlineEnd: '0.0625rem solid oklch(0.91 0.005 260)',
            backgroundColor: 'oklch(0.98 0.003 260)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Instructions toggle */}
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
              <p>Review each form group below. Expand a group to see its pages, AI analysis, and field comparisons. The selected group drives the side-by-side PDF viewers.</p>
            </div>
          </details>

          {/* Scrollable form group list */}
          <div style={{ flex: '1 1 auto', overflowY: 'auto' }}>
            {groups.map((group, gIdx) => {
              const isExpanded = expandedGroups.has(group.formType)
              const isActiveGroup = gIdx === selectedGroupIdx
              const groupAccepted = group.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
              const avgConfidence = Math.round(
                (group.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / group.records.length) * 100
              )
              const confColor = avgConfidence >= 90
                ? 'oklch(0.55 0.17 145)'
                : avgConfidence >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'
              const groupSuperseded = group.records.find(r => r.decisionType === 'Superseded')
              const groupOriginal = group.records.find(r => r.decisionType === 'Original')
              const groupCompared = group.records.flatMap(r => r.comparedValues ?? [])
                .filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)

              return (
                <div key={group.formType} style={{
                  borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                  backgroundColor: isActiveGroup ? 'oklch(0.97 0.01 240 / 0.4)' : 'transparent',
                }}>
                  {/* ── Group header ── */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.formType, gIdx)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                      inlineSize: '100%', padding: '0.625rem 0.75rem',
                      border: 'none', cursor: 'pointer', textAlign: 'start',
                      backgroundColor: 'transparent',
                      borderInlineStart: isActiveGroup ? '0.1875rem solid oklch(0.5 0.18 240)' : '0.1875rem solid transparent',
                    }}
                  >
                    <input
                      type="checkbox" checked={groupAccepted} readOnly
                      aria-label={`${group.formType} group accepted`}
                      style={{ inlineSize: '0.875rem', blockSize: '0.875rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0, marginBlockStart: '0.0625rem' }}
                    />
                    <div style={{ flex: '1 1 0', minInlineSize: 0 }}>
                      <span style={{
                        display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {group.formType}: {group.formEntity.toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockStart: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                          padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                          backgroundColor: `${confColor} / 0.12`, color: confColor,
                        }}>
                          {avgConfidence}%
                        </span>
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)' }}>
                          {group.records.length} {group.records.length === 1 ? 'page' : 'pages'}
                        </span>
                        {group.records.some(r => r.reviewRequired) && (
                          <AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.6 0.18 60)' }} />
                        )}
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                      : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                    }
                  </button>

                  {/* ── Expanded content ── */}
                  {isExpanded && (
                    <div style={{ paddingInlineStart: '0.1875rem' }}>
                      {/* Page items with Superseded / Original labels */}
                      {group.records.map((r) => {
                        const isAccepted = decisions[`sup-pg${r.engagementPageId}`] === 'accepted'
                        const isSup = r.decisionType === 'Superseded'
                        return (
                          <button
                            key={r.engagementPageId}
                            type="button"
                            onClick={() => selectGroup(gIdx)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
                              inlineSize: '100%', padding: '0.375rem 0.75rem 0.375rem 2rem',
                              border: 'none', cursor: 'pointer', textAlign: 'start',
                              backgroundColor: 'transparent',
                            }}
                          >
                            <input
                              type="checkbox" checked={isAccepted} readOnly
                              aria-label={`Page ${r.engagementPageId} accepted`}
                              style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }}
                            />
                            <FileText style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'oklch(0.25 0.01 260)' }}>
                              {r.engagementPageId} ({r.documentRef?.pageNumber})
                            </span>
                            <span style={{
                              marginInlineStart: 'auto', flexShrink: 0,
                              fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                              padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                              backgroundColor: isSup ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 145)',
                              color: isSup ? 'oklch(0.45 0.18 25)' : 'oklch(0.35 0.14 145)',
                            }}>
                              {isSup ? 'Superseded' : 'Original'}
                            </span>
                          </button>
                        )
                      })}


                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Next Step button at bottom */}
          <div style={{ padding: '0.75rem', borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)' }}>
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
        </aside>

        {/* ── RIGHT: Dual document comparison area ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── AI Analysis (collapsible, collapsed by default, bullet points) ── */}
          {(() => {
            const groupSuperseded = activeGroup?.records.find(r => r.decisionType === 'Superseded')
            const groupCompared = (activeGroup?.records ?? []).flatMap(r => r.comparedValues ?? [])
              .filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)
            const avgConf = activeGroup
              ? Math.round((activeGroup.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / activeGroup.records.length) * 100)
              : 0
            const confColor = avgConf >= 90 ? 'oklch(0.55 0.17 145)' : avgConf >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'
            const mismatches = groupCompared.filter(v => !v.match)

            return (
              <details style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                <summary style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem', fontWeight: 700,
                  color: 'var(--ai-accent)',
                  backgroundColor: 'oklch(0.97 0.005 240)',
                  cursor: 'pointer', listStyle: 'none',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  <Sparkles style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                  AI Analysis
                  <span style={{
                    fontSize: '0.625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                    padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                    backgroundColor: `${confColor} / 0.12`, color: confColor,
                    marginInlineStart: '0.25rem',
                  }}>
                    {avgConf}%
                  </span>
                  {groupSuperseded?.reviewRequired && (
                    <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)' }} />
                  )}
                </summary>
                <div style={{
                  padding: '0.625rem 0.75rem',
                  backgroundColor: 'oklch(0.98 0.003 240)',
                }}>
                  <ul style={{
                    margin: 0, paddingInlineStart: '1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '0.375rem',
                    listStyleType: 'disc',
                  }}>
                    {/* Decision reasoning split into individual pointers */}
                    {/* Split on period + space + uppercase letter (sentence boundary) to avoid breaking decimals like $3,285.60 */}
                    {groupSuperseded?.decisionReason
                      ?.split(/\.(?=\s+[A-Z])/)
                      .map(s => s.trim())
                      .filter(s => s.length > 0)
                      .map(s => s.replace(/\.$/, ''))
                      .map((sentence, i) => (
                        <li key={`reason-${i}`} style={{ fontSize: '0.75rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>
                          {sentence}
                        </li>
                      ))
                    }

                    {/* Escalation as bullet */}
                    {groupSuperseded?.escalationReason && (
                      <li style={{ fontSize: '0.75rem', lineHeight: '1.5', color: 'oklch(0.45 0.16 60)' }}>
                        <strong style={{ color: 'oklch(0.5 0.16 60)' }}>Escalation:</strong>{' '}
                        {groupSuperseded.escalationReason}
                      </li>
                    )}

                    {/* Key differences as sub-bullets */}
                    {mismatches.length > 0 && (
                      <li style={{ fontSize: '0.75rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>
                        <strong style={{ color: 'oklch(0.45 0.12 25)' }}>Key Differences ({mismatches.length}):</strong>
                        <ul style={{ marginBlockStart: '0.25rem', paddingInlineStart: '1rem', listStyleType: 'circle', display: 'flex', flexDirection: 'column', gap: '0.1875rem' }}>
                          {mismatches.map(v => (
                            <li key={v.field} style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>
                              <span style={{ fontWeight: 600 }}>{v.field}:</span>{' '}
                              <span style={{ padding: '0 0.1875rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.14 25)' }}>
                                {v.valueA}
                              </span>
                              {' '}&rarr;{' '}
                              <span style={{ padding: '0 0.1875rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.12 145)' }}>
                                {v.valueB}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )}
                  </ul>
                </div>
              </details>
            )
          })()}

          {/* ── Field Comparison strip (collapsible) ── */}
          {comparedValues.length > 0 && (
            <details style={{
              borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
            }}>
              <summary style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                fontSize: '0.6875rem', fontWeight: 700,
                color: 'oklch(0.35 0.01 260)',
                backgroundColor: 'oklch(0.97 0.003 260)',
                cursor: 'pointer', listStyle: 'none',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                Field Comparison
                <span style={{
                  fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)',
                }}>
                  {comparedValues.filter(v => !v.match).length} of {comparedValues.length} differ
                </span>
              </summary>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'oklch(0.99 0.002 260)' }}>
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
        </div>
      </div>
    </div>
  )
}
