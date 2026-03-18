'use client'

import Link from 'next/link'
import { useState, useMemo, useCallback } from 'react'
import {
  ArrowLeft,
  Search,
  ChevronRight,
  FileText,
  CheckCircle,
  AlertTriangle,
  User,
  ExternalLink,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  FileStack,
  Copy,
  Link2,
  FileSearch,
  Sparkles,
  ShieldCheck,
  Eye,
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
  UNIFIED_DOCUMENTS,
  getClassificationSummary,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS,
  FILTER_OPTIONS,
  FORM_TYPE_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  type ClassificationType,
  type UnifiedDocument,
} from '@/lib/unified-review-data'
import { ENGAGEMENT_SUMMARY } from '@/lib/initial-draft-data'

// ── Classification icon map ──
const CLASS_ICONS: Record<ClassificationType, typeof FileStack> = {
  superseded: FileStack,
  duplicate: Copy,
  cfa: Link2,
  nfr: FileSearch,
  clean: ShieldCheck,
}

export default function InitialDraftPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState('All')
  const [formTypeFilter, setFormTypeFilter] = useState('All')
  const [reviewStatusFilter, setReviewStatusFilter] = useState('All')
  const [documents, setDocuments] = useState(UNIFIED_DOCUMENTS)

  const summary = useMemo(() => getClassificationSummary(documents), [documents])

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = !searchQuery ||
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.formLabel.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesClass = classFilter === 'All' ||
        doc.classification.type === classFilter.toLowerCase()
      const matchesForm = formTypeFilter === 'All' || doc.formType === formTypeFilter
      const matchesReview = reviewStatusFilter === 'All' ||
        doc.reviewStatus === reviewStatusFilter.toLowerCase()
      return matchesSearch && matchesClass && matchesForm && matchesReview
    })
  }, [documents, searchQuery, classFilter, formTypeFilter, reviewStatusFilter])

  const pendingReviewDocs = useMemo(() => {
    return documents.filter(d =>
      d.reviewStatus === 'pending' && d.classification.type !== 'clean'
    )
  }, [documents])

  const completionPct = useMemo(() => {
    const actionable = documents.filter(d => d.classification.type !== 'clean')
    if (actionable.length === 0) return 100
    const reviewed = actionable.filter(d => d.reviewStatus !== 'pending')
    return Math.round((reviewed.length / actionable.length) * 100)
  }, [documents])

  const handleAcceptAll = useCallback((type: ClassificationType) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.classification.type === type && doc.classification.confidence >= 0.9 && doc.reviewStatus === 'pending') {
        return { ...doc, reviewStatus: 'accepted' as const }
      }
      return doc
    }))
  }, [])

  const handleAcceptDoc = useCallback((docId: string) => {
    setDocuments(prev => prev.map(doc =>
      doc.id === docId ? { ...doc, reviewStatus: 'accepted' as const } : doc
    ))
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              1040SCAN Unified Review
            </h1>
            <p className="text-sm text-muted-foreground">
              Verification + Classification + Review in one view
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress monitor (Easy to Monitor) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {completionPct === 100 ? (
                  <CheckCircle className="size-3.5" style={{ color: 'oklch(0.55 0.17 145)' }} />
                ) : (
                  <AlertTriangle className="size-3.5" style={{ color: 'oklch(0.65 0.18 45)' }} />
                )}
                <span>{completionPct}% Reviewed</span>
              </div>
              <Progress value={completionPct} className="h-2 w-28" />
            </div>
            {/* Submit */}
            <Button
              className="gap-1.5"
              style={{ backgroundColor: 'oklch(0.25 0.01 260)', color: 'oklch(0.98 0 0)' }}
              disabled={completionPct < 100}
            >
              <CheckCircle className="size-3.5" />
              Submit
            </Button>
            {/* Open Review Wizard -- takes you to guided review of pending items */}
            {pendingReviewDocs.length > 0 && (
              <Link
                href="/initial-draft/review"
                className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Eye className="size-4" />
                Open Review Wizard ({pendingReviewDocs.length})
                <ChevronRight className="size-4" />
              </Link>
            )}
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

          {/* Engagement + Classification Summary */}
          <div className="grid grid-cols-6 gap-5 mb-6">
            {/* Engagement Summary (compact) */}
            <div className="col-span-2 rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Engagement</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  { label: 'Tax Year', value: ENGAGEMENT_SUMMARY.taxYear },
                  { label: 'Filing Status', value: ENGAGEMENT_SUMMARY.filingStatus },
                  { label: 'Client #', value: ENGAGEMENT_SUMMARY.clientNumber },
                  { label: 'Software', value: ENGAGEMENT_SUMMARY.taxSoftware },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Classification summary cards (Easy to Monitor) */}
            <div className="col-span-4 rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-4" style={{ color: 'oklch(0.55 0.18 260)' }} />
                <span className="text-sm font-semibold text-foreground">AI Classification Summary</span>
                <span className="ml-auto text-xs text-muted-foreground">{summary.total} documents scanned</span>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {(['superseded', 'duplicate', 'cfa', 'nfr', 'clean'] as const).map(type => {
                  const count = summary[type]
                  const colors = CLASSIFICATION_COLORS[type]
                  const Icon = CLASS_ICONS[type]
                  const highConfCount = documents.filter(d =>
                    d.classification.type === type && d.classification.confidence >= 0.9 && d.reviewStatus === 'pending'
                  ).length

                  return (
                    <button
                      key={type}
                      onClick={() => setClassFilter(classFilter === CLASSIFICATION_LABELS[type] ? 'All' : CLASSIFICATION_LABELS[type])}
                      className="rounded-lg border px-3 py-3 text-left transition-all hover:shadow-sm"
                      style={{
                        borderColor: classFilter.toLowerCase() === type ? colors.border : 'var(--border)',
                        backgroundColor: classFilter.toLowerCase() === type ? colors.bg : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="size-3.5" style={{ color: colors.text }} />
                        <span className="text-xs font-medium" style={{ color: colors.text }}>
                          {CLASSIFICATION_LABELS[type]}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-bold text-foreground">{count}</span>
                        {highConfCount > 0 && type !== 'clean' && (
                          <span className="text-[0.625rem] text-muted-foreground">
                            {highConfCount} auto-eligible
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bulk accept banner for high-confidence items (Easy to Use) */}
          {(() => {
            const autoEligible = documents.filter(d =>
              d.classification.type !== 'clean' &&
              d.classification.confidence >= 0.9 &&
              d.reviewStatus === 'pending'
            )
            if (autoEligible.length === 0) return null

            const byType = autoEligible.reduce<Record<string, number>>((acc, d) => {
              acc[d.classification.type] = (acc[d.classification.type] || 0) + 1
              return acc
            }, {})

            return (
              <div
                className="rounded-lg border px-5 py-3.5 mb-6 flex items-center gap-3"
                style={{
                  backgroundColor: 'oklch(0.97 0.02 250)',
                  borderColor: 'oklch(0.88 0.06 250)',
                }}
              >
                <Sparkles className="size-5 shrink-0" style={{ color: 'oklch(0.5 0.15 250)' }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {autoEligible.length} items eligible for auto-accept (90%+ confidence)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Object.entries(byType).map(([t, c]) => `${c} ${CLASSIFICATION_LABELS[t as ClassificationType]}`).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {Object.keys(byType).map(type => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleAcceptAll(type as ClassificationType)}
                    >
                      <CheckCircle className="size-3" />
                      Accept {CLASSIFICATION_LABELS[type as ClassificationType]}
                    </Button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Items needing manual review banner */}
          {summary.needsReview > 0 && (
            <div
              className="rounded-lg border px-5 py-3.5 mb-6 flex items-start gap-3"
              style={{
                backgroundColor: 'oklch(0.98 0.02 85)',
                borderColor: 'oklch(0.88 0.08 85)',
              }}
            >
              <AlertTriangle className="size-5 mt-0.5 shrink-0" style={{ color: 'oklch(0.6 0.18 60)' }} />
              <div>
                <p className="text-sm font-bold text-foreground">{summary.needsReview} items need manual review</p>
                <p className="text-sm text-muted-foreground">
                  These items have lower confidence or escalation conditions that require human judgment.
                </p>
              </div>
            </div>
          )}

          {/* Document table */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">Documents</h2>

            {/* Filters (Easy to Learn -- consistent with existing filter patterns) */}
            <div className="flex items-end gap-4 mb-4">
              <div className="flex-1 max-w-xs">
                <label className="text-sm font-semibold text-foreground mb-1 block">Search</label>
                <div className="relative">
                  <Input
                    placeholder="Search by name or label"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pr-9"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>
              <div className="w-40">
                <label className="text-sm font-semibold text-foreground mb-1 block">Classification</label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <label className="text-sm font-semibold text-foreground mb-1 block">Form Type</label>
                <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <label className="text-sm font-semibold text-foreground mb-1 block">Review Status</label>
                <Select value={reviewStatusFilter} onValueChange={setReviewStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVIEW_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border" style={{ backgroundColor: 'oklch(0.98 0 0)' }}>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-14">Page</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Document</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Form Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Classification</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Confidence</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Decision</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Review</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map(doc => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      onAccept={handleAcceptDoc}
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
                <Button variant="outline" size="icon" className="size-8" disabled>
                  <ChevronsLeft className="size-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="size-8" disabled>
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="size-8" disabled>
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="size-8" disabled>
                  <ChevronsRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Document Row ──

function DocumentRow({ doc, onAccept }: { doc: UnifiedDocument; onAccept: (id: string) => void }) {
  const colors = CLASSIFICATION_COLORS[doc.classification.type]
  const Icon = CLASS_ICONS[doc.classification.type]
  const conf = doc.classification.confidence
  const confPct = Math.round(conf * 100)

  // Confidence color
  let confBg: string
  let confText: string
  if (conf >= 0.9) {
    confBg = 'oklch(0.97 0.02 145)'
    confText = 'oklch(0.40 0.16 145)'
  } else if (conf >= 0.7) {
    confBg = 'oklch(0.97 0.02 60)'
    confText = 'oklch(0.50 0.16 50)'
  } else {
    confBg = 'oklch(0.97 0.02 25)'
    confText = 'oklch(0.50 0.20 25)'
  }

  // Review status badge
  const reviewConfig: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: 'Pending', bg: 'oklch(0.97 0.02 60)', text: 'oklch(0.50 0.16 50)' },
    accepted: { label: 'Accepted', bg: 'oklch(0.97 0.02 145)', text: 'oklch(0.40 0.16 145)' },
    overridden: { label: 'Overridden', bg: 'oklch(0.95 0.03 250)', text: 'oklch(0.40 0.15 250)' },
    flagged: { label: 'Flagged', bg: 'oklch(0.97 0.02 25)', text: 'oklch(0.50 0.20 25)' },
  }
  const review = reviewConfig[doc.reviewStatus]

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors">
      <td className="px-4 py-3.5 text-sm font-mono text-muted-foreground">{doc.pageNumber}</td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{doc.formLabel}</p>
            <p className="text-xs text-muted-foreground">{doc.fileName}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-sm text-foreground">{doc.formType}</td>
      <td className="px-4 py-3.5">
        <span
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          <Icon className="size-3" />
          {CLASSIFICATION_LABELS[doc.classification.type]}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span
          className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: confBg, color: confText }}
        >
          {confPct}%
        </span>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-xs text-foreground">{doc.classification.decision}</p>
        {doc.classification.type === 'superseded' && doc.classification.retainedPageId && (
          <p className="text-[0.625rem] text-muted-foreground">
            Replaced by page {doc.classification.retainedPageId}
          </p>
        )}
      </td>
      <td className="px-4 py-3.5">
        <span
          className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: review.bg, color: review.text }}
        >
          {review.label}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" asChild>
            <Link href={`/initial-draft/document/${doc.id}`}>
              <ExternalLink className="size-3" />
              View
            </Link>
          </Button>
          {doc.reviewStatus === 'pending' && doc.classification.type !== 'clean' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-7 text-xs"
              onClick={() => onAccept(doc.id)}
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
