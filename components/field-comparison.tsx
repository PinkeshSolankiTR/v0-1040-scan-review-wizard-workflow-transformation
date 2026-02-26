'use client'

import { useState, useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  Filter,
  ScanSearch,
  X,
} from 'lucide-react'
import type { ComparedValue, DocumentRef } from '@/lib/types'

/* ════════════════════════════════════════════════════════════
   View mode type
   ════════════════════════════════════════════════════════════ */
type ViewMode = 'unmatched' | 'matched'

/* ════════════════════════════════════════════════════════════
   FieldComparison (Unmatched / Matched toggle)
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
  /** Optional doc refs for source crop strip */
  docRefA?: DocumentRef
  docRefB?: DocumentRef
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('unmatched')
  const [selectedField, setSelectedField] = useState<string | null>(null)

  const hasCrops = !!(docRefA || docRefB)
  const selectedValue = selectedField ? values.find(v => v.field === selectedField) : null

  const totalFields = values.length
  const mismatches = useMemo(() => values.filter(v => !v.match), [values])
  const matchedFields = useMemo(() => values.filter(v => v.match), [values])
  const matched = matchedFields.length

  /* ── Shared row renderer ── */
  const renderRow = (v: ComparedValue) => {
    const isSelected = selectedField === v.field
    return (
      <tr
        key={v.field}
        style={{
          backgroundColor: isSelected
            ? 'oklch(0.94 0.04 240 / 0.4)'
            : v.match ? 'oklch(1 0 0)' : 'oklch(0.97 0.015 25 / 0.35)',
          borderBlockStart: '0.0625rem solid oklch(0.93 0.003 250)',
          cursor: hasCrops ? 'pointer' : 'default',
        }}
        onClick={hasCrops ? () => setSelectedField(isSelected ? null : v.field) : undefined}
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
            <ScanSearch style={{
              inlineSize: '0.8125rem', blockSize: '0.8125rem', margin: '0 auto',
              color: isSelected ? 'oklch(0.4 0.15 240)' : 'oklch(0.6 0.01 260)',
            }} aria-label="View source" />
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
          <th style={{ padding: '0.375rem 0.25rem', fontSize: '0.5625rem', fontWeight: 700, color: 'oklch(0.5 0.01 250)', textAlign: 'center', inlineSize: '2rem', borderInlineStart: '0.0625rem solid oklch(0.91 0.005 250)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Src
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
            {mismatches.length} unmatched
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            color: 'oklch(0.5 0.01 260)', fontWeight: 500,
          }}>
            <CheckCircle2 style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.6 0.14 145)' }} />
            {matched} matched
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
            onClick={() => setViewMode('unmatched')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              border: 'none', cursor: 'pointer',
              fontSize: '0.6875rem', fontWeight: 600,
              backgroundColor: viewMode === 'unmatched' ? 'oklch(0.35 0.12 25)' : 'oklch(0.98 0.003 260)',
              color: viewMode === 'unmatched' ? 'oklch(0.98 0 0)' : 'oklch(0.4 0.01 260)',
            }}
            aria-pressed={viewMode === 'unmatched'}
          >
            <Filter style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} />
            Unmatched
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matched')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              border: 'none', cursor: 'pointer',
              borderInlineStart: '0.0625rem solid oklch(0.88 0.01 260)',
              fontSize: '0.6875rem', fontWeight: 600,
              backgroundColor: viewMode === 'matched' ? 'oklch(0.25 0.01 260)' : 'oklch(0.98 0.003 260)',
              color: viewMode === 'matched' ? 'oklch(0.98 0 0)' : 'oklch(0.4 0.01 260)',
            }}
            aria-pressed={viewMode === 'matched'}
          >
            <CheckCircle2 style={{ inlineSize: '0.6875rem', blockSize: '0.6875rem' }} />
            Matched
          </button>
        </div>
      </div>

      {/* ── UNMATCHED view (Option B) ── */}
      {viewMode === 'unmatched' && (
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

      {/* ── MATCHED view -- flat table of matched fields only ── */}
      {viewMode === 'matched' && (
        <>
          {matchedFields.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem', gap: '0.5rem',
              borderRadius: '0.375rem',
              backgroundColor: 'oklch(0.96 0.03 25 / 0.3)',
              border: '0.0625rem solid oklch(0.88 0.06 25)',
            }}>
              <XCircle style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'oklch(0.5 0.18 25)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'oklch(0.35 0.1 25)' }}>
                No matched fields found
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
                  {matchedFields.map(renderRow)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          OPTION A: Fixed Source Strip (bottom)
          Shows cropped region from both docs for the selected field.
          In production, cropA/cropB come from OCR bounding boxes.
          For prototype, auto-generates simulated crop positions.
          ═══════════════════════════════════════════════════════════ */}
      {hasCrops && selectedValue && (
        <div style={{
          borderRadius: '0.375rem',
          overflow: 'hidden',
          border: '0.0625rem solid oklch(0.85 0.04 240)',
          backgroundColor: 'oklch(0.97 0.01 240 / 0.3)',
        }}>
          {/* Strip header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.375rem 0.625rem',
            backgroundColor: 'oklch(0.94 0.02 240)',
            borderBlockEnd: '0.0625rem solid oklch(0.85 0.04 240)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <ScanSearch style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.4 0.12 240)' }} />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.3 0.08 240)' }}>
                Source View
              </span>
              <span style={{ fontSize: '0.625rem', color: 'oklch(0.45 0.01 260)' }}>
                {selectedValue.field}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedField(null)}
              aria-label="Close source view"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                inlineSize: '1.25rem', blockSize: '1.25rem',
                border: 'none', borderRadius: '0.1875rem',
                backgroundColor: 'transparent', color: 'oklch(0.4 0.01 260)',
                cursor: 'pointer',
              }}
            >
              <X style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
            </button>
          </div>

          {/* Side-by-side crop previews */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.0625rem',
            backgroundColor: 'oklch(0.91 0.005 260)',
          }}>
            {/* Doc A crop */}
            <div style={{ backgroundColor: 'oklch(0.99 0.002 260)', padding: '0.5rem' }}>
              <p style={{ margin: '0 0 0.375rem', fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {labelA}
              </p>
              {docRefA ? (
                <div style={{
                  position: 'relative',
                  blockSize: '5rem',
                  overflow: 'hidden',
                  borderRadius: '0.25rem',
                  border: '0.0625rem solid oklch(0.88 0.01 260)',
                  backgroundColor: 'oklch(0.97 0.003 260)',
                }}>
                  {/* Simulated crop: use iframe pointing to the PDF page region */}
                  {/* In production, replace with actual cropped image from OCR pipeline */}
                  <iframe
                    src={`${docRefA.pdfPath}#page=${docRefA.pageNumber}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    title={`Source crop: ${selectedValue.field} from ${labelA}`}
                    style={{
                      inlineSize: '100%', blockSize: '100%',
                      border: 'none', pointerEvents: 'none',
                    }}
                    tabIndex={-1}
                  />
                  {/* Value overlay */}
                  <div style={{
                    position: 'absolute', insetBlockEnd: 0, insetInlineStart: 0, insetInlineEnd: 0,
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'oklch(0.15 0.01 260 / 0.85)',
                  }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                      color: 'oklch(0.95 0 0)',
                    }}>
                      {selectedValue.valueA}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ blockSize: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'oklch(0.55 0.01 260)' }}>
                  No document
                </div>
              )}
            </div>

            {/* Doc B crop */}
            <div style={{ backgroundColor: 'oklch(0.99 0.002 260)', padding: '0.5rem' }}>
              <p style={{ margin: '0 0 0.375rem', fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.45 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {labelB}
              </p>
              {docRefB ? (
                <div style={{
                  position: 'relative',
                  blockSize: '5rem',
                  overflow: 'hidden',
                  borderRadius: '0.25rem',
                  border: `0.0625rem solid ${selectedValue.match ? 'oklch(0.88 0.01 260)' : 'oklch(0.75 0.1 25)'}`,
                  backgroundColor: 'oklch(0.97 0.003 260)',
                }}>
                  <iframe
                    src={`${docRefB.pdfPath}#page=${docRefB.pageNumber}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    title={`Source crop: ${selectedValue.field} from ${labelB}`}
                    style={{
                      inlineSize: '100%', blockSize: '100%',
                      border: 'none', pointerEvents: 'none',
                    }}
                    tabIndex={-1}
                  />
                  <div style={{
                    position: 'absolute', insetBlockEnd: 0, insetInlineStart: 0, insetInlineEnd: 0,
                    padding: '0.25rem 0.5rem',
                    backgroundColor: selectedValue.match
                      ? 'oklch(0.15 0.01 260 / 0.85)'
                      : 'oklch(0.25 0.12 25 / 0.9)',
                  }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                      color: selectedValue.match ? 'oklch(0.95 0 0)' : 'oklch(0.95 0.04 60)',
                    }}>
                      {selectedValue.valueB}
                      {!selectedValue.match && (
                        <span style={{ fontSize: '0.5625rem', marginInlineStart: '0.375rem', fontWeight: 400, opacity: 0.8 }}>
                          (differs)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ blockSize: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'oklch(0.55 0.01 260)' }}>
                  No document
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
