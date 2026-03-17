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
  GripVertical,
} from 'lucide-react'
import type { SupersededRecord, OverrideDetail } from '@/lib/types'

/* ── Panel visibility state ── */
type PanelId = 'documents' | 'aiAnalysis' | 'fieldComparison'

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

/* ── Restore reclassify state from stored overrides ── */
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
  const exclIds = new Set<string>()
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

  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(groups.map(g => g.formType)))
  const [selectedSupersededIdx, setSelectedSupersededIdx] = useState(0)
  const [visiblePanels, setVisiblePanels] = useState<Set<PanelId>>(new Set(['documents', 'fieldComparison']))

  const [docRoles, setDocRoles] = useState<Map<string, 'original' | 'superseded' | 'not-superseded'>>(new Map())
  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [notSupersededReason, setNotSupersededReason] = useState<Set<string>>(new Set())
  const [notSupersededCustom, setNotSupersededCustom] = useState('')

  const [rejectedDocs, setRejectedDocs] = useState<Map<string, { reason: string; timestamp: string }>>(new Map())
  const [showBulkWarning, setShowBulkWarning] = useState(false)

  /* ── Sidebar resize state ── */
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    e.preventDefault()
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = Math.min(Math.max(ev.clientX - rect.left, 180), 400)
      setSidebarWidth(newWidth)
    }
    const onUp = () => { isDragging.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const selectGroup = useCallback((idx: number) => {
    setSelectedGroupIdx(idx)
    setSelectedSupersededIdx(0)
    setShowOverridePanel(false)
    setShowRejectPanel(false)
    setExpandedGroups(prev => { const next = new Set(prev); next.add(groups[idx]?.formType ?? ''); return next })
  }, [groups])

  const toggleGroup = useCallback((formType: string, idx: number) => {
    setExpandedGroups(prev => { const next = new Set(prev); if (next.has(formType)) next.delete(formType); else next.add(formType); return next })
    setSelectedGroupIdx(idx)
    setSelectedSupersededIdx(0)
    setShowOverridePanel(false)
    setShowRejectPanel(false)
  }, [])

  const rejectedPageIds = useMemo(() => new Set(rejectedDocs.keys()), [rejectedDocs])

  const activeGroup = groups[selectedGroupIdx] ?? null

  // flip-aware original
  const activeFlippedIdx = activeGroup ? flippedGroups.get(activeGroup.formType) : undefined
  const isActiveFlipped = activeFlippedIdx !== undefined && activeGroup
    ? !rejectedDocs.has(String(activeGroup.supersededRecords[activeFlippedIdx]?.engagementPageId))
    : false

  const effectiveOriginal = useMemo(() => {
    if (!activeGroup) return null
    if (isActiveFlipped && activeFlippedIdx !== undefined) {
      const flipped = activeGroup.supersededRecords[activeFlippedIdx]
      if (flipped && !rejectedDocs.has(String(flipped.engagementPageId))) return flipped
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

  const comparedValues = useMemo(() => {
    if (!leftDoc) return []
    return leftDoc.comparedValues ?? []
  }, [leftDoc])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '0.0625rem solid oklch(0.88 0.01 260)', borderRadius: 'var(--radius)', overflow: 'hidden', backgroundColor: 'oklch(1 0 0)' }}>
      {/* ── Top header bar ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', backgroundColor: 'oklch(0.97 0.003 260)', borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.45 0.01 260)' }} />
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>Verify Superseded</h2>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.125rem 0.5rem', borderRadius: '624.9375rem', backgroundColor: 'oklch(0.93 0.005 260)', color: 'oklch(0.4 0.01 260)', fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{data.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Reclassify Dropdown - Single Panel */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                if (!showOverridePanel && activeGroup) {
                  const restored = restoreReclassifyState(activeGroup, overrides, isActiveFlipped, activeFlippedIdx)
                  setDocRoles(restored.roles)
                  setSelectedReason(restored.reasonId)
                  setCustomReason(restored.reasonCustom)
                  setNotSupersededReason(restored.exclIds)
                  setNotSupersededCustom(restored.exclCustom)
                }
                setShowOverridePanel(p => !p)
              }}
              disabled={isGroupRejected || allGroupAccepted}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem', border: '0.0625rem solid oklch(0.82 0.08 60)', borderRadius: '0.25rem',
                backgroundColor: isActiveFlipped ? 'oklch(0.96 0.04 60)' : 'oklch(1 0 0)',
                fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.5 0.16 60)',
                cursor: (isGroupRejected || allGroupAccepted) ? 'not-allowed' : 'pointer',
                opacity: (isGroupRejected || allGroupAccepted) ? 0.5 : 1,
              }}
              aria-expanded={showOverridePanel}
            >
              <ArrowLeftRight style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Reclassify
              <ChevronDown style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
            </button>
