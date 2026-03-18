'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { use } from 'react'
import {
  ArrowLeft,
  Search,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  Maximize2,
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flag,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  STATUS_CONFIG,
  REVIEW_STATE_CONFIG,
  type UnifiedDocument,
} from '@/lib/unified-review-data'
import {
  FIELD_TYPE_OPTIONS,
  W2_EXTRACTED_FIELDS,
  type ExtractedField,
} from '@/lib/initial-draft-data'

type Tab = 'fields' | 'classification'

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const doc = DOCUMENTS.find(d => d.id === id) ?? DOCUMENTS[0]

  // Tab state -- show Classification tab only if evidence exists
  const hasEvidence = doc.evidence !== null
  const [activeTab, setActiveTab] = useState<Tab>(hasEvidence ? 'classification' : 'fields')

  // Fields state
  const [fieldSearch, setFieldSearch] = useState('')
  const [fieldTypeFilter, setFieldTypeFilter] = useState('All fields')

  // Viewer state
  const [zoom, setZoom] = useState(100)

  // Review state
  const [reviewState, setReviewState] = useState(doc.reviewState)
  const [showOverride, setShowOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

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

  const handleAccept = () => setReviewState('accepted')
  const handleFlag = () => setReviewState('flagged')
  const confirmOverride = () => {
    setReviewState('overridden')
    setShowOverride(false)
    setOverrideReason('')
  }
  const handleUndo = () => setReviewState('pending')

  const statusCfg = STATUS_CONFIG[doc.status]
  const reviewCfg = REVIEW_STATE_CONFIG[reviewState]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Back nav */}
      <div className="px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <Link
            href="/initial-draft"
            className="inline-flex items-center gap-1.5 text-sm hover:underline"
            style={{ color: 'oklch(0.5 0.15 250)' }}
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </Link>
          <span className="text-sm text-muted-foreground">
            Document {DOCUMENTS.indexOf(doc) + 1} of {DOCUMENTS.length}
          </span>
        </div>
      </div>

      {/* Document title + status + actions */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-foreground">{doc.formLabel}</h1>
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
              >
                {statusCfg.label}
              </span>
              {doc.evidence && (
                <span
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-[0.625rem] font-medium"
                  style={{
                    backgroundColor: doc.evidence.confidence >= 0.9 ? 'oklch(0.97 0.02 145)' : doc.evidence.confidence >= 0.7 ? 'oklch(0.97 0.02 60)' : 'oklch(0.97 0.02 25)',
                    color: doc.evidence.confidence >= 0.9 ? 'oklch(0.40 0.16 145)' : doc.evidence.confidence >= 0.7 ? 'oklch(0.50 0.16 50)' : 'oklch(0.50 0.20 25)',
                  }}
                >
                  {Math.round(doc.evidence.confidence * 100)}%
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Page {doc.pageNumber} -- {doc.fileName}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: reviewCfg.bg, color: reviewCfg.color }}
            >
              {reviewCfg.label}
            </span>
            {reviewState === 'pending' && doc.status !== 'verified' && (
              <>
                <Button
                  size="sm"
                  className="gap-1.5 h-8"
                  style={{ backgroundColor: 'oklch(0.45 0.16 145)', color: 'oklch(0.98 0 0)' }}
                  onClick={handleAccept}
                >
                  <CheckCircle className="size-3.5" />
                  Accept
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setShowOverride(true)}>
                  <RotateCcw className="size-3.5" />
                  Override
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleFlag}>
                  <Flag className="size-3.5" />
                  Flag
                </Button>
              </>
            )}
            {reviewState !== 'pending' && (
              <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleUndo}>
                <RotateCcw className="size-3.5" />
                Undo
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main content: split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel with TABS (Easy to Learn -- one thing at a time) */}
        <div className="w-[480px] shrink-0 border-r border-border flex flex-col bg-card">
          {/* Tab row */}
          <div className="flex border-b border-border shrink-0">
            <button
              className="flex-1 px-4 py-3 text-sm font-medium text-center transition-colors"
              style={{
                color: activeTab === 'fields' ? 'oklch(0.25 0.01 260)' : 'oklch(0.5 0.01 260)',
                borderBottom: activeTab === 'fields' ? '2px solid oklch(0.25 0.01 260)' : '2px solid transparent',
                backgroundColor: activeTab === 'fields' ? 'oklch(0.98 0 0)' : 'transparent',
              }}
              onClick={() => setActiveTab('fields')}
            >
              Extracted Fields ({W2_EXTRACTED_FIELDS.length})
            </button>
            {hasEvidence && (
              <button
                className="flex-1 px-4 py-3 text-sm font-medium text-center transition-colors"
                style={{
                  color: activeTab === 'classification' ? 'oklch(0.25 0.01 260)' : 'oklch(0.5 0.01 260)',
                  borderBottom: activeTab === 'classification' ? '2px solid oklch(0.25 0.01 260)' : '2px solid transparent',
                  backgroundColor: activeTab === 'classification' ? 'oklch(0.98 0 0)' : 'transparent',
                }}
                onClick={() => setActiveTab('classification')}
              >
                Classification
              </button>
            )}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'fields' ? (
              <FieldsPanel
                fields={filteredFields}
                search={fieldSearch}
                onSearchChange={setFieldSearch}
                typeFilter={fieldTypeFilter}
                onTypeFilterChange={setFieldTypeFilter}
              />
            ) : (
              <ClassificationPanel doc={doc} />
            )}
          </div>
        </div>

        {/* Right panel: Document viewer -- matches Figma F2 */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Search document</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(zoom)} onValueChange={v => setZoom(Number(v))}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="75">75%</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                  <SelectItem value="125">125%</SelectItem>
                  <SelectItem value="150">150%</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setZoom(z => Math.min(z + 25, 200))}><ZoomIn className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setZoom(z => Math.max(z - 25, 25))}><ZoomOut className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="size-8"><Download className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="size-8"><Printer className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="size-8"><Maximize2 className="size-4" /></Button>
            </div>
          </div>

          {/* Document image */}
          <div className="flex-1 overflow-auto p-6 flex items-start justify-center" style={{ backgroundColor: 'oklch(0.96 0 0)' }}>
            <div className="bg-card shadow-lg rounded border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/w2-form-sample.jpg"
                alt={`${doc.formLabel} document`}
                style={{ width: `${8 * zoom}px`, height: 'auto' }}
                className="rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Override modal */}
      <Dialog open={showOverride} onOpenChange={setShowOverride}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Override Classification</DialogTitle>
            <DialogDescription>
              Override &quot;{statusCfg.label}&quot; for this document. Please provide a reason.
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

// ── Extracted Fields Panel ──

function FieldsPanel({
  fields,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
}: {
  fields: ExtractedField[]
  search: string
  onSearchChange: (v: string) => void
  typeFilter: string
  onTypeFilterChange: (v: string) => void
}) {
  return (
    <div className="p-5">
      {/* Search + filter -- matches Figma F2 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search fields"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pr-9"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        </div>
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FIELD_TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Field cards -- matches Figma F2 */}
      <div className="flex flex-col gap-3">
        {fields.map(field => (
          <FieldCard key={field.id} field={field} />
        ))}
      </div>
    </div>
  )
}

// ── Classification Panel ──

function ClassificationPanel({ doc }: { doc: UnifiedDocument }) {
  const evidence = doc.evidence
  if (!evidence) return null

  const statusCfg = STATUS_CONFIG[doc.status]

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof evidence.comparedValues> = {}
    for (const cv of evidence.comparedValues) {
      const cat = cv.category || 'General'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(cv)
    }
    return groups
  }, [evidence.comparedValues])

  return (
    <div className="p-5">
      {/* Decision + Rule */}
      <div className="rounded-lg border border-border p-4 mb-4" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-medium text-muted-foreground">Decision:</span>
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
          >
            {statusCfg.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-muted-foreground">Rule:</span>
          <span className="text-xs font-mono text-foreground">{evidence.rule}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{evidence.reason}</p>
      </div>

      {/* Context-specific info */}
      {evidence.originalPageId && (
        <div className="rounded-lg border border-border px-4 py-3 mb-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Original Page:</span>
          <Link
            href={`/initial-draft/document/page-${evidence.originalPageId}`}
            className="text-xs font-medium text-foreground hover:underline"
          >
            Page {evidence.originalPageId}
          </Link>
        </div>
      )}
      {evidence.parentFormLabel && (
        <div className="rounded-lg border border-border px-4 py-3 mb-4">
          <span className="text-xs text-muted-foreground">Parent: </span>
          <span className="text-xs font-medium text-foreground">{evidence.parentFormLabel}</span>
          {evidence.isAddForm && (
            <span className="text-xs ml-1" style={{ color: 'oklch(0.50 0.16 50)' }}>(AddForm required)</span>
          )}
        </div>
      )}
      {evidence.sourceMapping && (
        <div className="rounded-lg border border-border px-4 py-3 mb-4">
          <p className="text-xs text-muted-foreground">
            Source: <span className="font-medium text-foreground">{evidence.sourceMapping}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Return: <span className="font-medium text-foreground">{evidence.returnMapping}</span>
          </p>
        </div>
      )}

      {/* Field comparison */}
      {evidence.comparedValues.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-3">Field Comparison</p>
          {Object.entries(grouped).map(([category, values]) => (
            <div key={category} className="mb-3">
              <p className="text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{category}</p>
              <div className="flex flex-col gap-1">
                {values.map((cv, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded px-2.5 py-2 text-xs"
                    style={{ backgroundColor: cv.match ? 'oklch(0.98 0.01 145)' : 'oklch(0.98 0.02 25)' }}
                  >
                    <span style={{ color: cv.match ? 'oklch(0.45 0.16 145)' : 'oklch(0.50 0.20 25)' }}>
                      {cv.match ? <CheckCircle className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                    </span>
                    <span className="font-medium text-foreground w-32 shrink-0 truncate">{cv.field}</span>
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
          ))}
        </div>
      )}
    </div>
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
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[0.625rem] font-medium"
            style={{ backgroundColor: config.bg, color: config.text, border: `1px solid ${config.border}` }}
          >
            {config.label}
          </span>
          <span className="text-[0.625rem] text-muted-foreground">{field.source}</span>
        </div>
        {field.hasOverride && (
          <span className="inline-flex items-center gap-1 text-[0.625rem] text-muted-foreground">
            <Clock className="size-2.5" />
            Override
          </span>
        )}
      </div>
      <p className="text-xs text-foreground mb-1.5">{field.id}. {field.label}</p>
      <div className="relative">
        <Input value={field.value} readOnly className="pr-7 h-8 text-xs bg-background" />
        <button className="absolute right-2 top-1/2 -translate-y-1/2">
          <X className="size-3 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </div>
  )
}
