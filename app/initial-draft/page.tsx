'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  CheckCircle,
  AlertTriangle,
  User,
  X,
  Flag,
  ArrowRightLeft,
  Info,
  Sparkles,
  Eye,
  Columns2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DOCUMENTS,
  getSummary,
  STATUS_CONFIG,
  FORM_TYPES,
  STATUS_FILTERS,
  type UnifiedDocument,
  type LinkedDocument,
} from '@/lib/unified-review-data'
import {
  ENGAGEMENT_SUMMARY,
  W2_EXTRACTED_FIELDS,
  FIELD_TYPE_OPTIONS,
  type ExtractedField,
} from '@/lib/initial-draft-data'

export default function InitialDraftPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [formTypeFilter, setFormTypeFilter] = useState('All')
  const [documents, setDocuments] = useState(DOCUMENTS)
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)

  // Track which linked docs have been confirmed (accepted/swapped/rejected)
  const [confirmedLinkedDocs, setConfirmedLinkedDocs] = useState<Set<string>>(new Set())

  const summary = useMemo(() => getSummary(documents), [documents])

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = !searchQuery ||
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.formLabel.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesForm = formTypeFilter === 'All' || doc.formType === formTypeFilter

      let matchesStatus = true
      if (statusFilter === 'Has Superseded') {
        matchesStatus = doc.linkedDocs.some(ld => ld.type === 'superseded')
      } else if (statusFilter === 'Has Duplicate') {
        matchesStatus = doc.linkedDocs.some(ld => ld.type === 'duplicate')
      } else if (statusFilter !== 'All') {
        matchesStatus = STATUS_CONFIG[doc.status]?.label === statusFilter
      }

      return matchesSearch && matchesStatus && matchesForm
    })
  }, [documents, searchQuery, statusFilter, formTypeFilter])

  const completionPct = useMemo(() => {
    const total = documents.length + documents.reduce((sum, d) => sum + d.linkedDocs.length, 0)
    const confirmed = confirmedLinkedDocs.size
    if (total === 0) return 100
    return Math.round((confirmed / total) * 100)
  }, [documents, confirmedLinkedDocs])

  // Handlers for linked doc actions
  const handleAcceptLinked = useCallback((docId: string, linkedId: string) => {
    setConfirmedLinkedDocs(prev => new Set([...prev, linkedId]))
  }, [])

  const handleSwapLinked = useCallback((docId: string, linkedId: string) => {
    // Swap roles: the linked doc becomes original, original becomes superseded/duplicate
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        const linkedDoc = doc.linkedDocs.find(ld => ld.id === linkedId)
        if (!linkedDoc) return doc
        // For now, just mark as confirmed with swapped indicator
        return { ...doc, reviewState: 'accepted' as const }
      }
      return doc
    }))
    setConfirmedLinkedDocs(prev => new Set([...prev, linkedId]))
  }, [])

  const handleRejectLinked = useCallback((docId: string, linkedId: string) => {
    // Mark as "not superseded/duplicate" - remove from linked docs
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          linkedDocs: doc.linkedDocs.filter(ld => ld.id !== linkedId),
        }
      }
      return doc
    }))
    setConfirmedLinkedDocs(prev => new Set([...prev, linkedId]))
  }, [])

  // Dialog states
  const [showSwapDialog, setShowSwapDialog] = useState<LinkedDocument | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState<LinkedDocument | null>(null)
  const [swapDocId, setSwapDocId] = useState<string | null>(null)
  const [rejectDocId, setRejectDocId] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'oklch(0.985 0.002 260)' }}>
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Initial Draft Review</h1>
              <p className="text-sm text-muted-foreground">
                {ENGAGEMENT_SUMMARY.clientName} &middot; {ENGAGEMENT_SUMMARY.taxYear}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <Progress value={completionPct} className="w-32 h-2" />
              <span className="text-sm font-medium text-foreground">{completionPct}%</span>
            </div>
            <Button variant="outline" size="sm">
              Save Draft
            </Button>
            <Button size="sm" style={{ backgroundColor: 'oklch(0.55 0.22 25)', color: 'white' }}>
              Complete Review
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="flex items-center gap-3">
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="Verified" value={summary.verified} color="green" />
          <SummaryCard label="Needs Review" value={summary.needsReview} color="amber" />
          <SummaryCard label="Superseded" value={summary.superseded} color="purple" />
          <SummaryCard label="Duplicate" value={summary.duplicate} color="blue" />
        </div>

        {/* Alert banner */}
        {(summary.superseded > 0 || summary.duplicate > 0 || summary.needsReview > 0) && (
          <div
            className="mt-4 flex items-start gap-3 rounded-lg border px-4 py-3"
            style={{ backgroundColor: 'oklch(0.98 0.02 60)', borderColor: 'oklch(0.90 0.06 60)' }}
          >
            <AlertTriangle className="size-5 shrink-0 mt-0.5" style={{ color: 'oklch(0.65 0.18 60)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'oklch(0.35 0.10 60)' }}>
                Documents need your attention
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.superseded > 0 && `${summary.superseded} superseded. `}
                {summary.duplicate > 0 && `${summary.duplicate} duplicate. `}
                {summary.needsReview > 0 && `${summary.needsReview} need field review.`}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Filters */}
      <div className="border-b border-border bg-card px-6 py-3 flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Form Type" />
          </SelectTrigger>
          <SelectContent>
            {FORM_TYPES.map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          Showing {filteredDocs.length} of {documents.length} documents
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border" style={{ backgroundColor: 'oklch(0.97 0.003 260)' }}>
                <th className="px-3 py-3 w-10"></th>
                <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">Pg</th>
                <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Form Type</th>
                <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36">Status</th>
                <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">Fields</th>
                <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">Notifications</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  isExpanded={expandedDocId === doc.id}
                  onToggleExpand={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                  confirmedLinkedDocs={confirmedLinkedDocs}
                  onAcceptLinked={(linkedId) => handleAcceptLinked(doc.id, linkedId)}
                  onSwapLinked={(linkedId) => {
                    setSwapDocId(doc.id)
                    setShowSwapDialog(doc.linkedDocs.find(ld => ld.id === linkedId) ?? null)
                  }}
                  onRejectLinked={(linkedId) => {
                    setRejectDocId(doc.id)
                    setShowRejectDialog(doc.linkedDocs.find(ld => ld.id === linkedId) ?? null)
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Swap Confirmation Dialog */}
      <Dialog open={!!showSwapDialog} onOpenChange={() => setShowSwapDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Swap Original and {showSwapDialog?.type === 'superseded' ? 'Superseded' : 'Duplicate'}?</DialogTitle>
            <DialogDescription>
              This will make the {showSwapDialog?.type} document (Page {showSwapDialog?.pageNumber}) the new Original,
              and the current Original will become {showSwapDialog?.type}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSwapDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (swapDocId && showSwapDialog) {
                  handleSwapLinked(swapDocId, showSwapDialog.id)
                }
                setShowSwapDialog(null)
              }}
              style={{ backgroundColor: 'oklch(0.50 0.16 60)', color: 'white' }}
            >
              Confirm Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={!!showRejectDialog} onOpenChange={() => setShowRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Not {showRejectDialog?.type === 'superseded' ? 'Superseded' : 'Duplicate'}?</DialogTitle>
            <DialogDescription>
              This document (Page {showRejectDialog?.pageNumber}) will be treated as an independent document,
              not related to the current Original.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectDocId && showRejectDialog) {
                  handleRejectLinked(rejectDocId, showRejectDialog.id)
                }
                setShowRejectDialog(null)
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Summary Card ──

function SummaryCard({ label, value, color }: { label: string; value: number; color?: 'green' | 'amber' | 'purple' | 'blue' }) {
  const colors = {
    green: { bg: 'oklch(0.96 0.03 145)', text: 'oklch(0.40 0.16 145)', border: 'oklch(0.88 0.06 145)' },
    amber: { bg: 'oklch(0.97 0.03 60)', text: 'oklch(0.50 0.16 60)', border: 'oklch(0.90 0.06 60)' },
    purple: { bg: 'oklch(0.96 0.03 290)', text: 'oklch(0.45 0.16 290)', border: 'oklch(0.88 0.06 290)' },
    blue: { bg: 'oklch(0.96 0.03 250)', text: 'oklch(0.45 0.14 250)', border: 'oklch(0.88 0.06 250)' },
  }
  const c = color ? colors[color] : { bg: 'oklch(0.97 0.003 260)', text: 'oklch(0.35 0.01 260)', border: 'oklch(0.90 0.005 260)' }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg border"
      style={{ backgroundColor: c.bg, borderColor: c.border }}
    >
      <span className="text-lg font-bold" style={{ color: c.text }}>{value}</span>
      <span className="text-xs font-medium" style={{ color: c.text }}>{label}</span>
    </div>
  )
}

// ── Document Row with Inline Expand ──

function DocRow({
  doc,
  isExpanded,
  onToggleExpand,
  confirmedLinkedDocs,
  onAcceptLinked,
  onSwapLinked,
  onRejectLinked,
}: {
  doc: UnifiedDocument
  isExpanded: boolean
  onToggleExpand: () => void
  confirmedLinkedDocs: Set<string>
  onAcceptLinked: (linkedId: string) => void
  onSwapLinked: (linkedId: string) => void
  onRejectLinked: (linkedId: string) => void
}) {
  const defaultCfg = { label: 'Unknown', color: 'oklch(0.5 0 0)', bg: 'oklch(0.97 0 0)', border: 'oklch(0.88 0 0)' }
  const rawStatusCfg = doc.status ? STATUS_CONFIG[doc.status] : null
  const statusCfg = rawStatusCfg?.bg ? rawStatusCfg : defaultCfg
  const hasNotifications = doc.linkedDocs.length > 0

  // Count unconfirmed linked docs
  const unconfirmedCount = doc.linkedDocs.filter(ld => !confirmedLinkedDocs.has(ld.id)).length

  return (
    <>
      {/* Main row - clicking anywhere expands */}
      <tr
        className={`transition-colors cursor-pointer hover:bg-accent/30 border-b border-border ${isExpanded ? 'bg-accent/20' : ''}`}
        onClick={onToggleExpand}
      >
        <td className="px-3 py-3">
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
          />
        </td>
        <td className="px-3 py-3 text-sm font-mono text-muted-foreground">{doc.pageNumber}</td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{doc.formLabel}</p>
              <p className="text-xs text-muted-foreground">{doc.fileName}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-sm text-foreground">{doc.formType}</td>
        <td className="px-3 py-3">
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
          >
            {statusCfg.label}
          </span>
        </td>
        <td className="px-3 py-3 text-sm text-foreground">{doc.fieldsToReview}</td>
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          {hasNotifications ? (
            <button
              onClick={onToggleExpand}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all hover:shadow-sm"
              style={{
                backgroundColor: unconfirmedCount > 0 ? 'oklch(0.96 0.03 290)' : 'oklch(0.96 0.03 145)',
                color: unconfirmedCount > 0 ? 'oklch(0.45 0.16 290)' : 'oklch(0.40 0.16 145)',
                border: `1px solid ${unconfirmedCount > 0 ? 'oklch(0.88 0.06 290)' : 'oklch(0.88 0.06 145)'}`,
              }}
            >
              <Info className="size-3 shrink-0" />
              <span>
                {doc.linkedDocs.length} {doc.linkedDocs[0]?.type === 'superseded' ? 'Superseded' : 'Duplicate'} doc
                {unconfirmedCount > 0 && <span className="ml-1 opacity-70">({unconfirmedCount} pending)</span>}
              </span>
              <ChevronRight className={`size-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">--</span>
          )}
        </td>
      </tr>

      {/* Expanded detail panel */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <ExpandedDocDetail
              doc={doc}
              confirmedLinkedDocs={confirmedLinkedDocs}
              onAcceptLinked={onAcceptLinked}
              onSwapLinked={onSwapLinked}
              onRejectLinked={onRejectLinked}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Expanded Document Detail Panel ──

function ExpandedDocDetail({
  doc,
  confirmedLinkedDocs,
  onAcceptLinked,
  onSwapLinked,
  onRejectLinked,
}: {
  doc: UnifiedDocument
  confirmedLinkedDocs: Set<string>
  onAcceptLinked: (linkedId: string) => void
  onSwapLinked: (linkedId: string) => void
  onRejectLinked: (linkedId: string) => void
}) {
  const [selectedLinkedIdx, setSelectedLinkedIdx] = useState(0)
  const [showExtractedFields, setShowExtractedFields] = useState(false)

  const hasLinkedDocs = doc.linkedDocs.length > 0
  const selectedLinked = doc.linkedDocs[selectedLinkedIdx]
  const isSelectedConfirmed = selectedLinked ? confirmedLinkedDocs.has(selectedLinked.id) : false

  // All linked docs confirmed?
  const allConfirmed = doc.linkedDocs.every(ld => confirmedLinkedDocs.has(ld.id))

  return (
    <div className="border-t-2" style={{ borderColor: 'oklch(0.85 0.08 250)', backgroundColor: 'oklch(0.99 0.002 260)' }}>
      {hasLinkedDocs ? (
        <div className="flex">
          {/* Left: Classification detail */}
          <div className="flex-1 p-5 border-r border-border" style={{ maxWidth: '55%' }}>
            {/* Linked doc tabs if multiple */}
            {doc.linkedDocs.length > 1 && (
              <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: 'oklch(0.96 0.005 260)' }}>
                {doc.linkedDocs.map((ld, idx) => {
                  const isConfirmed = confirmedLinkedDocs.has(ld.id)
                  return (
                    <button
                      key={ld.id}
                      onClick={() => setSelectedLinkedIdx(idx)}
                      className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${idx === selectedLinkedIdx ? 'bg-card shadow-sm' : 'hover:bg-card/50'}`}
                      style={{
                        color: idx === selectedLinkedIdx ? 'oklch(0.25 0.01 260)' : 'oklch(0.5 0.01 260)',
                      }}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {isConfirmed && <CheckCircle className="size-3" style={{ color: 'oklch(0.45 0.16 145)' }} />}
                        <span>Page {ld.pageNumber}</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                          style={{
                            backgroundColor: ld.type === 'superseded' ? 'oklch(0.94 0.04 290)' : 'oklch(0.94 0.04 250)',
                            color: ld.type === 'superseded' ? 'oklch(0.45 0.16 290)' : 'oklch(0.45 0.14 250)',
                          }}
                        >
                          {ld.type}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedLinked && (
              <>
                {/* Status badge */}
                {isSelectedConfirmed ? (
                  <div
                    className="flex items-center gap-2 rounded-lg border px-4 py-3 mb-4"
                    style={{ backgroundColor: 'oklch(0.96 0.03 145)', borderColor: 'oklch(0.88 0.06 145)' }}
                  >
                    <CheckCircle className="size-5" style={{ color: 'oklch(0.45 0.16 145)' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'oklch(0.35 0.14 145)' }}>Classification Confirmed</p>
                      <p className="text-xs" style={{ color: 'oklch(0.45 0.10 145)' }}>
                        Page {selectedLinked.pageNumber} is marked as {selectedLinked.type}.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 rounded-lg border px-4 py-3 mb-4"
                    style={{ backgroundColor: 'oklch(0.97 0.03 60)', borderColor: 'oklch(0.90 0.06 60)' }}
                  >
                    <AlertTriangle className="size-5" style={{ color: 'oklch(0.60 0.18 60)' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'oklch(0.40 0.14 60)' }}>Needs Confirmation</p>
                      <p className="text-xs" style={{ color: 'oklch(0.50 0.10 60)' }}>
                        Review the AI reasoning below and confirm or change the classification.
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Reasoning Section */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="size-4" style={{ color: 'oklch(0.55 0.16 290)' }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.45 0.01 260)' }}>
                      AI Analysis
                    </span>
                    <ConfBadge score={selectedLinked.evidence.confidence} />
                  </div>
                  <div className="rounded-lg border p-4" style={{ backgroundColor: 'oklch(0.98 0.005 260)', borderColor: 'oklch(0.92 0.005 260)' }}>
                    <p className="text-sm text-foreground leading-relaxed">{selectedLinked.evidence.reason}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Rule:</span>
                      <span className="font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'oklch(0.94 0.005 260)' }}>
                        {selectedLinked.evidence.rule}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Field Comparison Section */}
                {selectedLinked.evidence.comparedValues.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Columns2 className="size-4" style={{ color: 'oklch(0.50 0.14 250)' }} />
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.45 0.01 260)' }}>
                        Field Comparison
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedLinked.evidence.comparedValues.filter(v => v.match).length} of {selectedLinked.evidence.comparedValues.length} match
                      </span>
                    </div>
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'oklch(0.92 0.005 260)' }}>
                      <div className="grid grid-cols-4 gap-px text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: 'oklch(0.96 0.005 260)' }}>
                        <div className="px-3 py-2" style={{ color: 'oklch(0.50 0.01 260)' }}>Field</div>
                        <div className="px-3 py-2" style={{ color: 'oklch(0.50 0.16 290)' }}>
                          {selectedLinked.type === 'superseded' ? 'Superseded' : 'Duplicate'}
                        </div>
                        <div className="px-3 py-2" style={{ color: 'oklch(0.45 0.16 145)' }}>Original</div>
                        <div className="px-3 py-2" style={{ color: 'oklch(0.50 0.01 260)' }}>Match</div>
                      </div>
                      <div className="divide-y" style={{ divideColor: 'oklch(0.94 0.005 260)' }}>
                        {selectedLinked.evidence.comparedValues.map((cv, i) => (
                          <div key={i} className="grid grid-cols-4 gap-px text-xs" style={{ backgroundColor: 'oklch(1 0 0)' }}>
                            <div className="px-3 py-2 font-medium text-foreground truncate">{cv.field}</div>
                            <div className="px-3 py-2 text-muted-foreground truncate font-mono text-[11px]">{cv.valueA}</div>
                            <div className="px-3 py-2 text-muted-foreground truncate font-mono text-[11px]">{cv.valueB}</div>
                            <div className="px-3 py-2">
                              {cv.match ? (
                                <CheckCircle className="size-4" style={{ color: 'oklch(0.50 0.16 145)' }} />
                              ) : (
                                <AlertTriangle className="size-4" style={{ color: 'oklch(0.60 0.18 60)' }} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {!isSelectedConfirmed && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 flex-1"
                      style={{ backgroundColor: 'oklch(0.45 0.16 145)', color: 'white' }}
                      onClick={() => onAcceptLinked(selectedLinked.id)}
                    >
                      <CheckCircle className="size-4" />
                      Accept as {selectedLinked.type === 'superseded' ? 'Superseded' : 'Duplicate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => onSwapLinked(selectedLinked.id)}
                    >
                      <ArrowRightLeft className="size-4" />
                      Swap
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      style={{ borderColor: 'oklch(0.85 0.08 25)', color: 'oklch(0.50 0.18 25)' }}
                      onClick={() => onRejectLinked(selectedLinked.id)}
                    >
                      <X className="size-4" />
                      Not {selectedLinked.type === 'superseded' ? 'Superseded' : 'Duplicate'}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Show Extracted Fields button - only after all confirmed */}
            {allConfirmed && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setShowExtractedFields(!showExtractedFields)}
                >
                  <Eye className="size-4" />
                  {showExtractedFields ? 'Hide' : 'View'} Extracted Fields
                  <ChevronDown className={`size-4 transition-transform ${showExtractedFields ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            )}
          </div>

          {/* Right: Document preview */}
          <div className="flex-1 p-4" style={{ backgroundColor: 'oklch(0.96 0 0)', maxWidth: '45%' }}>
            <div className="flex items-center justify-center h-full min-h-[400px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/w2-form-sample.jpg"
                alt={`${doc.formLabel} document preview`}
                style={{ width: 'auto', height: 'auto', maxHeight: '380px', maxWidth: '100%', objectFit: 'contain' }}
                className="rounded border border-border shadow-sm"
              />
            </div>
          </div>
        </div>
      ) : (
        /* No linked docs - show extracted fields directly */
        <div className="p-5">
          <ExtractedFieldsPanel doc={doc} />
        </div>
      )}

      {/* Extracted Fields panel - shown after confirmation */}
      {hasLinkedDocs && allConfirmed && showExtractedFields && (
        <div className="border-t border-border p-5" style={{ backgroundColor: 'oklch(0.99 0.002 260)' }}>
          <ExtractedFieldsPanel doc={doc} />
        </div>
      )}
    </div>
  )
}

// ── Confidence Badge ──

function ConfBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const label = pct >= 90 ? 'High' : pct >= 70 ? 'Moderate' : 'Low'
  const color = pct >= 90 ? 'oklch(0.45 0.16 145)' : pct >= 70 ? 'oklch(0.55 0.16 60)' : 'oklch(0.55 0.18 25)'
  const bg = pct >= 90 ? 'oklch(0.94 0.04 145)' : pct >= 70 ? 'oklch(0.95 0.04 60)' : 'oklch(0.95 0.04 25)'

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      {label} ({pct}%)
    </span>
  )
}

// ── Extracted Fields Panel ──

function ExtractedFieldsPanel({ doc }: { doc: UnifiedDocument }) {
  const [fieldSearch, setFieldSearch] = useState('')
  const [fieldTypeFilter, setFieldTypeFilter] = useState('All')

  const fields = W2_EXTRACTED_FIELDS
  const filteredFields = useMemo(() => {
    return fields.filter(f => {
      const matchesSearch = !fieldSearch || f.label.toLowerCase().includes(fieldSearch.toLowerCase())
      const matchesType = fieldTypeFilter === 'All' || f.fieldType === fieldTypeFilter
      return matchesSearch && matchesType
    })
  }, [fields, fieldSearch, fieldTypeFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="size-4" style={{ color: 'oklch(0.50 0.14 250)' }} />
          <span className="text-sm font-semibold text-foreground">Extracted Fields</span>
          <span className="text-xs text-muted-foreground">({fields.length} fields)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              className="pl-8 h-8 text-xs w-40"
              value={fieldSearch}
              onChange={e => setFieldSearch(e.target.value)}
            />
          </div>
          <Select value={fieldTypeFilter} onValueChange={setFieldTypeFilter}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPE_OPTIONS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {filteredFields.map(field => (
          <FieldCard key={field.id} field={field} />
        ))}
      </div>
    </div>
  )
}

// ── Field Card ──

function FieldCard({ field }: { field: ExtractedField }) {
  const typeColors: Record<string, { bg: string; color: string }> = {
    Mandatory: { bg: 'oklch(0.94 0.04 250)', color: 'oklch(0.45 0.14 250)' },
    Proforma: { bg: 'oklch(0.94 0.04 290)', color: 'oklch(0.45 0.14 290)' },
    Optional: { bg: 'oklch(0.95 0.02 260)', color: 'oklch(0.50 0.01 260)' },
  }
  const tc = typeColors[field.fieldType] ?? typeColors.Optional

  return (
    <div className="rounded-lg border border-border p-3" style={{ backgroundColor: 'oklch(1 0 0)' }}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-xs text-muted-foreground">{field.id}. {field.label}</p>
        <span
          className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase"
          style={{ backgroundColor: tc.bg, color: tc.color }}
        >
          {field.fieldType}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground truncate">{field.value || '--'}</p>
      {field.confidence !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'oklch(0.92 0.005 260)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${field.confidence * 100}%`,
                backgroundColor: field.confidence >= 0.9 ? 'oklch(0.55 0.16 145)' : field.confidence >= 0.7 ? 'oklch(0.60 0.16 60)' : 'oklch(0.55 0.18 25)',
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{Math.round(field.confidence * 100)}%</span>
        </div>
      )}
    </div>
  )
}
