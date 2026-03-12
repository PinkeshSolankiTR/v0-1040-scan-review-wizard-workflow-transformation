'use client'

/**
 * DESIGN VARIANT E: "Document Comparison"
 * Production-style split view with left sidebar document tree,
 * two side-by-side PDF viewers, and a vertical toolbar between them.
 * Matches the existing Superseded UI pattern from the production app.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
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
  CheckCircle2,
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
  RefreshCw,
  User,
  FileEdit,
  Info,
  Columns2,
  X,
  CheckCircle,
} from 'lucide-react'
import type { SupersededRecord, OverrideDetail } from '@/lib/types'

/* ── Panel visibility state ── */
type PanelId = 'documents' | 'aiAnalysis' | 'fieldComparison'

/* ── Predefined override reasons based on Superseded Decision Spec ── */
  const OVERRIDE_REASONS = [
  { id: 'corrected', label: 'Corrected form detected - should be retained' },
  { id: 'more-data', label: 'More complete data exists on this document' },
  ] as const

/* ── Predefined rejection reasons ── */
const REJECTION_REASONS = [
  { id: 'not-related', label: 'Not related documents', description: 'These forms are not connected to each other' },
  { id: 'different-years', label: 'Different tax years', description: 'Documents are from different filing periods' },
  { id: 'different-taxpayers', label: 'Different taxpayers', description: 'Documents belong to different people' },
  { id: 'incomplete-scan', label: 'Incomplete or unclear scan', description: 'Document quality prevents proper analysis' },
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

  /* Track local flipped labels per group (key = formType, value = superseded index that was overridden) */
  const [flippedGroups, setFlippedGroups] = useState<Map<string, number>>(new Map())
  
  /* Override panel state - two-step flow */
  const [showOverridePanel, setShowOverridePanel] = useState(false)
  const [overrideStep, setOverrideStep] = useState<'select' | 'reason'>('select')
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null) // which doc to mark as Original
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  
  /* Rejection state -- per-document tracking.
     Key = engagementPageId, Value = { reason, detail, formType }
     A rejected doc is removed from its group and moves to SPBinder.
     For 3+ page groups: step-based flow (select doc -> reason -> confirm)
     For 2-page groups: direct reject all (reason -> confirm) */
  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [rejectStep, setRejectStep] = useState<'select' | 'reason'>('select')
  const [rejectTargetPageId, setRejectTargetPageId] = useState<string | null>(null) // null = reject all
  const [newOriginalAfterReject, setNewOriginalAfterReject] = useState<string | null>(null) // if rejecting the Original, user picks new one
  const [selectedRejectReasons, setSelectedRejectReasons] = useState<Set<string>>(new Set())
  const [customRejectReason, setCustomRejectReason] = useState('')
  const [rejectedDocs, setRejectedDocs] = useState<Map<string, { reason: string; detail: string; formType: string }>>(new Map())

  const toggleRejectReason = (id: string) => {
    setSelectedRejectReasons(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }
  const hasRejectSelection = selectedRejectReasons.size > 0 || customRejectReason.trim().length > 0

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

  // Derived: which page IDs are rejected in the active group
  const rejectedPageIds = useMemo(() => {
    if (!activeGroup) return new Set<string>()
    const ids = new Set<string>()
    for (const r of activeGroup.records) {
      if (rejectedDocs.has(String(r.engagementPageId))) ids.add(String(r.engagementPageId))
    }
    return ids
  }, [activeGroup, rejectedDocs])

  // Effective records = group records minus rejected ones
  const effectiveRecords = useMemo(() => {
    if (!activeGroup) return []
    return activeGroup.records.filter(r => !rejectedPageIds.has(String(r.engagementPageId)))
  }, [activeGroup, rejectedPageIds])

  // Is the entire group rejected (all docs rejected)?
  const isGroupRejected = activeGroup ? effectiveRecords.length === 0 : false
  // Are some docs rejected (partial)?
  const hasPartialRejects = rejectedPageIds.size > 0 && !isGroupRejected

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
    logAuditEntry('individual_accept', [activeGroup.formType])
    pushUndoEntry('individual_accept', [activeGroup.formType], `Accept ${activeGroup.formType}`)

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
        return group && group.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
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
          undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
        }
      }
    }
    // Remove this entry from the stack
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

  // Close dropdown when clicking outside
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
      const avgConf = g.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / g.records.length
      const isAccepted = g.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
      const isRejected = g.records.every(r => rejectedDocs.has(String(r.engagementPageId)))
      const isOverridden = flippedGroups.has(g.formType)
      return Math.round(avgConf * 100) >= 90 && !isAccepted && !isRejected && !isOverridden
    })
  }, [groups, decisions, rejectedDocs, flippedGroups])

  const allUnreviewed = useMemo(() => {
    return groups.filter(g => {
      const isAccepted = g.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
      const isRejected = g.records.every(r => rejectedDocs.has(String(r.engagementPageId)))
      const isOverridden = flippedGroups.has(g.formType)
      return !isAccepted && !isRejected && !isOverridden
    })
  }, [groups, decisions, rejectedDocs, flippedGroups])

  const unreviewedModLow = useMemo(() => {
    return allUnreviewed.filter(g => {
      const avgConf = g.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / g.records.length
      return Math.round(avgConf * 100) < 90
    })
  }, [allUnreviewed])

  /* Tier 1: Accept High Confidence */
  const handleAcceptHighConfidence = () => {
    const groupKeys: string[] = []
    for (const g of highConfidenceUnreviewed) {
      for (const r of g.records) {
        const key = `sup-pg${r.engagementPageId}`
        if (decisions[key] !== 'accepted') {
          accept(key, 'superseded', r.confidenceLevel, 'manual')
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
        const key = `sup-pg${r.engagementPageId}`
        if (decisions[key] !== 'accepted') {
          accept(key, 'superseded', r.confidenceLevel, 'manual')
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
  
  // Toggle the flip state -- store which superseded index was overridden
  setFlippedGroups(prev => {
  const next = new Map(prev)
  if (isAlreadyFlipped) next.delete(activeGroup.formType)
  else next.set(activeGroup.formType, selectedSupersededIdx)
  return next
  })
  
  // Log override for each record in the group
  const overriddenRecord = activeGroup.supersededRecords[selectedSupersededIdx]
  for (const r of activeGroup.records) {
  const key = `sup-pg${r.engagementPageId}`
  // Determine the new decision for this specific record
  let newDecision: string
  if (r.engagementPageId === overriddenRecord?.engagementPageId) {
    newDecision = 'Original' // this superseded becomes original
  } else if (r.decisionType === 'Original') {
    newDecision = 'Superseded' // original becomes superseded
  } else {
    newDecision = 'Superseded' // other superseded stay superseded
  }
  const detail: OverrideDetail = {
  originalAIDecision: `Page ${r.engagementPageId} = ${r.decisionType}`,
  userOverrideDecision: `Page ${r.engagementPageId} = ${newDecision}`,
  overrideReason: reasonText,
  formType: r.documentRef?.formType ?? 'Unknown',
  fieldContext: r.comparedValues ?? [],
  }
  override(key, 'superseded', r.confidenceLevel, detail)
    }
    
    // Reset state -- reset superseded index since the list has changed
    setSelectedSupersededIdx(0)
    setShowOverridePanel(false)
    setOverrideStep('select')
    setSelectedDocument(null)
    setSelectedReason(null)
    setCustomReason('')
  }
  
  const handleUndoOverride = () => {
    if (!activeGroup) return
    setFlippedGroups(prev => {
      const next = new Map(prev)
      next.delete(activeGroup.formType)
      return next
    })
    setSelectedSupersededIdx(0)
    setShowOverridePanel(false)
    setOverrideStep('select')
    setSelectedDocument(null)
    setSelectedReason(null)
    setCustomReason('')
  }

  /* ── Reject handler: mark docs as not qualifying for superseded review ── */
  const handleRejectDoc = () => {
    if (!activeGroup) return
    const predefinedLabels = Array.from(selectedRejectReasons)
      .filter(id => id !== 'custom')
      .map(id => REJECTION_REASONS.find(r => r.id === id)?.label ?? id)
    const allLabels = [...predefinedLabels, ...(selectedRejectReasons.has('custom') && customRejectReason.trim() ? [customRejectReason.trim()] : [])]
    const reasonLabel = allLabels.length > 0 ? allLabels.join('; ') : 'Other'
    const detail = allLabels.join('. ')
    
    if (rejectTargetPageId) {
      // Partial reject: single document
      setRejectedDocs(prev => {
        const next = new Map(prev)
        next.set(rejectTargetPageId, { reason: reasonLabel, detail, formType: activeGroup.formType })
        return next
      })

      // If rejecting the Original and user picked a new Original, apply override
      const isRejectingOriginal = activeGroup.originalRecord &&
        String(activeGroup.originalRecord.engagementPageId) === rejectTargetPageId
      if (isRejectingOriginal && newOriginalAfterReject) {
        const newOrigIdx = activeGroup.supersededRecords.findIndex(
          s => String(s.engagementPageId) === newOriginalAfterReject
        )
        if (newOrigIdx >= 0) {
          setFlippedGroups(prev => {
            const next = new Map(prev)
            next.set(activeGroup.formType, newOrigIdx)
            return next
          })
        }
      }
    } else {
      // Reject all: every doc in the group
      setRejectedDocs(prev => {
        const next = new Map(prev)
        for (const r of activeGroup.records) {
          next.set(String(r.engagementPageId), { reason: reasonLabel, detail, formType: activeGroup.formType })
        }
        return next
      })
    }
    
    // Reset state
    setShowRejectPanel(false)
    setRejectStep('select')
    setRejectTargetPageId(null)
    setNewOriginalAfterReject(null)
    setSelectedRejectReasons(new Set())
    setCustomRejectReason('')
    setSelectedSupersededIdx(0)
  }

  const handleUndoRejectDoc = (pageId: string) => {
    setRejectedDocs(prev => {
      const next = new Map(prev)
      next.delete(pageId)
      return next
    })
    setSelectedSupersededIdx(0)
  }

  const handleUndoRejectAll = () => {
    if (!activeGroup) return
    setRejectedDocs(prev => {
      const next = new Map(prev)
      for (const r of activeGroup.records) {
        next.delete(String(r.engagementPageId))
      }
      return next
    })
    setSelectedSupersededIdx(0)
  }

  /* ── Selected superseded record index (for multi-page groups) ── */
  const [selectedSupersededIdx, setSelectedSupersededIdx] = useState(0)

  // Reset to first superseded when group changes
  useEffect(() => {
    setSelectedSupersededIdx(0)
  }, [selectedGroupIdx])

  /* ── Determine left/right docs (respecting rejections + overrides) ── */
  const activeFlippedIdx = activeGroup ? flippedGroups.get(activeGroup.formType) : undefined
  const isActiveFlipped = activeFlippedIdx !== undefined

  // Effective original and superseded lists (excluding rejected docs)
  const effectiveOriginal = useMemo(() => {
    if (!activeGroup) return null
    if (isActiveFlipped) {
      // The overridden superseded record is the new Original
      const overriddenRecord = activeGroup.supersededRecords[activeFlippedIdx]
      if (overriddenRecord && !rejectedPageIds.has(String(overriddenRecord.engagementPageId))) {
        return overriddenRecord
      }
      return null
    }
    const orig = activeGroup.originalRecord
    return orig && !rejectedPageIds.has(String(orig.engagementPageId)) ? orig : null
  }, [activeGroup, isActiveFlipped, activeFlippedIdx, rejectedPageIds])

  const supersededList = useMemo(() => {
    if (!activeGroup) return []
    let list: SupersededRecord[]
    if (!isActiveFlipped) {
      list = activeGroup.supersededRecords
    } else {
      // Remove the flipped record from superseded, add the old original
      const remaining = activeGroup.supersededRecords.filter((_, i) => i !== activeFlippedIdx)
      list = activeGroup.originalRecord
        ? [...remaining, activeGroup.originalRecord]
        : remaining
    }
    // Filter out rejected docs
    return list.filter(r => !rejectedPageIds.has(String(r.engagementPageId)))
  }, [activeGroup, isActiveFlipped, activeFlippedIdx, rejectedPageIds])

  const safeIdx = Math.min(selectedSupersededIdx, Math.max(0, supersededList.length - 1))
  const leftDoc = supersededList[safeIdx] ?? null
  const rightDoc = effectiveOriginal

  /* ── Field comparison data for the selected pair ── */
  const comparedValues = useMemo(() => {
    if (!leftDoc) return []
    return leftDoc.comparedValues ?? []
  }, [leftDoc])

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
                  // Pre-select the currently overridden doc if override is active
                  const currentFlippedIdx = activeGroup ? flippedGroups.get(activeGroup.formType) : undefined
                  if (currentFlippedIdx !== undefined && activeGroup) {
                    const overriddenRecord = activeGroup.supersededRecords[currentFlippedIdx]
                    setSelectedDocument(overriddenRecord ? String(overriddenRecord.engagementPageId) : null)
                  } else {
                    setSelectedDocument(null)
                  }
                  setSelectedReason(null)
                  setCustomReason('')
                }
                setShowOverridePanel(p => !p)
              }}
              disabled={isGroupRejected || allGroupAccepted}
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
                cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer',
                opacity: (isGroupRejected || allGroupAccepted) ? 0.5 : 1,
              }}
              aria-expanded={showOverridePanel}
            >
              <ArrowLeftRight style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              {activeGroup && flippedGroups.has(activeGroup.formType)
                ? `Override Active (Pg ${activeGroup.supersededRecords[flippedGroups.get(activeGroup.formType) ?? 0]?.documentRef?.pageNumber ?? ''} is now Original)`
                : 'Override Classification'}
              <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
            </button>
            
            {/* Override Panel Popover - Two Step Flow */}
            {showOverridePanel && !allGroupAccepted && (
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

          {/* Reject Classification Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                if (!showRejectPanel) {
                  const isMultiPage = effectiveRecords.length > 2
                  setRejectStep(isMultiPage ? 'select' : 'reason')
                  setRejectTargetPageId(isMultiPage ? null : null) // null = reject all for 2-page
                  setNewOriginalAfterReject(null)
                  setSelectedRejectReasons(new Set())
                  setCustomRejectReason('')
                }
                setShowRejectPanel(p => !p)
              }}
              disabled={isGroupRejected || allGroupAccepted}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.88 0.04 25)',
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
              {isGroupRejected ? 'Rejected' : hasPartialRejects ? `Reject (${rejectedPageIds.size} rejected)` : 'Reject'}
              {!isGroupRejected && !allGroupAccepted && <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />}
            </button>
            
            {/* Reject Panel Popover */}
            {showRejectPanel && !isGroupRejected && !allGroupAccepted && (() => {
              const isMultiPage = effectiveRecords.length > 2
              // Determine if selected reject target is the current Original
              const currentOriginalPageId = effectiveOriginal ? String(effectiveOriginal.engagementPageId) : null
              const isRejectingOriginal = rejectTargetPageId !== null && rejectTargetPageId === currentOriginalPageId
              // Remaining docs after potential rejection (for new Original selection)
              const remainingAfterReject = rejectTargetPageId
                ? effectiveRecords.filter(r => String(r.engagementPageId) !== rejectTargetPageId)
                : []
              // Can proceed from select step?
              const canProceedFromSelect = rejectTargetPageId !== null && (!isRejectingOriginal || newOriginalAfterReject !== null)

              return (
              <>
                <div
                  onClick={() => { setShowRejectPanel(false); setRejectTargetPageId(null); setNewOriginalAfterReject(null); setRejectStep('select'); }}
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
                  {/* ── Already rejected docs with undo ── */}
                  {hasPartialRejects && rejectStep === 'select' && (() => {
                    const rejectedRecords = activeGroup?.records.filter(r => rejectedPageIds.has(String(r.engagementPageId))) ?? []
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
                          Rejected ({rejectedRecords.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {rejectedRecords.map(r => {
                            const pageId = String(r.engagementPageId)
                            const rejectInfo = rejectedDocs.get(pageId)
                            return (
                              <div
                                key={pageId}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                                  padding: '0.375rem 0.625rem', borderRadius: '0.25rem',
                                  backgroundColor: 'oklch(0.97 0.01 260)',
                                  border: '0.0625rem solid oklch(0.91 0.01 260)',
                                }}
                              >
                                <FileText style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                                <div style={{ flex: 1, minInlineSize: 0 }}>
                                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.4 0.01 260)' }}>
                                    Pg {r.documentRef?.pageNumber ?? r.engagementPageId}
                                  </span>
                                  {rejectInfo && (
                                    <span style={{ fontSize: '0.5625rem', color: 'oklch(0.55 0.01 260)', marginInlineStart: '0.375rem' }}>
                                      {rejectInfo.reason}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUndoRejectDoc(pageId)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                                    padding: '0.1875rem 0.5rem',
                                    border: '0.0625rem solid oklch(0.85 0.01 260)',
                                    borderRadius: '0.1875rem',
                                    backgroundColor: 'oklch(1 0 0)',
                                    fontSize: '0.5625rem', fontWeight: 600, color: 'oklch(0.45 0.01 260)',
                                    cursor: 'pointer',
                                    flexShrink: 0,
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

                  {/* ── Step 1: Select document (3+ pages only) ── */}
                  {isMultiPage && rejectStep === 'select' && (
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
                        {effectiveRecords.map(r => {
                          const pageId = String(r.engagementPageId)
                          const isSelected = rejectTargetPageId === pageId
                          const isOrig = pageId === currentOriginalPageId
                          return (
                            <label
                              key={pageId}
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
                                onChange={() => {
                                  setRejectTargetPageId(pageId)
                                  setNewOriginalAfterReject(null) // reset new original pick
                                }}
                                style={{ accentColor: 'oklch(0.5 0.14 25)', flexShrink: 0 }}
                              />
                              <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                                {r.documentRef?.formType ?? 'Document'} (Page {r.documentRef?.pageNumber ?? r.engagementPageId})
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
                            {remainingAfterReject.map(r => {
                              const pageId = String(r.engagementPageId)
                              return (
                                <label
                                  key={pageId}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.375rem 0.5rem', borderRadius: '0.25rem',
                                    cursor: 'pointer',
                                    border: newOriginalAfterReject === pageId ? '0.0625rem solid oklch(0.7 0.14 145)' : '0.0625rem solid oklch(0.91 0.01 260)',
                                    backgroundColor: newOriginalAfterReject === pageId ? 'oklch(0.97 0.02 145)' : 'oklch(1 0 0)',
                                  }}
                                >
                                  <input
                                    type="radio" name="new-original"
                                    checked={newOriginalAfterReject === pageId}
                                    onChange={() => setNewOriginalAfterReject(pageId)}
                                    style={{ accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0 }}
                                  />
                                  <FileText style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                                    {r.documentRef?.formType ?? 'Document'} (Page {r.documentRef?.pageNumber ?? r.engagementPageId})
                                  </span>
                                </label>
                              )
                            })}
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

                  {/* ── Step 2 (or only step for 2-page groups): Reason ── */}
                  {(rejectStep === 'reason' || !isMultiPage) && (
                    <>
                      {isMultiPage && (
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
                        {rejectTargetPageId && isMultiPage
                          ? `Reject Page ${activeGroup?.records.find(r => String(r.engagementPageId) === rejectTargetPageId)?.documentRef?.pageNumber ?? rejectTargetPageId}`
                          : 'Reject All Documents'}
                      </p>
                      <p style={{
                        fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)',
                        marginBlockEnd: '0.625rem', lineHeight: '1.4',
                      }}>
                        {rejectTargetPageId && isMultiPage
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
              onClick={handleUndoRejectAll}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.82 0.08 25)',
                borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)',
                fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.55 0.14 25)',
                cursor: 'pointer',
              }}
            >
              <Undo2 style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Undo Rejection{hasPartialRejects && !isGroupRejected ? ` (${rejectedPageIds.size})` : ''}
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
                  const avg = Math.round(g.records.reduce((s, r) => s + r.confidenceLevel, 0) / g.records.length * 100)
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
              const groupRejectedCount = group.records.filter(r => rejectedDocs.has(String(r.engagementPageId))).length
              const isThisGroupRejected = groupRejectedCount === group.records.length
              const hasThisGroupPartialRejects = groupRejectedCount > 0 && !isThisGroupRejected

              return (
                <div key={group.formType} style={{
                  borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                  backgroundColor: isThisGroupRejected 
                    ? 'oklch(0.96 0.02 25 / 0.3)' 
                    : isActiveGroup ? 'oklch(0.97 0.01 240 / 0.4)' : 'transparent',
                  opacity: isThisGroupRejected ? 0.7 : 1,
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
                      type="checkbox" checked={groupAccepted}
                      aria-label={`${group.formType} group accepted`}
                      style={{ inlineSize: '0.875rem', blockSize: '0.875rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0, marginBlockStart: '0.0625rem', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isThisGroupRejected || allGroupAccepted) return
                        if (groupAccepted) {
                          for (const r of group.records) {
                            undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
                          }
                          pruneUndoStack(group.formType)
                        } else {
                          for (const r of group.records) {
                            const key = `sup-pg${r.engagementPageId}`
                            if (decisions[key] !== 'accepted') {
                              accept(key, 'superseded', r.confidenceLevel, 'manual')
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
                        {group.formType}: {group.formEntity.toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockStart: '0.25rem', flexWrap: 'wrap' }}>
                        {isThisGroupRejected ? (
                          <span 
                            style={{
                              fontSize: '0.625rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                              padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                              backgroundColor: 'oklch(0.92 0.02 260)', color: 'oklch(0.45 0.01 260)',
                            }}
                            title="All documents in this group were rejected"
                          >
                            Not a Match
                          </span>
                        ) : hasThisGroupPartialRejects ? (
                          <>
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
                            <span 
                              style={{
                                fontSize: '0.5625rem', fontWeight: 600,
                                padding: '0.0625rem 0.25rem', borderRadius: '0.1875rem',
                                backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.5 0.14 25)',
                              }}
                            >
                              {groupRejectedCount} rejected
                            </span>
                          </>
                        ) : (
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
                        )}
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)' }}>
                          {hasThisGroupPartialRejects
                            ? `${group.records.length - groupRejectedCount} of ${group.records.length} pages`
                            : `${group.records.length} ${group.records.length === 1 ? 'page' : 'pages'}`}
                        </span>
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
                        const supIdx = group.supersededRecords.findIndex(s => s.engagementPageId === r.engagementPageId)
                        const flippedIdx = flippedGroups.get(group.formType)
                        const isFlipped = flippedIdx !== undefined
                        // When overridden: the selected superseded becomes Original,
                        // the original becomes Superseded, all others stay Superseded
                        let isSup: boolean
                        if (!isFlipped) {
                          isSup = r.decisionType === 'Superseded'
                        } else if (r.decisionType === 'Original') {
                          isSup = true // original becomes superseded
                        } else if (supIdx === flippedIdx) {
                          isSup = false // the overridden superseded becomes original
                        } else {
                          isSup = true // all other superseded stay superseded
                        }
                        // Match against the effective supersededList (accounts for overrides + rejections)
                        const effectiveSupIdx = isSup ? supersededList.findIndex(s => s.engagementPageId === r.engagementPageId) : -1
                        const isSelectedSup = gIdx === selectedGroupIdx && effectiveSupIdx >= 0 && effectiveSupIdx === safeIdx
                        // Highlight the Original record when it's the active group
                        const isSelectedOrig = gIdx === selectedGroupIdx && !isSup && !rejectedPageIds.has(String(r.engagementPageId))
                        const isHighlighted = isSelectedSup || isSelectedOrig
                        return (
                          <button
                            key={r.engagementPageId}
                            type="button"
                            onClick={() => {
                              selectGroup(gIdx)
                              if (effectiveSupIdx >= 0) setSelectedSupersededIdx(effectiveSupIdx)
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
                              inlineSize: '100%', padding: '0.375rem 0.75rem 0.375rem 2rem',
                              border: 'none', cursor: 'pointer', textAlign: 'start',
                              backgroundColor: isHighlighted ? 'oklch(0.95 0.02 240)' : 'transparent',
                              borderInlineStart: isHighlighted ? '0.125rem solid oklch(0.5 0.15 240)' : '0.125rem solid transparent',
                            }}
                          >
                            <input
                              type="checkbox" checked={isAccepted}
                              aria-label={`Page ${r.engagementPageId} accepted`}
                              style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', accentColor: 'oklch(0.45 0.18 145)', flexShrink: 0, cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                const key = `sup-pg${r.engagementPageId}`
                                if (isAccepted) {
                                  undo(key, 'superseded', r.confidenceLevel)
                                } else {
                                  accept(key, 'superseded', r.confidenceLevel, 'manual')
                                }
                              }}
                              onChange={() => {}}
                            />
                            <FileText style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: isHighlighted ? 600 : 500, color: 'oklch(0.25 0.01 260)' }}>
                              Pg {r.documentRef?.pageNumber ?? r.engagementPageId}
                            </span>
                            {r.documentRef?.formLabel && (
                              <span style={{
                                fontSize: '0.5625rem', color: 'oklch(0.5 0.01 260)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                maxInlineSize: '6rem',
                              }}>
                                {r.documentRef.formLabel.replace(group.formType, '').replace(/[()]/g, '').trim() || ''}
                              </span>
                            )}
                            {rejectedPageIds.has(String(r.engagementPageId)) ? (
                              <span style={{
                                marginInlineStart: 'auto', flexShrink: 0,
                                fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                                backgroundColor: 'oklch(0.92 0.02 260)', color: 'oklch(0.45 0.01 260)',
                              }}>
                                Rejected
                              </span>
                            ) : (
                              <span style={{
                                marginInlineStart: 'auto', flexShrink: 0,
                                fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                                backgroundColor: isSup ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 145)',
                                color: isSup ? 'oklch(0.45 0.18 25)' : 'oklch(0.35 0.14 145)',
                              }}>
                                {isSup ? 'Superseded' : 'Original'}
                              </span>
                            )}
                          </button>
                        )
                      })}


                    </div>
                  )}
                </div>
              )
            })}
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
            const panelGroupRejected = isGroupRejected

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
                  ) : isGroupOverridden ? (
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

                </button>

                {expandedPanels.has('aiAnalysis') && (
                  <div style={{
                    padding: '0.625rem 0.75rem',
                    backgroundColor: panelGroupRejected 
                      ? 'oklch(0.97 0.005 260)' 
                      : isGroupOverridden ? 'oklch(0.98 0.02 60)' : 'oklch(0.98 0.003 240)',
                  }}>
                    {/* Rejection outcome -- replaces AI analysis when fully rejected */}
                    {panelGroupRejected && (
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
                              No superseded classification will be applied
                            </span>
                          </div>
                        </div>

                        {/* Rejection reason inline */}
                        {(() => {
                          const rejRecs = activeGroup?.records.filter(r => rejectedDocs.has(String(r.engagementPageId))) ?? []
                          const firstReason = rejRecs.length > 0 ? rejectedDocs.get(String(rejRecs[0].engagementPageId)) : null
                          return firstReason ? (
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
                                {firstReason.reason}
                              </p>
                            </div>
                          ) : null
                        })()}
                      </div>
                    )}

                    {/* Override comparison table when user has overridden */}
                    {!panelGroupRejected && isGroupOverridden && (() => {
                      const overriddenIdx = flippedGroups.get(activeGroup!.formType)!
                      const overriddenRecord = activeGroup!.supersededRecords[overriddenIdx]
                      const allRecords = activeGroup!.records
                      return (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '0.5rem',
                        padding: '0.5rem 0.625rem',
                        marginBlockEnd: '0.625rem',
                        borderRadius: '0.25rem',
                        border: '0.0625rem solid oklch(0.82 0.08 60)',
                        backgroundColor: 'oklch(0.96 0.04 60)',
                      }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.4 0.14 60)' }}>
                          User has overridden the AI classification
                        </span>

                        {/* AI recommendation row */}
                        <div style={{
                          padding: '0.375rem 0.5rem', borderRadius: '0.25rem',
                          backgroundColor: 'oklch(1 0 0)',
                          border: '0.0625rem solid oklch(0.91 0.005 260)',
                        }}>
                          <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>
                            AI Recommended
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBlockStart: '0.25rem' }}>
                            {allRecords.map(r => (
                              <span key={r.engagementPageId} style={{
                                fontSize: '0.625rem', fontWeight: 600,
                                padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
                                backgroundColor: r.decisionType === 'Original' ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                                color: r.decisionType === 'Original' ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                              }}>
                                Pg {r.documentRef?.pageNumber ?? r.engagementPageId}: {r.decisionType}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* User override row */}
                        <div style={{
                          padding: '0.375rem 0.5rem', borderRadius: '0.25rem',
                          backgroundColor: 'oklch(1 0 0)',
                          border: '0.0625rem solid oklch(0.91 0.005 260)',
                        }}>
                          <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>
                            User Changed To
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBlockStart: '0.25rem' }}>
                            {allRecords.map(r => {
                              // Determine the new label after override
                              let newLabel: string
                              if (r.engagementPageId === overriddenRecord?.engagementPageId) {
                                newLabel = 'Original' // superseded -> original
                              } else if (r.decisionType === 'Original') {
                                newLabel = 'Superseded' // original -> superseded
                              } else {
                                newLabel = 'Superseded' // other superseded stay superseded
                              }
                              const changed = (r.decisionType === 'Original' && newLabel === 'Superseded') ||
                                (r.decisionType === 'Superseded' && newLabel === 'Original')
                              return (
                                <span key={r.engagementPageId} style={{
                                  fontSize: '0.625rem', fontWeight: 600,
                                  padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
                                  backgroundColor: newLabel === 'Original' ? 'oklch(0.94 0.04 145)' : 'oklch(0.94 0.04 25)',
                                  color: newLabel === 'Original' ? 'oklch(0.35 0.14 145)' : 'oklch(0.45 0.18 25)',
                                  outline: changed ? '0.125rem solid oklch(0.65 0.14 60)' : 'none',
                                }}>
                                  Pg {r.documentRef?.pageNumber ?? r.engagementPageId}: {newLabel}
                                  {changed && ' *'}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      )
                    })()}

                    {/* Hide AI explanation after user applies override or rejects */}
                    {/* Compact icon + text explanation */}
                    {!panelGroupRejected && !(activeGroup && flippedGroups.has(activeGroup.formType)) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {groupSuperseded?.decisionReason
                          ?.split('||')
                          .map(item => {
                            const [type, text] = item.split('|')
                            return { type, text }
                          })
                          .filter(item => item.text)
                          .map((item, i) => {
                            const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
                              'NEWER_VERSION': { 
                                icon: <RefreshCw style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, 
                                color: 'oklch(0.45 0.15 145)' 
                              },
                              'SAME_RECIPIENT': { 
                                icon: <User style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, 
                                color: 'oklch(0.45 0.12 250)' 
                              },
                              'UPDATED_VALUES': { 
                                icon: <FileEdit style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, 
                                color: 'oklch(0.5 0.14 60)' 
                              },
                              'CORRECTED_MARK': { 
                                icon: <CheckCircle2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, 
                                color: 'oklch(0.45 0.15 145)' 
                              },
                            }
                            const config = iconMap[item.type] || { 
                              icon: <Info style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />, 
                              color: 'oklch(0.5 0.01 260)' 
                            }
                            return (
                              <div 
                                key={`reason-${i}`} 
                                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                              >
                                <span style={{ color: config.color, flexShrink: 0 }}>{config.icon}</span>
                                <span style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>
                                  {item.text}
                                </span>
                              </div>
                            )
                          })
                        }

                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ═══════════════════════════════════════════════════════════
              REJECTION SUMMARY CARD (shown when group is rejected)
              ════════════════════════════════════════════════════���══════ */}
          {/* No separate rejection card -- rejection info is shown in the Review Outcome panel above */}

          {/* ═══════════════════════════════════════════════════════════
              PANEL 2: Field Comparison (collapsible, hidden when rejected)
              ═══════════════════════════════════════════════════════════ */}
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

          {/* ═══════════════════════════════════════════════════════════
              PANEL 3: Document Viewer (hidden when rejected)
              ═══════════════════════════════════════════════════════════ */}
          {!isGroupRejected && (
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
                    {supersededList.length > 1 ? ` (${safeIdx + 1}/${supersededList.length})` : ''}
                  </span>
                  <span style={{
                    marginInlineStart: 'auto', flexShrink: 0,
                    padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem',
                    fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                  backgroundColor: 'oklch(0.94 0.04 25)',
                  color: 'oklch(0.45 0.18 25)',
                  }}>
                  Superseded
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
                  backgroundColor: 'oklch(0.94 0.04 145)',
                  color: 'oklch(0.35 0.14 145)',
                  }}>
                  Original
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
                  {/* Page selector tabs for multi-page superseded groups */}
                  {supersededList.length > 1 && (
                    <div style={{
                      display: 'flex', gap: '0.25rem', marginBlockEnd: '0.375rem',
                      padding: '0.25rem',
                      backgroundColor: 'oklch(0.96 0.005 260)',
                      borderRadius: '0.25rem',
                      border: '0.0625rem solid oklch(0.91 0.005 260)',
                    }}>
                      {supersededList.map((sr, sIdx) => (
                        <button
                          key={sr.engagementPageId}
                          type="button"
                          onClick={() => setSelectedSupersededIdx(sIdx)}
                          style={{
                            flex: 1,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.0625rem',
                            padding: '0.3125rem 0.5rem',
                            border: sIdx === safeIdx ? '0.0625rem solid oklch(0.7 0.1 240)' : '0.0625rem solid transparent',
                            borderRadius: '0.1875rem',
                            backgroundColor: sIdx === safeIdx ? 'oklch(1 0 0)' : 'transparent',
                            boxShadow: sIdx === safeIdx ? '0 0.0625rem 0.1875rem oklch(0 0 0 / 0.08)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{
                            fontSize: '0.6875rem', fontWeight: sIdx === safeIdx ? 700 : 500,
                            color: sIdx === safeIdx ? 'oklch(0.35 0.12 240)' : 'oklch(0.45 0.01 260)',
                          }}>
                            Pg {sr.documentRef?.pageNumber ?? sr.engagementPageId}
                          </span>
                          <span style={{
                            fontSize: '0.5625rem', fontWeight: 500,
                            color: sIdx === safeIdx ? 'oklch(0.5 0.06 240)' : 'oklch(0.55 0.01 260)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxInlineSize: '8rem',
                          }}>
                            {sr.documentRef?.formLabel?.replace(activeGroup?.formType ?? '', '').replace(/[()]/g, '').trim() || 'Superseded'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {leftDoc?.documentRef ? (
                    <PdfPageViewer
                      documentRef={leftDoc.documentRef}
                      stamp="SUPERSEDED"
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
                      stamp="ORIGINAL"
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
          )}
        </div>
      </div>
    </div>
  )
}
