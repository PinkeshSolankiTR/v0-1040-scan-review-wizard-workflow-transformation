'use client'

/**
 * LAYOUT C: "Split Focus"
 * Left: Minimal list (form name + status chip only).
 * Right: Detail panel with tabbed sections (Summary | Fields | Documents).
 * Similar to current layout but drastically simplified -- only one tab visible at a time.
 */

import { useState, useMemo } from 'react'
import { useDecisions } from '@/contexts/decision-context'
import {
  Check,
  X,
  ArrowLeftRight,
  ArrowRight,
  Sparkles,
  FileText,
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
  mismatches: ComparedValue[]
  matches: ComparedValue[]
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
    groups.push({ formType, formLabel: label, records, originalRecord: original, supersededRecords: superseded, avgConfidence: avg, mismatches: vals.filter(v => !v.match), matches: vals.filter(v => v.match) })
  }
  return groups
}

function confLabel(s: number) { return s >= 0.9 ? 'High' : s >= 0.7 ? 'Moderate' : 'Low' }
function confColor(s: number) { return s >= 0.9 ? 'var(--status-success)' : s >= 0.7 ? 'var(--status-warning)' : 'var(--status-error)' }

type TabId = 'summary' | 'fields' | 'documents'

/* ── Main Component ── */
export function LayoutCSplitFocus({ data }: { data: SupersededRecord[] }) {
  const { accept, undo } = useDecisions()
  const groups = useMemo(() => groupByFormType(data), [data])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [activeTab, setActiveTab] = useState<TabId>('summary')
  const [actions, setActions] = useState<Map<number, 'accepted' | 'rejected' | 'reclassified'>>(new Map())

  const group = groups[selectedIdx]
  if (!group) return null

  const action = actions.get(selectedIdx)
  const isActioned = !!action
  const supersededRec = group.supersededRecords[0]
  const reasons = supersededRec?.decisionReason.split('||').map(p => { const [tag, ...rest] = p.split('|'); return { tag: tag.trim(), text: rest.join('|').trim() } }) ?? []

  const handleAccept = () => {
    for (const r of group.records) accept(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel, 'manual')
    setActions(prev => new Map(prev).set(selectedIdx, 'accepted'))
  }
  const handleReject = () => setActions(prev => new Map(prev).set(selectedIdx, 'rejected'))
  const handleReclassify = () => setActions(prev => new Map(prev).set(selectedIdx, 'reclassified'))
  const handleUndo = () => {
    for (const r of group.records) undo(`sup-pg${r.engagementPageId}`, 'superseded', r.confidenceLevel)
    setActions(prev => { const n = new Map(prev); n.delete(selectedIdx); return n })
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'fields', label: `Fields (${group.mismatches.length})` },
    { id: 'documents', label: 'Documents' },
  ]

  return (
    <div style={{ display: 'flex', blockSize: 'calc(100vh - 5rem)', gap: 0 }}>

      {/* ── Left: Minimal list ── */}
      <div style={{
        inlineSize: '16rem', flexShrink: 0,
        borderInlineEnd: '0.0625rem solid var(--border)',
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--card)',
      }}>
        <div style={{ padding: '0.75rem 1rem', borderBlockEnd: '0.0625rem solid var(--border)' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Document Pairs
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map((g, idx) => {
            const a = actions.get(idx)
            const isSelected = idx === selectedIdx
            return (
              <button
                key={g.formType}
                type="button"
                onClick={() => { setSelectedIdx(idx); setActiveTab('summary') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  inlineSize: '100%', padding: '0.625rem 1rem', textAlign: 'start',
                  border: 'none', cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--status-info-subtle)' : 'transparent',
                  borderInlineStart: isSelected ? '0.1875rem solid var(--tr-primary)' : '0.1875rem solid transparent',
                  borderBlockEnd: '0.0625rem solid var(--border)',
                }}
              >
                {/* Status indicator */}
                {a === 'accepted' ? <CheckCircle2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--status-success)', flexShrink: 0 }} /> :
                 a === 'rejected' ? <X style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--muted-foreground)', flexShrink: 0 }} /> :
                 a === 'reclassified' ? <ArrowLeftRight style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--status-warning)', flexShrink: 0 }} /> :
                 <FileText style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--muted-foreground)', flexShrink: 0 }} />}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.0625rem', flex: 1, minInlineSize: 0 }}>
                  <span style={{
                    fontSize: '0.8125rem', fontWeight: isSelected ? 700 : 500, color: 'var(--foreground)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textDecoration: a === 'rejected' ? 'line-through' : 'none',
                  }}>
                    {g.formType}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>
                    {a ? (a === 'accepted' ? 'Accepted' : a === 'rejected' ? 'Not Superseded' : 'Reclassified') : `${confLabel(g.avgConfidence)} - ${Math.round(g.avgConfidence * 100)}%`}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
        {/* Progress footer */}
        <div style={{ padding: '0.625rem 1rem', borderBlockStart: '0.0625rem solid var(--border)', backgroundColor: 'var(--surface-raised)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>Progress</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground)' }}>{actions.size}/{groups.length}</span>
          </div>
          <div style={{ blockSize: '0.25rem', borderRadius: '0.125rem', backgroundColor: 'var(--border)', marginBlockStart: '0.375rem', overflow: 'hidden' }}>
            <div style={{ blockSize: '100%', borderRadius: '0.125rem', backgroundColor: 'var(--status-success)', inlineSize: `${(actions.size / groups.length) * 100}%`, transition: 'inline-size 0.3s' }} />
          </div>
        </div>
      </div>

      {/* ── Right: Detail Panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>

        {/* Detail Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderBlockEnd: '0.0625rem solid var(--border)', backgroundColor: 'var(--card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>{group.formType}</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
              {group.formLabel.replace(group.formType, '').replace(/[()]/g, '').trim()}
            </span>
          </div>
          <span style={{
            fontSize: '0.6875rem', fontWeight: 700,
            padding: '0.1875rem 0.5rem', borderRadius: '1rem',
            color: confColor(group.avgConfidence),
            backgroundColor: `color-mix(in srgb, ${confColor(group.avgConfidence)} 10%, transparent)`,
          }}>
            {confLabel(group.avgConfidence)} ({Math.round(group.avgConfidence * 100)}%)
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBlockEnd: '0.0625rem solid var(--border)', backgroundColor: 'var(--card)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.625rem 1.25rem', border: 'none', cursor: 'pointer',
                fontSize: '0.8125rem', fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? 'var(--tr-primary)' : 'var(--muted-foreground)',
                backgroundColor: 'transparent',
                borderBlockEnd: activeTab === tab.id ? '0.125rem solid var(--tr-primary)' : '0.125rem solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxInlineSize: '40rem' }}>
              {/* AI Reasoning */}
              <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'var(--status-info-subtle)', border: '0.0625rem solid var(--status-info-border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <Sparkles style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--ai-accent)', flexShrink: 0, marginBlockStart: '0.125rem' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--ai-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Analysis</span>
                    {reasons.map((r, i) => (
                      <span key={i} style={{ fontSize: '0.875rem', color: 'var(--foreground)', lineHeight: 1.6 }}>{r.text}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, padding: '0.75rem', borderRadius: '0.375rem', border: '0.0625rem solid var(--status-success-border)', backgroundColor: 'var(--status-success-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--status-success)' }} />
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--status-success)' }}>{group.matches.length}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>Fields match</div>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '0.75rem', borderRadius: '0.375rem', border: '0.0625rem solid var(--status-warning-border)', backgroundColor: 'var(--status-warning-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--status-warning)' }} />
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--status-warning)' }}>{group.mismatches.length}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>Differences</div>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '0.75rem', borderRadius: '0.375rem', border: '0.0625rem solid var(--border)', backgroundColor: 'var(--surface-raised)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--muted-foreground)' }} />
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)' }}>{group.records.length}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>Documents</div>
                  </div>
                </div>
              </div>

              {/* Escalation notice */}
              {supersededRec?.reviewRequired && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.375rem', backgroundColor: 'var(--status-error-subtle)', border: '0.0625rem solid var(--status-error-border)' }}>
                  <Info style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--status-error)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-error)' }}>Review Required</span>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--foreground)', marginBlockStart: '0.125rem', lineHeight: 1.5 }}>
                      {supersededRec.escalationReason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fields Tab */}
          {activeTab === 'fields' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxInlineSize: '44rem' }}>
              {/* Differences */}
              {group.mismatches.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--status-warning)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Differences
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBlockStart: '0.5rem' }}>
                    {group.mismatches.map(v => (
                      <div key={v.field} style={{ display: 'flex', alignItems: 'center', padding: '0.625rem 0.75rem', borderRadius: '0.375rem', backgroundColor: 'var(--status-warning-subtle)', border: '0.0625rem solid var(--status-warning-border)' }}>
                        <span style={{ flex: '0 0 12rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>{v.field}</span>
                        <span style={{ flex: 1, fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--muted-foreground)', textDecoration: 'line-through' }}>{v.valueA}</span>
                        <ArrowRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--muted-foreground)', marginInline: '0.5rem', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--foreground)', fontWeight: 600 }}>{v.valueB}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Matches */}
              {group.matches.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--status-success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Matching Fields ({group.matches.length})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBlockStart: '0.5rem' }}>
                    {group.matches.map(v => (
                      <div key={v.field} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '0.25rem', backgroundColor: 'var(--status-success-subtle)' }}>
                        <CheckCircle2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'var(--status-success)', marginInlineEnd: '0.5rem', flexShrink: 0 }} />
                        <span style={{ flex: '0 0 12rem', fontSize: '0.8125rem', color: 'var(--foreground)' }}>{v.field}</span>
                        <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--muted-foreground)' }}>{v.valueA}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {group.supersededRecords[0]?.documentRef && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--foreground)' }}>Superseded</span>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, padding: '0.125rem 0.375rem', borderRadius: '0.1875rem', backgroundColor: 'var(--status-error-subtle)', color: 'var(--status-error)', textTransform: 'uppercase' }}>Superseded</span>
                  </div>
                  <div style={{ blockSize: '20rem', borderRadius: '0.375rem', border: '0.0625rem solid var(--border)', backgroundColor: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
                      <FileText style={{ inlineSize: '2rem', blockSize: '2rem', marginBlockEnd: '0.5rem', marginInline: 'auto' }} />
                      <p style={{ fontSize: '0.8125rem' }}>{group.supersededRecords[0].documentRef.formLabel}</p>
                      <p style={{ fontSize: '0.75rem' }}>Page {group.supersededRecords[0].documentRef.pageNumber}</p>
                    </div>
                  </div>
                </div>
              )}
              {group.originalRecord?.documentRef && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--foreground)' }}>Retained</span>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, padding: '0.125rem 0.375rem', borderRadius: '0.1875rem', backgroundColor: 'var(--status-success-subtle)', color: 'var(--status-success)', textTransform: 'uppercase' }}>Original</span>
                  </div>
                  <div style={{ blockSize: '20rem', borderRadius: '0.375rem', border: '0.0625rem solid var(--border)', backgroundColor: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
                      <FileText style={{ inlineSize: '2rem', blockSize: '2rem', marginBlockEnd: '0.5rem', marginInline: 'auto' }} />
                      <p style={{ fontSize: '0.8125rem' }}>{group.originalRecord.documentRef.formLabel}</p>
                      <p style={{ fontSize: '0.75rem' }}>Page {group.originalRecord.documentRef.pageNumber}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action Bar (sticky bottom) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          borderBlockStart: '0.0625rem solid var(--border)',
          backgroundColor: isActioned
            ? action === 'accepted' ? 'var(--status-success-subtle)' : action === 'rejected' ? 'var(--surface-raised)' : 'var(--status-warning-subtle)'
            : 'var(--card)',
        }}>
          {isActioned ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {action === 'accepted' && <CheckCircle2 style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--status-success)' }} />}
                {action === 'rejected' && <X style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--muted-foreground)' }} />}
                {action === 'reclassified' && <ArrowLeftRight style={{ inlineSize: '1rem', blockSize: '1rem', color: 'var(--status-warning)' }} />}
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {action === 'accepted' ? 'Accepted' : action === 'rejected' ? 'Not Superseded' : 'Reclassified'}
                </span>
              </div>
              <button type="button" onClick={handleUndo} style={{ padding: '0.375rem 0.75rem', border: '0.0625rem solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--card)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: 'var(--foreground)' }}>
                Undo
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button type="button" onClick={handleAccept} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', border: 'none', borderRadius: '0.375rem', backgroundColor: 'var(--status-success)', color: '#ffffff', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' }}>
                <Check style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} /> Accept
              </button>
              <button type="button" onClick={handleReject} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', border: '0.0625rem solid var(--status-error-border)', borderRadius: '0.375rem', backgroundColor: 'transparent', color: 'var(--status-error)', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' }}>
                <X style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} /> Not Superseded
              </button>
              <button type="button" onClick={handleReclassify} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', border: '0.0625rem solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'transparent', color: 'var(--foreground)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                <ArrowLeftRight style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} /> Reclassify
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
