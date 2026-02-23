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
  ListTree,
  Brain,
  TableProperties,
} from 'lucide-react'
import type { SupersededRecord } from '@/lib/types'

type SidebarTab = 'documents' | 'analysis' | 'fields'

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
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('documents')

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

        {/* ── LEFT SIDEBAR: Tabbed panels ── */}
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
          {/* Sidebar tab bar */}
          <div role="tablist" aria-label="Sidebar sections" style={{
            display: 'flex',
            borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
            backgroundColor: 'oklch(0.96 0.003 260)',
          }}>
            {([
              { id: 'documents' as SidebarTab, label: 'Documents', icon: ListTree },
              { id: 'analysis' as SidebarTab, label: 'AI Analysis', icon: Brain, showDot: leftDoc?.reviewRequired },
              { id: 'fields' as SidebarTab, label: 'Fields', icon: TableProperties },
            ]).map(tab => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={sidebarTab === tab.id}
                aria-controls={`sidebar-panel-${tab.id}`}
                onClick={() => setSidebarTab(tab.id)}
                style={{
                  flex: '1 1 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                  padding: '0.5rem 0.25rem',
                  border: 'none', cursor: 'pointer',
                  fontSize: '0.6875rem', fontWeight: sidebarTab === tab.id ? 700 : 500,
                  color: sidebarTab === tab.id ? 'oklch(0.35 0.18 240)' : 'oklch(0.5 0.01 260)',
                  backgroundColor: 'transparent',
                  borderBlockEnd: sidebarTab === tab.id ? '0.125rem solid oklch(0.5 0.18 240)' : '0.125rem solid transparent',
                  position: 'relative',
                }}
              >
                <tab.icon style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
                {tab.label}
                {tab.showDot && (
                  <span style={{
                    position: 'absolute', insetBlockStart: '0.375rem', insetInlineEnd: '0.375rem',
                    inlineSize: '0.375rem', blockSize: '0.375rem', borderRadius: '50%',
                    backgroundColor: 'oklch(0.65 0.20 50)',
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <div style={{ flex: '1 1 auto', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* ── Documents tab ── */}
            {sidebarTab === 'documents' && (
              <div id="sidebar-panel-documents" role="tabpanel" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto' }}>
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
                    <p>Review superseded document pairs side by side. The left panel shows the superseded (older) version and the right panel shows the original (corrected) version.</p>
                    <p style={{ marginBlockStart: '0.375rem' }}>Accept or undo AI decisions using the top-right buttons.</p>
                  </div>
                </details>

                {/* Document tree groups */}
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

                  return (
                    <div key={group.formType} style={{ borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)' }}>
                      {/* Group header */}
                      <button
                        type="button"
                        onClick={() => { toggleGroup(group.formType); selectGroup(gIdx) }}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                          inlineSize: '100%', padding: '0.625rem 0.75rem',
                          border: 'none', cursor: 'pointer', textAlign: 'start',
                          backgroundColor: isActiveGroup ? 'oklch(0.94 0.02 240)' : 'transparent',
                          borderInlineStart: isActiveGroup ? '0.1875rem solid oklch(0.5 0.18 240)' : '0.1875rem solid transparent',
                          flexWrap: 'wrap',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={groupAccepted}
                          readOnly
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
                          {/* Confidence + page count */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockStart: '0.25rem' }}>
                            <span style={{
                              fontSize: '0.625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                              padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                              backgroundColor: `${confColor} / 0.12`, color: confColor,
                            }}>
                              {avgConfidence}%
                            </span>
                            <span style={{
                              fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)',
                            }}>
                              {group.records.length} {group.records.length === 1 ? 'page' : 'pages'}
                            </span>
                          </div>
                        </div>
                        {isExpanded
                          ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                          : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                        }
                      </button>

                      {/* Child records with Superseded / Original labels */}
                      {isExpanded && group.records.map((r) => {
                        const isAccepted = decisions[`sup-pg${r.engagementPageId}`] === 'accepted'
                        const isSup = r.decisionType === 'Superseded'
                        return (
                          <button
                            key={r.engagementPageId}
                            type="button"
                            onClick={() => selectGroup(gIdx)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
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
                            }}>
                              {r.engagementPageId} ({r.documentRef?.pageNumber})
                            </span>
                            {/* Superseded / Original label */}
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
              </div>
            )}

            {/* ── AI Analysis tab ── */}
            {sidebarTab === 'analysis' && (
              <div id="sidebar-panel-analysis" role="tabpanel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {leftDoc && (
                  <>
                    {/* Confidence score */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.625rem 0.75rem', borderRadius: '0.375rem',
                      backgroundColor: 'oklch(0.97 0.005 240)',
                      border: '0.0625rem solid oklch(0.92 0.01 240)',
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.35 0.01 260)' }}>Confidence</span>
                      <span style={{
                        fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                        color: leftDoc.confidenceLevel >= 0.9 ? 'oklch(0.55 0.17 145)' : leftDoc.confidenceLevel >= 0.7 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)',
                      }}>
                        {Math.round(leftDoc.confidenceLevel * 100)}%
                      </span>
                    </div>

                    {/* Rule info */}
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: '0.25rem',
                      padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
                      backgroundColor: 'oklch(0.97 0.003 260)',
                      border: '0.0625rem solid oklch(0.93 0.005 260)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'oklch(0.5 0.01 260)' }}>Rule Set</span>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'oklch(0.3 0.01 260)' }}>
                          {leftDoc.appliedRuleSet}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'oklch(0.5 0.01 260)' }}>Rule</span>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'oklch(0.3 0.01 260)' }}>
                          {leftDoc.decisionRule}
                        </span>
                      </div>
                    </div>

                    {/* AI reasoning */}
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: '0.375rem',
                      padding: '0.625rem 0.75rem', borderRadius: '0.375rem',
                      backgroundColor: 'oklch(0.97 0.005 240)',
                      border: '0.0625rem solid oklch(0.92 0.01 240)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Sparkles style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--ai-accent)' }} />
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--ai-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          AI Reasoning
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', lineHeight: '1.55', color: 'oklch(0.3 0.01 260)' }}>
                        {leftDoc.decisionReason}
                      </p>
                    </div>

                    {/* Escalation warning */}
                    {leftDoc.escalationReason && (
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                        padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
                        backgroundColor: 'oklch(0.96 0.04 60)', border: '0.0625rem solid oklch(0.88 0.08 60)',
                      }}>
                        <AlertTriangle style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.125rem' }} />
                        <div>
                          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.5 0.16 60)' }}>Escalation Required</p>
                          <p style={{ fontSize: '0.75rem', color: 'oklch(0.35 0.1 60)', lineHeight: '1.45' }}>{leftDoc.escalationReason}</p>
                        </div>
                      </div>
                    )}

                    {/* Key differences */}
                    {comparedValues.some(v => !v.match) && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '0.375rem',
                        padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
                        backgroundColor: 'oklch(0.97 0.015 25 / 0.5)',
                        border: '0.0625rem solid oklch(0.92 0.03 25)',
                      }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.45 0.12 25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Key Differences
                        </span>
                        {comparedValues.filter(v => !v.match).map(v => (
                          <div key={v.field} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.35 0.01 260)' }}>{v.field}</span>
                            <div style={{ display: 'flex', gap: '0.25rem', fontSize: '0.625rem' }}>
                              <span style={{ padding: '0.0625rem 0.25rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.14 25)' }}>
                                {v.valueA}
                              </span>
                              <span style={{ color: 'oklch(0.55 0.01 260)' }}>&rarr;</span>
                              <span style={{ padding: '0.0625rem 0.25rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.12 145)' }}>
                                {v.valueB}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Fields tab ── */}
            {sidebarTab === 'fields' && (
              <div id="sidebar-panel-fields" role="tabpanel" style={{ padding: '0.75rem' }}>
                {comparedValues.length > 0 ? (
                  <FieldComparison
                    values={comparedValues}
                    labelA={leftDoc?.documentRef?.formLabel ?? 'Superseded'}
                    labelB={rightDoc?.documentRef?.formLabel ?? 'Original'}
                  />
                ) : (
                  <p style={{ fontSize: '0.8125rem', color: 'oklch(0.5 0.01 260)', textAlign: 'center', paddingBlockStart: '2rem' }}>
                    No field data available for this group.
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>

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


        </div>
      </div>
    </div>
  )
}
