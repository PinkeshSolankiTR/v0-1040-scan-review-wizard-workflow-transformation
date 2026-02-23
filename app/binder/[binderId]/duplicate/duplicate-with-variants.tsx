'use client'

import { useState } from 'react'
import type { DuplicateRecord } from '@/lib/types'
import { DuplicateClient } from './duplicate-client'
import { DuplicateSplitPanel } from '@/components/design-variants/duplicate-split-panel'
import { DuplicateDocCompare } from '@/components/design-variants/duplicate-doc-compare'
import { DuplicateCompareTable } from '@/components/design-variants/duplicate-compare-table'
import { DuplicateSideBySide } from '@/components/design-variants/duplicate-side-by-side'
import { DuplicateMatrixGrid } from '@/components/design-variants/duplicate-matrix-grid'
import { DuplicateStackedCards } from '@/components/design-variants/duplicate-stacked-cards'
import { LayoutList, PanelLeftClose, Columns2, LayoutDashboard, Check, SplitSquareHorizontal, Grid3X3, Layers } from 'lucide-react'

const VARIANTS = [
  { id: 'baseline', label: 'Table View', description: 'Category tabs with matched/unmatched sections', icon: LayoutList },
  { id: 'split-panel', label: 'Split Panel', description: 'Master-detail side by side', icon: PanelLeftClose },
  { id: 'doc-compare', label: 'Document Compare', description: 'Side-by-side PDF comparison', icon: Columns2 },
  { id: 'compare-table', label: 'Compare + Table', description: 'PDF comparison with review table', icon: LayoutDashboard },
  { id: 'side-by-side', label: 'Side-by-Side', description: 'Two-column matching workflow', icon: SplitSquareHorizontal },
  { id: 'matrix-grid', label: 'Matrix Grid', description: 'Cross-reference confidence grid', icon: Grid3X3 },
  { id: 'stacked-cards', label: 'Pair Cards', description: 'Stacked pair cards for rapid triage', icon: Layers },
] as const

type VariantId = typeof VARIANTS[number]['id']

export function DuplicateWithVariants({ data }: { data: DuplicateRecord[] }) {
  const [activeVariant, setActiveVariant] = useState<VariantId>('baseline')

  /* ── Empty state ── */
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <header>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
            Duplicate Data
          </h1>
        </header>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '4rem 2rem', borderRadius: 'var(--radius)',
          border: '0.125rem dashed oklch(0.88 0.01 260)', backgroundColor: 'oklch(0.98 0.003 260)',
          textAlign: 'center', gap: '1rem',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            inlineSize: '3.5rem', blockSize: '3.5rem', borderRadius: '50%',
            backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.40 0.15 145)',
          }}>
            <Check style={{ inlineSize: '1.75rem', blockSize: '1.75rem' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)', marginBlockEnd: '0.375rem' }}>
              No Duplicates Found
            </p>
            <p style={{ fontSize: '0.875rem', color: 'oklch(0.5 0.01 260)', maxInlineSize: '28rem' }}>
              The AI scanned all organizer pages and source documents in this binder and found no duplicate data or documents.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Variant switcher toolbar ── */}
      <div
        role="tablist"
        aria-label="Layout variant selector"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: '0',
          borderRadius: 'var(--radius)',
          border: '0.0625rem solid oklch(0.88 0.01 260)',
          overflow: 'hidden',
          backgroundColor: 'oklch(0.97 0.005 260)',
        }}
      >
        {VARIANTS.map((v, idx) => {
          const isActive = v.id === activeVariant
          const Icon = v.icon
          return (
            <button
              key={v.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActiveVariant(v.id)}
              style={{
                flex: '1 1 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.625rem 0.75rem',
                border: 'none',
                borderInlineEnd: idx < VARIANTS.length - 1 ? '0.0625rem solid oklch(0.88 0.01 260)' : 'none',
                cursor: 'pointer',
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'var(--primary-foreground)' : 'oklch(0.45 0.01 260)',
              }}
            >
              <Icon style={{ inlineSize: '1rem', blockSize: '1rem', flexShrink: 0 }} />
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, lineHeight: '1.2' }}>{v.label}</span>
                <span style={{ fontSize: '0.625rem', fontWeight: 400, opacity: isActive ? 0.8 : 0.6, lineHeight: '1.2' }}>{v.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Active variant ── */}
      <div role="tabpanel" aria-label={`${VARIANTS.find(v => v.id === activeVariant)?.label} layout`}>
        {activeVariant === 'baseline' && <DuplicateClient data={data} />}
        {activeVariant === 'split-panel' && <DuplicateSplitPanel data={data} />}
        {activeVariant === 'doc-compare' && <DuplicateDocCompare data={data} />}
        {activeVariant === 'compare-table' && <DuplicateCompareTable data={data} />}
        {activeVariant === 'side-by-side' && <DuplicateSideBySide data={data} />}
        {activeVariant === 'matrix-grid' && <DuplicateMatrixGrid data={data} />}
        {activeVariant === 'stacked-cards' && <DuplicateStackedCards data={data} />}
      </div>
    </div>
  )
}
