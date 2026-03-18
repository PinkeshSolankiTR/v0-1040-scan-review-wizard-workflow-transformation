'use client'

import Link from 'next/link'
import { useState, useMemo, useCallback } from 'react'
import {
  ArrowLeft,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  User,
  Eye,
  X,
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
  STATUS_CONFIG,
  REVIEW_STATE_CONFIG,
  FORM_TYPES,
  STATUS_FILTERS,
  REVIEW_FILTERS,
  type UnifiedDocument,
  type DocStatus,
} from '@/lib/unified-review-data'
import { ENGAGEMENT_SUMMARY } from '@/lib/initial-draft-data'

export default function InitialDraftPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [formTypeFilter, setFormTypeFilter] = useState('All')
  const [reviewFilter, setReviewFilter] = useState('All')
  const [documents, setDocuments] = useState(DOCUMENTS)
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

  const pendingDocs = useMemo(() => {
    return documents.filter(d => d.reviewState === 'pending' && d.status !== 'verified')
  }, [documents])

  const completionPct = useMemo(() => {
    const actionable = documents.filter(d => d.status !== 'verified')
    if (actionable.length === 0) return 100
    const done = actionable.filter(d => d.reviewState !== 'pending')
    return Math.round((done.length / actionable.length) * 100)
  }, [documents])

  const handleAcceptDoc = useCallback((docId: string) => {
    setDocuments(prev => prev.map(doc =>
      doc.id === docId ? { ...doc, reviewState: 'accepted' as const } : doc
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

  // Count high-confidence pending items
  const highConfCount = useMemo(() => {
    return documents.filter(d =>
      d.reviewState === 'pending' && d.evidence && d.evidence.confidence >= 0.9
    ).length
  }, [documents])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header -- matches Figma F1 layout */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Initial Draft - Verification
            </h1>
            <p className="text-sm text-muted-foreground">
              Review extracted fields and AI classifications
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress (Easy to Monitor) */}
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
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5"
          >
            <ArrowLeft className="size-3.5" />
            Back to Home
          </Link>

          {/* Summary row -- engagement left, status counts right */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {/* Engagement (compact) */}
            <div className="col-span-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <User className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Engagement</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  { label: 'Tax Year', value: ENGAGEMENT_SUMMARY.taxYear },
                  { label: 'Filing', value: ENGAGEMENT_SUMMARY.filingStatus },
                  { label: 'Client #', value: ENGAGEMENT_SUMMARY.clientNumber },
                  { label: 'Software', value: ENGAGEMENT_SUMMARY.taxSoftware },
                ].map(item => (
                  <div key={item.label} className="flex items-baseline gap-1.5">
                    <span className="text-xs text-muted-foreground">{item.label}:</span>
                    <span className="text-sm font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Document count cards -- these ARE the filter (Easy to Use + Easy to Monitor) */}
            <div className="col-span-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-semibold text-foreground">Documents ({summary.total})</span>
                {pendingDocs.length > 0 && (
                  <button
                    onClick={() => setShowWizard(true)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                    style={{ color: 'oklch(0.40 0.15 250)' }}
                  >
                    <Eye className="size-3.5" />
                    Review Wizard ({pendingDocs.length})
                    <ChevronRight className="size-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { label: 'Verified', count: summary.verified, status: 'verified' as const },
                  { label: 'Classified', count: summary.superseded + summary.duplicate + summary.cfa + summary.nfr, status: null },
                  { label: 'Needs Review', count: summary.needsReview, status: 'needs-review' as const },
                  { label: 'Pending', count: summary.pending, status: null },
                ].map(item => {
                  const isActive = item.status && statusFilter === STATUS_CONFIG[item.status]?.label
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        if (item.status) {
                          setStatusFilter(isActive ? 'All' : STATUS_CONFIG[item.status].label)
                        }
                      }}
                      className="rounded-lg border px-3 py-2.5 text-left transition-all hover:shadow-sm"
                      style={{
                        borderColor: isActive ? 'oklch(0.55 0.15 250)' : 'var(--border)',
                        backgroundColor: isActive ? 'oklch(0.97 0.02 250)' : 'transparent',
                      }}
                    >
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="block text-lg font-bold text-foreground">{item.count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bulk accept banner (Easy to Use) */}
          {highConfCount > 0 && (
            <div
              className="rounded-lg border px-5 py-3 mb-5 flex items-center gap-3"
              style={{ backgroundColor: 'oklch(0.97 0.02 145)', borderColor: 'oklch(0.88 0.06 145)' }}
            >
              <CheckCircle className="size-5 shrink-0" style={{ color: 'oklch(0.45 0.16 145)' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {highConfCount} items have 90%+ AI confidence
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

          {/* Filters -- matches Figma F1 filter row */}
          <div className="flex items-end gap-4 mb-4">
            <div className="flex-1 max-w-xs">
              <label className="text-sm font-medium text-foreground mb-1 block">Search</label>
              <div className="relative">
                <Input
                  placeholder="Search documents..."
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

          {/* Table -- same structure as Figma F1 but Status column now includes classification */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border" style={{ backgroundColor: 'oklch(0.98 0 0)' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-14">Pg</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Form Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Fields</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Review</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map(doc => (
                  <DocRow key={doc.id} doc={doc} onAccept={handleAcceptDoc} />
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

      {/* Review Wizard slide-over (Easy to Use -- no page navigation) */}
      <ReviewWizardSheet
        open={showWizard}
        onOpenChange={setShowWizard}
        documents={pendingDocs}
        onUpdateDoc={(docId, newState) => {
          setDocuments(prev => prev.map(d =>
            d.id === docId ? { ...d, reviewState: newState } : d
          ))
        }}
      />
    </div>
  )
}

// ── Document Row ──

function DocRow({ doc, onAccept }: { doc: UnifiedDocument; onAccept: (id: string) => void }) {
  const statusCfg = STATUS_CONFIG[doc.status]
  const reviewCfg = REVIEW_STATE_CONFIG[doc.reviewState]

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors">
      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{doc.pageNumber}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{doc.formLabel}</p>
            <p className="text-xs text-muted-foreground">{doc.fileName}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-foreground">{doc.formType}</td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
        >
          {statusCfg.label}
        </span>
        {doc.evidence && doc.evidence.confidence > 0 && (
          <span className="block text-[0.625rem] text-muted-foreground mt-0.5">
            {Math.round(doc.evidence.confidence * 100)}% confidence
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">{doc.fieldsToReview}</td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: reviewCfg.bg, color: reviewCfg.color }}
        >
          {reviewCfg.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" asChild>
            <Link href={`/initial-draft/document/${doc.id}`}>
              <ExternalLink className="size-3" />
              View
            </Link>
          </Button>
          {doc.reviewState === 'pending' && doc.status !== 'verified' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-7 text-xs"
              onClick={() => onAccept(doc.id)}
              style={{ color: 'oklch(0.45 0.16 145)' }}
            >
              <CheckCircle className="size-3" />
              Accept
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Review Wizard Sheet (slide-over modal) ──

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
          {/* Header */}
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

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {/* Document header */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
                >
                  {statusCfg.label}
                </span>
                {doc.evidence && (
                  <ConfBadge score={doc.evidence.confidence} />
                )}
              </div>
              <h3 className="text-lg font-bold text-foreground">{doc.formLabel}</h3>
              <p className="text-sm text-muted-foreground">Page {doc.pageNumber} -- {doc.fileName}</p>
            </div>

            {/* Evidence (if classification) */}
            {doc.evidence && (
              <div className="rounded-lg border border-border p-4 mb-4" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Rule:</span>
                  <span className="text-xs font-mono text-foreground">{doc.evidence.rule}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{doc.evidence.reason}</p>

                {/* Compared values */}
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

                {/* Context links */}
                {doc.evidence.retainedPageId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Superseded by Page {doc.evidence.retainedPageId}
                  </p>
                )}
                {doc.evidence.parentFormLabel && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Parent: {doc.evidence.parentFormLabel}
                    {doc.evidence.isAddForm && <span className="ml-1" style={{ color: 'oklch(0.50 0.16 50)' }}>(AddForm)</span>}
                  </p>
                )}
                {doc.evidence.sourceMapping && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {doc.evidence.sourceMapping} {'-->'} {doc.evidence.returnMapping}
                  </p>
                )}
              </div>
            )}

            {/* Quick link to full detail */}
            <Button variant="outline" size="sm" className="gap-1.5 w-full mb-4" asChild>
              <Link href={`/initial-draft/document/${doc.id}`}>
                <ExternalLink className="size-3.5" />
                Open Full Document View
              </Link>
            </Button>
          </div>

          {/* Actions footer (Easy to Use -- always visible, clear choices) */}
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

            {/* Nav */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" className="gap-1" disabled={currentIdx === 0} onClick={goPrev}>
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button variant="ghost" size="sm" className="gap-1" disabled={currentIdx === documents.length - 1} onClick={goNext}>
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Override modal */}
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

// ── Small confidence badge ──

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
