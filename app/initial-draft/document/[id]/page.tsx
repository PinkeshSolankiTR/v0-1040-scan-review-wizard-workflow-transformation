'use client'

import Image from 'next/image'
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
  FileStack,
  Copy,
  Link2,
  FileSearch,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
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
  UNIFIED_DOCUMENTS,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS,
  type ClassificationType,
  type UnifiedDocument,
} from '@/lib/unified-review-data'
import {
  FIELD_TYPE_OPTIONS,
  W2_EXTRACTED_FIELDS,
  type ExtractedField,
} from '@/lib/initial-draft-data'

// ── Classification icon map ──
const CLASS_ICONS: Record<ClassificationType, typeof FileStack> = {
  superseded: FileStack,
  duplicate: Copy,
  cfa: Link2,
  nfr: FileSearch,
  clean: ShieldCheck,
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const doc = UNIFIED_DOCUMENTS.find(d => d.id === id) ?? UNIFIED_DOCUMENTS[0]

  const [fieldSearch, setFieldSearch] = useState('')
  const [fieldTypeFilter, setFieldTypeFilter] = useState('All fields')
  const [zoom, setZoom] = useState(100)
  const [reviewStatus, setReviewStatus] = useState(doc.reviewStatus)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [classExpanded, setClassExpanded] = useState(true)
  const [fieldsExpanded, setFieldsExpanded] = useState(true)

  // Use same extracted fields for prototype
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

  const handleAccept = () => setReviewStatus('accepted')
  const handleFlag = () => setReviewStatus('flagged')
  const handleOverride = () => {
    setShowOverrideModal(true)
  }
  const confirmOverride = () => {
    setReviewStatus('overridden')
    setShowOverrideModal(false)
    setOverrideReason('')
  }
  const handleUndo = () => setReviewStatus('pending')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Back navigation */}
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
          {/* Navigation between documents (Easy to Use) */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Document {UNIFIED_DOCUMENTS.indexOf(doc) + 1} of {UNIFIED_DOCUMENTS.length}</span>
          </div>
        </div>
      </div>

      {/* Document title + classification status bar */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">{doc.formLabel}</h1>
            <p className="text-sm text-muted-foreground">Page {doc.pageNumber} -- {doc.fileName}</p>
          </div>
          {/* Quick status + actions (Easy to Monitor) */}
          <div className="flex items-center gap-3">
            <ReviewStatusBadge status={reviewStatus} />
            {reviewStatus === 'pending' && doc.classification.type !== 'clean' && (
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
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={handleOverride}
                >
                  <RotateCcw className="size-3.5" />
                  Override
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={handleFlag}
                >
                  <Flag className="size-3.5" />
                  Flag
                </Button>
              </>
            )}
            {reviewStatus !== 'pending' && (
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
        {/* Left panel: Classification + Fields */}
        <div className="w-[540px] shrink-0 border-r border-border overflow-y-auto bg-card">
          {/* Classification Panel (Easy to Learn -- shows WHY) */}
          <div className="border-b border-border">
            <button
              className="flex items-center justify-between w-full px-5 py-3 text-left hover:bg-accent/30 transition-colors"
              onClick={() => setClassExpanded(!classExpanded)}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="size-4" style={{ color: 'oklch(0.55 0.18 260)' }} />
                <span className="text-sm font-semibold text-foreground">AI Classification</span>
              </div>
              {classExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>
            {classExpanded && (
              <ClassificationPanel doc={doc} />
            )}
          </div>

          {/* Extracted Fields */}
          <div>
            <button
              className="flex items-center justify-between w-full px-5 py-3 text-left hover:bg-accent/30 transition-colors"
              onClick={() => setFieldsExpanded(!fieldsExpanded)}
            >
              <div className="flex items-center gap-2">
                <Search className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Extracted Fields</span>
                <span className="text-xs text-muted-foreground">({W2_EXTRACTED_FIELDS.length})</span>
              </div>
              {fieldsExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>
            {fieldsExpanded && (
              <div className="px-5 pb-5">
                {/* Search + Field Type filter */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Search fields"
                      value={fieldSearch}
                      onChange={e => setFieldSearch(e.target.value)}
                      className="pr-9"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  </div>
                  <Select value={fieldTypeFilter} onValueChange={setFieldTypeFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Field cards */}
                <div className="flex flex-col gap-3">
                  {filteredFields.map(field => (
                    <FieldCard key={field.id} field={field} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Document viewer */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Viewer toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Search document</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(zoom)} onValueChange={v => setZoom(Number(v))}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="75">75%</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                  <SelectItem value="125">125%</SelectItem>
                  <SelectItem value="150">150%</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setZoom(z => Math.min(z + 25, 200))}>
                <ZoomIn className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setZoom(z => Math.max(z - 25, 25))}>
                <ZoomOut className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <Download className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <Printer className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <Maximize2 className="size-4" />
              </Button>
            </div>
          </div>

          {/* Document image */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-6" style={{ backgroundColor: 'oklch(0.96 0 0)' }}>
            <div
              className="bg-card shadow-lg rounded border border-border"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            >
              <Image
                src="/images/w2-form-sample.jpg"
                alt={`${doc.formLabel} document`}
                width={800}
                height={1035}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Override modal */}
      <Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Override AI Decision</DialogTitle>
            <DialogDescription>
              You are overriding the AI classification of &quot;{doc.classification.decision}&quot; for this document.
              Please provide a reason for the override.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Reason for override</label>
            <Input
              placeholder="e.g., This is actually a different account, not a duplicate"
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideModal(false)}>
              Cancel
            </Button>
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

// ── Classification Panel ──

function ClassificationPanel({ doc }: { doc: UnifiedDocument }) {
  const cls = doc.classification
  const colors = CLASSIFICATION_COLORS[cls.type]
  const Icon = CLASS_ICONS[cls.type]
  const confPct = Math.round(cls.confidence * 100)

  // Group compared values by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof cls.comparedValues> = {}
    for (const cv of cls.comparedValues) {
      const cat = cv.category || 'General'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(cv)
    }
    return groups
  }, [cls.comparedValues])

  return (
    <div className="px-5 pb-5">
      {/* Classification badge + confidence */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold"
          style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          <Icon className="size-4" />
          {CLASSIFICATION_LABELS[cls.type]}
        </span>
        <ConfidenceIndicator score={cls.confidence} />
      </div>

      {/* Decision + Rule */}
      <div className="rounded-lg border border-border p-3 mb-3" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">Decision:</span>
          <span className="text-sm font-semibold text-foreground">{cls.decision}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-muted-foreground">Rule:</span>
          <span className="text-xs font-mono text-foreground">{cls.rule}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{cls.reason}</p>
      </div>

      {/* Escalation warning */}
      {cls.escalationReason && (
        <div
          className="rounded-lg border px-3 py-2.5 mb-3 flex items-start gap-2"
          style={{
            backgroundColor: 'oklch(0.98 0.02 85)',
            borderColor: 'oklch(0.88 0.08 85)',
          }}
        >
          <AlertTriangle className="size-4 mt-0.5 shrink-0" style={{ color: 'oklch(0.6 0.18 60)' }} />
          <p className="text-xs text-foreground leading-relaxed">{cls.escalationReason}</p>
        </div>
      )}

      {/* Context-specific info */}
      {cls.type === 'superseded' && cls.retainedPageId && (
        <div className="text-xs text-muted-foreground mb-3">
          Superseded by: <Link href={`/initial-draft/document/page-${cls.retainedPageId}`} className="font-medium text-foreground hover:underline">Page {cls.retainedPageId}</Link>
        </div>
      )}
      {cls.type === 'cfa' && cls.parentFormLabel && (
        <div className="text-xs text-muted-foreground mb-3">
          Parent: <span className="font-medium text-foreground">{cls.parentFormLabel}</span>
          {cls.isAddForm && <span className="ml-1 text-xs" style={{ color: 'oklch(0.50 0.16 50)' }}>(AddForm required)</span>}
        </div>
      )}
      {cls.type === 'nfr' && cls.sourceValue && (
        <div className="text-xs text-muted-foreground mb-3">
          Source: <span className="font-medium text-foreground">{cls.sourceValue}</span>
          {' -> '}
          Return: <span className="font-medium text-foreground">{cls.returnValue}</span>
        </div>
      )}

      {/* Compared values (Easy to Monitor -- field-level evidence) */}
      {cls.comparedValues.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Field Comparison Evidence</p>
          {Object.entries(grouped).map(([category, values]) => (
            <div key={category} className="mb-2">
              <p className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider mb-1">{category}</p>
              <div className="flex flex-col gap-1">
                {values.map((cv, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-xs"
                    style={{
                      backgroundColor: cv.match ? 'oklch(0.98 0.01 145)' : 'oklch(0.98 0.02 25)',
                    }}
                  >
                    <span className="shrink-0" style={{ color: cv.match ? 'oklch(0.45 0.16 145)' : 'oklch(0.50 0.20 25)' }}>
                      {cv.match ? <CheckCircle className="size-3" /> : <AlertTriangle className="size-3" />}
                    </span>
                    <span className="font-medium text-foreground w-36 shrink-0 truncate">{cv.field}</span>
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
          ))}
        </div>
      )}
    </div>
  )
}

// ── Confidence Indicator ──

function ConfidenceIndicator({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  let bg: string
  let text: string
  let label: string

  if (score >= 0.9) {
    bg = 'oklch(0.97 0.02 145)'
    text = 'oklch(0.40 0.16 145)'
    label = 'High'
  } else if (score >= 0.7) {
    bg = 'oklch(0.97 0.02 60)'
    text = 'oklch(0.50 0.16 50)'
    label = 'Moderate'
  } else {
    bg = 'oklch(0.97 0.02 25)'
    text = 'oklch(0.50 0.20 25)'
    label = 'Low'
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {label} {pct}%
    </span>
  )
}

// ── Review Status Badge ──

function ReviewStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    pending: { label: 'Pending Review', bg: 'oklch(0.97 0.02 60)', text: 'oklch(0.50 0.16 50)', border: 'oklch(0.88 0.08 60)' },
    accepted: { label: 'Accepted', bg: 'oklch(0.97 0.02 145)', text: 'oklch(0.40 0.16 145)', border: 'oklch(0.88 0.08 145)' },
    overridden: { label: 'Overridden', bg: 'oklch(0.95 0.03 250)', text: 'oklch(0.40 0.15 250)', border: 'oklch(0.82 0.08 250)' },
    flagged: { label: 'Flagged', bg: 'oklch(0.97 0.02 25)', text: 'oklch(0.50 0.20 25)', border: 'oklch(0.88 0.08 25)' },
  }
  const c = config[status] || config.pending

  return (
    <span
      className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {c.label}
    </span>
  )
}

// ── Field Card Component ──

function FieldCard({ field }: { field: ExtractedField }) {
  const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    'mandatory': {
      label: 'Mandatory',
      bg: 'oklch(0.97 0.02 60)',
      text: 'oklch(0.5 0.16 50)',
      border: 'oklch(0.88 0.08 60)',
    },
    'proforma': {
      label: 'Proforma',
      bg: 'oklch(0.96 0.02 250)',
      text: 'oklch(0.5 0.14 250)',
      border: 'oklch(0.88 0.06 250)',
    },
    'uncertain': {
      label: 'Uncertain',
      bg: 'oklch(0.96 0 0)',
      text: 'oklch(0.45 0 0)',
      border: 'oklch(0.88 0 0)',
    },
    'missing': {
      label: 'Missing',
      bg: 'oklch(0.97 0.02 25)',
      text: 'oklch(0.5 0.2 25)',
      border: 'oklch(0.88 0.08 25)',
    },
    'fully-confident': {
      label: 'Confident',
      bg: 'oklch(0.97 0.02 145)',
      text: 'oklch(0.45 0.16 145)',
      border: 'oklch(0.88 0.08 145)',
    },
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
        <Input
          value={field.value}
          readOnly
          className="pr-7 h-8 text-xs bg-background"
        />
        <button className="absolute right-2 top-1/2 -translate-y-1/2">
          <X className="size-3 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </div>
  )
}
