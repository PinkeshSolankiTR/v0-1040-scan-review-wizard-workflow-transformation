'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { FieldComparison } from '@/components/field-comparison'
import { useDecisions } from '@/contexts/decision-context'
import { useLearnedRules } from '@/contexts/learned-rules-context'
import {
  ChevronDown, ChevronRight, FileText, Sparkles, Check, CheckCircle2,
  Undo2, AlertTriangle, ArrowLeftRight, GripVertical, X,
} from 'lucide-react'
import type { SupersededRecord, OverrideDetail } from '@/lib/types'

type PanelId = 'documents' | 'aiAnalysis' | 'fieldComparison'

const OVERRIDE_REASONS = [
  { id: 'corrected', label: 'Corrected form detected - should be retained' },
  { id: 'more-data', label: 'More complete data exists on this document' },
] as const

const REJECTION_REASONS = [
  { id: 'not-related', label: 'Not related documents', description: 'These forms are not connected to each other' },
  { id: 'different-years', label: 'Different tax years', description: 'Documents are from different filing periods' },
  { id: 'different-taxpayers', label: 'Different taxpayers', description: 'Documents belong to different people' },
  { id: 'incomplete-scan', label: 'Incomplete or unclear scan', description: 'Document quality prevents proper analysis' },
] as const

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

interface FormGroup {
  formType: string; formEntity: string; records: SupersededRecord[]
  originalRecord: SupersededRecord | null; supersededRecords: SupersededRecord[]
}

function groupByFormType(data: SupersededRecord[]): FormGroup[] {
  const map = new Map<string, SupersededRecord[]>()
  for (const r of data) { const key = r.documentRef?.formType ?? 'Unknown'; if (!map.has(key)) map.set(key, []); map.get(key)!.push(r) }
  const groups: FormGroup[] = []
  for (const [formType, records] of map.entries()) {
    const entityParts = records[0].documentRef?.formLabel?.replace(formType, '').replace(/[()]/g, '').trim()
    groups.push({ formType, formEntity: entityParts || formType, records, originalRecord: records.find(r => r.decisionType === 'Original') ?? null, supersededRecords: records.filter(r => r.decisionType === 'Superseded') })
  }
  return groups
}

function restoreReclassifyState(group: FormGroup, overrides: Record<string, OverrideDetail>, isFlipped: boolean, flippedIdx: number | undefined) {
  const roles = new Map<string, 'original' | 'superseded' | 'not-superseded'>()
  let savedReclR: string | null = null; let savedExclR: string | null = null
  for (const rc of group.records) {
    const pid = String(rc.engagementPageId)
    const ov = overrides[`sup-pg${pid}`]
    if (ov && ov.userOverrideDecision) {
      if (ov.userOverrideDecision.includes('Not Superseded')) { roles.set(pid, 'not-superseded'); if (!savedExclR) savedExclR = ov.overrideReason || null }
      else if (ov.userOverrideDecision.endsWith('= Original')) { roles.set(pid, 'original'); if (!savedReclR && ov.userOverrideDecision !== ov.originalAIDecision) savedReclR = ov.overrideReason || null }
      else { roles.set(pid, 'superseded'); if (!savedReclR && ov.userOverrideDecision !== ov.originalAIDecision) savedReclR = ov.overrideReason || null }
    } else {
      const orig = isFlipped ? (flippedIdx !== undefined && rc.engagementPageId === group.supersededRecords[flippedIdx]?.engagementPageId) : rc.decisionType === 'Original'
      roles.set(pid, orig ? 'original' : 'superseded')
    }
  }
  let reasonId: string | null = null; let reasonCustom = ''
  if (savedReclR && savedReclR !== 'Verifier decision') { const f = OVERRIDE_REASONS.find(x => x.label === savedReclR); if (f) reasonId = f.id; else { reasonId = 'custom'; reasonCustom = savedReclR || '' } }
  const exclIds = new Set<string>(); let exclCustom = ''
  if (savedExclR && savedExclR !== 'Verifier decision') { const pp = savedExclR.split(', '); for (const p of pp) { const f = REJECTION_REASONS.find(x => x.label === p); if (f) exclIds.add(f.id) }; if (exclIds.size === 0) exclCustom = savedExclR || '' }
  return { roles, reasonId, reasonCustom, exclIds, exclCustom }
}

export function VariantEDocCompare({ data }: { data: SupersededRecord[] }) {
  const { decisions, overrides, accept, undo, override } = useDecisions()
  const { addRuleFromOverride } = useLearnedRules()
  const groups = useMemo(() => groupByFormType(data), [data])

  const [flippedGroups, setFlippedGroups] = useState<Map<string, number>>(new Map())
  const [showOverridePanel, setShowOverridePanel] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(groups.map(g => g.formType)))
  const [selectedSupersededIdx, setSelectedSupersededIdx] = useState(0)
  const [visiblePanels, setVisiblePanels] = useState<Set<PanelId>>(new Set(['documents', 'fieldComparison']))
  const [docRoles, setDocRoles] = useState<Map<string, 'original' | 'superseded' | 'not-superseded'>>(new Map())
  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [notSupersededReason, setNotSupersededReason] = useState<Set<string>>(new Set())
  const [notSupersededCustom, setNotSupersededCustom] = useState('')
  const [rejectedDocs, setRejectedDocs] = useState<Map<string, { reason: string; timestamp: string }>>(new Map())
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true; e.preventDefault()
    const onMove = (ev: MouseEvent) => { if (!isDragging.current || !containerRef.current) return; const rect = containerRef.current.getBoundingClientRect(); setSidebarWidth(Math.min(Math.max(ev.clientX - rect.left, 180), 400)) }
    const onUp = () => { isDragging.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }, [])

  const selectGroup = useCallback((idx: number) => { setSelectedGroupIdx(idx); setSelectedSupersededIdx(0); setShowOverridePanel(false); setShowRejectPanel(false); setExpandedGroups(prev => { const next = new Set(prev); next.add(groups[idx]?.formType ?? ''); return next }) }, [groups])
  const toggleGroup = useCallback((formType: string, idx: number) => { setExpandedGroups(prev => { const next = new Set(prev); if (next.has(formType)) next.delete(formType); else next.add(formType); return next }); setSelectedGroupIdx(idx); setSelectedSupersededIdx(0); setShowOverridePanel(false); setShowRejectPanel(false) }, [])
  const rejectedPageIds = useMemo(() => new Set(rejectedDocs.keys()), [rejectedDocs])
  const activeGroup = groups[selectedGroupIdx] ?? null
  const activeFlippedIdx = activeGroup ? flippedGroups.get(activeGroup.formType) : undefined
  const isActiveFlipped = activeFlippedIdx !== undefined && activeGroup ? !rejectedDocs.has(String(activeGroup.supersededRecords[activeFlippedIdx]?.engagementPageId)) : false

  const effectiveOriginal = useMemo(() => {
    if (!activeGroup) return null
    if (isActiveFlipped && activeFlippedIdx !== undefined) { const f = activeGroup.supersededRecords[activeFlippedIdx]; if (f && !rejectedDocs.has(String(f.engagementPageId))) return f }
    return activeGroup.originalRecord
  }, [activeGroup, isActiveFlipped, activeFlippedIdx, rejectedDocs])

  const supersededList = useMemo(() => {
    if (!activeGroup) return []
    let list: SupersededRecord[]
    if (isActiveFlipped && activeFlippedIdx !== undefined) { list = [...(activeGroup.originalRecord ? [activeGroup.originalRecord] : []), ...activeGroup.supersededRecords.filter((_, i) => i !== activeFlippedIdx)] }
    else { list = activeGroup.supersededRecords }
    return list.filter(r => !rejectedPageIds.has(String(r.engagementPageId)))
  }, [activeGroup, isActiveFlipped, activeFlippedIdx, rejectedPageIds])

  const safeIdx = Math.min(selectedSupersededIdx, Math.max(0, supersededList.length - 1))
  const leftDoc = supersededList[safeIdx] ?? null
  const rightDoc = effectiveOriginal
  const comparedValues = useMemo(() => leftDoc?.comparedValues ?? [], [leftDoc])

  const isGroupRejected = activeGroup ? rejectedDocs.has(activeGroup.formType) : false
  const allGroupAccepted = activeGroup ? activeGroup.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted') : false
  const isGroupOverridden = isActiveFlipped || (activeGroup?.records.some(r => { const d = overrides[`sup-pg${r.engagementPageId}`]; return d && d.userOverrideDecision && d.userOverrideDecision !== d.originalAIDecision }) ?? false)

  const handleUndoOverride = useCallback(() => {
    if (!activeGroup) return
    setFlippedGroups(prev => { const next = new Map(prev); next.delete(activeGroup.formType); return next })
    for (const r of activeGroup.records) { undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel) }
    setSelectedSupersededIdx(0); setShowOverridePanel(false)
  }, [activeGroup, undo])

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '0.0625rem solid oklch(0.88 0.01 260)', borderRadius: 'var(--radius)', overflow: 'hidden', backgroundColor: 'oklch(1 0 0)' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', backgroundColor: 'oklch(0.97 0.003 260)', borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.45 0.01 260)' }} />
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>Verify Superseded</h2>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.125rem 0.5rem', borderRadius: '624.9375rem', backgroundColor: 'oklch(0.93 0.005 260)', color: 'oklch(0.4 0.01 260)', fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{data.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Reclassify button */}
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => { if (!showOverridePanel && activeGroup) { const r = restoreReclassifyState(activeGroup, overrides, isActiveFlipped, activeFlippedIdx); setDocRoles(r.roles); setSelectedReason(r.reasonId); setCustomReason(r.reasonCustom); setNotSupersededReason(r.exclIds); setNotSupersededCustom(r.exclCustom) }; setShowOverridePanel(p => !p) }} disabled={isGroupRejected || allGroupAccepted} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.82 0.08 60)', borderRadius: '0.25rem', backgroundColor: isActiveFlipped ? 'oklch(0.96 0.04 60)' : 'oklch(1 0 0)', fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.5 0.16 60)', cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer', opacity: (isGroupRejected || allGroupAccepted) ? 0.5 : 1 }} aria-expanded={showOverridePanel}>
              <ArrowLeftRight style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Reclassify
              <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
            </button>
            {/* Reclassify Panel */}
            {showOverridePanel && !allGroupAccepted && (() => {
              const hasRoleSwap = activeGroup?.records.some(r => { const pid = String(r.engagementPageId); const cur = docRoles.get(pid); const ai = r.decisionType === 'Original' ? 'original' : 'superseded'; return cur && cur !== ai && cur !== 'not-superseded' }) ?? false
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
                    {/* Document role selectors */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {activeGroup?.records.map(r => {
                        const pid = String(r.engagementPageId); const role = docRoles.get(pid) ?? 'superseded'
                        return (
                          <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', border: '0.0625rem solid oklch(0.91 0.005 260)', backgroundColor: role === 'not-superseded' ? 'oklch(0.96 0.02 25 / 0.3)' : 'oklch(0.98 0.003 260)' }}>
                            <span style={{ flex: 1, fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)' }}>Pg {r.documentRef?.pageNumber ?? r.engagementPageId}</span>
                            <select value={role} onChange={e => { const newRole = e.target.value as 'original' | 'superseded' | 'not-superseded'; const next = new Map(docRoles); if (newRole === 'original') { for (const [k, v] of next) { if (v === 'original') next.set(k, 'superseded') } }; next.set(pid, newRole); setDocRoles(next) }} style={{ fontSize: '0.6875rem', padding: '0.25rem 0.375rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', color: 'oklch(0.3 0.01 260)', cursor: 'pointer' }}>
                              <option value="original">Original</option>
                              <option value="superseded">Superseded</option>
                              <option value="not-superseded">Not Superseded</option>
                            </select>
                          </div>
                        )
                      })}
                    </div>
                    {valError && <p style={{ fontSize: '0.6875rem', color: 'oklch(0.5 0.18 25)', fontWeight: 600 }}>{valError}</p>}
                    {/* Reclassification reason */}
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
                    {/* Not Superseded reason */}
                    {hasNotSup && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.35 0.01 260)' }}>Reason for exclusion</label>
                        {REJECTION_REASONS.map(reason => (
                          <label key={reason.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.6875rem', color: 'oklch(0.3 0.01 260)' }}>
                            <input type="checkbox" checked={notSupersededReason.has(reason.id)} onChange={() => { const next = new Set(notSupersededReason); if (next.has(reason.id)) next.delete(reason.id); else next.add(reason.id); setNotSupersededReason(next); setNotSupersededCustom('') }} style={{ accentColor: 'oklch(0.45 0.18 145)' }} />
                            {reason.label}
                          </label>
                        ))}
                        {notSupersededReason.size === 0 && <textarea value={notSupersededCustom} onChange={e => setNotSupersededCustom(e.target.value)} placeholder="Enter exclusion reason..." rows={2} style={{ fontSize: '0.6875rem', padding: '0.375rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', resize: 'vertical' }} />}
                      </div>
                    )}
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end', paddingBlockStart: '0.25rem', borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                      {isActiveFlipped && <button type="button" onClick={() => { handleUndoOverride() }} style={{ padding: '0.375rem 0.625rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.4 0.01 260)', cursor: 'pointer' }}>Undo</button>}
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
                        if (hasSwap) { const ti = activeGroup.supersededRecords.findIndex(s => String(s.engagementPageId) === newOrigPageId); setFlippedGroups(prev => { const n = new Map(prev); if (ti >= 0) n.set(activeGroup.formType, ti); return n }) }
                        for (const r of activeGroup.records) {
                          const key = `sup-pg${r.engagementPageId}`; const dr = docRoles.get(String(r.engagementPageId))
                          let nd: string; if (dr === 'original') nd = 'Original'; else if (dr === 'not-superseded') nd = 'Not Superseded'; else nd = 'Superseded'
                          const docRT = dr === 'not-superseded' ? exclusionReasonText || reclassifyReasonText || 'Verifier decision' : reclassifyReasonText || 'Verifier decision'
                          const detail: OverrideDetail = { originalAIDecision: `Page ${r.engagementPageId} = ${r.decisionType}`, userOverrideDecision: `Page ${r.engagementPageId} = ${nd}`, overrideReason: docRT, formType: r.documentRef?.formType ?? 'Unknown', fieldContext: r.comparedValues ?? [] }
                          override(key, 'superseded', r.confidenceLevel, detail)
                        }
                        setSelectedSupersededIdx(0); setShowOverridePanel(false); setSelectedReason(null); setCustomReason(''); setNotSupersededReason(new Set()); setNotSupersededCustom('')
                      }} style={{ padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.25rem', backgroundColor: !canApply ? 'oklch(0.9 0.01 260)' : 'oklch(0.45 0.18 145)', fontSize: '0.6875rem', fontWeight: 600, color: !canApply ? 'oklch(0.6 0.01 260)' : 'oklch(1 0 0)', cursor: !canApply ? 'not-allowed' : 'pointer' }}>Apply</button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
          {/* Reject button */}
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => { setShowRejectPanel(p => !p); setShowOverridePanel(false) }} disabled={isGroupRejected || allGroupAccepted} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.82 0.05 25)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.5 0.12 25)', cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer', opacity: (isGroupRejected || allGroupAccepted) ? 0.5 : 1 }}>
              <X style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Reject
            </button>
            {showRejectPanel && !allGroupAccepted && (() => {
              const rejFilled = notSupersededReason.size > 0 || notSupersededCustom.trim() !== ''
              return (
                <div key="reject-panel-wrapper">
                  <div onClick={() => setShowRejectPanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                  <div style={{ position: 'absolute', insetBlockStart: '100%', insetInlineEnd: 0, marginBlockStart: '0.25rem', zIndex: 50, inlineSize: 'max-content', minInlineSize: '18rem', maxInlineSize: '24rem', backgroundColor: 'oklch(1 0 0)', borderRadius: '0.375rem', border: '0.0625rem solid oklch(0.88 0.01 260)', boxShadow: '0 0.25rem 1rem oklch(0 0 0 / 0.12)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.25 0.01 260)' }}>Reject Classification</p>
                    <p style={{ fontSize: '0.6875rem', color: 'oklch(0.45 0.01 260)' }}>This will reject the entire superseded group. Provide a reason:</p>
                    {REJECTION_REASONS.map(reason => (
                      <label key={reason.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.6875rem', color: 'oklch(0.3 0.01 260)' }}>
                        <input type="checkbox" checked={notSupersededReason.has(reason.id)} onChange={() => { const next = new Set(notSupersededReason); if (next.has(reason.id)) next.delete(reason.id); else next.add(reason.id); setNotSupersededReason(next) }} style={{ accentColor: 'oklch(0.45 0.18 25)' }} />
                        {reason.label}
                      </label>
                    ))}
                    {notSupersededReason.size === 0 && <textarea value={notSupersededCustom} onChange={e => setNotSupersededCustom(e.target.value)} placeholder="Enter reason..." rows={2} style={{ fontSize: '0.6875rem', padding: '0.375rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', resize: 'vertical' }} />}
                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end', paddingBlockStart: '0.25rem', borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                      <button type="button" onClick={() => setShowRejectPanel(false)} style={{ padding: '0.375rem 0.625rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.4 0.01 260)', cursor: 'pointer' }}>Cancel</button>
                      <button type="button" disabled={!rejFilled} onClick={() => {
                        if (!activeGroup) return
                        const reasonText = notSupersededReason.size > 0 ? Array.from(notSupersededReason).map(id => REJECTION_REASONS.find(r => r.id === id)?.label ?? id).join(', ') : notSupersededCustom.trim()
                        setRejectedDocs(prev => { const next = new Map(prev); next.set(activeGroup.formType, { reason: reasonText, timestamp: new Date().toISOString() }); return next })
                        for (const r of activeGroup.records) {
                          const key = `sup-pg${r.engagementPageId}`
                          const detail: OverrideDetail = { originalAIDecision: `Page ${r.engagementPageId} = ${r.decisionType}`, userOverrideDecision: `Page ${r.engagementPageId} = Not Superseded`, overrideReason: reasonText, formType: r.documentRef?.formType ?? 'Unknown', fieldContext: r.comparedValues ?? [] }
                          override(key, 'superseded', r.confidenceLevel, detail)
                        }
                        setShowRejectPanel(false); setNotSupersededReason(new Set()); setNotSupersededCustom('')
                      }} style={{ padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.25rem', backgroundColor: !rejFilled ? 'oklch(0.9 0.01 260)' : 'oklch(0.45 0.18 25)', fontSize: '0.6875rem', fontWeight: 600, color: !rejFilled ? 'oklch(0.6 0.01 260)' : 'oklch(1 0 0)', cursor: !rejFilled ? 'not-allowed' : 'pointer' }}>Reject</button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
          {/* Accept button */}
          {activeGroup && !allGroupAccepted && !isGroupRejected && (
            <button type="button" onClick={() => { if (!activeGroup) return; for (const r of activeGroup.records) { accept(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel, 'manual') }; if (isActiveFlipped) { const firstR = activeGroup.records[0]; if (firstR) { const d = overrides[`sup-pg${firstR.engagementPageId}`]; if (d) addRuleFromOverride(d, 'superseded') } } }} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.78 0.12 145)', borderRadius: '0.25rem', backgroundColor: 'oklch(0.45 0.18 145)', fontSize: '0.75rem', fontWeight: 600, color: 'oklch(1 0 0)', cursor: 'pointer' }}>
              <Check style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Accept
            </button>
          )}
          {allGroupAccepted && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.45 0.18 145)' }}><CheckCircle2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />Accepted</span>}
        </div>
      </header>

      {/* Main layout */}
      <div style={{ display: 'flex', minBlockSize: '36rem' }}>
        {/* Left sidebar */}
        <aside style={{ inlineSize: `${sidebarWidth}px`, flexShrink: 0, borderInlineEnd: '0.0625rem solid oklch(0.91 0.005 260)', backgroundColor: 'oklch(0.98 0.003 260)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.625rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
            {groups.map((group, gIdx) => {
              const isSelected = gIdx === selectedGroupIdx; const isExpanded = expandedGroups.has(group.formType); const identifier = extractIdentifier(group.records)
              const panelGroupRejected = rejectedDocs.has(group.formType); const gFlipIdx = flippedGroups.get(group.formType); const gFlipped = gFlipIdx !== undefined
              return (
                <div key={group.formType}>
                  <button type="button" onClick={() => toggleGroup(group.formType, gIdx)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', inlineSize: '100%', padding: '0.375rem 0.5rem', border: 'none', borderRadius: '0.25rem', backgroundColor: isSelected ? 'oklch(0.93 0.02 240)' : 'transparent', cursor: 'pointer', textAlign: 'start' }}>
                    {isExpanded ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', flexShrink: 0, color: 'oklch(0.5 0.01 260)' }} /> : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', flexShrink: 0, color: 'oklch(0.5 0.01 260)' }} />}
                    <div style={{ flex: 1, minInlineSize: 0 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.25 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.formType}</div>
                      {identifier && <div style={{ fontSize: '0.625rem', color: 'oklch(0.5 0.01 260)', fontFamily: 'var(--font-mono)' }}>{identifier.label}: {identifier.value}</div>}
                    </div>
                    {panelGroupRejected && <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.18 25)', flexShrink: 0 }} />}
                    {gFlipped && !panelGroupRejected && <ArrowLeftRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.16 60)', flexShrink: 0 }} />}
                    {allGroupAccepted && !panelGroupRejected && !gFlipped && <CheckCircle2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.18 145)', flexShrink: 0 }} />}
                  </button>
                  {isExpanded && (
                    <div style={{ paddingInlineStart: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.0625rem' }}>
                      {group.records.map(r => {
                        const pgKey = `sup-pg${r.engagementPageId}`; const storedOv = overrides[pgKey]; const pageId = String(r.engagementPageId)
                        let label: string
                        if (storedOv && storedOv.userOverrideDecision) {
                          if (storedOv.userOverrideDecision.includes('Not Superseded')) label = 'Not Superseded'
                          else if (storedOv.userOverrideDecision.endsWith('= Original')) label = 'Original'
                          else label = 'Superseded'
                        } else {
                          const isSup = gFlipped ? (gFlipIdx !== undefined && r.engagementPageId !== group.supersededRecords[gFlipIdx]?.engagementPageId && r.decisionType !== 'Original') || (r.decisionType === 'Original') : r.decisionType === 'Superseded'
                          label = isSup ? 'Superseded' : 'Original'
                        }
                        const labelColor = label === 'Original' ? 'oklch(0.45 0.18 145)' : label === 'Not Superseded' ? 'oklch(0.5 0.12 25)' : 'oklch(0.5 0.01 260)'
                        return (
                          <button key={pgKey} type="button" onClick={() => { selectGroup(gIdx); if (label === 'Superseded') { const si = supersededList.findIndex(s => s.engagementPageId === r.engagementPageId); if (si >= 0) setSelectedSupersededIdx(si) } }} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', inlineSize: '100%', padding: '0.25rem 0.375rem', border: 'none', borderRadius: '0.25rem', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'start' }}>
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

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeGroup && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '1rem' }}>
              {/* Verifier Decision summary */}
              {isGroupOverridden && !isGroupRejected && (() => {
                const allRecords = activeGroup.records
                return (
                  <div style={{ marginBlockEnd: '1rem', padding: '0.75rem', borderRadius: '0.375rem', border: '0.0625rem solid oklch(0.82 0.08 60)', backgroundColor: 'oklch(0.97 0.02 60)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockEnd: '0.5rem' }}>
                      <ArrowLeftRight style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0.16 60)' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.3 0.01 260)' }}>Verifier Decision</span>
                      <span style={{ fontSize: '0.5625rem', padding: '0.125rem 0.375rem', borderRadius: '624.9375rem', backgroundColor: 'oklch(0.92 0.06 60)', color: 'oklch(0.45 0.14 60)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Verifier Decision</span>
                    </div>
                    {/* Before/After comparison */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBlockEnd: '0.5rem' }}>
                      <div style={{ padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.97 0.005 260)', border: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                        <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>AI Recommended</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', marginBlockStart: '0.25rem' }}>
                          {allRecords.map(r => (<div key={r.engagementPageId} style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}><span style={{ fontWeight: 600 }}>Pg {r.documentRef?.pageNumber ?? r.engagementPageId}</span> = {r.decisionType}</div>))}
                        </div>
                      </div>
                      <div style={{ padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.96 0.03 60)', border: '0.0625rem solid oklch(0.88 0.06 60)' }}>
                        <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.12 60)' }}>Verifier Changed To</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', marginBlockStart: '0.25rem' }}>
                          {allRecords.map(r => {
                            const storedD = overrides[`sup-pg${r.engagementPageId}`]; const isRejected = storedD?.userOverrideDecision?.includes('Not Superseded')
                            let newLabel: string
                            if (isRejected) newLabel = 'Not Superseded'
                            else if (storedD?.userOverrideDecision?.endsWith('= Original')) newLabel = 'Original'
                            else if (storedD?.userOverrideDecision?.endsWith('= Superseded')) newLabel = 'Superseded'
                            else newLabel = r.decisionType
                            const changed = newLabel !== r.decisionType
                            return (<div key={r.engagementPageId} style={{ fontSize: '0.6875rem', color: changed ? 'oklch(0.35 0.12 60)' : 'oklch(0.35 0.01 260)', fontWeight: changed ? 600 : 400 }}><span style={{ fontWeight: 600 }}>Pg {r.documentRef?.pageNumber ?? r.engagementPageId}</span> = {newLabel}</div>)
                          })}
                        </div>
                      </div>
                    </div>
                    {/* Reclassification reason */}
                    {(() => {
                      const reclRec = allRecords.find(r => { const d = overrides[`sup-pg${r.engagementPageId}`]; return d && !d.userOverrideDecision?.includes('Not Superseded') && d.userOverrideDecision !== d.originalAIDecision })
                      const reason = reclRec ? overrides[`sup-pg${reclRec.engagementPageId}`]?.overrideReason : null
                      const displayR = reason && reason !== 'Verifier decision' ? reason : null
                      return displayR ? (<div style={{ padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', border: '0.0625rem solid oklch(0.88 0.01 260)' }}><span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>Reason for Reclassification</span><p style={{ margin: '0.125rem 0 0', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)', lineHeight: 1.4 }}>{displayR}</p></div>) : null
                    })()}
                    {/* Exclusion reason */}
                    {(() => {
                      const exclRecs = allRecords.filter(r => overrides[`sup-pg${r.engagementPageId}`]?.userOverrideDecision?.includes('Not Superseded'))
                      if (exclRecs.length === 0) return null
                      const exclReason = overrides[`sup-pg${exclRecs[0].engagementPageId}`]?.overrideReason
                      const displayER = exclReason && exclReason !== 'Verifier decision' ? exclReason : null
                      return (
                        <div style={{ padding: '0.5rem 0.625rem', borderRadius: '0.25rem', backgroundColor: 'oklch(0.97 0.005 260)', border: '0.0625rem solid oklch(0.91 0.005 260)', marginBlockStart: '0.375rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockEnd: '0.25rem' }}><AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.55 0.01 260)' }} /><span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.3 0.01 260)' }}>Not Superseded</span></div>
                          <div style={{ paddingInlineStart: '1.125rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockEnd: '0.25rem' }}><span style={{ inlineSize: '0.25rem', blockSize: '0.25rem', borderRadius: '50%', backgroundColor: 'oklch(0.5 0.01 260)', flexShrink: 0 }} /><span style={{ fontSize: '0.625rem', color: 'oklch(0.35 0.01 260)' }}>{exclRecs.map(r => `Pg ${r.documentRef?.pageNumber ?? r.engagementPageId}`).join(', ')} will remain as independent record{exclRecs.length > 1 ? 's' : ''}</span></div>
                            {displayER && (<div style={{ marginBlockStart: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', border: '0.0625rem solid oklch(0.88 0.01 260)' }}><span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'oklch(0.5 0.01 260)' }}>Reason for Exclusion</span><p style={{ margin: '0.125rem 0 0', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)', lineHeight: 1.4 }}>{displayER}</p></div>)}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })()}

              {/* Rejected banner */}
              {isGroupRejected && (
                <div style={{ marginBlockEnd: '1rem', padding: '0.75rem', borderRadius: '0.375rem', border: '0.0625rem solid oklch(0.82 0.08 25)', backgroundColor: 'oklch(0.97 0.02 25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <AlertTriangle style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0.18 25)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.35 0.12 25)' }}>Classification Rejected</span>
                  </div>
                  <p style={{ marginBlockStart: '0.375rem', fontSize: '0.6875rem', color: 'oklch(0.4 0.08 25)' }}>Reason: {rejectedDocs.get(activeGroup.formType)?.reason}</p>
                  <button type="button" onClick={() => { setRejectedDocs(prev => { const n = new Map(prev); n.delete(activeGroup.formType); return n }); for (const r of activeGroup.records) undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel) }} style={{ marginBlockStart: '0.375rem', fontSize: '0.6875rem', padding: '0.25rem 0.5rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem', backgroundColor: 'oklch(1 0 0)', cursor: 'pointer', color: 'oklch(0.4 0.01 260)' }}>
                    <Undo2 style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem', display: 'inline', verticalAlign: 'middle', marginInlineEnd: '0.25rem' }} />
                    Undo Rejection
                  </button>
                </div>
              )}

              {/* AI Analysis panel */}
              {visiblePanels.has('aiAnalysis') && activeGroup.records[0]?.decisionReason && (
                <div style={{ marginBlockEnd: '1rem', padding: '0.75rem', borderRadius: '0.375rem', border: '0.0625rem solid oklch(0.88 0.04 270)', backgroundColor: 'oklch(0.98 0.01 270)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBlockEnd: '0.5rem' }}>
                    <Sparkles style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0.15 270)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.3 0.01 260)' }}>AI Analysis</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {activeGroup.records[0].decisionReason.split('||').map((seg, i) => {
                      const [tag, ...rest] = seg.split('|'); const text = rest.join('|')
                      return (<div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}><span style={{ fontSize: '0.5625rem', fontWeight: 700, padding: '0.0625rem 0.25rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.92 0.04 270)', color: 'oklch(0.4 0.12 270)', whiteSpace: 'nowrap' }}>{tag}</span><span style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.01 260)' }}>{text}</span></div>)
                    })}
                  </div>
                </div>
              )}

              {/* Document comparison */}
              {visiblePanels.has('documents') && !isGroupRejected && leftDoc && rightDoc && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBlockEnd: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: '0.375rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Superseded</span>
                      {supersededList.length > 1 && (
                        <select value={safeIdx} onChange={e => setSelectedSupersededIdx(Number(e.target.value))} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.25rem', border: '0.0625rem solid oklch(0.85 0.01 260)', borderRadius: '0.25rem' }}>
                          {supersededList.map((s, i) => (<option key={s.engagementPageId} value={i}>Pg {s.documentRef?.pageNumber ?? s.engagementPageId}</option>))}
                        </select>
                      )}
                    </div>
                    {leftDoc.documentRef && <PdfPageViewer documentRef={leftDoc.documentRef} stamp="SUPERSEDED" />}
                  </div>
                  <div>
                    <div style={{ marginBlockEnd: '0.375rem' }}><span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Original</span></div>
                    {rightDoc.documentRef && <PdfPageViewer documentRef={rightDoc.documentRef} stamp="ORIGINAL" />}
                  </div>
                </div>
              )}

              {/* Field comparison */}
              {visiblePanels.has('fieldComparison') && comparedValues.length > 0 && !isGroupRejected && (
                <FieldComparison values={comparedValues} labelA="Superseded" labelB="Original" docRefA={leftDoc?.documentRef} docRefB={rightDoc?.documentRef} isOverridden={isActiveFlipped} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
