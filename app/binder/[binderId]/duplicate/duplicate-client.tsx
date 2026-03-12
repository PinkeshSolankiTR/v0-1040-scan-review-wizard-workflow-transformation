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
  CheckCircle2,
  Undo2,
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
  RefreshCw,
  User,
  FileEdit,
  Info,
  Copy,
  FileCheck,
  X,
  AlertTriangle,
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

/* ── Unique document extraction ── */

interface UniqueDoc {
  id: string
  label: string
  pdfPath: string
  pageNumber: number
  formType: string
  /** true if AI originally classified this doc as Original (not duplicate) */
  aiOriginal: boolean
}

function getUniqueDocsInGroup(records: DuplicateRecord[]): UniqueDoc[] {
  /* Pass 1: collect all unique documents */
  const seen = new Map<string, Omit<UniqueDoc, 'aiOriginal'>>()
  /* Track how many times each doc appears on the "not duplicate" side */
  const originalVotes = new Map<string, number>()

  for (const r of records) {
    const decision = getDecisionLabel(r)
    const isDuplicate = decision === 'DuplicateData' || decision === 'Duplicate'
    if (r.documentRefA) {
      const id = r.documentRefA.formLabel ?? `doc-a-${r.documentRefA.pageNumber}`
      if (!seen.has(id)) {
        seen.set(id, {
          id,
          label: r.documentRefA.formLabel ?? 'Document A',
          pdfPath: r.documentRefA.pdfPath,
          pageNumber: r.documentRefA.pageNumber,
          formType: r.documentRefA.formType,
        })
      }
      /* Doc A is "not duplicate" when the record says NotDuplicate */
      if (!isDuplicate) originalVotes.set(id, (originalVotes.get(id) ?? 0) + 1)
    }
    if (r.documentRefB) {
      const id = r.documentRefB.formLabel ?? `doc-b-${r.documentRefB.pageNumber}`
      if (!seen.has(id)) {
        seen.set(id, {
          id,
          label: r.documentRefB.formLabel ?? 'Document B',
          pdfPath: r.documentRefB.pdfPath,
          pageNumber: r.documentRefB.pageNumber,
          formType: r.documentRefB.formType,
        })
      }
      /* Doc B is "not duplicate" when the record says Duplicate (B is the original copy) */
      if (isDuplicate) originalVotes.set(id, (originalVotes.get(id) ?? 0) + 1)
    }
  }

  /* Pass 2: exactly 1 original -- the doc with the most "original" votes, tie-break by first seen */
  let bestId: string | null = null
  let bestVotes = -1
  for (const [id] of seen) {
    const votes = originalVotes.get(id) ?? 0
    if (votes > bestVotes) {
      bestVotes = votes
      bestId = id
    }
  }
  /* Fallback: first doc if no votes at all */
  if (bestId === null) {
    const first = seen.keys().next()
    if (!first.done) bestId = first.value
  }

  return Array.from(seen.entries()).map(([id, doc]) => ({
    ...doc,
    aiOriginal: id === bestId,
  }))
}

function getAIOriginalId(docs: UniqueDoc[]): string | null {
  const original = docs.find(d => d.aiOriginal)
  return original?.id ?? docs[0]?.id ?? null
}

/* ── Predefined rejection reasons for Duplicate wizard ── */
const REJECTION_REASONS = [
  { id: 'not-duplicates', label: 'Not duplicates', description: 'These are distinct documents' },
  { id: 'different-years', label: 'Different tax years', description: 'Documents are from different filing periods' },
  { id: 'different-taxpayers', label: 'Different taxpayers', description: 'Documents belong to different people' },
  { id: 'intentional', label: 'Intentionally separate', description: 'Client needs both copies for valid reason' },
] as const

/* ── Main Component ── */

export function DuplicateClient({ data }: { data: DuplicateRecord[] }) {
  const { decisions, accept, undo, override, isOverridden } = useDecisions()
  const { addRuleFromOverride } = useLearnedRules()

  /* Override classification: maps formType -> docId the user selected as Original.
     If a group is NOT in this map, the AI-selected original applies. */
  const [overriddenOriginals, setOverriddenOriginals] = useState<Map<string, string>>(new Map())
  const [showOverridePanel, setShowOverridePanel] = useState(false)
  
  /* Rejection panel state */
  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [selectedRejectReason, setSelectedRejectReason] = useState<string | null>(null)
  const [customRejectReason, setCustomRejectReason] = useState('')
  const [rejectedGroups, setRejectedGroups] = useState<Map<string, { reason: string; detail: string }>>(new Map())

  const [showAutoMatched, setShowAutoMatched] = useState(true)
  const groups = useMemo(() => groupByFormCategory(data, decisions, showAutoMatched), [data, decisions, showAutoMatched])

  /* Per-document selection within a group */
  const [selectedDocId, setSelectedDocId] = useState<string | null>(() => {
    const firstGroup = groups[0]
    if (!firstGroup) return null
    const docs = getUniqueDocsInGroup(firstGroup.records)
    return docs[0]?.id ?? null
  })

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
        return new Set<PanelId>(['documents', 'fieldComparison'])
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
    /* Auto-select first doc in the group */
    const grp = groups[gIdx]
    if (grp) {
      const docs = getUniqueDocsInGroup(grp.records)
      if (docs.length > 0) setSelectedDocId(docs[0].id)
    }
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
    /* Auto-select first doc in the group if no doc was previously selected */
    const grp = groups[idx]
    if (grp) {
      const docs = getUniqueDocsInGroup(grp.records)
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id)
      }
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

  /* All unique docs in the active group + AI-selected original */
  const groupDocs = useMemo(
    () => (activeGroup ? getUniqueDocsInGroup(activeGroup.records) : []),
    [activeGroup]
  )
  const aiOriginalId = useMemo(() => getAIOriginalId(groupDocs), [groupDocs])

  /* Effective original = user override or AI default */
  const effectiveOriginalId = (activeGroup && overriddenOriginals.has(activeGroup.formType))
    ? overriddenOriginals.get(activeGroup.formType)!
    : aiOriginalId

  const isGroupOverridden = !!(activeGroup && overriddenOriginals.has(activeGroup.formType))

  /* Pick a different doc as Original */
  const handleSelectOriginal = (docId: string) => {
    if (!activeGroup) return

    /* If user selects the AI default again, remove the override */
    if (docId === aiOriginalId) {
      setOverriddenOriginals(prev => {
        const next = new Map(prev)
        next.delete(activeGroup.formType)
        return next
      })
    } else {
      setOverriddenOriginals(prev => {
        const next = new Map(prev)
        next.set(activeGroup.formType, docId)
        return next
      })
    }

    /* Log override for each record in the group */
    for (const r of activeGroup.records) {
      const key = getItemKey(r)
      const originalDecision = getDecisionLabel(r)
      const detail: OverrideDetail = {
        originalAIDecision: `AI Original: ${aiOriginalId}; ${getRecordLabel(r)} = ${originalDecision}`,
        userOverrideDecision: `User selected "${docId}" as Original`,
        overrideReason: null,
        formType: r.documentRefA?.formType ?? 'Unknown',
        fieldContext: r.comparedValues ?? [],
      }
      override(key, 'duplicate', r.confidenceLevel, detail)
    }
    setShowOverridePanel(false)
  }

  const handleUndoOverride = () => {
    if (!activeGroup) return
    setOverriddenOriginals(prev => {
      const next = new Map(prev)
      next.delete(activeGroup.formType)
      return next
    })
    setShowOverridePanel(false)
  }

  /* ── Reject handler: mark group as not qualifying for duplicate review ── */
  const handleRejectGroup = () => {
    if (!activeGroup) return
    const reasonLabel = selectedRejectReason 
      ? REJECTION_REASONS.find(r => r.id === selectedRejectReason)?.label ?? selectedRejectReason 
      : 'Other'
    const detail = selectedRejectReason === 'custom' ? customRejectReason : (REJECTION_REASONS.find(r => r.id === selectedRejectReason)?.description ?? customRejectReason)
    
    setRejectedGroups(prev => {
      const next = new Map(prev)
      next.set(activeGroup.formType, { reason: reasonLabel, detail })
      return next
    })
    
    // Reset state
    setShowRejectPanel(false)
    setSelectedRejectReason(null)
    setCustomRejectReason('')
  }

  const handleUndoReject = () => {
    if (!activeGroup) return
    setRejectedGroups(prev => {
      const next = new Map(prev)
      next.delete(activeGroup.formType)
      return next
    })
  }

  const isGroupRejected = activeGroup ? rejectedGroups.has(activeGroup.formType) : false

  /** Is a specific document the "Original" based on current effective selection? */
  const isDocOriginal = (docLabel: string | undefined) => docLabel === effectiveOriginalId

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
            Auto-match High Confidence
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Override Classification */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowOverridePanel(p => !p)}
              disabled={isGroupRejected}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                border: '0.0625rem solid oklch(0.82 0.08 60)',
                borderRadius: '0.25rem',
                backgroundColor: isGroupOverridden ? 'oklch(0.96 0.04 60)' : 'oklch(1 0 0)',
                fontSize: '0.75rem', fontWeight: 600,
                color: 'oklch(0.45 0.12 60)',
                cursor: isGroupRejected ? 'not-allowed' : 'pointer',
                opacity: isGroupRejected ? 0.5 : 1,
              }}
              aria-expanded={showOverridePanel}
            >
              <FlipHorizontal style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              {isGroupOverridden ? 'Override Active' : 'Override Classification'}
              <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
            </button>

            {/* Radio selector popover */}
            {showOverridePanel && (
              <>
              {/* Invisible backdrop to close on outside click */}
              <div
                onClick={() => setShowOverridePanel(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                aria-hidden="true"
              />
              <div style={{
                position: 'absolute', insetBlockStart: '100%', insetInlineEnd: 0,
                marginBlockStart: '0.25rem', zIndex: 50,
                inlineSize: 'max-content', minInlineSize: '16rem',
                padding: '0.625rem', borderRadius: '0.375rem',
                border: '0.0625rem solid oklch(0.88 0.01 260)',
                backgroundColor: 'oklch(1 0 0)',
                boxShadow: '0 0.25rem 0.75rem oklch(0 0 0 / 0.12)',
              }}>
                <p style={{
                  fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.35 0.01 260)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  marginBlockEnd: '0.5rem',
                }}>
                  Select the Original document
                </p>
                <p style={{
                  fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)',
                  marginBlockEnd: '0.625rem', lineHeight: '1.4',
                }}>
                  Only 1 document can be Original. All others will be marked as Duplicate.
                </p>

                <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                  <legend className="sr-only">Select the Original document</legend>
                  {groupDocs.map(doc => {
                    const isSelected = doc.id === effectiveOriginalId
                    const isAIChoice = doc.id === aiOriginalId
                    return (
                      <label
                        key={doc.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.375rem 0.5rem', borderRadius: '0.25rem',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'oklch(0.95 0.04 145)' : 'transparent',
                        }}
                      >
                        <input
                          type="radio"
                          name="original-doc"
                          checked={isSelected}
                          onChange={() => handleSelectOriginal(doc.id)}
                          style={{ accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }}
                        />
                        <FileText style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.45 0.01 260)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                          {doc.label}
                        </span>
                        {isAIChoice && (
                          <span style={{
                            marginInlineStart: 'auto', flexShrink: 0,
                            fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase',
                            padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                            backgroundColor: 'oklch(0.94 0.03 240)',
                            color: 'oklch(0.45 0.08 240)',
                          }}>
                            AI pick
                          </span>
                        )}
                      </label>
                    )
                  })}
                </fieldset>

                {isGroupOverridden && (
                  <button
                    type="button"
                    onClick={handleUndoOverride}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                      marginBlockStart: '0.5rem', padding: '0.25rem 0.5rem',
                      border: '0.0625rem solid oklch(0.88 0.01 260)',
                      borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)',
                      fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.45 0.01 260)',
                      cursor: 'pointer', inlineSize: '100%', justifyContent: 'center',
                    }}
                  >
                    <Undo2 style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                    Reset to AI Selection
                  </button>
                )}
              </div>
              </>
            )}
          </div>

          {/* Reject Classification Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                if (!showRejectPanel) {
                  setSelectedRejectReason(null)
                  setCustomRejectReason('')
                }
                setShowRejectPanel(p => !p)
              }}
              disabled={isGroupRejected}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                border: '0.0625rem solid oklch(0.82 0.08 25)',
                borderRadius: '0.25rem',
                backgroundColor: isGroupRejected ? 'oklch(0.94 0.04 25)' : 'oklch(1 0 0)',
                fontSize: '0.75rem', fontWeight: 600,
                color: isGroupRejected ? 'oklch(0.45 0.14 25)' : 'oklch(0.55 0.14 25)',
                cursor: isGroupRejected ? 'not-allowed' : 'pointer',
                opacity: isGroupRejected ? 0.7 : 1,
              }}
              aria-expanded={showRejectPanel}
            >
              <X style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              {isGroupRejected ? 'Rejected' : 'Reject'}
              {!isGroupRejected && <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />}
            </button>
            
            {/* Reject Panel Popover */}
            {showRejectPanel && !isGroupRejected && (
              <>
                <div
                  onClick={() => { setShowRejectPanel(false); setSelectedRejectReason(null); }}
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                  aria-hidden="true"
                />
                <div style={{
                  position: 'absolute', insetBlockStart: '100%', insetInlineEnd: 0,
                  marginBlockStart: '0.25rem', zIndex: 50,
                  inlineSize: 'max-content', minInlineSize: '18rem',
                  padding: '0.75rem', borderRadius: '0.375rem',
                  border: '0.0625rem solid oklch(0.88 0.01 260)',
                  backgroundColor: 'oklch(1 0 0)',
                  boxShadow: '0 0.25rem 0.75rem oklch(0 0 0 / 0.12)',
                }}>
                  <p style={{
                    fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.35 0.01 260)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    marginBlockEnd: '0.5rem',
                  }}>
                    Why does this not qualify?
                  </p>
                  <p style={{
                    fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)',
                    marginBlockEnd: '0.75rem', lineHeight: '1.4',
                  }}>
                    Help improve AI by explaining why these documents should not be in the duplicate review.
                  </p>

                  <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                    <legend className="sr-only">Select rejection reason</legend>
                    {REJECTION_REASONS.map((reason) => (
                      <label
                        key={reason.id}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                          padding: '0.5rem',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                          backgroundColor: selectedRejectReason === reason.id ? 'oklch(0.95 0.02 25)' : 'transparent',
                        }}
                      >
                        <input
                          type="radio"
                          name="reject-reason"
                          checked={selectedRejectReason === reason.id}
                          onChange={() => { setSelectedRejectReason(reason.id); setCustomRejectReason(''); }}
                          style={{ accentColor: 'oklch(0.5 0.14 25)', flexShrink: 0, marginTop: '0.125rem' }}
                        />
                        <div>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)', display: 'block' }}>
                            {reason.label}
                          </span>
                          <span style={{ fontSize: '0.5625rem', color: 'oklch(0.5 0.01 260)' }}>
                            {reason.description}
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
                        backgroundColor: selectedRejectReason === 'custom' ? 'oklch(0.95 0.02 25)' : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="reject-reason"
                        checked={selectedRejectReason === 'custom'}
                        onChange={() => setSelectedRejectReason('custom')}
                        style={{ accentColor: 'oklch(0.5 0.14 25)', flexShrink: 0, marginTop: '0.125rem' }}
                      />
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                        Other (specify below)
                      </span>
                    </label>
                    
                    {selectedRejectReason === 'custom' && (
                      <textarea
                        value={customRejectReason}
                        onChange={(e) => setCustomRejectReason(e.target.value)}
                        placeholder="Enter your reason for rejecting..."
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

                  <div style={{ display: 'flex', gap: '0.5rem', marginBlockStart: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={handleRejectGroup}
                      disabled={!selectedRejectReason && !customRejectReason}
                      style={{
                        flex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                        padding: '0.375rem 0.5rem',
                        border: 'none',
                        borderRadius: '0.25rem',
                        backgroundColor: (!selectedRejectReason && !customRejectReason) ? 'oklch(0.9 0.01 260)' : 'oklch(0.55 0.14 25)',
                        fontSize: '0.6875rem', fontWeight: 600,
                        color: (!selectedRejectReason && !customRejectReason) ? 'oklch(0.6 0.01 260)' : 'oklch(1 0 0)',
                        cursor: (!selectedRejectReason && !customRejectReason) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <X style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {isGroupRejected ? (
            <button
              type="button"
              onClick={handleUndoReject}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.82 0.08 25)',
                borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)',
                fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.55 0.14 25)',
                cursor: 'pointer',
              }}
            >
              <Undo2 style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Undo Rejection
            </button>
          ) : allGroupAccepted ? (
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

          {/* Next Step button */}
          <button
            type="button"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.875rem',
              border: 'none',
              borderRadius: '0.25rem',
              backgroundColor: 'oklch(0.55 0.22 25)',
              fontSize: '0.75rem', fontWeight: 700, color: 'oklch(1 0 0)',
              cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.03em',
            }}
          >
            Next Step
            <ArrowRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
          </button>
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
              <p>Review potential duplicate pairs grouped by form type. High Confidence pairs are auto-matched. Click a group to see AI analysis, field comparison, and source documents.</p>
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
  const actionLabel = avgConfidence >= 90 ? 'High' : avgConfidence >= 70 ? 'Moderate' : 'Low'
  const actionTooltip = avgConfidence >= 90 
    ? 'AI is confident. Reviewer can approve quickly.' 
    : avgConfidence >= 70 
      ? 'AI has moderate confidence. Reviewer should verify key fields.' 
      : 'AI is uncertain. Reviewer must examine carefully.'
              const isThisGroupRejected = rejectedGroups.has(group.formType)
              const rejectionInfo = rejectedGroups.get(group.formType)

              return (
                <div key={group.formType} style={{
                  borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                  backgroundColor: isThisGroupRejected 
                    ? 'oklch(0.96 0.02 25 / 0.3)' 
                    : isActiveGroup ? 'oklch(0.97 0.01 240 / 0.4)' : 'transparent',
                  opacity: isThisGroupRejected ? 0.7 : 1,
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockStart: '0.25rem', flexWrap: 'wrap' }}>
                        {isThisGroupRejected ? (
                          <span 
                            style={{
                              fontSize: '0.625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                              padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                              backgroundColor: 'oklch(0.92 0.02 260)', color: 'oklch(0.45 0.01 260)',
                            }}
                            title={rejectionInfo?.detail ?? 'This group was dismissed by reviewer'}
                          >
                            Not a Match
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                            padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                            backgroundColor: `${confColor} / 0.12`, color: confColor,
                          }}
                          title={actionTooltip}>
                            {actionLabel}
                          </span>
                        )}
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

                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                      : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                    }
                  </button>

                  {/* Expanded: individual document rows */}
                  {isExpanded && (
                    <div style={{ paddingInlineStart: '0.1875rem' }}>
                      {(() => {
                        /* Extract unique docs for this group */
                        const docs = getUniqueDocsInGroup(group.records)
                        const groupOverrideId = overriddenOriginals.get(group.formType)
                        return docs.map(doc => {
                          const docIsOriginal = groupOverrideId
                            ? doc.id === groupOverrideId
                            : doc.aiOriginal
                          const isActive = isActiveGroup && selectedDocId === doc.id
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => {
                                selectGroup(gIdx)
                                setSelectedDocId(doc.id)
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                inlineSize: '100%', padding: '0.375rem 0.75rem 0.375rem 2rem',
                                border: 'none', cursor: 'pointer', textAlign: 'start',
                                backgroundColor: isActive ? 'oklch(0.96 0.01 240)' : 'transparent',
                                borderInlineStart: isActive ? '0.125rem solid oklch(0.5 0.18 240)' : '0.125rem solid transparent',
                              }}
                            >
                              <FileText style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                              <span style={{
                                fontSize: '0.6875rem', fontWeight: isActive ? 700 : 500,
                                color: 'oklch(0.25 0.01 260)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {doc.label}
                              </span>
                              <span style={{
                                marginInlineStart: 'auto', flexShrink: 0,
                                fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                                backgroundColor: docIsOriginal ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                                color: docIsOriginal ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                              }}>
                                {docIsOriginal ? 'Original' : 'Duplicate'}
                              </span>
                            </button>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>

        {/* ── RIGHT: 3 collapsible panels ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

          {/* ═══ PANEL 1: AI Analysis ═══ */}
          {(() => {
            const avgConf = activeGroup
              ? Math.round(activeGroup.averageConfidence * 100)
              : 0
            const confColor = avgConf >= 90 ? 'oklch(0.55 0.17 145)' : avgConf >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'
            const panelActionLabel = avgConf >= 90 ? 'High Confidence' : avgConf >= 70 ? 'Moderate Confidence' : 'Low Confidence'
            const panelTooltip = avgConf >= 90 
              ? 'AI is confident. Reviewer can approve quickly.' 
              : avgConf >= 70 
                ? 'AI has moderate confidence. Reviewer should verify key fields.' 
                : 'AI is uncertain. Reviewer must examine carefully.'
            const panelGroupRejected = activeGroup ? rejectedGroups.has(activeGroup.formType) : false
            const panelRejectionInfo = activeGroup ? rejectedGroups.get(activeGroup.formType) : undefined

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
                  {panelGroupRejected ? 'Review Outcome' : 'What we found'}
                  {panelGroupRejected ? (
                    <span style={{
                      fontSize: '0.625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                      padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                      backgroundColor: 'oklch(0.92 0.02 260)', color: 'oklch(0.45 0.01 260)',
                      marginInlineStart: '0.25rem',
                    }}>
                      Not a Match
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
                </button>

                {expandedPanels.has('aiAnalysis') && (
                  <div style={{
                    padding: '0.625rem 0.75rem',
                    backgroundColor: panelGroupRejected 
                      ? 'oklch(0.97 0.005 260)' 
                      : isGroupOverridden ? 'oklch(0.98 0.02 60)' : 'oklch(0.98 0.003 240)',
                  }}>
                    {/* Rejection outcome -- replaces AI analysis */}
                    {panelGroupRejected && panelRejectionInfo && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '0.5rem',
                      }}>
                        {/* Outcome banner */}
                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: '0.375rem',
                          padding: '0.625rem 0.75rem',
                          borderRadius: '0.25rem',
                          border: '0.0625rem solid oklch(0.88 0.01 260)',
                          backgroundColor: 'oklch(0.95 0.005 260)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <AlertTriangle style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.55 0.01 260)' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.3 0.01 260)' }}>
                              Pair Dismissed by Reviewer
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingInlineStart: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <span style={{ inlineSize: '0.25rem', blockSize: '0.25rem', borderRadius: '50%', backgroundColor: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>
                                Both documents will be retained in SPbinder as independent records
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <span style={{ inlineSize: '0.25rem', blockSize: '0.25rem', borderRadius: '50%', backgroundColor: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>
                                No duplicate classification will be applied
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Rejection reason */}
                        <div style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.25rem',
                          border: '0.0625rem solid oklch(0.88 0.01 260)',
                          backgroundColor: 'oklch(0.98 0.003 260)',
                        }}>
                          <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>
                            Reason
                          </span>
                          <p style={{ fontSize: '0.6875rem', color: 'oklch(0.3 0.01 260)', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
                            {panelRejectionInfo.reason}
                          </p>
                          {panelRejectionInfo.detail && panelRejectionInfo.detail !== panelRejectionInfo.reason && (
                            <p style={{ fontSize: '0.6875rem', color: 'oklch(0.4 0.01 260)', margin: '0.125rem 0 0 0', fontStyle: 'italic' }}>
                              {panelRejectionInfo.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Override comparison table when user has overridden */}
                    {!panelGroupRejected && isGroupOverridden && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '0.25rem',
                        padding: '0.5rem 0.625rem',
                        marginBlockEnd: '0.625rem',
                        borderRadius: '0.25rem',
                        border: '0.0625rem solid oklch(0.82 0.08 60)',
                        backgroundColor: 'oklch(0.96 0.04 60)',
                      }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.4 0.14 60)' }}>
                          User has overridden the Original classification
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                          <p style={{ fontSize: '0.6875rem', color: 'oklch(0.4 0.1 60)', margin: 0 }}>
                            <strong>AI recommended:</strong>{' '}
                            {aiOriginalId ?? 'Unknown'} = Original; all others = Duplicate
                          </p>
                          <p style={{ fontSize: '0.6875rem', color: 'oklch(0.4 0.1 60)', margin: 0 }}>
                            <strong>User changed to:</strong>{' '}
                            {effectiveOriginalId} = Original; all others = Duplicate
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Document tabs and AI analysis -- hidden when rejected */}
                    {!panelGroupRejected && <><nav style={{
                      display: 'flex', gap: '0.125rem',
                      marginBlockEnd: '0.625rem',
                      borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                    }} aria-label="Document analysis tabs">
                      {groupDocs.map(doc => {
                        const isActiveDoc = selectedDocId === doc.id
                        const docIsOrig = isDocOriginal(doc.id)
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setSelectedDocId(doc.id)}
                            aria-selected={isActiveDoc}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.25rem',
                              padding: '0.375rem 0.625rem',
                              border: 'none', cursor: 'pointer',
                              fontSize: '0.6875rem', fontWeight: isActiveDoc ? 700 : 500,
                              color: isActiveDoc ? 'oklch(0.3 0.01 260)' : 'oklch(0.55 0.01 260)',
                              backgroundColor: isActiveDoc ? 'oklch(0.97 0.003 240)' : 'transparent',
                              borderBlockEnd: isActiveDoc ? '0.125rem solid oklch(0.5 0.18 240)' : '0.125rem solid transparent',
                              borderRadius: '0.25rem 0.25rem 0 0',
                            }}
                          >
                            <FileText style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} />
                            {doc.label}
                            <span style={{
                              fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase',
                              padding: '0 0.1875rem', borderRadius: '0.0625rem',
                              backgroundColor: docIsOrig ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                              color: docIsOrig ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                            }}>
                              {docIsOrig ? 'Orig' : 'Dup'}
                            </span>
                          </button>
                        )
                      })}
                    </nav>

                    {/* Selected document's AI analysis */}
                    {(() => {
                      const doc = groupDocs.find(d => d.id === selectedDocId) ?? groupDocs[0]
                      if (!doc || !activeGroup) return null

                      const relatedRecords = activeGroup.records.filter(
                        r => r.documentRefA?.formLabel === doc.id || r.documentRefB?.formLabel === doc.id
                      )
                      const primaryRec = relatedRecords[0]
                      if (!primaryRec) return null

                      const docIsOriginal = isDocOriginal(doc.id)
                      const aiDecision = getDecisionLabel(primaryRec)
                      const effectiveDecision = isGroupOverridden
                        ? (docIsOriginal ? 'NotDuplicate' : 'Duplicate')
                        : (doc.aiOriginal ? 'NotDuplicate' : aiDecision)
                      const isNotDup = effectiveDecision.includes('Not')

                      const docMismatches = relatedRecords.flatMap(
                        r => (r.comparedValues ?? []).filter(v => v.valueA !== v.valueB)
                      )
                      const seenFields = new Set<string>()
                      const uniqueMismatches = docMismatches.filter(v => {
                        if (seenFields.has(v.field)) return false
                        seenFields.add(v.field)
                        return true
                      })

                      return (
                        <article style={{
                          border: `0.0625rem solid ${docIsOriginal ? 'oklch(0.82 0.06 145)' : 'oklch(0.88 0.01 260)'}`,
                          borderRadius: '0.3125rem',
                          backgroundColor: docIsOriginal ? 'oklch(0.98 0.01 145)' : 'oklch(1 0 0)',
                          overflow: 'hidden',
                        }}>
                          {/* Document header */}
                          <header style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.375rem 0.625rem',
                            borderBlockEnd: `0.0625rem solid ${docIsOriginal ? 'oklch(0.88 0.04 145)' : 'oklch(0.92 0.005 260)'}`,
                            backgroundColor: docIsOriginal ? 'oklch(0.96 0.02 145)' : 'oklch(0.97 0.003 260)',
                          }}>
                            <FileText style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.45 0.01 260)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.25 0.01 260)' }}>
                              {doc.label}
                            </span>
                            <span style={{
                              marginInlineStart: 'auto',
                              fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase',
                              padding: '0.0625rem 0.3125rem', borderRadius: '0.125rem',
                              backgroundColor: isNotDup ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                              color: isNotDup ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.14 25)',
                            }}>
                              {docIsOriginal ? 'Original' : 'Duplicate'}
                            </span>
                            {isGroupOverridden && doc.aiOriginal !== docIsOriginal && (
                              <span style={{
                                fontSize: '0.5rem', fontWeight: 600,
                                padding: '0 0.1875rem', borderRadius: '0.0625rem',
                                backgroundColor: 'oklch(0.92 0.06 60)', color: 'oklch(0.4 0.14 60)',
                              }}>
                                overridden
                              </span>
                            )}
                          </header>

                          {/* Analysis body */}
                          <div style={{ padding: '0.5rem 0.625rem' }}>
                            {/* Decision reasons - compact icon + text format */}
                            {!isGroupOverridden && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {primaryRec.decisionReason?.includes('||') ? (
                                  // New icon format
                                  primaryRec.decisionReason
                                    .split('||')
                                    .map(item => {
                                      const [type, text] = item.split('|')
                                      return { type, text }
                                    })
                                    .filter(item => item.text)
                                    .map((item, i) => {
                                      const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
                                        'NEWER_VERSION': { icon: <RefreshCw style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, color: 'oklch(0.45 0.15 145)' },
                                        'SAME_RECIPIENT': { icon: <User style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, color: 'oklch(0.45 0.12 250)' },
                                        'UPDATED_VALUES': { icon: <FileEdit style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, color: 'oklch(0.5 0.14 60)' },
                                        'CORRECTED_MARK': { icon: <CheckCircle2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, color: 'oklch(0.45 0.15 145)' },
                                        'EXACT_MATCH': { icon: <Copy style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, color: 'oklch(0.45 0.15 145)' },
                                        'SAME_DOCUMENT': { icon: <FileCheck style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, color: 'oklch(0.45 0.12 250)' },
                                        'KEEP_ONE': { icon: <Check style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, color: 'oklch(0.45 0.15 145)' },
                                      }
                                      const config = iconMap[item.type] || { icon: <Info style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, color: 'oklch(0.5 0.01 260)' }
                                      return (
                                        <div key={`${doc.id}-reason-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                          <span style={{ color: config.color, flexShrink: 0 }}>{config.icon}</span>
                                          <span style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>{item.text}</span>
                                        </div>
                                      )
                                    })
                                ) : (
                                  // Legacy sentence format fallback
                                  primaryRec.decisionReason
                                    ?.split(/\.(?=\s+[A-Z])/)
                                    .map(s => s.trim())
                                    .filter(s => s.length > 0)
                                    .map(s => s.replace(/\.$/, ''))
                                    .map((sentence, i) => (
                                      <div key={`${doc.id}-reason-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                        <span style={{ color: 'oklch(0.5 0.01 260)', flexShrink: 0 }}>
                                          <Info style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                                        </span>
                                        <span style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>{sentence}</span>
                                      </div>
                                    ))
                                )}

                              </div>
                            )}


                          </div>
                        </article>
                      )
                    })()}
                    </>}
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
                    isOverridden={isGroupOverridden}
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
                  {(() => {
                    const aIsOriginal = isDocOriginal(firstRecord?.documentRefA?.formLabel)
                    return (
                      <span style={{
                        marginInlineStart: 'auto', flexShrink: 0,
                        fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase',
                        padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem',
                        backgroundColor: aIsOriginal ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                        color: aIsOriginal ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                      }}>
                        {aIsOriginal ? 'Original' : 'Duplicate'}
                      </span>
                    )
                  })()}
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
                  {(() => {
                    const bIsOriginal = isDocOriginal(firstRecord?.documentRefB?.formLabel)
                    return (
                      <span style={{
                        marginInlineStart: 'auto', flexShrink: 0,
                        fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase',
                        padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem',
                        backgroundColor: bIsOriginal ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                        color: bIsOriginal ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                      }}>
                        {bIsOriginal ? 'Original' : 'Duplicate'}
                      </span>
                    )
                  })()}
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
                  {(() => {
                    const aIsOrig = isDocOriginal(firstRecord?.documentRefA?.formLabel)
                    return (
                      <div style={{
                        textAlign: 'center', padding: '0.25rem',
                        fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                        backgroundColor: aIsOrig ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                        color: aIsOrig ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                        borderRadius: '0.1875rem 0.1875rem 0 0',
                      }}>
                        {aIsOrig ? 'Original' : 'Duplicate'}
                      </div>
                    )
                  })()}
                  {firstRecord?.documentRefA ? (
                    <PdfPageViewer
                      documentRef={firstRecord.documentRefA}
                      stamp={isDocOriginal(firstRecord.documentRefA.formLabel) ? 'ORIGINAL' : 'SUPERSEDED'}
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
                  {(() => {
                    const bIsOrig = isDocOriginal(firstRecord?.documentRefB?.formLabel)
                    return (
                      <div style={{
                        textAlign: 'center', padding: '0.25rem',
                        fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                        backgroundColor: bIsOrig ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                        color: bIsOrig ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                        borderRadius: '0.1875rem 0.1875rem 0 0',
                      }}>
                        {bIsOrig ? 'Original' : 'Duplicate'}
                      </div>
                    )
                  })()}
                  {firstRecord?.documentRefB ? (
                    <PdfPageViewer
                      documentRef={firstRecord.documentRefB}
                      stamp={isDocOriginal(firstRecord.documentRefB.formLabel) ? 'ORIGINAL' : 'SUPERSEDED'}
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
