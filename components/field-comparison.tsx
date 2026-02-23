'use client'

import { useState } from 'react'
import { ChevronDown, CheckCircle, XCircle, Columns2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComparedValue } from '@/lib/types'

/**
 * Inline compact summary (always visible) + expandable side-by-side detail view.
 */
export function FieldComparison({
  values,
  labelA = 'Source',
  labelB = 'Comparison',
}: {
  values: ComparedValue[]
  labelA?: string
  labelB?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const matched = values.filter((v) => v.match).length
  const mismatched = values.filter((v) => !v.match).length

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
            className="grid grid-cols-[minmax(7rem,1fr)_1fr_1fr_2rem] gap-0 text-xs font-bold uppercase tracking-wider"
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
          </div>

          {/* Rows */}
          {values.map((v, i) => (
            <div
              key={v.field}
              className="grid grid-cols-[minmax(7rem,1fr)_1fr_1fr_2rem] gap-0 text-xs border-t"
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
                }}
              >
                {v.valueA}
              </span>
              <span
                className="border-l px-2.5 py-2 font-mono"
                style={{
                  borderColor: 'oklch(0.93 0.003 250)',
                  color: v.match ? 'oklch(0.25 0.01 250)' : 'oklch(0.45 0.18 25)',
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
