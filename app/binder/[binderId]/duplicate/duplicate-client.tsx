'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { FieldComparison } from '@/components/field-comparison'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel, type DuplicateRecord, type DuplicateDataRecord, type DuplicateDocRecord } from '@/lib/types'
import {
  Sparkles, Check, Undo2, FileText, AlertTriangle,
  Eye, EyeOff, ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, FolderOpen, Link2, Unlink2
} from 'lucide-react'

/* ── helpers ── */

function getItemKey(r: DuplicateRecord): string {
  if (r.itemType === 'DUPLICATE_DATA') return `dup-${(r as DuplicateDataRecord).organizerItemId}`
  const doc = r as DuplicateDocRecord
  return `dup-${doc.docIdA}-${doc.docIdB}`
}

function getRecordLabel(r: DuplicateRecord): string {
  if (r.itemType === 'DUPLICATE_DATA') {
    const d = r as DuplicateDataRecord
    return `${d.organizerItemId} / ${d.sourceReferenceId}`
  }
  const d = r as DuplicateDocRecord
  return `Doc ${d.docIdA} / Doc ${d.docIdB}`
}

/**
 * Determines if a record is "matched" based on runtime state.
 * A record is matched if:
 *  1. The user explicitly accepted/matched it (decisions[key] === 'accepted'), OR
 *  2. AI auto-matched it (confidence >= 0.9) AND showAutoMatched is on
 *     AND the user hasn't explicitly unmatched it (decisions[key] !== 'rejected')
 */
function isRecordMatched(
  r: DuplicateRecord,
  key: string,
  decisions: Record<string, string>,
  showAutoMatched: boolean
): boolean {
  if (decisions[key] === 'accepted') return true
  if (decisions[key] === 'rejected') return false
  // AI auto-match: high confidence items go to Matched when toggle is on
  if (showAutoMatched && r.confidenceLevel >= 0.9) return true
  return false
}

interface FormCategoryGroup {
  formType: string
  records: DuplicateRecord[]
  matchedRecords: DuplicateRecord[]
  unmatchedRecords: DuplicateRecord[]
  needsReview: boolean
  averageConfidence: number
  allSignedOff: boolean
}

function groupByFormCategory(
  data: DuplicateRecord[],
  decisions: Record<string, string>,
  showAutoMatched: boolean
): FormCategoryGroup[] {
  const map = new Map<string, DuplicateRecord[]>()

  for (const r of data) {
    const key = r.documentRefA?.formType ?? 'Unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }

  const groups: FormCategoryGroup[] = []
  for (const [formType, records] of map.entries()) {
    const matched = records.filter(r => isRecordMatched(r, getItemKey(r), decisions, showAutoMatched))
    const unmatched = records.filter(r => !isRecordMatched(r, getItemKey(r), decisions, showAutoMatched))
    groups.push({
      formType,
      records,
      matchedRecords: matched,
      unmatchedRecords: unmatched,
      needsReview: records.some(r => r.reviewRequired),
      averageConfidence: records.reduce((sum, r) => sum + r.confidenceLevel, 0) / records.length,
      allSignedOff: false,
    })
  }

  groups.sort((a, b) => {
    if (a.needsReview !== b.needsReview) return a.needsReview ? -1 : 1
    return a.averageConfidence - b.averageConfidence
  })

  return groups
}

/* ── main component ── */

export function DuplicateClient({ data }: { data: DuplicateRecord[] }) {
  const { decisions, accept, undo, acceptAllHighConfidence } = useDecisions()
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(['matched', 'unmatched']))
  const [openDocId, setOpenDocId] = useState<string | null>(null)
  const [showAutoMatched, setShowAutoMatched] = useState(true)

  const groups = useMemo(() => groupByFormCategory(data, decisions, showAutoMatched), [data, decisions, showAutoMatched])

  // Initialize category to first group if not set
  const effectiveCategory = selectedCategory || groups[0]?.formType || ''
  const activeGroup = groups.find(g => g.formType === effectiveCategory) ?? groups[0]
  const highCount = data.filter(r => getConfidenceLevel(r.confidenceLevel) === 'high').length
  const totalMatched = activeGroup?.matchedRecords.length ?? 0
  const totalUnmatched = activeGroup?.unmatchedRecords.length ?? 0

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
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

  /** Move a record to the Matched section */
  const matchRecord = (r: DuplicateRecord) => {
    accept(getItemKey(r), 'duplicate', r.confidenceLevel, 'manual')
  }

  /** Move a record back to the Unmatched section */
  const unmatchRecord = (r: DuplicateRecord) => {
    undo(getItemKey(r), 'duplicate', r.confidenceLevel)
  }

  /* ── Empty state ── */
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <header>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
            Duplicate Data
          </h1>
        </header>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '4rem 2rem', borderRadius: 'var(--radius)',
          border: '0.125rem dashed oklch(0.88 0.01 260)', backgroundColor: 'oklch(0.98 0.003 260)',
          textAlign: 'center', gap: '1rem',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            inlineSize: '3.5rem', blockSize: '3.5rem', borderRadius: '50%',
            backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.40 0.15 145)',
          }}>
            <Check style={{ inlineSize: '1.75rem', blockSize: '1.75rem' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)', marginBlockEnd: '0.375rem' }}>
              No Duplicates Found
            </p>
            <p style={{ fontSize: '0.875rem', color: 'oklch(0.5 0.01 260)', maxInlineSize: '28rem' }}>
              The AI scanned all organizer pages and source documents in this binder and found no duplicate data or documents.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Page header ── */}
      <header>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
          Duplicate Data
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'oklch(0.5 0.01 260)', marginBlockStart: '0.25rem' }}>
          Review AI-matched duplicate data and documents. Select a form category to see matched and unmatched items.
        </p>
      </header>

      {/* ── Instructions (collapsible) ── */}
      <details style={{
        borderRadius: 'var(--radius)', overflow: 'hidden',
        border: '0.0625rem solid oklch(0.91 0.005 260)',
      }}>
        <summary style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem',
          fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.3 0.01 260)',
          backgroundColor: 'oklch(0.98 0.003 260)',
          cursor: 'pointer', listStyle: 'none',
        }}>
          <ChevronRight style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0.01 260)' }} />
          Instructions
        </summary>
        <div style={{
          padding: '0.625rem 1rem 0.75rem 2rem',
          fontSize: '0.8125rem', lineHeight: '1.6', color: 'oklch(0.4 0.01 260)',
          backgroundColor: 'oklch(0.99 0.002 260)',
        }}>
          <p>Select duplicate Source Document and Organizer amounts and then click "Match". Click the Dup. icon under the Organizer Pages or Source Documents panel to mark/unmark any duplicate data.</p>
        </div>
      </details>

      {/* ── Form category tabs (dynamic) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.125rem',
        borderBlockEnd: '0.125rem solid oklch(0.91 0.005 260)',
        paddingBlockEnd: '0',
        overflowX: 'auto',
      }}>
        {/* Overflow indicator */}
        {groups.length > 5 && (
          <span style={{
            padding: '0.5rem 0.625rem',
            fontSize: '1rem', color: 'oklch(0.45 0.01 260)',
            cursor: 'default',
          }}>
            ...
          </span>
        )}

        {groups.map(g => {
          const isActive = g.formType === effectiveCategory
          const allAccepted = g.records.every(r => decisions[getItemKey(r)] === 'accepted')
          return (
            <button
              key={g.formType}
              type="button"
              onClick={() => setSelectedCategory(g.formType)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.625rem 1rem',
                border: 'none', cursor: 'pointer',
                backgroundColor: 'transparent',
                borderBlockEnd: isActive ? '0.1875rem solid oklch(0.3 0.01 260)' : '0.1875rem solid transparent',
                marginBlockEnd: '-0.125rem',
                fontSize: '0.8125rem', fontWeight: isActive ? 700 : 600,
                color: isActive ? 'oklch(0.2 0.01 260)' : 'oklch(0.45 0.01 260)',
                whiteSpace: 'nowrap',
              }}
            >
              FORM {g.formType}
              {g.needsReview && (
                <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)' }} />
              )}
              {allAccepted && (
                <CircleCheck style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.45 0.15 145)' }} />
              )}
            </button>
          )
        })}

        {/* Show Auto-Matched toggle */}
        <label style={{
          marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem',
          fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.4 0.01 260)',
          cursor: 'pointer', paddingInlineEnd: '0.25rem', flexShrink: 0,
        }}>
          <input
            type="checkbox"
            checked={showAutoMatched}
            onChange={() => setShowAutoMatched(prev => !prev)}
            style={{ inlineSize: '0.875rem', blockSize: '0.875rem', accentColor: 'oklch(0.45 0.18 240)' }}
          />
          Show Auto-Matched
        </label>
      </div>

      {/* ── Summary bar ── */}
      {activeGroup && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
          padding: '0.625rem 1rem', backgroundColor: 'oklch(0.97 0.005 260)',
          borderRadius: 'var(--radius)', border: '0.0625rem solid oklch(0.91 0.005 260)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.3 0 0)' }}>
            <FolderOpen style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.5 0 0)' }} />
            {activeGroup.formType}
          </span>
          <span style={pillStyle}>{activeGroup.records.length} Pairs</span>
          <span style={{ ...pillStyle, backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
            {activeGroup.matchedRecords.length} Matched
          </span>
          <span style={{ ...pillStyle, backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)' }}>
            {activeGroup.unmatchedRecords.length} Unmatched
          </span>
          {activeGroup.needsReview && (
            <span style={{ ...pillStyle, backgroundColor: 'oklch(0.95 0.04 60)', color: 'oklch(0.45 0.15 60)' }}>
              Needs Review
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginInlineStart: 'auto' }}>
            <Button variant="default" size="sm" onClick={handleAcceptAll}>
              <Check style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
              Accept All High Confidence ({highCount})
            </Button>
            <Button variant="outline" size="sm">
              Category Sign Off
            </Button>
          </div>
        </div>
      )}

      {activeGroup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* ── MATCHED section ── */}
          <section style={{
            border: '0.0625rem solid oklch(0.88 0.01 260)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden', backgroundColor: 'oklch(1 0 0)',
            boxShadow: '0 0.0625rem 0.1875rem oklch(0 0 0 / 0.06)',
          }}>
            <button
              type="button"
              onClick={() => toggleSection('matched')}
              aria-expanded={expandedSections.has('matched')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                inlineSize: '100%', padding: '0.75rem 1.25rem',
                backgroundColor: 'oklch(0.2 0.01 260)', color: 'oklch(1 0 0)',
                border: 'none', cursor: 'pointer', textAlign: 'start',
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Matched
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                inlineSize: '1.375rem', blockSize: '1.375rem', borderRadius: '50%',
                backgroundColor: 'oklch(0.45 0.15 145)', fontSize: '0.6875rem', fontWeight: 700,
              }}>
                {activeGroup.matchedRecords.length}
              </span>
              <span style={{ marginInlineStart: 'auto' }}>
                {expandedSections.has('matched')
                  ? <ChevronDown style={{ inlineSize: '1rem', blockSize: '1rem' }} />
                  : <ChevronRight style={{ inlineSize: '1rem', blockSize: '1rem' }} />
                }
              </span>
            </button>

            {expandedSections.has('matched') && activeGroup.matchedRecords.length > 0 && (() => {
              const firstRec = activeGroup.matchedRecords[0]
              const groupCompared = activeGroup.matchedRecords.flatMap(r => r.comparedValues ?? [])
                .filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)

              return (
                <div>
                  {/* Group-level AI Analysis */}
                  <details open style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                    <summary style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.625rem 1.25rem',
                      fontSize: '0.75rem', fontWeight: 700,
                      color: 'var(--ai-accent)',
                      backgroundColor: 'oklch(0.97 0.005 240)',
                      cursor: 'pointer', listStyle: 'none',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      <Sparkles style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                      AI Analysis
                      {firstRec.reviewRequired && (
                        <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)', marginInlineStart: '0.25rem' }} />
                      )}
                      <span style={{
                        marginInlineStart: 'auto',
                        fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                        color: 'oklch(0.45 0.01 260)',
                      }}>
                        {firstRec.appliedRuleSet} / {firstRec.decisionRule}
                      </span>
                    </summary>
                    <div style={{
                      padding: '0.75rem 1.25rem', backgroundColor: 'oklch(0.98 0.003 240)',
                      display: 'flex', flexDirection: 'column', gap: '0.625rem',
                    }}>
                      <p style={{ fontSize: '0.8125rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>
                        {firstRec.decisionReason}
                      </p>

                      {firstRec.escalationReason && (
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                          padding: '0.4375rem 0.625rem', borderRadius: '0.25rem',
                          backgroundColor: 'oklch(0.96 0.04 60)', border: '0.0625rem solid oklch(0.88 0.08 60)',
                        }}>
                          <AlertTriangle style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                          <div>
                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.5 0.16 60)' }}>Escalation</p>
                            <p style={{ fontSize: '0.75rem', color: 'oklch(0.35 0.1 60)', lineHeight: '1.4' }}>{firstRec.escalationReason}</p>
                          </div>
                        </div>
                      )}

                      {groupCompared.some(v => !v.match) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3125rem' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.45 0.12 25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Key Differences
                          </span>
                          {groupCompared.filter(v => !v.match).map(v => (
                            <div key={v.field} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.35 0.01 260)' }}>{v.field}:</span>
                              <span style={{ fontSize: '0.625rem', padding: '0.0625rem 0.3125rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.14 25)' }}>
                                {v.valueA}
                              </span>
                              <span style={{ fontSize: '0.625rem', color: 'oklch(0.55 0.01 260)' }}>&rarr;</span>
                              <span style={{ fontSize: '0.625rem', padding: '0.0625rem 0.3125rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.12 145)' }}>
                                {v.valueB}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {groupCompared.length > 0 && (
                        <details style={{
                          marginBlockStart: '0.25rem', borderRadius: '0.25rem', overflow: 'hidden',
                          border: '0.0625rem solid oklch(0.92 0.005 260)',
                        }}>
                          <summary style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.4375rem 0.625rem',
                            fontSize: '0.6875rem', fontWeight: 700,
                            color: 'oklch(0.35 0.01 260)', backgroundColor: 'oklch(0.97 0.003 260)',
                            cursor: 'pointer', listStyle: 'none',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                            Field Comparison
                            <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)' }}>
                              {groupCompared.filter(v => !v.match).length} of {groupCompared.length} differ
                            </span>
                          </summary>
                          <div style={{ padding: '0.5rem 0.625rem', backgroundColor: 'oklch(0.99 0.002 260)' }}>
                            <FieldComparison
                              values={groupCompared}
                              labelA={firstRec.documentRefA?.formLabel ?? 'Doc A'}
                              labelB={firstRec.documentRefB?.formLabel ?? 'Doc B'}
                            />
                          </div>
                        </details>
                      )}
                    </div>
                  </details>

                  {/* Record rows */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 5rem 5rem 9rem',
                    alignItems: 'center', gap: '0.5rem',
                    padding: '0.375rem 1.25rem',
                    backgroundColor: 'oklch(0.97 0.003 260)',
                    borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                    fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    <span>Organizer / Source</span>
                    <span>Match Type</span>
                    <span>Conf.</span>
                    <span>Status</span>
                    <span style={{ textAlign: 'end' }}>Actions</span>
                  </div>

                  {activeGroup.matchedRecords.map((r, idx) => {
                    const itemKey = getItemKey(r)
                    const isAccepted = decisions[itemKey] === 'accepted'
                    const isDocOpen = openDocId === itemKey

                    return (
                      <article
                        key={itemKey}
                        style={{
                          borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.93 0.003 260)' : 'none',
                          backgroundColor: isAccepted ? 'oklch(0.985 0.01 145 / 0.25)' : 'oklch(1 0 0)',
                        }}
                      >
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 5rem 5rem 9rem',
                          alignItems: 'center', gap: '0.5rem',
                          padding: '0.625rem 1.25rem',
                        }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.2 0.01 260)' }}>
                            {getRecordLabel(r)}
                          </span>
                          <span style={{
                            fontSize: '0.625rem', fontWeight: 700,
                            padding: '0.125rem 0.4375rem', borderRadius: '1rem',
                            backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            justifySelf: 'start',
                          }}>
                            {r.itemType === 'DUPLICATE_DATA' ? (r as DuplicateDataRecord).matchType : 'Doc Match'}
                          </span>
                          <ConfidenceBadge score={r.confidenceLevel} />
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 600,
                            color: isAccepted ? 'oklch(0.45 0.15 145)' : 'oklch(0.5 0.01 260)',
                          }}>
                            {isAccepted ? 'Accepted' : 'Pending'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'flex-end' }}>
                            <Button
                              variant="outline" size="sm"
                              onClick={() => setOpenDocId(isDocOpen ? null : itemKey)}
                              style={{ gap: '0.25rem', fontSize: '0.6875rem' }}
                            >
                              {isDocOpen
                                ? <><EyeOff style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Hide</>
                                : <><Eye style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> View</>
                              }
                            </Button>
                            {isAccepted ? (
                              <Button variant="outline" size="sm" onClick={() => undo(itemKey, 'duplicate', r.confidenceLevel)} style={{ fontSize: '0.6875rem' }}>
                                <Undo2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Undo
                              </Button>
                            ) : (
                              <Button variant="default" size="sm" onClick={() => accept(itemKey, 'duplicate', r.confidenceLevel, 'manual')} style={{ fontSize: '0.6875rem' }}>
                                <Check style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Accept
                              </Button>
                            )}
                          </div>
                        </div>

                        {isDocOpen && (r.documentRefA || r.documentRefB) && (
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                            borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)',
                            padding: '1rem', backgroundColor: 'oklch(0.975 0.003 260)',
                          }}>
                            {r.documentRefA && (
                              <div>
                                <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', marginBlockEnd: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  {r.documentRefA.formLabel}
                                </p>
                                <PdfPageViewer documentRef={r.documentRefA} stamp="DOC A" height="22rem" />
                              </div>
                            )}
                            {r.documentRefB && (
                              <div>
                                <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', marginBlockEnd: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  {r.documentRefB.formLabel}
                                </p>
                                <PdfPageViewer documentRef={r.documentRefB} stamp="DOC B" height="22rem" />
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )
            })()}

            {expandedSections.has('matched') && activeGroup.matchedRecords.length === 0 && (
              <div style={{
                padding: '2rem', textAlign: 'center',
                fontSize: '0.8125rem', color: 'oklch(0.5 0.01 260)',
              }}>
                No matched items in this category yet.
              </div>
            )}
          </section>

          {/* ── Match / Unmatch action bar ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            padding: '0.5rem',
          }}>
            <Button variant="outline" size="sm" style={{ gap: '0.375rem', fontSize: '0.8125rem' }}>
              <Unlink2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
              Unmatch
            </Button>
            <Button variant="outline" size="sm" style={{ gap: '0.375rem', fontSize: '0.8125rem' }}>
              <Link2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
              Match
            </Button>
          </div>

          {/* ── UNMATCHED section ── */}
          <section style={{
            border: '0.0625rem solid oklch(0.88 0.01 260)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden', backgroundColor: 'oklch(1 0 0)',
            boxShadow: '0 0.0625rem 0.1875rem oklch(0 0 0 / 0.06)',
          }}>
            <button
              type="button"
              onClick={() => toggleSection('unmatched')}
              aria-expanded={expandedSections.has('unmatched')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                inlineSize: '100%', padding: '0.75rem 1.25rem',
                backgroundColor: 'oklch(0.25 0.02 240)', color: 'oklch(1 0 0)',
                border: 'none', cursor: 'pointer', textAlign: 'start',
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Unmatched
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                inlineSize: '1.375rem', blockSize: '1.375rem', borderRadius: '50%',
                backgroundColor: 'oklch(0.55 0.18 25)', fontSize: '0.6875rem', fontWeight: 700,
              }}>
                {activeGroup.unmatchedRecords.length}
              </span>
              <span style={{ marginInlineStart: 'auto' }}>
                {expandedSections.has('unmatched')
                  ? <ChevronDown style={{ inlineSize: '1rem', blockSize: '1rem' }} />
                  : <ChevronRight style={{ inlineSize: '1rem', blockSize: '1rem' }} />
                }
              </span>
            </button>

            {expandedSections.has('unmatched') && activeGroup.unmatchedRecords.length > 0 && (() => {
              const firstRec = activeGroup.unmatchedRecords[0]
              const groupCompared = activeGroup.unmatchedRecords.flatMap(r => r.comparedValues ?? [])
                .filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)

              return (
                <div>
                  {/* Group-level AI Analysis */}
                  <details open style={{ borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)' }}>
                    <summary style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.625rem 1.25rem',
                      fontSize: '0.75rem', fontWeight: 700,
                      color: 'var(--ai-accent)',
                      backgroundColor: 'oklch(0.97 0.005 240)',
                      cursor: 'pointer', listStyle: 'none',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      <Sparkles style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                      AI Analysis
                      {firstRec.reviewRequired && (
                        <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)', marginInlineStart: '0.25rem' }} />
                      )}
                      <span style={{
                        marginInlineStart: 'auto',
                        fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                        color: 'oklch(0.45 0.01 260)',
                      }}>
                        {firstRec.appliedRuleSet} / {firstRec.decisionRule}
                      </span>
                    </summary>
                    <div style={{
                      padding: '0.75rem 1.25rem', backgroundColor: 'oklch(0.98 0.003 240)',
                      display: 'flex', flexDirection: 'column', gap: '0.625rem',
                    }}>
                      <p style={{ fontSize: '0.8125rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>
                        {firstRec.decisionReason}
                      </p>

                      {firstRec.escalationReason && (
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                          padding: '0.4375rem 0.625rem', borderRadius: '0.25rem',
                          backgroundColor: 'oklch(0.96 0.04 60)', border: '0.0625rem solid oklch(0.88 0.08 60)',
                        }}>
                          <AlertTriangle style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                          <div>
                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.5 0.16 60)' }}>Escalation</p>
                            <p style={{ fontSize: '0.75rem', color: 'oklch(0.35 0.1 60)', lineHeight: '1.4' }}>{firstRec.escalationReason}</p>
                          </div>
                        </div>
                      )}

                      {groupCompared.some(v => !v.match) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3125rem' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.45 0.12 25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Key Differences
                          </span>
                          {groupCompared.filter(v => !v.match).map(v => (
                            <div key={v.field} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.35 0.01 260)' }}>{v.field}:</span>
                              <span style={{ fontSize: '0.625rem', padding: '0.0625rem 0.3125rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.14 25)' }}>
                                {v.valueA}
                              </span>
                              <span style={{ fontSize: '0.625rem', color: 'oklch(0.55 0.01 260)' }}>&rarr;</span>
                              <span style={{ fontSize: '0.625rem', padding: '0.0625rem 0.3125rem', borderRadius: '0.125rem', backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.12 145)' }}>
                                {v.valueB}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {groupCompared.length > 0 && (
                        <details style={{
                          marginBlockStart: '0.25rem', borderRadius: '0.25rem', overflow: 'hidden',
                          border: '0.0625rem solid oklch(0.92 0.005 260)',
                        }}>
                          <summary style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.4375rem 0.625rem',
                            fontSize: '0.6875rem', fontWeight: 700,
                            color: 'oklch(0.35 0.01 260)', backgroundColor: 'oklch(0.97 0.003 260)',
                            cursor: 'pointer', listStyle: 'none',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                            Field Comparison
                            <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.5 0.01 260)' }}>
                              {groupCompared.filter(v => !v.match).length} of {groupCompared.length} differ
                            </span>
                          </summary>
                          <div style={{ padding: '0.5rem 0.625rem', backgroundColor: 'oklch(0.99 0.002 260)' }}>
                            <FieldComparison
                              values={groupCompared}
                              labelA={firstRec.documentRefA?.formLabel ?? 'Doc A'}
                              labelB={firstRec.documentRefB?.formLabel ?? 'Doc B'}
                            />
                          </div>
                        </details>
                      )}
                    </div>
                  </details>

                  {/* Instruction text */}
                  <p style={{
                    padding: '0.5rem 1.25rem', fontStyle: 'italic',
                    fontSize: '0.8125rem', color: 'oklch(0.35 0.01 260)',
                    borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                    backgroundColor: 'oklch(0.99 0.002 260)',
                  }}>
                    Select duplicate Source Document and Organizer amounts and then click &ldquo;Match&rdquo;.
                  </p>

                  {/* Split table: Organizer Pages | Source Documents */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)',
                  }}>
                    {/* Left: Organizer Pages */}
                    <div style={{ borderInlineEnd: '0.0625rem solid oklch(0.88 0.01 260)' }}>
                      <div style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'oklch(0.97 0.003 260)',
                        borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                        fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.3 0.01 260)',
                        textAlign: 'center',
                      }}>
                        Organizer Pages
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2rem 1fr 5rem',
                        alignItems: 'center', gap: '0.375rem',
                        padding: '0.3125rem 0.75rem',
                        backgroundColor: 'oklch(0.97 0.003 260)',
                        borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                        fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        <span>Sel</span>
                        <span>InputForm</span>
                        <span>Description</span>
                      </div>
                      {activeGroup.unmatchedRecords.map((r, idx) => (
                        <div
                          key={`org-${idx}`}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '2rem 1fr 5rem',
                            alignItems: 'center', gap: '0.375rem',
                            padding: '0.5rem 0.75rem',
                            borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.95 0.003 260)' : 'none',
                          }}
                        >
                          <input type="checkbox" style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', accentColor: 'oklch(0.45 0.18 240)' }} />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.3 0.12 240)', cursor: 'pointer' }}>
                            {r.documentRefA?.formLabel ?? 'Unknown'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'oklch(0.45 0.01 260)' }}>
                            {r.documentRefA?.formType ?? '-'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Right: Source Documents */}
                    <div>
                      <div style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'oklch(0.97 0.003 260)',
                        borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                        fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.3 0.01 260)',
                        textAlign: 'center',
                      }}>
                        Source Documents
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2rem 1fr 5rem',
                        alignItems: 'center', gap: '0.375rem',
                        padding: '0.3125rem 0.75rem',
                        backgroundColor: 'oklch(0.97 0.003 260)',
                        borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                        fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        <span>Sel</span>
                        <span>Recipients Name</span>
                        <span>Description</span>
                      </div>
                      {activeGroup.unmatchedRecords.map((r, idx) => (
                        <div
                          key={`src-${idx}`}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '2rem 1fr 5rem',
                            alignItems: 'center', gap: '0.375rem',
                            padding: '0.5rem 0.75rem',
                            borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.95 0.003 260)' : 'none',
                            backgroundColor: idx % 2 === 0 ? 'oklch(0.97 0.01 240 / 0.2)' : 'transparent',
                          }}
                        >
                          <input type="checkbox" style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', accentColor: 'oklch(0.45 0.18 240)' }} />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.3 0.12 240)', cursor: 'pointer' }}>
                            {r.documentRefB?.formLabel ?? 'Unknown'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'oklch(0.45 0.01 260)' }}>
                            {r.documentRefB?.formType ?? '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}

            {expandedSections.has('unmatched') && activeGroup.unmatchedRecords.length === 0 && (
              <div style={{
                padding: '2rem', textAlign: 'center',
                fontSize: '0.8125rem', color: 'oklch(0.5 0.01 260)',
              }}>
                All items in this category are matched.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

/* ── style constants ── */

const pillStyle: React.CSSProperties = {
  padding: '0.1875rem 0.5rem',
  borderRadius: '1rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  backgroundColor: 'oklch(0.94 0.005 260)',
  color: 'oklch(0.35 0.01 260)',
}
