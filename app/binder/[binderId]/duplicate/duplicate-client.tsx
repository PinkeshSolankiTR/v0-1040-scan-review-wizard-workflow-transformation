'use client'

/**
 * Duplicate Document Review -- layout replicates Superseded Wizard (variant-e)
 * Data model & AI decision spec remain duplicate-specific.
 */

import { useState, useMemo, useCallback } from 'react'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { FieldComparison } from '@/components/field-comparison'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { useDecisions } from '@/contexts/decision-context'
import { useLearnedRules } from '@/contexts/learned-rules-context'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Sparkles,
  Check,
  Undo2,
  AlertTriangle,
  ArrowRight,
  Link2,
  Unlink2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Minimize2,
  Eye,
  Columns2,
} from 'lucide-react'
import type { DuplicateRecord, DuplicateDataRecord, DuplicateDocRecord, OverrideDetail } from '@/lib/types'

/* ── Panel visibility ── */
type PanelId = 'documents' | 'aiAnalysis' | 'fieldComparison'

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

function getDecisionLabel(r: DuplicateRecord): string {
  if (r.itemType === 'DUPLICATE_DATA') return (r as DuplicateDataRecord).decision
  return (r as DuplicateDocRecord).decision
}

/**
 * isRecordMatched: determines if record goes to "Matched" bucket.
 *  1. User explicitly accepted => matched
 *  2. User explicitly rejected => unmatched
 *  3. AI confidence >= 0.9 AND showAutoMatched => matched
 */
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

/* ── Form category grouping ── */

interface FormCategoryGroup {
  formType: string
  formEntity: string
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
    const entityParts = records[0].documentRefA?.formLabel?.replace(formType, '').replace(/[()]/g, '').trim()
    groups.push({
      formType,
      formEntity: entityParts || formType,
      records,
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

/* ── Main Component ── */

export function DuplicateClient({ data }: { data: DuplicateRecord[] }) {
  const { decisions, accept, undo, override, isOverridden } = useDecisions()
  const { addRuleFromOverride } = useLearnedRules()

  /* Override classification: tracks groups where user flipped which doc is "Original" */
  const [flippedGroups, setFlippedGroups] = useState<Set<string>>(new Set())

  const [showAutoMatched, setShowAutoMatched] = useState(true)
  const groups = useMemo(() => groupByFormCategory(data, decisions, showAutoMatched), [data, decisions, showAutoMatched])

  /* 3-panel collapse/expand: AI Analysis + Field Comparison open by default */
  const [expandedPanels, setExpandedPanels] = useState<Set<PanelId>>(
    () => new Set<PanelId>(['aiAnalysis', 'fieldComparison'])
  )
  const togglePanel = useCallback((panel: PanelId) => {
    setExpandedPanels(prev => {
      if (prev.has(panel)) {
        const next = new Set(prev)
        next.delete(panel)
        return next
      }
      if (panel === 'documents') {
        return new Set<PanelId>(['documents'])
      }
      const next = new Set(prev)
      next.add(panel)
      next.delete('documents')
      return next
    })
  }, [])
  const isDocExpanded = expandedPanels.has('documents')

  /* Sidebar accordions */
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

  /* Check if entire group is accepted (matched by user) */
  const allGroupAccepted = activeGroup
    ? activeGroup.records.every(r => decisions[getItemKey(r)] === 'accepted')
    : false

  /* Accept all in group => Match */
  const handleAcceptGroup = () => {
    if (!activeGroup) return
    for (const r of activeGroup.records) {
      const key = getItemKey(r)
      if (decisions[key] !== 'accepted') {
        accept(key, 'duplicate', r.confidenceLevel, 'manual')
      }
    }
  }

  /* Undo group */
  const handleUndoGroup = () => {
    if (!activeGroup) return
    for (const r of activeGroup.records) {
      undo(getItemKey(r), 'duplicate', r.confidenceLevel)
    }
  }

  /* Override handler: flip which doc is Original vs Duplicate for active group.
     Only 1 document is Original; the override swaps A <-> B classification. */
  const handleOverrideGroup = () => {
    if (!activeGroup) return
    const isAlreadyFlipped = flippedGroups.has(activeGroup.formType)

    setFlippedGroups(prev => {
      const next = new Set(prev)
      if (isAlreadyFlipped) next.delete(activeGroup.formType)
      else next.add(activeGroup.formType)
      return next
    })

    for (const r of activeGroup.records) {
      const key = getItemKey(r)
      const originalDecision = getDecisionLabel(r)
      const newDecision = originalDecision.includes('Not') ? 'Duplicate' : 'NotDuplicate'
      const detail: OverrideDetail = {
        originalAIDecision: `${getRecordLabel(r)} = ${originalDecision}`,
        userOverrideDecision: `${getRecordLabel(r)} = ${newDecision}`,
        overrideReason: null,
        formType: r.documentRefA?.formType ?? 'Unknown',
        fieldContext: r.comparedValues ?? [],
      }
      override(key, 'duplicate', r.confidenceLevel, detail)
    }
  }

  const isGroupFlipped = !!(activeGroup && flippedGroups.has(activeGroup.formType))

  /* Field comparison data for the active group */
  const comparedValues = useMemo(() => {
    if (!activeGroup) return []
    const all = activeGroup.records.flatMap(r => r.comparedValues ?? [])
    return all.filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)
  }, [activeGroup])

  /* Left/right docs for document viewer */
  const firstRecord = activeGroup?.records[0] ?? null

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
            Duplicate Document Review
          </h2>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            inlineSize: '1.375rem', blockSize: '1.375rem', borderRadius: '50%',
            backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)',
            fontSize: '0.6875rem', fontWeight: 700,
          }}>
            {data.length}
          </span>

          {/* Auto-match toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            marginInlineStart: '0.75rem',
            fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.45 0.01 260)',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={showAutoMatched}
              onChange={() => setShowAutoMatched(p => !p)}
              style={{ accentColor: 'oklch(0.45 0.18 145)' }}
            />
            Auto-match &ge;90%
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Override / Flip button */}
          <button
            type="button"
            onClick={handleOverrideGroup}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              border: '0.0625rem solid oklch(0.82 0.08 60)',
              borderRadius: '0.25rem',
              backgroundColor: isGroupFlipped ? 'oklch(0.96 0.04 60)' : 'oklch(1 0 0)',
              fontSize: '0.75rem', fontWeight: 600,
              color: 'oklch(0.45 0.12 60)',
              cursor: 'pointer',
            }}
          >
            <FlipHorizontal style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
            {isGroupFlipped ? 'Undo Override' : 'Override Classification'}
          </button>

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
              Unmatch Group
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
              <Link2 style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Match All
            </button>
          )}
        </div>
      </header>

      {/* ── Main 2-column layout ── */}
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
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
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
              <p>Review potential duplicate pairs grouped by form type. High-confidence pairs (&ge;90%) are auto-matched. Click a group to see AI analysis, field comparison, and source documents.</p>
            </div>
          </details>

          {/* Scrollable group list */}
          <div style={{ flex: '1 1 auto', overflowY: 'auto' }}>
            {groups.map((group, gIdx) => {
              const isExpanded = expandedGroups.has(group.formType)
              const isActiveGroup = gIdx === selectedGroupIdx
              const groupAllAccepted = group.records.every(r => decisions[getItemKey(r)] === 'accepted')
              const avgConfidence = Math.round(group.averageConfidence * 100)
              const confColor = avgConfidence >= 90
                ? 'oklch(0.55 0.17 145)'
                : avgConfidence >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'

              return (
                <div key={group.formType} style={{
                  borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                  backgroundColor: isActiveGroup ? 'oklch(0.97 0.01 240 / 0.4)' : 'transparent',
                }}>
                  {/* Group header */}
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
                      type="checkbox" checked={groupAllAccepted} readOnly
                      aria-label={`${group.formType} group matched`}
                      style={{ inlineSize: '0.875rem', blockSize: '0.875rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0, marginBlockStart: '0.0625rem' }}
                    />
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
                        }}>
                          {avgConfidence}%
                        </span>
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)' }}>
                          {group.records.length} {group.records.length === 1 ? 'pair' : 'pairs'}
                        </span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.125rem',
                          fontSize: '0.5625rem', fontWeight: 600,
                          padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                          backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.4 0.14 145)',
                        }}>
                          {group.matchedRecords.length} matched
                        </span>
                        {group.unmatchedRecords.length > 0 && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.125rem',
                            fontSize: '0.5625rem', fontWeight: 600,
                            padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                            backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.14 25)',
                          }}>
                            {group.unmatchedRecords.length} unmatched
                          </span>
                        )}
                        {group.needsReview && (
                          <AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.6 0.18 60)' }} />
                        )}
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                      : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                    }
                  </button>

                  {/* Expanded: record items */}
                  {isExpanded && (
                    <div style={{ paddingInlineStart: '0.1875rem' }}>
                      {group.records.map((r) => {
                        const recordKey = getItemKey(r)
                        const isAccepted = decisions[recordKey] === 'accepted'
                        const isMatched = isRecordMatched(r, recordKey, decisions, showAutoMatched)
                        const decision = getDecisionLabel(r)
                        const isGroupOverridden = flippedGroups.has(group.formType)
                        const rawDuplicate = decision === 'DuplicateData' || decision === 'Duplicate'
                        const isDuplicate = isGroupOverridden ? !rawDuplicate : rawDuplicate
                        return (
                          <button
                            key={recordKey}
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
                              type="checkbox" checked={isAccepted || isMatched} readOnly
                              aria-label={`${getRecordLabel(r)} matched`}
                              style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }}
                            />
                            <FileText style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'oklch(0.25 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {getRecordLabel(r)}
                            </span>
                            <span style={{
                              marginInlineStart: 'auto', flexShrink: 0,
                              fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                              padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                              backgroundColor: isDuplicate ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 145)',
                              color: isDuplicate ? 'oklch(0.45 0.18 25)' : 'oklch(0.35 0.14 145)',
                            }}>
                              {isDuplicate ? 'Dup' : 'Not Dup'}
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

          {/* Next Step */}
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

        {/* ── RIGHT: 3 collapsible panels ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

          {/* ═══ PANEL 1: AI Analysis ═══ */}
          {(() => {
            const firstRec = activeGroup?.records[0]
            const groupCompared = comparedValues
            const avgConf = activeGroup
              ? Math.round(activeGroup.averageConfidence * 100)
              : 0
            const confColor = avgConf >= 90 ? 'oklch(0.55 0.17 145)' : avgConf >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'
            const mismatches = groupCompared.filter(v => !v.match)
            const matchType = firstRec?.itemType === 'DUPLICATE_DATA' ? (firstRec as DuplicateDataRecord).matchType : null

            return (
              <div style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                <button
                  type="button"
                  onClick={() => togglePanel('aiAnalysis')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    inlineSize: '100%', padding: '0.5rem 0.75rem',
                    border: 'none', cursor: 'pointer', textAlign: 'start',
                    fontSize: '0.75rem', fontWeight: 700,
                    color: 'var(--ai-accent)',
                    backgroundColor: 'oklch(0.97 0.005 240)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}
                >
                  {expandedPanels.has('aiAnalysis')
                    ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                    : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                  }
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
                  {firstRec?.reviewRequired && (
                    <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)' }} />
                  )}
                  {matchType && (
                    <span style={{
                      fontSize: '0.5625rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                      padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                      backgroundColor: 'oklch(0.93 0.005 260)', color: 'oklch(0.45 0.01 260)',
                    }}>
                      {matchType}
                    </span>
                  )}
                </button>

                {expandedPanels.has('aiAnalysis') && firstRec && (
                  <div style={{
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'oklch(0.98 0.003 240)',
                  }}>
                    {/* Ruleset / Decision rule */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      marginBlockEnd: '0.5rem',
                    }}>
                      <span style={{
                        fontSize: '0.625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                        padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
                        backgroundColor: 'oklch(0.93 0.005 260)', color: 'oklch(0.4 0.01 260)',
                      }}>
                        {firstRec.appliedRuleSet} / {firstRec.decisionRule}
                      </span>
                      <span style={{
                        fontSize: '0.625rem', fontWeight: 700,
                        padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
                        backgroundColor: getDecisionLabel(firstRec).includes('Not') ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                        color: getDecisionLabel(firstRec).includes('Not') ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.14 25)',
                      }}>
                        {getDecisionLabel(firstRec)}
                      </span>
                    </div>

                    {/* Decision reasons as bullet list */}
                    <ul style={{
                      margin: 0, paddingInlineStart: '1.25rem',
                      display: 'flex', flexDirection: 'column', gap: '0.375rem',
                      listStyleType: 'disc',
                    }}>
                      {firstRec.decisionReason
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
                      {firstRec.escalationReason && (
                        <li style={{ fontSize: '0.75rem', lineHeight: '1.5', color: 'oklch(0.45 0.16 60)' }}>
                          <strong style={{ color: 'oklch(0.5 0.16 60)' }}>Escalation:</strong>{' '}
                          {firstRec.escalationReason}
                        </li>
                      )}
                      {mismatches.length > 0 && (
                        <li style={{ fontSize: '0.75rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>
                          <strong style={{ color: 'oklch(0.45 0.12 25)' }}>AI-Flagged Fields ({mismatches.length}):</strong>
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
                )}
              </div>
            )
          })()}

          {/* ═══ PANEL 2: Field Comparison ═══ */}
          {comparedValues.length > 0 && (
            <div style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
              <button
                type="button"
                onClick={() => togglePanel('fieldComparison')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  inlineSize: '100%', padding: '0.5rem 0.75rem',
                  border: 'none', cursor: 'pointer', textAlign: 'start',
                  fontSize: '0.75rem', fontWeight: 700,
                  color: 'oklch(0.35 0.01 260)',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}
              >
                {expandedPanels.has('fieldComparison')
                  ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                  : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                }
                <Columns2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.45 0.12 240)' }} />
                Field Comparison
                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)', textTransform: 'none', letterSpacing: 'normal' }}>
                  {comparedValues.filter(v => !v.match).length} of {comparedValues.length} differ
                </span>
              </button>

              {expandedPanels.has('fieldComparison') && (
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'oklch(0.99 0.002 260)' }}>
                  <FieldComparison
                    values={comparedValues}
                    labelA={firstRecord?.documentRefA?.formLabel ?? 'Document A'}
                    labelB={firstRecord?.documentRefB?.formLabel ?? 'Document B'}
                    docRefA={firstRecord?.documentRefA}
                    docRefB={firstRecord?.documentRefB}
                    isOverridden={isGroupFlipped}
                  />
                </div>
              )}
            </div>
          )}

          {/* ═══ PANEL 3: Document Viewer ═══ */}
          <div style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
            <button
              type="button"
              onClick={() => togglePanel('documents')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                inlineSize: '100%', padding: '0.5rem 0.75rem',
                border: 'none', cursor: 'pointer', textAlign: 'start',
                fontSize: '0.75rem', fontWeight: 700,
                color: 'oklch(0.3 0.01 260)',
                backgroundColor: 'oklch(0.96 0.005 260)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}
            >
              {isDocExpanded
                ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
              }
              <Eye style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.45 0.12 240)' }} />
              Document Viewer
              {!isDocExpanded && (
                <span style={{ fontSize: '0.625rem', fontWeight: 500, color: 'oklch(0.5 0.01 260)', textTransform: 'none', letterSpacing: 'normal' }}>
                  -- Click to expand full view
                </span>
              )}
              {isDocExpanded && (
                <span style={{
                  marginInlineStart: 'auto',
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  fontSize: '0.625rem', fontWeight: 500, color: 'oklch(0.5 0.01 260)',
                  textTransform: 'none', letterSpacing: 'normal',
                }}>
                  <Minimize2 style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                  Collapse to thumbnails
                </span>
              )}
            </button>

            {/* Compact chips (collapsed) */}
            {!isDocExpanded && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => togglePanel('documents')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePanel('documents') }}
                style={{
                  display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem',
                  cursor: 'pointer', backgroundColor: 'oklch(0.98 0.003 260)',
                }}
                aria-label="Click to expand document viewer"
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  flex: '1 1 0', padding: '0.375rem 0.5rem',
                  borderRadius: '0.25rem',
                  border: '0.0625rem solid oklch(0.88 0.01 260)',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                }}>
                  <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', flexShrink: 0, color: 'oklch(0.45 0.01 260)' }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {firstRecord?.documentRefA?.formLabel ?? 'Document A'}
                  </span>
                  <span style={{
                    marginInlineStart: 'auto', flexShrink: 0,
                    fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase',
                    padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem',
                    backgroundColor: isGroupFlipped ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                    color: isGroupFlipped ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                  }}>
                    {isGroupFlipped ? 'Original' : 'Duplicate'}
                  </span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  flex: '1 1 0', padding: '0.375rem 0.5rem',
                  borderRadius: '0.25rem',
                  border: '0.0625rem solid oklch(0.88 0.01 260)',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                }}>
                  <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', flexShrink: 0, color: 'oklch(0.45 0.01 260)' }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {firstRecord?.documentRefB?.formLabel ?? 'Document B'}
                  </span>
                  <span style={{
                    marginInlineStart: 'auto', flexShrink: 0,
                    fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase',
                    padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem',
                    backgroundColor: isGroupFlipped ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 145)',
                    color: isGroupFlipped ? 'oklch(0.45 0.18 25)' : 'oklch(0.35 0.14 145)',
                  }}>
                    {isGroupFlipped ? 'Duplicate' : 'Original'}
                  </span>
                </div>
              </div>
            )}

            {/* Full document viewer (expanded) */}
            {isDocExpanded && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                minBlockSize: '32rem',
              }}>
                {/* Left PDF -- Doc A */}
                <div style={{ overflow: 'auto', padding: '0.5rem' }}>
                  <div style={{
                    textAlign: 'center', padding: '0.25rem',
                    fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                    backgroundColor: isGroupFlipped ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                    color: isGroupFlipped ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                    borderRadius: '0.1875rem 0.1875rem 0 0',
                  }}>
                    {isGroupFlipped ? 'Original' : 'Duplicate'}
                  </div>
                  {firstRecord?.documentRefA ? (
                    <PdfPageViewer
                      documentRef={firstRecord.documentRefA}
                      stamp={isGroupFlipped ? 'ORIGINAL' : 'SUPERSEDED'}
                      height="30rem"
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.55 0.01 260)', fontSize: '0.8125rem' }}>
                      No document available
                    </div>
                  )}
                </div>

                {/* Center toolbar */}
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

                {/* Right PDF -- Doc B */}
                <div style={{ overflow: 'auto', padding: '0.5rem' }}>
                  <div style={{
                    textAlign: 'center', padding: '0.25rem',
                    fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                    backgroundColor: isGroupFlipped ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 145)',
                    color: isGroupFlipped ? 'oklch(0.45 0.18 25)' : 'oklch(0.35 0.14 145)',
                    borderRadius: '0.1875rem 0.1875rem 0 0',
                  }}>
                    {isGroupFlipped ? 'Duplicate' : 'Original'}
                  </div>
                  {firstRecord?.documentRefB ? (
                    <PdfPageViewer
                      documentRef={firstRecord.documentRefB}
                      stamp={isGroupFlipped ? 'SUPERSEDED' : 'ORIGINAL'}
                      height="30rem"
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.55 0.01 260)', fontSize: '0.8125rem' }}>
                      No document available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
