'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { AiIndicator } from '@/components/ai-indicator'
import { FieldComparison } from '@/components/field-comparison'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel, type SupersededRecord } from '@/lib/types'
import {
  Sparkles, Check, Undo2, FileText, AlertTriangle,
  Eye, EyeOff, ArrowRight, ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, FolderOpen
} from 'lucide-react'

/* ── helpers ── */

interface FormGroup {
  formType: string
  formEntity: string
  records: SupersededRecord[]
  originalCount: number
  supersededCount: number
  retainBothCount: number
  needsReview: boolean
  lowestConfidence: number
  averageConfidence: number
}

function groupByFormType(data: SupersededRecord[]): FormGroup[] {
  const map = new Map<string, SupersededRecord[]>()

  for (const r of data) {
    const key = r.documentRef?.formType ?? 'Unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }

  const groups: FormGroup[] = []
  for (const [formType, records] of map.entries()) {
    const entityParts = records[0].documentRef?.formLabel?.replace(formType, '').replace(/[()]/g, '').trim()
    groups.push({
      formType,
      formEntity: entityParts || formType,
      records,
      originalCount: records.filter(r => r.decisionType === 'Original').length,
      supersededCount: records.filter(r => r.decisionType === 'Superseded').length,
      retainBothCount: records.filter(r => r.decisionType === 'RetainBoth').length,
      needsReview: records.some(r => r.reviewRequired),
      lowestConfidence: Math.min(...records.map(r => r.confidenceLevel)),
      averageConfidence: records.reduce((sum, r) => sum + r.confidenceLevel, 0) / records.length,
    })
  }

  // sort: groups needing review first, then by lowest confidence ascending
  groups.sort((a, b) => {
    if (a.needsReview !== b.needsReview) return a.needsReview ? -1 : 1
    return a.lowestConfidence - b.lowestConfidence
  })

  return groups
}

/* ── main component ── */

export function SupersededClient({ data }: { data: SupersededRecord[] }) {
  const { decisions, accept, undo, acceptAllHighConfidence } = useDecisions()
  const groups = useMemo(() => groupByFormType(data), [data])

  // All groups expanded by default so category headers + records are immediately visible
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(groups.map(g => g.formType)))
  const [openDocId, setOpenDocId] = useState<number | null>(null)

  const highCount = data.filter(r => getConfidenceLevel(r.confidenceLevel) === 'high').length
  const totalOriginal = data.filter(r => r.decisionType === 'Original').length
  const totalSuperseded = data.filter(r => r.decisionType === 'Superseded').length
  const totalRetainBoth = data.filter(r => r.decisionType === 'RetainBoth').length
  const totalReview = data.filter(r => r.reviewRequired).length

  const toggleGroup = (formType: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(formType)) next.delete(formType)
      else next.add(formType)
      return next
    })
  }

  const handleAcceptAll = () => {
    acceptAllHighConfidence(
      data
        .filter(r => r.confidenceLevel >= 0.9)
        .map(r => ({ key: `sup-pg${r.engagementPageId}`, wizardType: 'superseded' as const, confidence: r.confidenceLevel }))
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Page header ── */}
      <header>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
          Superseded Review
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'oklch(0.5 0.01 260)', marginBlockStart: '0.25rem' }}>
          Review AI decisions grouped by form type. Expand each category to see paired original and superseded documents.
        </p>
      </header>

      {/* ── Summary bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        padding: '0.75rem 1rem', backgroundColor: 'oklch(0.97 0.005 260)',
        borderRadius: 'var(--radius)', border: '0.0625rem solid oklch(0.91 0.005 260)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.3 0 0)' }}>
          <FolderOpen style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.5 0 0)' }} />
          {groups.length} Form Types
        </span>
        <span style={pillStyle}>{data.length} Documents</span>
        <span style={{ ...pillStyle, backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
          {totalOriginal} Original
        </span>
        <span style={{ ...pillStyle, backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)' }}>
          {totalSuperseded} Superseded
        </span>
        {totalRetainBoth > 0 && (
          <span style={{ ...pillStyle, backgroundColor: 'oklch(0.94 0.04 250)', color: 'oklch(0.35 0.14 250)' }}>
            {totalRetainBoth} Retain Both
          </span>
        )}
        {totalReview > 0 && (
          <span style={{ ...pillStyle, backgroundColor: 'oklch(0.95 0.04 60)', color: 'oklch(0.45 0.15 60)' }}>
            {totalReview} Need Review
          </span>
        )}

        <div style={{ marginInlineStart: 'auto' }}>
          <Button variant="default" size="sm" onClick={handleAcceptAll}>
            <Check style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
            Accept All High Confidence ({highCount})
          </Button>
        </div>
      </div>

      {/* ── Category swimlanes ── */}
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.formType)
        const allGroupAccepted = group.records.every(r => decisions[`sup-pg${r.engagementPageId}`] === 'accepted')

        return (
          <section
            key={group.formType}
            style={{
              border: '0.0625rem solid oklch(0.88 0.01 260)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              backgroundColor: 'oklch(1 0 0)',
              boxShadow: '0 0.0625rem 0.1875rem oklch(0 0 0 / 0.06)',
            }}
          >
            {/* ── Category header ── */}
            <button
              type="button"
              onClick={() => toggleGroup(group.formType)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                inlineSize: '100%', padding: '1rem 1.25rem',
                backgroundColor: allGroupAccepted ? 'oklch(0.95 0.03 145 / 0.35)' : 'oklch(0.965 0.005 260)',
                border: 'none', cursor: 'pointer', textAlign: 'start',
                borderBlockEnd: isExpanded ? '0.125rem solid oklch(0.88 0.01 260)' : 'none',
                borderInlineStart: `0.25rem solid ${group.needsReview ? 'oklch(0.65 0.18 60)' : 'var(--ai-accent)'}`,
              }}
              aria-expanded={isExpanded}
            >
              {isExpanded
                ? <ChevronDown style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'oklch(0.45 0 0)', flexShrink: 0 }} />
                : <ChevronRight style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'oklch(0.45 0 0)', flexShrink: 0 }} />
              }

              {/* Form type icon + label */}
              <FileText style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'var(--ai-accent)', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', minInlineSize: 0 }}>
                <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
                  {group.formType}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'oklch(0.45 0.01 260)', fontWeight: 500 }}>
                  {group.formEntity}
                </span>
              </div>

              {/* Count badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                inlineSize: '1.5rem', blockSize: '1.5rem', borderRadius: '50%',
                backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)',
                fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0,
              }}>
                {group.records.length}
              </span>

              {/* Status pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                {group.originalCount > 0 && (
                  <span style={{ ...smallPillStyle, backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
                    {group.originalCount} Original
                  </span>
                )}
                {group.supersededCount > 0 && (
                  <span style={{ ...smallPillStyle, backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.40 0.18 25)' }}>
                    {group.supersededCount} Superseded
                  </span>
                )}
                {group.retainBothCount > 0 && (
                  <span style={{ ...smallPillStyle, backgroundColor: 'oklch(0.94 0.04 250)', color: 'oklch(0.35 0.14 250)' }}>
                    {group.retainBothCount} Retain
                  </span>
                )}
              </div>

              {/* Group-level confidence badge */}
              <ConfidenceBadge score={group.averageConfidence} />

              {/* Review/status indicator */}
              <div style={{ marginInlineStart: 'auto', flexShrink: 0 }}>
                {group.needsReview ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.55 0.18 60)' }}>
                    <CircleAlert style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                    Review Required
                  </span>
                ) : allGroupAccepted ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.45 0.15 145)' }}>
                    <CircleCheck style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                    All Accepted
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.55 0.15 145)' }}>
                    <CircleCheck style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                    Auto-Applied
                  </span>
                )}
              </div>
            </button>

            {/* ── Expanded: document pairs within this form type ── */}
            {isExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {group.records.map((r, idx) => {
                  const itemKey = `sup-pg${r.engagementPageId}`
                  const isAccepted = decisions[itemKey] === 'accepted'
                  const isDocOpen = openDocId === r.engagementPageId
                  const level = getConfidenceLevel(r.confidenceLevel)

                  const stampLabel = r.decisionType === 'Original' ? 'ORIGINAL' :
                    r.decisionType === 'Superseded' ? 'SUPERSEDED' : 'RETAIN BOTH'

                  const stampBg =
                    stampLabel === 'ORIGINAL' ? 'oklch(0.94 0.04 145)' :
                    stampLabel === 'SUPERSEDED' ? 'oklch(0.94 0.04 25)' :
                    'oklch(0.94 0.04 250)'
                  const stampFg =
                    stampLabel === 'ORIGINAL' ? 'oklch(0.35 0.14 145)' :
                    stampLabel === 'SUPERSEDED' ? 'oklch(0.40 0.18 25)' :
                    'oklch(0.35 0.14 250)'

                  const borderLeft =
                    level === 'high' ? 'var(--confidence-high)' :
                    level === 'medium' ? 'var(--confidence-medium)' :
                    'var(--confidence-low)'

                  return (
                    <article
                      key={r.engagementPageId}
                      style={{
                        borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.93 0.003 260)' : 'none',
                        borderInlineStartWidth: '0.25rem',
                        borderInlineStartStyle: 'solid',
                        borderInlineStartColor: borderLeft,
                        backgroundColor: isAccepted ? 'oklch(0.985 0.01 145 / 0.25)' : 'oklch(1 0 0)',
                      }}
                    >
                      {/* ── Record header row ── */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.75rem 1rem', gap: '0.5rem', flexWrap: 'wrap',
                      }}>
                        {/* Left: identity */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minInlineSize: 0 }}>
                          <AiIndicator />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                            Page {r.engagementPageId}
                          </span>
                          {r.decisionType === 'Superseded' && r.retainedPageId && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'oklch(0.5 0 0)' }}>
                              <ArrowRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                              Retained Page {r.retainedPageId}
                            </span>
                          )}
                          <span style={{
                            padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.625rem', fontWeight: 700,
                            backgroundColor: stampBg, color: stampFg,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            {stampLabel}
                          </span>
                          {r.reviewRequired && (
                            <Badge variant="outline" style={{ borderColor: 'var(--confidence-medium)', color: 'var(--confidence-medium)', fontSize: '0.625rem' }}>
                              Review
                            </Badge>
                          )}
                          {isAccepted && (
                            <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'oklch(0.45 0.15 145)' }}>
                              Accepted
                            </span>
                          )}
                        </div>

                        {/* Right: actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenDocId(isDocOpen ? null : r.engagementPageId)}
                            style={{ gap: '0.25rem', fontSize: '0.75rem' }}
                          >
                            {isDocOpen
                              ? <><EyeOff style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} /> Hide</>
                              : <><Eye style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} /> View Doc</>
                            }
                          </Button>
                          {isAccepted ? (
                            <Button variant="outline" size="sm" onClick={() => undo(itemKey, 'superseded', r.confidenceLevel)} style={{ fontSize: '0.75rem' }}>
                              <Undo2 style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} /> Undo
                            </Button>
                          ) : (
                            <Button variant="default" size="sm" onClick={() => accept(itemKey, 'superseded', r.confidenceLevel, 'manual')} style={{ fontSize: '0.75rem' }}>
                              <Check style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} /> Accept
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* ── AI Reasoning + Key Delta ── */}
                      <div style={{
                        padding: '0 1rem 0.75rem',
                        borderBlockStart: '0.0625rem solid oklch(0.95 0 0)',
                      }}>
                        <p style={{ fontSize: '0.6875rem', color: 'oklch(0.45 0 0)', paddingBlockStart: '0.5rem', marginBlockEnd: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Rule: {r.decisionRule} &middot; {r.appliedRuleSet}
                        </p>
                        <p style={{ fontSize: '0.8125rem', color: 'oklch(0.3 0.01 260)', lineHeight: '1.5' }}>
                          {r.decisionReason}
                        </p>

                        {/* Key delta callout: highlight the most important mismatch */}
                        {r.comparedValues && r.comparedValues.some(v => !v.match) && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            marginBlockStart: '0.5rem', padding: '0.4375rem 0.625rem',
                            backgroundColor: 'oklch(0.97 0.015 25 / 0.5)', borderRadius: '0.25rem',
                            border: '0.0625rem solid oklch(0.92 0.03 25)',
                            fontSize: '0.75rem', color: 'oklch(0.4 0.12 25)',
                          }}>
                            <AlertTriangle style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', flexShrink: 0 }} />
                            <span>
                              <strong>Key difference:</strong>{' '}
                              {(() => {
                                const mismatch = r.comparedValues!.find(v => !v.match)!
                                return `${mismatch.field}: "${mismatch.valueA}" vs "${mismatch.valueB}"`
                              })()}
                            </span>
                          </div>
                        )}

                        {/* Escalation */}
                        {r.escalationReason && (
                          <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                            marginBlockStart: '0.5rem', padding: '0.4375rem 0.625rem',
                            backgroundColor: 'oklch(0.96 0.04 60)', borderRadius: '0.25rem',
                            border: '0.0625rem solid oklch(0.88 0.08 60)',
                          }}>
                            <AlertTriangle style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.125rem' }} />
                            <p style={{ fontSize: '0.75rem', color: 'oklch(0.4 0.08 60)', lineHeight: '1.4' }}>
                              {r.escalationReason}
                            </p>
                          </div>
                        )}

                        {/* Field comparison inline+expandable */}
                        {r.comparedValues && r.comparedValues.length > 0 && (
                          <div style={{ marginBlockStart: '0.625rem' }}>
                            <FieldComparison
                              values={r.comparedValues}
                              labelA={r.documentRef?.formLabel ?? 'This Document'}
                              labelB={r.decisionType === 'Superseded' ? 'Superseding Version' : r.decisionType === 'RetainBoth' ? 'Compared Document' : 'Binder Search'}
                            />
                          </div>
                        )}
                      </div>

                      {/* ── Document preview: PDF page with stamp ── */}
                      {isDocOpen && r.documentRef && (
                        <div style={{
                          borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)',
                          padding: '1rem',
                          backgroundColor: 'oklch(0.975 0.003 260)',
                        }}>
                          {r.decisionType === 'Superseded' && r.retainedPageId ? (
                            <div>
                              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.25 0 0)', marginBlockEnd: '0.75rem' }}>
                                Side-by-Side Document Comparison
                              </p>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                <div>
                                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, marginBlockEnd: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'oklch(0.50 0.20 25)' }}>
                                    This Document (Superseded)
                                  </p>
                                  <PdfPageViewer documentRef={r.documentRef} stamp="SUPERSEDED" height="26rem" />
                                </div>
                                <ArrowRight style={{ inlineSize: '1.5rem', blockSize: '1.5rem', color: 'oklch(0.5 0 0)' }} aria-hidden="true" />
                                <div>
                                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, marginBlockEnd: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'oklch(0.45 0.17 145)' }}>
                                    Superseding (Retained)
                                  </p>
                                  <PdfPageViewer
                                    documentRef={{
                                      pdfPath: r.documentRef.pdfPath,
                                      pageNumber: r.retainedPageId,
                                      formType: r.documentRef.formType,
                                      formLabel: `${r.documentRef.formType} (Corrected) - Page ${r.retainedPageId}`,
                                    }}
                                    stamp="ORIGINAL"
                                    height="26rem"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : r.decisionType === 'RetainBoth' ? (
                            <div>
                              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.25 0 0)', marginBlockEnd: '0.75rem' }}>
                                Both Documents Retained
                              </p>
                              <PdfPageViewer documentRef={r.documentRef} stamp="RETAIN BOTH" height="30rem" />
                            </div>
                          ) : (
                            <div>
                              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.25 0 0)', marginBlockEnd: '0.75rem' }}>
                                Original Document (Retained)
                              </p>
                              <PdfPageViewer documentRef={r.documentRef} stamp="ORIGINAL" height="30rem" />
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
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

const smallPillStyle: React.CSSProperties = {
  padding: '0.125rem 0.375rem',
  borderRadius: '1rem',
  fontSize: '0.625rem',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}
