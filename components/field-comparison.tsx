'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  CheckCircle2,
  XCircle,
  ScanSearch,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
} from 'lucide-react'
import type { ComparedValue, DocumentRef, CropRegion } from '@/lib/types'

/* ════════════════════════════════════════════════════════════
   Source Snip -- fixed strip at the bottom (Option A)
   ════════════════════════════════════════════════════════════ */
function SourceSnipStrip({
  field,
  value,
  label,
  docRef,
  crop,
}: {
  field: string
  value: string
  label: string
  docRef: DocumentRef | undefined
  crop: CropRegion | undefined
}) {
  if (!docRef || !crop) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        blockSize: '5rem', borderRadius: '0.25rem',
        backgroundColor: 'oklch(0.97 0.003 260)',
        border: '0.0625rem dashed oklch(0.85 0.01 260)',
      }}>
        <span style={{ fontSize: '0.6875rem', color: 'oklch(0.55 0.01 260)' }}>
          No source region available
        </span>
      </div>
    )
  }

  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header bar */}
      <figcaption style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.1875rem 0.5rem',
        borderRadius: '0.25rem 0.25rem 0 0',
        backgroundColor: 'oklch(0.2 0.01 260)',
        color: 'oklch(0.88 0 0)',
        fontSize: '0.5625rem', fontWeight: 600,
      }}>
        <span>{label}</span>
        <span style={{ color: 'oklch(0.6 0 0)' }}>Pg {docRef.pageNumber}</span>
      </figcaption>

      {/* Cropped region simulation */}
      <div style={{
        position: 'relative',
        blockSize: '4rem',
        overflow: 'hidden',
        borderRadius: '0 0 0.25rem 0.25rem',
        border: '0.0625rem solid oklch(0.88 0.01 260)',
        borderBlockStart: 'none',
        backgroundColor: 'oklch(0.98 0.003 260)',
      }}>
        <iframe
          src={`${docRef.pdfPath}#page=${docRef.pageNumber}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          title={`Source: ${field} in ${label}`}
          style={{
            position: 'absolute',
            insetBlockStart: `-${crop.y * 600}px`,
            insetInlineStart: `-${crop.x * 800}px`,
            inlineSize: '800px',
            blockSize: '600px',
            border: 'none',
            pointerEvents: 'none',
            transform: 'scale(0.75)',
            transformOrigin: `${crop.x * 100}% ${crop.y * 100}%`,
          }}
          tabIndex={-1}
        />
        {/* Value highlight overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            insetBlockStart: '50%', insetInlineStart: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '0.125rem 0.375rem',
            borderRadius: '0.125rem',
            backgroundColor: 'oklch(0.95 0.08 80 / 0.9)',
            border: '0.0625rem solid oklch(0.75 0.12 80)',
            fontSize: '0.6875rem', fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'oklch(0.25 0.01 260)',
            whiteSpace: 'nowrap',
            zIndex: 2,
          }}
        >
          {value}
        </div>
      </div>
    </figure>
  )
}

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
   FieldComparison (B + C + A combined)
   ════════════════════════════════════════════════════════════ */
export function FieldComparison({
  values,
  labelA = 'Source',
  labelB = 'Comparison',
  docRefA,
  docRefB,
}: {
  values: ComparedValue[]
  labelA?: string
  labelB?: string
  docRefA?: DocumentRef
  docRefB?: DocumentRef
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('differences')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [selectedField, setSelectedField] = useState<string | null>(null)

  const totalFields = values.length
  const mismatches = useMemo(() => values.filter(v => !v.match), [values])
  const matched = totalFields - mismatches.length
  const hasCrops = values.some(v => v.cropA || v.cropB)
  const hasCategories = values.some(v => v.category)

  /* Grouped view data */
  const groups = useMemo(() => groupByCategory(values), [values])

  /* Currently selected field data for source strip */
  const selectedValue = useMemo(
    () => values.find(v => v.field === selectedField),
    [values, selectedField],
  )

  const toggleGroup = useCallback((cat: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const handleFieldClick = useCallback((field: string) => {
    setSelectedField(prev => prev === field ? null : field)
  }, [])

  /* ── Shared row renderer ── */
  const renderRow = (v: ComparedValue) => {
    const isSelected = selectedField === v.field
    const hasSnip = !!(v.cropA || v.cropB)

    return (
      <tr
        key={v.field}
        onClick={hasSnip ? () => handleFieldClick(v.field) : undefined}
        style={{
          cursor: hasSnip ? 'pointer' : 'default',
          backgroundColor: isSelected
            ? 'oklch(0.95 0.04 240 / 0.35)'
            : v.match
              ? 'oklch(1 0 0)'
              : 'oklch(0.97 0.015 25 / 0.35)',
          borderBlockStart: '0.0625rem solid oklch(0.93 0.003 250)',
          outline: isSelected ? '0.125rem solid oklch(0.6 0.14 240)' : 'none',
          outlineOffset: '-0.125rem',
          borderRadius: isSelected ? '0.1875rem' : 0,
        }}
        aria-selected={isSelected}
        role={hasSnip ? 'button' : undefined}
        tabIndex={hasSnip ? 0 : undefined}
        onKeyDown={hasSnip ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFieldClick(v.field) } } : undefined}
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
        {hasCrops && (
          <td style={{
            padding: '0.375rem 0.25rem', textAlign: 'center',
            borderInlineStart: '0.0625rem solid oklch(0.93 0.003 250)',
            inlineSize: '2rem',
          }}>
            {hasSnip && (
              <ScanSearch
                style={{
                  inlineSize: '0.8125rem', blockSize: '0.8125rem', margin: '0 auto',
                  color: isSelected ? 'oklch(0.4 0.15 240)' : 'oklch(0.55 0.01 260)',
                }}
                aria-hidden="true"
              />
            )}
          </td>
        )}
      </tr>
    )
  }

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
        {hasCrops && (
          <th style={{ padding: '0.375rem 0.25rem', fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.45 0.01 250)', textAlign: 'center', inlineSize: '2rem', borderInlineStart: '0.0625rem solid oklch(0.91 0.005 250)' }} aria-label="Source">
            {''}
          </th>
        )}
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
        <div style={{
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
              const isCollapsed = group.allMatch && !collapsedGroups.has(group.category)
                ? true
                : collapsedGroups.has(group.category)
              const isManuallyToggled = collapsedGroups.has(group.category)
              /* For all-match groups: default collapsed, toggle opens. For mismatch groups: default open, toggle collapses. */
              const shouldShow = group.allMatch
                ? isManuallyToggled /* toggled = open for all-match */
                : !isManuallyToggled /* toggled = collapsed for mismatch */

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

      {/* ── Fixed source snip strip at the bottom (Option A) ── */}
      {selectedField && selectedValue && hasCrops && (selectedValue.cropA || selectedValue.cropB) && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '0.25rem',
          padding: '0.5rem',
          borderRadius: '0.375rem',
          border: '0.0625rem solid oklch(0.82 0.06 240)',
          backgroundColor: 'oklch(0.97 0.02 240 / 0.3)',
        }}>
          {/* Strip header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.35 0.1 240)',
            }}>
              <ScanSearch style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem' }} />
              Source: {selectedValue.field}
            </span>
            <button
              type="button"
              onClick={() => setSelectedField(null)}
              aria-label="Close source preview"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                inlineSize: '1.25rem', blockSize: '1.25rem',
                border: '0.0625rem solid oklch(0.82 0.04 240)',
                borderRadius: '0.1875rem',
                backgroundColor: 'oklch(0.94 0.03 240)',
                color: 'oklch(0.4 0.1 240)',
                cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 700, lineHeight: 1,
              }}
            >
              &times;
            </button>
          </div>

          {/* Side-by-side crops */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
          }}>
            <SourceSnipStrip
              field={selectedValue.field}
              value={selectedValue.valueA}
              label={labelA}
              docRef={docRefA}
              crop={selectedValue.cropA}
            />
            <SourceSnipStrip
              field={selectedValue.field}
              value={selectedValue.valueB}
              label={labelB}
              docRef={docRefB}
              crop={selectedValue.cropB}
            />
          </div>
        </div>
      )}
    </div>
  )
}
