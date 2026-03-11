'use client'

/**
 * DESIGN VARIANT E: "Document Comparison"
 * Production-style split view with left sidebar document tree,
 * two side-by-side PDF viewers, and a vertical toolbar between them.
 * Matches the existing Superseded UI pattern from the production app.
 */

import { useState, useMemo, useCallback } from 'react'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { FieldComparison } from '@/components/field-comparison'
import { useDecisions } from '@/contexts/decision-context'
import { useLearnedRules } from '@/contexts/learned-rules-context'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
  Check,
  Undo2,
  AlertTriangle,
  ArrowRight,
  ArrowLeftRight,
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
import type { SupersededRecord, OverrideDetail } from '@/lib/types'

/* ── Panel visibility state ── */
type PanelId = 'documents' | 'aiAnalysis' | 'fieldComparison'

/* ── Predefined override reasons based on Superseded Decision Spec ── */
const OVERRIDE_REASONS = [
  { id: 'corrected', label: 'Corrected form detected - should be retained', rule: 'A9' },
  { id: 'more-data', label: 'More complete data exists on this document', rule: 'A7' },
] as const

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
  const { decisions, overrides, accept, undo, override, isOverridden } = useDecisions()
  const { addRuleFromOverride } = useLearnedRules()
  const groups = useMemo(() => groupByFormType(data), [data])

  /* Track local flipped labels per group (key = formType) */
  const [flippedGroups, setFlippedGroups] = useState<Set<string>>(new Set())
  
  /* Override panel state - two-step flow */
  const [showOverridePanel, setShowOverridePanel] = useState(false)
  const [overrideStep, setOverrideStep] = useState<'select' | 'reason'>('select')
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null) // which doc to mark as Original
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')

  /* 3-panel collapse/expand state: documents starts collapsed (thumbnails), others expanded */
  const [expandedPanels, setExpandedPanels] = useState<Set<PanelId>>(
    () => new Set<PanelId>(['aiAnalysis', 'fieldComparison'])
  )
  const togglePanel = useCallback((panel: PanelId) => {
    setExpandedPanels(prev => {
      if (prev.has(panel)) {
        /* Collapsing this panel -- just remove it */
        const next = new Set(prev)
        next.delete(panel)
        return next
      }
      /* Expanding: if Document Viewer is being opened, collapse the others.
         If AI Analysis or Field Comparison is opened, collapse Document Viewer
         but keep the other analysis panel open. */
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
    const isFlipped = flippedGroups.has(activeGroup.formType)

    for (const r of activeGroup.records) {
      const key = `sup-pg${r.engagementPageId}`
      if (decisions[key] !== 'accepted') {
        accept(key, 'superseded', r.confidenceLevel, 'manual')
      }
    }

    // If this group was overridden, feed the override into the learned rules pipeline
    if (isFlipped) {
      const supRecord = activeGroup.records.find(rec => rec.decisionType === 'Superseded')
      if (supRecord) {
        // Get the stored override reason from the override detail
        const key = `sup-pg${supRecord.engagementPageId}`
        const storedOverride = overrides[key]
        const detail: OverrideDetail = {
          originalAIDecision: `Page ${supRecord.engagementPageId} = ${supRecord.decisionType}`,
          userOverrideDecision: `Page ${supRecord.engagementPageId} = ${supRecord.decisionType === 'Superseded' ? 'Original' : 'Superseded'}`,
          overrideReason: storedOverride?.detail?.overrideReason ?? null,
          formType: supRecord.documentRef?.formType ?? activeGroup.formType,
          fieldContext: supRecord.comparedValues ?? [],
        }
        addRuleFromOverride(detail, 'superseded')
      }
    }
  }

  const handleUndoGroup = () => {
    if (!activeGroup) return
    for (const r of activeGroup.records) {
      undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
    }
  }

  /* ── Override handler: flip Superseded <-> Original for active group ── */
  const handleOverrideGroup = (reason: string | null) => {
  if (!activeGroup) return
  const isAlreadyFlipped = flippedGroups.has(activeGroup.formType)
  
  // Get the reason text
  const reasonText = reason 
    ? OVERRIDE_REASONS.find(r => r.id === reason)?.label ?? reason 
    : customReason || 'User override (no reason provided)'
  
  // Toggle the flip state
  setFlippedGroups(prev => {
  const next = new Set(prev)
  if (isAlreadyFlipped) next.delete(activeGroup.formType)
  else next.add(activeGroup.formType)
  return next
  })
  
  // Log override for each record in the group
  for (const r of activeGroup.records) {
  const key = `sup-pg${r.engagementPageId}`
  const originalDecision = r.decisionType
      const newDecision = originalDecision === 'Superseded' ? 'Original' : 'Superseded'
  const detail: OverrideDetail = {
  originalAIDecision: `Page ${r.engagementPageId} = ${originalDecision}`,
  userOverrideDecision: `Page ${r.engagementPageId} = ${newDecision}`,
  overrideReason: reasonText,
  formType: r.documentRef?.formType ?? 'Unknown',
  fieldContext: r.comparedValues ?? [],
  }
  override(key, 'superseded', r.confidenceLevel, detail)
    }
    
    // Reset state
    setShowOverridePanel(false)
    setOverrideStep('select')
    setSelectedDocument(null)
    setSelectedReason(null)
    setCustomReason('')
  }
  
  const handleUndoOverride = () => {
    if (!activeGroup) return
    setFlippedGroups(prev => {
      const next = new Set(prev)
      next.delete(activeGroup.formType)
      return next
    })
    setShowOverridePanel(false)
    setOverrideStep('select')
    setSelectedDocument(null)
    setSelectedReason(null)
    setCustomReason('')
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
          {/* Override Classification Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                if (!showOverridePanel) {
                  // Reset to step 1 when opening
                  setOverrideStep('select')
                  setSelectedDocument(null)
                  setSelectedReason(null)
                  setCustomReason('')
                }
                setShowOverridePanel(p => !p)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                border: '0.0625rem solid oklch(0.82 0.08 60)',
                borderRadius: '0.25rem',
                backgroundColor: activeGroup && flippedGroups.has(activeGroup.formType)
                  ? 'oklch(0.96 0.04 60)'
                  : 'oklch(1 0 0)',
                fontSize: '0.75rem', fontWeight: 600,
                color: 'oklch(0.5 0.16 60)',
                cursor: 'pointer',
              }}
              aria-expanded={showOverridePanel}
            >
              <ArrowLeftRight style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              {activeGroup && flippedGroups.has(activeGroup.formType) ? 'Override Active' : 'Override Classification'}
              <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
            </button>
            
            {/* Override Panel Popover - Two Step Flow */}
            {showOverridePanel && (
              <>
                {/* Backdrop to close on outside click */}
                <div
                  onClick={() => { setShowOverridePanel(false); setOverrideStep('select'); }}
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                  aria-hidden="true"
                />
                <div style={{
                  position: 'absolute', insetBlockStart: '100%', insetInlineEnd: 0,
                  marginBlockStart: '0.25rem', zIndex: 50,
                  inlineSize: 'max-content', minInlineSize: '20rem',
                  padding: '0.75rem', borderRadius: '0.375rem',
                  border: '0.0625rem solid oklch(0.88 0.01 260)',
                  backgroundColor: 'oklch(1 0 0)',
                  boxShadow: '0 0.25rem 0.75rem oklch(0 0 0 / 0.12)',
                }}>
                  
                  {/* STEP 1: Select Document */}
                  {overrideStep === 'select' && (
                    <>
                      <p style={{
                        fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.35 0.01 260)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        marginBlockEnd: '0.5rem',
                      }}>
                        Select the Original Document
                      </p>
                      <p style={{
                        fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)',
                        marginBlockEnd: '0.75rem', lineHeight: '1.4',
                      }}>
                        Only 1 document can be Original. All others will be marked as Superseded.
                      </p>

                      {/* Document options from active group */}
                      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                        <legend className="sr-only">Select original document</legend>
                        {activeGroup?.records.map((record) => {
                          const isAIPick = record.decisionType === 'Original'
                          const docLabel = `${record.documentRef?.formType ?? 'Document'} (Page ${record.engagementPageId})`
                          return (
                            <label
                              key={record.engagementPageId}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                backgroundColor: selectedDocument === String(record.engagementPageId) 
                                  ? 'oklch(0.95 0.04 145)' 
                                  : 'transparent',
                              }}
                            >
                              <input
                                type="radio"
                                name="select-document"
                                checked={selectedDocument === String(record.engagementPageId)}
                                onChange={() => setSelectedDocument(String(record.engagementPageId))}
                                style={{ accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }}
                              />
                              <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0.01 260)' }} />
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)', flex: 1 }}>
                                {docLabel}
                              </span>
                              {isAIPick && (
                                <span style={{
                                  fontSize: '0.5625rem', fontWeight: 700,
                                  padding: '0.125rem 0.375rem',
                                  borderRadius: '0.1875rem',
                                  backgroundColor: 'oklch(0.95 0.04 145)',
                                  color: 'oklch(0.45 0.18 145)',
                                }}>
                                  AI PICK
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </fieldset>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginBlockStart: '0.75rem' }}>
                        {activeGroup && flippedGroups.has(activeGroup.formType) ? (
                          <button
                            type="button"
                            onClick={handleUndoOverride}
                            style={{
                              flex: 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                              padding: '0.375rem 0.5rem',
                              border: '0.0625rem solid oklch(0.88 0.01 260)',
                              borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)',
                              fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.45 0.01 260)',
                              cursor: 'pointer',
                            }}
                          >
                            <Undo2 style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                            Undo Override
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setOverrideStep('reason')}
                            disabled={!selectedDocument}
                            style={{
                              flex: 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                              padding: '0.375rem 0.5rem',
                              border: 'none',
                              borderRadius: '0.25rem',
                              backgroundColor: !selectedDocument ? 'oklch(0.9 0.01 260)' : 'oklch(0.45 0.18 145)',
                              fontSize: '0.6875rem', fontWeight: 600,
                              color: !selectedDocument ? 'oklch(0.6 0.01 260)' : 'oklch(1 0 0)',
                              cursor: !selectedDocument ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Continue
                            <ChevronRight style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* STEP 2: Provide Reason */}
                  {overrideStep === 'reason' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBlockEnd: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setOverrideStep('select')}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0.25rem',
                            border: 'none', borderRadius: '0.25rem',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                          }}
                          aria-label="Go back"
                        >
                          <ChevronLeft style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                        </button>
                        <p style={{
                          fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.35 0.01 260)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          Why are you overriding?
                        </p>
                      </div>
                      <p style={{
                        fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)',
                        marginBlockEnd: '0.75rem', lineHeight: '1.4',
                      }}>
                        Help us improve AI accuracy by sharing why this override was needed.
                      </p>

                      {/* Predefined reasons */}
                      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                        <legend className="sr-only">Select override reason</legend>
                        {OVERRIDE_REASONS.map(reason => (
                          <label
                            key={reason.id}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              backgroundColor: selectedReason === reason.id ? 'oklch(0.95 0.04 145)' : 'transparent',
                            }}
                          >
                            <input
                              type="radio"
                              name="override-reason"
                              checked={selectedReason === reason.id}
                              onChange={() => { setSelectedReason(reason.id); setCustomReason(''); }}
                              style={{ accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0, marginTop: '0.125rem' }}
                            />
                            <div>
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)', display: 'block' }}>
                                {reason.label}
                              </span>
                              <span style={{ fontSize: '0.5625rem', color: 'oklch(0.5 0.01 260)' }}>
                                Rule: {reason.rule}
                              </span>
                            </div>
                          </label>
                        ))}
                        
                        {/* Custom reason option */}
                        <label
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            backgroundColor: selectedReason === 'custom' ? 'oklch(0.95 0.04 145)' : 'transparent',
                          }}
                        >
                          <input
                            type="radio"
                            name="override-reason"
                            checked={selectedReason === 'custom'}
                            onChange={() => setSelectedReason('custom')}
                            style={{ accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0, marginTop: '0.125rem' }}
                          />
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                            Other (specify below)
                          </span>
                        </label>
                        
                        {/* Custom text input */}
                        {selectedReason === 'custom' && (
                          <textarea
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="Enter your reason for overriding..."
                            style={{
                              marginBlockStart: '0.5rem',
                              inlineSize: '100%',
                              minBlockSize: '3.5rem',
                              padding: '0.5rem',
                              border: '0.0625rem solid oklch(0.88 0.01 260)',
                              borderRadius: '0.25rem',
                              fontSize: '0.6875rem',
                              resize: 'vertical',
                            }}
                          />
                        )}
                      </fieldset>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginBlockStart: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOverrideGroup(selectedReason)}
                          disabled={!selectedReason && !customReason}
                          style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                            padding: '0.375rem 0.5rem',
                            border: 'none',
                            borderRadius: '0.25rem',
                            backgroundColor: (!selectedReason && !customReason) ? 'oklch(0.9 0.01 260)' : 'oklch(0.45 0.18 145)',
                            fontSize: '0.6875rem', fontWeight: 600,
                            color: (!selectedReason && !customReason) ? 'oklch(0.6 0.01 260)' : 'oklch(1 0 0)',
                            cursor: (!selectedReason && !customReason) ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Check style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                          Apply Override
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

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
              const avgConfidence = group.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / group.records.length
              const avgConfPct = Math.round(avgConfidence * 100)
              const confColor = avgConfPct >= 90
                ? 'oklch(0.55 0.17 145)'
                : avgConfPct >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'
              const actionLabel = avgConfPct >= 90 ? 'High' : avgConfPct >= 70 ? 'Moderate' : 'Low'
              const actionTooltip = avgConfPct >= 90 
                ? 'AI is confident. Reviewer can approve quickly.' 
                : avgConfPct >= 70 
                  ? 'AI has moderate confidence. Reviewer should verify key fields.' 
                  : 'AI is uncertain. Reviewer must examine carefully.'
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
                        <span 
                          style={{
                            fontSize: '0.625rem', fontWeight: 700,
                            padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                            backgroundColor: `${confColor} / 0.12`, color: confColor,
                          }}
                          title={actionTooltip}
                        >
                          {actionLabel}
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
                        const recordKey = `sup-pg${r.engagementPageId}`
                        const isAccepted = decisions[recordKey] === 'accepted'
                        const isFlipped = flippedGroups.has(group.formType)
                        const isSup = isFlipped
                          ? r.decisionType !== 'Superseded'
                          : r.decisionType === 'Superseded'
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

        {/* ── RIGHT: 3 independently collapsible panels ── */}
        {/* Order: AI Analysis (top) > Field Comparison > Document Viewer (bottom) */}
        {/* Strategy: AI-first layout builds user trust in AI over time */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

          {/* ═══════════════════════════════════════════════════════════
              PANEL 1: AI Analysis (collapsible) -- PRIMARY
              ═══════════════════════════════════════════════════════════ */}
          {(() => {
            const groupSuperseded = activeGroup?.records.find(r => r.decisionType === 'Superseded')
            const groupOriginal = activeGroup?.records.find(r => r.decisionType === 'Original')
            const groupCompared = (activeGroup?.records ?? []).flatMap(r => r.comparedValues ?? [])
              .filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)
            const avgConfRaw = activeGroup
              ? activeGroup.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / activeGroup.records.length
              : 0
            const avgConf = Math.round(avgConfRaw * 100)
            const confColor = avgConf >= 90 ? 'oklch(0.55 0.17 145)' : avgConf >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'
            const panelActionLabel = avgConf >= 90 ? 'High Confidence' : avgConf >= 70 ? 'Moderate Confidence' : 'Low Confidence'
            const panelTooltip = avgConf >= 90 
              ? 'AI is confident. Reviewer can approve quickly.' 
              : avgConf >= 70 
                ? 'AI has moderate confidence. Reviewer should verify key fields.' 
                : 'AI is uncertain. Reviewer must examine carefully.'
            const mismatches = groupCompared.filter(v => !v.match)
            const isGroupOverridden = activeGroup ? flippedGroups.has(activeGroup.formType) : false

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
                    color: isGroupOverridden ? 'oklch(0.5 0.16 60)' : 'var(--ai-accent)',
                    backgroundColor: isGroupOverridden ? 'oklch(0.97 0.04 60)' : 'oklch(0.97 0.005 240)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}
                >
                  {expandedPanels.has('aiAnalysis')
                    ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                    : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                  }
                  <Sparkles style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                  AI Analysis
                  {isGroupOverridden ? (
                    <span style={{
                      fontSize: '0.625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                      padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                      backgroundColor: 'oklch(0.92 0.06 60)', color: 'oklch(0.45 0.16 60)',
                      marginInlineStart: '0.25rem',
                    }}>
                      Manual Override
                    </span>
                  ) : (
                    <span 
                      style={{
                        fontSize: '0.625rem', fontWeight: 700,
                        padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                        backgroundColor: `${confColor} / 0.12`, color: confColor,
                        marginInlineStart: '0.25rem',
                      }}
                      title={panelTooltip}
                    >
                      {panelActionLabel}
                    </span>
                  )}
                  {groupSuperseded?.reviewRequired && (
                    <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)' }} />
                  )}
                </button>

                {expandedPanels.has('aiAnalysis') && (
                  <div style={{
                    padding: '0.625rem 0.75rem',
                    backgroundColor: isGroupOverridden ? 'oklch(0.98 0.02 60)' : 'oklch(0.98 0.003 240)',
                  }}>
                    {/* Amber warning banner when overridden */}
                    {isGroupOverridden && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '0.25rem',
                        padding: '0.5rem 0.625rem',
                        marginBlockEnd: '0.625rem',
                        borderRadius: '0.25rem',
                        border: '0.0625rem solid oklch(0.82 0.08 60)',
                        backgroundColor: 'oklch(0.96 0.04 60)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <AlertTriangle style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.55 0.16 60)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.4 0.14 60)' }}>
                            User has reversed this classification
                          </span>
                        </div>
                        <div style={{ paddingInlineStart: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                          <p style={{ fontSize: '0.6875rem', color: 'oklch(0.4 0.1 60)', margin: 0 }}>
                            <strong>AI recommended:</strong>{' '}
                            Page {groupSuperseded?.engagementPageId} = Superseded, Page {groupOriginal?.engagementPageId} = Original
                          </p>
                          <p style={{ fontSize: '0.6875rem', color: 'oklch(0.4 0.1 60)', margin: 0 }}>
                            <strong>User changed to:</strong>{' '}
                            Page {groupSuperseded?.engagementPageId} = Original, Page {groupOriginal?.engagementPageId} = Superseded
                          </p>
                        </div>
                      </div>
                    )}

                    <ul style={{
                      margin: 0, paddingInlineStart: '1.25rem',
                      display: 'flex', flexDirection: 'column', gap: '0.375rem',
                      listStyleType: 'disc',
                      opacity: showOverridePanel ? 0.5 : 1,
                      transition: 'opacity 0.2s ease',
                    }}>
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
                      {groupSuperseded?.escalationReason && (
                        <li style={{ fontSize: '0.75rem', lineHeight: '1.5', color: 'oklch(0.45 0.16 60)' }}>
                          <strong style={{ color: 'oklch(0.5 0.16 60)' }}>Escalation:</strong>{' '}
                          {groupSuperseded.escalationReason}
                        </li>
                      )}

                    </ul>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ═══════════════════════════════════════════════════════════
              PANEL 2: Field Comparison (collapsible)
              ═══════════════════════════════════════════════════════════ */}
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
                    labelA={leftDoc?.documentRef?.formLabel ?? 'Superseded'}
                    labelB={rightDoc?.documentRef?.formLabel ?? 'Original'}
                    docRefA={leftDoc?.documentRef}
                    docRefB={rightDoc?.documentRef}
                    isOverridden={!!(activeGroup && flippedGroups.has(activeGroup.formType))}
                  />
                </div>
              )}
            </div>
          )}

          {/* ═════════���═════════════════════════════════════════════════
              PANEL 3: Document Viewer (bottom -- collapsible thumbnails/full)
              Future: removable once users trust AI Analysis
              ═══════════════════════════════════════════════════════════ */}
          <div style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
            {/* Panel header */}
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

            {/* Compact document chips (shown when collapsed -- no preview) */}
            {!isDocExpanded && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => togglePanel('documents')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePanel('documents') }}
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  backgroundColor: 'oklch(0.98 0.003 260)',
                }}
                aria-label="Click to expand document viewer"
              >
                {/* Left doc chip */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  flex: '1 1 0',
                  padding: '0.375rem 0.5rem',
                  borderRadius: '0.25rem',
                  border: '0.0625rem solid oklch(0.88 0.01 260)',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                }}>
                  <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', flexShrink: 0, color: 'oklch(0.45 0.01 260)' }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {leftDoc?.documentRef?.formLabel ?? 'Document A'}
                  </span>
                  <span style={{
                    marginInlineStart: 'auto', flexShrink: 0,
                    padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                    fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                    backgroundColor: activeGroup && flippedGroups.has(activeGroup.formType) ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                    color: activeGroup && flippedGroups.has(activeGroup.formType) ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                  }}>
                    {activeGroup && flippedGroups.has(activeGroup.formType) ? 'Original' : 'Superseded'}
                  </span>
                </div>

                {/* Right doc chip */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  flex: '1 1 0',
                  padding: '0.375rem 0.5rem',
                  borderRadius: '0.25rem',
                  border: '0.0625rem solid oklch(0.88 0.01 260)',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                }}>
                  <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', flexShrink: 0, color: 'oklch(0.45 0.01 260)' }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rightDoc?.documentRef?.formLabel ?? 'Document B'}
                  </span>
                  <span style={{
                    marginInlineStart: 'auto', flexShrink: 0,
                    padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                    fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                    backgroundColor: activeGroup && flippedGroups.has(activeGroup.formType) ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 145)',
                    color: activeGroup && flippedGroups.has(activeGroup.formType) ? 'oklch(0.45 0.18 25)' : 'oklch(0.35 0.14 145)',
                  }}>
                    {activeGroup && flippedGroups.has(activeGroup.formType) ? 'Superseded' : 'Original'}
                  </span>
                </div>
              </div>
            )}

            {/* Full document viewer (shown when expanded) */}
            {isDocExpanded && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                minBlockSize: '32rem',
              }}>
                {/* Left PDF viewer */}
                <div style={{ overflow: 'auto', padding: '0.5rem' }}>
                  {leftDoc?.documentRef ? (
                    <PdfPageViewer
                      documentRef={leftDoc.documentRef}
                      stamp={activeGroup && flippedGroups.has(activeGroup.formType) ? 'ORIGINAL' : 'SUPERSEDED'}
                      height="30rem"
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.55 0.01 260)', fontSize: '0.8125rem' }}>
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

                {/* Right PDF viewer */}
                <div style={{ overflow: 'auto', padding: '0.5rem' }}>
                  {rightDoc?.documentRef ? (
                    <PdfPageViewer
                      documentRef={rightDoc.documentRef}
                      stamp={activeGroup && flippedGroups.has(activeGroup.formType) ? 'SUPERSEDED' : 'ORIGINAL'}
                      height="30rem"
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'oklch(0.55 0.01 260)', fontSize: '0.8125rem' }}>
                      No original document
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
