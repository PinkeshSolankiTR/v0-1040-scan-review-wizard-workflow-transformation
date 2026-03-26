'use client'

/**
 * DESIGN VARIANT E: "Document Comparison"
 * Teams-style layout: left sidebar list + right detail panel with tabs.
 * Matches the Microsoft Teams chat pattern.
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
  let reasonId: string | null = null
  let reasonCustom = ''
  if (savedReclReason && savedReclReason !== 'Verifier decision') {
    const found = OVERRIDE_REASONS.find(x => x.label === savedReclReason)
    if (found) { reasonId = found.id }
    else { reasonId = 'custom'; reasonCustom = savedReclReason || '' }
  }
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
  // Per-row reason state: pageId -> { reasonId, customText }
  const [rowReasons, setRowReasons] = useState<Map<string, { reasonId: string | null; customText: string }>>(new Map())

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
    // Seed docRoles with AI defaults for the new group
    const g = groups[idx]
    if (g) {
      const fresh = new Map<string, 'original' | 'superseded' | 'not-superseded'>()
      for (const r of g.records) { fresh.set(String(r.engagementPageId), r.decisionType === 'Original' ? 'original' : 'superseded') }
      setDocRoles(fresh)
    }
    setSelectedReason(null); setCustomReason(''); setRowReasons(new Map())
    setShowRejectPanel(false); setSelectedRejectReasons(new Set()); setCustomRejectReason('')
  }

  // Seed docRoles on initial mount for the first group
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeGroup && docRoles.size === 0) {
      const fresh = new Map<string, 'original' | 'superseded' | 'not-superseded'>()
      for (const r of activeGroup.records) { fresh.set(String(r.engagementPageId), r.decisionType === 'Original' ? 'original' : 'superseded') }
      setDocRoles(fresh)
    }
  }, [activeGroup])

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

  const handleUndoAcceptGroup = () => {
    if (!activeGroup) return
    for (const r of activeGroup.records) {
      undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
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

  const [activeTab, setActiveTab] = useState<'fields' | 'documents' | 'analysis'>('analysis')

  const reviewedCount = useMemo(() => {
    return groups.filter(g => {
      const isAccepted = g.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
      const isRejected = g.records.every(r => rejectedDocs.has(String(r.engagementPageId)))
      const isReclassified = flippedGroups.has(g.formType)
      return isAccepted || isRejected || isReclassified
    }).length
  }, [groups, decisions, rejectedDocs, flippedGroups])

  const aiAnalysisData = useMemo(() => {
    const avgConfRaw = activeGroup ? activeGroup.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / activeGroup.records.length : 0
    const avgConf = Math.round(avgConfRaw * 100)
    const confColor = avgConf >= 90 ? 'var(--confidence-high)' : avgConf >= 70 ? 'var(--confidence-medium)' : 'var(--confidence-low)'
    const panelActionLabel = avgConf >= 90 ? 'High Confidence' : avgConf >= 70 ? 'Moderate Confidence' : 'Low Confidence'
    const panelTooltip = avgConf >= 90 ? 'AI is confident. Reviewer can approve quickly.' : avgConf >= 70 ? 'AI has moderate confidence. Reviewer should verify key fields.' : 'AI is uncertain. Reviewer must examine carefully.'
    const hasOverrides = activeGroup?.records.some(r => { const ovd = overrides[`sup-pg${r.engagementPageId}`]; return ovd?.userOverrideDecision?.includes('Not Superseded') || (ovd && ovd.userOverrideDecision !== `Page ${r.engagementPageId} = ${r.decisionType}`) }) ?? false
    const hasPartialRejections = activeGroup ? activeGroup.records.some(r => rejectedDocs.has(String(r.engagementPageId))) && !activeGroup.records.every(r => rejectedDocs.has(String(r.engagementPageId))) : false
    const isGroupOverridden = isActiveFlipped || hasOverrides || hasPartialRejections
    const panelIdentifier = activeGroup ? extractIdentifier(activeGroup.records) : null
    return { avgConf, confColor, panelActionLabel, panelTooltip, isGroupOverridden, panelIdentifier }
  }, [activeGroup, isActiveFlipped, overrides, rejectedDocs])

  /* ──────────────────────────────────────────────────────────────────
     RENDER: Teams-style layout
     Left sidebar (document list) | Right panel (title bar + tabs + content)
     ────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ═══════════════════════════════════════════════════════════
          LEFT SIDEBAR: Document group list (Teams chat list style)
          ═══════════════════════════════════════════════════════════ */}
      <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-card">
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Superseded</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">{groups.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{reviewedCount}/{groups.length}</span>
          </div>
        </div>

        {/* Scrollable group list */}
        <div className="flex-1 overflow-y-auto">
          {groups.map((group, gIdx) => {
            const isActive = gIdx === selectedGroupIdx
            const avgConfidence = group.records.reduce((sum, r) => sum + r.confidenceLevel, 0) / group.records.length
            const avgConfPct = Math.round(avgConfidence * 100)
            const groupRejectedCount = group.records.filter(r => rejectedDocs.has(String(r.engagementPageId))).length
            const isThisGroupRejected = groupRejectedCount === group.records.length
            const isThisGroupAccepted = group.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
            const isThisGroupReclassified = flippedGroups.has(group.formType)

            let statusDot: string
            let statusLabel: string
            if (isThisGroupRejected) { statusDot = 'bg-muted-foreground'; statusLabel = 'Excluded' }
            else if (isThisGroupAccepted) { statusDot = 'bg-emerald-500'; statusLabel = 'Accepted' }
            else if (isThisGroupReclassified) { statusDot = 'bg-amber-500'; statusLabel = 'Reclassified' }
            else { statusDot = avgConfPct >= 90 ? 'bg-emerald-500' : avgConfPct >= 70 ? 'bg-amber-500' : 'bg-red-500'; statusLabel = 'Pending' }

            return (
              <button
                key={group.formType}
                type="button"
                onClick={() => selectGroup(gIdx)}
                className={`flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-start transition-colors ${
                  isActive
                    ? 'border-l-2 border-l-primary bg-accent/50'
                    : 'border-l-2 border-l-transparent hover:bg-accent/30'
                } ${isThisGroupRejected ? 'opacity-50' : ''}`}
              >
                {/* Status indicator (like avatar in Teams) */}
                <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${statusDot}`} />
                </div>

                {/* Text content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground'} ${isThisGroupRejected ? 'line-through' : ''}`}>
                      {group.formType}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {group.records.length}p
                    </span>
                  </div>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[0.625rem] font-semibold ${
                    isThisGroupAccepted ? 'bg-emerald-500/10 text-emerald-600' :
                    isThisGroupRejected ? 'bg-muted text-muted-foreground' :
                    isThisGroupReclassified ? 'bg-amber-500/10 text-amber-600' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {statusLabel}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Sidebar footer: progress */}
        <div className="border-t border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${reviewedCount === groups.length ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${groups.length > 0 ? (reviewedCount / groups.length) * 100 : 0}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {reviewedCount}/{groups.length}
            </span>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT PANEL: Title bar + Tab bar + Content
          ═══════════════════════════════════════════════════════════ */}
      <div ref={containerRef} className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* ── Title bar (like Teams conversation title) ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-5 py-2.5">
          {/* Left: title + confidence */}
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-base font-bold text-foreground">
              {activeGroup?.formType}: {activeGroup?.formEntity.toUpperCase()}
            </h1>
            {aiAnalysisData.panelIdentifier && (
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {aiAnalysisData.panelIdentifier.label}: {aiAnalysisData.panelIdentifier.value}
              </span>
            )}

          </div>

          {/* Right: status badges + Accept/Undo + Next (persistent across all tabs) */}
          <div className="flex shrink-0 items-center gap-2">
            {isGroupRejected && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: 'var(--status-error-subtle)', color: 'var(--status-error)' }}>
                <X className="h-3.5 w-3.5" /> Excluded
              </span>
            )}
            {isActiveFlipped && !isGroupRejected && !allGroupAccepted && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: 'var(--status-warning-subtle)', color: 'var(--status-warning)' }}>
                <ArrowLeftRight className="h-3.5 w-3.5" /> Reclassified
              </span>
            )}
            <span className="text-xs text-muted-foreground">{reviewedCount}/{groups.length} reviewed</span>
            <div className="mx-1 h-5 w-px bg-border" />
            {/* Accept / Undo toggle */}
            {allGroupAccepted ? (
              <button
                type="button"
                onClick={handleUndoAcceptGroup}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </button>
            ) : isGroupRejected ? (
              <button
                type="button"
                onClick={handleUndoRejectAll}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  handleAcceptGroup()
                  setShowAcceptDropdown(false)
                  setTimeout(() => { if (selectedGroupIdx < groups.length - 1) selectGroup(selectedGroupIdx + 1) }, 300)
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--status-success)' }}
              >
                <Check className="h-3.5 w-3.5" /> Accept
              </button>
            )}
            {/* Next */}
            <button
              type="button"
              onClick={() => { if (selectedGroupIdx < groups.length - 1) selectGroup(selectedGroupIdx + 1) }}
              disabled={selectedGroupIdx >= groups.length - 1}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Tab bar (like Teams: Chat | Shared | Recap) ── */}
        <div role="tablist" aria-label="Evidence tabs" className="flex shrink-0 border-b border-border bg-card px-5">
          {/* Confidence / AI Analysis tab -- first position */}
          {(() => {
            const confidenceLabel = isGroupRejected
              ? 'Not Superseded'
              : aiAnalysisData.isGroupOverridden
                ? 'Reclassified'
                : aiAnalysisData.panelActionLabel
            const confidenceColor = isGroupRejected
              ? 'var(--muted-foreground)'
              : aiAnalysisData.isGroupOverridden
                ? 'var(--status-warning)'
                : aiAnalysisData.confColor
            return (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'analysis'}
                onClick={() => setActiveTab('analysis')}
                className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'analysis' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: `color-mix(in srgb, ${confidenceColor} 12%, transparent)`, color: confidenceColor }}
                >
                  {confidenceLabel}
                </span>
                {activeTab === 'analysis' && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            )
          })()}
          {/* Fields + Documents tabs */}
          {[
            { id: 'fields' as const, label: 'Fields', icon: Columns2, badge: comparedValues.length > 0 ? `${comparedValues.filter(v => !v.match).length}/${comparedValues.length}` : null },
            { id: 'documents' as const, label: 'Documents', icon: Eye, badge: null },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge && (
                <span className={`rounded-full px-1.5 py-0.5 font-mono text-[0.625rem] font-bold ${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-auto">
          {/* Fields tab */}
          {activeTab === 'fields' && (
            <div className="p-5">
              {isGroupRejected ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Group excluded -- no field comparison available</div>
              ) : comparedValues.length > 0 ? (
                <FieldComparison values={comparedValues} labelA={leftDoc?.documentRef?.formLabel ?? 'Superseded'} labelB={rightDoc?.documentRef?.formLabel ?? 'Original'} docRefA={leftDoc?.documentRef} docRefB={rightDoc?.documentRef} isOverridden={isActiveFlipped} />
              ) : (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">No field comparison data</div>
              )}
            </div>
          )}

          {/* Documents tab */}
          {activeTab === 'documents' && (
            <>
              {isGroupRejected ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Group excluded -- no documents to display</div>
              ) : (
                <div className="grid h-full min-h-[28rem] grid-cols-[1fr_auto_1fr]">
                  <div className="overflow-auto p-3">
                    {supersededList.length > 1 && (
                      <div className="mb-2 flex gap-1 rounded-md border border-border bg-muted/50 p-1">
                        {supersededList.map((sr, sIdx) => (
                          <button key={sr.engagementPageId} type="button" onClick={() => setSelectedSupersededIdx(sIdx)} className={`flex flex-1 flex-col items-center gap-0.5 rounded px-2 py-1.5 text-xs transition-colors ${sIdx === safeIdx ? 'border border-primary/30 bg-card font-semibold text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                            <span>Pg {sr.documentRef?.pageNumber ?? sr.engagementPageId}</span>
                            <span className="truncate text-[0.625rem] max-w-[8rem]">{sr.documentRef?.formLabel?.replace(activeGroup?.formType ?? '', '').replace(/[()]/g, '').trim() || 'Superseded'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {leftDoc?.documentRef ? <PdfPageViewer documentRef={leftDoc.documentRef} stamp="SUPERSEDED" height="30rem" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No superseded document</div>}
                  </div>
                  {/* Vertical toolbar */}
                  <div className="flex flex-col items-center gap-1.5 border-x border-border bg-muted/30 px-1.5 py-3">
                    {[{ icon: ZoomIn, label: 'Zoom in' }, { icon: ZoomOut, label: 'Zoom out' }, { icon: Maximize, label: 'Fit to view' }, { icon: RotateCw, label: 'Rotate' }, { icon: FlipHorizontal, label: 'Flip horizontal' }, { icon: FlipVertical, label: 'Flip vertical' }].map(({ icon: Icon, label }) => (
                      <button key={label} type="button" aria-label={label} title={label} className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-accent">
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <div className="overflow-auto p-3">
                    {rightDoc?.documentRef ? <PdfPageViewer documentRef={rightDoc.documentRef} stamp="ORIGINAL" height="30rem" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No original document</div>}
                  </div>
                </div>
              )}
            </>
          )}

          {/* AI Analysis tab -- Option D: Clean layout (no chat style) */}
          {activeTab === 'analysis' && (
            <div className="mx-auto max-w-2xl p-5">

              {/* ── State: Group rejected ── */}
              {isGroupRejected && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground">Not Superseded -- Excluded by Verifier</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Documents available in SPBinder as independent records.</p>
                  </div>
                  {(() => { const rejRecs = activeGroup?.records.filter(r => rejectedDocs.has(String(r.engagementPageId))) ?? []; const firstReason = rejRecs.length > 0 ? rejectedDocs.get(String(rejRecs[0].engagementPageId)) : null; return firstReason ? (
                    <div className="rounded-md border border-border bg-card p-3">
                      <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Reason</span>
                      <p className="text-sm font-semibold text-foreground">{firstReason.reason}</p>
                    </div>
                  ) : null })()}
                </div>
              )}

              {/* ── State: Reclassified (overridden) ── */}
              {!isGroupRejected && aiAnalysisData.isGroupOverridden && (() => {
                const overriddenRecord = activeFlippedIdx !== undefined ? activeGroup!.supersededRecords[activeFlippedIdx] : null
                const allRecords = activeGroup!.records
                return (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                      <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">AI Recommended</span>
                      <div className="flex flex-wrap gap-1.5">
                        {allRecords.map(r => <span key={r.engagementPageId} className={`rounded px-2 py-0.5 text-xs font-semibold ${r.decisionType === 'Original' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>Pg {r.documentRef?.pageNumber ?? r.engagementPageId}: {r.decisionType}</span>)}
                      </div>
                    </div>
                    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--status-warning-border)', backgroundColor: 'var(--status-warning-subtle)' }}>
                      <span className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--status-warning)' }}>Verifier Changed To</span>
                      <div className="flex flex-wrap gap-1.5">
                        {allRecords.map(r => {
                          const pgNum = r.documentRef?.pageNumber ?? r.engagementPageId
                          const isRej = rejectedPageIds.has(String(r.engagementPageId)); const sd = overrides[`sup-pg${r.engagementPageId}`]; const sDec = sd?.userOverrideDecision
                          let newLabel: string
                          if (isRej || sDec?.includes('Not Superseded')) newLabel = 'Not Sup.'
                          else if (sDec?.endsWith('= Original')) newLabel = 'Original'
                          else if (sDec?.endsWith('= Superseded')) newLabel = 'Superseded'
                          else if (overriddenRecord && r.engagementPageId === overriddenRecord.engagementPageId) newLabel = 'Original'
                          else newLabel = r.decisionType === 'Original' ? 'Original' : 'Superseded'
                          const isExcluded = newLabel === 'Not Sup.'
                          const changed = !isExcluded && ((r.decisionType === 'Original' && newLabel === 'Superseded') || (r.decisionType === 'Superseded' && newLabel === 'Original'))
                          return <span key={r.engagementPageId} className={`rounded px-2 py-0.5 text-xs font-semibold ${isExcluded ? 'bg-muted text-muted-foreground' : newLabel === 'Original' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`} style={changed ? { outline: '2px solid var(--status-warning)' } : undefined}>Pg {pgNum}: {newLabel}{changed && ' *'}</span>
                        })}
                      </div>
                      {/* Show reasons for each changed/excluded record */}
                      {(() => {
                        const reasons: { pageId: number; label: string; reason: string }[] = []
                        for (const r of allRecords) {
                          const pid = String(r.engagementPageId)
                          const pgNum = r.documentRef?.pageNumber ?? r.engagementPageId
                          const isRej = rejectedPageIds.has(pid)
                          if (isRej) {
                            const rejData = rejectedDocs.get(pid)
                            if (rejData?.reason && rejData.reason !== 'Verifier decision') {
                              reasons.push({ pageId: pgNum, label: 'Not Sup.', reason: rejData.reason })
                            }
                          } else {
                            const sd = overrides[`sup-pg${r.engagementPageId}`]
                            if (sd && sd.overrideReason && sd.overrideReason !== 'Verifier decision' && sd.userOverrideDecision !== sd.originalAIDecision) {
                              const dec = sd.userOverrideDecision?.endsWith('= Original') ? 'Original' : 'Superseded'
                              reasons.push({ pageId: pgNum, label: dec, reason: sd.overrideReason })
                            }
                          }
                        }
                        // Deduplicate if all reasons are the same
                        const uniqueReasons = [...new Set(reasons.map(r => r.reason))]
                        if (uniqueReasons.length === 1) {
                          return <p className="mt-2 text-xs text-foreground"><span className="font-bold text-muted-foreground">Reason:</span> {uniqueReasons[0]}</p>
                        }
                        return reasons.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {reasons.map(r => (
                              <p key={r.pageId} className="text-xs text-foreground"><span className="font-bold text-muted-foreground">Pg {r.pageId} ({r.label}):</span> {r.reason}</p>
                            ))}
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>
                )
              })()}

              {/* ── State: Normal (pending review) or Accepted ── */}
              {!isGroupRejected && !aiAnalysisData.isGroupOverridden && (() => {
                const formType = activeGroup?.formType ?? 'Unknown'
                const entity = activeGroup?.formEntity ?? ''
                const matchingFields = comparedValues.filter(v => v.match)
                const differingFields = comparedValues.filter(v => !v.match)
                const supDoc = leftDoc, origDoc = rightDoc
                const supLabel = supDoc?.documentRef?.formLabel ?? `${formType} (Superseded)`
                const origLabel = origDoc?.documentRef?.formLabel ?? `${formType} (Original)`
                const hasCorrectedField = differingFields.some(v => v.field.toLowerCase().includes('corrected'))
                const hasAmountDiffs = differingFields.some(v => (v.category ?? '').toLowerCase() === 'income')
                const hasDocNumberDiff = differingFields.some(v => v.field.toLowerCase().includes('document number'))
                const allIdentifyingMatch = matchingFields.some(v => (v.category ?? '').toLowerCase().includes('recipient')) && matchingFields.some(v => (v.category ?? '').toLowerCase().includes('payer'))
                return (
                  <div className="space-y-5">
                    {/* AI narrative block */}
                    <div className="rounded-lg border border-border bg-card p-4">
                      {/* Document labels */}
                      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold" style={{ color: 'var(--status-error)' }}>{supLabel.replace(formType, '').replace(/[-()\s]+/g, ' ').trim() || 'Superseded'}</span>
                        <span className="text-border">vs</span>
                        <span className="font-semibold" style={{ color: 'var(--status-success)' }}>{origLabel.replace(formType, '').replace(/[-()\s]+/g, ' ').trim() || 'Original'}</span>
                      </div>

                      {/* Narrative */}
                      <p className="text-sm leading-relaxed text-foreground">
                        {allIdentifyingMatch ? `AI identified these as versions of the same ${formType} filing from ${entity || 'the same payer'}. Core identifying fields match, confirming same taxpayer and payer.` : `AI compared these ${formType} documents: ${matchingFields.length} matching, ${differingFields.length} differing out of ${comparedValues.length} total.`}
                        {hasCorrectedField && ' Corrected indicator changed, consistent with a corrected filing.'}
                        {hasAmountDiffs && ' Income fields differ, expected for a corrected form.'}
                        {hasDocNumberDiff && ' Document Number changed, confirming a revision.'}
                        {!hasCorrectedField && !hasAmountDiffs && differingFields.length > 0 && ` Differences: ${differingFields.map(v => v.field).join(', ')}.`}
                      </p>

                      {/* Guidance */}
                      <div className="mt-3 flex items-start gap-2 rounded-md border p-3" style={{ backgroundColor: 'var(--status-info-subtle)', borderColor: 'var(--status-info-border)' }}>
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="text-xs text-foreground leading-relaxed">{aiAnalysisData.panelTooltip}</span>
                      </div>
                    </div>

                    {/* ── Collapsible reclassification section + Not Superseded button ── */}
                    {!allGroupAccepted && !isGroupRejected && (() => {
                      const tableRecords = activeGroup?.records.filter(record => !rejectedPageIds.has(String(record.engagementPageId))) ?? []
                      // Hide Not Sup. column for 2-doc groups (use the whole-group button instead)
                      const showNotSupColumn = tableRecords.length > 2
                      // Compute changed rows
                      const changedRows = tableRecords.filter(r => {
                        const cur = docRoles.get(String(r.engagementPageId))
                        const ai = r.decisionType === 'Original' ? 'original' : 'superseded'
                        return cur && cur !== ai
                      })
                      const _hasAnyChange = changedRows.length > 0
                      const _origCount = Array.from(docRoles.values()).filter(v => v === 'original').length
                      const _supCount = Array.from(docRoles.values()).filter(v => v === 'superseded').length
                      const _hasNotSup = Array.from(docRoles.values()).some(v => v === 'not-superseded')
                      const _valError = _hasAnyChange ? (_origCount === 0 ? 'At least one document must be Original.' : _supCount === 0 && !_hasNotSup ? 'At least one document must be Superseded.' : null) : null
                      // Validate: every changed row must have a reason
                      const _allReasonsSet = changedRows.every(r => {
                        const rr = rowReasons.get(String(r.engagementPageId))
                        return rr && (rr.reasonId !== null || rr.customText.trim() !== '')
                      })
                      const _canApply = _hasAnyChange && !_valError && _allReasonsSet

                      return (
                        <>
                          {/* Collapsible header */}
                          <div className="border-t border-border pt-4">
                            <button
                              type="button"
                              onClick={() => setShowOverridePanel(p => !p)}
                              className="flex w-full items-center gap-2 text-left"
                            >
                              {showOverridePanel ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                              <div>
                                <p className="text-xs font-bold text-foreground">Not satisfied with the AI recommendation?</p>
                                <p className="text-[0.6875rem] text-muted-foreground">Reclassify pages within this group.</p>
                              </div>
                            </button>
                          </div>

                          {/* Expanded: Classification table */}
                          {showOverridePanel && (
                            <>
                              <div className="overflow-hidden rounded-lg border border-border">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                      <th className="px-3 py-2 text-left font-bold text-muted-foreground">Page</th>
                                      <th className="px-3 py-2 text-center font-bold" style={{ color: 'var(--status-success)' }}>Original</th>
                                      <th className="px-3 py-2 text-center font-bold" style={{ color: 'var(--status-info)' }}>Superseded</th>
                                      {showNotSupColumn && <th className="px-3 py-2 text-center font-bold text-muted-foreground">Not Sup.</th>}
                                      <th className="min-w-[10rem] px-3 py-2 text-left font-bold text-muted-foreground">Reason</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tableRecords.map((record) => {
                                      const pageId = String(record.engagementPageId)
                                      const aiRole = record.decisionType === 'Original' ? 'original' : 'superseded'
                                      const currentRole = docRoles.get(pageId) ?? aiRole
                                      const isChanged = currentRole !== aiRole
                                      const radioName = `role-${pageId}`
                                      const isNotSup = currentRole === 'not-superseded'
                                      // Per-row reason
                                      const rowReason = rowReasons.get(pageId)
                                      const rowReasonId = rowReason?.reasonId ?? null
                                      const rowCustomText = rowReason?.customText ?? ''
                                      // Which reason options to show for this row
                                      const reasonOptions = isNotSup ? REJECTION_REASONS : OVERRIDE_REASONS

                                      return (
                                        <tr key={pageId} className={`border-b border-border last:border-b-0 transition-colors ${isChanged ? (isNotSup ? 'bg-red-500/5' : 'bg-amber-500/5') : ''}`}>
                                          <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                              <span className="font-semibold text-foreground">Pg {record.documentRef?.pageNumber ?? record.engagementPageId}</span>
                                              {!isChanged && <span className="rounded bg-muted px-1.5 py-0.5 text-[0.5625rem] text-muted-foreground">AI</span>}
                                              {isChanged && !isNotSup && <span className="rounded px-1.5 py-0.5 text-[0.5625rem] font-bold" style={{ backgroundColor: 'var(--status-warning-subtle)', color: 'var(--status-warning)' }}>Changed</span>}
                                              {isNotSup && <span className="rounded px-1.5 py-0.5 text-[0.5625rem] font-bold" style={{ backgroundColor: 'var(--status-error-subtle)', color: 'var(--status-error)' }}>Excluded</span>}
                                            </div>
                                          </td>
                                          {(['original', 'superseded', ...(showNotSupColumn ? ['not-superseded'] : [])] as const).map(role => (
                                            <td key={role} className="px-3 py-2.5 text-center">
                                              <input
                                                type="radio"
                                                name={radioName}
                                                checked={currentRole === role}
                                                onChange={() => {
                                                  setDocRoles(prev => {
                                                    const next = new Map(prev)
                                                    for (const rec of tableRecords) {
                                                      const rid = String(rec.engagementPageId)
                                                      if (!next.has(rid)) { next.set(rid, rec.decisionType === 'Original' ? 'original' : 'superseded') }
                                                    }
                                                    next.set(pageId, role)
                                                    if (role === 'original') {
                                                      for (const [otherId, otherRole] of next.entries()) {
                                                        if (otherId !== pageId && otherRole === 'original') {
                                                          next.set(otherId, 'superseded')
                                                        }
                                                      }
                                                    }
                                                    return next
                                                  })
                                                  // Set per-row reason: blank for Original/Superseded, copy from existing Not Sup row if available
                                                  setRowReasons(prev => {
                                                    const next = new Map(prev)
                                                    if (role === 'not-superseded') {
                                                      // Copy reason from an existing Not Superseded row if one has a reason set
                                                      let prefillReason: { reasonId: string | null; customText: string } | null = null
                                                      for (const [otherId, otherReason] of next.entries()) {
                                                        if (otherId !== pageId && otherReason.reasonId !== null) {
                                                          const otherRole = docRoles.get(otherId)
                                                          if (otherRole === 'not-superseded') { prefillReason = otherReason; break }
                                                        }
                                                      }
                                                      next.set(pageId, prefillReason ? { ...prefillReason } : { reasonId: null, customText: '' })
                                                    } else {
                                                      // Original or Superseded: leave blank, user picks first
                                                      if (!next.has(pageId) || !next.get(pageId)?.reasonId) {
                                                        next.set(pageId, { reasonId: null, customText: '' })
                                                      }
                                                    }
                                                    return next
                                                  })
                                                }}
                                                className="h-3.5 w-3.5 cursor-pointer"
                                                style={{ accentColor: role === 'original' ? 'var(--status-success)' : role === 'superseded' ? 'var(--status-info)' : 'var(--muted-foreground)' }}
                                              />
                                            </td>
                                          ))}
                                          <td className="px-3 py-2.5">
                                            {isChanged ? (
                                              <div className="flex flex-col gap-1">
                                                <select
                                                  value={rowReasonId ?? ''}
                                                  onChange={(e) => {
                                                    const v = e.target.value
                                                    const newEntry = v === 'custom'
                                                      ? { reasonId: 'custom' as const, customText: rowCustomText }
                                                      : v ? { reasonId: v, customText: '' } : { reasonId: null, customText: '' }
                                                    setRowReasons(prev => {
                                                      const next = new Map(prev)
                                                      next.set(pageId, newEntry)
                                                      // Auto-fill other changed rows of the same category that have no reason yet
                                                      if (v && v !== 'custom') {
                                                        const thisRole = docRoles.get(pageId)
                                                        const thisIsNotSup = thisRole === 'not-superseded'
                                                        for (const rec of tableRecords) {
                                                          const rid = String(rec.engagementPageId)
                                                          if (rid === pageId) continue
                                                          const rRole = docRoles.get(rid)
                                                          const rAi = rec.decisionType === 'Original' ? 'original' : 'superseded'
                                                          const rChanged = rRole && rRole !== rAi
                                                          if (!rChanged) continue
                                                          const rIsNotSup = rRole === 'not-superseded'
                                                          // Same category: both Not Sup, or both Original/Superseded
                                                          if (thisIsNotSup !== rIsNotSup) continue
                                                          const existing = next.get(rid)
                                                          if (!existing || !existing.reasonId) {
                                                            next.set(rid, { reasonId: v, customText: '' })
                                                          }
                                                        }
                                                      }
                                                      return next
                                                    })
                                                  }}
                                                  className="w-full cursor-pointer rounded border border-border bg-card px-2 py-1 text-[0.625rem] font-semibold text-foreground"
                                                >
                                                  <option value="">Select reason...</option>
                                                  {reasonOptions.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                  ))}
                                                  <option value="custom">Other...</option>
                                                </select>
                                                {rowReasonId === 'custom' && (
                                                  <input
                                                    type="text"
                                                    value={rowCustomText}
                                                    onChange={(e) => {
                                                      const val = e.target.value
                                                      setRowReasons(prev => {
                                                        const next = new Map(prev)
                                                        next.set(pageId, { reasonId: 'custom', customText: val })
                                                        return next
                                                      })
                                                    }}
                                                    placeholder="Enter reason..."
                                                    className="w-full rounded border border-border px-2 py-1 text-[0.625rem]"
                                                  />
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-[0.625rem] text-muted-foreground">AI Recommendation</span>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Validation error */}
                              {_valError && (
                                <div className="flex items-center gap-2 rounded-md border px-3 py-2" style={{ backgroundColor: 'var(--status-error-subtle)', borderColor: 'var(--status-error-border)' }}>
                                  <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: 'var(--status-error)' }} />
                                  <span className="text-xs" style={{ color: 'var(--status-error)' }}>{_valError}</span>
                                </div>
                              )}

                              {/* Apply / Reset -- only visible when changes exist */}
                              {_hasAnyChange && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!activeGroup) return
                                      const fresh = new Map<string, 'original' | 'superseded' | 'not-superseded'>()
                                      for (const r of activeGroup.records) { fresh.set(String(r.engagementPageId), r.decisionType === 'Original' ? 'original' : 'superseded') }
                                      setDocRoles(fresh); setRowReasons(new Map())
                                      if (isActiveFlipped) handleUndoOverride()
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                                  >
                                    <Undo2 className="h-3 w-3" /> Reset
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!_canApply}
                                    onClick={() => {
                                      if (!activeGroup) return
                                      const newOriginalPageId = Array.from(docRoles.entries()).find(([, role]) => role === 'original')?.[0]
                                      const aiOriginalId = String(activeGroup.originalRecord?.engagementPageId)
                                      const hasSwap = newOriginalPageId && newOriginalPageId !== aiOriginalId
                                      const hasExclusion = Array.from(docRoles.values()).some(v => v === 'not-superseded')
                                      const hasAnyRoleChange = activeGroup.records.some(r => { const cur = docRoles.get(String(r.engagementPageId)); const ai = r.decisionType === 'Original' ? 'original' : 'superseded'; return cur && cur !== ai })
                                      if (!hasSwap && !hasExclusion && !hasAnyRoleChange) return
                                      if (hasSwap) {
                                        const targetIdx = activeGroup.supersededRecords.findIndex(s => String(s.engagementPageId) === newOriginalPageId)
                                        setFlippedGroups(prev => { const next = new Map(prev); if (targetIdx >= 0) next.set(activeGroup.formType, targetIdx); return next })
                                      }
                                      if (hasExclusion) {
                                        const rejPageIds = Array.from(docRoles.entries()).filter(([, role]) => role === 'not-superseded').map(([pid]) => pid)
                                        setRejectedDocs(prev => {
                                          const next = new Map(prev)
                                          for (const pid of rejPageIds) {
                                            const rec = activeGroup.records.find(r => String(r.engagementPageId) === pid)
                                            if (rec) {
                                              const rr = rowReasons.get(pid)
                                              const reasonText = rr?.reasonId === 'custom' ? rr.customText.trim() || 'Verifier decision' : rr?.reasonId ? REJECTION_REASONS.find(x => x.id === rr.reasonId)?.label ?? 'Verifier decision' : 'Verifier decision'
                                              next.set(pid, { reason: reasonText, detail: reasonText, formType: activeGroup.formType })
                                            }
                                          }
                                          return next
                                        })
                                      }
                                      for (const r of activeGroup.records) {
                                        const pid = String(r.engagementPageId)
                                        const docRole = docRoles.get(pid)
                                        if (docRole === 'not-superseded') continue
                                        const aiRole = r.decisionType === 'Original' ? 'original' : 'superseded'
                                        // Only write overrides for docs whose role actually changed
                                        if (docRole === aiRole && !hasSwap) continue
                                        const key = `sup-pg${r.engagementPageId}`
                                        const rr = rowReasons.get(pid)
                                        const reasonText = rr?.reasonId === 'custom' ? rr.customText.trim() || 'Verifier decision' : rr?.reasonId ? OVERRIDE_REASONS.find(x => x.id === rr.reasonId)?.label ?? 'Verifier decision' : 'Verifier decision'
                                        let newDecision: string
                                        if (docRole === 'original') newDecision = 'Original'
                                        else newDecision = 'Superseded'
                                        const detailObj: OverrideDetail = {
                                          originalAIDecision: `Page ${r.engagementPageId} = ${r.decisionType}`,
                                          userOverrideDecision: `Page ${r.engagementPageId} = ${newDecision}`,
                                          overrideReason: reasonText,
                                          formType: r.documentRef?.formType ?? 'Unknown',
                                          fieldContext: r.comparedValues ?? [],
                                        }
                                        override(key, 'superseded', r.confidenceLevel, detailObj)
                                      }
                                      setShowOverridePanel(false)
                                    }}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{ backgroundColor: _canApply ? 'var(--primary)' : 'var(--muted)' }}
                                  >
                                    <Check className="h-3 w-3" /> Apply Changes
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {/* ── Not Superseded (whole group) ── */}
                          <div className="border-t border-border pt-4">
                            <button
                              type="button"
                              onClick={() => {
                                if (!showRejectPanel) { setSelectedRejectReasons(new Set()); setCustomRejectReason('') }
                                setShowRejectPanel(p => !p)
                              }}
                              className="flex w-full items-center gap-2 text-left"
                            >
                              {showRejectPanel ? <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--status-error)' }} /> : <ChevronRight className="h-3.5 w-3.5" style={{ color: 'var(--status-error)' }} />}
                              <div>
                                <p className="text-xs font-bold" style={{ color: 'var(--status-error)' }}>Not Superseded</p>
                                <p className="text-[0.6875rem] text-muted-foreground">Exclude the entire group. Both documents remain as-is in the binder.</p>
                              </div>
                            </button>
                          </div>

                          {showRejectPanel && (
                            <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--status-error-border)', backgroundColor: 'var(--status-error-subtle)' }}>
                              <p className="mb-2 text-xs font-bold text-foreground">Reason</p>
                              <fieldset className="border-none p-0">
                                <legend className="sr-only">Select reason for not superseded</legend>
                                {REJECTION_REASONS.map((reason) => (
                                  <label key={reason.id} className={`flex cursor-pointer items-start gap-2 rounded-md px-3 py-1.5 ${selectedRejectReasons.has(reason.id) ? 'bg-red-500/10' : ''}`}>
                                    <input type="checkbox" checked={selectedRejectReasons.has(reason.id)} onChange={() => toggleRejectReason(reason.id)} className="mt-0.5 accent-red-500" />
                                    <div>
                                      <span className="block text-xs font-semibold text-foreground">{reason.label}</span>
                                      <span className="text-[0.625rem] text-muted-foreground">{reason.description}</span>
                                    </div>
                                  </label>
                                ))}
                                <label className={`flex cursor-pointer items-start gap-2 rounded-md px-3 py-1.5 ${selectedRejectReasons.has('custom') ? 'bg-red-500/10' : ''}`}>
                                  <input type="checkbox" checked={selectedRejectReasons.has('custom')} onChange={() => toggleRejectReason('custom')} className="mt-0.5 accent-red-500" />
                                  <span className="text-xs font-semibold text-foreground">Other</span>
                                </label>
                                {selectedRejectReasons.has('custom') && (
                                  <input
                                    type="text"
                                    value={customRejectReason}
                                    onChange={(e) => setCustomRejectReason(e.target.value)}
                                    placeholder="Describe your reason..."
                                    className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-xs"
                                  />
                                )}
                              </fieldset>
                              <div className="mt-3 flex gap-2">
                                <button type="button" onClick={() => setShowRejectPanel(false)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">Cancel</button>
                                <button
                                  type="button"
                                  onClick={handleRejectDoc}
                                  disabled={!hasRejectSelection}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  style={{ backgroundColor: hasRejectSelection ? 'var(--status-error)' : 'var(--muted)' }}
                                >
                                  <X className="h-3 w-3" /> Confirm Not Superseded
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Bulk accept warning modal */}
      {showBulkWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="w-[28rem] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b px-5 py-4" style={{ backgroundColor: 'var(--status-warning-subtle)', borderColor: 'var(--status-warning-border)' }}>
              <AlertTriangle className="h-5 w-5" style={{ color: 'var(--status-warning)' }} />
              <span className="text-sm font-bold text-foreground">Unreviewed Pairs Need Attention</span>
            </div>
            <div className="p-5">
              <p className="mb-3 text-sm text-muted-foreground">{unreviewedModLow.length} pair{unreviewedModLow.length > 1 ? 's' : ''} with Moderate or Low confidence {unreviewedModLow.length > 1 ? 'have' : 'has'} not been individually reviewed:</p>
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-md border border-border bg-muted/50 p-3">
                {unreviewedModLow.map(g => {
                  const avg = Math.round(g.records.reduce((s, r) => s + r.confidenceLevel, 0) / g.records.length * 100)
                  const label = avg >= 70 ? 'Moderate' : 'Low'
                  const color = avg >= 70 ? 'text-amber-600' : 'text-red-600'
                  const bg = avg >= 70 ? 'bg-amber-500/10' : 'bg-red-500/10'
                  return (
                    <div key={g.formType} className="flex items-center justify-between px-2 py-1">
                      <span className="text-xs font-semibold text-foreground">{g.formType} ({g.formEntity})</span>
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[0.625rem] font-bold ${bg} ${color}`}>{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-border bg-muted/30 px-5 py-3">
              <button type="button" onClick={() => { setShowBulkWarning(false); if (unreviewedModLow.length > 0) { const idx = groups.findIndex(g => g.formType === unreviewedModLow[0].formType); if (idx >= 0) selectGroup(idx) } }} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
                Review These First
              </button>
              <button type="button" onClick={executeBulkAccept} className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--status-warning)' }}>
                Accept Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
