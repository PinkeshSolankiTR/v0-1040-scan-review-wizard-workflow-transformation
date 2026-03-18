'use client'

import Link from 'next/link'
import { useState, useMemo, useCallback } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  FileStack,
  Copy,
  Link2,
  FileSearch,
  ShieldCheck,
  Sparkles,
  Flag,
  RotateCcw,
  ExternalLink,
  SkipForward,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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

// ── Icons ──
const CLASS_ICONS: Record<ClassificationType, typeof FileStack> = {
  superseded: FileStack,
  duplicate: Copy,
  cfa: Link2,
  nfr: FileSearch,
  clean: ShieldCheck,
}

export default function ReviewWizardPage() {
  // Only show documents that need review (pending, not clean)
  const pendingDocs = useMemo(() =>
    UNIFIED_DOCUMENTS.filter(d => d.classification.type !== 'clean'),
    []
  )

  const [decisions, setDecisions] = useState<Record<string, 'pending' | 'accepted' | 'overridden' | 'flagged' | 'skipped'>>(() => {
    const init: Record<string, 'pending'> = {}
    for (const d of pendingDocs) init[d.id] = 'pending'
    return init
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  const currentDoc = pendingDocs[currentIndex]
  const totalPending = pendingDocs.length
  const reviewed = Object.values(decisions).filter(d => d !== 'pending').length
  const progressPct = Math.round((reviewed / totalPending) * 100)

  const goNext = useCallback(() => {
    if (currentIndex < pendingDocs.length - 1) {
      setCurrentIndex(i => i + 1)
    }
  }, [currentIndex, pendingDocs.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
    }
  }, [currentIndex])

  const handleAccept = useCallback(() => {
    setDecisions(prev => ({ ...prev, [currentDoc.id]: 'accepted' }))
    goNext()
  }, [currentDoc, goNext])

  const handleFlag = useCallback(() => {
    setDecisions(prev => ({ ...prev, [currentDoc.id]: 'flagged' }))
    goNext()
  }, [currentDoc, goNext])

  const handleSkip = useCallback(() => {
    setDecisions(prev => ({ ...prev, [currentDoc.id]: 'skipped' }))
    goNext()
  }, [currentDoc, goNext])

  const handleOverride = () => setShowOverrideModal(true)
  const confirmOverride = () => {
    setDecisions(prev => ({ ...prev, [currentDoc.id]: 'overridden' }))
    setShowOverrideModal(false)
    setOverrideReason('')
    goNext()
  }

  const handleUndo = useCallback(() => {
    setDecisions(prev => ({ ...prev, [currentDoc.id]: 'pending' }))
  }, [currentDoc])

  const isAllDone = reviewed === totalPending

  if (!currentDoc) return null

  const cls = currentDoc.classification
  const colors = CLASSIFICATION_COLORS[cls.type]
  const Icon = CLASS_ICONS[cls.type]
  const confPct = Math.round(cls.confidence * 100)
  const currentDecision = decisions[currentDoc.id]

  // Group compared values
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
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar with progress (Easy to Monitor) */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/initial-draft"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Exit Wizard
            </Link>
            <div className="h-5 w-px bg-border" />
            <div>
              <h1 className="text-base font-bold text-foreground">Review Wizard</h1>
              <p className="text-xs text-muted-foreground">
                Item {currentIndex + 1} of {totalPending} -- {reviewed} reviewed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Progress value={progressPct} className="h-2 w-40" />
            <span className="text-sm font-medium text-foreground">{progressPct}%</span>
            {isAllDone && (
              <Button size="sm" asChild style={{ backgroundColor: 'oklch(0.45 0.16 145)', color: 'oklch(0.98 0 0)' }}>
                <Link href="/initial-draft">
                  <CheckCircle className="size-3.5 mr-1.5" />
                  Done -- Return to Dashboard
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-6">
          {/* Navigation dots (Easy to Monitor -- see where you are) */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
            {pendingDocs.map((doc, i) => {
              const d = decisions[doc.id]
              let dotBg = 'oklch(0.92 0 0)' // pending
              if (d === 'accepted') dotBg = 'oklch(0.55 0.17 145)'
              else if (d === 'overridden') dotBg = 'oklch(0.55 0.15 250)'
              else if (d === 'flagged') dotBg = 'oklch(0.60 0.18 25)'
              else if (d === 'skipped') dotBg = 'oklch(0.80 0 0)'

              return (
                <button
                  key={doc.id}
                  onClick={() => setCurrentIndex(i)}
                  className="shrink-0 rounded-full transition-all"
                  style={{
                    width: i === currentIndex ? '1.5rem' : '0.5rem',
                    height: '0.5rem',
                    backgroundColor: dotBg,
                    border: i === currentIndex ? '2px solid oklch(0.25 0.01 260)' : 'none',
                  }}
                  aria-label={`Go to item ${i + 1}: ${doc.formLabel}`}
                />
              )
            })}
          </div>

          {/* Current document card */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Classification details */}
            <div className="rounded-lg border border-border bg-card">
              {/* Header */}
              <div className="border-b border-border p-5">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold"
                    style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                  >
                    <Icon className="size-4" />
                    {CLASSIFICATION_LABELS[cls.type]}
                  </span>
                  <ConfidenceIndicator score={cls.confidence} />
                </div>
                <h2 className="text-lg font-bold text-foreground">{currentDoc.formLabel}</h2>
                <p className="text-sm text-muted-foreground">Page {currentDoc.pageNumber} -- {currentDoc.fileName}</p>
              </div>

              {/* Decision + reason */}
              <div className="p-5 border-b border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Decision:</span>
                  <span className="text-sm font-semibold text-foreground">{cls.decision}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Rule:</span>
                  <span className="text-xs font-mono text-foreground">{cls.rule}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{cls.reason}</p>

                {cls.escalationReason && (
                  <div
                    className="rounded-lg border px-3 py-2.5 mt-3 flex items-start gap-2"
                    style={{
                      backgroundColor: 'oklch(0.98 0.02 85)',
                      borderColor: 'oklch(0.88 0.08 85)',
                    }}
                  >
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" style={{ color: 'oklch(0.6 0.18 60)' }} />
                    <p className="text-xs text-foreground leading-relaxed">{cls.escalationReason}</p>
                  </div>
                )}
              </div>

              {/* Field comparison evidence */}
              <div className="p-5">
                <p className="text-sm font-semibold text-foreground mb-3">Field Comparison Evidence</p>
                {Object.entries(grouped).map(([category, values]) => (
                  <div key={category} className="mb-3">
                    <p className="text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{category}</p>
                    <div className="flex flex-col gap-1">
                      {values.map((cv, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded px-2.5 py-2 text-xs"
                          style={{
                            backgroundColor: cv.match ? 'oklch(0.98 0.01 145)' : 'oklch(0.98 0.02 25)',
                          }}
                        >
                          <span className="shrink-0" style={{ color: cv.match ? 'oklch(0.45 0.16 145)' : 'oklch(0.50 0.20 25)' }}>
                            {cv.match ? <CheckCircle className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                          </span>
                          <span className="font-medium text-foreground w-40 shrink-0">{cv.field}</span>
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
            </div>

            {/* Right: Document preview + actions */}
            <div className="flex flex-col gap-4">
              {/* Document preview */}
              <div className="rounded-lg border border-border bg-card overflow-hidden flex-1">
                <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Document Preview</span>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                    <Link href={`/initial-draft/document/${currentDoc.id}`}>
                      <ExternalLink className="size-3" />
                      Full View
                    </Link>
                  </Button>
                </div>
                <div className="overflow-hidden p-4 flex items-center justify-center" style={{ backgroundColor: 'oklch(0.96 0 0)', maxHeight: '320px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/w2-form-sample.jpg"
                    alt={`${currentDoc.formLabel} document preview`}
                    className="max-w-full object-contain"
                    style={{ width: 'auto', height: 'auto' }}
                  />
                </div>
              </div>

              {/* Action buttons (Easy to Use -- clear primary actions) */}
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-foreground">Your Decision</span>
                  {currentDecision !== 'pending' && (
                    <span
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: currentDecision === 'accepted' ? 'oklch(0.97 0.02 145)' : currentDecision === 'flagged' ? 'oklch(0.97 0.02 25)' : 'oklch(0.95 0.03 250)',
                        color: currentDecision === 'accepted' ? 'oklch(0.40 0.16 145)' : currentDecision === 'flagged' ? 'oklch(0.50 0.20 25)' : 'oklch(0.40 0.15 250)',
                      }}
                    >
                      {currentDecision === 'accepted' ? 'Accepted' : currentDecision === 'flagged' ? 'Flagged' : currentDecision === 'overridden' ? 'Overridden' : 'Skipped'}
                    </span>
                  )}
                </div>

                {currentDecision === 'pending' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      className="gap-1.5"
                      style={{ backgroundColor: 'oklch(0.45 0.16 145)', color: 'oklch(0.98 0 0)' }}
                      onClick={handleAccept}
                    >
                      <CheckCircle className="size-4" />
                      Accept AI Decision
                    </Button>
                    <Button variant="outline" className="gap-1.5" onClick={handleOverride}>
                      <RotateCcw className="size-4" />
                      Override
                    </Button>
                    <Button variant="outline" className="gap-1.5" onClick={handleFlag}>
                      <Flag className="size-4" />
                      Flag for Later
                    </Button>
                    <Button variant="outline" className="gap-1.5 text-muted-foreground" onClick={handleSkip}>
                      <SkipForward className="size-4" />
                      Skip
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full gap-1.5" onClick={handleUndo}>
                    <RotateCcw className="size-4" />
                    Undo -- Change Decision
                  </Button>
                )}
              </div>

              {/* Prev / Next navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  className="gap-1.5"
                  disabled={currentIndex === 0}
                  onClick={goPrev}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  disabled={currentIndex === pendingDocs.length - 1}
                  onClick={goNext}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Override modal */}
      <Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Override AI Decision</DialogTitle>
            <DialogDescription>
              You are overriding &quot;{cls.decision}&quot; for {currentDoc.formLabel}. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Reason</label>
            <Input
              placeholder="Why are you overriding this decision?"
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideModal(false)}>Cancel</Button>
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
