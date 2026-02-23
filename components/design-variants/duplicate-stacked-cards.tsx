'use client'

/**
 * Duplicate wizard: Stacked Pair Cards variant.
 * Each AI-suggested pair is a horizontal card with Doc A values left, Doc B values right,
 * field-level diff in the center. Mismatched fields highlighted inline.
 * Accept/Reject buttons per card for rapid batch review.
 */

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel, type DuplicateRecord, type DuplicateDataRecord, type DuplicateDocRecord } from '@/lib/types'
import {
  Sparkles, Check, Undo2, AlertTriangle,
  Link2, Unlink2, Eye, EyeOff,
  ChevronDown, ChevronRight, ArrowRight, Filter,
} from 'lucide-react'

/* ── helpers ── */

function getItemKey(r: DuplicateRecord): string {
  if (r.itemType === 'DUPLICATE_DATA') return `dup-${(r as DuplicateDataRecord).organizerItemId}`
  const doc = r as DuplicateDocRecord
  return `dup-${doc.docIdA}-${doc.docIdB}`
}

function isRecordMatched(
  r: DuplicateRecord,
  key: string,
  decisions: Record<string, string>,
  showAutoMatched: boolean
): boolean {
  if (decisions[key] === 'accepted') return true
  if (decisions[key] === 'rejected') return false
  if (showAutoMatched && r.confidenceLevel >= 0.9) return true
  return false
}

type FilterMode = 'all' | 'unmatched' | 'matched' | 'review'

/* ── main component ── */

export function DuplicateStackedCards({ data }: { data: DuplicateRecord[] }) {
  const { decisions, accept, undo, acceptAllHighConfidence } = useDecisions()
  const [showAutoMatched, setShowAutoMatched] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => new Set())
  const [previewKeys, setPreviewKeys] = useState<Set<string>>(() => new Set())

  /* Sort by confidence descending for triage-friendly order */
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => b.confidenceLevel - a.confidenceLevel)
  }, [data])

  const filtered = useMemo(() => {
    return sorted.filter(r => {
      const key = getItemKey(r)
      const matched = isRecordMatched(r, key, decisions, showAutoMatched)
      if (filter === 'unmatched') return !matched
      if (filter === 'matched') return matched
      if (filter === 'review') return r.reviewRequired
      return true
    })
  }, [sorted, decisions, showAutoMatched, filter])

  const matchedCount = data.filter(r => isRecordMatched(r, getItemKey(r), decisions, showAutoMatched)).length
  const unmatchedCount = data.length - matchedCount
  const reviewCount = data.filter(r => r.reviewRequired).length

  const toggleCard = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const togglePreview = (key: string) => {
    setPreviewKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleAcceptAll = () => {
    acceptAllHighConfidence(
      data
        .filter(r => r.confidenceLevel >= 0.9)
        .map(r => ({ key: getItemKey(r), wizardType: 'duplicate' as const, confidence: r.confidenceLevel }))
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)' }}>Duplicate Data</h2>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '1rem', backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
            {matchedCount} matched
          </span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '1rem', backgroundColor: 'oklch(0.94 0.04 60)', color: 'oklch(0.45 0.14 60)' }}>
            {unmatchedCount} unmatched
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'oklch(0.45 0.01 260)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showAutoMatched} onChange={e => setShowAutoMatched(e.target.checked)} style={{ accentColor: 'oklch(0.45 0.18 240)' }} />
            Show Auto-Matched
          </label>
          <Button variant="outline" size="sm" onClick={handleAcceptAll} style={{ fontSize: '0.6875rem', gap: '0.25rem' }}>
            <Sparkles style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
            Accept All High Confidence
          </Button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div role="tablist" style={{
        display: 'flex', gap: '0', borderRadius: 'var(--radius)',
        border: '0.0625rem solid oklch(0.88 0.01 260)', overflow: 'hidden',
      }}>
        {([
          { id: 'all' as FilterMode, label: 'All', count: data.length },
          { id: 'unmatched' as FilterMode, label: 'Unmatched', count: unmatchedCount },
          { id: 'matched' as FilterMode, label: 'Matched', count: matchedCount },
          { id: 'review' as FilterMode, label: 'Needs Review', count: reviewCount },
        ]).map((f, idx) => (
          <button
            key={f.id}
            role="tab"
            type="button"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            style={{
              flex: '1 1 0', padding: '0.4375rem 0.5rem',
              border: 'none', cursor: 'pointer',
              borderInlineEnd: idx < 3 ? '0.0625rem solid oklch(0.88 0.01 260)' : 'none',
              backgroundColor: filter === f.id ? 'oklch(0.2 0.01 260)' : 'oklch(0.97 0.003 260)',
              color: filter === f.id ? 'oklch(1 0 0)' : 'oklch(0.45 0.01 260)',
              fontSize: '0.75rem', fontWeight: 700,
            }}
          >
            {f.label} <span style={{ fontSize: '0.625rem', fontWeight: 400, opacity: 0.7 }}>({f.count})</span>
          </button>
        ))}
      </div>

      {/* ── Pair cards ── */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '3rem 2rem', textAlign: 'center',
          borderRadius: 'var(--radius)', border: '0.125rem dashed oklch(0.88 0.01 260)',
          backgroundColor: 'oklch(0.98 0.003 260)',
        }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'oklch(0.45 0.01 260)' }}>
            No pairs match this filter
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(r => {
            const key = getItemKey(r)
            const matched = isRecordMatched(r, key, decisions, showAutoMatched)
            const isExpanded = expandedCards.has(key)
            const isPreviewOpen = previewKeys.has(key)
            const level = getConfidenceLevel(r.confidenceLevel)
            const conf = Math.round(r.confidenceLevel * 100)
            const vals = r.comparedValues ?? []
            const mismatches = vals.filter(v => !v.match)

            const borderColor = matched
              ? 'oklch(0.8 0.08 145)'
              : level === 'high' ? 'oklch(0.85 0.06 145)'
              : level === 'medium' ? 'oklch(0.85 0.06 80)'
              : 'oklch(0.85 0.06 25)'

            return (
              <article key={key} style={{
                borderRadius: 'var(--radius)', overflow: 'hidden',
                border: `0.0625rem solid ${borderColor}`,
                backgroundColor: matched ? 'oklch(0.985 0.008 145 / 0.3)' : 'oklch(1 0 0)',
              }}>
                {/* ── Card header ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.625rem 0.75rem',
                  borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                  flexWrap: 'wrap',
                }}>
                  <ConfidenceBadge score={r.confidenceLevel} />
                  <div style={{ flex: '1 1 0', minInlineSize: 0, display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>
                      {r.documentRefA?.formLabel ?? '?'}
                    </span>
                    <ArrowRight style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.55 0.01 260)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>
                      {r.documentRefB?.formLabel ?? '?'}
                    </span>
                    {matched && (
                      <span style={{ fontSize: '0.5625rem', fontWeight: 700, padding: '0.0625rem 0.375rem', borderRadius: '1rem', backgroundColor: 'oklch(0.9 0.06 145)', color: 'oklch(0.3 0.14 145)', textTransform: 'uppercase' }}>
                        Matched
                      </span>
                    )}
                    {r.reviewRequired && (
                      <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0 }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                    <Button variant="outline" size="sm" onClick={() => togglePreview(key)} style={{ fontSize: '0.6875rem', gap: '0.25rem' }}>
                      {isPreviewOpen
                        ? <><EyeOff style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Hide</>
                        : <><Eye style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Docs</>
                      }
                    </Button>
                    {matched ? (
                      <Button variant="outline" size="sm" onClick={() => undo(key, 'duplicate', r.confidenceLevel)} style={{ fontSize: '0.6875rem', gap: '0.25rem' }}>
                        <Unlink2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Unmatch
                      </Button>
                    ) : (
                      <Button variant="default" size="sm" onClick={() => accept(key, 'duplicate', r.confidenceLevel, 'manual')} style={{ fontSize: '0.6875rem', gap: '0.25rem' }}>
                        <Link2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Match
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── Field-level diff: Doc A values | Center diff | Doc B values ── */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                  gap: '0',
                }}>
                  {/* Left: Doc A values */}
                  <div style={{ padding: '0.5rem 0.625rem' }}>
                    <p style={{
                      fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      marginBlockEnd: '0.25rem',
                      paddingBlockEnd: '0.25rem',
                      borderBlockEnd: '0.0625rem solid oklch(0.93 0.005 260)',
                    }}>
                      {r.documentRefA?.formLabel ?? 'Doc A'}
                    </p>
                    {vals.map(cv => (
                      <div key={cv.field} style={{
                        display: 'flex', justifyContent: 'space-between', gap: '0.375rem',
                        padding: '0.1875rem 0', fontSize: '0.75rem',
                        borderBlockEnd: '0.0625rem solid oklch(0.96 0.003 260)',
                      }}>
                        <span style={{ color: 'oklch(0.5 0.01 260)', fontSize: '0.6875rem' }}>{cv.field}</span>
                        <span style={{
                          fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
                          color: cv.match ? 'oklch(0.25 0.01 260)' : 'oklch(0.45 0.18 25)',
                          backgroundColor: !cv.match ? 'oklch(0.95 0.04 25)' : 'transparent',
                          padding: !cv.match ? '0 0.25rem' : '0',
                          borderRadius: '0.125rem',
                          textAlign: 'end',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxInlineSize: '10rem',
                        }}>
                          {cv.valueA}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Center: match indicators */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '1.5rem 0.375rem 0.5rem',
                    borderInlineStart: '0.0625rem solid oklch(0.93 0.005 260)',
                    borderInlineEnd: '0.0625rem solid oklch(0.93 0.005 260)',
                    gap: '0',
                    minInlineSize: '1.5rem',
                  }}>
                    {vals.map(cv => (
                      <div key={cv.field} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        blockSize: '1.5625rem',
                        fontSize: '0.6875rem',
                      }}>
                        {cv.match ? (
                          <Check style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem', color: 'oklch(0.55 0.17 145)' }} />
                        ) : (
                          <AlertTriangle style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem', color: 'oklch(0.6 0.18 25)' }} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Right: Doc B values */}
                  <div style={{ padding: '0.5rem 0.625rem' }}>
                    <p style={{
                      fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      marginBlockEnd: '0.25rem',
                      paddingBlockEnd: '0.25rem',
                      borderBlockEnd: '0.0625rem solid oklch(0.93 0.005 260)',
                    }}>
                      {r.documentRefB?.formLabel ?? 'Doc B'}
                    </p>
                    {vals.map(cv => (
                      <div key={cv.field} style={{
                        display: 'flex', justifyContent: 'space-between', gap: '0.375rem',
                        padding: '0.1875rem 0', fontSize: '0.75rem',
                        borderBlockEnd: '0.0625rem solid oklch(0.96 0.003 260)',
                      }}>
                        <span style={{ color: 'oklch(0.5 0.01 260)', fontSize: '0.6875rem' }}>{cv.field}</span>
                        <span style={{
                          fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
                          color: cv.match ? 'oklch(0.25 0.01 260)' : 'oklch(0.45 0.18 25)',
                          backgroundColor: !cv.match ? 'oklch(0.95 0.04 25)' : 'transparent',
                          padding: !cv.match ? '0 0.25rem' : '0',
                          borderRadius: '0.125rem',
                          textAlign: 'end',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxInlineSize: '10rem',
                        }}>
                          {cv.valueB}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── AI reasoning (collapsible) ── */}
                <details style={{
                  borderBlockStart: '0.0625rem solid oklch(0.93 0.005 260)',
                }}>
                  <summary style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.4375rem 0.75rem',
                    backgroundColor: 'oklch(0.97 0.005 240)',
                    cursor: 'pointer', listStyle: 'none',
                    fontSize: '0.625rem', fontWeight: 700, color: 'var(--ai-accent)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    <Sparkles style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                    AI Analysis
                    <span style={{ marginInlineStart: 'auto', color: 'oklch(0.5 0.01 260)', fontFamily: 'var(--font-mono)' }}>
                      {r.appliedRuleSet} / {r.decisionRule}
                    </span>
                  </summary>
                  <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'oklch(0.985 0.003 240)' }}>
                    <p style={{ fontSize: '0.8125rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>
                      {r.decisionReason}
                    </p>
                    {r.escalationReason && (
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                        marginBlockStart: '0.5rem', padding: '0.4375rem 0.625rem', borderRadius: '0.25rem',
                        backgroundColor: 'oklch(0.96 0.04 60)', border: '0.0625rem solid oklch(0.88 0.08 60)',
                      }}>
                        <AlertTriangle style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                        <div>
                          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.5 0.16 60)' }}>Escalation</p>
                          <p style={{ fontSize: '0.75rem', color: 'oklch(0.35 0.1 60)', lineHeight: '1.4' }}>{r.escalationReason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </details>

                {/* ── PDF preview ── */}
                {isPreviewOpen && (r.documentRefA || r.documentRefB) && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                    padding: '1rem', backgroundColor: 'oklch(0.975 0.003 260)',
                    borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)',
                  }}>
                    {r.documentRefA && (
                      <div>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', marginBlockEnd: '0.375rem', textTransform: 'uppercase' }}>
                          {r.documentRefA.formLabel}
                        </p>
                        <PdfPageViewer documentRef={r.documentRefA} stamp="DOC A" height="20rem" />
                      </div>
                    )}
                    {r.documentRefB && (
                      <div>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', marginBlockEnd: '0.375rem', textTransform: 'uppercase' }}>
                          {r.documentRefB.formLabel}
                        </p>
                        <PdfPageViewer documentRef={r.documentRefB} stamp="DOC B" height="20rem" />
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
