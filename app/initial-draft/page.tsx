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
  ShieldAlert,
  Info,
  Link2,
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
  REVIEW_STATE_CONFIG,
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
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null)

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
    const actionable = documents.filter(d => d.reviewState === 'pending')
    if (documents.length === 0) return 100
    const done = documents.length - actionable.length
    return Math.round((done / documents.length) * 100)
  }, [documents])

  const handleAcceptLinked = useCallback((docId: string, linkedId: string) => {
    // Accept the linked doc classification (keep current original, mark linked as handled)
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          linkedDocs: doc.linkedDocs.map(ld =>
            ld.id === linkedId ? { ...ld, evidence: { ...ld.evidence, confidence: 1 } } : ld
          ),
        }
      }
      return doc
    }))
    setExpandedNotifId(null)
  }, [])

  const handleSwapOriginal = useCallback((docId: string, linkedId: string) => {
    // Swap: the linked doc becomes the original, current doc becomes superseded/duplicate
    // For prototype, just show the action happened
    setExpandedNotifId(null)
  }, [])

  const handleRejectClassification = useCallback((docId: string, linkedId: string) => {
    // Not superseded/duplicate: remove the linked doc
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          linkedDocs: doc.linkedDocs.filter(ld => ld.id !== linkedId),
        }
      }
      return doc
    }))
    setExpandedNotifId(null)
  }, [])

  const handleAcceptClassification = useCallback((docId: string) => {
    setDocuments(prev => prev.map(doc =>
      doc.id === docId ? { ...doc, reviewState: 'accepted' as const } : doc
    ))
  }, [])

  const handleFlagDoc = useCallback((docId: string) => {
    setDocuments(prev => prev.map(doc =>
      doc.id === docId ? { ...doc, reviewState: 'flagged' as const } : doc
    ))
  }, [])

  const highConfCount = useMemo(() => {
    let count = 0
    for (const d of documents) {
      for (const ld of d.linkedDocs) {
        if (ld.evidence.confidence >= 0.9) count++
      }
    }
    return count
  }, [documents])

  const handleAcceptAllHighConf = useCallback(() => {
    // Accept all high confidence linked docs (superseded/duplicate)
    // No-op for now, would mark linkedDocs as accepted
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
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Engagement */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <User className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Engagement Summary</span>
              </div>
              <div className="grid grid-cols-4 gap-x-4 gap-y-1.5">
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
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <FileText className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Documents Summary</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Total', count: summary.total, filter: null },
                  { label: 'Verified', count: summary.verified, filter: 'Verified' },
                  { label: 'Classified', count: summary.classified, filter: null },
                  { label: 'Needs Review', count: summary.needsReview, filter: 'Needs review' },
                ].map(item => {
                  const isActive = item.filter && statusFilter === item.filter
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        if (item.filter) {
                          setStatusFilter(isActive ? 'All' : item.filter)
                        }
                      }}
                      className="rounded-lg border px-3 py-2 text-left transition-all hover:shadow-sm"
                      style={{
                        borderColor: isActive ? 'oklch(0.55 0.15 250)' : 'var(--border)',
                        backgroundColor: isActive ? 'oklch(0.97 0.02 250)' : 'transparent',
                        cursor: item.filter ? 'pointer' : 'default',
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

          {/* Alert banner for items needing attention */}
          {summary.pending > 0 && (
            <div
              className="rounded-lg border px-5 py-3 mb-5 flex items-center gap-3"
              style={{ backgroundColor: 'oklch(0.98 0.02 55)', borderColor: 'oklch(0.90 0.06 55)' }}
            >
              <AlertTriangle className="size-5 shrink-0" style={{ color: 'oklch(0.55 0.16 55)' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {summary.pending} documents need attention
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.superseded > 0 && `${summary.superseded} superseded. `}
                  {summary.duplicate > 0 && `${summary.duplicate} duplicate. `}
                  {summary.needsReview > 0 && `${summary.needsReview} need field review.`}
                </p>
              </div>
              {highConfCount > 0 && (
                <Button
                  size="sm"
                  className="gap-1.5 h-8"
                  style={{ backgroundColor: 'oklch(0.45 0.16 145)', color: 'oklch(0.98 0 0)' }}
                  onClick={handleAcceptAllHighConf}
                >
                  <CheckCircle className="size-3.5" />
                  Accept High Confidence ({highConfCount})
                </Button>
              )}
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
          </div>

          {/* Documents table -- originals only */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border" style={{ backgroundColor: 'oklch(0.98 0 0)' }}>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-10" />
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">Pg</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Form Type</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-36">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">Fields</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-48">Notifications</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map(doc => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    isExpanded={expandedDocId === doc.id}
                    expandedNotifId={expandedNotifId}
                    onToggleExpand={() => setExpandedDocId(prev => prev === doc.id ? null : doc.id)}
                    onToggleNotif={(notifId: string) => {
                      setExpandedDocId(doc.id)
                      setExpandedNotifId(prev => prev === notifId ? null : notifId)
                    }}
                    onAcceptLinked={handleAcceptLinked}
                    onSwapOriginal={handleSwapOriginal}
                    onRejectClassification={handleRejectClassification}
                    onAcceptDoc={handleAcceptClassification}
                    onFlagDoc={handleFlagDoc}
                  />
                ))}
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
    </div>
  )
}

// ── Document Row ──

function DocRow({
  doc,
  isExpanded,
  expandedNotifId,
  onToggleExpand,
  onToggleNotif,
  onAcceptLinked,
  onSwapOriginal,
  onRejectClassification,
  onAcceptDoc,
  onFlagDoc,
}: {
  doc: UnifiedDocument
  isExpanded: boolean
  expandedNotifId: string | null
  onToggleExpand: () => void
  onToggleNotif: (id: string) => void
  onAcceptLinked: (docId: string, linkedId: string) => void
  onSwapOriginal: (docId: string, linkedId: string) => void
  onRejectClassification: (docId: string, linkedId: string) => void
  onAcceptDoc: (docId: string) => void
  onFlagDoc: (docId: string) => void
}) {
  const defaultCfg = { label: 'Unknown', color: 'oklch(0.5 0 0)', bg: 'oklch(0.97 0 0)', border: 'oklch(0.88 0 0)' }
  const rawStatusCfg = doc.status ? STATUS_CONFIG[doc.status] : null
  const statusCfg = rawStatusCfg?.bg ? rawStatusCfg : defaultCfg
  const rawReviewCfg = doc.reviewState ? REVIEW_STATE_CONFIG[doc.reviewState] : null
  const reviewCfg = rawReviewCfg?.bg ? rawReviewCfg : { label: 'Unknown', color: 'oklch(0.5 0 0)', bg: 'oklch(0.97 0 0)' }
  const hasNotifications = doc.linkedDocs.length > 0

  return (
    <>
      {/* Main row */}
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
        {/* Notifications column */}
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          {hasNotifications && (
            <div className="flex flex-col gap-1">
              {doc.linkedDocs.map(ld => {
                const notifCfg = STATUS_CONFIG[ld.type] ?? { label: ld.type, color: 'oklch(0.5 0 0)', bg: 'oklch(0.97 0 0)', border: 'oklch(0.88 0 0)' }
                return (
                  <button
                    key={ld.id}
                    onClick={() => onToggleNotif(ld.id)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all hover:shadow-sm text-left"
                    style={{
                      backgroundColor: notifCfg.bg,
                      color: notifCfg.color,
                      border: `1px solid ${expandedNotifId === ld.id ? notifCfg.color : notifCfg.border}`,
                    }}
                  >
                    <ShieldAlert className="size-3 shrink-0" />
                    <span>1 {notifCfg.label} doc</span>
                    <ChevronDown
                      className={`size-3 transition-transform ${expandedNotifId === ld.id ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>
                )
              })}

            </div>
          )}
        </td>
        {/* Actions column */}
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: reviewCfg.bg, color: reviewCfg.color }}
            >
              {reviewCfg.label}
            </span>
            {doc.reviewState === 'pending' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 h-6 text-[0.625rem] px-2"
                onClick={() => onAcceptDoc(doc.id)}
                style={{ color: 'oklch(0.45 0.16 145)' }}
              >
                <CheckCircle className="size-2.5" />
                Accept
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded section */}
      {isExpanded && (
        <tr className="border-b border-border">
          <td colSpan={8} className="p-0">
            <ExpandedSection
              doc={doc}
              expandedNotifId={expandedNotifId}
              onAcceptLinked={onAcceptLinked}
              onSwapOriginal={onSwapOriginal}
              onRejectClassification={onRejectClassification}
              onAcceptDoc={onAcceptDoc}
              onFlagDoc={onFlagDoc}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Expanded Section (shows notification details or fields) ──

function ExpandedSection({
  doc,
  expandedNotifId,
  onAcceptLinked,
  onSwapOriginal,
  onRejectClassification,
  onAcceptDoc,
  onFlagDoc,
}: {
  doc: UnifiedDocument
  expandedNotifId: string | null
  onAcceptLinked: (docId: string, linkedId: string) => void
  onSwapOriginal: (docId: string, linkedId: string) => void
  onRejectClassification: (docId: string, linkedId: string) => void
  onAcceptDoc: (docId: string) => void
  onFlagDoc: (docId: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'fields'>('details')
  const [fieldSearch, setFieldSearch] = useState('')
  const [fieldTypeFilter, setFieldTypeFilter] = useState('All fields')
  const [showSwapDialog, setShowSwapDialog] = useState<LinkedDocument | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState<LinkedDocument | null>(null)

  // Find which notification is expanded
  const activeLinkedDoc = doc.linkedDocs.find(ld => ld.id === expandedNotifId)

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

  return (
    <div style={{ backgroundColor: 'oklch(0.985 0 0)' }}>
      <div className="flex gap-0 border-t border-border">
        {/* Left panel */}
        <div className="w-[560px] shrink-0 border-r border-border">
          {/* Tabs */}
          <div className="flex items-center border-b border-border px-4 py-2">
            <button
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                color: activeTab === 'details' ? 'oklch(0.25 0.01 260)' : 'oklch(0.55 0 0)',
                borderBottom: activeTab === 'details' ? '2px solid oklch(0.25 0.01 260)' : '2px solid transparent',
              }}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                color: activeTab === 'fields' ? 'oklch(0.25 0.01 260)' : 'oklch(0.55 0 0)',
                borderBottom: activeTab === 'fields' ? '2px solid oklch(0.25 0.01 260)' : '2px solid transparent',
              }}
              onClick={() => setActiveTab('fields')}
            >
              Extracted Fields ({W2_EXTRACTED_FIELDS.length})
            </button>
          </div>

          <div className="max-h-[460px] overflow-y-auto">
            {activeTab === 'details' ? (
              <div className="p-4">
                {/* Linked doc notification detail */}
                {activeLinkedDoc ? (
                  <LinkedDocDetail
                    doc={doc}
                    linkedDoc={activeLinkedDoc}
                    onAccept={() => onAcceptLinked(doc.id, activeLinkedDoc.id)}
                    onSwap={() => setShowSwapDialog(activeLinkedDoc)}
                    onReject={() => setShowRejectDialog(activeLinkedDoc)}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Info className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {doc.linkedDocs.length > 0
                        ? 'Click a notification badge to see details'
                        : 'No superseded or duplicate documents'}
                    </p>
                    {doc.reviewState === 'pending' && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          style={{ backgroundColor: 'oklch(0.45 0.16 145)', color: 'oklch(0.98 0 0)' }}
                          onClick={() => onAcceptDoc(doc.id)}
                        >
                          <CheckCircle className="size-3.5" />
                          Accept Document
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onFlagDoc(doc.id)}>
                          <Flag className="size-3.5" />
                          Flag
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
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
        <div className="flex-1 overflow-hidden p-4 flex items-center justify-center" style={{ backgroundColor: 'oklch(0.96 0 0)', height: '460px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/w2-form-sample.jpg"
            alt={`${doc.formLabel} document preview`}
            style={{ width: 'auto', height: 'auto', maxHeight: '430px', maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Swap Confirmation Dialog */}
      {showSwapDialog && (
        <SwapDialog
          doc={doc}
          linkedDoc={showSwapDialog}
          onConfirm={() => {
            onSwapOriginal(doc.id, showSwapDialog.id)
            setShowSwapDialog(null)
          }}
          onCancel={() => setShowSwapDialog(null)}
        />
      )}

      {/* Reject Confirmation Dialog */}
      {showRejectDialog && (
        <RejectDialog
          linkedDoc={showRejectDialog}
          onConfirm={() => {
            onRejectClassification(doc.id, showRejectDialog.id)
            setShowRejectDialog(null)
          }}
          onCancel={() => setShowRejectDialog(null)}
        />
      )}
    </div>
  )
}

// ── Linked Document Detail (Superseded/Duplicate) ──

function LinkedDocDetail({
  doc,
  linkedDoc,
  onAccept,
  onSwap,
  onReject,
}: {
  doc: UnifiedDocument
  linkedDoc: LinkedDocument
  onAccept: () => void
  onSwap: () => void
  onReject: () => void
}) {
  const notifCfg = STATUS_CONFIG[linkedDoc.type] ?? { label: linkedDoc.type, color: 'oklch(0.5 0 0)', bg: 'oklch(0.97 0 0)', border: 'oklch(0.88 0 0)' }
  const typeLabel = linkedDoc.type === 'superseded' ? 'Superseded' : 'Duplicate'

  return (
    <div>
      {/* Header */}
      <div
        className="rounded-lg border p-3 mb-3"
        style={{ backgroundColor: notifCfg.bg, borderColor: notifCfg.border }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <ShieldAlert className="size-4" style={{ color: notifCfg.color }} />
          <span className="text-sm font-semibold" style={{ color: notifCfg.color }}>
            {typeLabel} Document Detected
          </span>
          <ConfBadge score={linkedDoc.evidence.confidence} />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {linkedDoc.evidence.reason}
        </p>
      </div>

      {/* The superseded/duplicate document info */}
      <div className="rounded-lg border border-border p-3 mb-3" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">{typeLabel} Document</span>
        </div>
        <p className="text-sm font-medium text-foreground">{linkedDoc.formLabel}</p>
        <p className="text-xs text-muted-foreground">Page {linkedDoc.pageNumber} -- {linkedDoc.fileName}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-xs text-muted-foreground">Rule:</span>
          <span className="text-xs font-mono text-foreground">{linkedDoc.evidence.rule}</span>
        </div>
      </div>

      {/* Field comparison */}
      {linkedDoc.evidence.comparedValues.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-foreground mb-2">Field Comparison</p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'oklch(0.97 0 0)' }}>
                  <th className="px-2.5 py-1.5 text-left font-medium text-muted-foreground">Field</th>
                  <th className="px-2.5 py-1.5 text-left font-medium text-muted-foreground">This Document</th>
                  <th className="px-2.5 py-1.5 text-left font-medium text-muted-foreground">{typeLabel} Doc</th>
                  <th className="px-2.5 py-1.5 text-center font-medium text-muted-foreground w-12">Match</th>
                </tr>
              </thead>
              <tbody>
                {linkedDoc.evidence.comparedValues.map((cv, i) => (
                  <tr
                    key={i}
                    className="border-t border-border"
                    style={{ backgroundColor: cv.match ? 'oklch(0.99 0.005 145)' : 'oklch(0.99 0.01 25)' }}
                  >
                    <td className="px-2.5 py-1.5 font-medium text-foreground">{cv.field}</td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">{cv.valueA}</td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">{cv.valueB}</td>
                    <td className="px-2.5 py-1.5 text-center">
                      {cv.match ? (
                        <CheckCircle className="size-3.5 mx-auto" style={{ color: 'oklch(0.45 0.16 145)' }} />
                      ) : (
                        <AlertTriangle className="size-3.5 mx-auto" style={{ color: 'oklch(0.55 0.18 35)' }} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="gap-1.5 flex-1"
          style={{ backgroundColor: 'oklch(0.45 0.16 145)', color: 'oklch(0.98 0 0)' }}
          onClick={onAccept}
        >
          <CheckCircle className="size-3.5" />
          Accept as {typeLabel}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={onSwap}>
          <ArrowRightLeft className="size-3.5" />
          Swap Original
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={onReject}
          style={{ color: 'oklch(0.50 0.18 25)', borderColor: 'oklch(0.85 0.06 25)' }}
        >
          <X className="size-3.5" />
          Not {typeLabel}
        </Button>
      </div>
    </div>
  )
}

// ── Swap Confirmation Dialog ──

function SwapDialog({
  doc,
  linkedDoc,
  onConfirm,
  onCancel,
}: {
  doc: UnifiedDocument
  linkedDoc: LinkedDocument
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Swap Original Document?</DialogTitle>
          <DialogDescription>
            This will make the currently {linkedDoc.type} document the new original, and the current
            original will become {linkedDoc.type}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3">
          <div className="rounded-lg border border-border p-3 mb-2" style={{ backgroundColor: 'oklch(0.98 0.01 25)' }}>
            <p className="text-xs text-muted-foreground mb-0.5">Current original (will become {linkedDoc.type}):</p>
            <p className="text-sm font-medium text-foreground">{doc.formLabel}</p>
            <p className="text-xs text-muted-foreground">Page {doc.pageNumber}</p>
          </div>
          <div className="flex justify-center py-1">
            <ArrowRightLeft className="size-4 text-muted-foreground" />
          </div>
          <div className="rounded-lg border border-border p-3" style={{ backgroundColor: 'oklch(0.98 0.01 145)' }}>
            <p className="text-xs text-muted-foreground mb-0.5">Will become new original:</p>
            <p className="text-sm font-medium text-foreground">{linkedDoc.formLabel}</p>
            <p className="text-xs text-muted-foreground">Page {linkedDoc.pageNumber}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={onConfirm}
            style={{ backgroundColor: 'oklch(0.25 0.01 260)', color: 'oklch(0.98 0 0)' }}
          >
            Yes, Swap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Reject Classification Dialog ──

function RejectDialog({
  linkedDoc,
  onConfirm,
  onCancel,
}: {
  linkedDoc: LinkedDocument
  onConfirm: () => void
  onCancel: () => void
}) {
  const typeLabel = linkedDoc.type === 'superseded' ? 'Superseded' : 'Duplicate'
  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Not {typeLabel}?</DialogTitle>
          <DialogDescription>
            This will remove the {typeLabel.toLowerCase()} classification from &quot;{linkedDoc.formLabel}&quot;.
            The document will be treated as a separate, independent document.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={onConfirm}
            style={{ backgroundColor: 'oklch(0.50 0.18 25)', color: 'oklch(0.98 0 0)' }}
          >
            Yes, Not {typeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Field Card ──

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
      </div>
      <p className="text-xs text-muted-foreground mb-0.5">{field.id}. {field.label}</p>
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

// ── Confidence Badge ──

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
