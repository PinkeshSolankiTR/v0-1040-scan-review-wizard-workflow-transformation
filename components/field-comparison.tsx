'use client'

import { useState, useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
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
  isOverridden = false,
}: {
  values: ComparedValue[]
  labelA?: string
  labelB?: string
  /** Optional doc refs for source crop strip */
  docRefA?: DocumentRef
  docRefB?: DocumentRef
  /** When true, shows a banner indicating classification was overridden */
  isOverridden?: boolean
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
            : v.match ? 'var(--card)' : 'oklch(0.97 0.015 25 / 0.35)',
          borderBlockStart: '0.0625rem solid var(--border)',
          cursor: hasCrops ? 'pointer' : 'default',
        }}
        onClick={hasCrops ? () => setSelectedField(isSelected ? null : v.field) : undefined}
      >
        <td style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--foreground)' }}>
          {v.field}
        </td>
        <td style={{
          padding: '0.375rem 0.625rem', fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)', color: 'var(--foreground)',
          borderInlineStart: '0.0625rem solid var(--border)',
        }}>
          {v.valueA}
        </td>
        <td style={{
          padding: '0.375rem 0.625rem', fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          color: v.match ? 'var(--foreground)' : 'var(--status-error)',
          fontWeight: v.match ? 400 : 600,
          borderInlineStart: '0.0625rem solid var(--border)',
        }}>
          {v.valueB}
        </td>
        <td style={{
          padding: '0.375rem 0.25rem', textAlign: 'center',
          borderInlineStart: '0.0625rem solid var(--border)',
          inlineSize: '2rem',
        }}>
          {v.match ? (
            <CheckCircle2 style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--confidence-high)', margin: '0 auto' }} aria-label="Match" />
          ) : (
            <XCircle style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'var(--destructive)', margin: '0 auto' }} aria-label="Mismatch" />
          )}
        </td>
        {hasCrops && (
          <td style={{
            padding: '0.375rem 0.25rem', textAlign: 'center',
            borderInlineStart: '0.0625rem solid var(--border)',
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

  /* ── Shared th style for sticky header ── */
  const thBase: React.CSSProperties = {
    padding: '0.375rem 0.625rem',
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: 'var(--muted-foreground)',
    textAlign: 'start',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    backgroundColor: 'var(--surface-sunken)',
    position: 'sticky',
    insetBlockStart: 0,
    zIndex: 1,
  }

  /* ── Table header (sticky within scrollable container) ── */
  const stickyHeader = (
    <thead>
      <tr>
        <th style={{ ...thBase }}>
          Field
        </th>
        <th style={{ ...thBase, borderInlineStart: '0.0625rem solid var(--border)' }}>
          {labelA}
        </th>
        <th style={{ ...thBase, borderInlineStart: '0.0625rem solid var(--border)' }}>
          {labelB}
        </th>
        <th style={{ ...thBase, padding: '0.375rem 0.25rem', textAlign: 'center', inlineSize: '2rem', borderInlineStart: '0.0625rem solid var(--border)' }} aria-label="Status">
          {''}
        </th>
        {hasCrops && (
          <th style={{ ...thBase, padding: '0.375rem 0.25rem', fontSize: '0.5625rem', textAlign: 'center', inlineSize: '2rem', borderInlineStart: '0.0625rem solid var(--border)' }}>
            Src
          </th>
        )}
      </tr>
    </thead>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

      {/* ── Override indicator ── */}
      {isOverridden && (
        <div
          role="status"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.3125rem 0.625rem',
            borderRadius: '0.25rem',
            backgroundColor: 'oklch(0.95 0.04 65)',
            border: '0.0625rem solid oklch(0.85 0.08 65)',
            fontSize: '0.6875rem', fontWeight: 600,
            color: 'oklch(0.4 0.12 65)',
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', flexShrink: 0 }}
          >
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.25a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
          Classification overridden -- field values unchanged, column labels reflect new assignment
        </div>
      )}

      {/* ── Toolbar: toggle with embedded counts ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <div role="group" aria-label="View mode" style={{
          display: 'flex',
          borderRadius: '0.25rem',
          overflow: 'hidden',
          border: '0.0625rem solid var(--border)',
        }}>
          <button
            type="button"
            onClick={() => setViewMode('unmatched')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3125rem',
              padding: '0.3125rem 0.625rem',
              border: 'none', cursor: 'pointer',
              fontSize: '0.6875rem', fontWeight: 600,
              backgroundColor: viewMode === 'unmatched' ? 'var(--status-error)' : 'var(--surface-raised)',
              color: viewMode === 'unmatched' ? 'var(--card)' : 'var(--muted-foreground)',
            }}
            aria-pressed={viewMode === 'unmatched'}
          >
            <XCircle style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
            Unmatched
            <span style={{
              padding: '0.0625rem 0.3125rem',
              borderRadius: '0.5rem',
              fontSize: '0.625rem', fontWeight: 700,
              backgroundColor: viewMode === 'unmatched' ? 'var(--status-error-subtle)' : 'var(--muted)',
              color: viewMode === 'unmatched' ? 'var(--status-error)' : 'var(--muted-foreground)',
            }}>
              {mismatches.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matched')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3125rem',
              padding: '0.3125rem 0.625rem',
              border: 'none', cursor: 'pointer',
              borderInlineStart: '0.0625rem solid var(--border)',
              fontSize: '0.6875rem', fontWeight: 600,
              backgroundColor: viewMode === 'matched' ? 'var(--status-success)' : 'var(--surface-raised)',
              color: viewMode === 'matched' ? 'var(--card)' : 'var(--muted-foreground)',
            }}
            aria-pressed={viewMode === 'matched'}
          >
            <CheckCircle2 style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
            Matched
            <span style={{
              padding: '0.0625rem 0.3125rem',
              borderRadius: '0.5rem',
              fontSize: '0.625rem', fontWeight: 700,
              backgroundColor: viewMode === 'matched' ? 'var(--status-success-subtle)' : 'var(--muted)',
              color: viewMode === 'matched' ? 'var(--status-success)' : 'var(--muted-foreground)',
            }}>
              {matched}
            </span>
          </button>
        </div>
        <span style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)', fontWeight: 400 }}>
          of {totalFields} fields
        </span>
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
              border: '0.0625rem solid var(--status-success-border)',
            }}>
              <CheckCircle2 style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'var(--confidence-high)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--status-success)' }}>
                All {totalFields} fields match perfectly
              </span>
            </div>
          ) : (
            <div style={{
              borderRadius: '0.375rem',
              border: '0.0625rem solid var(--border)',
              overflow: 'hidden',
              maxBlockSize: '18rem',
              overflowY: 'auto',
            }}>
              <table style={{ inlineSize: '100%', borderCollapse: 'collapse' }}>
                {stickyHeader}
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
              border: '0.0625rem solid var(--status-error-border)',
            }}>
              <XCircle style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: 'var(--destructive)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--status-error)' }}>
                No matched fields found
              </span>
            </div>
          ) : (
            <div style={{
              borderRadius: '0.375rem',
              border: '0.0625rem solid var(--border)',
              overflow: 'hidden',
              maxBlockSize: '18rem',
              overflowY: 'auto',
            }}>
              <table style={{ inlineSize: '100%', borderCollapse: 'collapse' }}>
                {stickyHeader}
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
          border: '0.0625rem solid var(--status-info-border)',
          backgroundColor: 'oklch(0.97 0.01 240 / 0.3)',
        }}>
          {/* Strip header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.375rem 0.625rem',
            backgroundColor: 'var(--status-info-subtle)',
            borderBlockEnd: '0.0625rem solid var(--status-info-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <ScanSearch style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'var(--ai-accent)' }} />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'oklch(0.3 0.08 240)' }}>
                Source View
              </span>
              <span style={{ fontSize: '0.625rem', color: 'var(--muted-foreground)' }}>
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
                backgroundColor: 'transparent', color: 'var(--muted-foreground)',
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
              <p style={{ margin: '0 0 0.375rem', fontSize: '0.625rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {labelA}
              </p>
              {docRefA ? (
                <div style={{
                  position: 'relative',
                  blockSize: '5rem',
                  overflow: 'hidden',
                  borderRadius: '0.25rem',
                  border: '0.0625rem solid var(--border)',
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
                <div style={{ blockSize: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  No document
                </div>
              )}
            </div>

            {/* Doc B crop */}
            <div style={{ backgroundColor: 'oklch(0.99 0.002 260)', padding: '0.5rem' }}>
              <p style={{ margin: '0 0 0.375rem', fontSize: '0.625rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {labelB}
              </p>
              {docRefB ? (
                <div style={{
                  position: 'relative',
                  blockSize: '5rem',
                  overflow: 'hidden',
                  borderRadius: '0.25rem',
                  border: `0.0625rem solid ${selectedValue.match ? 'var(--border)' : 'oklch(0.75 0.1 25)'}`,
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
                <div style={{ blockSize: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
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
