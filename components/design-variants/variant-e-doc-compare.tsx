'use client'

/**
 * DESIGN VARIANT E: "Document Comparison"
 * Production-style split view with left sidebar document tree,
 * two side-by-side PDF viewers, and a vertical toolbar between them.
 * Matches the existing Superseded UI pattern from the production app.
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { FieldComparison } from '@/components/field-comparison'
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
  ArrowLeftRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Eye,
  Info,
  Columns2,
  X,
  CheckCircle,
} from 'lucide-react'
import type { SupersededRecord, OverrideDetail } from '@/lib/types'

/* ── Predefined override reasons based on Superseded Decision Spec ── */
const OVERRIDE_REASONS = [
  { id: 'corrected', label: 'Corrected form detected - should be retained' },
  { id: 'more-data', label: 'More complete data exists on this document' },
] as const

/* ── Extract SSN / Employee ID / TIN from compared values ── */
const IDENTIFIER_FIELDS = ['Recipient SSN', 'Employee SSN', 'Recipient TIN', 'Payer TIN', 'Account Number'] as const
function extractIdentifier(records: SupersededRecord[]): { label: string; value: string } | null {
  const allValues = records.flatMap(r => r.comparedValues ?? [])
  for (const fieldName of IDENTIFIER_FIELDS) {
    const found = allValues.find(v => v.field === fieldName)
    if (found) {
      const shortLabel = fieldName.replace('Recipient ', '').replace('Employee ', '').replace('Payer ', '')
      return { label: shortLabel, value: found.valueA }
    }
  }
  return null
}

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

/* ── Helper: restore reclassify panel state from stored overrides ── */
function restoreReclassifyState(
  group: FormGroup,
  overrides: Record<string, OverrideDetail>,
  isActiveFlipped: boolean,
  activeFlippedIdx: number | undefined,
) {
  const roles = new Map<string, 'original' | 'superseded' | 'not-superseded'>()
  let savedReclReason: string | null = null
  let savedExclReason: string | null = null
  for (const rc of group.records) {
    const pid = String(rc.engagementPageId)
    const storedOv = overrides[`sup-pg${pid}`]
    if (storedOv && storedOv.userOverrideDecision) {
      if (storedOv.userOverrideDecision.includes('Not Superseded')) {
        roles.set(pid, 'not-superseded')
        if (!savedExclReason) savedExclReason = storedOv.overrideReason || null
      } else if (storedOv.userOverrideDecision.endsWith('= Original')) {
        roles.set(pid, 'original')
        if (!savedReclReason && storedOv.userOverrideDecision !== storedOv.originalAIDecision) {
          savedReclReason = storedOv.overrideReason || null
        }
      } else {
        roles.set(pid, 'superseded')
        if (!savedReclReason && storedOv.userOverrideDecision !== storedOv.originalAIDecision) {
          savedReclReason = storedOv.overrideReason || null
        }
      }
    } else {
      const orig = isActiveFlipped
        ? (activeFlippedIdx !== undefined && rc.engagementPageId === group.supersededRecords[activeFlippedIdx]?.engagementPageId)
        : rc.decisionType === 'Original'
      roles.set(pid, orig ? 'original' : 'superseded')
    }
  }
  // Parse reclassification reason
  let reasonId: string | null = null
  let reasonCustom = ''
  if (savedReclReason && savedReclReason !== 'Verifier decision') {
    const found = OVERRIDE_REASONS.find(x => x.label === savedReclReason)
    if (found) { reasonId = found.id }
    else { reasonId = 'custom'; reasonCustom = savedReclReason || '' }
  }
  // Parse exclusion reason
  let exclIds = new Set<string>()
  let exclCustom = ''
  if (savedExclReason && savedExclReason !== 'Verifier decision') {
    const pp = savedExclReason.split(', ')
    for (const p of pp) {
      const f = REJECTION_REASONS.find(x => x.label === p)
      if (f) exclIds.add(f.id)
    }
    if (exclIds.size === 0) exclCustom = savedExclReason || ''
  }
  return { roles, reasonId, reasonCustom, exclIds, exclCustom }
}

/* ── Main Component ── */
export function VariantEDocCompare({ data }: { data: SupersededRecord[] }) {
  const { decisions, overrides, accept, undo, override } = useDecisions()
  const { addRuleFromOverride } = useLearnedRules()
  const groups = useMemo(() => groupByFormType(data), [data])

  const [flippedGroups, setFlippedGroups] = useState<Map<string, number>>(new Map())
  const [showOverridePanel, setShowOverridePanel] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [notSupersededReason, setNotSupersededReason] = useState<Set<string>>(new Set())
  const [notSupersededCustom, setNotSupersededCustom] = useState('')
  const [docRoles, setDocRoles] = useState<Map<string, 'original' | 'superseded' | 'not-superseded'>>(new Map())

  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [rejectStep, setRejectStep] = useState<'select' | 'reason'>('select')
  const [rejectTargetPageId, setRejectTargetPageId] = useState<string | null>(null)
  const [newOriginalAfterReject, setNewOriginalAfterReject] = useState<string | null>(null)
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

  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0)
  const activeGroup = groups[selectedGroupIdx] ?? groups[0]

  const rejectedPageIds = useMemo(() => {
    if (!activeGroup) return new Set<string>()
    const ids = new Set<string>()
    for (const r of activeGroup.records) {
      if (rejectedDocs.has(String(r.engagementPageId))) ids.add(String(r.engagementPageId))
    }
    return ids
  }, [activeGroup, rejectedDocs])

  const effectiveRecords = useMemo(() => {
    if (!activeGroup) return []
    return activeGroup.records.filter(r => !rejectedPageIds.has(String(r.engagementPageId)))
  }, [activeGroup, rejectedPageIds])

  const isGroupRejected = activeGroup ? effectiveRecords.length === 0 : false
  const hasPartialRejects = rejectedPageIds.size > 0 && !isGroupRejected

  const selectGroup = (idx: number) => {
    setSelectedGroupIdx(idx)
  }

  const allGroupAccepted = activeGroup
    ? activeGroup.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
    : false

  const handleAcceptGroup = () => {
    if (!activeGroup) return
    const isFlipped = isActiveFlipped
    for (const r of activeGroup.records) {
      const key = `sup-pg${r.engagementPageId}`
      if (decisions[key] !== 'accepted') accept(key, 'superseded', r.confidenceLevel, 'manual')
    }
    logAuditEntry('individual_accept', [activeGroup.formType])
    pushUndoEntry('individual_accept', [activeGroup.formType], `Accept ${activeGroup.formType}`)
    if (isFlipped) {
      const supRecord = activeGroup.records.find(rec => rec.decisionType === 'Superseded')
      if (supRecord) {
        const key = `sup-pg${supRecord.engagementPageId}`
        const storedOverride = overrides[key]
                const detail: OverrideDetail = {
                  originalAIDecision: `Page ${supRecord.engagementPageId} = ${supRecord.decisionType}`,
                  userOverrideDecision: `Page ${supRecord.engagementPageId} = ${supRecord.decisionType === 'Superseded' ? 'Original' : 'Superseded'}`,
                  overrideReason: storedOverride?.overrideReason ?? null,
          formType: supRecord.documentRef?.formType ?? activeGroup.formType,
          fieldContext: supRecord.comparedValues ?? [],
        }
        addRuleFromOverride(detail, 'superseded')
      }
    }
  }

  const [undoStack, setUndoStack] = useState<Array<{
    action: 'individual_accept' | 'high_confidence_bulk' | 'bulk_accept' | 'bulk_accept_with_warning' | 'sidebar_checkbox'
    groups: string[]
    label: string
  }>>([])

  const pushUndoEntry = (action: typeof undoStack[number]['action'], groupKeys: string[], label: string) => {
    setUndoStack(prev => [...prev, { action, groups: groupKeys, label }])
  }

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
        for (const r of group.records) undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
      }
    }
    const idx = undoStack.lastIndexOf(lastUndoEntry)
    setUndoStack(prev => prev.filter((_, i) => i !== idx))
  }

  const [auditLog, setAuditLog] = useState<Array<{
    timestamp: string
    action: 'individual_accept' | 'high_confidence_bulk' | 'bulk_accept' | 'bulk_accept_with_warning' | 'sidebar_checkbox'
    groups: string[]
    groupCount: number
  }>>([])

  const logAuditEntry = (action: typeof auditLog[number]['action'], groupKeys: string[]) => {
    setAuditLog(prev => [...prev, { timestamp: new Date().toISOString(), action, groups: groupKeys, groupCount: groupKeys.length }])
  }

  const [showAcceptDropdown, setShowAcceptDropdown] = useState(false)
  const [showBulkWarning, setShowBulkWarning] = useState(false)
  const acceptDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (acceptDropdownRef.current && !acceptDropdownRef.current.contains(e.target as Node)) setShowAcceptDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const highConfidenceUnreviewed = useMemo(() => {
    return groups.filter(g => {
      const avgConf = g.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / g.records.length
      const isAccepted = g.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
      const isRejected = g.records.every(r => rejectedDocs.has(String(r.engagementPageId)))
      const isOv = flippedGroups.has(g.formType)
      return Math.round(avgConf * 100) >= 90 && !isAccepted && !isRejected && !isOv
    })
  }, [groups, decisions, rejectedDocs, flippedGroups])

  const allUnreviewed = useMemo(() => {
    return groups.filter(g => {
      const isAccepted = g.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
      const isRejected = g.records.every(r => rejectedDocs.has(String(r.engagementPageId)))
      const isOv = flippedGroups.has(g.formType)
      return !isAccepted && !isRejected && !isOv
    })
  }, [groups, decisions, rejectedDocs, flippedGroups])

  const unreviewedModLow = useMemo(() => {
    return allUnreviewed.filter(g => {
      const avgConf = g.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / g.records.length
      return Math.round(avgConf * 100) < 90
    })
  }, [allUnreviewed])

  const handleAcceptHighConfidence = () => {
    const groupKeys: string[] = []
    for (const g of highConfidenceUnreviewed) {
      for (const r of g.records) {
        const key = `sup-pg${r.engagementPageId}`
        if (decisions[key] !== 'accepted') accept(key, 'superseded', r.confidenceLevel, 'manual')
      }
      groupKeys.push(g.formType)
    }
    logAuditEntry('high_confidence_bulk', groupKeys)
    pushUndoEntry('high_confidence_bulk', groupKeys, `Accept High Confidence (${groupKeys.length})`)
    setShowAcceptDropdown(false)
  }

  const handleBulkAcceptRemaining = () => {
    if (unreviewedModLow.length > 0) { setShowBulkWarning(true); setShowAcceptDropdown(false); return }
    executeBulkAccept()
  }

  const executeBulkAccept = () => {
    const groupKeys: string[] = []
    for (const g of allUnreviewed) {
      for (const r of g.records) {
        const key = `sup-pg${r.engagementPageId}`
        if (decisions[key] !== 'accepted') accept(key, 'superseded', r.confidenceLevel, 'manual')
      }
      groupKeys.push(g.formType)
    }
    const actionType = unreviewedModLow.length > 0 ? 'bulk_accept_with_warning' as const : 'bulk_accept' as const
    logAuditEntry(actionType, groupKeys)
    pushUndoEntry(actionType, groupKeys, `Accept Remaining (${groupKeys.length})`)
    setShowBulkWarning(false)
    setShowAcceptDropdown(false)
  }

  const handleUndoOverride = () => {
    if (!activeGroup) return
    setFlippedGroups(prev => { const next = new Map(prev); next.delete(activeGroup.formType); return next })
    setSelectedSupersededIdx(0)
    setShowOverridePanel(false)
    setSelectedReason(null)
    setCustomReason('')
    setDocRoles(new Map())
    setNotSupersededReason(new Set())
    setNotSupersededCustom('')
    for (const r of activeGroup.records) undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
  }

  const handleRejectDoc = () => {
    if (!activeGroup) return
    const predefinedLabels = Array.from(selectedRejectReasons).filter(id => id !== 'custom').map(id => REJECTION_REASONS.find(r => r.id === id)?.label ?? id)
    const allLabels = [...predefinedLabels, ...(selectedRejectReasons.has('custom') && customRejectReason.trim() ? [customRejectReason.trim()] : [])]
    const reasonLabel = allLabels.length > 0 ? allLabels.join('; ') : 'Other'
    const detail = allLabels.join('. ')
    setRejectedDocs(prev => {
      const next = new Map(prev)
      for (const r of activeGroup.records) next.set(String(r.engagementPageId), { reason: reasonLabel, detail, formType: activeGroup.formType })
      return next
    })
    setShowRejectPanel(false); setRejectStep('reason'); setRejectTargetPageId(null); setNewOriginalAfterReject(null)
    setSelectedRejectReasons(new Set()); setCustomRejectReason(''); setSelectedSupersededIdx(0)
  }

  const handleUndoRejectAll = () => {
    if (!activeGroup) return
    setRejectedDocs(prev => {
      const next = new Map(prev)
      for (const r of activeGroup.records) next.delete(String(r.engagementPageId))
      return next
    })
    setSelectedSupersededIdx(0)
  }

  const [selectedSupersededIdx, setSelectedSupersededIdx] = useState(0)
  useEffect(() => { setSelectedSupersededIdx(0) }, [selectedGroupIdx])

  const activeFlippedIdxRaw = activeGroup ? flippedGroups.get(activeGroup.formType) : undefined
  const flippedDocStillValid = activeFlippedIdxRaw !== undefined && activeGroup
    ? !rejectedPageIds.has(String(activeGroup.supersededRecords[activeFlippedIdxRaw]?.engagementPageId))
    : false
  const activeFlippedIdx = flippedDocStillValid ? activeFlippedIdxRaw : undefined
  const isActiveFlipped = activeFlippedIdx !== undefined

  const effectiveOriginal = useMemo(() => {
    if (!activeGroup) return null
    if (isActiveFlipped) {
      const overriddenRecord = activeGroup.supersededRecords[activeFlippedIdx!]
      if (overriddenRecord && !rejectedPageIds.has(String(overriddenRecord.engagementPageId))) return overriddenRecord
      return null
    }
    const orig = activeGroup.originalRecord
    return orig && !rejectedPageIds.has(String(orig.engagementPageId)) ? orig : null
  }, [activeGroup, isActiveFlipped, activeFlippedIdx, rejectedPageIds])

  const supersededList = useMemo(() => {
    if (!activeGroup) return []
    let list: SupersededRecord[]
    if (!isActiveFlipped) { list = activeGroup.supersededRecords }
    else {
      const remaining = activeGroup.supersededRecords.filter((_, i) => i !== activeFlippedIdx!)
      list = activeGroup.originalRecord ? [...remaining, activeGroup.originalRecord] : remaining
    }
    return list.filter(r => !rejectedPageIds.has(String(r.engagementPageId)))
  }, [activeGroup, isActiveFlipped, activeFlippedIdx, rejectedPageIds])

  const safeIdx = Math.min(selectedSupersededIdx, Math.max(0, supersededList.length - 1))
  const leftDoc = supersededList[safeIdx] ?? null
  const rightDoc = effectiveOriginal

  const comparedValues = useMemo(() => {
    if (!leftDoc) return []
    return leftDoc.comparedValues ?? []
  }, [leftDoc])

  /* ── Derived: active tab for right evidence panel ── */
  const [activeTab, setActiveTab] = useState<'fields' | 'documents'>('fields')

  /* ── Derived: progress tracking ── */
  const reviewedCount = useMemo(() => {
    return groups.filter(g => {
      const isAccepted = g.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
      const isRejected = g.records.every(r => rejectedDocs.has(String(r.engagementPageId)))
      const isReclassified = flippedGroups.has(g.formType)
      return isAccepted || isRejected || isReclassified
    }).length
  }, [groups, decisions, rejectedDocs, flippedGroups])

  /* ── Derived: AI analysis values for the context panel ── */
  const aiAnalysisData = useMemo(() => {
    const avgConfRaw = activeGroup ? activeGroup.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / activeGroup.records.length : 0
    const avgConf = Math.round(avgConfRaw * 100)
    const confColor = avgConf >= 90 ? 'var(--confidence-high)' : avgConf >= 70 ? 'var(--confidence-medium)' : 'var(--confidence-low)'
    const panelActionLabel = avgConf >= 90 ? 'High' : avgConf >= 70 ? 'Moderate' : 'Low'
    const panelTooltip = avgConf >= 90 ? 'AI is confident. Reviewer can approve quickly.' : avgConf >= 70 ? 'AI has moderate confidence. Reviewer should verify key fields.' : 'AI is uncertain. Reviewer must examine carefully.'
    const isGroupOverridden = isActiveFlipped || (activeGroup?.records.some(r => { const ovd = overrides[`sup-pg${r.engagementPageId}`]; return ovd?.userOverrideDecision?.includes('Not Superseded') || (ovd && ovd.userOverrideDecision !== `Page ${r.engagementPageId} = ${r.decisionType}`) }) ?? false)
    const panelIdentifier = activeGroup ? extractIdentifier(activeGroup.records) : null
    return { avgConf, confColor, panelActionLabel, panelTooltip, isGroupOverridden, panelIdentifier }
  }, [activeGroup, isActiveFlipped, overrides])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--card)', blockSize: '100%' }}>

      {/* ══════════════════════════════════════════════════════════
          STICKY HEADER BAR: Title + Confidence + All Actions
          ══════════════════════════════════════════════════════════ */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', backgroundColor: 'var(--surface-raised)', borderBlockEnd: '0.0625rem solid var(--border)', flexShrink: 0 }}>
        {/* Left: Form title + confidence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minInlineSize: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minInlineSize: 0 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeGroup?.formType}: {activeGroup?.formEntity.toUpperCase()}</span>
            {aiAnalysisData.panelIdentifier && <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{aiAnalysisData.panelIdentifier.label}: {aiAnalysisData.panelIdentifier.value}</span>}
          </div>
          {/* Confidence badge */}
          {!isGroupRejected && !aiAnalysisData.isGroupOverridden && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, padding: '0.1875rem 0.5rem', borderRadius: '0.25rem', backgroundColor: `${aiAnalysisData.confColor} / 0.12`, color: aiAnalysisData.confColor, whiteSpace: 'nowrap', flexShrink: 0 }} title={aiAnalysisData.panelTooltip}>
              <Sparkles style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} /> {aiAnalysisData.panelActionLabel}
            </span>
          )}
          {isGroupRejected && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.125rem 0.375rem', borderRadius: '0.1875rem', backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', flexShrink: 0 }}><X style={{ inlineSize: '0.5rem', blockSize: '0.5rem' }} /> Not Superseded</span>
          )}
          {!isGroupRejected && aiAnalysisData.isGroupOverridden && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.125rem 0.375rem', borderRadius: '0.1875rem', backgroundColor: 'var(--status-warning-subtle)', color: 'var(--status-warning)', flexShrink: 0 }}><ArrowLeftRight style={{ inlineSize: '0.5rem', blockSize: '0.5rem' }} /> Reclassified</span>
          )}
        </div>

        {/* Right: Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
          {/* Reclassify */}
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => { if (!showOverridePanel && activeGroup) { const restored = restoreReclassifyState(activeGroup, overrides, isActiveFlipped, activeFlippedIdx); setDocRoles(restored.roles); setSelectedReason(restored.reasonId); setCustomReason(restored.reasonCustom); setNotSupersededReason(restored.exclIds); setNotSupersededCustom(restored.exclCustom) }; setShowOverridePanel(p => !p) }} disabled={isGroupRejected || allGroupAccepted} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: '0.0625rem solid var(--status-warning-border)', borderRadius: '0.25rem', backgroundColor: isActiveFlipped ? 'var(--status-warning-subtle)' : 'var(--card)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-warning)', cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer', opacity: (isGroupRejected || allGroupAccepted) ? 0.5 : 1 }} aria-expanded={showOverridePanel}>
              <ArrowLeftRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
              Reclassify
              <ChevronDown style={{ inlineSize: '0.5rem', blockSize: '0.5rem' }} />
            </button>
            {/* Reclassify Panel Popover */}
            {showOverridePanel && !allGroupAccepted && (() => {
              const _hasRoleSwap = activeGroup?.records.some(r => { const _pid = String(r.engagementPageId); const _cur = docRoles.get(_pid); const _ai = r.decisionType === 'Original' ? 'original' : 'superseded'; return _cur && _cur !== _ai && _cur !== 'not-superseded' }) ?? false
              const _hasNotSup = Array.from(docRoles.values()).some(v => v === 'not-superseded')
              const _hasAnyChange = _hasRoleSwap || _hasNotSup
              const _origCount = Array.from(docRoles.values()).filter(v => v === 'original').length
              const _supCount = Array.from(docRoles.values()).filter(v => v === 'superseded').length
              const _valError = _origCount === 0 ? 'At least one document must be Original.' : _supCount === 0 && !_hasNotSup ? 'At least one document must be Superseded.' : null
              const _swapFilled = !_hasRoleSwap || (selectedReason !== null || customReason.trim() !== '')
              const _notSupFilled = !_hasNotSup || (notSupersededReason.size > 0 || notSupersededCustom.trim() !== '')
              const _canApply = _hasAnyChange && !_valError && _swapFilled && _notSupFilled
              return (
              <div key="reclassify-panel-wrapper">
                <div onClick={() => { setShowOverridePanel(false) }} style={{ position: 'fixed', inset: 0, zIndex: 49 }} aria-hidden="true" />
                <div style={{ position: 'absolute', insetBlockStart: '100%', insetInlineEnd: 0, marginBlockStart: '0.25rem', zIndex: 50, inlineSize: 'max-content', minInlineSize: '22rem', maxBlockSize: '28rem', overflowY: 'auto', padding: '0.75rem', borderRadius: '0.375rem', border: '0.0625rem solid var(--border)', backgroundColor: 'var(--card)', boxShadow: '0 0.25rem 0.75rem rgba(0,0,0,0.15)' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBlockEnd: '0.5rem' }}>Reclassify Documents</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBlockEnd: '0.75rem' }}>
                    {activeGroup?.records.filter(record => !rejectedPageIds.has(String(record.engagementPageId))).map((record) => {
                      const pageId = String(record.engagementPageId)
                      const aiRole = record.decisionType === 'Original' ? 'original' : 'superseded'
                      const currentRole = docRoles.get(pageId) ?? aiRole
                      const isChanged = currentRole !== aiRole
                      return (
                        <div key={pageId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: isChanged ? currentRole === 'not-superseded' ? 'var(--surface-raised)' : 'var(--status-warning-subtle)' : 'transparent' }}>
                          <FileText style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--muted-foreground)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--foreground)', flex: 1, whiteSpace: 'nowrap' }}>Pg {record.documentRef?.pageNumber ?? record.engagementPageId}</span>
                          <select value={currentRole} onChange={(e) => { const newRole = e.target.value as 'original' | 'superseded' | 'not-superseded'; setDocRoles(prev => { const next = new Map(prev); next.set(pageId, newRole); const eligibleRecords = activeGroup?.records.filter(rec => !rejectedPageIds.has(String(rec.engagementPageId))) ?? []; if (eligibleRecords.length === 2) { const otherRecord = eligibleRecords.find(rec => String(rec.engagementPageId) !== pageId); if (otherRecord) { const otherId = String(otherRecord.engagementPageId); if (newRole === 'original') next.set(otherId, 'superseded'); else if (newRole === 'superseded') next.set(otherId, 'original') } }; return next }) }} style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.1875rem 0.375rem', border: '0.0625rem solid var(--border)', borderRadius: '0.1875rem', backgroundColor: 'var(--card)', color: currentRole === 'original' ? 'var(--status-success)' : currentRole === 'superseded' ? 'var(--status-info)' : 'var(--muted-foreground)', cursor: 'pointer' }}>
                            <option value="original">Original</option>
                            <option value="superseded">Superseded</option>
                            <option value="not-superseded">Not Superseded</option>
                          </select>
                          <span style={{ fontSize: '0.5625rem', fontWeight: 500, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>AI: {aiRole === 'original' ? 'Original' : 'Superseded'}</span>
                        </div>
                      )
                    })}
                  </div>
                  {_valError && (<div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.5rem', marginBlockEnd: '0.5rem', borderRadius: '0.25rem', backgroundColor: 'var(--status-error-subtle)', border: '0.0625rem solid var(--status-error-border)' }}><AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'var(--status-error)', flexShrink: 0 }} /><span style={{ fontSize: '0.625rem', color: 'var(--status-error)' }}>{_valError}</span></div>)}
                  {_hasRoleSwap && (
                    <div style={{ marginBlockEnd: '0.625rem' }}>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBlockEnd: '0.375rem' }}>Reason for reclassification</p>
                      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                        <legend className="sr-only">Select reclassification reason</legend>
                        {OVERRIDE_REASONS.map(reason => (<label key={reason.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: selectedReason === reason.id ? 'var(--status-success-subtle)' : 'transparent' }}><input type="radio" name="reclassify-reason" checked={selectedReason === reason.id} onChange={() => { setSelectedReason(reason.id); setCustomReason('') }} style={{ accentColor: 'var(--status-success)', flexShrink: 0 }} /><span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--foreground)' }}>{reason.label}</span></label>))}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: selectedReason === 'custom' ? 'var(--status-success-subtle)' : 'transparent' }}><input type="radio" name="reclassify-reason" checked={selectedReason === 'custom'} onChange={() => setSelectedReason('custom')} style={{ accentColor: 'var(--status-success)', flexShrink: 0 }} /><span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--foreground)' }}>Other</span></label>
                        {selectedReason === 'custom' && (<textarea value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Enter your reason..." style={{ marginBlockStart: '0.375rem', inlineSize: '100%', minBlockSize: '2.5rem', padding: '0.375rem', border: '0.0625rem solid var(--border)', borderRadius: '0.25rem', fontSize: '0.625rem', resize: 'vertical' }} />)}
                      </fieldset>
                    </div>
                  )}
                  {_hasNotSup && (
                    <div style={{ marginBlockEnd: '0.625rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', marginBlockEnd: '0.5rem', backgroundColor: 'var(--status-warning-subtle)', border: '0.0625rem solid var(--status-warning-border)' }}><AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'var(--status-warning)', flexShrink: 0, marginBlockStart: '0.0625rem' }} /><p style={{ fontSize: '0.5625rem', color: 'var(--status-warning)', lineHeight: '1.5', margin: 0 }}>{"You're confirming these documents do not replace each other. Both will remain as-is in the binder."}</p></div>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBlockEnd: '0.375rem' }}>Reason for exclusion</p>
                      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                        <legend className="sr-only">Select exclusion reason</legend>
                        {REJECTION_REASONS.map(reason => (<label key={reason.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: notSupersededReason.has(reason.id) ? 'var(--status-success-subtle)' : 'transparent' }}><input type="checkbox" checked={notSupersededReason.has(reason.id)} onChange={() => { setNotSupersededReason(prev => { const next = new Set(prev); if (next.has(reason.id)) next.delete(reason.id); else next.add(reason.id); return next }) }} style={{ accentColor: 'var(--status-success)', flexShrink: 0 }} /><span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--foreground)' }}>{reason.label}</span></label>))}
                      </fieldset>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBlockStart: '0.5rem' }}>
                    {isActiveFlipped && (<button type="button" onClick={handleUndoOverride} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.375rem 0.5rem', border: '0.0625rem solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'var(--card)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted-foreground)', cursor: 'pointer' }}><Undo2 style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} /> Reset</button>)}
                    <button type="button" disabled={!_canApply} onClick={() => { if (!activeGroup) return; const reclassifyReasonText = selectedReason === 'custom' ? customReason.trim() || '' : selectedReason ? OVERRIDE_REASONS.find(r => r.id === selectedReason)?.label ?? '' : customReason.trim() || ''; const exclusionReasonText = notSupersededReason.size > 0 ? Array.from(notSupersededReason).map(id => REJECTION_REASONS.find(r => r.id === id)?.label ?? id).join(', ') : notSupersededCustom.trim() || ''; const newOriginalPageId = Array.from(docRoles.entries()).find(([, role]) => role === 'original')?.[0]; const aiOriginalId = String(activeGroup.originalRecord?.engagementPageId); const hasSwap = newOriginalPageId && newOriginalPageId !== aiOriginalId; const hasExclusion = Array.from(docRoles.values()).some(v => v === 'not-superseded'); if (!hasSwap && !hasExclusion) { setShowOverridePanel(false); return }; if (hasSwap) { const targetIdx = activeGroup.supersededRecords.findIndex(s => String(s.engagementPageId) === newOriginalPageId); setFlippedGroups(prev => { const next = new Map(prev); if (targetIdx >= 0) next.set(activeGroup.formType, targetIdx); return next }) }; for (const r of activeGroup.records) { const key = `sup-pg${r.engagementPageId}`; const docRole = docRoles.get(String(r.engagementPageId)); let newDecision: string; if (docRole === 'original') newDecision = 'Original'; else if (docRole === 'not-superseded') newDecision = 'Not Superseded'; else newDecision = 'Superseded'; const docReasonText = docRole === 'not-superseded' ? exclusionReasonText || reclassifyReasonText || 'Verifier decision' : reclassifyReasonText || 'Verifier decision'; const detail: OverrideDetail = { originalAIDecision: `Page ${r.engagementPageId} = ${r.decisionType}`, userOverrideDecision: `Page ${r.engagementPageId} = ${newDecision}`, overrideReason: docReasonText, formType: r.documentRef?.formType ?? 'Unknown', fieldContext: r.comparedValues ?? [] }; override(key, 'superseded', r.confidenceLevel, detail) }; setSelectedSupersededIdx(0); setShowOverridePanel(false) }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.375rem 0.5rem', border: 'none', borderRadius: '0.25rem', backgroundColor: !_canApply ? 'var(--muted)' : 'var(--status-success)', fontSize: '0.6875rem', fontWeight: 600, color: !_canApply ? 'var(--muted-foreground)' : 'var(--card)', cursor: !_canApply ? 'not-allowed' : 'pointer' }}><Check style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} /> Apply</button>
                  </div>
                </div>
              </div>
              )
            })()}
          </div>

          {/* Not Superseded */}
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => { if (!showRejectPanel) { setRejectStep('reason'); setRejectTargetPageId(null); setNewOriginalAfterReject(null); setSelectedRejectReasons(new Set()); setCustomRejectReason('') }; setShowRejectPanel(p => !p) }} disabled={isGroupRejected || allGroupAccepted} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: '0.0625rem solid var(--status-error-border)', borderRadius: '0.25rem', backgroundColor: isGroupRejected ? 'var(--status-error-subtle)' : hasPartialRejects ? 'var(--status-error-subtle)' : 'var(--card)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-error)', cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer', opacity: (isGroupRejected || allGroupAccepted) ? 0.7 : 1 }} aria-expanded={showRejectPanel}>
              <X style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Not Superseded
            </button>
            {showRejectPanel && !isGroupRejected && !allGroupAccepted && (() => {
              return (
              <div key="reject-panel-wrapper">
                <div onClick={() => { setShowRejectPanel(false); setRejectTargetPageId(null); setNewOriginalAfterReject(null); setRejectStep('reason') }} style={{ position: 'fixed', inset: 0, zIndex: 49 }} aria-hidden="true" />
                <div style={{ position: 'absolute', insetBlockStart: '100%', insetInlineEnd: 0, marginBlockStart: '0.25rem', zIndex: 50, inlineSize: 'max-content', minInlineSize: '20rem', padding: '0.75rem', borderRadius: '0.375rem', border: '0.0625rem solid var(--border)', backgroundColor: 'var(--card)', boxShadow: '0 0.25rem 0.75rem rgba(0,0,0,0.15)' }}>
                  <div>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBlockEnd: '0.5rem' }}>Not Superseded</p>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', padding: '0.5rem 0.625rem', borderRadius: '0.25rem', backgroundColor: 'var(--status-warning-subtle)', border: '0.0625rem solid var(--status-warning-border)', marginBlockEnd: '0.625rem' }}><AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--status-warning)', flexShrink: 0, marginBlockStart: '0.0625rem' }} /><p style={{ fontSize: '0.625rem', color: 'var(--status-warning)', lineHeight: '1.5', margin: 0 }}>{"You're confirming these documents do not replace each other. Both will remain as-is in the binder."}</p></div>
                    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                      <legend className="sr-only">Select reason for not superseded</legend>
                      {REJECTION_REASONS.map((reason) => (<label key={reason.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem', borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: selectedRejectReasons.has(reason.id) ? 'var(--status-error-subtle)' : 'transparent' }}><input type="checkbox" checked={selectedRejectReasons.has(reason.id)} onChange={() => toggleRejectReason(reason.id)} style={{ accentColor: 'var(--status-error)', flexShrink: 0, marginTop: '0.125rem' }} /><div><span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--foreground)', display: 'block' }}>{reason.label}</span><span style={{ fontSize: '0.5625rem', color: 'var(--muted-foreground)' }}>{reason.description}</span></div></label>))}
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem', borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: selectedRejectReasons.has('custom') ? 'var(--status-error-subtle)' : 'transparent' }}><input type="checkbox" checked={selectedRejectReasons.has('custom')} onChange={() => toggleRejectReason('custom')} style={{ accentColor: 'var(--status-error)', flexShrink: 0, marginTop: '0.125rem' }} /><span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--foreground)' }}>Other (specify below)</span></label>
                      {selectedRejectReasons.has('custom') && (<textarea value={customRejectReason} onChange={(e) => setCustomRejectReason(e.target.value)} placeholder="Describe why this group is not superseded..." style={{ marginBlockStart: '0.5rem', inlineSize: '100%', minBlockSize: '3.5rem', padding: '0.5rem', border: '0.0625rem solid var(--border)', borderRadius: '0.25rem', fontSize: '0.6875rem', resize: 'vertical' }} />)}
                    </fieldset>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBlockStart: '0.75rem' }}>
                      <button type="button" onClick={handleRejectDoc} disabled={!hasRejectSelection} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.375rem 0.5rem', border: 'none', borderRadius: '0.25rem', backgroundColor: !hasRejectSelection ? 'var(--muted)' : 'var(--status-error)', fontSize: '0.6875rem', fontWeight: 600, color: !hasRejectSelection ? 'var(--muted-foreground)' : 'var(--card)', cursor: !hasRejectSelection ? 'not-allowed' : 'pointer' }}><X style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} /> Confirm Not Superseded</button>
                    </div>
                  </div>
                </div>
              </div>
              )
            })()}
          </div>

          {/* Undo exclusion */}
          {(isGroupRejected || hasPartialRejects) && (
            <button type="button" onClick={handleUndoRejectAll} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.5rem', border: '0.0625rem solid var(--status-error-border)', borderRadius: '0.25rem', backgroundColor: 'var(--card)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--status-error)', cursor: 'pointer' }}><Undo2 style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} /> Undo</button>
          )}

          {/* Separator */}
          <div style={{ inlineSize: '0.0625rem', blockSize: '1.5rem', backgroundColor: 'var(--border)', flexShrink: 0 }} />

          {/* Accept split button */}
          <div ref={acceptDropdownRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', borderRadius: '0.25rem', overflow: 'hidden' }}>
              {lastUndoEntry ? (
                <button type="button" onClick={handleUndoLastAction} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: 'none', borderRadius: '0.25rem 0 0 0.25rem', backgroundColor: 'var(--status-success-subtle)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--status-success)', cursor: 'pointer', borderInlineEnd: '0.0625rem solid var(--status-success-border)' }} title={`Undo: ${lastUndoEntry.label}`}><Undo2 style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} /> Undo: {lastUndoEntry.label}</button>
              ) : (
                <button type="button" onClick={() => { handleAcceptGroup(); setShowAcceptDropdown(false) }} disabled={isGroupRejected || allGroupAccepted} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: 'none', borderRadius: '0.25rem 0 0 0.25rem', backgroundColor: (isGroupRejected || allGroupAccepted) ? 'var(--status-success-border)' : 'var(--status-success)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--card)', cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer', opacity: (isGroupRejected || allGroupAccepted) ? 0.6 : 1 }}><Check style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Accept</button>
              )}
              <button type="button" onClick={() => setShowAcceptDropdown(!showAcceptDropdown)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem 0.375rem', border: 'none', borderRadius: '0 0.25rem 0.25rem 0', backgroundColor: lastUndoEntry ? 'var(--status-success-subtle)' : 'var(--status-success)', cursor: 'pointer' }} aria-label="More accept options"><ChevronDown style={{ inlineSize: '0.5rem', blockSize: '0.5rem', color: lastUndoEntry ? 'var(--status-success)' : 'var(--card)' }} /></button>
            </div>
            {showAcceptDropdown && (
              <div style={{ position: 'absolute', insetBlockStart: '100%', insetInlineEnd: 0, marginBlockStart: '0.25rem', zIndex: 50, inlineSize: '16rem', backgroundColor: 'var(--card)', borderRadius: '0.375rem', border: '0.0625rem solid var(--border)', boxShadow: '0 0.25rem 0.75rem rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                <button type="button" onClick={handleAcceptHighConfidence} disabled={highConfidenceUnreviewed.length === 0} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', inlineSize: '100%', padding: '0.5rem 0.75rem', border: 'none', backgroundColor: 'transparent', cursor: highConfidenceUnreviewed.length === 0 ? 'not-allowed' : 'pointer', opacity: highConfidenceUnreviewed.length === 0 ? 0.4 : 1, textAlign: 'start' }} onMouseEnter={e => { if (highConfidenceUnreviewed.length > 0) (e.currentTarget.style.backgroundColor = 'var(--surface-raised)') }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Sparkles style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--confidence-high)' }} /><span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>Accept High Confidence</span>{highConfidenceUnreviewed.length > 0 && <span style={{ fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.0625rem 0.25rem', borderRadius: '0.625rem', backgroundColor: 'var(--status-success-subtle)', color: 'var(--status-success)' }}>{highConfidenceUnreviewed.length}</span>}</div>
                  <span style={{ fontSize: '0.625rem', color: 'var(--muted-foreground)', paddingInlineStart: '1.125rem' }}>Bulk accept all pairs with High confidence</span>
                </button>
                <div style={{ blockSize: '0.0625rem', backgroundColor: 'var(--border)' }} />
                <button type="button" onClick={handleBulkAcceptRemaining} disabled={allUnreviewed.length === 0} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', inlineSize: '100%', padding: '0.5rem 0.75rem', border: 'none', backgroundColor: 'transparent', cursor: allUnreviewed.length === 0 ? 'not-allowed' : 'pointer', opacity: allUnreviewed.length === 0 ? 0.4 : 1, textAlign: 'start' }} onMouseEnter={e => { if (allUnreviewed.length > 0) (e.currentTarget.style.backgroundColor = 'var(--surface-raised)') }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><CheckCircle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--ai-accent)' }} /><span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>Accept Remaining</span>{allUnreviewed.length > 0 && <span style={{ fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.0625rem 0.25rem', borderRadius: '0.625rem', backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>{allUnreviewed.length}</span>}</div>
                  <span style={{ fontSize: '0.625rem', color: 'var(--muted-foreground)', paddingInlineStart: '1.125rem' }}>Accept all unreviewed pairs (warns if Moderate/Low exist)</span>
                </button>
              </div>
            )}
          </div>

          {/* Next Step */}
          <button type="button" onClick={() => { if (selectedGroupIdx < groups.length - 1) selectGroup(selectedGroupIdx + 1) }} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.25rem', backgroundColor: 'var(--tr-primary)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--tr-primary-foreground)', cursor: selectedGroupIdx < groups.length - 1 ? 'pointer' : 'not-allowed', opacity: selectedGroupIdx < groups.length - 1 ? 1 : 0.5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Next <ArrowRight style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} />
          </button>
        </div>
      </header>

      {/* Bulk accept warning modal */}
      {showBulkWarning && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ inlineSize: '28rem', backgroundColor: 'var(--card)', borderRadius: '0.5rem', boxShadow: '0 0.5rem 2rem rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1rem', backgroundColor: 'var(--status-warning-subtle)', borderBlockEnd: '0.0625rem solid var(--status-warning-border)' }}><AlertTriangle style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--status-warning)' }} /><span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--foreground)' }}>Unreviewed Pairs Need Attention</span></div>
            <div style={{ padding: '0.875rem 1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: '0 0 0.625rem 0' }}>{unreviewedModLow.length} pair{unreviewedModLow.length > 1 ? 's' : ''} with Moderate or Low confidence {unreviewedModLow.length > 1 ? 'have' : 'has'} not been individually reviewed:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxBlockSize: '8rem', overflowY: 'auto', padding: '0.5rem', borderRadius: '0.25rem', backgroundColor: 'var(--surface-raised)', border: '0.0625rem solid var(--border)' }}>
                {unreviewedModLow.map(g => { const avg = Math.round(g.records.reduce((s, r) => s + r.confidenceLevel, 0) / g.records.length * 100); const label = avg >= 70 ? 'Moderate' : 'Low'; const color = avg >= 70 ? 'var(--status-warning)' : 'var(--status-error)'; return (<div key={g.formType} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.375rem' }}><span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--foreground)' }}>{g.formType} ({g.formEntity})</span><span style={{ fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.0625rem 0.25rem', borderRadius: '0.1875rem', backgroundColor: `${color} / 0.12`, color }}>{label}</span></div>) })}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.75rem 1rem', borderBlockStart: '0.0625rem solid var(--border)', backgroundColor: 'var(--background)' }}>
              <button type="button" onClick={() => { setShowBulkWarning(false); if (unreviewedModLow.length > 0) { const idx = groups.findIndex(g => g.formType === unreviewedModLow[0].formType); if (idx >= 0) selectGroup(idx) } }} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', border: '0.0625rem solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'var(--card)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer' }}>Review These First</button>
              <button type="button" onClick={executeBulkAccept} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.25rem', backgroundColor: 'var(--status-warning)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--card)', cursor: 'pointer' }}>Accept Anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MAIN CONTENT: Left Context + Right Evidence (horizontal split)
          ══════════════════════════════════════════════════════════ */}
      <div ref={containerRef} style={{ display: 'grid', gridTemplateColumns: '22rem 1fr', flex: '1 1 0', minBlockSize: 0, overflow: 'hidden' }}>

        {/* ── LEFT: Context Panel ── */}
        <aside aria-label="Review context" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderInlineEnd: '0.0625rem solid var(--border)', backgroundColor: 'var(--surface-raised)' }}>

          {/* AI Summary (always visible, not collapsible) */}
          <div style={{ flexShrink: 0, overflowY: 'auto', maxBlockSize: '50%', borderBlockEnd: '0.0625rem solid var(--border)' }}>
            <div style={{ padding: '0.75rem 0.875rem' }}>
              {/* AI Analysis heading */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockEnd: '0.625rem' }}>
                <Sparkles style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--ai-accent)' }} />
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Analysis</span>
              </div>

              {/* Rejected state */}
              {isGroupRejected && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.5rem 0.625rem', borderRadius: '0.25rem', border: '0.0625rem solid var(--border)', backgroundColor: 'var(--surface-sunken)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--muted-foreground)' }} /><span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--foreground)' }}>Not Superseded -- Excluded by Verifier</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1875rem', paddingInlineStart: '1.125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ inlineSize: '0.1875rem', blockSize: '0.1875rem', borderRadius: '50%', backgroundColor: 'var(--muted-foreground)', flexShrink: 0 }} /><span style={{ fontSize: '0.625rem', color: 'var(--foreground)' }}>Documents available in SPBinder as independent records</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ inlineSize: '0.1875rem', blockSize: '0.1875rem', borderRadius: '50%', backgroundColor: 'var(--muted-foreground)', flexShrink: 0 }} /><span style={{ fontSize: '0.625rem', color: 'var(--foreground)' }}>No superseded classification applied</span></div>
                  </div>
                  {(() => { const rejRecs = activeGroup?.records.filter(r => rejectedDocs.has(String(r.engagementPageId))) ?? []; const firstReason = rejRecs.length > 0 ? rejectedDocs.get(String(rejRecs[0].engagementPageId)) : null; return firstReason ? (<div style={{ marginBlockStart: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'var(--card)', border: '0.0625rem solid var(--border)' }}><span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-foreground)' }}>Reason</span><p style={{ margin: '0.125rem 0 0', fontSize: '0.625rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4 }}>{firstReason.reason}</p></div>) : null })()}
                </div>
              )}

              {/* Overridden / Verifier Decision state */}
              {!isGroupRejected && aiAnalysisData.isGroupOverridden && (() => {
                const overriddenRecord = activeFlippedIdx !== undefined ? activeGroup!.supersededRecords[activeFlippedIdx] : null
                const allRecords = activeGroup!.records
                return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.625rem 0.75rem', borderRadius: '0.25rem', border: '0.0625rem solid var(--status-warning-border)', backgroundColor: 'var(--status-warning-subtle)' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--status-warning)' }}>Verifier Decision</span>
                  <div style={{ padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'var(--card)', border: '0.0625rem solid var(--border)' }}>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-foreground)' }}>AI Recommended</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBlockStart: '0.25rem' }}>
                      {allRecords.map(r => { const isRej = rejectedPageIds.has(String(r.engagementPageId)); return <span key={r.engagementPageId} style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.125rem 0.375rem', borderRadius: '0.1875rem', backgroundColor: isRej ? 'var(--muted)' : r.decisionType === 'Original' ? 'var(--status-success-subtle)' : 'var(--status-error-subtle)', color: isRej ? 'var(--muted-foreground)' : r.decisionType === 'Original' ? 'var(--status-success)' : 'var(--status-error)', opacity: isRej ? 0.7 : 1 }}>Pg {r.documentRef?.pageNumber ?? r.engagementPageId}: {isRej ? 'Not Sup.' : r.decisionType}</span> })}
                    </div>
                  </div>
                  <div style={{ padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'var(--card)', border: '0.0625rem solid var(--border)' }}>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-foreground)' }}>Verifier Changed To</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBlockStart: '0.25rem' }}>
                      {allRecords.map(r => { const isRej = rejectedPageIds.has(String(r.engagementPageId)); const sd = overrides[`sup-pg${r.engagementPageId}`]; const sDec = sd?.userOverrideDecision; let newLabel: string; if (isRej || sDec?.includes('Not Superseded')) newLabel = 'Not Sup.'; else if (sDec?.endsWith('= Original')) newLabel = 'Original'; else if (sDec?.endsWith('= Superseded')) newLabel = 'Superseded'; else if (overriddenRecord && r.engagementPageId === overriddenRecord.engagementPageId) newLabel = 'Original'; else if (r.decisionType === 'Original') newLabel = 'Superseded'; else newLabel = 'Superseded'; const isExcluded = newLabel === 'Not Sup.'; const changed = !isExcluded && ((r.decisionType === 'Original' && newLabel === 'Superseded') || (r.decisionType === 'Superseded' && newLabel === 'Original')); return <span key={r.engagementPageId} style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.125rem 0.375rem', borderRadius: '0.1875rem', backgroundColor: isExcluded ? 'var(--muted)' : newLabel === 'Original' ? 'var(--status-success-subtle)' : 'var(--status-error-subtle)', color: isExcluded ? 'var(--muted-foreground)' : newLabel === 'Original' ? 'var(--status-success)' : 'var(--status-error)', outline: changed ? '0.125rem solid var(--status-warning)' : isExcluded ? '0.125rem solid var(--border)' : 'none', opacity: isExcluded ? 0.8 : 1 }}>{newLabel}{changed && ' *'}</span> })}
                    </div>
                  </div>
                  {(() => { const changedRec = allRecords.find(r => { const d = overrides[`sup-pg${r.engagementPageId}`]; if (!d) return false; if (d.userOverrideDecision?.includes('Not Superseded')) return false; return d.userOverrideDecision !== d.originalAIDecision }); const reason = changedRec ? overrides[`sup-pg${changedRec.engagementPageId}`]?.overrideReason : null; const displayReason = reason && reason !== 'Verifier decision' ? reason : null; return displayReason ? (<div style={{ padding: '0.25rem 0.375rem', borderRadius: '0.1875rem', backgroundColor: 'var(--card)', border: '0.0625rem solid var(--border)' }}><span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-foreground)' }}>Reason</span><p style={{ margin: '0.0625rem 0 0', fontSize: '0.625rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4 }}>{displayReason}</p></div>) : null })()}
                  {(() => { const excludedRecs = allRecords.filter(r => { const d = overrides[`sup-pg${r.engagementPageId}`]; return d?.userOverrideDecision?.includes('Not Superseded') }); if (excludedRecs.length === 0) return null; const exclReason = overrides[`sup-pg${excludedRecs[0].engagementPageId}`]?.overrideReason; const displayExclR = exclReason && exclReason !== 'Verifier decision' ? exclReason : null; return displayExclR ? (<div style={{ padding: '0.25rem 0.375rem', borderRadius: '0.1875rem', backgroundColor: 'var(--surface-raised)', border: '0.0625rem solid var(--border)' }}><span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-foreground)' }}>Exclusion Reason</span><p style={{ margin: '0.0625rem 0 0', fontSize: '0.625rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4 }}>{displayExclR}</p></div>) : null })()}
                </div>
                )
              })()}

              {/* Normal AI reasoning */}
              {!isGroupRejected && !aiAnalysisData.isGroupOverridden && (() => {
                const formType = activeGroup?.formType ?? 'Unknown'
                const entity = activeGroup?.formEntity ?? ''
                const matchingFields = comparedValues.filter(v => v.match)
                const differingFields = comparedValues.filter(v => !v.match)
                const matchCategories = new Map<string, string[]>()
                matchingFields.forEach(v => { const cat = v.category ?? 'Other'; if (!matchCategories.has(cat)) matchCategories.set(cat, []); matchCategories.get(cat)!.push(v.field) })
                const differCategories = new Map<string, string[]>()
                differingFields.forEach(v => { const cat = v.category ?? 'Other'; if (!differCategories.has(cat)) differCategories.set(cat, []); differCategories.get(cat)!.push(v.field) })
                const supDoc = leftDoc, origDoc = rightDoc
                const supLabel = supDoc?.documentRef?.formLabel ?? `${formType} (Superseded)`
                const origLabel = origDoc?.documentRef?.formLabel ?? `${formType} (Original)`
                const hasCorrectedField = differingFields.some(v => v.field.toLowerCase().includes('corrected'))
                const hasAmountDiffs = differingFields.some(v => (v.category ?? '').toLowerCase() === 'income')
                const hasDocNumberDiff = differingFields.some(v => v.field.toLowerCase().includes('document number'))
                const allIdentifyingMatch = matchingFields.some(v => (v.category ?? '').toLowerCase().includes('recipient')) && matchingFields.some(v => (v.category ?? '').toLowerCase().includes('payer'))
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.5625rem', color: 'var(--muted-foreground)' }}><span style={{ fontWeight: 600, color: 'var(--status-error)' }}>{supLabel.replace(formType, '').replace(/[-()\s]+/g, ' ').trim() || 'Superseded'}</span><span style={{ color: 'var(--border)' }}>vs</span><span style={{ fontWeight: 600, color: 'var(--status-success)' }}>{origLabel.replace(formType, '').replace(/[-()\s]+/g, ' ').trim() || 'Original'}</span></div>
                    <p style={{ fontSize: '0.6875rem', lineHeight: 1.6, color: 'var(--foreground)', margin: 0 }}>
                      {allIdentifyingMatch ? `AI identified these as versions of the same ${formType} filing from ${entity || 'the same payer'}. Core identifying fields match, confirming same taxpayer and payer.` : `AI compared these ${formType} documents: ${matchingFields.length} matching, ${differingFields.length} differing out of ${comparedValues.length} total.`}
                      {hasCorrectedField && ' Corrected indicator changed, consistent with a corrected filing.'}
                      {hasAmountDiffs && ' Income fields differ, expected for a corrected form.'}
                      {hasDocNumberDiff && ' Document Number changed, confirming a revision.'}
                      {!hasCorrectedField && !hasAmountDiffs && differingFields.length > 0 && ` Differences: ${differingFields.map(v => v.field).join(', ')}.`}
                    </p>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {matchingFields.length > 0 && <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'var(--status-success-subtle)', border: '0.0625rem solid var(--status-success-border)' }}><span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--status-success)' }}>Match ({matchingFields.length})</span>{Array.from(matchCategories.entries()).map(([cat, fields]) => <div key={cat} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.1875rem' }}>{fields.map(f => <span key={f} style={{ fontSize: '0.5625rem', fontWeight: 500, padding: '0.0625rem 0.25rem', borderRadius: '0.125rem', backgroundColor: 'var(--status-success-subtle)', color: 'var(--status-success)' }}>{f}</span>)}</div>)}</div>}
                      {differingFields.length > 0 && <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'var(--status-warning-subtle)', border: '0.0625rem solid var(--status-warning-border)' }}><span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--status-warning)' }}>Differ ({differingFields.length})</span>{Array.from(differCategories.entries()).map(([cat, fields]) => <div key={cat} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.1875rem' }}>{fields.map(f => <span key={f} style={{ fontSize: '0.5625rem', fontWeight: 500, padding: '0.0625rem 0.25rem', borderRadius: '0.125rem', backgroundColor: 'var(--status-warning-subtle)', color: 'var(--status-warning)' }}>{f}</span>)}</div>)}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'var(--status-info-subtle)', border: '0.0625rem solid var(--status-info-border)' }}>
                      <Info style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--ai-accent)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                      <span style={{ fontSize: '0.625rem', color: 'var(--foreground)', lineHeight: 1.5 }}>
                        {hasCorrectedField ? 'Verify Corrected indicator and updated amounts before accepting.' : hasAmountDiffs ? 'Review income field differences to confirm updated filing.' : differingFields.length === 0 ? 'All fields match. Verify these are not distinct filings.' : `Review ${differingFields.length} differing field${differingFields.length !== 1 ? 's' : ''} to confirm superseded version.`}
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Document Queue (compact list) */}
          <div style={{ flex: '1 1 0', overflowY: 'auto', minBlockSize: 0 }}>
            <div style={{ padding: '0.5rem 0.875rem 0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Document Queue</span>
              <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{groups.length} groups</span>
            </div>
            {groups.map((group, gIdx) => {
              const isActiveGroup = gIdx === selectedGroupIdx
              const avgConfidence = group.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / group.records.length
              const avgConfPct = Math.round(avgConfidence * 100)
              const confColor = avgConfPct >= 90 ? 'var(--confidence-high)' : avgConfPct >= 70 ? 'var(--confidence-medium)' : 'var(--confidence-low)'
              const groupRejectedCount = group.records.filter(r => rejectedDocs.has(String(r.engagementPageId))).length
              const isThisGroupRejected = groupRejectedCount === group.records.length
              const isThisGroupAccepted = group.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
              const isThisGroupReclassified = flippedGroups.has(group.formType)
              let statusLabel: string, statusBg: string, statusColor: string
              if (isThisGroupRejected) { statusLabel = 'Excluded'; statusBg = 'var(--muted)'; statusColor = 'var(--muted-foreground)' }
              else if (isThisGroupAccepted) { statusLabel = 'Accepted'; statusBg = 'var(--status-success-subtle)'; statusColor = 'var(--status-success)' }
              else if (isThisGroupReclassified) { statusLabel = 'Reclassified'; statusBg = 'var(--status-warning-subtle)'; statusColor = 'var(--status-warning)' }
              else { statusLabel = 'Pending'; statusBg = `${confColor} / 0.12`; statusColor = confColor }

              return (
                <button key={group.formType} type="button" onClick={() => selectGroup(gIdx)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', inlineSize: '100%', padding: '0.5rem 0.875rem', border: 'none', cursor: 'pointer', textAlign: 'start', backgroundColor: isActiveGroup ? 'var(--status-info-subtle)' : 'transparent', borderInlineStart: isActiveGroup ? '0.1875rem solid var(--ai-accent)' : '0.1875rem solid transparent', opacity: isThisGroupRejected ? 0.6 : 1 }}>
                  <div style={{ flex: '1 1 0', minInlineSize: 0 }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: isActiveGroup ? 700 : 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isThisGroupRejected ? 'line-through' : 'none' }}>{group.formType}: {group.formEntity.toUpperCase()}</span>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>{group.records.length} {group.records.length === 1 ? 'page' : 'pages'}</span>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: '0.5625rem', fontWeight: 700, padding: '0.0625rem 0.3125rem', borderRadius: '0.1875rem', backgroundColor: statusBg, color: statusColor }}>{statusLabel}</span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── RIGHT: Evidence Panel (Tabbed) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div role="tablist" aria-label="Evidence tabs" style={{ display: 'flex', borderBlockEnd: '0.0625rem solid var(--border)', backgroundColor: 'var(--surface-raised)', flexShrink: 0 }}>
            <button type="button" role="tab" aria-selected={activeTab === 'fields'} onClick={() => setActiveTab('fields')} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem', border: 'none', borderBlockEnd: activeTab === 'fields' ? '0.125rem solid var(--ai-accent)' : '0.125rem solid transparent', cursor: 'pointer', fontSize: '0.75rem', fontWeight: activeTab === 'fields' ? 700 : 500, color: activeTab === 'fields' ? 'var(--foreground)' : 'var(--muted-foreground)', backgroundColor: 'transparent' }}>
              <Columns2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: activeTab === 'fields' ? 'var(--ai-accent)' : 'var(--muted-foreground)' }} />
              Fields
              {comparedValues.length > 0 && <span style={{ fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.0625rem 0.25rem', borderRadius: '0.625rem', backgroundColor: activeTab === 'fields' ? 'var(--status-error-subtle)' : 'var(--muted)', color: activeTab === 'fields' ? 'var(--status-error)' : 'var(--muted-foreground)' }}>{comparedValues.filter(v => !v.match).length}/{comparedValues.length}</span>}
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'documents'} onClick={() => setActiveTab('documents')} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem', border: 'none', borderBlockEnd: activeTab === 'documents' ? '0.125rem solid var(--ai-accent)' : '0.125rem solid transparent', cursor: 'pointer', fontSize: '0.75rem', fontWeight: activeTab === 'documents' ? 700 : 500, color: activeTab === 'documents' ? 'var(--foreground)' : 'var(--muted-foreground)', backgroundColor: 'transparent' }}>
              <Eye style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: activeTab === 'documents' ? 'var(--ai-accent)' : 'var(--muted-foreground)' }} />
              Documents
            </button>
          </div>

          {/* Tab content */}
          <div style={{ flex: '1 1 0', overflow: 'auto', minBlockSize: 0 }}>
            {/* Fields tab */}
            {activeTab === 'fields' && (
              <div style={{ padding: '0.75rem 1rem' }}>
                {isGroupRejected ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>Group excluded -- no field comparison available</div>
                ) : comparedValues.length > 0 ? (
                  <FieldComparison values={comparedValues} labelA={leftDoc?.documentRef?.formLabel ?? 'Superseded'} labelB={rightDoc?.documentRef?.formLabel ?? 'Original'} docRefA={leftDoc?.documentRef} docRefB={rightDoc?.documentRef} isOverridden={isActiveFlipped} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>No field comparison data</div>
                )}
              </div>
            )}

            {/* Documents tab */}
            {activeTab === 'documents' && (
              <>
                {isGroupRejected ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>Group excluded -- no documents to display</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', blockSize: '100%', minBlockSize: '28rem' }}>
                    <div style={{ overflow: 'auto', padding: '0.5rem' }}>
                      {supersededList.length > 1 && (
                        <div style={{ display: 'flex', gap: '0.25rem', marginBlockEnd: '0.375rem', padding: '0.25rem', backgroundColor: 'var(--surface-sunken)', borderRadius: '0.25rem', border: '0.0625rem solid var(--border)' }}>
                          {supersededList.map((sr, sIdx) => (
                            <button key={sr.engagementPageId} type="button" onClick={() => setSelectedSupersededIdx(sIdx)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.0625rem', padding: '0.3125rem 0.5rem', border: sIdx === safeIdx ? '0.0625rem solid var(--ai-accent)' : '0.0625rem solid transparent', borderRadius: '0.1875rem', backgroundColor: sIdx === safeIdx ? 'var(--card)' : 'transparent', boxShadow: sIdx === safeIdx ? '0 0.0625rem 0.1875rem rgba(0,0,0,0.12)' : 'none', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                              <span style={{ fontSize: '0.6875rem', fontWeight: sIdx === safeIdx ? 700 : 500, color: sIdx === safeIdx ? 'var(--ai-accent)' : 'var(--muted-foreground)' }}>Pg {sr.documentRef?.pageNumber ?? sr.engagementPageId}</span>
                              <span style={{ fontSize: '0.5625rem', fontWeight: 500, color: sIdx === safeIdx ? 'var(--ai-accent)' : 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxInlineSize: '8rem' }}>{sr.documentRef?.formLabel?.replace(activeGroup?.formType ?? '', '').replace(/[()]/g, '').trim() || 'Superseded'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {leftDoc?.documentRef ? <PdfPageViewer documentRef={leftDoc.documentRef} stamp="SUPERSEDED" height="30rem" /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>No superseded document</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.25rem', borderInlineStart: '0.0625rem solid var(--border)', borderInlineEnd: '0.0625rem solid var(--border)', backgroundColor: 'var(--surface-raised)' }}>
                      {[{ icon: ZoomIn, label: 'Zoom in' }, { icon: ZoomOut, label: 'Zoom out' }, { icon: Maximize, label: 'Fit to view' }, { icon: RotateCw, label: 'Rotate' }, { icon: FlipHorizontal, label: 'Flip horizontal' }, { icon: FlipVertical, label: 'Flip vertical' }].map(({ icon: Icon, label }) => (
                        <button key={label} type="button" aria-label={label} title={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', inlineSize: '2rem', blockSize: '2rem', border: '0.0625rem solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer' }}><Icon style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} /></button>
                      ))}
                    </div>
                    <div style={{ overflow: 'auto', padding: '0.5rem' }}>
                      {rightDoc?.documentRef ? <PdfPageViewer documentRef={rightDoc.documentRef} stamp="ORIGINAL" height="30rem" /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', blockSize: '100%', color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>No original document</div>}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════���═══════════
          PROGRESS FOOTER
          ══════════════���═══════════════════════════════════════════ */}
      <footer style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.375rem 1rem', borderBlockStart: '0.0625rem solid var(--border)', backgroundColor: 'var(--surface-raised)', flexShrink: 0 }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>{reviewedCount} of {groups.length} reviewed</span>
        <div style={{ flex: '1 1 0', blockSize: '0.25rem', borderRadius: '0.125rem', backgroundColor: 'var(--muted)', overflow: 'hidden' }}>
          <div style={{ blockSize: '100%', inlineSize: `${groups.length > 0 ? (reviewedCount / groups.length) * 100 : 0}%`, backgroundColor: reviewedCount === groups.length ? 'var(--status-success)' : 'var(--ai-accent)', borderRadius: '0.125rem', transition: 'inline-size 0.3s ease' }} />
        </div>
        {reviewedCount === groups.length && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--status-success)' }}>Complete</span>}
      </footer>
    </div>
  )
}
