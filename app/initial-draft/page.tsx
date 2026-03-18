'use client'

import { useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
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
  Eye,
  X,
  Link2,
  ArrowRightLeft,
  Flag,
  RotateCcw,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  getGroupedDocs,
  STATUS_CONFIG,
  REVIEW_STATE_CONFIG,
  FORM_TYPES,
  STATUS_FILTERS,
  REVIEW_FILTERS,
  type UnifiedDocument,
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
  const [reviewFilter, setReviewFilter] = useState('All')
  const [documents, setDocuments] = useState(DOCUMENTS)
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)

  const summary = useMemo(() => getSummary(documents), [documents])

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = !searchQuery ||
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.formLabel.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'All' ||
        STATUS_CONFIG[doc.status].label === statusFilter
      const matchesForm = formTypeFilter === 'All' || doc.formType === formTypeFilter
      const matchesReview = reviewFilter === 'All' ||
        doc.reviewState === reviewFilter.toLowerCase()
      return matchesSearch && matchesStatus && matchesForm && matchesReview
    })
  }, [documents, searchQuery, statusFilter, formTypeFilter, reviewFilter])

  const groupedDocs = useMemo(() => getGroupedDocs(filteredDocs), [filteredDocs])

  const pendingDocs = useMemo(() => {
    return documents.filter(d => d.reviewState === 'pending' && d.status !== 'verified')
  }, [documents])

  const completionPct = useMemo(() => {
    const actionable = documents.filter(d => d.status !== 'verified')
    if (actionable.length === 0) return 100
    const done = actionable.filter(d => d.reviewState !== 'pending')
    return Math.round((done.length / actionable.length) * 100)
  }, [documents])

  const handleUpdateDoc = useCallback((docId: string, newState: 'accepted' | 'overridden' | 'flagged') => {
    setDocuments(prev => prev.map(doc =>
      doc.id === docId ? { ...doc, reviewState: newState } : doc
    ))
  }, [])

  const handleAcceptHighConfidence = useCallback(() => {
    setDocuments(prev => prev.map(doc => {
      if (doc.reviewState === 'pending' && doc.evidence && doc.evidence.confidence >= 0.9) {
        return { ...doc, reviewState: 'accepted' as const }
      }
      return doc
    }))
  }, [])

  const highConfCount = useMemo(() => {
    return documents.filter(d =>
      d.reviewState === 'pending' && d.evidence && d.evidence.confidence >= 0.9
    ).length
  }, [documents])

  const toggleExpand = useCallback((docId: string) => {
    setExpandedDocId(prev => prev === docId ? null : docId)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              1040SCAN Quick Validation Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Automated Tax Processing Platform
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {completionPct === 100 ? (
                  <CheckCircle className="size-3.5" style={{ color: 'oklch(0.55 0.17 145)' }} />
                ) : (
                  <AlertTriangle className="size-3.5" style={{ color: 'oklch(0.65 0.18 45)' }} />
                )}
                <span>{completionPct}% Complete</span>
              </div>
              <Progress value={completionPct} className="h-2 w-28" />
            </div>
            <Button
              className="gap-1.5"
              style={{ backgroundColor: 'oklch(0.25 0.01 260)', color: 'oklch(0.98 0 0)' }}
              disabled={completionPct < 100}
            >
              <CheckCircle className="size-3.5" />
              Submit
            </Button>
            {pendingDocs.length > 0 && (
              <button
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:underline"
                style={{ color: 'oklch(0.40 0.15 250)' }}
              >
                Open Review Wizard
                <ChevronRight className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5"
          >
            <ArrowLeft className="size-3.5" />
            Back to Home
          </Link>

          {/* Summary row */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {/* Engagement */}
            <div className="col-span-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <User className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Engagement Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  { label: 'Tax Year', value: ENGAGEMENT_SUMMARY.taxYear },
                  { label: 'Client #', value: ENGAGEMENT_SUMMARY.clientNumber },
                  { label: 'Filing', value: ENGAGEMENT_SUMMARY.filingStatus },
                  { label: 'Software', value: ENGAGEMENT_SUMMARY.taxSoftware },
                ].map(item => (
                  <div key={item.label} className="flex items-baseline gap-1.5">
                    <span className="text-xs text-muted-foreground">{item.label}:</span>
                    <span className="text-sm font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents Summary */}
            <div className="col-span-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <FileText className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Documents Summary</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Total', count: summary.total, filterStatus: null },
                  { label: 'Verified', count: summary.verified, filterStatus: 'Verified' },
                  { label: 'Classified', count: summary.superseded + summary.duplicate + summary.cfa + summary.nfr, filterStatus: null },
                  { label: 'Needs Review', count: summary.needsReview, filterStatus: 'Needs review' },
                  { label: 'Pending', count: summary.pending, filterStatus: null },
                ].map(item => {
                  const isActive = item.filterStatus && statusFilter === item.filterStatus
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        if (item.filterStatus) {
                          setStatusFilter(isActive ? 'All' : item.filterStatus)
                        }
                      }}
                      className="rounded-lg border px-3 py-2 text-left transition-all hover:shadow-sm"
                      style={{
                        borderColor: isActive ? 'oklch(0.55 0.15 250)' : 'var(--border)',
                        backgroundColor: isActive ? 'oklch(0.97 0.02 250)' : 'transparent',
                        cursor: item.filterStatus ? 'pointer' : 'default',
                      }}
                    >
                      <span className="text-[0.625rem] text-muted-foreground uppercase tracking-wider">{item.label}</span>
                      <span className="block text-lg font-bold text-foreground">{item.count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bulk accept */}
          {highConfCount > 0 && (
            <div
              className="rounded-lg border px-5 py-3 mb-5 flex items-center gap-3"
              style={{ backgroundColor: 'oklch(0.97 0.02 145)', borderColor: 'oklch(0.88 0.06 145)' }}
            >
              <CheckCircle className="size-5 shrink-0" style={{ color: 'oklch(0.45 0.16 145)' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {highConfCount} items have 90%+ confidence
                </p>
                <p className="text-xs text-muted-foreground">
                  Accept all high-confidence classifications at once
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5 h-8"
                style={{ backgroundColor: 'oklch(0.45 0.16 145)', color: 'oklch(0.98 0 0)' }}
                onClick={handleAcceptHighConfidence}
              >
                <CheckCircle className="size-3.5" />
                Accept All ({highConfCount})
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-end gap-4 mb-4">
            <div className="flex-1 max-w-xs">
              <label className="text-sm font-medium text-foreground mb-1 block">Search</label>
              <div className="relative">
                <Input
                  placeholder="Search by document name"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
            </div>
            <div className="w-44">
              <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <label className="text-sm font-medium text-foreground mb-1 block">Form Type</label>
              <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORM_TYPES.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <label className="text-sm font-medium text-foreground mb-1 block">Review</label>
              <Select value={reviewFilter} onValueChange={setReviewFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REVIEW_FILTERS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Documents table with inline expand and pair grouping */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border" style={{ backgroundColor: 'oklch(0.98 0 0)' }}>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-10" />
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">Pg</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Form Type</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Paired With</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">Fields</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedDocs.map((entry, idx) => {
                  if (Array.isArray(entry)) {
                    // Paired group
                    return (
                      <PairedGroup
                        key={`pair-${idx}`}
                        docs={entry}
                        expandedDocId={expandedDocId}
                        onToggleExpand={toggleExpand}
                        onUpdateDoc={handleUpdateDoc}
                        allDocs={documents}
                      />
                    )
                  }
                  // Single doc
                  return (
                    <DocRow
                      key={entry.id}
                      doc={entry}
                      isExpanded={expandedDocId === entry.id}
                      onToggleExpand={() => toggleExpand(entry.id)}
                      onUpdateDoc={handleUpdateDoc}
                      allDocs={documents}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing <strong className="text-foreground">{filteredDocs.length}</strong> of{' '}
              <strong className="text-foreground">{documents.length}</strong> documents
            </p>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground mr-2">Page 1 of 1</span>
              <Button variant="outline" size="icon" className="size-8" disabled><ChevronsLeft className="size-3.5" /></Button>
              <Button variant="outline" size="icon" className="size-8" disabled><ChevronLeft className="size-3.5" /></Button>
              <Button variant="outline" size="icon" className="size-8" disabled><ChevronRight className="size-3.5" /></Button>
              <Button variant="outline" size="icon" className="size-8" disabled><ChevronsRight className="size-3.5" /></Button>
            </div>
          </div>
        </div>
      </main>

      {/* Review Wizard Sheet */}
      <ReviewWizardSheet
        open={showWizard}
        onOpenChange={setShowWizard}
        documents={pendingDocs}
        onUpdateDoc={handleUpdateDoc}
      />
    </div>
  )
}

// ── Paired Group (visually connected rows) ──

function PairedGroup({
  docs,
  expandedDocId,
  onToggleExpand,
  onUpdateDoc,
  allDocs,
}: {
  docs: UnifiedDocument[]
  expandedDocId: string | null
  onToggleExpand: (id: string) => void
  onUpdateDoc: (id: string, state: 'accepted' | 'overridden' | 'flagged') => void
  allDocs: UnifiedDocument[]
}) {
  return (
    <>
      {docs.map((doc, i) => (
        <DocRow
          key={doc.id}
          doc={doc}
          isExpanded={expandedDocId === doc.id}
          onToggleExpand={() => onToggleExpand(doc.id)}
          onUpdateDoc={onUpdateDoc}
          allDocs={allDocs}
          isPaired
          isFirstInPair={i === 0}
          isLastInPair={i === docs.length - 1}
        />
      ))}
    </>
  )
}

// ── Document Row with inline expand ──

function DocRow({
  doc,
  isExpanded,
  onToggleExpand,
  onUpdateDoc,
  allDocs,
  isPaired = false,
  isFirstInPair = false,
  isLastInPair = false,
}: {
  doc: UnifiedDocument
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdateDoc: (id: string, state: 'accepted' | 'overridden' | 'flagged') => void
  allDocs: UnifiedDocument[]
  isPaired?: boolean
  isFirstInPair?: boolean
  isLastInPair?: boolean
}) {
  const statusCfg = STATUS_CONFIG[doc.status]
  const reviewCfg = REVIEW_STATE_CONFIG[doc.reviewState]

  // Pair band color
  const pairBandColor = isPaired
    ? doc.status === 'superseded' || doc.pair?.role === 'retained'
      ? 'oklch(0.65 0.15 290)' // purple for superseded pairs
      : 'oklch(0.55 0.15 250)' // blue for duplicate pairs
    : 'transparent'

  return (
    <>
      {/* Main row */}
      <tr
        className={`transition-colors cursor-pointer hover:bg-accent/30 ${
          isExpanded ? 'bg-accent/20' : ''
        } ${isPaired && !isLastInPair ? 'border-b-0' : 'border-b border-border'} ${isPaired && isLastInPair ? 'border-b-2' : ''}`}
        onClick={onToggleExpand}
        style={isPaired && isLastInPair ? { borderBottomColor: pairBandColor } : undefined}
      >
        {/* Expand chevron */}
        <td className="px-3 py-3">
          <div className="flex items-center">
            {isPaired && (
              <div
                className="w-0.5 self-stretch mr-2 rounded-full"
                style={{ backgroundColor: pairBandColor, minHeight: '24px' }}
              />
            )}
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
            />
          </div>
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
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
            >
              {statusCfg.label}
            </span>
            {doc.evidence && doc.evidence.confidence > 0 && (
              <ConfBadge score={doc.evidence.confidence} />
            )}
          </div>
        </td>
        {/* Paired With column */}
        <td className="px-3 py-3">
          {doc.pair && (
            <div className="flex items-center gap-1.5">
              <Link2 className="size-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                Pg {doc.pair.pairedPage}
              </span>
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[0.5625rem] font-medium uppercase"
                style={{
                  backgroundColor: doc.pair.role === 'superseded' || doc.pair.role === 'duplicate'
                    ? 'oklch(0.97 0.02 25)' : 'oklch(0.97 0.02 145)',
                  color: doc.pair.role === 'superseded' || doc.pair.role === 'duplicate'
                    ? 'oklch(0.50 0.18 25)' : 'oklch(0.40 0.16 145)',
                }}
              >
                {doc.pair.role}
              </span>
            </div>
          )}
        </td>
        <td className="px-3 py-3 text-sm text-foreground">{doc.fieldsToReview}</td>
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: reviewCfg.bg, color: reviewCfg.color }}
            >
              {reviewCfg.label}
            </span>
            {doc.reviewState === 'pending' && doc.status !== 'verified' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 h-6 text-[0.625rem] px-2"
                onClick={() => onUpdateDoc(doc.id, 'accepted')}
                style={{ color: 'oklch(0.45 0.16 145)' }}
              >
                <CheckCircle className="size-2.5" />
                Accept
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr className="border-b border-border">
          <td colSpan={8} className="p-0">
            <ExpandedDetail
              doc={doc}
              allDocs={allDocs}
              onUpdateDoc={onUpdateDoc}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Expanded inline detail ──

function ExpandedDetail({
  doc,
  allDocs,
  onUpdateDoc,
}: {
  doc: UnifiedDocument
  allDocs: UnifiedDocument[]
  onUpdateDoc: (id: string, state: 'accepted' | 'overridden' | 'flagged') => void
}) {
  const [activeTab, setActiveTab] = useState<'classification' | 'fields'>(
    doc.evidence ? 'classification' : 'fields'
  )
  const [showOverride, setShowOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [fieldSearch, setFieldSearch] = useState('')
  const [fieldTypeFilter, setFieldTypeFilter] = useState('All fields')
  const statusCfg = STATUS_CONFIG[doc.status]

  const pairedDoc = doc.pair ? allDocs.find(d => d.id === doc.pair!.pairedDocId) : null

  const filteredFields = useMemo(() => {
    return W2_EXTRACTED_FIELDS.filter(field => {
      const matchesSearch = !fieldSearch || field.label.toLowerCase().includes(fieldSearch.toLowerCase())
      let matchesType = true
      if (fieldTypeFilter !== 'All fields') {
        const filterMap: Record<string, string> = {
          'Uncertain Fields': 'uncertain',
          'Mandatory Fields': 'mandatory',
          'Proforma Fields': 'proforma',
          'Missing Fields': 'missing',
          'Fully Confident Fields': 'fully-confident',
        }
        matchesType = field.status === filterMap[fieldTypeFilter]
      }
      return matchesSearch && matchesType
    })
  }, [fieldSearch, fieldTypeFilter])

  const confirmOverride = () => {
    onUpdateDoc(doc.id, 'overridden')
    setShowOverride(false)
    setOverrideReason('')
  }

  return (
    <div style={{ backgroundColor: 'oklch(0.985 0 0)' }}>
      <div className="flex gap-0 border-t border-border">
        {/* Left panel: tabs */}
        <div className="w-[520px] shrink-0 border-r border-border">
          {/* Tab row + Actions */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <div className="flex gap-0">
              {doc.evidence && (
                <button
                  className="px-3 py-1.5 text-xs font-medium rounded-t transition-colors"
                  style={{
                    color: activeTab === 'classification' ? 'oklch(0.25 0.01 260)' : 'oklch(0.55 0 0)',
                    borderBottom: activeTab === 'classification' ? '2px solid oklch(0.25 0.01 260)' : '2px solid transparent',
                  }}
                  onClick={() => setActiveTab('classification')}
                >
                  Classification
                </button>
              )}
              <button
                className="px-3 py-1.5 text-xs font-medium rounded-t transition-colors"
                style={{
                  color: activeTab === 'fields' ? 'oklch(0.25 0.01 260)' : 'oklch(0.55 0 0)',
                  borderBottom: activeTab === 'fields' ? '2px solid oklch(0.25 0.01 260)' : '2px solid transparent',
                }}
                onClick={() => setActiveTab('fields')}
              >
                Extracted Fields ({W2_EXTRACTED_FIELDS.length})
              </button>
            </div>

            {/* Inline actions */}
            {doc.reviewState === 'pending' && doc.status !== 'verified' && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  className="gap-1 h-7 text-xs"
                  style={{ backgroundColor: 'oklch(0.45 0.16 145)', color: 'oklch(0.98 0 0)' }}
                  onClick={() => onUpdateDoc(doc.id, 'accepted')}
                >
                  <CheckCircle className="size-3" />
                  Accept
                </Button>
                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowOverride(true)}>
                  <RotateCcw className="size-3" />
                  Override
                </Button>
                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => onUpdateDoc(doc.id, 'flagged')}>
                  <Flag className="size-3" />
                  Flag
                </Button>
              </div>
            )}
          </div>

          {/* Tab content */}
          <div className="max-h-[400px] overflow-y-auto">
            {activeTab === 'classification' && doc.evidence ? (
              <div className="p-4">
                {/* Decision + Rule */}
                <div className="rounded-lg border border-border p-3 mb-3" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">Decision:</span>
                    <span
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
                    >
                      {statusCfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">Rule:</span>
                    <span className="text-xs font-mono text-foreground">{doc.evidence.rule}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{doc.evidence.reason}</p>
                </div>

                {/* Paired document card */}
                {pairedDoc && (
                  <div
                    className="rounded-lg border px-3 py-2.5 mb-3 flex items-center gap-3"
                    style={{ borderColor: 'oklch(0.85 0.06 250)', backgroundColor: 'oklch(0.97 0.01 250)' }}
                  >
                    <ArrowRightLeft className="size-4 shrink-0" style={{ color: 'oklch(0.45 0.15 250)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{pairedDoc.formLabel}</p>
                      <p className="text-[0.625rem] text-muted-foreground">
                        Page {pairedDoc.pageNumber} -- {doc.pair?.role === 'superseded' ? 'Retained (Original)' : doc.pair?.role === 'duplicate' ? 'Original' : doc.pair?.role}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-[0.625rem] font-medium"
                      style={{
                        backgroundColor: STATUS_CONFIG[pairedDoc.status].bg,
                        color: STATUS_CONFIG[pairedDoc.status].color,
                        border: `1px solid ${STATUS_CONFIG[pairedDoc.status].border}`,
                      }}
                    >
                      {STATUS_CONFIG[pairedDoc.status].label}
                    </span>
                  </div>
                )}

                {/* CFA parent */}
                {doc.evidence.parentFormLabel && (
                  <div
                    className="rounded-lg border px-3 py-2.5 mb-3 flex items-center gap-3"
                    style={{ borderColor: 'oklch(0.85 0.06 165)', backgroundColor: 'oklch(0.97 0.01 165)' }}
                  >
                    <Link2 className="size-4 shrink-0" style={{ color: 'oklch(0.40 0.17 165)' }} />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">Parent: {doc.evidence.parentFormLabel}</p>
                      {doc.evidence.isAddForm && (
                        <p className="text-[0.625rem]" style={{ color: 'oklch(0.50 0.16 50)' }}>AddForm required</p>
                      )}
                    </div>
                  </div>
                )}

                {/* NFR mapping */}
                {doc.evidence.sourceMapping && (
                  <div
                    className="rounded-lg border px-3 py-2.5 mb-3"
                    style={{ borderColor: 'oklch(0.88 0.06 60)', backgroundColor: 'oklch(0.98 0.01 60)' }}
                  >
                    <p className="text-xs text-muted-foreground">
                      Source: <span className="font-medium text-foreground">{doc.evidence.sourceMapping}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Return: <span className="font-medium text-foreground">{doc.evidence.returnMapping}</span>
                    </p>
                  </div>
                )}

                {/* Field comparison */}
                {doc.evidence.comparedValues.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Field Comparison</p>
                    <div className="flex flex-col gap-1">
                      {doc.evidence.comparedValues.map((cv, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs"
                          style={{ backgroundColor: cv.match ? 'oklch(0.98 0.01 145)' : 'oklch(0.98 0.02 25)' }}
                        >
                          <span style={{ color: cv.match ? 'oklch(0.45 0.16 145)' : 'oklch(0.50 0.20 25)' }}>
                            {cv.match ? <CheckCircle className="size-3" /> : <AlertTriangle className="size-3" />}
                          </span>
                          <span className="font-medium text-foreground w-28 shrink-0 truncate">{cv.field}</span>
                          <span className="text-muted-foreground flex-1 truncate">{cv.valueA}</span>
                          {!cv.match && (
                            <>
                              <span className="text-muted-foreground/50 shrink-0">vs</span>
                              <span className="text-muted-foreground flex-1 truncate">{cv.valueB}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
                {/* Field search + filter */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Search fields"
                      value={fieldSearch}
                      onChange={e => setFieldSearch(e.target.value)}
                      className="pr-9 h-8 text-xs"
                    />
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  </div>
                  <Select value={fieldTypeFilter} onValueChange={setFieldTypeFilter}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  {filteredFields.map(field => (
                    <FieldCard key={field.id} field={field} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Document preview */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-4" style={{ backgroundColor: 'oklch(0.96 0 0)', maxHeight: '440px' }}>
          <Image
            src="/images/w2-form-sample.jpg"
            alt={`${doc.formLabel} document preview`}
            width={800}
            height={1035}
            className="max-h-[400px] w-auto h-auto object-contain"
          />
        </div>
      </div>

      {/* Override Dialog */}
      <Dialog open={showOverride} onOpenChange={setShowOverride}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Override Classification</DialogTitle>
            <DialogDescription>
              Override &quot;{statusCfg.label}&quot; for {doc.formLabel}. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Reason</label>
            <Input
              placeholder="e.g., Different account, not a duplicate"
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverride(false)}>Cancel</Button>
            <Button
              onClick={confirmOverride}
              disabled={!overrideReason.trim()}
              style={{ backgroundColor: 'oklch(0.25 0.01 260)', color: 'oklch(0.98 0 0)' }}
            >
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Field Card (compact for inline view) ──

function FieldCard({ field }: { field: ExtractedField }) {
  const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    mandatory:         { label: 'Mandatory',  bg: 'oklch(0.97 0.02 60)',  text: 'oklch(0.5 0.16 50)',  border: 'oklch(0.88 0.08 60)' },
    proforma:          { label: 'Proforma',   bg: 'oklch(0.96 0.02 250)', text: 'oklch(0.5 0.14 250)', border: 'oklch(0.88 0.06 250)' },
    uncertain:         { label: 'Uncertain',  bg: 'oklch(0.96 0 0)',      text: 'oklch(0.45 0 0)',     border: 'oklch(0.88 0 0)' },
    missing:           { label: 'Missing',    bg: 'oklch(0.97 0.02 25)',  text: 'oklch(0.5 0.2 25)',   border: 'oklch(0.88 0.08 25)' },
    'fully-confident': { label: 'Confident',  bg: 'oklch(0.97 0.02 145)', text: 'oklch(0.45 0.16 145)', border: 'oklch(0.88 0.08 145)' },
  }
  const config = statusConfig[field.status]

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[0.5625rem] font-medium"
            style={{ backgroundColor: config.bg, color: config.text, border: `1px solid ${config.border}` }}
          >
            {config.label}
          </span>
          <span className="text-[0.5625rem] text-muted-foreground">{field.source}</span>
        </div>
        {field.hasOverride && (
          <span className="text-[0.5625rem] text-muted-foreground flex items-center gap-0.5">
            <RotateCcw className="size-2.5" />
            Overriding
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-0.5">{field.order}. {field.label}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground">
          {field.value || <span className="text-muted-foreground">$</span>}
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <X className="size-3" />
        </button>
      </div>
    </div>
  )
}

// ── Review Wizard Sheet ──

function ReviewWizardSheet({
  open,
  onOpenChange,
  documents,
  onUpdateDoc,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  documents: UnifiedDocument[]
  onUpdateDoc: (id: string, state: 'accepted' | 'overridden' | 'flagged') => void
}) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showOverride, setShowOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  const doc = documents[currentIdx]
  if (!doc) return null

  const statusCfg = STATUS_CONFIG[doc.status]
  const reviewed = documents.filter(d => d.reviewState !== 'pending').length
  const progressPct = documents.length > 0 ? Math.round((reviewed / documents.length) * 100) : 0

  const goNext = () => { if (currentIdx < documents.length - 1) setCurrentIdx(i => i + 1) }
  const goPrev = () => { if (currentIdx > 0) setCurrentIdx(i => i - 1) }

  const handleAccept = () => { onUpdateDoc(doc.id, 'accepted'); goNext() }
  const handleFlag = () => { onUpdateDoc(doc.id, 'flagged'); goNext() }
  const confirmOverride = () => {
    onUpdateDoc(doc.id, 'overridden')
    setShowOverride(false)
    setOverrideReason('')
    goNext()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[540px] sm:max-w-[540px] p-0 flex flex-col [&>button]:hidden">
          <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-bold">Review Wizard</SheetTitle>
              <button onClick={() => onOpenChange(false)} className="rounded-md p-1 hover:bg-accent" aria-label="Close wizard">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Progress value={progressPct} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground shrink-0">
                {currentIdx + 1} / {documents.length}
              </span>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
                >
                  {statusCfg.label}
                </span>
                {doc.evidence && <ConfBadge score={doc.evidence.confidence} />}
              </div>
              <h3 className="text-lg font-bold text-foreground">{doc.formLabel}</h3>
              <p className="text-sm text-muted-foreground">Page {doc.pageNumber} -- {doc.fileName}</p>
            </div>

            {doc.evidence && (
              <div className="rounded-lg border border-border p-4 mb-4" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Rule:</span>
                  <span className="text-xs font-mono text-foreground">{doc.evidence.rule}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{doc.evidence.reason}</p>
                {doc.evidence.comparedValues.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Evidence</p>
                    <div className="flex flex-col gap-1">
                      {doc.evidence.comparedValues.map((cv, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded px-2 py-1.5 text-xs"
                          style={{ backgroundColor: cv.match ? 'oklch(0.98 0.01 145)' : 'oklch(0.98 0.02 25)' }}
                        >
                          <span style={{ color: cv.match ? 'oklch(0.45 0.16 145)' : 'oklch(0.50 0.20 25)' }}>
                            {cv.match ? <CheckCircle className="size-3" /> : <AlertTriangle className="size-3" />}
                          </span>
                          <span className="font-medium text-foreground w-32 shrink-0 truncate">{cv.field}</span>
                          <span className="text-muted-foreground truncate flex-1">{cv.valueA}</span>
                          {!cv.match && (
                            <>
                              <span className="text-muted-foreground/50">vs</span>
                              <span className="text-muted-foreground truncate flex-1">{cv.valueB}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {doc.pair && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Paired with Page {doc.pair.pairedPage} ({doc.pair.pairedLabel})
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border px-5 py-4 shrink-0">
            {doc.reviewState === 'pending' ? (
              <div className="flex flex-col gap-2.5">
                <Button
                  className="w-full gap-1.5"
                  style={{ backgroundColor: 'oklch(0.45 0.16 145)', color: 'oklch(0.98 0 0)' }}
                  onClick={handleAccept}
                >
                  <CheckCircle className="size-4" />
                  Accept
                </Button>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button variant="outline" className="gap-1.5" onClick={() => setShowOverride(true)}>
                    Override
                  </Button>
                  <Button variant="outline" className="gap-1.5" onClick={handleFlag}>
                    Flag for Later
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <span
                  className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: REVIEW_STATE_CONFIG[doc.reviewState].bg,
                    color: REVIEW_STATE_CONFIG[doc.reviewState].color,
                  }}
                >
                  {REVIEW_STATE_CONFIG[doc.reviewState].label}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" className="gap-1" disabled={currentIdx === 0} onClick={goPrev}>
                <ChevronLeft className="size-4" /> Previous
              </Button>
              <Button variant="ghost" size="sm" className="gap-1" disabled={currentIdx === documents.length - 1} onClick={goNext}>
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showOverride} onOpenChange={setShowOverride}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Override Classification</DialogTitle>
            <DialogDescription>
              Override &quot;{statusCfg.label}&quot; for {doc.formLabel}. Please explain why.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Reason</label>
            <Input
              placeholder="e.g., Different account, not a duplicate"
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverride(false)}>Cancel</Button>
            <Button
              onClick={confirmOverride}
              disabled={!overrideReason.trim()}
              style={{ backgroundColor: 'oklch(0.25 0.01 260)', color: 'oklch(0.98 0 0)' }}
            >
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Confidence badge ──

function ConfBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const bg = score >= 0.9 ? 'oklch(0.97 0.02 145)' : score >= 0.7 ? 'oklch(0.97 0.02 60)' : 'oklch(0.97 0.02 25)'
  const color = score >= 0.9 ? 'oklch(0.40 0.16 145)' : score >= 0.7 ? 'oklch(0.50 0.16 50)' : 'oklch(0.50 0.20 25)'
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[0.625rem] font-medium" style={{ backgroundColor: bg, color }}>
      {pct}%
    </span>
  )
}
