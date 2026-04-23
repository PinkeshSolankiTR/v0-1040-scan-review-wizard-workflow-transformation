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
} from 'lucide-react'
import type { Binder } from '@/lib/types'

export function TopBar({ binder }: { binder: Binder }) {
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
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-5">
      {/* Left: taxpayer info */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {binder.taxpayerName} ({binder.taxYear})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[0.6875rem] text-muted-foreground">Domain: Wizard-01</span>
            <a href="#" onClick={e => e.preventDefault()} className="text-[0.6875rem] font-medium text-primary hover:underline">
              {'VIEW ENGAGEMENT INFO >'}
            </a>
          </div>
        </div>
      </div>

      {/* Right: utility buttons + save status */}
      <div className="flex items-center gap-2">
        {/* Feedback */}
        <div className="relative" data-topbar-panel>
          <button
            type="button"
            onClick={() => { setShowFeedback(!showFeedback); setShowGuidanceHub(false); setShowShortcuts(false) }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: showFeedback ? 'var(--primary)' : 'var(--status-error)',
              color: '#fff',
              borderColor: showFeedback ? 'var(--primary)' : 'var(--status-error)',
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
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
                    <button
                      type="button"
                      disabled={!feedbackText.trim()}
                      onClick={() => { setFeedbackSubmitted(true) }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
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
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border transition-colors ${showGuidanceHub ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            title="Guidance Hub"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          {showGuidanceHub && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-lg border border-border bg-card p-4 shadow-lg animate-in fade-in-0 slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Guidance Hub</h3>
                <button type="button" onClick={() => setShowGuidanceHub(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="space-y-2">
                <a href="#" onClick={e => e.preventDefault()} className="flex items-center gap-3 rounded-md border border-border p-3 text-xs font-medium text-foreground transition-colors hover:bg-muted group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: 'var(--status-error-subtle)', color: 'var(--status-error)' }}>
                    <Video className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold">Superseded Wizard Walkthrough</span>
                    <span className="block text-[0.625rem] text-muted-foreground">Video tutorial covering the full review workflow</span>
                  </div>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a href="#" onClick={e => e.preventDefault()} className="flex items-center gap-3 rounded-md border border-border p-3 text-xs font-medium text-foreground transition-colors hover:bg-muted group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold">Decision Rules Reference</span>
                    <span className="block text-[0.625rem] text-muted-foreground">Understanding AI classification rules</span>
                  </div>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a href="#" onClick={e => e.preventDefault()} className="flex items-center gap-3 rounded-md border border-border p-3 text-xs font-medium text-foreground transition-colors hover:bg-muted group">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: 'var(--status-warning-subtle)', color: 'var(--status-warning)' }}>
                    <FileText className="h-4 w-4" />
                  </div>
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
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border transition-colors ${showShortcuts ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            title="Keyboard Shortcuts"
          >
            <Keyboard className="h-4 w-4" />
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

        {/* Separator */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* Auto-save status */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Save className="h-3.5 w-3.5" />
          <span>All changes saved automatically</span>
        </div>
      </div>
    </header>
  )
}
