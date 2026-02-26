'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, CheckCircle, XCircle, Columns2, ScanSearch } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComparedValue, DocumentRef, CropRegion } from '@/lib/types'

/* ── Simulated source-snip viewer ── */
function SourceSnip({
  label,
  docRef,
  crop,
  value,
}: {
  label: string
  docRef: DocumentRef | undefined
  crop: CropRegion | undefined
  value: string
}) {
  if (!docRef || !crop) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        blockSize: '4.5rem', borderRadius: '0.25rem',
        backgroundColor: 'oklch(0.97 0.003 260)',
        border: '0.0625rem dashed oklch(0.85 0.01 260)',
        fontSize: '0.6875rem', color: 'oklch(0.55 0.01 260)',
      }}>
        No source region available
      </div>
    )
  }

  /* Crop region as CSS clip-path inset (top right bottom left) */
  const insetTop = `${crop.y * 100}%`
  const insetRight = `${(1 - crop.x - crop.width) * 100}%`
  const insetBottom = `${(1 - crop.y - crop.height) * 100}%`
  const insetLeft = `${crop.x * 100}%`

  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      {/* Header */}
      <figcaption style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.1875rem 0.375rem',
        borderRadius: '0.1875rem 0.1875rem 0 0',
        backgroundColor: 'oklch(0.2 0.01 260)',
        color: 'oklch(0.88 0 0)',
        fontSize: '0.5625rem', fontWeight: 600,
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ color: 'oklch(0.6 0 0)', flexShrink: 0 }}>Pg {docRef.pageNumber}</span>
      </figcaption>

      {/* Cropped region simulation */}
      <div style={{
        position: 'relative',
        blockSize: '4rem',
        overflow: 'hidden',
        borderRadius: '0 0 0.1875rem 0.1875rem',
        border: '0.0625rem solid oklch(0.88 0.01 260)',
        backgroundColor: 'oklch(0.98 0.003 260)',
      }}>
        {/* PDF rendered via iframe, cropped via clip-path */}
        <iframe
          src={`${docRef.pdfPath}#page=${docRef.pageNumber}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          title={`Source region: ${label}`}
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

        {/* Highlight overlay on the extracted value */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            insetBlockStart: '50%',
            insetInlineStart: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '0.125rem 0.375rem',
            borderRadius: '0.125rem',
            backgroundColor: 'oklch(0.95 0.08 80 / 0.85)',
            border: '0.0625rem solid oklch(0.75 0.12 80)',
            fontSize: '0.6875rem',
            fontWeight: 700,
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

/**
 * Field Comparison table with click-to-reveal source snips.
 * Each row has a "source" icon; clicking it expands to show
 * the cropped region from both documents for that field.
 */
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
  const [expanded, setExpanded] = useState(false)
  const [revealedRows, setRevealedRows] = useState<Set<string>>(new Set())
  const matched = values.filter((v) => v.match).length
  const mismatched = values.filter((v) => !v.match).length

  const toggleRow = useCallback((field: string) => {
    setRevealedRows(prev => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }, [])

  const hasCrops = values.some(v => v.cropA || v.cropB)

  return (
    <div className="flex flex-col gap-1.5">
      {/* Inline summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium transition-colors"
        style={{ color: 'oklch(0.45 0.12 250)' }}
        aria-expanded={expanded}
        type="button"
      >
        <Columns2 className="size-3.5" />
        <span>
          {matched} matched, {mismatched} mismatched of {values.length} fields
        </span>
        <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
      </button>

      {/* Expanded side-by-side table */}
      {expanded && (
        <div
          className="overflow-hidden rounded-md border"
          style={{ borderColor: 'oklch(0.91 0.005 250)' }}
        >
          {/* Header */}
          <div
            className={cn(
              'grid gap-0 text-xs font-bold uppercase tracking-wider',
              hasCrops
                ? 'grid-cols-[minmax(7rem,1fr)_1fr_1fr_2rem_2rem]'
                : 'grid-cols-[minmax(7rem,1fr)_1fr_1fr_2rem]'
            )}
            style={{ backgroundColor: 'oklch(0.96 0.005 250)', color: 'oklch(0.45 0.01 250)' }}
          >
            <span className="px-2.5 py-1.5">Field</span>
            <span className="border-l px-2.5 py-1.5" style={{ borderColor: 'oklch(0.91 0.005 250)' }}>
              {labelA}
            </span>
            <span className="border-l px-2.5 py-1.5" style={{ borderColor: 'oklch(0.91 0.005 250)' }}>
              {labelB}
            </span>
            <span className="border-l px-2.5 py-1.5 text-center" style={{ borderColor: 'oklch(0.91 0.005 250)' }} aria-label="Match status">
              {''}
            </span>
            {hasCrops && (
              <span className="border-l px-1 py-1.5 text-center" style={{ borderColor: 'oklch(0.91 0.005 250)' }} aria-label="Source">
                {''}
              </span>
            )}
          </div>

          {/* Rows */}
          {values.map((v) => {
            const isRevealed = revealedRows.has(v.field)
            const hasSnip = !!(v.cropA || v.cropB)

            return (
              <div key={v.field}>
                {/* Main row */}
                <div
                  className={cn(
                    'grid gap-0 text-xs border-t',
                    hasCrops
                      ? 'grid-cols-[minmax(7rem,1fr)_1fr_1fr_2rem_2rem]'
                      : 'grid-cols-[minmax(7rem,1fr)_1fr_1fr_2rem]'
                  )}
                  style={{
                    borderColor: 'oklch(0.93 0.003 250)',
                    backgroundColor: v.match
                      ? 'oklch(1 0 0)'
                      : 'oklch(0.97 0.015 25 / 0.35)',
                  }}
                >
                  <span
                    className="px-2.5 py-2 font-medium"
                    style={{ color: 'oklch(0.3 0.01 250)' }}
                  >
                    {v.field}
                  </span>
                  <span
                    className="border-l px-2.5 py-2 font-mono"
                    style={{
                      borderColor: 'oklch(0.93 0.003 250)',
                      color: 'oklch(0.25 0.01 250)',
                      textDecoration: hasSnip && !v.match ? 'underline dotted oklch(0.7 0.08 25)' : 'none',
                      textUnderlineOffset: '0.1875rem',
                    }}
                  >
                    {v.valueA}
                  </span>
                  <span
                    className="border-l px-2.5 py-2 font-mono"
                    style={{
                      borderColor: 'oklch(0.93 0.003 250)',
                      color: v.match ? 'oklch(0.25 0.01 250)' : 'oklch(0.45 0.18 25)',
                      textDecoration: hasSnip && !v.match ? 'underline dotted oklch(0.7 0.08 25)' : 'none',
                      textUnderlineOffset: '0.1875rem',
                    }}
                  >
                    {v.valueB}
                  </span>
                  <span
                    className="flex items-center justify-center border-l"
                    style={{ borderColor: 'oklch(0.93 0.003 250)' }}
                  >
                    {v.match ? (
                      <CheckCircle
                        className="size-3.5"
                        style={{ color: 'oklch(0.55 0.17 145)' }}
                        aria-label="Match"
                      />
                    ) : (
                      <XCircle
                        className="size-3.5"
                        style={{ color: 'oklch(0.55 0.22 25)' }}
                        aria-label="Mismatch"
                      />
                    )}
                  </span>
                  {hasCrops && (
                    <span
                      className="flex items-center justify-center border-l"
                      style={{ borderColor: 'oklch(0.93 0.003 250)' }}
                    >
                      {hasSnip && (
                        <button
                          type="button"
                          onClick={() => toggleRow(v.field)}
                          aria-expanded={isRevealed}
                          aria-label={isRevealed ? `Hide source for ${v.field}` : `View source for ${v.field}`}
                          title={isRevealed ? 'Hide source snip' : 'View source snip'}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            inlineSize: '1.375rem', blockSize: '1.375rem',
                            border: isRevealed ? '0.0625rem solid oklch(0.7 0.12 240)' : '0.0625rem solid oklch(0.88 0.01 260)',
                            borderRadius: '0.1875rem',
                            backgroundColor: isRevealed ? 'oklch(0.92 0.04 240)' : 'oklch(1 0 0)',
                            color: isRevealed ? 'oklch(0.4 0.15 240)' : 'oklch(0.5 0.01 260)',
                            cursor: 'pointer',
                          }}
                        >
                          <ScanSearch style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                        </button>
                      )}
                    </span>
                  )}
                </div>

                {/* Expanded source snip row */}
                {isRevealed && hasSnip && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'oklch(0.97 0.005 240 / 0.4)',
                      borderBlockStart: '0.0625rem solid oklch(0.91 0.005 250)',
                    }}
                  >
                    <SourceSnip
                      label={labelA}
                      docRef={docRefA}
                      crop={v.cropA}
                      value={v.valueA}
                    />
                    <SourceSnip
                      label={labelB}
                      docRef={docRefB}
                      crop={v.cropB}
                      value={v.valueB}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
