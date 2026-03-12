'use client'

/**
 * Duplicate Document Review -- layout replicates Superseded Wizard (variant-e)
 * Data model & AI decision spec remain duplicate-specific.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { FieldComparison } from '@/components/field-comparison'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { useDecisions } from '@/contexts/decision-context'
import { useLearnedRules } from '@/contexts/learned-rules-context'
import {
  ChevronDown,
  ChevronLeft,
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
  CheckCircle,
} from 'lucide-react'
import type { DuplicateRecord, DuplicateDataRecord, DuplicateDocRecord, OverrideDetail } from '@/lib/types'

/* ── Predefined override reasons (matching superseded) ── */
const OVERRIDE_REASONS = [
  { id: 'corrected', label: 'Corrected form detected - should be retained' },
  { id: 'more-data', label: 'More complete data exists on this document' },
] as const

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
  *  3. Removed auto-match -- only explicit decisions count
  */
  function isRecordMatched(
  r: DuplicateRecord,
  key: string,
  decisions: Record<string, string>,
  ): boolean {
  if (decisions[key] === 'accepted') return true
  if (decisions[key] === 'rejected') return false
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
  ): FormCategoryGroup[] {
  const map = new Map<string, DuplicateRecord[]>()
  for (const r of data) {
    const key = r.documentRefA?.formType ?? 'Unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  const groups: FormCategoryGroup[] = []
  for (const [formType, records] of map.entries()) {
  const matched = records.filter(r => isRecordMatched(r, getItemKey(r), decisions))
  const unmatched = records.filter(r => !isRecordMatched(r, getItemKey(r), decisions))
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

export function DuplicateClient({ data }: { data: DuplicateRecord[]}) {
  const { decisions, accept, undo, override, isOverridden } = useDecisions()
  const { addRuleFromOverride } = useLearnedRules()

  /* Override classification: maps formType -> docId the user selected as Original.
     If a group is NOT in this map, the AI-selected original applies. */
  const [overriddenOriginals, setOverriddenOriginals] = useState<Map<string, string>>(new Map())
  const [showOverridePanel, setShowOverridePanel] = useState(false)
  
  /* Rejection panel state
     For 3+ doc groups: step-based flow (select doc -> reason -> confirm)
     For 2-doc groups: direct reject all (reason -> confirm) */
  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [overrideStep, setOverrideStep] = useState<'select' | 'reason'>('select')
  const [pendingOverrideDocId, setPendingOverrideDocId] = useState<string | null>(null)
  const [selectedOverrideReason, setSelectedOverrideReason] = useState<string | null>(null)
  const [customOverrideReason, setCustomOverrideReason] = useState('')
  const [rejectStep, setRejectStep] = useState<'select' | 'reason'>('select')
  const [rejectTargetDocId, setRejectTargetDocId] = useState<string | null>(null)
  const [newOriginalAfterReject, setNewOriginalAfterReject] = useState<string | null>(null)
  const [selectedRejectReasons, setSelectedRejectReasons] = useState<Set<string>>(new Set())
  const [customRejectReason, setCustomRejectReason] = useState('')
  const [rejectedGroups, setRejectedGroups] = useState<Map<string, { reason: string; detail: string }>>(new Map())
  const [rejectedDocs, setRejectedDocs] = useState<Map<string, { reason: string; detail: string; formType: string }>>(new Map())

  const toggleRejectReason = (id: string) => {
    setSelectedRejectReasons(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }
  const hasRejectSelection = selectedRejectReasons.size > 0 || customRejectReason.trim().length > 0

  const groups = useMemo(() => groupByFormCategory(data, decisions), [data, decisions])

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

  /* ── Undo stack for batch reversal (self-cleaning) ── */
  const [undoStack, setUndoStack] = useState<Array<{
    action: 'individual_accept' | 'high_confidence_bulk' | 'bulk_accept' | 'bulk_accept_with_warning' | 'sidebar_checkbox'
    groups: string[]
    label: string
  }>>([])

  const pushUndoEntry = (action: typeof undoStack[number]['action'], groupKeys: string[], label: string) => {
    setUndoStack(prev => [...prev, { action, groups: groupKeys, label }])
  }

  /** Remove a group from the undo stack when manually unchecked */
  const pruneUndoStack = (groupKey: string) => {
    setUndoStack(prev => {
      const next = prev.map(entry => ({
        ...entry,
        groups: entry.groups.filter(g => g !== groupKey),
      })).filter(entry => entry.groups.length > 0)
      return next
    })
  }

  /** Effective undo stack -- only entries whose groups are still all-accepted */
  const effectiveUndoStack = useMemo(() => {
    return undoStack.filter(entry =>
      entry.groups.some(gKey => {
        const group = groups.find(g => g.formType === gKey)
        return group && group.records.every(r => decisions[getItemKey(r)] === 'accepted')
      })
    )
  }, [undoStack, groups, decisions])

  const lastUndoEntry = effectiveUndoStack.length > 0 ? effectiveUndoStack[effectiveUndoStack.length - 1] : null

  const handleUndoLastAction = () => {
    if (!lastUndoEntry) return
    for (const groupKey of lastUndoEntry.groups) {
      const group = groups.find(g => g.formType === groupKey)
      if (group) {
        for (const r of group.records) {
          undo(getItemKey(r), 'duplicate', r.confidenceLevel)
        }
      }
    }
    const idx = undoStack.lastIndexOf(lastUndoEntry)
    setUndoStack(prev => prev.filter((_, i) => i !== idx))
  }

  /* ── Audit log for acceptance actions ── */
  const [auditLog, setAuditLog] = useState<Array<{
    timestamp: string
    action: 'individual_accept' | 'high_confidence_bulk' | 'bulk_accept' | 'bulk_accept_with_warning' | 'sidebar_checkbox'
    groups: string[]
    groupCount: number
  }>>([])

  const logAuditEntry = (action: typeof auditLog[number]['action'], groupKeys: string[]) => {
    setAuditLog(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action,
      groups: groupKeys,
      groupCount: groupKeys.length,
    }])
  }

  /* ── Accept dropdown state ── */
  const [showAcceptDropdown, setShowAcceptDropdown] = useState(false)
  const [showBulkWarning, setShowBulkWarning] = useState(false)
  const acceptDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (acceptDropdownRef.current && !acceptDropdownRef.current.contains(e.target as Node)) {
        setShowAcceptDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* Compute counts for each tier */
  const highConfidenceUnreviewed = useMemo(() => {
    return groups.filter(g => {
      const isAccepted = g.records.every(r => decisions[getItemKey(r)] === 'accepted')
      const isRejected = rejectedGroups.has(g.formType)
      const rawOvId = overriddenOriginals.get(g.formType)
      const isOverridden = rawOvId !== undefined && !rejectedDocs.has(rawOvId)
      return Math.round(g.averageConfidence * 100) >= 90 && !isAccepted && !isRejected && !isOverridden
    })
  }, [groups, decisions, rejectedGroups, overriddenOriginals, rejectedDocs])

  const allUnreviewed = useMemo(() => {
    return groups.filter(g => {
      const isAccepted = g.records.every(r => decisions[getItemKey(r)] === 'accepted')
      const isRejected = rejectedGroups.has(g.formType)
      const rawOvId = overriddenOriginals.get(g.formType)
      const isOverridden = rawOvId !== undefined && !rejectedDocs.has(rawOvId)
      return !isAccepted && !isRejected && !isOverridden
    })
  }, [groups, decisions, rejectedGroups, overriddenOriginals, rejectedDocs])

  const unreviewedModLow = useMemo(() => {
    return allUnreviewed.filter(g => Math.round(g.averageConfidence * 100) < 90)
  }, [allUnreviewed])

  /* Accept all in group => Match (Tier 2) */
  const handleAcceptGroup = () => {
    if (!activeGroup) return
    for (const r of activeGroup.records) {
      const key = getItemKey(r)
      if (decisions[key] !== 'accepted') {
        accept(key, 'duplicate', r.confidenceLevel, 'manual')
      }
    }
    logAuditEntry('individual_accept', [activeGroup.formType])
    pushUndoEntry('individual_accept', [activeGroup.formType], `Accept ${activeGroup.formType}`)
  }

  /* Tier 1: Accept High Confidence */
  const handleAcceptHighConfidence = () => {
    const groupKeys: string[] = []
    for (const g of highConfidenceUnreviewed) {
      for (const r of g.records) {
        const key = getItemKey(r)
        if (decisions[key] !== 'accepted') {
          accept(key, 'duplicate', r.confidenceLevel, 'manual')
        }
      }
      groupKeys.push(g.formType)
    }
    logAuditEntry('high_confidence_bulk', groupKeys)
    pushUndoEntry('high_confidence_bulk', groupKeys, `Accept High Confidence (${groupKeys.length})`)
    setShowAcceptDropdown(false)
  }

  /* Tier 3: Bulk Accept Remaining */
  const handleBulkAcceptRemaining = () => {
    if (unreviewedModLow.length > 0) {
      setShowBulkWarning(true)
      setShowAcceptDropdown(false)
      return
    }
    executeBulkAccept()
  }

  const executeBulkAccept = () => {
    const groupKeys: string[] = []
    for (const g of allUnreviewed) {
      for (const r of g.records) {
        const key = getItemKey(r)
        if (decisions[key] !== 'accepted') {
          accept(key, 'duplicate', r.confidenceLevel, 'manual')
        }
      }
      groupKeys.push(g.formType)
    }
    const actionType = unreviewedModLow.length > 0 ? 'bulk_accept_with_warning' as const : 'bulk_accept' as const
    logAuditEntry(actionType, groupKeys)
    pushUndoEntry(actionType, groupKeys, `Accept Remaining (${groupKeys.length})`)
    setShowBulkWarning(false)
    setShowAcceptDropdown(false)
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

  /* Pick a different doc as Original */
  const handleSelectOriginal = (docId: string, reason: string | null) => {
    if (!activeGroup) return

    const reasonText = reason
      ? OVERRIDE_REASONS.find(r => r.id === reason)?.label ?? reason
      : customOverrideReason || 'User override (no reason provided)'

    // If selecting the same as AI original -> remove override
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
        overrideReason: reasonText,
        formType: r.documentRefA?.formType ?? 'Unknown',
        fieldContext: r.comparedValues ?? [],
      }
      override(key, 'duplicate', r.confidenceLevel, detail)
    }
    setShowOverridePanel(false)
    setOverrideStep('select')
    setPendingOverrideDocId(null)
    setSelectedOverrideReason(null)
    setCustomOverrideReason('')
  }

  const handleUndoOverride = () => {
    if (!activeGroup) return
    setOverriddenOriginals(prev => {
      const next = new Map(prev)
      next.delete(activeGroup.formType)
      return next
    })
    setShowOverridePanel(false)
    setOverrideStep('select')
    setPendingOverrideDocId(null)
    setSelectedOverrideReason(null)
    setCustomOverrideReason('')
  }

  // Derived: which doc IDs are rejected in the active group
  const rejectedDocIds = useMemo(() => {
    if (!activeGroup) return new Set<string>()
    const ids = new Set<string>()
    for (const doc of groupDocs) {
      if (rejectedDocs.has(doc.id)) ids.add(doc.id)
    }
    return ids
  }, [activeGroup, groupDocs, rejectedDocs])

  // Effective docs = group docs minus rejected ones
  const effectiveDocs = useMemo(() => {
    return groupDocs.filter(d => !rejectedDocIds.has(d.id))
  }, [groupDocs, rejectedDocIds])

  /* Effective original = user override or AI default (validated: override ignored if overridden doc is rejected) */
  const overrideDocId = activeGroup ? overriddenOriginals.get(activeGroup.formType) : undefined
  const isOverrideValid = overrideDocId !== undefined && !rejectedDocIds.has(overrideDocId)
  const effectiveOriginalId = isOverrideValid ? overrideDocId : aiOriginalId
  const isGroupOverridden = isOverrideValid

  const isGroupRejected = activeGroup ? rejectedGroups.has(activeGroup.formType) : false
  const hasPartialRejects = rejectedDocIds.size > 0 && !isGroupRejected

  /* ── Reject handler: mark docs/group as not qualifying for duplicate review ── */
  const handleRejectDoc = () => {
    if (!activeGroup) return
    const predefinedLabels = Array.from(selectedRejectReasons)
      .filter(id => id !== 'custom')
      .map(id => REJECTION_REASONS.find(r => r.id === id)?.label ?? id)
    const allLabels = [...predefinedLabels, ...(selectedRejectReasons.has('custom') && customRejectReason.trim() ? [customRejectReason.trim()] : [])]
    const reasonLabel = allLabels.length > 0 ? allLabels.join('; ') : 'Other'
    const detail = allLabels.join('. ')

    if (rejectTargetDocId) {
      // Partial reject: single document
      setRejectedDocs(prev => {
        const next = new Map(prev)
        next.set(rejectTargetDocId, { reason: reasonLabel, detail, formType: activeGroup.formType })
        return next
      })

      // If rejecting the current effective Original, apply new original or clear override
      const isRejectingOriginal = rejectTargetDocId === effectiveOriginalId
      if (isRejectingOriginal && newOriginalAfterReject) {
        setOverriddenOriginals(prev => {
          const next = new Map(prev)
          next.set(activeGroup.formType, newOriginalAfterReject)
          return next
        })
      } else if (isRejectingOriginal) {
        // Rejecting the overridden Original but no replacement picked -- clear override
        setOverriddenOriginals(prev => {
          const next = new Map(prev)
          next.delete(activeGroup.formType)
          return next
        })
      } else if (overriddenOriginals.has(activeGroup.formType) && rejectTargetDocId === overriddenOriginals.get(activeGroup.formType)) {
        // Rejecting the doc that is the stored override -- clear it
        setOverriddenOriginals(prev => {
          const next = new Map(prev)
          next.delete(activeGroup.formType)
          return next
        })
      }
    } else {
      // Reject all: entire group
      setRejectedGroups(prev => {
        const next = new Map(prev)
        next.set(activeGroup.formType, { reason: reasonLabel, detail })
        return next
      })
    }

    // Reset state
    setShowRejectPanel(false)
    setRejectStep('select')
    setRejectTargetDocId(null)
    setNewOriginalAfterReject(null)
    setSelectedRejectReasons(new Set())
    setCustomRejectReason('')
  }

  const handleUndoReject = () => {
    if (!activeGroup) return
    // Undo group-level rejection
    setRejectedGroups(prev => {
      const next = new Map(prev)
      next.delete(activeGroup.formType)
      return next
    })
    // Undo all per-doc rejections in this group
    setRejectedDocs(prev => {
      const next = new Map(prev)
      for (const doc of groupDocs) {
        next.delete(doc.id)
      }
      return next
    })
  }

  const handleUndoRejectDoc = (docId: string) => {
    setRejectedDocs(prev => {
      const next = new Map(prev)
      next.delete(docId)
      return next
    })
  }

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


        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Override Classification */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setShowOverridePanel(p => !p)
                setOverrideStep('select')
                setPendingOverrideDocId(null)
                setSelectedOverrideReason(null)
                setCustomOverrideReason('')
              }}
              disabled={isGroupRejected || allGroupAccepted}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                border: '0.0625rem solid oklch(0.82 0.08 60)',
                borderRadius: '0.25rem',
                backgroundColor: isGroupOverridden
                  ? 'oklch(0.96 0.04 60)'
                  : 'oklch(1 0 0)',
                fontSize: '0.75rem', fontWeight: 600,
                color: 'oklch(0.5 0.16 60)',
                cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer',
                opacity: (isGroupRejected || allGroupAccepted) ? 0.5 : 1,
              }}
              aria-expanded={showOverridePanel}
            >
              <FlipHorizontal style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              {isGroupOverridden
                ? `Override Active (${effectiveDocs.find(d => d.id === effectiveOriginalId)?.label ?? ''} is now Original)`
                : 'Override Classification'}
              <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
            </button>

            {/* Override popover -- 2-step: select doc, then reason */}
            {showOverridePanel && !allGroupAccepted && (
              <>
              {/* Invisible backdrop to close on outside click */}
              <div
                onClick={() => { setShowOverridePanel(false); setOverrideStep('select'); }}
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

                {/* Step 1: Select document */}
                {overrideStep === 'select' && (
                  <>
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
                      {effectiveDocs.map(doc => {
                        const isSelected = (pendingOverrideDocId ?? effectiveOriginalId) === doc.id
                        const isAIChoice = doc.id === aiOriginalId
                        const isCurrentOriginal = doc.id === effectiveOriginalId && isGroupOverridden
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
                              onChange={() => setPendingOverrideDocId(doc.id)}
                              style={{ accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }}
                            />
                            <FileText style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.45 0.01 260)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                              {doc.label}
                            </span>
                            {isCurrentOriginal && (
                              <span style={{
                                marginInlineStart: 'auto', flexShrink: 0,
                                fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase',
                                padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                                backgroundColor: 'oklch(0.94 0.04 145)',
                                color: 'oklch(0.35 0.14 145)',
                              }}>
                                Current Original
                              </span>
                            )}
                            {isAIChoice && !isCurrentOriginal && (
                              <span style={{
                                marginInlineStart: 'auto', flexShrink: 0,
                                fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase',
                                padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                                backgroundColor: 'oklch(0.94 0.03 240)',
                                color: 'oklch(0.45 0.08 240)',
                              }}>
                                AI Pick
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </fieldset>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBlockStart: '0.75rem' }}>
                      {isGroupOverridden && (
                        <button
                          type="button"
                          onClick={handleUndoOverride}
                          style={{
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
                      )}
                      <button
                        type="button"
                        onClick={() => setOverrideStep('reason')}
                        disabled={!pendingOverrideDocId}
                        style={{
                          flex: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                          padding: '0.375rem 0.5rem',
                          border: 'none',
                          borderRadius: '0.25rem',
                          backgroundColor: !pendingOverrideDocId ? 'oklch(0.9 0.01 260)' : 'oklch(0.45 0.18 145)',
                          fontSize: '0.6875rem', fontWeight: 600,
                          color: !pendingOverrideDocId ? 'oklch(0.6 0.01 260)' : 'oklch(1 0 0)',
                          cursor: !pendingOverrideDocId ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isGroupOverridden ? 'Change Override' : 'Continue'}
                        <ChevronRight style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                      </button>
                    </div>
                  </>
                )}

                {/* Step 2: Select reason */}
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
                            backgroundColor: selectedOverrideReason === reason.id ? 'oklch(0.95 0.04 145)' : 'transparent',
                          }}
                        >
                          <input
                            type="radio"
                            name="override-reason"
                            checked={selectedOverrideReason === reason.id}
                            onChange={() => { setSelectedOverrideReason(reason.id); setCustomOverrideReason(''); }}
                            style={{ accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0, marginTop: '0.125rem' }}
                          />
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                            {reason.label}
                          </span>
                        </label>
                      ))}

                      {/* Custom reason option */}
                      <label
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                          padding: '0.5rem',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                          backgroundColor: selectedOverrideReason === 'custom' ? 'oklch(0.95 0.04 145)' : 'transparent',
                        }}
                      >
                        <input
                          type="radio"
                          name="override-reason"
                          checked={selectedOverrideReason === 'custom'}
                          onChange={() => setSelectedOverrideReason('custom')}
                          style={{ accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0, marginTop: '0.125rem' }}
                        />
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                          Other (specify below)
                        </span>
                      </label>

                      {/* Custom text input */}
                      {selectedOverrideReason === 'custom' && (
                        <textarea
                          value={customOverrideReason}
                          onChange={(e) => setCustomOverrideReason(e.target.value)}
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

                    {/* Confirm button */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBlockStart: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (pendingOverrideDocId) {
                            handleSelectOriginal(pendingOverrideDocId, selectedOverrideReason)
                          }
                        }}
                        disabled={!selectedOverrideReason && !customOverrideReason}
                        style={{
                          flex: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                          padding: '0.375rem 0.5rem',
                          border: 'none',
                          borderRadius: '0.25rem',
                          backgroundColor: (!selectedOverrideReason && !customOverrideReason) ? 'oklch(0.9 0.01 260)' : 'oklch(0.45 0.18 145)',
                          fontSize: '0.6875rem', fontWeight: 600,
                          color: (!selectedOverrideReason && !customOverrideReason) ? 'oklch(0.6 0.01 260)' : 'oklch(1 0 0)',
                          cursor: (!selectedOverrideReason && !customOverrideReason) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Confirm Override
                      </button>
                    </div>
                  </>
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
                  const isMultiDoc = effectiveDocs.length > 2
                  setRejectStep(isMultiDoc ? 'select' : 'reason')
                  setRejectTargetDocId(isMultiDoc ? null : null)
                  setNewOriginalAfterReject(null)
                  setSelectedRejectReasons(new Set())
                  setCustomRejectReason('')
                }
                setShowRejectPanel(p => !p)
              }}
              disabled={isGroupRejected || allGroupAccepted}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                border: '0.0625rem solid oklch(0.88 0.04 25)',
                borderRadius: '0.25rem',
                backgroundColor: isGroupRejected ? 'oklch(0.94 0.04 25)' : hasPartialRejects ? 'oklch(0.97 0.02 25)' : 'oklch(1 0 0)',
                fontSize: '0.75rem', fontWeight: 600,
                color: (isGroupRejected || allGroupAccepted) ? 'oklch(0.45 0.14 25)' : 'oklch(0.55 0.14 25)',
                cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer',
                opacity: (isGroupRejected || allGroupAccepted) ? 0.7 : 1,
              }}
              aria-expanded={showRejectPanel}
            >
              <X style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              {isGroupRejected ? 'Rejected' : hasPartialRejects ? `Reject (${rejectedDocIds.size} rejected)` : 'Reject'}
              {!isGroupRejected && !allGroupAccepted && <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />}
            </button>
            
            {/* Reject Panel Popover */}
            {showRejectPanel && !isGroupRejected && !allGroupAccepted && (() => {
              const isMultiDoc = effectiveDocs.length > 2
              const currentOriginalDocId = effectiveOriginalId
              const isRejectingOriginal = rejectTargetDocId !== null && rejectTargetDocId === currentOriginalDocId
              const remainingAfterReject = rejectTargetDocId
                ? effectiveDocs.filter(d => d.id !== rejectTargetDocId)
                : []
              const canProceedFromSelect = rejectTargetDocId !== null && (!isRejectingOriginal || newOriginalAfterReject !== null)

              return (
              <>
                <div
                  onClick={() => { setShowRejectPanel(false); setRejectTargetDocId(null); setNewOriginalAfterReject(null); setRejectStep('select'); }}
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
                  {/* Already rejected docs with undo */}
                  {hasPartialRejects && rejectStep === 'select' && (() => {
                    const rejectedDocsList = groupDocs.filter(d => rejectedDocIds.has(d.id))
                    return (
                      <div style={{
                        marginBlockEnd: '0.625rem',
                        paddingBlockEnd: '0.625rem',
                        borderBlockEnd: '0.0625rem solid oklch(0.91 0.01 260)',
                      }}>
                        <p style={{
                          fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.5 0.01 260)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          marginBlockEnd: '0.375rem',
                        }}>
                          Rejected ({rejectedDocsList.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {rejectedDocsList.map(doc => {
                            const rejectInfo = rejectedDocs.get(doc.id)
                            return (
                              <div key={doc.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.375rem 0.625rem', borderRadius: '0.25rem',
                                backgroundColor: 'oklch(0.97 0.01 260)',
                                border: '0.0625rem solid oklch(0.91 0.01 260)',
                              }}>
                                <FileText style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                                <div style={{ flex: 1, minInlineSize: 0 }}>
                                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.4 0.01 260)' }}>
                                    {doc.label} (Pg {doc.pageNumber})
                                  </span>
                                  {rejectInfo && (
                                    <span style={{ fontSize: '0.5625rem', color: 'oklch(0.55 0.01 260)', marginInlineStart: '0.375rem' }}>
                                      {rejectInfo.reason}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUndoRejectDoc(doc.id)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                                    padding: '0.1875rem 0.5rem',
                                    border: '0.0625rem solid oklch(0.85 0.01 260)',
                                    borderRadius: '0.1875rem',
                                    backgroundColor: 'oklch(1 0 0)',
                                    fontSize: '0.5625rem', fontWeight: 600, color: 'oklch(0.45 0.01 260)',
                                    cursor: 'pointer', flexShrink: 0,
                                  }}
                                >
                                  <Undo2 style={{ inlineSize: '0.5rem', blockSize: '0.5rem' }} />
                                  Undo
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Step 1: Select document (3+ docs only) */}
                  {isMultiDoc && rejectStep === 'select' && (
                    <>
                      <p style={{
                        fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.35 0.01 260)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        marginBlockEnd: '0.25rem',
                      }}>
                        {hasPartialRejects ? 'Reject Another Document' : 'Select Document to Reject'}
                      </p>
                      <p style={{
                        fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)',
                        marginBlockEnd: '0.625rem', lineHeight: '1.4',
                      }}>
                        Choose which document does not belong in this group. It will appear in SPBinder as an independent record after the review.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {effectiveDocs.map(doc => {
                          const isSelected = rejectTargetDocId === doc.id
                          const isOrig = doc.id === currentOriginalDocId
                          return (
                            <label
                              key={doc.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 0.625rem', borderRadius: '0.25rem',
                                cursor: 'pointer',
                                border: isSelected ? '0.0625rem solid oklch(0.7 0.14 25)' : '0.0625rem solid oklch(0.91 0.01 260)',
                                backgroundColor: isSelected ? 'oklch(0.97 0.02 25)' : 'oklch(1 0 0)',
                              }}
                            >
                              <input
                                type="radio" name="reject-doc"
                                checked={isSelected}
                                onChange={() => { setRejectTargetDocId(doc.id); setNewOriginalAfterReject(null); }}
                                style={{ accentColor: 'oklch(0.5 0.14 25)', flexShrink: 0 }}
                              />
                              <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                                {doc.label} (Pg {doc.pageNumber})
                              </span>
                              {isOrig && (
                                <span style={{
                                  marginInlineStart: 'auto',
                                  fontSize: '0.5625rem', fontWeight: 700,
                                  padding: '0.0625rem 0.3125rem', borderRadius: '0.125rem',
                                  backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)',
                                }}>
                                  Current Original
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>

                      {/* If rejecting Original, ask for new Original */}
                      {isRejectingOriginal && remainingAfterReject.length > 0 && (
                        <div style={{
                          marginBlockStart: '0.625rem', paddingBlockStart: '0.625rem',
                          borderBlockStart: '0.0625rem solid oklch(0.91 0.01 260)',
                        }}>
                          <p style={{
                            fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.5 0.14 60)',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            marginBlockEnd: '0.375rem',
                          }}>
                            Select New Original
                          </p>
                          <p style={{
                            fontSize: '0.5625rem', color: 'oklch(0.5 0.01 260)',
                            marginBlockEnd: '0.375rem', lineHeight: '1.4',
                          }}>
                            You are rejecting the current Original. Choose which remaining document should become the new Original.
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {remainingAfterReject.map(doc => (
                              <label
                                key={doc.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                                  padding: '0.375rem 0.5rem', borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  border: newOriginalAfterReject === doc.id ? '0.0625rem solid oklch(0.7 0.14 145)' : '0.0625rem solid oklch(0.91 0.01 260)',
                                  backgroundColor: newOriginalAfterReject === doc.id ? 'oklch(0.97 0.02 145)' : 'oklch(1 0 0)',
                                }}
                              >
                                <input
                                  type="radio" name="new-original"
                                  checked={newOriginalAfterReject === doc.id}
                                  onChange={() => setNewOriginalAfterReject(doc.id)}
                                  style={{ accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }}
                                />
                                <FileText style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                                  {doc.label} (Pg {doc.pageNumber})
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', marginBlockStart: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => setRejectStep('reason')}
                          disabled={!canProceedFromSelect}
                          style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                            padding: '0.375rem 0.5rem', border: 'none', borderRadius: '0.25rem',
                            backgroundColor: !canProceedFromSelect ? 'oklch(0.9 0.01 260)' : 'oklch(0.55 0.14 25)',
                            fontSize: '0.6875rem', fontWeight: 600,
                            color: !canProceedFromSelect ? 'oklch(0.6 0.01 260)' : 'oklch(1 0 0)',
                            cursor: !canProceedFromSelect ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Next: Provide Reason
                          <ChevronRight style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step 2 (or only step for 2-doc groups): Reason */}
                  {(rejectStep === 'reason' || !isMultiDoc) && (
                    <>
                      {isMultiDoc && (
                        <button
                          type="button"
                          onClick={() => setRejectStep('select')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            marginBlockEnd: '0.5rem',
                            padding: 0, border: 'none', background: 'none',
                            fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)',
                            cursor: 'pointer',
                          }}
                        >
                          <ChevronLeft style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                          Back to selection
                        </button>
                      )}
                      <p style={{
                        fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.35 0.01 260)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        marginBlockEnd: '0.25rem',
                      }}>
                        {rejectTargetDocId && isMultiDoc
                          ? `Reject ${effectiveDocs.find(d => d.id === rejectTargetDocId)?.label ?? 'Document'}`
                          : 'Reject All Documents'}
                      </p>
                      <p style={{
                        fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)',
                        marginBlockEnd: '0.625rem', lineHeight: '1.4',
                      }}>
                        {rejectTargetDocId && isMultiDoc
                          ? 'This document will be available in SPBinder as an independent record once the review is complete. Remaining documents will continue in this group.'
                          : 'All documents in this group will be available in SPBinder as independent records once the review is complete.'}
                      </p>

                      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                        <legend className="sr-only">Select rejection reasons</legend>
                        {REJECTION_REASONS.map((reason) => (
                          <label
                            key={reason.id}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              backgroundColor: selectedRejectReasons.has(reason.id) ? 'oklch(0.95 0.02 25)' : 'transparent',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedRejectReasons.has(reason.id)}
                              onChange={() => toggleRejectReason(reason.id)}
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
                        
                        <label
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            backgroundColor: selectedRejectReasons.has('custom') ? 'oklch(0.95 0.02 25)' : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRejectReasons.has('custom')}
                            onChange={() => toggleRejectReason('custom')}
                            style={{ accentColor: 'oklch(0.5 0.14 25)', flexShrink: 0, marginTop: '0.125rem' }}
                          />
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                            Other (specify below)
                          </span>
                        </label>
                        
                        {selectedRejectReasons.has('custom') && (
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
                          onClick={handleRejectDoc}
                          disabled={!hasRejectSelection}
                          style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                            padding: '0.375rem 0.5rem',
                            border: 'none',
                            borderRadius: '0.25rem',
                            backgroundColor: !hasRejectSelection ? 'oklch(0.9 0.01 260)' : 'oklch(0.55 0.14 25)',
                            fontSize: '0.6875rem', fontWeight: 600,
                            color: !hasRejectSelection ? 'oklch(0.6 0.01 260)' : 'oklch(1 0 0)',
                            cursor: !hasRejectSelection ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <X style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                          Confirm Rejection
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
              )
            })()}
          </div>

          {(isGroupRejected || hasPartialRejects) ? (
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
              Undo Rejection{hasPartialRejects && !isGroupRejected ? ` (${rejectedDocIds.size})` : ''}
            </button>
          ) : null}

          {/* Accept split button -- primary area = undo (when available) or label, chevron = dropdown */}
          <div ref={acceptDropdownRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', borderRadius: '0.25rem', overflow: 'hidden' }}>
              {lastUndoEntry ? (
                /* Undo mode: main area reverses last action */
                <button
                  type="button"
                  onClick={handleUndoLastAction}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.375rem 0.75rem', border: 'none',
                    borderRadius: '0.25rem 0 0 0.25rem',
                    backgroundColor: 'oklch(0.96 0.02 145)',
                    fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.35 0.14 145)',
                    cursor: 'pointer',
                    borderInlineEnd: '0.0625rem solid oklch(0.88 0.06 145)',
                  }}
                  title={`Undo: ${lastUndoEntry.label}`}
                >
                  <Undo2 style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
                  Undo: {lastUndoEntry.label}
                </button>
              ) : (
                /* Default mode: label only */
                <button
                  type="button"
                  onClick={() => setShowAcceptDropdown(!showAcceptDropdown)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.375rem 0.75rem', border: 'none',
                    borderRadius: '0.25rem 0 0 0.25rem',
                    backgroundColor: 'oklch(0.45 0.18 145)',
                    fontSize: '0.75rem', fontWeight: 600, color: 'oklch(1 0 0)',
                    cursor: 'pointer',
                  }}
                >
                  <Check style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
                  Accept
                </button>
              )}
              {/* Chevron dropdown trigger */}
              <button
                type="button"
                onClick={() => setShowAcceptDropdown(!showAcceptDropdown)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0.375rem 0.5rem', border: 'none',
                  borderRadius: '0 0.25rem 0.25rem 0',
                  backgroundColor: lastUndoEntry ? 'oklch(0.93 0.04 145)' : 'oklch(0.40 0.16 145)',
                  cursor: 'pointer',
                }}
                aria-label="More accept options"
              >
                <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: lastUndoEntry ? 'oklch(0.35 0.14 145)' : 'oklch(1 0 0)' }} />
              </button>
            </div>

            {showAcceptDropdown && (
              <div style={{
                position: 'absolute', insetBlockStart: '100%', insetInlineEnd: 0,
                marginBlockStart: '0.25rem', zIndex: 50,
                inlineSize: '16rem',
                backgroundColor: 'oklch(1 0 0)',
                borderRadius: '0.375rem',
                border: '0.0625rem solid oklch(0.88 0.01 260)',
                boxShadow: '0 0.25rem 0.75rem oklch(0 0 0 / 0.12)',
                overflow: 'hidden',
              }}>
                {/* Tier 2: Accept This Pair */}
                <button
                  type="button"
                  onClick={() => { handleAcceptGroup(); setShowAcceptDropdown(false) }}
                  disabled={isGroupRejected || allGroupAccepted}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '0.125rem',
                    inlineSize: '100%', padding: '0.5rem 0.75rem',
                    border: 'none', backgroundColor: 'transparent',
                    cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer',
                    opacity: (isGroupRejected || allGroupAccepted) ? 0.4 : 1,
                    textAlign: 'start',
                  }}
                  onMouseEnter={e => { if (!isGroupRejected && !allGroupAccepted) (e.currentTarget.style.backgroundColor = 'oklch(0.97 0.003 240)') }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Check style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.45 0.18 145)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                      Accept This Pair
                    </span>
                  </div>
                  <span style={{ fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)', paddingInlineStart: '1.125rem' }}>
                    Confirm AI classification for the active pair
                  </span>
                </button>

                <div style={{ blockSize: '0.0625rem', backgroundColor: 'oklch(0.92 0.005 260)' }} />

                {/* Tier 1: Accept High Confidence */}
                <button
                  type="button"
                  onClick={handleAcceptHighConfidence}
                  disabled={highConfidenceUnreviewed.length === 0}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '0.125rem',
                    inlineSize: '100%', padding: '0.5rem 0.75rem',
                    border: 'none', backgroundColor: 'transparent',
                    cursor: highConfidenceUnreviewed.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: highConfidenceUnreviewed.length === 0 ? 0.4 : 1,
                    textAlign: 'start',
                  }}
                  onMouseEnter={e => { if (highConfidenceUnreviewed.length > 0) (e.currentTarget.style.backgroundColor = 'oklch(0.97 0.003 240)') }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Sparkles style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.16 145)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                      Accept High Confidence
                    </span>
                    {highConfidenceUnreviewed.length > 0 && (
                      <span style={{
                        fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                        padding: '0.0625rem 0.25rem', borderRadius: '0.625rem',
                        backgroundColor: 'oklch(0.92 0.04 145)', color: 'oklch(0.4 0.14 145)',
                      }}>
                        {highConfidenceUnreviewed.length}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)', paddingInlineStart: '1.125rem' }}>
                    Bulk accept all pairs with High confidence
                  </span>
                </button>

                <div style={{ blockSize: '0.0625rem', backgroundColor: 'oklch(0.92 0.005 260)' }} />

                {/* Tier 3: Accept Remaining */}
                <button
                  type="button"
                  onClick={handleBulkAcceptRemaining}
                  disabled={allUnreviewed.length === 0}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '0.125rem',
                    inlineSize: '100%', padding: '0.5rem 0.75rem',
                    border: 'none', backgroundColor: 'transparent',
                    cursor: allUnreviewed.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: allUnreviewed.length === 0 ? 0.4 : 1,
                    textAlign: 'start',
                  }}
                  onMouseEnter={e => { if (allUnreviewed.length > 0) (e.currentTarget.style.backgroundColor = 'oklch(0.97 0.003 240)') }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <CheckCircle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.55 0.12 250)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                      Accept Remaining
                    </span>
                    {allUnreviewed.length > 0 && (
                      <span style={{
                        fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                        padding: '0.0625rem 0.25rem', borderRadius: '0.625rem',
                        backgroundColor: 'oklch(0.92 0.02 260)', color: 'oklch(0.45 0.01 260)',
                      }}>
                        {allUnreviewed.length}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)', paddingInlineStart: '1.125rem' }}>
                    Accept all unreviewed pairs (warns if Moderate/Low exist)
                  </span>
                </button>
              </div>
            )}
          </div>

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

      {/* Bulk accept warning modal */}
      {showBulkWarning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'oklch(0 0 0 / 0.4)',
        }}>
          <div style={{
            inlineSize: '28rem', backgroundColor: 'oklch(1 0 0)',
            borderRadius: '0.5rem', boxShadow: '0 0.5rem 2rem oklch(0 0 0 / 0.2)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.875rem 1rem',
              backgroundColor: 'oklch(0.98 0.01 60)',
              borderBlockEnd: '0.0625rem solid oklch(0.9 0.03 60)',
            }}>
              <AlertTriangle style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.65 0.18 60)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'oklch(0.3 0.01 260)' }}>
                Unreviewed Pairs Need Attention
              </span>
            </div>

            <div style={{ padding: '0.875rem 1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'oklch(0.4 0.01 260)', margin: '0 0 0.625rem 0' }}>
                {unreviewedModLow.length} pair{unreviewedModLow.length > 1 ? 's' : ''} with Moderate or Low confidence {unreviewedModLow.length > 1 ? 'have' : 'has'} not been individually reviewed:
              </p>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.25rem',
                maxBlockSize: '8rem', overflowY: 'auto',
                padding: '0.5rem', borderRadius: '0.25rem',
                backgroundColor: 'oklch(0.98 0.003 240)',
                border: '0.0625rem solid oklch(0.92 0.005 260)',
              }}>
                {unreviewedModLow.map(g => {
                  const avg = Math.round(g.averageConfidence * 100)
                  const label = avg >= 70 ? 'Moderate' : 'Low'
                  const color = avg >= 70 ? 'oklch(0.65 0.18 60)' : 'oklch(0.55 0.22 25)'
                  return (
                    <div key={g.formType} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.25rem 0.375rem',
                    }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)' }}>
                        {g.formType} ({g.formEntity})
                      </span>
                      <span style={{
                        fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                        padding: '0.0625rem 0.25rem', borderRadius: '0.1875rem',
                        backgroundColor: `${color} / 0.12`, color,
                      }}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderBlockStart: '0.0625rem solid oklch(0.92 0.005 260)',
              backgroundColor: 'oklch(0.99 0.003 240)',
            }}>
              <button
                type="button"
                onClick={() => {
                  setShowBulkWarning(false)
                  if (unreviewedModLow.length > 0) {
                    const idx = groups.findIndex(g => g.formType === unreviewedModLow[0].formType)
                    if (idx >= 0) selectGroup(idx)
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.88 0.01 260)',
                  borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)',
                  fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)',
                  cursor: 'pointer',
                }}
              >
                Review These First
              </button>
              <button
                type="button"
                onClick={executeBulkAccept}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.75rem', border: 'none',
                  borderRadius: '0.25rem', backgroundColor: 'oklch(0.65 0.18 60)',
                  fontSize: '0.75rem', fontWeight: 600, color: 'oklch(1 0 0)',
                  cursor: 'pointer',
                }}
              >
                Accept Anyway
              </button>
            </div>
          </div>
        </div>
      )}
      
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
              const thisGroupDocs = getUniqueDocsInGroup(group.records)
              const thisGroupRejectedCount = thisGroupDocs.filter(d => rejectedDocs.has(d.id)).length

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
                      type="checkbox" checked={groupAllAccepted}
                      aria-label={`${group.formType} group matched`}
                      style={{ inlineSize: '0.875rem', blockSize: '0.875rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0, marginBlockStart: '0.0625rem', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isThisGroupRejected || allGroupAccepted) return
                        if (groupAllAccepted) {
                          for (const r of group.records) {
                            undo(getItemKey(r), 'duplicate', r.confidenceLevel)
                          }
                          pruneUndoStack(group.formType)
                        } else {
                          for (const r of group.records) {
                            const key = getItemKey(r)
                            if (decisions[key] !== 'accepted') {
                              accept(key, 'duplicate', r.confidenceLevel, 'manual')
                            }
                          }
                          logAuditEntry('sidebar_checkbox', [group.formType])
                          pushUndoEntry('sidebar_checkbox', [group.formType], `Accept ${group.formType}`)
                        }
                      }}
                      onChange={() => {}}
                      disabled={isThisGroupRejected || allGroupAccepted}
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
                        {thisGroupRejectedCount > 0 && !isThisGroupRejected && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.125rem',
                            fontSize: '0.5625rem', fontWeight: 600,
                            padding: '0.0625rem 0.25rem', borderRadius: '0.125rem',
                            backgroundColor: 'oklch(0.92 0.02 260)', color: 'oklch(0.5 0.01 260)',
                          }}>
                            {thisGroupRejectedCount} rejected
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
                        const rawOverrideId = overriddenOriginals.get(group.formType)
                        // Validate: override only valid if the overridden doc is NOT rejected
                        const groupOverrideId = rawOverrideId && !rejectedDocs.has(rawOverrideId) ? rawOverrideId : undefined
                        return docs.map(doc => {
                          const docIsOriginal = groupOverrideId
                            ? doc.id === groupOverrideId
                            : doc.aiOriginal
                          const isDocRejected = rejectedDocs.has(doc.id)
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
                                opacity: isDocRejected ? 0.6 : 1,
                              }}
                            >
                              <FileText style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                              <span style={{
                                fontSize: '0.6875rem', fontWeight: isActive ? 700 : 500,
                                color: 'oklch(0.25 0.01 260)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                textDecoration: isDocRejected ? 'line-through' : 'none',
                              }}>
                                {doc.label}
                              </span>
                              <span style={{
                                marginInlineStart: 'auto', flexShrink: 0,
                                fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                                backgroundColor: isDocRejected ? 'oklch(0.92 0.04 25)' : docIsOriginal ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                                color: isDocRejected ? 'oklch(0.5 0.16 25)' : docIsOriginal ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                              }}>
                                {isDocRejected ? 'Rejected' : docIsOriginal ? 'Original' : 'Duplicate'}
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
                                All documents will be available in SPBinder as independent records once the review is complete
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

                        {/* Rejection reason inline */}
                        {panelRejectionInfo && (
                          <div style={{
                            marginBlockStart: '0.5rem',
                            padding: '0.5rem 0.625rem',
                            borderRadius: '0.25rem',
                            backgroundColor: 'oklch(1 0 0)',
                            border: '0.0625rem solid oklch(0.88 0.01 260)',
                          }}>
                            <span style={{
                              fontSize: '0.5625rem', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                              color: 'oklch(0.5 0.01 260)',
                            }}>
                              Reason
                            </span>
                            <p style={{
                              margin: '0.125rem 0 0', fontSize: '0.6875rem', fontWeight: 600,
                              color: 'oklch(0.3 0.01 260)', lineHeight: 1.4,
                            }}>
                              {panelRejectionInfo.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Override comparison table when user has overridden */}
                    {!panelGroupRejected && isGroupOverridden && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '0.375rem',
                        padding: '0.5rem 0.625rem',
                        marginBlockEnd: '0.625rem',
                        borderRadius: '0.25rem',
                        border: '0.0625rem solid oklch(0.82 0.08 60)',
                        backgroundColor: 'oklch(0.99 0.01 60)',
                      }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.4 0.14 60)' }}>
                          User has overridden the AI classification
                        </span>

                        {/* AI Recommended row */}
                        <div style={{
                          padding: '0.375rem 0.5rem', borderRadius: '0.25rem',
                          backgroundColor: 'oklch(0.97 0.005 260)',
                          border: '0.0625rem solid oklch(0.93 0.005 260)',
                        }}>
                          <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>
                            AI Recommended
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBlockStart: '0.25rem' }}>
                            {groupDocs.map(doc => {
                              const isRejected = rejectedDocIds.has(doc.id)
                              const isAIOrig = doc.id === aiOriginalId
                              return (
                                <span key={doc.id} style={{
                                  fontSize: '0.625rem', fontWeight: 600,
                                  padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
                                  backgroundColor: isRejected ? 'oklch(0.94 0.01 260)' : isAIOrig ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                                  color: isRejected ? 'oklch(0.6 0.01 260)' : isAIOrig ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                                  textDecoration: isRejected ? 'line-through' : 'none',
                                  opacity: isRejected ? 0.6 : 1,
                                }}>
                                  {doc.label}: {isRejected ? 'Rejected' : isAIOrig ? 'Original' : 'Duplicate'}
                                </span>
                              )
                            })}
                          </div>
                        </div>

                        {/* User Changed To row */}
                        <div style={{
                          padding: '0.375rem 0.5rem', borderRadius: '0.25rem',
                          backgroundColor: 'oklch(1 0 0)',
                          border: '0.0625rem solid oklch(0.91 0.005 260)',
                        }}>
                          <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>
                            User Changed To
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBlockStart: '0.25rem' }}>
                            {groupDocs.map(doc => {
                              const isRejected = rejectedDocIds.has(doc.id)
                              const isUserOrig = doc.id === effectiveOriginalId
                              const isAIOrig = doc.id === aiOriginalId
                              const changed = !isRejected && (
                                (isAIOrig && !isUserOrig) || (!isAIOrig && isUserOrig)
                              )
                              return (
                                <span key={doc.id} style={{
                                  fontSize: '0.625rem', fontWeight: 600,
                                  padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
                                  backgroundColor: isRejected ? 'oklch(0.94 0.01 260)' : isUserOrig ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                                  color: isRejected ? 'oklch(0.6 0.01 260)' : isUserOrig ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                                  outline: changed ? '0.125rem solid oklch(0.65 0.14 60)' : 'none',
                                  textDecoration: isRejected ? 'line-through' : 'none',
                                  opacity: isRejected ? 0.6 : 1,
                                }}>
                                  {doc.label}: {isRejected ? 'Rejected' : isUserOrig ? 'Original' : 'Duplicate'}
                                  {changed && ' *'}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Document tabs and AI analysis -- hidden when rejected */}
                    {!panelGroupRejected && (
                    <>
                    <nav style={{
                      display: 'flex', gap: '0.125rem',
                      marginBlockEnd: '0.625rem',
                      borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                    }} aria-label="Document analysis tabs">
                      {effectiveDocs.map(doc => {
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
                    </>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Rejection summary is now shown inline in the Review Outcome panel above */}

          {/* ═══ PANEL 2: Field Comparison (hidden when rejected) ═══ */}
          {!isGroupRejected && comparedValues.length > 0 && (
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

          {/* ═══ PANEL 3: Document Viewer (hidden when rejected) ═══ */}
          {!isGroupRejected && (
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
          )}
        </div>
      </div>
    </div>
  )
}
