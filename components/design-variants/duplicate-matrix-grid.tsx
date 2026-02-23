'use client'

/**
 * Duplicate wizard: Matrix / Cross-Reference Grid variant.
 * Rows = Organizer Pages, Columns = Source Documents.
 * Each cell shows AI confidence for the potential pairing.
 * Click a cell to confirm/match that pair.
 */

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/confidence-badge'
import { FieldComparison } from '@/components/field-comparison'
import { PdfPageViewer } from '@/components/pdf-page-viewer'
import { useDecisions } from '@/contexts/decision-context'
import { getConfidenceLevel, type DuplicateRecord, type DuplicateDataRecord, type DuplicateDocRecord } from '@/lib/types'
import {
  Sparkles, Check, Undo2, AlertTriangle,
  Link2, Unlink2, Eye, EyeOff, X,
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

export function DuplicateMatrixGrid({ data }: { data: DuplicateRecord[] }) {
  const { decisions, accept, undo } = useDecisions()
  const [showAutoMatched, setShowAutoMatched] = useState(true)
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState<string | null>(null)

  /* Build row/column axes from data */
  const { rows, columns, cellMap, allPairs } = useMemo(() => {
    const rowSet = new Map<string, { id: string; label: string; formType: string }>()
    const colSet = new Map<string, { id: string; label: string; formType: string }>()
    const map = new Map<string, DuplicateRecord>()

    for (const r of data) {
      let rowId: string, colId: string
      if (r.itemType === 'DUPLICATE_DATA') {
        const d = r as DuplicateDataRecord
        rowId = d.organizerItemId
        colId = d.sourceReferenceId
        if (!rowSet.has(rowId)) rowSet.set(rowId, { id: rowId, label: r.documentRefA?.formLabel ?? rowId, formType: r.documentRefA?.formType ?? '?' })
        if (!colSet.has(colId)) colSet.set(colId, { id: colId, label: r.documentRefB?.formLabel ?? colId, formType: r.documentRefB?.formType ?? '?' })
      } else {
        const d = r as DuplicateDocRecord
        rowId = `${d.docIdA}`
        colId = `${d.docIdB}`
        if (!rowSet.has(rowId)) rowSet.set(rowId, { id: rowId, label: r.documentRefA?.formLabel ?? `Doc ${d.docIdA}`, formType: r.documentRefA?.formType ?? '?' })
        if (!colSet.has(colId)) colSet.set(colId, { id: colId, label: r.documentRefB?.formLabel ?? `Doc ${d.docIdB}`, formType: r.documentRefB?.formType ?? '?' })
      }
      map.set(`${rowId}::${colId}`, r)
    }

    return {
      rows: Array.from(rowSet.values()),
      columns: Array.from(colSet.values()),
      cellMap: map,
      allPairs: data,
    }
  }, [data])

  const matched = useMemo(
    () => data.filter(r => isRecordMatched(r, getItemKey(r), decisions, showAutoMatched)),
    [data, decisions, showAutoMatched]
  )
  const unmatched = useMemo(
    () => data.filter(r => !isRecordMatched(r, getItemKey(r), decisions, showAutoMatched)),
    [data, decisions, showAutoMatched]
  )

  const selectedRecord = selectedCell ? cellMap.get(selectedCell) ?? null : null

  /* Cell colour based on confidence */
  function getCellStyle(r: DuplicateRecord | undefined, cellKey: string): React.CSSProperties {
    if (!r) {
      return {
        backgroundColor: 'oklch(0.97 0.003 260)',
        color: 'oklch(0.7 0.01 260)',
      }
    }
    const key = getItemKey(r)
    const isMatched = isRecordMatched(r, key, decisions, showAutoMatched)
    const conf = Math.round(r.confidenceLevel * 100)

    if (isMatched) {
      return {
        backgroundColor: 'oklch(0.92 0.06 145)',
        color: 'oklch(0.25 0.12 145)',
        fontWeight: 700,
      }
    }
    if (conf >= 90) {
      return {
        backgroundColor: 'oklch(0.94 0.04 145)',
        color: 'oklch(0.35 0.14 145)',
        fontWeight: 700,
      }
    }
    if (conf >= 70) {
      return {
        backgroundColor: 'oklch(0.95 0.04 80)',
        color: 'oklch(0.4 0.14 80)',
        fontWeight: 600,
      }
    }
    if (conf >= 50) {
      return {
        backgroundColor: 'oklch(0.96 0.03 60)',
        color: 'oklch(0.45 0.14 60)',
        fontWeight: 600,
      }
    }
    return {
      backgroundColor: 'oklch(0.96 0.03 25)',
      color: 'oklch(0.45 0.14 25)',
      fontWeight: 600,
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)' }}>Duplicate Data</h2>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '1rem', backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
            {matched.length} matched
          </span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '1rem', backgroundColor: 'oklch(0.94 0.04 60)', color: 'oklch(0.45 0.14 60)' }}>
            {unmatched.length} unmatched
          </span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'oklch(0.45 0.01 260)', cursor: 'pointer' }}>
          <input type="checkbox" checked={showAutoMatched} onChange={e => setShowAutoMatched(e.target.checked)} style={{ accentColor: 'oklch(0.45 0.18 240)' }} />
          Show Auto-Matched
        </label>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.6875rem', color: 'oklch(0.45 0.01 260)' }}>
        <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confidence:</span>
        {[
          { label: 'High (90%+)', bg: 'oklch(0.94 0.04 145)', fg: 'oklch(0.35 0.14 145)' },
          { label: 'Medium (70-89%)', bg: 'oklch(0.95 0.04 80)', fg: 'oklch(0.4 0.14 80)' },
          { label: 'Low (50-69%)', bg: 'oklch(0.96 0.03 60)', fg: 'oklch(0.45 0.14 60)' },
          { label: 'Very Low (<50%)', bg: 'oklch(0.96 0.03 25)', fg: 'oklch(0.45 0.14 25)' },
          { label: 'Matched', bg: 'oklch(0.92 0.06 145)', fg: 'oklch(0.25 0.12 145)' },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ display: 'inline-block', inlineSize: '0.75rem', blockSize: '0.75rem', borderRadius: '0.125rem', backgroundColor: l.bg }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* ── Matrix grid ── */}
      <div style={{
        borderRadius: 'var(--radius)', overflow: 'auto',
        border: '0.0625rem solid oklch(0.88 0.01 260)',
      }}>
        {/* Corner label row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `10rem repeat(${columns.length}, 7rem)`,
          position: 'sticky', insetBlockStart: 0, zIndex: 2,
        }}>
          {/* Top-left corner */}
          <div style={{
            padding: '0.5rem',
            backgroundColor: 'oklch(0.15 0.01 260)',
            color: 'oklch(0.85 0.01 260)',
            fontSize: '0.625rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.04em',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}>
            <span>Org. Pages &darr; / Source Docs &rarr;</span>
          </div>
          {/* Column headers */}
          {columns.map(col => (
            <div key={col.id} style={{
              padding: '0.375rem 0.25rem',
              backgroundColor: 'oklch(0.15 0.01 260)',
              color: 'oklch(1 0 0)',
              fontSize: '0.625rem', fontWeight: 700,
              textAlign: 'center',
              borderInlineStart: '0.0625rem solid oklch(0.3 0.01 260)',
              overflow: 'hidden',
            }}>
              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {col.label}
              </span>
              <span style={{ display: 'block', fontSize: '0.5625rem', opacity: 0.7, marginBlockStart: '0.125rem' }}>
                {col.formType}
              </span>
            </div>
          ))}
        </div>

        {/* Data rows */}
        {rows.map(row => (
          <div key={row.id} style={{
            display: 'grid',
            gridTemplateColumns: `10rem repeat(${columns.length}, 7rem)`,
            borderBlockStart: '0.0625rem solid oklch(0.92 0.003 260)',
          }}>
            {/* Row header */}
            <div style={{
              padding: '0.4375rem 0.5rem',
              backgroundColor: 'oklch(0.96 0.003 260)',
              fontSize: '0.6875rem', fontWeight: 700,
              color: 'oklch(0.3 0.01 260)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              position: 'sticky', insetInlineStart: 0, zIndex: 1,
              borderInlineEnd: '0.0625rem solid oklch(0.9 0.005 260)',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.label}
              </span>
              <span style={{ fontSize: '0.5625rem', fontWeight: 400, color: 'oklch(0.5 0.01 260)' }}>
                {row.formType}
              </span>
            </div>
            {/* Cells */}
            {columns.map(col => {
              const cellKey = `${row.id}::${col.id}`
              const rec = cellMap.get(cellKey)
              const style = getCellStyle(rec, cellKey)
              const conf = rec ? Math.round(rec.confidenceLevel * 100) : null
              const key = rec ? getItemKey(rec) : null
              const isMatched = rec ? isRecordMatched(rec, key!, decisions, showAutoMatched) : false
              const isSelected = selectedCell === cellKey

              return (
                <button
                  key={cellKey}
                  type="button"
                  onClick={() => {
                    if (rec) setSelectedCell(isSelected ? null : cellKey)
                  }}
                  disabled={!rec}
                  style={{
                    ...style,
                    padding: '0.375rem 0.25rem',
                    borderInlineStart: '0.0625rem solid oklch(0.92 0.003 260)',
                    border: 'none',
                    borderInline: '0.0625rem solid oklch(0.92 0.003 260)',
                    cursor: rec ? 'pointer' : 'default',
                    fontSize: '0.8125rem',
                    textAlign: 'center',
                    outline: isSelected ? '0.125rem solid oklch(0.45 0.18 240)' : 'none',
                    outlineOffset: '-0.125rem',
                    position: 'relative',
                    minBlockSize: '2.75rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '0.125rem',
                  }}
                >
                  {rec ? (
                    <>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                        {isMatched ? '\u2713' : `${conf}%`}
                      </span>
                      {isMatched && (
                        <span style={{ fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>matched</span>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: '0.6875rem' }}>--</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Detail panel for selected cell ── */}
      {selectedRecord && selectedCell && (
        <div style={{
          borderRadius: 'var(--radius)', overflow: 'hidden',
          border: '0.0625rem solid oklch(0.88 0.01 260)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.625rem 0.75rem',
            backgroundColor: 'oklch(0.97 0.005 240)',
            borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--ai-accent)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'oklch(0.25 0.01 260)' }}>
                {selectedRecord.documentRefA?.formLabel ?? '?'} &harr; {selectedRecord.documentRefB?.formLabel ?? '?'}
              </span>
              <ConfidenceBadge score={selectedRecord.confidenceLevel} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {isRecordMatched(selectedRecord, getItemKey(selectedRecord), decisions, showAutoMatched) ? (
                <Button variant="outline" size="sm" onClick={() => undo(getItemKey(selectedRecord), 'duplicate', selectedRecord.confidenceLevel)} style={{ fontSize: '0.6875rem', gap: '0.25rem' }}>
                  <Unlink2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Unmatch
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={() => accept(getItemKey(selectedRecord), 'duplicate', selectedRecord.confidenceLevel, 'manual')} style={{ fontSize: '0.6875rem', gap: '0.25rem' }}>
                  <Link2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} /> Match
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelectedCell(null)} style={{ padding: '0.25rem' }}>
                <X style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
              </Button>
            </div>
          </div>

          {/* AI reasoning */}
          <div style={{ padding: '0.75rem', backgroundColor: 'oklch(0.985 0.003 240)' }}>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBlockEnd: '0.25rem' }}>
              Rule: {selectedRecord.decisionRule} -- {selectedRecord.appliedRuleSet}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'oklch(0.3 0.01 260)', lineHeight: '1.5' }}>
              {selectedRecord.decisionReason}
            </p>

            {selectedRecord.escalationReason && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                marginBlockStart: '0.5rem', padding: '0.4375rem 0.625rem', borderRadius: '0.25rem',
                backgroundColor: 'oklch(0.96 0.04 60)', border: '0.0625rem solid oklch(0.88 0.08 60)',
              }}>
                <AlertTriangle style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.6 0.18 60)', flexShrink: 0, marginBlockStart: '0.0625rem' }} />
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.5 0.16 60)' }}>Escalation</p>
                  <p style={{ fontSize: '0.75rem', color: 'oklch(0.35 0.1 60)', lineHeight: '1.4' }}>{selectedRecord.escalationReason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Field comparison */}
          {selectedRecord.comparedValues && selectedRecord.comparedValues.length > 0 && (
            <div style={{
              padding: '0.75rem',
              borderBlockStart: '0.0625rem solid oklch(0.93 0.005 260)',
              backgroundColor: 'oklch(0.99 0.002 260)',
            }}>
              <FieldComparison
                values={selectedRecord.comparedValues}
                labelA={selectedRecord.documentRefA?.formLabel ?? 'Doc A'}
                labelB={selectedRecord.documentRefB?.formLabel ?? 'Doc B'}
              />
            </div>
          )}

          {/* PDF preview */}
          <details style={{ borderBlockStart: '0.0625rem solid oklch(0.93 0.005 260)' }}>
            <summary style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'oklch(0.97 0.003 260)',
              cursor: 'pointer', listStyle: 'none',
              fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              <Eye style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
              Document Preview
            </summary>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
              padding: '1rem', backgroundColor: 'oklch(0.975 0.003 260)',
            }}>
              {selectedRecord.documentRefA && (
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', marginBlockEnd: '0.375rem', textTransform: 'uppercase' }}>
                    {selectedRecord.documentRefA.formLabel}
                  </p>
                  <PdfPageViewer documentRef={selectedRecord.documentRefA} stamp="DOC A" height="20rem" />
                </div>
              )}
              {selectedRecord.documentRefB && (
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.4 0.01 260)', marginBlockEnd: '0.375rem', textTransform: 'uppercase' }}>
                    {selectedRecord.documentRefB.formLabel}
                  </p>
                  <PdfPageViewer documentRef={selectedRecord.documentRefB} stamp="DOC B" height="20rem" />
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
