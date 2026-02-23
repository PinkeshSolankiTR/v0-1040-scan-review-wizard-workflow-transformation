'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { AiIndicator } from '@/components/ai-indicator'
import { FieldComparison } from '@/components/field-comparison'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel, type SupersededRecord } from '@/lib/types'
import { Sparkles, Check, Undo2, FileText, AlertTriangle, Eye, EyeOff } from 'lucide-react'

export function SupersededClient({ data }: { data: SupersededRecord[] }) {
  const { decisions, accept, undo, acceptAllHighConfidence } = useDecisions()
  const [openDocId, setOpenDocId] = useState<number | null>(null)
  const highCount = data.filter(r => getConfidenceLevel(r.confidenceLevel) === 'high').length

  const handleAcceptAll = () => {
    acceptAllHighConfidence(
      data
        .filter(r => r.confidenceLevel >= 0.9)
        .map(r => ({ key: `sup-pg${r.engagementPageId}`, wizardType: 'superseded' as const, confidence: r.confidenceLevel }))
    )
  }

  function stampFor(dt: string) {
    if (dt === 'Original') return 'ORIGINAL' as const
    if (dt === 'Superseded') return 'SUPERSEDED' as const
    return 'RETAIN' as const
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page header */}
      <header>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>Superseded Review</h1>
        <p style={{ fontSize: '0.875rem', color: 'oklch(0.5 0.01 260)', marginBlockStart: '0.25rem' }}>
          Review AI decisions on original vs. superseded documents. Click <strong>View Doc</strong> to see the actual form with a stamp overlay.
        </p>
      </header>

      {/* Bulk actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
        padding: '0.75rem 1rem', backgroundColor: 'oklch(0.97 0.005 260)',
        borderRadius: 'var(--radius)', border: '0.0625rem solid oklch(0.91 0.005 260)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'oklch(0.35 0 0)' }}>
          <Sparkles style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--ai-accent)' }} />
          <strong>{data.length}</strong> records &middot; <strong>{highCount}</strong> auto-applicable
        </span>
        <Button variant="default" size="sm" onClick={handleAcceptAll}>
          <Check style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
          Accept All High Confidence ({highCount})
        </Button>
      </div>

      {/* Record cards */}
      {data.map((r) => {
        const itemKey = `sup-pg${r.engagementPageId}`
        const isAccepted = decisions[itemKey] === 'accepted'
        const isDocOpen = openDocId === r.engagementPageId
        const stamp = stampFor(r.decisionType)
        const level = getConfidenceLevel(r.confidenceLevel)

        const borderColor =
          level === 'high' ? 'var(--confidence-high)' :
          level === 'medium' ? 'var(--confidence-medium)' :
          'var(--confidence-low)'

        const decisionBg =
          stamp === 'ORIGINAL' ? 'oklch(0.94 0.04 145)' :
          stamp === 'SUPERSEDED' ? 'oklch(0.94 0.04 25)' :
          'oklch(0.94 0.04 250)'
        const decisionFg =
          stamp === 'ORIGINAL' ? 'oklch(0.35 0.14 145)' :
          stamp === 'SUPERSEDED' ? 'oklch(0.40 0.18 25)' :
          'oklch(0.35 0.14 250)'

        return (
          <article
            key={r.engagementPageId}
            style={{
              border: '0.0625rem solid oklch(0.91 0.005 260)',
              borderRadius: 'var(--radius)',
              backgroundColor: isAccepted ? 'oklch(0.985 0.01 145 / 0.3)' : 'oklch(1 0 0)',
              overflow: 'hidden',
              borderInlineStartWidth: '0.25rem',
              borderInlineStartColor: borderColor,
            }}
          >
            {/* Top row: form label, badges, actions */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem 1rem', gap: '0.75rem', flexWrap: 'wrap',
            }}>
              {/* Left side: identity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', minInlineSize: 0 }}>
                <AiIndicator />
                <FileText style={{ inlineSize: '1rem', blockSize: '1rem', color: 'oklch(0.5 0 0)' }} />
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {r.documentRef?.formLabel ?? `Page ${r.engagementPageId}`}
                </span>
                <ConfidenceBadge score={r.confidenceLevel} />
                <span style={{
                  padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.6875rem', fontWeight: 700,
                  backgroundColor: decisionBg, color: decisionFg,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {r.decisionType === 'RetainBoth' ? 'Retain Both' : r.decisionType}
                </span>
                {r.reviewRequired && (
                  <Badge variant="outline" style={{ borderColor: 'var(--confidence-medium)', color: 'var(--confidence-medium)', fontSize: '0.6875rem' }}>
                    Review Required
                  </Badge>
                )}
                {isAccepted && (
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.45 0.15 145)' }}>
                    Accepted
                  </span>
                )}
              </div>

              {/* Right side: action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenDocId(isDocOpen ? null : r.engagementPageId)}
                  style={{ gap: '0.375rem' }}
                >
                  {isDocOpen
                    ? <><EyeOff style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} /> Hide Doc</>
                    : <><Eye style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} /> View Doc</>
                  }
                </Button>
                {isAccepted ? (
                  <Button variant="outline" size="sm" onClick={() => undo(itemKey, 'superseded', r.confidenceLevel)}>
                    <Undo2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} /> Undo
                  </Button>
                ) : (
                  <Button variant="default" size="sm" onClick={() => accept(itemKey, 'superseded', r.confidenceLevel, 'manual')}>
                    <Check style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} /> Accept
                  </Button>
                )}
              </div>
            </div>

            {/* AI Reasoning section */}
            <div style={{
              padding: '0 1rem 0.875rem',
              borderBlockStart: '0.0625rem solid oklch(0.94 0 0)',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'oklch(0.45 0 0)', paddingBlockStart: '0.625rem', marginBlockEnd: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rule: {r.decisionRule} &middot; {r.appliedRuleSet}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'oklch(0.3 0.01 260)', lineHeight: '1.55' }}>
                {r.decisionReason}
              </p>

              {/* Escalation callout */}
              {r.escalationReason && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                  marginBlockStart: '0.625rem', padding: '0.5rem 0.75rem',
                  backgroundColor: 'oklch(0.96 0.04 60)', borderRadius: '0.25rem',
                  border: '0.0625rem solid oklch(0.88 0.08 60)',
                }}>
                  <AlertTriangle style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.125rem' }} />
                  <p style={{ fontSize: '0.75rem', color: 'oklch(0.4 0.08 60)', lineHeight: '1.45' }}>
                    {r.escalationReason}
                  </p>
                </div>
              )}

              {/* Field comparison: inline summary + expandable side-by-side */}
              {r.comparedValues && r.comparedValues.length > 0 && (
                <div style={{ marginBlockStart: '0.75rem' }}>
                  <FieldComparison
                    values={r.comparedValues}
                    labelA={r.documentRef?.formLabel ?? 'Document A'}
                    labelB={r.decisionType === 'Superseded' ? 'Superseding Version' : r.decisionType === 'RetainBoth' ? 'Compared Document' : 'Binder Search'}
                  />
                </div>
              )}
            </div>

            {/* Document preview: actual PDF page in iframe with stamp overlay */}
            {isDocOpen && r.documentRef && (
              <div style={{
                borderBlockStart: '0.0625rem solid oklch(0.91 0.005 260)',
                padding: '1rem',
                backgroundColor: 'oklch(0.975 0.003 260)',
              }}>
                {r.decisionType === 'Superseded' && r.retainedPageId ? (
                  /* Side-by-side: this page (stamped SUPERSEDED) vs the retained page (stamped ORIGINAL) */
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.25 0 0)', marginBlockEnd: '0.75rem' }}>
                      Side-by-Side Document Comparison
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <p style={{
                          fontSize: '0.6875rem', fontWeight: 700, marginBlockEnd: '0.375rem',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          color: 'oklch(0.50 0.20 25)',
                        }}>
                          This Document (Superseded)
                        </p>
                        <PdfPageViewer
                          documentRef={r.documentRef}
                          stamp="SUPERSEDED"
                          height="28rem"
                        />
                      </div>
                      <div>
                        <p style={{
                          fontSize: '0.6875rem', fontWeight: 700, marginBlockEnd: '0.375rem',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          color: 'oklch(0.45 0.17 145)',
                        }}>
                          Superseding Document (Retained)
                        </p>
                        <PdfPageViewer
                          documentRef={{
                            pdfPath: r.documentRef.pdfPath,
                            pageNumber: r.retainedPageId,
                            formType: r.documentRef.formType,
                            formLabel: `${r.documentRef.formType} (Corrected) - Page ${r.retainedPageId}`,
                          }}
                          stamp="ORIGINAL"
                          height="28rem"
                        />
                      </div>
                    </div>
                  </div>
                ) : r.decisionType === 'RetainBoth' ? (
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.25 0 0)', marginBlockEnd: '0.75rem' }}>
                      Both Documents Retained
                    </p>
                    <PdfPageViewer
                      documentRef={r.documentRef}
                      stamp="RETAIN BOTH"
                      height="32rem"
                    />
                  </div>
                ) : (
                  /* Original retained — single document view */
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.25 0 0)', marginBlockEnd: '0.75rem' }}>
                      Original Document (Retained)
                    </p>
                    <PdfPageViewer
                      documentRef={r.documentRef}
                      stamp="ORIGINAL"
                      height="32rem"
                    />
                  </div>
                )}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
