'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { FieldComparison } from '@/components/field-comparison'
import { useDecisions } from '@/contexts/decision-context'
import { useLearnedRules } from '@/contexts/learned-rules-context'
import {
  ChevronDown, ChevronRight, FileText, Sparkles, Check, CheckCircle2,
  Undo2, AlertTriangle, ArrowLeftRight, GripVertical, X, Info,
  CheckCircle, Columns2, Eye, Minimize2,
} from 'lucide-react'
import type { SupersededRecord, OverrideDetail } from '@/lib/types'

/* ── Panel visibility ── */
type PanelId = 'documents' | 'aiAnalysis' | 'fieldComparison'

/* ── Predefined override reasons ── */
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

/* ── Identifier extraction ── */
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

/* ── Form group type ── */
interface FormGroup {
  formType: string
  formEntity: string
  records: SupersededRecord[]
  originalRecord: SupersededRecord | null
  supersededRecords: SupersededRecord[]
  averageConfidence: number
}

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
      averageConfidence: records.reduce((sum, r) => sum + r.confidenceLevel, 0) / records.length,
    })
  }
  return groups
}

/* ── Restore reclassify state from overrides ── */
function restoreReclassifyState(group: FormGroup, overrides: Record<string, OverrideDetail>, isFlipped: boolean, flippedIdx: number | undefined) {
  const roles = new Map<string, 'original' | 'superseded' | 'not-superseded'>()
  let savedReclR: string | null = null
  let savedExclR: string | null = null
  for (const rc of group.records) {
    const pid = String(rc.engagementPageId)
    const ov = overrides[`sup-pg${pid}`]
    if (ov && ov.userOverrideDecision) {
      if (ov.userOverrideDecision.includes('Not Superseded')) {
        roles.set(pid, 'not-superseded')
        if (!savedExclR) savedExclR = ov.overrideReason || null
      } else if (ov.userOverrideDecision.endsWith('= Original')) {
        roles.set(pid, 'original')
        if (!savedReclR && ov.userOverrideDecision !== ov.originalAIDecision) savedReclR = ov.overrideReason || null
      } else {
        roles.set(pid, 'superseded')
        if (!savedReclR && ov.userOverrideDecision !== ov.originalAIDecision) savedReclR = ov.overrideReason || null
      }
    } else {
      const orig = isFlipped
        ? (flippedIdx !== undefined && rc.engagementPageId === group.supersededRecords[flippedIdx]?.engagementPageId)
        : rc.decisionType === 'Original'
      roles.set(pid, orig ? 'original' : 'superseded')
    }
  }
  let reasonId: string | null = null
  let reasonCustom = ''
  if (savedReclR && savedReclR !== 'Verifier decision') {
    const f = OVERRIDE_REASONS.find(x => x.label === savedReclR)
    if (f) reasonId = f.id
    else { reasonId = 'custom'; reasonCustom = savedReclR || '' }
  }
  const exclIds = new Set<string>()
  let exclCustom = ''
  if (savedExclR && savedExclR !== 'Verifier decision') {
    const pp = savedExclR.split(', ')
    for (const p of pp) {
      const f = REJECTION_REASONS.find(x => x.label === p)
      if (f) exclIds.add(f.id)
    }
    if (exclIds.size === 0) exclCustom = savedExclR || ''
  }
  return { roles, reasonId, reasonCustom, exclIds, exclCustom }
}

/* ════════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════════ */

export function VariantEDocCompare({ data }: { data: SupersededRecord[] }) {
  const { decisions, overrides, accept, undo, override } = useDecisions()
  const { addRuleFromOverride } = useLearnedRules()
  const groups = useMemo(() => groupByFormType(data), [data])

  /* ── Core state ── */
  const [flippedGroups, setFlippedGroups] = useState<Map<string, number>>(new Map())
  const [showOverridePanel, setShowOverridePanel] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(groups.map(g => g.formType)))
  const [selectedSupersededIdx, setSelectedSupersededIdx] = useState(0)
  const [docRoles, setDocRoles] = useState<Map<string, 'original' | 'superseded' | 'not-superseded'>>(new Map())
  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [notSupersededReason, setNotSupersededReason] = useState<Set<string>>(new Set())
  const [notSupersededCustom, setNotSupersededCustom] = useState('')
  const [rejectedDocs, setRejectedDocs] = useState<Map<string, { reason: string; timestamp: string }>>(new Map())

  /* ── 3-panel collapse/expand: AI Analysis + Field Comparison open by default ── */
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

  /* ── Accept dropdown + bulk accept ── */
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
      const isAccepted = g.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
      const isRejected = rejectedDocs.has(g.formType)
      const gFlipIdx = flippedGroups.get(g.formType)
      const isOvr = gFlipIdx !== undefined || g.records.some(r => {
        const d = overrides[`sup-pg${r.engagementPageId}`]
        return d && d.userOverrideDecision && d.userOverrideDecision !== d.originalAIDecision
      })
      return Math.round(g.averageConfidence * 100) >= 90 && !isAccepted && !isRejected && !isOvr
    })
  }, [groups, decisions, rejectedDocs, flippedGroups, overrides])

  const allUnreviewed = useMemo(() => {
    return groups.filter(g => {
      const isAccepted = g.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
      const isRejected = rejectedDocs.has(g.formType)
      const gFlipIdx = flippedGroups.get(g.formType)
      const isOvr = gFlipIdx !== undefined || g.records.some(r => {
        const d = overrides[`sup-pg${r.engagementPageId}`]
        return d && d.userOverrideDecision && d.userOverrideDecision !== d.originalAIDecision
      })
      return !isAccepted && !isRejected && !isOvr
    })
  }, [groups, decisions, rejectedDocs, flippedGroups, overrides])

  const unreviewedModLow = useMemo(() => {
    return allUnreviewed.filter(g => Math.round(g.averageConfidence * 100) < 90)
  }, [allUnreviewed])

  /* ── Resizable sidebar ── */
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    e.preventDefault()
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setSidebarWidth(Math.min(Math.max(ev.clientX - rect.left, 180), 400))
    }
    const onUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  /* ── Group selection ── */
  const selectGroup = useCallback((idx: number) => {
    setSelectedGroupIdx(idx)
    setSelectedSupersededIdx(0)
    setShowOverridePanel(false)
    setShowRejectPanel(false)
    setExpandedGroups(prev => { const next = new Set(prev); next.add(groups[idx]?.formType ?? ''); return next })
  }, [groups])

  const toggleGroup = useCallback((formType: string, idx: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(formType)) next.delete(formType)
      else next.add(formType)
      return next
    })
    setSelectedGroupIdx(idx)
    setSelectedSupersededIdx(0)
    setShowOverridePanel(false)
    setShowRejectPanel(false)
  }, [])

  /* ── Derived state ── */
  const rejectedPageIds = useMemo(() => new Set(rejectedDocs.keys()), [rejectedDocs])
  const activeGroup = groups[selectedGroupIdx] ?? null
  const activeFlippedIdx = activeGroup ? flippedGroups.get(activeGroup.formType) : undefined
  const isActiveFlipped = activeFlippedIdx !== undefined && activeGroup
    ? !rejectedDocs.has(String(activeGroup.supersededRecords[activeFlippedIdx]?.engagementPageId))
    : false

  const effectiveOriginal = useMemo(() => {
    if (!activeGroup) return null
    if (isActiveFlipped && activeFlippedIdx !== undefined) {
      const f = activeGroup.supersededRecords[activeFlippedIdx]
      if (f && !rejectedDocs.has(String(f.engagementPageId))) return f
    }
    return activeGroup.originalRecord
  }, [activeGroup, isActiveFlipped, activeFlippedIdx, rejectedDocs])

  const supersededList = useMemo(() => {
    if (!activeGroup) return []
    let list: SupersededRecord[]
    if (isActiveFlipped && activeFlippedIdx !== undefined) {
      list = [
        ...(activeGroup.originalRecord ? [activeGroup.originalRecord] : []),
        ...activeGroup.supersededRecords.filter((_, i) => i !== activeFlippedIdx),
      ]
    } else {
      list = activeGroup.supersededRecords
    }
    return list.filter(r => !rejectedPageIds.has(String(r.engagementPageId)))
  }, [activeGroup, isActiveFlipped, activeFlippedIdx, rejectedPageIds])

  const safeIdx = Math.min(selectedSupersededIdx, Math.max(0, supersededList.length - 1))
  const leftDoc = supersededList[safeIdx] ?? null
  const rightDoc = effectiveOriginal
  const comparedValues = useMemo(() => leftDoc?.comparedValues ?? [], [leftDoc])

  const isGroupRejected = activeGroup ? rejectedDocs.has(activeGroup.formType) : false
  const allGroupAccepted = activeGroup
    ? activeGroup.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
    : false
  const isGroupOverridden = isActiveFlipped || (activeGroup?.records.some(r => {
    const d = overrides[`sup-pg${r.engagementPageId}`]
    return d && d.userOverrideDecision && d.userOverrideDecision !== d.originalAIDecision
  }) ?? false)

  /* ── Undo stack ── */
  const [undoStack, setUndoStack] = useState<Array<{
    action: 'individual_accept' | 'high_confidence_bulk' | 'bulk_accept' | 'bulk_accept_with_warning'
    groups: string[]
    label: string
  }>>([])

  const pushUndoEntry = (action: typeof undoStack[number]['action'], groupKeys: string[], label: string) => {
    setUndoStack(prev => [...prev, { action, groups: groupKeys, label }])
  }

  const lastUndoEntry = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null

  /* ── Accept handlers ── */
  const handleAcceptGroup = useCallback(() => {
    if (!activeGroup) return
    for (const r of activeGroup.records) {
      const key = `sup-pg${r.engagementPageId}`
      if (decisions[key] !== 'accepted') {
        accept(key, 'superseded', r.confidenceLevel, 'manual')
      }
    }
    if (isActiveFlipped) {
      const firstR = activeGroup.records[0]
      if (firstR) {
        const d = overrides[`sup-pg${firstR.engagementPageId}`]
        if (d) addRuleFromOverride(d, 'superseded')
      }
    }
    pushUndoEntry('individual_accept', [activeGroup.formType], `Accept ${activeGroup.formType}`)
  }, [activeGroup, decisions, accept, isActiveFlipped, overrides, addRuleFromOverride])

  const handleAcceptHighConfidence = useCallback(() => {
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
    pushUndoEntry('high_confidence_bulk', groupKeys, `Accept High Confidence (${groupKeys.length})`)
    setShowAcceptDropdown(false)
  }, [highConfidenceUnreviewed, decisions, accept])

  const executeBulkAccept = useCallback(() => {
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
    pushUndoEntry(actionType, groupKeys, `Accept Remaining (${groupKeys.length})`)
    setShowBulkWarning(false)
    setShowAcceptDropdown(false)
  }, [allUnreviewed, decisions, accept, unreviewedModLow])

  const handleBulkAcceptRemaining = useCallback(() => {
    if (unreviewedModLow.length > 0) {
      setShowBulkWarning(true)
      setShowAcceptDropdown(false)
      return
    }
    executeBulkAccept()
  }, [unreviewedModLow, executeBulkAccept])

  /* ── Undo handlers ── */
  const handleUndoOverride = useCallback(() => {
    if (!activeGroup) return
    setFlippedGroups(prev => { const next = new Map(prev); next.delete(activeGroup.formType); return next })
    for (const r of activeGroup.records) { undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel) }
    setSelectedSupersededIdx(0)
    setShowOverridePanel(false)
  }, [activeGroup, undo])

  const handleUndoLastBatch = useCallback(() => {
    if (!lastUndoEntry) return
    for (const ft of lastUndoEntry.groups) {
      const g = groups.find(gr => gr.formType === ft)
      if (g) {
        for (const r of g.records) {
          undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
        }
      }
    }
    setUndoStack(prev => prev.slice(0, -1))
  }, [lastUndoEntry, groups, undo])

  /* ── Confidence helpers ── */
  const avgConf = activeGroup ? Math.round(activeGroup.averageConfidence * 100) : 0
  const confColor = avgConf >= 90 ? 'oklch(0.55 0.17 145)' : avgConf >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'
  const confLabel = avgConf >= 90 ? 'High Confidence' : avgConf >= 70 ? 'Moderate Confidence' : 'Low Confidence'
  const confTooltip = avgConf >= 90
    ? 'AI is confident. Reviewer can approve quickly.'
    : avgConf >= 70
      ? 'AI has moderate confidence. Reviewer should verify key fields.'
      : 'AI is uncertain. Reviewer must examine carefully.'

  const panelIdentifier = activeGroup ? extractIdentifier(activeGroup.records) : null
  const panelRejectionInfo = activeGroup ? rejectedDocs.get(activeGroup.formType) : undefined

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '0.0625rem solid oklch(0.88 0.01 260)', borderRadius: 'var(--radius)', overflow: 'hidden', backgroundColor: 'oklch(1 0 0)' }}>
      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', backgroundColor: 'oklch(0.97 0.003 260)', borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.45 0.01 260)' }} />
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>Verify Superseded</h2>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.125rem 0.5rem', borderRadius: '624.9375rem', backgroundColor: 'oklch(0.93 0.005 260)', color: 'oklch(0.4 0.01 260)', fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{data.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Reclassify button */}
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => {
              if (!showOverridePanel && activeGroup) {
                const r = restoreReclassifyState(activeGroup, overrides, isActiveFlipped, activeFlippedIdx)
                setDocRoles(r.roles); setSelectedReason(r.reasonId); setCustomReason(r.reasonCustom)
                setNotSupersededReason(r.exclIds); setNotSupersededCustom(r.exclCustom)
              }
              setShowOverridePanel(p => !p)
            }} disabled={isGroupRejected || allGroupAccepted} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.82 0.08 60)', borderRadius: '0.25rem', backgroundColor: isActiveFlipped ? 'oklch(0.96 0.04 60)' : 'oklch(1 0 0)', fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.5 0.16 60)', cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer', opacity: (isGroupRejected || allGroupAccepted) ? 0.5 : 1 }} aria-expanded={showOverridePanel}>
              <ArrowLeftRight style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Reclassify
              <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
            </button>
            {/* Reclassify Panel */}
            {showOverridePanel && !allGroupAccepted && (() => {
              const hasRoleSwap = activeGroup?.records.some(r => {
                const pid = String(r.engagementPageId)
                const cur = docRoles.get(pid)
                const ai = r.decisionType === 'Original' ? 'original' : 'superseded'
                return cur && cur !== ai && cur !== 'not-superseded'
              }) ?? false
              const hasNotSup = Array.from(docRoles.values()).some(v => v === 'not-superseded')
              const hasAnyChange = hasRoleSwap || hasNotSup
              const origCount = Array.from(docRoles.values()).filter(v => v === 'original').length
              const supCount = Array.from(docRoles.values()).filter(v => v === 'superseded').length
              const valError = origCount === 0 ? 'At least one document must be Original.' : supCount === 0 && !hasNotSup ? 'At least one document must be Superseded.' : null
              const swapFilled = !hasRoleSwap || (selectedReason !== null || customReason.trim() !== '')
              const notSupFilled = !hasNotSup || (notSupersededReason.size > 0 || notSupersededCustom.trim() !== '')
              const canApply = hasAnyChange && !valError && swapFilled && notSupFilled
              return (
                <div key="reclassify-panel-wrapper">
                  <div onClick={() => setShowOverridePanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                  <div style={{ position: 'absolute', insetBlockStart: '100%', insetInlineEnd: 0, marginBlockStart: '0.25rem', zIndex: 50, inlineSize: 'max-content', minInlineSize: '20rem', maxInlineSize: '26rem', backgroundColor: 'oklch(1 0 0)', borderRadius: '0.375rem', border: '0.0625rem solid oklch(0.88 0.01 260)', boxShadow: '0 0.25rem 1rem oklch(0 0 0 / 0.12)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.25 0.01 260)' }}>Reclassify Documents</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {activeGroup?.records.map(r => {
                        const pid = String(r.engagementPageId)
                        const role = docRoles.get(pid) ?? 'superseded'
                        return (
                          <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', border: '0.0625rem solid oklch(0.91 0.005 260)', backgroundColor: role === 'not-superseded' ? 'oklch(0.96 0.02 25 / 0.3)' : 'oklch(0.98 0.003 260)' }}>
                            <span style={{ flex: 1, fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)' }}>Pg {r.documentRef?.pageNumber ?? r.engagementPageId}</span>
                            <select value={role} onChange={e => {
                              const newRole = e.target.value as 'original' | 'superseded' | 'not-superseded'
                              const next = new Map(docRoles)
                              if (newRole === 'original') { for (const [k, v] of next) { if (v === 'original') next.set(k, 'superseded') } }
                              next.set(pid, newRole)
                              setDocRoles(next)
                            }} style={{ fontSize: '0.6875rem', padding: '0.25rem 0.375rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', color: 'oklch(0.3 0.01 260)', cursor: 'pointer' }}>
                              <option value="original">Original</option>
                              <option value="superseded">Superseded</option>
                              <option value="not-superseded">Not Superseded</option>
                            </select>
                          </div>
                        )
                      })}
                    </div>
                    {valError && <p style={{ fontSize: '0.6875rem', color: 'oklch(0.5 0.18 25)', fontWeight: 600 }}>{valError}</p>}
                    {hasRoleSwap && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.35 0.01 260)' }}>Reason for reclassification</label>
                        {OVERRIDE_REASONS.map(reason => (
                          <label key={reason.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.6875rem', color: 'oklch(0.3 0.01 260)' }}>
                            <input type="radio" name="override-reason" checked={selectedReason === reason.id} onChange={() => { setSelectedReason(reason.id); setCustomReason('') }} style={{ accentColor: 'oklch(0.45 0.18 145)' }} />
                            {reason.label}
                          </label>
                        ))}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.6875rem', color: 'oklch(0.3 0.01 260)' }}>
                          <input type="radio" name="override-reason" checked={selectedReason === 'custom'} onChange={() => setSelectedReason('custom')} style={{ accentColor: 'oklch(0.45 0.18 145)' }} />
                          Other reason
                        </label>
                        {selectedReason === 'custom' && <textarea value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Enter reason..." rows={2} style={{ fontSize: '0.6875rem', padding: '0.375rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', resize: 'vertical' }} />}
                      </div>
                    )}
                    {hasNotSup && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.35 0.01 260)' }}>Reason for exclusion</label>
                        {REJECTION_REASONS.map(reason => (
                          <label key={reason.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.6875rem', color: 'oklch(0.3 0.01 260)' }}>
                            <input type="checkbox" checked={notSupersededReason.has(reason.id)} onChange={() => {
                              const next = new Set(notSupersededReason)
                              if (next.has(reason.id)) next.delete(reason.id)
                              else next.add(reason.id)
                              setNotSupersededReason(next)
                              setNotSupersededCustom('')
                            }} style={{ accentColor: 'oklch(0.45 0.18 145)' }} />
                            {reason.label}
                          </label>
                        ))}
                        {notSupersededReason.size === 0 && <textarea value={notSupersededCustom} onChange={e => setNotSupersededCustom(e.target.value)} placeholder="Enter exclusion reason..." rows={2} style={{ fontSize: '0.6875rem', padding: '0.375rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', resize: 'vertical' }} />}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end', paddingBlockStart: '0.25rem', borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                      {isActiveFlipped && <button type="button" onClick={handleUndoOverride} style={{ padding: '0.375rem 0.625rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.4 0.01 260)', cursor: 'pointer' }}>Undo</button>}
                      <button type="button" onClick={() => setShowOverridePanel(false)} style={{ padding: '0.375rem 0.625rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.4 0.01 260)', cursor: 'pointer' }}>Cancel</button>
                      <button type="button" disabled={!canApply} onClick={() => {
                        if (!activeGroup) return
                        const reclassifyReasonText = selectedReason ? OVERRIDE_REASONS.find(r => r.id === selectedReason)?.label ?? (selectedReason === 'custom' ? customReason : selectedReason) : customReason.trim() || ''
                        const exclusionReasonText = notSupersededReason.size > 0 ? Array.from(notSupersededReason).map(id => REJECTION_REASONS.find(r => r.id === id)?.label ?? id).join(', ') : notSupersededCustom.trim() || ''
                        const newOrigPageId = Array.from(docRoles.entries()).find(([, role]) => role === 'original')?.[0]
                        const aiOrigId = String(activeGroup.originalRecord?.engagementPageId)
                        const hasSwap = newOrigPageId && newOrigPageId !== aiOrigId
                        const hasExcl = Array.from(docRoles.values()).some(v => v === 'not-superseded')
                        if (!hasSwap && !hasExcl) { setShowOverridePanel(false); return }
                        if (hasSwap) {
                          const ti = activeGroup.supersededRecords.findIndex(s => String(s.engagementPageId) === newOrigPageId)
                          setFlippedGroups(prev => { const n = new Map(prev); if (ti >= 0) n.set(activeGroup.formType, ti); return n })
                        }
                        for (const r of activeGroup.records) {
                          const key = `sup-pg${r.engagementPageId}`
                          const dr = docRoles.get(String(r.engagementPageId))
                          let nd: string
                          if (dr === 'original') nd = 'Original'
                          else if (dr === 'not-superseded') nd = 'Not Superseded'
                          else nd = 'Superseded'
                          const docRT = dr === 'not-superseded' ? exclusionReasonText || reclassifyReasonText || 'Verifier decision' : reclassifyReasonText || 'Verifier decision'
                          const detail: OverrideDetail = {
                            originalAIDecision: `Page ${r.engagementPageId} = ${r.decisionType}`,
                            userOverrideDecision: `Page ${r.engagementPageId} = ${nd}`,
                            overrideReason: docRT,
                            formType: r.documentRef?.formType ?? 'Unknown',
                            fieldContext: r.comparedValues ?? [],
                          }
                          override(key, 'superseded', r.confidenceLevel, detail)
                        }
                        setSelectedSupersededIdx(0); setShowOverridePanel(false)
                        setSelectedReason(null); setCustomReason(''); setNotSupersededReason(new Set()); setNotSupersededCustom('')
                      }} style={{ padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.25rem', backgroundColor: !canApply ? 'oklch(0.9 0.01 260)' : 'oklch(0.45 0.18 145)', fontSize: '0.6875rem', fontWeight: 600, color: !canApply ? 'oklch(0.6 0.01 260)' : 'oklch(1 0 0)', cursor: !canApply ? 'not-allowed' : 'pointer' }}>Apply</button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Not Superseded button */}
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => { setShowRejectPanel(p => !p); setShowOverridePanel(false) }} disabled={isGroupRejected || allGroupAccepted} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.82 0.05 25)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.5 0.12 25)', cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer', opacity: (isGroupRejected || allGroupAccepted) ? 0.5 : 1 }}>
              <X style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Not Superseded
            </button>
            {showRejectPanel && !allGroupAccepted && (() => {
              const rejFilled = notSupersededReason.size > 0 || notSupersededCustom.trim() !== ''
              return (
                <div key="reject-panel-wrapper">
                  <div onClick={() => setShowRejectPanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                  <div style={{ position: 'absolute', insetBlockStart: '100%', insetInlineEnd: 0, marginBlockStart: '0.25rem', zIndex: 50, inlineSize: 'max-content', minInlineSize: '18rem', maxInlineSize: '24rem', backgroundColor: 'oklch(1 0 0)', borderRadius: '0.375rem', border: '0.0625rem solid oklch(0.88 0.01 260)', boxShadow: '0 0.25rem 1rem oklch(0 0 0 / 0.12)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.25 0.01 260)' }}>Exclude from Superseded</p>
                    <p style={{ fontSize: '0.6875rem', color: 'oklch(0.45 0.01 260)' }}>This will exclude the entire superseded group. Provide a reason:</p>
                    {REJECTION_REASONS.map(reason => (
                      <label key={reason.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.6875rem', color: 'oklch(0.3 0.01 260)' }}>
                        <input type="checkbox" checked={notSupersededReason.has(reason.id)} onChange={() => {
                          const next = new Set(notSupersededReason)
                          if (next.has(reason.id)) next.delete(reason.id)
                          else next.add(reason.id)
                          setNotSupersededReason(next)
                        }} style={{ accentColor: 'oklch(0.45 0.18 25)' }} />
                        {reason.label}
                      </label>
                    ))}
                    {notSupersededReason.size === 0 && <textarea value={notSupersededCustom} onChange={e => setNotSupersededCustom(e.target.value)} placeholder="Enter reason..." rows={2} style={{ fontSize: '0.6875rem', padding: '0.375rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', resize: 'vertical' }} />}
                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end', paddingBlockStart: '0.25rem', borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                      <button type="button" onClick={() => setShowRejectPanel(false)} style={{ padding: '0.375rem 0.625rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.4 0.01 260)', cursor: 'pointer' }}>Cancel</button>
                      <button type="button" disabled={!rejFilled} onClick={() => {
                        if (!activeGroup) return
                        const reasonText = notSupersededReason.size > 0
                          ? Array.from(notSupersededReason).map(id => REJECTION_REASONS.find(r => r.id === id)?.label ?? id).join(', ')
                          : notSupersededCustom.trim()
                        setRejectedDocs(prev => { const next = new Map(prev); next.set(activeGroup.formType, { reason: reasonText, timestamp: new Date().toISOString() }); return next })
                        for (const r of activeGroup.records) {
                          const key = `sup-pg${r.engagementPageId}`
                          const detail: OverrideDetail = {
                            originalAIDecision: `Page ${r.engagementPageId} = ${r.decisionType}`,
                            userOverrideDecision: `Page ${r.engagementPageId} = Not Superseded`,
                            overrideReason: reasonText,
                            formType: r.documentRef?.formType ?? 'Unknown',
                            fieldContext: r.comparedValues ?? [],
                          }
                          override(key, 'superseded', r.confidenceLevel, detail)
                        }
                        setShowRejectPanel(false); setNotSupersededReason(new Set()); setNotSupersededCustom('')
                      }} style={{ padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.25rem', backgroundColor: !rejFilled ? 'oklch(0.9 0.01 260)' : 'oklch(0.45 0.18 25)', fontSize: '0.6875rem', fontWeight: 600, color: !rejFilled ? 'oklch(0.6 0.01 260)' : 'oklch(1 0 0)', cursor: !rejFilled ? 'not-allowed' : 'pointer' }}>Exclude</button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Split Accept button with dropdown */}
          {activeGroup && !allGroupAccepted && !isGroupRejected && (
            <div ref={acceptDropdownRef} style={{ position: 'relative', display: 'flex' }}>
              {lastUndoEntry ? (
                <button type="button" onClick={handleUndoLastBatch} style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.75rem', border: 'none',
                  borderRadius: '0.25rem 0 0 0.25rem',
                  backgroundColor: 'oklch(0.96 0.02 145)',
                  fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.35 0.14 145)',
                  cursor: 'pointer',
                  borderInlineEnd: '0.0625rem solid oklch(0.88 0.06 145)',
                }} title={`Undo: ${lastUndoEntry.label}`}>
                  <Undo2 style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
                  Undo: {lastUndoEntry.label}
                </button>
              ) : (
                <button type="button" onClick={() => { handleAcceptGroup(); setShowAcceptDropdown(false) }} style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.75rem', border: 'none',
                  borderRadius: '0.25rem 0 0 0.25rem',
                  backgroundColor: 'oklch(0.45 0.18 145)',
                  fontSize: '0.75rem', fontWeight: 600, color: 'oklch(1 0 0)',
                  cursor: 'pointer',
                }}>
                  <Check style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
                  Accept
                </button>
              )}
              <button type="button" onClick={() => setShowAcceptDropdown(!showAcceptDropdown)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0.375rem 0.5rem', border: 'none',
                borderRadius: '0 0.25rem 0.25rem 0',
                backgroundColor: lastUndoEntry ? 'oklch(0.93 0.04 145)' : 'oklch(0.40 0.16 145)',
                cursor: 'pointer',
              }} aria-label="More accept options">
                <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: lastUndoEntry ? 'oklch(0.35 0.14 145)' : 'oklch(1 0 0)' }} />
              </button>

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
                  {/* Accept High Confidence */}
                  <button type="button" onClick={handleAcceptHighConfidence} disabled={highConfidenceUnreviewed.length === 0} style={{
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
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>Accept High Confidence</span>
                      {highConfidenceUnreviewed.length > 0 && (
                        <span style={{ fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.0625rem 0.25rem', borderRadius: '0.625rem', backgroundColor: 'oklch(0.92 0.04 145)', color: 'oklch(0.4 0.14 145)' }}>
                          {highConfidenceUnreviewed.length}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)', paddingInlineStart: '1.125rem' }}>
                      Bulk accept all pairs with High confidence
                    </span>
                  </button>
                  <div style={{ blockSize: '0.0625rem', backgroundColor: 'oklch(0.92 0.005 260)' }} />
                  {/* Accept Remaining */}
                  <button type="button" onClick={handleBulkAcceptRemaining} disabled={allUnreviewed.length === 0} style={{
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
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>Accept Remaining</span>
                      {allUnreviewed.length > 0 && (
                        <span style={{ fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.0625rem 0.25rem', borderRadius: '0.625rem', backgroundColor: 'oklch(0.92 0.02 260)', color: 'oklch(0.45 0.01 260)' }}>
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
          )}
          {allGroupAccepted && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.45 0.18 145)' }}>
              <CheckCircle2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />Accepted
            </span>
          )}
        </div>
      </header>

      {/* Bulk accept warning modal */}
      {showBulkWarning && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'oklch(0 0 0 / 0.4)' }}>
          <div style={{ backgroundColor: 'oklch(1 0 0)', borderRadius: '0.5rem', padding: '1.25rem', maxInlineSize: '24rem', boxShadow: '0 0.5rem 2rem oklch(0 0 0 / 0.2)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <AlertTriangle style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.6 0.18 60)' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>Accept All Remaining?</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'oklch(0.4 0.01 260)', lineHeight: 1.5 }}>
              This will accept {allUnreviewed.length} unreviewed group{allUnreviewed.length !== 1 ? 's' : ''}, including {unreviewedModLow.length} with Moderate or Low confidence. Continue?
            </p>
            <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowBulkWarning(false)} style={{ padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: 'oklch(0.4 0.01 260)' }}>Cancel</button>
              <button type="button" onClick={executeBulkAccept} style={{ padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.25rem', backgroundColor: 'oklch(0.45 0.18 145)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: 'oklch(1 0 0)' }}>Accept All</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div style={{ display: 'flex', minBlockSize: '36rem' }}>
        {/* ── Left sidebar ── */}
        <aside style={{ inlineSize: `${sidebarWidth}px`, flexShrink: 0, borderInlineEnd: '0.0625rem solid oklch(0.91 0.005 260)', backgroundColor: 'oklch(0.98 0.003 260)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.625rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
            {groups.map((group, gIdx) => {
              const isSelected = gIdx === selectedGroupIdx
              const isExpanded = expandedGroups.has(group.formType)
              const identifier = extractIdentifier(group.records)
              const panelGroupRejected = rejectedDocs.has(group.formType)
              const gFlipIdx = flippedGroups.get(group.formType)
              const gFlipped = gFlipIdx !== undefined
              const gAccepted = group.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')
              const gConf = Math.round(group.averageConfidence * 100)
              const gConfColor = gConf >= 90 ? 'oklch(0.55 0.17 145)' : gConf >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'

              return (
                <div key={group.formType}>
                  <button type="button" onClick={() => toggleGroup(group.formType, gIdx)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', inlineSize: '100%', padding: '0.375rem 0.5rem', border: 'none', borderRadius: '0.25rem', backgroundColor: isSelected ? 'oklch(0.93 0.02 240)' : 'transparent', cursor: 'pointer', textAlign: 'start' }}>
                    {isExpanded
                      ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', flexShrink: 0, color: 'oklch(0.5 0.01 260)' }} />
                      : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', flexShrink: 0, color: 'oklch(0.5 0.01 260)' }} />
                    }
                    <div style={{ flex: 1, minInlineSize: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.formType}</span>
                        {!panelGroupRejected && !gAccepted && (
                          <span style={{ fontSize: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem', backgroundColor: `${gConfColor} / 0.15`, color: gConfColor }}>{gConf}%</span>
                        )}
                      </div>
                      {identifier && <div style={{ fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)', fontFamily: 'var(--font-mono)' }}>{identifier.label}: {identifier.value}</div>}
                    </div>
                    {panelGroupRejected && <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.18 25)', flexShrink: 0 }} />}
                    {gFlipped && !panelGroupRejected && <ArrowLeftRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.16 60)', flexShrink: 0 }} />}
                    {gAccepted && !panelGroupRejected && !gFlipped && <CheckCircle2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.18 145)', flexShrink: 0 }} />}
                  </button>
                  {isExpanded && (
                    <div style={{ paddingInlineStart: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.0625rem' }}>
                      {group.records.map(r => {
                        const pgKey = `sup-pg${r.engagementPageId}`
                        const storedOv = overrides[pgKey]
                        let label: string
                        if (storedOv && storedOv.userOverrideDecision) {
                          if (storedOv.userOverrideDecision.includes('Not Superseded')) label = 'Not Superseded'
                          else if (storedOv.userOverrideDecision.endsWith('= Original')) label = 'Original'
                          else label = 'Superseded'
                        } else {
                          const isSup = gFlipped
                            ? (gFlipIdx !== undefined && r.engagementPageId !== group.supersededRecords[gFlipIdx]?.engagementPageId && r.decisionType !== 'Original') || (r.decisionType === 'Original')
                            : r.decisionType === 'Superseded'
                          label = isSup ? 'Superseded' : 'Original'
                        }
                        const labelColor = label === 'Original' ? 'oklch(0.45 0.18 145)' : label === 'Not Superseded' ? 'oklch(0.5 0.12 25)' : 'oklch(0.5 0.01 260)'
                        return (
                          <button key={pgKey} type="button" onClick={() => {
                            selectGroup(gIdx)
                            if (label === 'Superseded') {
                              const si = supersededList.findIndex(s => s.engagementPageId === r.engagementPageId)
                              if (si >= 0) setSelectedSupersededIdx(si)
                            }
                          }} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', inlineSize: '100%', padding: '0.25rem 0.375rem', border: 'none', borderRadius: '0.25rem', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'start' }}>
                            <FileText style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem', color: 'oklch(0.55 0.01 260)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>Pg {r.documentRef?.pageNumber ?? r.engagementPageId}</span>
                            <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: labelColor, marginInlineStart: 'auto' }}>{label}</span>
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

        {/* Drag handle */}
        <div onMouseDown={handleDragStart} style={{ inlineSize: '0.375rem', cursor: 'col-resize', backgroundColor: 'oklch(0.94 0.005 260)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GripVertical style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.65 0.01 260)' }} />
        </div>

        {/* ── Main content area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeGroup && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

              {/* ═══ PANEL 1: AI Analysis ═══ */}
              {(() => {
                return (
                  <div style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                    {/* Fixed title bar */}
                    <div style={{ padding: '0.625rem 0.75rem', borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)', backgroundColor: 'oklch(1 0 0)' }}>
                      <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>
                        {activeGroup.formType}: {activeGroup.formEntity.toUpperCase()}
                      </span>
                      {panelIdentifier && (
                        <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 500, color: 'oklch(0.45 0.01 260)', fontFamily: 'var(--font-mono)', marginBlockStart: '0.125rem' }}>
                          {panelIdentifier.label}: {panelIdentifier.value}
                        </span>
                      )}
                    </div>

                    {/* Collapsible confidence badge toggle */}
                    <button type="button" onClick={() => togglePanel('aiAnalysis')} style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      inlineSize: '100%', padding: '0.375rem 0.75rem',
                      border: 'none', cursor: 'pointer', textAlign: 'start',
                      fontSize: '0.6875rem', fontWeight: 700,
                      backgroundColor: 'oklch(0.98 0.003 260)',
                      borderBlockEnd: expandedPanels.has('aiAnalysis') ? 'none' : '0.0625rem solid oklch(0.91 0.005 260)',
                      color: 'oklch(0.4 0.01 260)',
                    }}>
                      {expandedPanels.has('aiAnalysis')
                        ? <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.5 0.01 260)' }} />
                        : <ChevronRight style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'oklch(0.5 0.01 260)' }} />
                      }
                      {isGroupRejected ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.125rem 0.375rem', borderRadius: '0.1875rem', backgroundColor: 'oklch(0.92 0.02 260)', color: 'oklch(0.45 0.01 260)' }}>
                          <X style={{ inlineSize: '0.5625rem', blockSize: '0.5625rem' }} />
                          Not Superseded
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.375rem', borderRadius: '0.1875rem', backgroundColor: `${confColor} / 0.12`, color: confColor }} title={confTooltip}>
                          <Sparkles style={{ inlineSize: '0.5625rem', blockSize: '0.5625rem' }} />
                          {confLabel}
                        </span>
                      )}
                    </button>

                    {/* AI Analysis body */}
                    {expandedPanels.has('aiAnalysis') && (
                      <div style={{
                        padding: '0.625rem 0.75rem',
                        backgroundColor: isGroupRejected ? 'oklch(0.97 0.005 260)' : isGroupOverridden ? 'oklch(0.98 0.02 60)' : 'oklch(0.98 0.003 240)',
                      }}>
                        {/* Rejection outcome */}
                        {isGroupRejected && panelRejectionInfo && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.625rem 0.75rem', borderRadius: '0.25rem', border: '0.0625rem solid oklch(0.88 0.01 260)', backgroundColor: 'oklch(0.95 0.005 260)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <AlertTriangle style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.55 0.01 260)' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.3 0.01 260)' }}>
                                  Marked as Not Superseded by Verifier
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingInlineStart: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <span style={{ inlineSize: '0.25rem', blockSize: '0.25rem', borderRadius: '50%', backgroundColor: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>
                                    All documents will be available as independent records once the review is complete
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <span style={{ inlineSize: '0.25rem', blockSize: '0.25rem', borderRadius: '50%', backgroundColor: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>
                                    No superseded classification will be applied
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div style={{ marginBlockStart: '0.5rem', padding: '0.5rem 0.625rem', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', border: '0.0625rem solid oklch(0.88 0.01 260)' }}>
                              <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>Reason</span>
                              <p style={{ margin: '0.125rem 0 0', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)', lineHeight: 1.4 }}>
                                {panelRejectionInfo.reason}
                              </p>
                            </div>
                            <button type="button" onClick={() => {
                              setRejectedDocs(prev => { const n = new Map(prev); n.delete(activeGroup.formType); return n })
                              for (const r of activeGroup.records) undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
                            }} style={{ alignSelf: 'flex-start', marginBlockStart: '0.25rem', fontSize: '0.6875rem', padding: '0.25rem 0.5rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', cursor: 'pointer', color: 'oklch(0.4 0.01 260)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Undo2 style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} />
                              Undo Exclusion
                            </button>
                          </div>
                        )}

                        {/* Override comparison table */}
                        {!isGroupRejected && isGroupOverridden && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.5rem 0.625rem', marginBlockEnd: '0.625rem', borderRadius: '0.25rem', border: '0.0625rem solid oklch(0.82 0.08 60)', backgroundColor: 'oklch(0.99 0.01 60)' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.4 0.14 60)' }}>
                              Verifier has overridden the AI classification
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <div style={{ padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.97 0.005 260)', border: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                                <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>AI Recommended</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', marginBlockStart: '0.25rem' }}>
                                  {activeGroup.records.map(r => (
                                    <div key={r.engagementPageId} style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>
                                      <span style={{ fontWeight: 600 }}>Pg {r.documentRef?.pageNumber ?? r.engagementPageId}</span> = {r.decisionType}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div style={{ padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.96 0.03 60)', border: '0.0625rem solid oklch(0.88 0.06 60)' }}>
                                <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.12 60)' }}>Verifier Changed To</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', marginBlockStart: '0.25rem' }}>
                                  {activeGroup.records.map(r => {
                                    const storedD = overrides[`sup-pg${r.engagementPageId}`]
                                    const isRej = storedD?.userOverrideDecision?.includes('Not Superseded')
                                    let newLabel: string
                                    if (isRej) newLabel = 'Not Superseded'
                                    else if (storedD?.userOverrideDecision?.endsWith('= Original')) newLabel = 'Original'
                                    else if (storedD?.userOverrideDecision?.endsWith('= Superseded')) newLabel = 'Superseded'
                                    else newLabel = r.decisionType
                                    const changed = newLabel !== r.decisionType
                                    return (
                                      <div key={r.engagementPageId} style={{ fontSize: '0.6875rem', color: changed ? 'oklch(0.35 0.12 60)' : 'oklch(0.35 0.01 260)', fontWeight: changed ? 600 : 400 }}>
                                        <span style={{ fontWeight: 600 }}>Pg {r.documentRef?.pageNumber ?? r.engagementPageId}</span> = {newLabel}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                            {/* Reclassification reason */}
                            {(() => {
                              const reclRec = activeGroup.records.find(r => {
                                const d = overrides[`sup-pg${r.engagementPageId}`]
                                return d && !d.userOverrideDecision?.includes('Not Superseded') && d.userOverrideDecision !== d.originalAIDecision
                              })
                              const reason = reclRec ? overrides[`sup-pg${reclRec.engagementPageId}`]?.overrideReason : null
                              const displayR = reason && reason !== 'Verifier decision' ? reason : null
                              return displayR ? (
                                <div style={{ padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', border: '0.0625rem solid oklch(0.88 0.01 260)' }}>
                                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>Reason for Reclassification</span>
                                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)', lineHeight: 1.4 }}>{displayR}</p>
                                </div>
                              ) : null
                            })()}
                            {/* Exclusion reason */}
                            {(() => {
                              const exclRecs = activeGroup.records.filter(r => overrides[`sup-pg${r.engagementPageId}`]?.userOverrideDecision?.includes('Not Superseded'))
                              if (exclRecs.length === 0) return null
                              const exclReason = overrides[`sup-pg${exclRecs[0].engagementPageId}`]?.overrideReason
                              const displayER = exclReason && exclReason !== 'Verifier decision' ? exclReason : null
                              return (
                                <div style={{ padding: '0.5rem 0.625rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.97 0.005 260)', border: '0.0625rem solid oklch(0.91 0.005 260)', marginBlockStart: '0.375rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockEnd: '0.25rem' }}>
                                    <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.55 0.01 260)' }} />
                                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.3 0.01 260)' }}>Not Superseded</span>
                                  </div>
                                  <div style={{ paddingInlineStart: '1.125rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockEnd: '0.25rem' }}>
                                      <span style={{ inlineSize: '0.25rem', blockSize: '0.25rem', borderRadius: '50%', backgroundColor: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                                      <span style={{ fontSize: '0.625rem', color: 'oklch(0.35 0.01 260)' }}>
                                        {exclRecs.map(r => `Pg ${r.documentRef?.pageNumber ?? r.engagementPageId}`).join(', ')} will remain as independent record{exclRecs.length > 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    {displayER && (
                                      <div style={{ marginBlockStart: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', border: '0.0625rem solid oklch(0.88 0.01 260)' }}>
                                        <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>Reason for Exclusion</span>
                                        <p style={{ margin: '0.125rem 0 0', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)', lineHeight: 1.4 }}>{displayER}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )}

                        {/* AI Analysis content -- hidden when rejected */}
                        {!isGroupRejected && !isGroupOverridden && (() => {
                          const allCompared = activeGroup.records.flatMap(r => r.comparedValues ?? [])
                          const seenMatch = new Set<string>()
                          const seenDiffer = new Set<string>()
                          const matchingFields = allCompared.filter(v => v.valueA === v.valueB && !seenMatch.has(v.field) && seenMatch.add(v.field))
                          const differingFields = allCompared.filter(v => v.valueA !== v.valueB && !seenDiffer.has(v.field) && seenDiffer.add(v.field))
                          const formType = activeGroup.formType
                          const entity = activeGroup.formEntity

                          // Group fields by category
                          const matchCategories = new Map<string, string[]>()
                          matchingFields.forEach(v => {
                            const rec = allCompared.find(c => c.field === v.field)
                            const cat = (rec as Record<string, unknown>)?.category as string ?? 'Other'
                            if (!matchCategories.has(cat)) matchCategories.set(cat, [])
                            matchCategories.get(cat)!.push(v.field)
                          })
                          const differCategories = new Map<string, string[]>()
                          differingFields.forEach(v => {
                            const rec = allCompared.find(c => c.field === v.field)
                            const cat = (rec as Record<string, unknown>)?.category as string ?? 'Other'
                            if (!differCategories.has(cat)) differCategories.set(cat, [])
                            differCategories.get(cat)!.push(v.field)
                          })

                          const allFieldsMatch = differingFields.length === 0 && matchingFields.length > 0
                          const hasCorrectedIndicator = differingFields.some(v => v.field.toLowerCase().includes('corrected'))
                          const hasAmountDiffs = differingFields.some(v => {
                            const rec = allCompared.find(c => c.field === v.field)
                            return ((rec as Record<string, unknown>)?.category as string ?? '').toLowerCase() === 'income'
                          })

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {/* Document context header */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1875rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.97 0.005 260)', border: '0.0625rem solid oklch(0.92 0.01 260)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Document Type</span>
                                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)' }}>
                                    {formType}{entity && entity !== formType ? ` (${entity})` : ''}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.625rem', color: 'oklch(0.45 0.01 260)' }}>
                                  {activeGroup.records.length} documents compared for superseded classification
                                </span>
                              </div>

                              {/* AI Reasoning narrative paragraph */}
                              <p style={{ fontSize: '0.6875rem', lineHeight: 1.6, color: 'oklch(0.3 0.01 260)', margin: 0 }}>
                                {allFieldsMatch
                                  ? `Both ${formType} forms from ${entity || 'the same payer'} share identical values across all ${matchingFields.length} compared fields (${matchingFields.map(v => v.field).join(', ')}). The matching data suggests one document supersedes the other.`
                                  : matchingFields.length > differingFields.length
                                    ? `Both documents are ${formType} forms from ${entity || 'the same payer'}. Matching fields include ${matchingFields.slice(0, 5).map(v => v.field).join(', ')}${matchingFields.length > 5 ? ` and ${matchingFields.length - 5} more` : ''}. Differences were found in ${differingFields.map(v => v.field).join(', ')}${hasCorrectedIndicator ? ', which along with the Corrected indicator suggest the newer document is a corrected version' : ', which is consistent with an updated filing superseding the original'}.`
                                    : `The AI compared these ${formType} documents and found ${matchingFields.length} matching field${matchingFields.length !== 1 ? 's' : ''} out of ${matchingFields.length + differingFields.length} total. ${differingFields.length > 0 ? `Fields that differ: ${differingFields.map(v => v.field).join(', ')}.` : ''}`
                                }
                                {hasAmountDiffs && ' Income-related fields differ between documents -- verify the newer filing contains updated amounts.'}
                              </p>

                              {/* Matching / Differing field groups */}
                              <div style={{ display: 'flex', gap: '0.375rem' }}>
                                {matchingFields.length > 0 && (
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.96 0.02 145)', border: '0.0625rem solid oklch(0.9 0.04 145)' }}>
                                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.4 0.14 145)' }}>
                                      Matching ({matchingFields.length})
                                    </span>
                                    {Array.from(matchCategories.entries()).map(([cat, fields]) => (
                                      <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                        <span style={{ fontSize: '0.5rem', fontWeight: 600, color: 'oklch(0.5 0.1 145)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.1875rem' }}>
                                          {fields.map(f => (
                                            <span key={f} style={{ fontSize: '0.5625rem', fontWeight: 500, padding: '0.0625rem 0.25rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.92 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>{f}</span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {differingFields.length > 0 && (
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.97 0.02 60)', border: '0.0625rem solid oklch(0.9 0.04 60)' }}>
                                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.45 0.14 60)' }}>
                                      Differing ({differingFields.length})
                                    </span>
                                    {Array.from(differCategories.entries()).map(([cat, fields]) => (
                                      <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                        <span style={{ fontSize: '0.5rem', fontWeight: 600, color: 'oklch(0.55 0.1 60)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.1875rem' }}>
                                          {fields.map(f => (
                                            <span key={f} style={{ fontSize: '0.5625rem', fontWeight: 500, padding: '0.0625rem 0.25rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.93 0.04 60)', color: 'oklch(0.4 0.14 60)' }}>{f}</span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Verification guidance */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.97 0.01 250)', border: '0.0625rem solid oklch(0.92 0.02 250)' }}>
                                <Info style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.1 250)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                                <span style={{ fontSize: '0.625rem', color: 'oklch(0.35 0.01 260)', lineHeight: 1.5 }}>
                                  {allFieldsMatch
                                    ? 'All compared fields match exactly. Confirm the newer document supersedes the older one and is not a separate filing for a different period.'
                                    : hasAmountDiffs
                                      ? 'Income-related fields differ. Verify the newer document contains corrected amounts and supersedes the original filing.'
                                      : `Review the ${differingFields.length} differing field${differingFields.length !== 1 ? 's' : ''} to confirm this represents an updated version rather than a distinct filing.`
                                  }
                                </span>
                              </div>

                              {/* Inline AI decision reasons */}
                              {activeGroup.records[0]?.decisionReason && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBlockStart: '0.25rem' }}>
                                  {activeGroup.records[0].decisionReason.split('||').map((seg, i) => {
                                    const [tag, ...rest] = seg.split('|')
                                    const text = rest.join('|')
                                    return (
                                      <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                                        <span style={{ fontSize: '0.5625rem', fontWeight: 700, padding: '0.0625rem 0.25rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.92 0.04 270)', color: 'oklch(0.4 0.12 270)', whiteSpace: 'nowrap' }}>{tag}</span>
                                        <span style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>{text}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ═══ PANEL 2: Field Comparison ═══ */}
              {!isGroupRejected && comparedValues.length > 0 && (
                <div style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                  <button type="button" onClick={() => togglePanel('fieldComparison')} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    inlineSize: '100%', padding: '0.5rem 0.75rem',
                    border: 'none', cursor: 'pointer', textAlign: 'start',
                    fontSize: '0.75rem', fontWeight: 700,
                    color: 'oklch(0.35 0.01 260)',
                    backgroundColor: 'oklch(0.97 0.003 260)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {expandedPanels.has('fieldComparison')
                      ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                      : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                    }
                    <Columns2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.45 0.12 240)' }} />
                    Field Comparison
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)', textTransform: 'none', letterSpacing: 'normal' }}>
                      {comparedValues.filter(v => v.valueA !== v.valueB).length} of {comparedValues.length} differ
                    </span>
                  </button>

                  {expandedPanels.has('fieldComparison') && (
                    <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'oklch(0.99 0.002 260)' }}>
                      <FieldComparison
                        values={comparedValues}
                        labelA="Superseded"
                        labelB="Original"
                        docRefA={leftDoc?.documentRef}
                        docRefB={rightDoc?.documentRef}
                        isOverridden={isActiveFlipped}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ═══ PANEL 3: Document Viewer ═══ */}
              {!isGroupRejected && leftDoc && rightDoc && (
                <div style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                  <button type="button" onClick={() => togglePanel('documents')} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    inlineSize: '100%', padding: '0.5rem 0.75rem',
                    border: 'none', cursor: 'pointer', textAlign: 'start',
                    fontSize: '0.75rem', fontWeight: 700,
                    color: 'oklch(0.3 0.01 260)',
                    backgroundColor: 'oklch(0.96 0.005 260)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
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
                      <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', fontWeight: 500, color: 'oklch(0.5 0.01 260)', textTransform: 'none', letterSpacing: 'normal' }}>
                        <Minimize2 style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                        Collapse
                      </span>
                    )}
                  </button>

                  {/* Compact chips (collapsed) */}
                  {!isDocExpanded && (
                    <div role="button" tabIndex={0} onClick={() => togglePanel('documents')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePanel('documents') }} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem', cursor: 'pointer', backgroundColor: 'oklch(0.98 0.003 260)' }} aria-label="Click to expand document viewer">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flex: '1 1 0', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', border: '0.0625rem solid oklch(0.88 0.01 260)', backgroundColor: 'oklch(0.97 0.003 260)' }}>
                        <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', flexShrink: 0, color: 'oklch(0.45 0.01 260)' }} />
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Pg {leftDoc.documentRef?.pageNumber ?? leftDoc.engagementPageId}
                        </span>
                        <span style={{ marginInlineStart: 'auto', flexShrink: 0, fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.18 25)' }}>
                          Superseded
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flex: '1 1 0', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', border: '0.0625rem solid oklch(0.88 0.01 260)', backgroundColor: 'oklch(0.97 0.003 260)' }}>
                        <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', flexShrink: 0, color: 'oklch(0.45 0.01 260)' }} />
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Pg {rightDoc.documentRef?.pageNumber ?? rightDoc.engagementPageId}
                        </span>
                        <span style={{ marginInlineStart: 'auto', flexShrink: 0, fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.0625rem 0.1875rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
                          Original
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Full document viewer (expanded) */}
                  {isDocExpanded && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.75rem', minBlockSize: '30rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: '0.375rem' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Superseded</span>
                          {supersededList.length > 1 && (
                            <select value={safeIdx} onChange={e => setSelectedSupersededIdx(Number(e.target.value))} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.25rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem' }}>
                              {supersededList.map((s, i) => (
                                <option key={s.engagementPageId} value={i}>Pg {s.documentRef?.pageNumber ?? s.engagementPageId}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        {leftDoc.documentRef && <PdfPageViewer documentRef={leftDoc.documentRef} stamp="SUPERSEDED" />}
                      </div>
                      <div>
                        <div style={{ marginBlockEnd: '0.375rem' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Original</span>
                        </div>
                        {rightDoc.documentRef && <PdfPageViewer documentRef={rightDoc.documentRef} stamp="ORIGINAL" />}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
