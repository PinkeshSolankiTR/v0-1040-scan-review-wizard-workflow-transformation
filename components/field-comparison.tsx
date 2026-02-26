'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
} from 'lucide-react'
import type { ComparedValue } from '@/lib/types'

/* ════════════════════════════════════════════════════════════
   Category grouping helper
   ════════════════════════════════════════════════════════════ */
interface FieldGroup {
  category: string
  fields: ComparedValue[]
  allMatch: boolean
  mismatchCount: number
}

function groupByCategory(values: ComparedValue[]): FieldGroup[] {
  const map = new Map<string, ComparedValue[]>()
  for (const v of values) {
    const cat = v.category ?? 'Other'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(v)
  }
  return Array.from(map.entries()).map(([category, fields]) => ({
    category,
    fields,
    allMatch: fields.every(f => f.match),
    mismatchCount: fields.filter(f => !f.match).length,
  }))
}

/* ════════════════════════════════════════════════════════════
   View mode type
   ════════════════════════════════════════════════════════════ */
type ViewMode = 'differences' | 'all'

/* ════════════════════════════════════════════════════════════
   FieldComparison (B: Differences-Only + C: Grouped Categories)
   ════════════════════════════════════════════════════════════ */
export function FieldComparison({
  values,
  labelA = 'Source',
  labelB = 'Comparison',
}: {
  values: ComparedValue[]
  labelA?: string
  labelB?: string
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('differences')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const totalFields = values.length
  const mismatches = useMemo(() => values.filter(v => !v.match), [values])
  const matched = totalFields - mismatches.length
  const hasCategories = values.some(v => v.category)

  /* Grouped view data */
  const groups = useMemo(() => groupByCategory(values), [values])

  const toggleGroup = useCallback((cat: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  /* ── Shared row renderer ── */
  const renderRow = (v: ComparedValue) => (
    <tr
      key={v.field}
      style={{
        backgroundColor: v.match ? 'oklch(1 0 0)' : 'oklch(0.97 0.015 25 / 0.35)',
        borderBlockStart: '0.0625rem solid oklch(0.93 0.003 250)',
      }}
    >
      <td style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem', fontWeight: 500, color: 'oklch(0.3 0.01 250)' }}>
        {v.field}
      </td>
      <td style={{
        padding: '0.375rem 0.625rem', fontSize: '0.75rem',
        fontFamily: 'var(--font-mono)', color: 'oklch(0.25 0.01 250)',
        borderInlineStart: '0.0625rem solid oklch(0.93 0.003 250)',
      }}>
        {v.valueA}
      </td>
      <td style={{
        padding: '0.375rem 0.625rem', fontSize: '0.75rem',
        fontFamily: 'var(--font-mono)',
        color: v.match ? 'oklch(0.25 0.01 250)' : 'oklch(0.45 0.18 25)',
        fontWeight: v.match ? 400 : 600,
        borderInlineStart: '0.0625rem solid oklch(0.93 0.003 250)',
      }}>
        {v.valueB}
      </td>
      <td style={{
        padding: '0.375rem 0.25rem', textAlign: 'center',
        borderInlineStart: '0.0625rem solid oklch(0.93 0.003 250)',
        inlineSize: '2rem',
      }}>
        {v.match ? (
          <CheckCircle2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.55 0.17 145)', margin: '0 auto' }} aria-label="Match" />
        ) : (
          <XCircle style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.55 0.22 25)', margin: '0 auto' }} aria-label="Mismatch" />
        )}
      </td>
    </tr>
  )

  /* ── Table header ── */
  const tableHeader = (
    <thead>
      <tr style={{ backgroundColor: 'oklch(0.96 0.005 250)' }}>
        <th style={{ padding: '0.375rem 0.625rem', fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.45 0.01 250)', textAlign: 'start', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Field
        </th>
        <th style={{ padding: '0.375rem 0.625rem', fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.45 0.01 250)', textAlign: 'start', textTransform: 'uppercase', letterSpacing: '0.04em', borderInlineStart: '0.0625rem solid oklch(0.91 0.005 250)' }}>
          {labelA}
        </th>
        <th style={{ padding: '0.375rem 0.625rem', fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.45 0.01 250)', textAlign: 'start', textTransform: 'uppercase', letterSpacing: '0.04em', borderInlineStart: '0.0625rem solid oklch(0.91 0.005 250)' }}>
          {labelB}
        </th>
        <th style={{ padding: '0.375rem 0.25rem', fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.45 0.01 250)', textAlign: 'center', inlineSize: '2rem', borderInlineStart: '0.0625rem solid oklch(0.91 0.005 250)' }} aria-label="Status">
          {''}
        </th>
      </tr>
    </thead>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

      {/* ── Toolbar: summary + view toggle ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.375rem',
      }}>
        {/* Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            color: mismatches.length > 0 ? 'oklch(0.5 0.18 25)' : 'oklch(0.45 0.15 145)',
            fontWeight: 600,
          }}>
            <XCircle style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
            {mismatches.length} difference{mismatches.length !== 1 ? 's' : ''}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            color: 'oklch(0.5 0.01 260)', fontWeight: 500,
          }}>
            <CheckCircle2 style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.6 0.14 145)' }} />
            {matched} match
          </span>
          <span style={{ color: 'oklch(0.6 0.01 260)', fontWeight: 400 }}>
            of {totalFields} fields
          </span>
        </div>

        {/* View toggle */}
        <div role="group" aria-label="View mode" style={{
          display: 'flex',
          borderRadius: '0.25rem',
          overflow: 'hidden',
          border: '0.0625rem solid oklch(0.88 0.01 260)',
        }}>
          <button
            type="button"
            onClick={() => setViewMode('differences')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              border: 'none', cursor: 'pointer',
              fontSize: '0.6875rem', fontWeight: 600,
              backgroundColor: viewMode === 'differences' ? 'oklch(0.35 0.12 25)' : 'oklch(0.98 0.003 260)',
              color: viewMode === 'differences' ? 'oklch(0.98 0 0)' : 'oklch(0.4 0.01 260)',
            }}
            aria-pressed={viewMode === 'differences'}
          >
            <Filter style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} />
            Differences Only
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              border: 'none', cursor: 'pointer',
              borderInlineStart: '0.0625rem solid oklch(0.88 0.01 260)',
              fontSize: '0.6875rem', fontWeight: 600,
              backgroundColor: viewMode === 'all' ? 'oklch(0.25 0.01 260)' : 'oklch(0.98 0.003 260)',
              color: viewMode === 'all' ? 'oklch(0.98 0 0)' : 'oklch(0.4 0.01 260)',
            }}
            aria-pressed={viewMode === 'all'}
          >
            <Layers style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} />
            All Fields
          </button>
        </div>
      </div>

      {/* ── DIFFERENCES ONLY view (Option B) ── */}
      {viewMode === 'differences' && (
        <>
          {mismatches.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem', gap: '0.5rem',
              borderRadius: '0.375rem',
              backgroundColor: 'oklch(0.96 0.03 145 / 0.3)',
              border: '0.0625rem solid oklch(0.88 0.06 145)',
            }}>
              <CheckCircle2 style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'oklch(0.5 0.17 145)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.35 0.1 145)' }}>
                All {totalFields} fields match perfectly
              </span>
            </div>
          ) : (
            <div style={{
              overflow: 'hidden', borderRadius: '0.375rem',
              border: '0.0625rem solid oklch(0.91 0.005 250)',
            }}>
              <table style={{ inlineSize: '100%', borderCollapse: 'collapse' }}>
                {tableHeader}
                <tbody>
                  {mismatches.map(renderRow)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── ALL FIELDS view with category grouping (Option C) ── */}
      {viewMode === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {hasCategories ? (
            groups.map(group => {
              /* all-match groups: default collapsed, toggle opens
                 mismatch groups: default open, toggle collapses */
              const isManuallyToggled = collapsedGroups.has(group.category)
              const shouldShow = group.allMatch
                ? isManuallyToggled
                : !isManuallyToggled

              return (
                <div
                  key={group.category}
                  style={{
                    borderRadius: '0.375rem',
                    overflow: 'hidden',
                    border: '0.0625rem solid oklch(0.91 0.005 250)',
                  }}
                >
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.category)}
                    aria-expanded={shouldShow}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      inlineSize: '100%', padding: '0.375rem 0.625rem',
                      border: 'none', cursor: 'pointer', textAlign: 'start',
                      fontSize: '0.6875rem', fontWeight: 700,
                      backgroundColor: group.allMatch ? 'oklch(0.97 0.01 145 / 0.5)' : 'oklch(0.96 0.01 25 / 0.5)',
                      color: 'oklch(0.3 0.01 260)',
                    }}
                  >
                    {shouldShow
                      ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                      : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)' }} />
                    }
                    {group.category}
                    {group.allMatch ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.1875rem',
                        marginInlineStart: 'auto',
                        fontSize: '0.625rem', fontWeight: 600,
                        color: 'oklch(0.5 0.15 145)',
                      }}>
                        <CheckCircle2 style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} />
                        {group.fields.length}/{group.fields.length} match
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.1875rem',
                        marginInlineStart: 'auto',
                        fontSize: '0.625rem', fontWeight: 600,
                        color: 'oklch(0.5 0.18 25)',
                      }}>
                        <XCircle style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} />
                        {group.mismatchCount} differ
                      </span>
                    )}
                  </button>

                  {/* Group table body */}
                  {shouldShow && (
                    <table style={{ inlineSize: '100%', borderCollapse: 'collapse' }}>
                      {tableHeader}
                      <tbody>
                        {group.fields.map(renderRow)}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })
          ) : (
            /* No categories -- flat table */
            <div style={{
              overflow: 'hidden', borderRadius: '0.375rem',
              border: '0.0625rem solid oklch(0.91 0.005 250)',
            }}>
              <table style={{ inlineSize: '100%', borderCollapse: 'collapse' }}>
                {tableHeader}
                <tbody>
                  {values.map(renderRow)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
