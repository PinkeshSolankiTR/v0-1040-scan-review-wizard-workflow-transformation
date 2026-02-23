'use client'

/**
 * Duplicate wizard: Side-by-Side Matching View.
 * Two independent scrollable columns -- Organizer Pages left, Source Documents right.
 * Users select one from each side and click Match in the center action bar.
 * AI-suggested pairings shown as highlighted rows with confidence indicators.
 */

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel, type DuplicateRecord, type DuplicateDataRecord, type DuplicateDocRecord } from '@/lib/types'
import {
  Sparkles, Check, Undo2, AlertTriangle,
  ChevronDown, ChevronRight, Link2, Unlink2,
  Eye, EyeOff, ArrowRight,
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

/* ── main component ── */

export function DuplicateSideBySide({ data }: { data: DuplicateRecord[] }) {
  const { decisions, accept, undo } = useDecisions()
  const [showAutoMatched, setShowAutoMatched] = useState(true)
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState<string | null>(null)

  const matched = useMemo(
    () => data.filter(r => isRecordMatched(r, getItemKey(r), decisions, showAutoMatched)),
    [data, decisions, showAutoMatched]
  )
  const unmatched = useMemo(
    () => data.filter(r => !isRecordMatched(r, getItemKey(r), decisions, showAutoMatched)),
    [data, decisions, showAutoMatched]
  )

  /* Find the record that corresponds to a left+right selection */
  const findPair = (leftKey: string, rightKey: string): DuplicateRecord | undefined => {
    return data.find(r => {
      if (r.itemType === 'DUPLICATE_DATA') {
        const d = r as DuplicateDataRecord
        return d.organizerItemId === leftKey && d.sourceReferenceId === rightKey
      }
      const d = r as DuplicateDocRecord
      return `${d.docIdA}` === leftKey && `${d.docIdB}` === rightKey
    })
  }

  const handleMatch = () => {
    if (!selectedLeft || !selectedRight) return
    const rec = findPair(selectedLeft, selectedRight)
    if (rec) {
      accept(getItemKey(rec), 'duplicate', rec.confidenceLevel, 'manual')
      setSelectedLeft(null)
      setSelectedRight(null)
    }
  }

  const handleUnmatch = (r: DuplicateRecord) => {
    undo(getItemKey(r), 'duplicate', r.confidenceLevel)
  }

  /* Extract distinct organizer items and source items from unmatched */
  const organizerItems = useMemo(() => {
    return unmatched
      .filter(r => r.itemType === 'DUPLICATE_DATA')
      .map(r => {
        const d = r as DuplicateDataRecord
        return { id: d.organizerItemId, label: r.documentRefA?.formLabel ?? d.organizerItemId, formType: r.documentRefA?.formType ?? 'Unknown', record: r }
      })
      .filter((item, idx, arr) => arr.findIndex(x => x.id === item.id) === idx)
  }, [unmatched])

  const sourceItems = useMemo(() => {
    return unmatched
      .filter(r => r.itemType === 'DUPLICATE_DATA')
      .map(r => {
        const d = r as DuplicateDataRecord
        return { id: d.sourceReferenceId, label: r.documentRefB?.formLabel ?? d.sourceReferenceId, formType: r.documentRefB?.formType ?? 'Unknown', record: r }
      })
      .filter((item, idx, arr) => arr.findIndex(x => x.id === item.id) === idx)
  }, [unmatched])

  /* AI suggestions: unmatched records with confidence >= 0.7 */
  const aiSuggestions = useMemo(() => {
    return unmatched
      .filter(r => r.confidenceLevel >= 0.7)
      .sort((a, b) => b.confidenceLevel - a.confidenceLevel)
  }, [unmatched])

  const canMatch = selectedLeft !== null && selectedRight !== null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Header bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)' }}>Duplicate Data</h2>
          <span style={{
            fontSize: '0.6875rem', fontWeight: 600, padding: '0.1875rem 0.5rem',
            borderRadius: '1rem', backgroundColor: 'oklch(0.94 0.04 145)',
            color: 'oklch(0.35 0.14 145)',
          }}>
            {matched.length} matched
          </span>
          <span style={{
            fontSize: '0.6875rem', fontWeight: 600, padding: '0.1875rem 0.5rem',
            borderRadius: '1rem', backgroundColor: 'oklch(0.94 0.04 60)',
            color: 'oklch(0.45 0.14 60)',
          }}>
            {unmatched.length} unmatched
          </span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'oklch(0.45 0.01 260)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showAutoMatched}
            onChange={e => setShowAutoMatched(e.target.checked)}
            style={{ accentColor: 'oklch(0.45 0.18 240)' }}
          />
          Show Auto-Matched
        </label>
      </div>

      {/* ── AI Suggestions bar ── */}
      {aiSuggestions.length > 0 && (
        <details open style={{
          borderRadius: 'var(--radius)', overflow: 'hidden',
          border: '0.0625rem solid oklch(0.91 0.03 240)',
        }}>
          <summary style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: 'oklch(0.97 0.005 240)',
            cursor: 'pointer', listStyle: 'none',
            fontSize: '0.75rem', fontWeight: 700, color: 'var(--ai-accent)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            <Sparkles style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
            AI Suggested Matches ({aiSuggestions.length})
          </summary>
          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'oklch(0.98 0.003 240)' }}>
            {aiSuggestions.map(r => {
              const key = getItemKey(r)
              const level = getConfidenceLevel(r.confidenceLevel)
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.4375rem 0',
                  borderBlockEnd: '0.0625rem solid oklch(0.94 0.003 260)',
                  fontSize: '0.8125rem',
                }}>
                  <ConfidenceBadge score={r.confidenceLevel} />
                  <span style={{ fontWeight: 600, color: 'oklch(0.3 0.01 260)', flex: '1 1 0', minInlineSize: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.documentRefA?.formLabel ?? '?'}
                  </span>
                  <ArrowRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.01 260)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: 'oklch(0.3 0.01 260)', flex: '1 1 0', minInlineSize: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.documentRefB?.formLabel ?? '?'}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'oklch(0.45 0.01 260)', flexShrink: 0 }}>
                    {r.decisionRule}
                  </span>
                  <Button variant="default" size="sm" onClick={() => accept(key, 'duplicate', r.confidenceLevel, 'auto')} style={{ fontSize: '0.6875rem', flexShrink: 0 }}>
                    <Link2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Match
                  </Button>
                </div>
              )
            })}
          </div>
        </details>
      )}

      {/* ── Side-by-side columns with center action bar ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        gap: '0',
        borderRadius: 'var(--radius)', overflow: 'hidden',
        border: '0.0625rem solid oklch(0.88 0.01 260)',
        minBlockSize: '28rem',
      }}>
        {/* ── Left: Organizer Pages ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '0.625rem 0.75rem',
            backgroundColor: 'oklch(0.15 0.01 260)',
            color: 'oklch(1 0 0)',
            fontSize: '0.8125rem', fontWeight: 700, textAlign: 'center',
          }}>
            Organizer Pages
          </div>
          {/* Column headers */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            padding: '0.3125rem 0.5rem',
            backgroundColor: 'oklch(0.96 0.003 260)',
            borderBlockEnd: '0.0625rem solid oklch(0.92 0.003 260)',
            fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            <span style={{ inlineSize: '1.5rem', flexShrink: 0 }} />
            <span style={{ flex: '1 1 0' }}>InputForm</span>
            <span style={{ inlineSize: '5rem', flexShrink: 0, textAlign: 'end' }}>Form Type</span>
          </div>
          {/* Scrollable list */}
          <div style={{ flex: '1 1 0', overflow: 'auto' }}>
            {organizerItems.length === 0 ? (
              <p style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.8125rem', color: 'oklch(0.55 0.01 260)', fontStyle: 'italic' }}>
                All organizer pages are matched
              </p>
            ) : organizerItems.map((item, idx) => {
              const isSelected = selectedLeft === item.id
              const isSuggested = aiSuggestions.some(s => {
                if (s.itemType === 'DUPLICATE_DATA') return (s as DuplicateDataRecord).organizerItemId === item.id
                return false
              })
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedLeft(isSelected ? null : item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    inlineSize: '100%', padding: '0.625rem 0.5rem',
                    border: 'none', cursor: 'pointer', textAlign: 'start',
                    borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.95 0.003 260)' : 'none',
                    backgroundColor: isSelected
                      ? 'oklch(0.92 0.06 240)'
                      : isSuggested ? 'oklch(0.97 0.015 240 / 0.4)' : 'oklch(1 0 0)',
                    outline: isSelected ? '0.125rem solid oklch(0.5 0.18 240)' : 'none',
                    outlineOffset: '-0.125rem',
                    borderRadius: 0,
                  }}
                >
                  <span style={{ inlineSize: '1.5rem', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    <input
                      type="radio"
                      name="left-select"
                      checked={isSelected}
                      readOnly
                      style={{ accentColor: 'oklch(0.45 0.18 240)' }}
                    />
                  </span>
                  <span style={{
                    flex: '1 1 0', fontSize: '0.8125rem', fontWeight: 600,
                    color: 'oklch(0.3 0.12 240)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.label}
                  </span>
                  <span style={{
                    inlineSize: '5rem', flexShrink: 0, textAlign: 'end',
                    fontSize: '0.6875rem', color: 'oklch(0.5 0.01 260)',
                  }}>
                    {item.formType}
                  </span>
                </button>
              )
            })}
            {/* Value details for selected left item */}
            {selectedLeft && (() => {
              const rec = organizerItems.find(i => i.id === selectedLeft)?.record
              if (!rec?.comparedValues) return null
              return (
                <div style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'oklch(0.97 0.005 240)',
                  borderBlockStart: '0.0625rem solid oklch(0.92 0.005 260)',
                }}>
                  <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBlockEnd: '0.25rem' }}>
                    Values (Organizer)
                  </p>
                  {rec.comparedValues.map(cv => (
                    <div key={cv.field} style={{
                      display: 'flex', justifyContent: 'space-between', gap: '0.5rem',
                      padding: '0.125rem 0', fontSize: '0.75rem',
                    }}>
                      <span style={{ color: 'oklch(0.45 0.01 260)' }}>{cv.field}</span>
                      <span style={{ fontWeight: 600, color: 'oklch(0.25 0.01 260)', fontFamily: 'var(--font-mono)' }}>{cv.valueA}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>

        {/* ── Center: Action bar ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '0.75rem', padding: '1rem 0.5rem',
          borderInlineStart: '0.0625rem solid oklch(0.88 0.01 260)',
          borderInlineEnd: '0.0625rem solid oklch(0.88 0.01 260)',
          backgroundColor: 'oklch(0.97 0.003 260)',
          minInlineSize: '5.5rem',
        }}>
          <Button
            variant="default"
            size="sm"
            disabled={!canMatch}
            onClick={handleMatch}
            style={{
              gap: '0.25rem', fontSize: '0.6875rem',
              writingMode: 'horizontal-tb',
              opacity: canMatch ? 1 : 0.4,
            }}
          >
            <Link2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
            Match
          </Button>
          <div style={{
            inlineSize: '0.0625rem', blockSize: '2rem',
            backgroundColor: 'oklch(0.88 0.01 260)',
          }} />
          <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'oklch(0.55 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
            Select one<br />from each<br />side
          </span>
        </div>

        {/* ── Right: Source Documents ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '0.625rem 0.75rem',
            backgroundColor: 'oklch(0.15 0.01 260)',
            color: 'oklch(1 0 0)',
            fontSize: '0.8125rem', fontWeight: 700, textAlign: 'center',
          }}>
            Source Documents
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            padding: '0.3125rem 0.5rem',
            backgroundColor: 'oklch(0.96 0.003 260)',
            borderBlockEnd: '0.0625rem solid oklch(0.92 0.003 260)',
            fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            <span style={{ inlineSize: '1.5rem', flexShrink: 0 }} />
            <span style={{ flex: '1 1 0' }}>Recipients Name</span>
            <span style={{ inlineSize: '5rem', flexShrink: 0, textAlign: 'end' }}>Form Type</span>
          </div>
          <div style={{ flex: '1 1 0', overflow: 'auto' }}>
            {sourceItems.length === 0 ? (
              <p style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.8125rem', color: 'oklch(0.55 0.01 260)', fontStyle: 'italic' }}>
                All source documents are matched
              </p>
            ) : sourceItems.map((item, idx) => {
              const isSelected = selectedRight === item.id
              const isSuggested = aiSuggestions.some(s => {
                if (s.itemType === 'DUPLICATE_DATA') return (s as DuplicateDataRecord).sourceReferenceId === item.id
                return false
              })
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedRight(isSelected ? null : item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    inlineSize: '100%', padding: '0.625rem 0.5rem',
                    border: 'none', cursor: 'pointer', textAlign: 'start',
                    borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.95 0.003 260)' : 'none',
                    backgroundColor: isSelected
                      ? 'oklch(0.92 0.06 240)'
                      : isSuggested ? 'oklch(0.97 0.015 240 / 0.4)' : 'oklch(1 0 0)',
                    outline: isSelected ? '0.125rem solid oklch(0.5 0.18 240)' : 'none',
                    outlineOffset: '-0.125rem',
                    borderRadius: 0,
                  }}
                >
                  <span style={{ inlineSize: '1.5rem', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    <input
                      type="radio"
                      name="right-select"
                      checked={isSelected}
                      readOnly
                      style={{ accentColor: 'oklch(0.45 0.18 240)' }}
                    />
                  </span>
                  <span style={{
                    flex: '1 1 0', fontSize: '0.8125rem', fontWeight: 600,
                    color: 'oklch(0.3 0.12 240)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.label}
                  </span>
                  <span style={{
                    inlineSize: '5rem', flexShrink: 0, textAlign: 'end',
                    fontSize: '0.6875rem', color: 'oklch(0.5 0.01 260)',
                  }}>
                    {item.formType}
                  </span>
                </button>
              )
            })}
            {/* Value details for selected right item */}
            {selectedRight && (() => {
              const rec = sourceItems.find(i => i.id === selectedRight)?.record
              if (!rec?.comparedValues) return null
              return (
                <div style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'oklch(0.97 0.005 240)',
                  borderBlockStart: '0.0625rem solid oklch(0.92 0.005 260)',
                }}>
                  <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBlockEnd: '0.25rem' }}>
                    Values (Source)
                  </p>
                  {rec.comparedValues.map(cv => (
                    <div key={cv.field} style={{
                      display: 'flex', justifyContent: 'space-between', gap: '0.5rem',
                      padding: '0.125rem 0', fontSize: '0.75rem',
                    }}>
                      <span style={{ color: 'oklch(0.45 0.01 260)' }}>{cv.field}</span>
                      <span style={{ fontWeight: 600, color: 'oklch(0.25 0.01 260)', fontFamily: 'var(--font-mono)' }}>{cv.valueB}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* ── Matched pairs section ── */}
      {matched.length > 0 && (
        <details open style={{
          borderRadius: 'var(--radius)', overflow: 'hidden',
          border: '0.0625rem solid oklch(0.88 0.01 260)',
        }}>
          <summary style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 0.75rem',
            backgroundColor: 'oklch(0.15 0.01 260)',
            color: 'oklch(1 0 0)',
            cursor: 'pointer', listStyle: 'none',
            fontSize: '0.8125rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            <Check style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
            Matched ({matched.length})
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {matched.map((r, idx) => {
              const key = getItemKey(r)
              const isPreviewOpen = previewKey === key
              return (
                <div key={key} style={{
                  borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.93 0.003 260)' : 'none',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'oklch(0.985 0.01 145 / 0.2)',
                  }}>
                    <ConfidenceBadge score={r.confidenceLevel} />
                    <div style={{ flex: '1 1 0', minInlineSize: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'oklch(0.25 0.01 260)' }}>
                          {r.documentRefA?.formLabel ?? '?'}
                        </span>
                        <ArrowRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.15 145)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'oklch(0.25 0.01 260)' }}>
                          {r.documentRefB?.formLabel ?? '?'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.6875rem', color: 'oklch(0.5 0.01 260)', marginBlockStart: '0.125rem' }}>
                        {r.decisionRule} -- {r.decisionReason.slice(0, 80)}...
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                      <Button variant="outline" size="sm" onClick={() => setPreviewKey(isPreviewOpen ? null : key)} style={{ fontSize: '0.6875rem', gap: '0.25rem' }}>
                        {isPreviewOpen
                          ? <><EyeOff style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Hide</>
                          : <><Eye style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> View</>
                        }
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleUnmatch(r)} style={{ fontSize: '0.6875rem', gap: '0.25rem' }}>
                        <Unlink2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Unmatch
                      </Button>
                    </div>
                  </div>
                  {/* Inline field values */}
                  {r.comparedValues && r.comparedValues.length > 0 && (
                    <div style={{
                      display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
                      padding: '0.375rem 0.75rem',
                      backgroundColor: 'oklch(0.985 0.005 145 / 0.1)',
                      borderBlockStart: '0.0625rem solid oklch(0.94 0.01 145)',
                      fontSize: '0.6875rem',
                    }}>
                      {r.comparedValues.map(cv => (
                        <span key={cv.field} style={{
                          padding: '0.0625rem 0.375rem', borderRadius: '0.1875rem',
                          backgroundColor: cv.match ? 'oklch(0.95 0.02 145)' : 'oklch(0.95 0.04 25)',
                          color: cv.match ? 'oklch(0.35 0.12 145)' : 'oklch(0.4 0.14 25)',
                        }}>
                          {cv.field}: {cv.valueA}{!cv.match && ` / ${cv.valueB}`}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* PDF preview */}
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
                </div>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
