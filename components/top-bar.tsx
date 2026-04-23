'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  MessageSquare,
  BookOpen,
  Keyboard,
  X,
  CheckCircle,
  Send,
  Video,
  ExternalLink,
  Save,
  Check,
  ChevronRight,
} from 'lucide-react'
import type { Binder } from '@/lib/types'
import { useWizardPipeline } from '@/contexts/wizard-pipeline-context'

export function TopBar({ binder }: { binder: Binder }) {
  const { activeWizard, setActiveWizard, wizardSteps } = useWizardPipeline()
  const [showFeedback, setShowFeedback] = useState(false)
  const [showGuidanceHub, setShowGuidanceHub] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  /* Close dropdowns on outside click */
  useEffect(() => {
    if (!showFeedback && !showGuidanceHub && !showShortcuts) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-topbar-panel]')) {
        setShowFeedback(false)
        setShowGuidanceHub(false)
        setShowShortcuts(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showFeedback, showGuidanceHub, showShortcuts])

  return (
    <header
      className="flex shrink-0 items-center justify-between border-b px-5"
      style={{ height: '3rem', borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
    >
      {/* ── Left: taxpayer identity ── */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded" style={{ backgroundColor: 'var(--muted)' }}>
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="truncate text-xs font-bold text-foreground leading-tight">
            {binder.taxpayerName} ({binder.taxYear})
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[0.625rem] text-muted-foreground leading-tight">Domain: Wizard-01</span>
            <a href="#" onClick={e => e.preventDefault()} className="text-[0.625rem] font-medium leading-tight" style={{ color: 'var(--primary)' }}>
              {'VIEW ENGAGEMENT INFO >'}
            </a>
          </div>
        </div>
      </div>

      {/* ── Center: wizard pipeline stepper ── */}
      <div className="flex items-center gap-0.5">
        {wizardSteps.map((step, idx) => {
          const isActive = activeWizard === step.id
          const isCompleted = step.completed
          const hasItems = step.count > 0
          const isEnabled = step.enabled
          const isLast = idx === wizardSteps.length - 1

          return (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                disabled={!isEnabled && !isCompleted}
                onClick={() => { if (isEnabled || isCompleted) setActiveWizard(step.id) }}
                className="group relative flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--muted)' : 'transparent',
                  cursor: !isEnabled && !isCompleted ? 'not-allowed' : 'pointer',
                  opacity: !isEnabled && !isCompleted ? 0.4 : 1,
                }}
              >
                {/* Step number / check */}
                <span
                  className="flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full text-[0.5rem] font-bold"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--primary)'
                      : isCompleted
                        ? 'var(--status-success)'
                        : 'var(--border)',
                    color: isActive || isCompleted ? '#fff' : 'var(--muted-foreground)',
                  }}
                >
                  {isCompleted ? <Check className="h-2.5 w-2.5" /> : idx + 1}
                </span>

                {/* Label */}
                <span
                  className="text-[0.6875rem] font-semibold"
                  style={{ color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                >
                  {step.label}
                </span>

                {/* Count badge */}
                {hasItems && !isCompleted && (
                  <span
                    className="rounded-full px-1.5 py-px font-mono text-[0.5rem] font-bold leading-none"
                    style={{
                      backgroundColor: isActive ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--muted)',
                      color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                    }}
                  >
                    {step.count}
                  </span>
                )}

                {/* Pending / N/A */}
                {!hasItems && !isCompleted && isEnabled && (
                  <span className="text-[0.5rem] text-muted-foreground">N/A</span>
                )}
                {!isEnabled && !isCompleted && (
                  <span className="text-[0.5rem] italic text-muted-foreground">Pending</span>
                )}

                {/* Active underline */}
                {isActive && (
                  <span className="absolute inset-x-1 rounded-full" style={{ bottom: '-0.25rem', height: '2px', backgroundColor: 'var(--primary)' }} />
                )}
              </button>

              {/* Connector */}
              {!isLast && (
                <div className="mx-0.5 flex items-center">
                  <div className="w-4" style={{ height: '1px', backgroundColor: isCompleted ? 'var(--status-success)' : 'var(--border)' }} />
                  <ChevronRight className="h-3 w-3" style={{ color: isCompleted ? 'var(--status-success)' : 'var(--muted-foreground)', opacity: 0.5 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Right: utilities ── */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Feedback */}
        <div className="relative" data-topbar-panel>
          <button
            type="button"
            onClick={() => { setShowFeedback(!showFeedback); setShowGuidanceHub(false); setShowShortcuts(false) }}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.6875rem] font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--status-error)',
              color: '#fff',
            }}
          >
            <MessageSquare className="h-3 w-3" />
            Feedback
          </button>
          {showFeedback && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-lg border border-border bg-card p-4 shadow-lg animate-in fade-in-0 slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Feedback</h3>
                <button type="button" onClick={() => setShowFeedback(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
              {feedbackSubmitted ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <CheckCircle className="h-8 w-8" style={{ color: 'var(--status-success)' }} />
                  <p className="text-sm font-semibold text-foreground">Thank you for your feedback!</p>
                  <p className="text-xs text-muted-foreground">Your input helps us improve the Superseded Wizard.</p>
                  <button type="button" onClick={() => { setFeedbackSubmitted(false); setFeedbackText(''); setShowFeedback(false) }} className="mt-2 rounded-md border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">Close</button>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-[0.6875rem] text-muted-foreground">Share your experience or report an issue with the Superseded Wizard.</p>
                  <textarea
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Describe your feedback here..."
                    rows={4}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button type="button" onClick={() => { setShowFeedback(false); setFeedbackText('') }} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">Cancel</button>
                    <button type="button" disabled={!feedbackText.trim()} onClick={() => setFeedbackSubmitted(true)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed">
                      <Send className="h-3 w-3" /> Submit
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Guidance Hub */}
        <div className="relative" data-topbar-panel>
          <button
            type="button"
            onClick={() => { setShowGuidanceHub(!showGuidanceHub); setShowFeedback(false); setShowShortcuts(false) }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
            style={{
              borderColor: showGuidanceHub ? 'var(--primary)' : 'var(--border)',
              backgroundColor: showGuidanceHub ? 'var(--primary)' : 'transparent',
              color: showGuidanceHub ? '#fff' : 'var(--muted-foreground)',
            }}
            title="Guidance Hub"
          >
            <BookOpen className="h-3.5 w-3.5" />
          </button>
          {showGuidanceHub && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-lg border border-border bg-card p-4 shadow-lg animate-in fade-in-0 slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Guidance Hub</h3>
                <button type="button" onClick={() => setShowGuidanceHub(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="space-y-2">
                <a href="#" onClick={e => e.preventDefault()} className="flex items-center gap-3 rounded-md border border-border p-3 text-xs font-medium text-foreground transition-colors hover:bg-muted group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: 'var(--status-error-subtle)', color: 'var(--status-error)' }}><Video className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold">Superseded Wizard Walkthrough</span>
                    <span className="block text-[0.625rem] text-muted-foreground">Video tutorial covering the full review workflow</span>
                  </div>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a href="#" onClick={e => e.preventDefault()} className="flex items-center gap-3 rounded-md border border-border p-3 text-xs font-medium text-foreground transition-colors hover:bg-muted group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}><BookOpen className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold">Decision Rules Reference</span>
                    <span className="block text-[0.625rem] text-muted-foreground">Understanding AI classification rules</span>
                  </div>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a href="#" onClick={e => e.preventDefault()} className="flex items-center gap-3 rounded-md border border-border p-3 text-xs font-medium text-foreground transition-colors hover:bg-muted group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: 'var(--status-warning-subtle)', color: 'var(--status-warning)' }}><FileText className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold">Reclassification Guide</span>
                    <span className="block text-[0.625rem] text-muted-foreground">When and how to override AI decisions</span>
                  </div>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts */}
        <div className="relative" data-topbar-panel>
          <button
            type="button"
            onClick={() => { setShowShortcuts(!showShortcuts); setShowFeedback(false); setShowGuidanceHub(false) }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
            style={{
              borderColor: showShortcuts ? 'var(--primary)' : 'var(--border)',
              backgroundColor: showShortcuts ? 'var(--primary)' : 'transparent',
              color: showShortcuts ? '#fff' : 'var(--muted-foreground)',
            }}
            title="Keyboard Shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
          {showShortcuts && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-[28rem] rounded-lg border border-border bg-card shadow-lg animate-in fade-in-0 slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-bold text-foreground">Keyboard Shortcuts</h3>
                <button type="button" onClick={() => setShowShortcuts(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="max-h-[22rem] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-bold text-muted-foreground">Functions</th>
                      <th className="px-4 py-2 text-right font-bold text-muted-foreground">Shortcuts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { fn: 'Open hotkeys', keys: 'H + K' },
                      { fn: 'Select the previous document', keys: 'S + UP ARROW' },
                      { fn: 'Select the next document', keys: 'S + DOWN ARROW' },
                      { fn: 'Choose the next form', keys: 'S + RIGHT ARROW' },
                      { fn: 'Choose the previous form', keys: 'S + LEFT ARROW' },
                      { fn: 'Open the image viewer in a separate window', keys: 'ALT + I' },
                      { fn: 'Close any open child window or prompt window', keys: 'C + W' },
                      { fn: 'Mark as Prior Year', keys: 'P + Y', note: 'First click the page number on the left panel to highlight in gray' },
                      { fn: 'Mark as Thumbnail', keys: 'P + T', note: 'First click the page number on the left panel to highlight in gray' },
                      { fn: 'Mark as Superseded', keys: 'P + S', note: 'First click the page number on the left panel to highlight in gray' },
                      { fn: 'Rotate page counter-clockwise 90 degrees', keys: 'R + LEFT ARROW' },
                      { fn: 'Rotate page clockwise 90 degrees', keys: 'R + RIGHT ARROW' },
                      { fn: 'Rotate the image document by 180 degrees', keys: 'R + UP ARROW' },
                    ].map(row => (
                      <tr key={row.keys} className="border-t border-border">
                        <td className="px-4 py-2.5">
                          <span className="text-foreground">{row.fn}</span>
                          {row.note && <span className="block text-[0.5625rem] text-muted-foreground mt-0.5">({row.note})</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <kbd className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-1 font-mono text-[0.6875rem] font-bold text-foreground">{row.keys}</kbd>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Separator + save status */}
        <div className="mx-1 h-5 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-[0.625rem] text-muted-foreground">
          <Save className="h-3 w-3" />
          <span>All changes saved automatically</span>
        </div>
      </div>
    </header>
  )
}
