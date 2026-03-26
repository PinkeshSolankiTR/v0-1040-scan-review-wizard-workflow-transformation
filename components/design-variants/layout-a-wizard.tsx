'use client'

/**
 * LAYOUT A: "Guided Wizard"
 * One document pair at a time, full-width, step-by-step flow.
 * The user sees a progress bar, the AI summary, and action buttons.
 * Details (fields, documents) are revealed on demand via expandable sections.
 */

import { useState, useMemo, useCallback } from 'react'
import { useDecisions } from '@/contexts/decision-context'
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileText,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info,
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
}

/* ── Group records by form type ── */
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
    groups.push({
      formType,
      formLabel: label,
      records,
      originalRecord: records.find(r => r.decisionType === 'Original') ?? null,
      supersededRecords: records.filter(r => r.decisionType === 'Superseded'),
      avgConfidence: avg,
    })
  }
  return groups
}

/* ── Parse AI reasoning ── */
function parseReasons(decisionReason: string): { tag: string; text: string }[] {
  return decisionReason.split('||').map(part => {
    const [tag, ...rest] = part.split('|')
    return { tag: tag.trim(), text: rest.join('|').trim() }
  })
}

/* ── Confidence helpers ── */
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
export function LayoutAWizard({ data }: { data: SupersededRecord[] }) {
  const { decisions, accept, undo } = useDecisions()
  const groups = useMemo(() => groupByFormType(data), [data])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showFields, setShowFields] = useState(false)
  const [showDocs, setShowDocs] = useState(false)
  const [completedActions, setCompletedActions] = useState<Map<number, 'accepted' | 'rejected' | 'reclassified'>>(new Map())

  const group = groups[currentIdx]
  if (!group) return null

  const totalGroups = groups.length
  const reviewedCount = completedActions.size
  const isCurrentActioned = completedActions.has(currentIdx)
  const currentAction = completedActions.get(currentIdx)

  const supersededRec = group.supersededRecords[0]
  const originalRec = group.originalRecord
  const comparedValues = supersededRec?.comparedValues ?? []
  const mismatches = comparedValues.filter(v => !v.match)
  const matches = comparedValues.filter(v => v.match)
  const reasons = supersededRec ? parseReasons(supersededRec.decisionReason) : []

  const goNext = () => { if (currentIdx < totalGroups - 1) { setCurrentIdx(currentIdx + 1); setShowFields(false); setShowDocs(false) } }
  const goPrev = () => { if (currentIdx > 0) { setCurrentIdx(currentIdx - 1); setShowFields(false); setShowDocs(false) } }

  const handleAccept = () => {
    for (const r of group.records) {
      accept(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel, 'manual')
    }
    setCompletedActions(prev => new Map(prev).set(currentIdx, 'accepted'))
  }

  const handleReject = () => {
    setCompletedActions(prev => new Map(prev).set(currentIdx, 'rejected'))
  }

  const handleReclassify = () => {
    setCompletedActions(prev => new Map(prev).set(currentIdx, 'reclassified'))
  }

  const handleUndo = () => {
    for (const r of group.records) {
      undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
    }
    setCompletedActions(prev => { const next = new Map(prev); next.delete(currentIdx); return next })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxInlineSize: '56rem', marginInline: 'auto' }}>

      {/* ── Progress Bar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Reviewing {currentIdx + 1} of {totalGroups} document pairs
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
            {reviewedCount} of {totalGroups} reviewed
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', blockSize: '0.375rem' }}>
          {groups.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setCurrentIdx(i); setShowFields(false); setShowDocs(false) }}
              style={{
                flex: 1,
                blockSize: '100%',
                borderRadius: '0.25rem',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: completedActions.has(i)
                  ? completedActions.get(i) === 'accepted' ? 'var(--status-success)' : completedActions.get(i) === 'rejected' ? 'var(--muted-foreground)' : 'var(--status-warning)'
                  : i === currentIdx ? 'var(--tr-primary)' : 'var(--border)',
                opacity: i === currentIdx ? 1 : 0.7,
              }}
              aria-label={`Go to pair ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ── Main Card ── */}
      <div style={{
        backgroundColor: 'var(--card)',
        border: '0.0625rem solid var(--border)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
      }}>
        {/* Card Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBlockEnd: '0.0625rem solid var(--border)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--muted-foreground)' }} />
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                {group.formType}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                {group.formLabel.replace(group.formType, '').replace(/[()]/g, '').trim()}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
              {group.records.length} documents found -- {group.supersededRecords.length} superseded, 1 retained
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.25rem 0.625rem', borderRadius: '1rem',
            backgroundColor: `color-mix(in srgb, ${confColor(group.avgConfidence)} 10%, transparent)`,
            border: `0.0625rem solid color-mix(in srgb, ${confColor(group.avgConfidence)} 25%, transparent)`,
          }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: confColor(group.avgConfidence) }}>
              {confLabel(group.avgConfidence)} Confidence ({Math.round(group.avgConfidence * 100)}%)
            </span>
          </div>
        </div>

        {/* AI Summary -- always visible, compact */}
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--status-info-subtle)',
          borderBlockEnd: '0.0625rem solid var(--status-info-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
            <Sparkles style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--ai-accent)', flexShrink: 0, marginBlockStart: '0.125rem' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ai-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                AI Analysis
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {reasons.map((r, i) => (
                  <span key={i} style={{ fontSize: '0.8125rem', color: 'var(--foreground)', lineHeight: 1.5 }}>
                    {r.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          padding: '0.75rem 1.25rem',
          borderBlockEnd: '0.0625rem solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <CheckCircle2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--status-success)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--foreground)' }}>{matches.length} fields match</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <AlertTriangle style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--status-warning)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--foreground)' }}>{mismatches.length} differences</span>
          </div>
          {supersededRec?.reviewRequired && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Info style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--status-error)' }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--status-error)', fontWeight: 600 }}>Review required</span>
            </div>
          )}
        </div>

        {/* ── Expandable: Field Differences ── */}
        <div>
          <button
            type="button"
            onClick={() => setShowFields(!showFields)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              inlineSize: '100%', padding: '0.75rem 1.25rem',
              border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
              borderBlockEnd: showFields ? '0.0625rem solid var(--border)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--muted-foreground)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                View Field Comparison
              </span>
              {mismatches.length > 0 && (
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 700,
                  padding: '0.0625rem 0.375rem', borderRadius: '1rem',
                  backgroundColor: 'var(--status-warning-subtle)', color: 'var(--status-warning)',
                }}>
                  {mismatches.length} differences
                </span>
              )}
            </div>
            {showFields ? <ChevronUp style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--muted-foreground)' }} /> : <ChevronDown style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--muted-foreground)' }} />}
          </button>

          {showFields && (
            <div style={{ padding: '0.75rem 1.25rem' }}>
              {/* Mismatches first */}
              {mismatches.length > 0 && (
                <div style={{ marginBlockEnd: '0.75rem' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--status-warning)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Differences
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBlockStart: '0.375rem' }}>
                    {mismatches.map(v => (
                      <FieldRow key={v.field} field={v} />
                    ))}
                  </div>
                </div>
              )}
              {/* Matches */}
              {matches.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--status-success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Matching ({matches.length})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBlockStart: '0.375rem' }}>
                    {matches.map(v => (
                      <FieldRow key={v.field} field={v} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Expandable: Document Preview ── */}
        <div style={{ borderBlockStart: '0.0625rem solid var(--border)' }}>
          <button
            type="button"
            onClick={() => setShowDocs(!showDocs)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              inlineSize: '100%', padding: '0.75rem 1.25rem',
              border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--muted-foreground)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                View Documents
              </span>
            </div>
            {showDocs ? <ChevronUp style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--muted-foreground)' }} /> : <ChevronDown style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--muted-foreground)' }} />}
          </button>
          {showDocs && (
            <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1.25rem' }}>
              {supersededRec?.documentRef && (
                <DocPreviewCard label="Superseded" badge="SUPERSEDED" docRef={supersededRec.documentRef} />
              )}
              {originalRec?.documentRef && (
                <DocPreviewCard label="Retained (Original)" badge="ORIGINAL" docRef={originalRec.documentRef} />
              )}
            </div>
          )}
        </div>

        {/* ── Action Bar ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBlockStart: '0.0625rem solid var(--border)',
          backgroundColor: isCurrentActioned
            ? currentAction === 'accepted' ? 'var(--status-success-subtle)' : currentAction === 'rejected' ? 'var(--surface-raised)' : 'var(--status-warning-subtle)'
            : 'transparent',
        }}>
          {isCurrentActioned ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {currentAction === 'accepted' && <Check style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--status-success)' }} />}
                {currentAction === 'rejected' && <X style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--muted-foreground)' }} />}
                {currentAction === 'reclassified' && <ArrowLeftRight style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--status-warning)' }} />}
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {currentAction === 'accepted' && 'Accepted -- AI recommendation confirmed'}
                  {currentAction === 'rejected' && 'Marked as Not Superseded'}
                  {currentAction === 'reclassified' && 'Roles Reclassified'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleUndo}
                style={{
                  padding: '0.375rem 0.75rem', border: '0.0625rem solid var(--border)',
                  borderRadius: '0.375rem', backgroundColor: 'var(--card)',
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer',
                }}
              >
                Undo
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleAccept}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.5rem 1rem', border: 'none', borderRadius: '0.375rem',
                    backgroundColor: 'var(--status-success)', color: '#ffffff',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <Check style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                  Accept
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.5rem 1rem',
                    border: '0.0625rem solid var(--status-error-border)',
                    borderRadius: '0.375rem',
                    backgroundColor: 'transparent', color: 'var(--status-error)',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <X style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                  Not Superseded
                </button>
                <button
                  type="button"
                  onClick={handleReclassify}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.5rem 1rem',
                    border: '0.0625rem solid var(--border)',
                    borderRadius: '0.375rem',
                    backgroundColor: 'transparent', color: 'var(--foreground)',
                    fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <ArrowLeftRight style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                  Reclassify
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button type="button" onClick={goPrev} disabled={currentIdx === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', border: '0.0625rem solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--card)', fontSize: '0.75rem', fontWeight: 600, color: currentIdx === 0 ? 'var(--muted-foreground)' : 'var(--foreground)', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', opacity: currentIdx === 0 ? 0.5 : 1 }}>
                  <ArrowLeft style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Prev
                </button>
                <button type="button" onClick={goNext} disabled={currentIdx === totalGroups - 1}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', border: 'none', borderRadius: '0.375rem', backgroundColor: 'var(--tr-primary)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--tr-primary-foreground)', cursor: currentIdx === totalGroups - 1 ? 'not-allowed' : 'pointer', opacity: currentIdx === totalGroups - 1 ? 0.5 : 1 }}>
                  Next <ArrowRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Field Row ── */
function FieldRow({ field }: { field: ComparedValue }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
      backgroundColor: field.match ? 'var(--status-success-subtle)' : 'var(--status-warning-subtle)',
      border: `0.0625rem solid ${field.match ? 'var(--status-success-border)' : 'var(--status-warning-border)'}`,
    }}>
      <span style={{ flex: '0 0 12rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>
        {field.field}
      </span>
      <span style={{ flex: 1, fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }}>
        {field.valueA}
      </span>
      {!field.match && (
        <>
          <ArrowRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--muted-foreground)', marginInline: '0.5rem' }} />
          <span style={{ flex: 1, fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--status-warning)', fontWeight: 600 }}>
            {field.valueB}
          </span>
        </>
      )}
    </div>
  )
}

/* ── Doc Preview Card ── */
function DocPreviewCard({ label, badge, docRef }: { label: string; badge: string; docRef: { formLabel: string; pageNumber: number } }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem',
      padding: '0.75rem', borderRadius: '0.375rem',
      border: '0.0625rem solid var(--border)', backgroundColor: 'var(--surface-raised)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>{label}</span>
        <span style={{
          fontSize: '0.5625rem', fontWeight: 700, padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
          backgroundColor: badge === 'ORIGINAL' ? 'var(--status-success-subtle)' : 'var(--status-error-subtle)',
          color: badge === 'ORIGINAL' ? 'var(--status-success)' : 'var(--status-error)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {badge}
        </span>
      </div>
      <div style={{
        blockSize: '8rem', borderRadius: '0.25rem',
        backgroundColor: 'var(--muted)', border: '0.0625rem solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
          {docRef.formLabel} -- Page {docRef.pageNumber}
        </span>
      </div>
    </div>
  )
}
