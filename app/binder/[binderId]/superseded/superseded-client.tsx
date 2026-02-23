'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { FieldComparison } from '@/components/field-comparison'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel, type SupersededRecord } from '@/lib/types'
import {
  Sparkles, Check, Undo2, FileText, AlertTriangle,
  Eye, EyeOff, ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, FolderOpen
} from 'lucide-react'

/* ── helpers ── */

interface FormGroup {
  formType: string
  formEntity: string
  records: SupersededRecord[]
  originalCount: number
  supersededCount: number
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

  /* ── Empty state ── */
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <header>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
            Superseded Documents
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
              No Superseded Documents Found
            </p>
            <p style={{ fontSize: '0.875rem', color: 'oklch(0.5 0.01 260)', maxInlineSize: '28rem' }}>
              The AI scanned all documents in this binder and found only one version of each form.
              All documents are retained. There are no superseded or amended versions to review.
            </p>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '0.375rem',
            marginBlockStart: '0.5rem', fontSize: '0.8125rem', color: 'oklch(0.45 0.01 260)',
          }}>
            <p><strong>Documents scanned:</strong> W-2, Schedule C, 1099-MISC, Schedule K-1</p>
            <p><strong>Result:</strong> All retained &mdash; no corrected or amended versions detected</p>
          </div>
        </div>
      </div>
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

            {/* ── Expanded content ── */}
            {isExpanded && (() => {
              const groupSuperseded = group.records.find(r => r.decisionType === 'Superseded') ?? group.records[0]
              const groupOriginal = group.records.find(r => r.decisionType === 'Original')
              const avgConf = Math.round(group.averageConfidence * 100)
              const confColor = avgConf >= 90
                ? 'oklch(0.55 0.17 145)'
                : avgConf >= 70 ? 'oklch(0.65 0.14 80)' : 'oklch(0.6 0.18 15)'
              const groupCompared = group.records.flatMap(r => r.comparedValues ?? [])
                .filter((v, i, arr) => arr.findIndex(x => x.field === v.field) === i)

              return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>

                  {/* ── Group-level AI Analysis (collapsible) ── */}
                  <details open style={{
                    borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                  }}>
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
                      {groupSuperseded?.reviewRequired && (
                        <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.6 0.18 60)', marginInlineStart: '0.25rem' }} />
                      )}
                      <span style={{
                        marginInlineStart: 'auto',
                        fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                        color: 'oklch(0.45 0.01 260)',
                      }}>
                        {groupSuperseded?.appliedRuleSet} / {groupSuperseded?.decisionRule}
                      </span>
                    </summary>
                    <div style={{
                      padding: '0.75rem 1.25rem', backgroundColor: 'oklch(0.98 0.003 240)',
                      display: 'flex', flexDirection: 'column', gap: '0.625rem',
                    }}>
                      {/* Reasoning */}
                      <p style={{ fontSize: '0.8125rem', lineHeight: '1.5', color: 'oklch(0.3 0.01 260)' }}>
                        {groupSuperseded?.decisionReason}
                      </p>

                      {/* Escalation */}
                      {groupSuperseded?.escalationReason && (
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                          padding: '0.4375rem 0.625rem', borderRadius: '0.25rem',
                          backgroundColor: 'oklch(0.96 0.04 60)', border: '0.0625rem solid oklch(0.88 0.08 60)',
                        }}>
                          <AlertTriangle style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                          <div>
                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.5 0.16 60)' }}>Escalation</p>
                            <p style={{ fontSize: '0.75rem', color: 'oklch(0.35 0.1 60)', lineHeight: '1.4' }}>{groupSuperseded.escalationReason}</p>
                          </div>
                        </div>
                      )}

                      {/* Key differences */}
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

                      {/* Field comparison table */}
                      {groupCompared.length > 0 && (
                        <details style={{
                          marginBlockStart: '0.25rem',
                          borderRadius: '0.25rem', overflow: 'hidden',
                          border: '0.0625rem solid oklch(0.92 0.005 260)',
                        }}>
                          <summary style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.4375rem 0.625rem',
                            fontSize: '0.6875rem', fontWeight: 700,
                            color: 'oklch(0.35 0.01 260)',
                            backgroundColor: 'oklch(0.97 0.003 260)',
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
                              labelA={groupOriginal?.documentRef?.formLabel ?? 'Original'}
                              labelB={groupSuperseded?.documentRef?.formLabel ?? 'Superseded'}
                            />
                          </div>
                        </details>
                      )}
                    </div>
                  </details>

                  {/* ── Record rows (compact table) ── */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '5rem 6.5rem 1fr 9rem',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.375rem 1.25rem',
                    backgroundColor: 'oklch(0.97 0.003 260)',
                    borderBlockEnd: '0.0625rem solid oklch(0.93 0.003 260)',
                    fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    <span>Page</span>
                    <span>Type</span>
                    <span>Status</span>
                    <span style={{ textAlign: 'end' }}>Actions</span>
                  </div>

                  {group.records.map((r, idx) => {
                    const itemKey = `sup-pg${r.engagementPageId}`
                    const isAccepted = decisions[itemKey] === 'accepted'
                    const isDocOpen = openDocId === r.engagementPageId
                    const isSup = r.decisionType === 'Superseded'
                    const stampLabel = isSup ? 'SUPERSEDED' : 'ORIGINAL'

                    return (
                      <article
                        key={r.engagementPageId}
                        style={{
                          borderBlockStart: idx > 0 ? '0.0625rem solid oklch(0.93 0.003 260)' : 'none',
                          backgroundColor: isAccepted ? 'oklch(0.985 0.01 145 / 0.25)' : 'oklch(1 0 0)',
                        }}
                      >
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '5rem 6.5rem 1fr 9rem',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1.25rem',
                        }}>
                          {/* Page */}
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.2 0.01 260)' }}>
                            {r.engagementPageId}
                          </span>

                          {/* Type badge */}
                          <span style={{
                            fontSize: '0.625rem', fontWeight: 700,
                            padding: '0.125rem 0.4375rem', borderRadius: '1rem',
                            backgroundColor: isSup ? 'oklch(0.94 0.04 25)' : 'oklch(0.94 0.04 145)',
                            color: isSup ? 'oklch(0.40 0.18 25)' : 'oklch(0.35 0.14 145)',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            justifySelf: 'start',
                          }}>
                            {isSup ? 'Superseded' : 'Original'}
                          </span>

                          {/* Status */}
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 600,
                            color: isAccepted ? 'oklch(0.45 0.15 145)' : 'oklch(0.5 0.01 260)',
                          }}>
                            {isAccepted ? 'Accepted' : 'Pending'}
                          </span>

                          {/* Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'flex-end' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOpenDocId(isDocOpen ? null : r.engagementPageId)}
                              style={{ gap: '0.25rem', fontSize: '0.6875rem' }}
                            >
                              {isDocOpen
                                ? <><EyeOff style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Hide</>
                                : <><Eye style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> View</>
                              }
                            </Button>
                            {isAccepted ? (
                              <Button variant="outline" size="sm" onClick={() => undo(itemKey, 'superseded', r.confidenceLevel)} style={{ fontSize: '0.6875rem' }}>
                                <Undo2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Undo
                              </Button>
                            ) : (
                              <Button variant="default" size="sm" onClick={() => accept(itemKey, 'superseded', r.confidenceLevel, 'manual')} style={{ fontSize: '0.6875rem' }}>
                                <Check style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Accept
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Inline PDF preview (per record) */}
                        {isDocOpen && r.documentRef && (
                          <div style={{
                            borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)',
                            padding: '1rem',
                            backgroundColor: 'oklch(0.975 0.003 260)',
                          }}>
                            <PdfPageViewer documentRef={r.documentRef} stamp={stampLabel} height="30rem" />
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )
            })()}
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
