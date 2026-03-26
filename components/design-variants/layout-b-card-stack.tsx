'use client'

/**
 * LAYOUT B: "Card Stack"
 * Scrollable list of cards, each representing one document pair.
 * Collapsed by default -- shows form name, confidence, AI summary one-liner.
 * Expand to reveal field comparison and actions.
 * Like an email inbox: scan, decide, move on.
 */

import { useState, useMemo } from 'react'
import { useDecisions } from '@/contexts/decision-context'
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ArrowLeftRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
} from 'lucide-react'
import type { SupersededRecord, ComparedValue } from '@/lib/types'

/* ── Types ── */
interface FormGroup {
  formType: string
  formLabel: string
  records: SupersededRecord[]
  originalRecord: SupersededRecord | null
  supersededRecords: SupersededRecord[]
  avgConfidence: number
  mismatches: ComparedValue[]
  matches: ComparedValue[]
  summary: string
}

/* ── Group records ── */
function groupByFormType(data: SupersededRecord[]): FormGroup[] {
  const map = new Map<string, SupersededRecord[]>()
  for (const r of data) {
    const key = r.documentRef?.formType ?? 'Unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  const groups: FormGroup[] = []
  for (const [formType, records] of map.entries()) {
    const label = records[0].documentRef?.formLabel ?? formType
    const avg = records.reduce((s, r) => s + r.confidenceLevel, 0) / records.length
    const superseded = records.filter(r => r.decisionType === 'Superseded')
    const original = records.find(r => r.decisionType === 'Original') ?? null
    const vals = superseded[0]?.comparedValues ?? []
    const mismatches = vals.filter(v => !v.match)
    const matches = vals.filter(v => v.match)

    // Build one-line summary from first reason
    const firstReason = superseded[0]?.decisionReason.split('||')[0]?.split('|')[1] ?? ''

    groups.push({ formType, formLabel: label, records, originalRecord: original, supersededRecords: superseded, avgConfidence: avg, mismatches, matches, summary: firstReason })
  }
  return groups
}

function confLabel(score: number) {
  if (score >= 0.9) return 'High'
  if (score >= 0.7) return 'Moderate'
  return 'Low'
}
function confColor(score: number) {
  if (score >= 0.9) return 'var(--status-success)'
  if (score >= 0.7) return 'var(--status-warning)'
  return 'var(--status-error)'
}

/* ── Main Component ── */
export function LayoutBCardStack({ data }: { data: SupersededRecord[] }) {
  const { accept, undo } = useDecisions()
  const groups = useMemo(() => groupByFormType(data), [data])
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [actions, setActions] = useState<Map<number, 'accepted' | 'rejected' | 'reclassified'>>(new Map())

  const reviewedCount = actions.size
  const totalGroups = groups.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxInlineSize: '52rem', marginInline: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)', marginBlockEnd: '0.125rem' }}>
            Superseded Documents
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
            {totalGroups} document pairs to review
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.375rem 0.75rem', borderRadius: '1rem',
          backgroundColor: 'var(--surface-raised)', border: '0.0625rem solid var(--border)',
        }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--foreground)' }}>{reviewedCount}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>of {totalGroups} reviewed</span>
        </div>
      </div>

      {/* Bulk accept bar */}
      {reviewedCount === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.625rem 1rem', borderRadius: '0.375rem',
          backgroundColor: 'var(--status-info-subtle)', border: '0.0625rem solid var(--status-info-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--ai-accent)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--foreground)' }}>
              {groups.filter(g => g.avgConfidence >= 0.9).length} pairs have high confidence and can be bulk-accepted
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              groups.forEach((g, i) => {
                if (g.avgConfidence >= 0.9) {
                  for (const r of g.records) accept(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel, 'bulk')
                  setActions(prev => new Map(prev).set(i, 'accepted'))
                }
              })
            }}
            style={{
              padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.375rem',
              backgroundColor: 'var(--tr-primary)', color: 'var(--tr-primary-foreground)',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Accept All High Confidence
          </button>
        </div>
      )}

      {/* Card Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {groups.map((group, idx) => {
          const isExpanded = expandedIdx === idx
          const action = actions.get(idx)
          const isActioned = !!action

          return (
            <div
              key={group.formType}
              style={{
                border: '0.0625rem solid var(--border)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                backgroundColor: isActioned
                  ? action === 'accepted' ? 'var(--status-success-subtle)' : action === 'rejected' ? 'var(--surface-raised)' : 'var(--status-warning-subtle)'
                  : 'var(--card)',
                opacity: isActioned && !isExpanded ? 0.75 : 1,
                transition: 'opacity 0.2s, background-color 0.2s',
              }}
            >
              {/* Collapsed Row */}
              <button
                type="button"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  inlineSize: '100%', padding: '0.875rem 1rem',
                  border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                  textAlign: 'start',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minInlineSize: 0 }}>
                  {/* Status icon */}
                  {isActioned ? (
                    action === 'accepted' ? <CheckCircle2 style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'var(--status-success)', flexShrink: 0 }} /> :
                    action === 'rejected' ? <X style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'var(--muted-foreground)', flexShrink: 0 }} /> :
                    <ArrowLeftRight style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'var(--status-warning)', flexShrink: 0 }} />
                  ) : (
                    <FileText style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'var(--muted-foreground)', flexShrink: 0 }} />
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1, minInlineSize: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)', textDecoration: action === 'rejected' ? 'line-through' : 'none' }}>
                        {group.formType}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        {group.formLabel.replace(group.formType, '').replace(/[()]/g, '').trim()}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isActioned
                        ? action === 'accepted' ? 'Accepted' : action === 'rejected' ? 'Not Superseded' : 'Reclassified'
                        : group.summary
                      }
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  {/* Mismatch badge */}
                  {group.mismatches.length > 0 && !isActioned && (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.6875rem', fontWeight: 600,
                      padding: '0.125rem 0.375rem', borderRadius: '1rem',
                      backgroundColor: 'var(--status-warning-subtle)', color: 'var(--status-warning)',
                    }}>
                      <AlertTriangle style={{ inlineSize: '0.625rem', blockSize: '0.625rem' }} />
                      {group.mismatches.length}
                    </span>
                  )}

                  {/* Confidence pill */}
                  {!isActioned && (
                    <span style={{
                      fontSize: '0.6875rem', fontWeight: 700,
                      padding: '0.125rem 0.5rem', borderRadius: '1rem',
                      color: confColor(group.avgConfidence),
                      backgroundColor: `color-mix(in srgb, ${confColor(group.avgConfidence)} 10%, transparent)`,
                    }}>
                      {Math.round(group.avgConfidence * 100)}%
                    </span>
                  )}

                  {isExpanded
                    ? <ChevronUp style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--muted-foreground)' }} />
                    : <ChevronDown style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--muted-foreground)' }} />
                  }
                </div>
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div style={{ borderBlockStart: '0.0625rem solid var(--border)' }}>
                  {/* AI Reasoning */}
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--status-info-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <Sparkles style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--ai-accent)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {group.supersededRecords[0]?.decisionReason.split('||').map((part, i) => {
                          const text = part.split('|').slice(1).join('|').trim()
                          return <span key={i} style={{ fontSize: '0.8125rem', color: 'var(--foreground)', lineHeight: 1.5 }}>{text}</span>
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Field Differences only (matches hidden) */}
                  {group.mismatches.length > 0 && (
                    <div style={{ padding: '0.75rem 1rem', borderBlockStart: '0.0625rem solid var(--border)' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--status-warning)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {group.mismatches.length} field differences
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBlockStart: '0.375rem' }}>
                        {group.mismatches.map(v => (
                          <div key={v.field} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.375rem 0.625rem', borderRadius: '0.25rem',
                            backgroundColor: 'var(--status-warning-subtle)',
                          }}>
                            <span style={{ flex: '0 0 11rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>{v.field}</span>
                            <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--muted-foreground)', textDecoration: 'line-through' }}>{v.valueA}</span>
                            <ArrowRight style={{ inlineSize: '0.625rem', blockSize: '0.625rem', color: 'var(--muted-foreground)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--foreground)', fontWeight: 600 }}>{v.valueB}</span>
                          </div>
                        ))}
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)', marginBlockStart: '0.375rem', display: 'block' }}>
                        {group.matches.length} matching fields hidden
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', borderBlockStart: '0.0625rem solid var(--border)',
                    backgroundColor: isActioned
                      ? action === 'accepted' ? 'var(--status-success-subtle)' : action === 'rejected' ? 'var(--surface-raised)' : 'var(--status-warning-subtle)'
                      : 'transparent',
                  }}>
                    {isActioned ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', inlineSize: '100%', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                          {action === 'accepted' ? 'Accepted' : action === 'rejected' ? 'Not Superseded' : 'Reclassified'}
                        </span>
                        <button type="button" onClick={() => {
                          for (const r of group.records) undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
                          setActions(prev => { const n = new Map(prev); n.delete(idx); return n })
                        }} style={{ padding: '0.25rem 0.5rem', border: '0.0625rem solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'var(--card)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer' }}>
                          Undo
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button type="button" onClick={() => {
                          for (const r of group.records) accept(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel, 'manual')
                          setActions(prev => new Map(prev).set(idx, 'accepted'))
                        }} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.25rem', backgroundColor: 'var(--status-success)', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                          <Check style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Accept
                        </button>
                        <button type="button" onClick={() => setActions(prev => new Map(prev).set(idx, 'rejected'))} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', border: '0.0625rem solid var(--status-error-border)', borderRadius: '0.25rem', backgroundColor: 'transparent', color: 'var(--status-error)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                          <X style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Not Superseded
                        </button>
                        <button type="button" onClick={() => setActions(prev => new Map(prev).set(idx, 'reclassified'))} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', border: '0.0625rem solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'transparent', color: 'var(--foreground)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                          <ArrowLeftRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Reclassify
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom summary bar */}
      {reviewedCount === totalGroups && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', borderRadius: '0.5rem',
          backgroundColor: 'var(--status-success-subtle)', border: '0.0625rem solid var(--status-success-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'var(--status-success)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)' }}>
              All {totalGroups} pairs reviewed
            </span>
          </div>
          <button type="button" style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.375rem', backgroundColor: 'var(--tr-primary)', color: 'var(--tr-primary-foreground)', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' }}>
            Complete Review
          </button>
        </div>
      )}
    </div>
  )
}
