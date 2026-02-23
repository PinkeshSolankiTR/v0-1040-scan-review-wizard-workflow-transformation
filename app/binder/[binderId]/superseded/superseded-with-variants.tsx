'use client'

import { useState } from 'react'
import type { SupersededRecord } from '@/lib/types'
import { SupersededClient } from './superseded-client'
import { VariantDSuperseded } from '@/components/design-variants/variant-d-split-panel'
import { LayoutList, PanelLeftClose, Check } from 'lucide-react'

const VARIANTS = [
  { id: 'baseline', label: 'Table View', description: 'Category swimlanes with expandable rows', icon: LayoutList },
  { id: 'split-panel', label: 'Split Panel', description: 'Master-detail side by side', icon: PanelLeftClose },
] as const

type VariantId = typeof VARIANTS[number]['id']

export function SupersededWithVariants({ data }: { data: SupersededRecord[] }) {
  const [activeVariant, setActiveVariant] = useState<VariantId>('baseline')

  /* ── Empty state: no superseded documents in this binder ── */
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <header>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
            Superseded Documents
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
              No Superseded Documents Found
            </p>
            <p style={{ fontSize: '0.875rem', color: 'oklch(0.5 0.01 260)', maxInlineSize: '28rem' }}>
              The AI scanned all documents in this binder and found only one version of each form.
              All documents are retained. There are no superseded or amended versions to review.
            </p>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '0.375rem',
            marginBlockStart: '0.5rem', fontSize: '0.8125rem', color: 'oklch(0.45 0.01 260)',
          }}>
            <p><strong>Documents scanned:</strong> W-2, Schedule C, 1099-MISC, Schedule K-1</p>
            <p><strong>Result:</strong> All retained &mdash; no corrected or amended versions detected</p>
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
                transition: 'background-color 0.15s, color 0.15s',
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'var(--primary-foreground)' : 'oklch(0.45 0.01 260)',
              }}
            >
              <Icon
                style={{
                  inlineSize: '1rem',
                  blockSize: '1rem',
                  flexShrink: 0,
                }}
              />
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0' }}>
                <span style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  lineHeight: '1.2',
                }}>
                  {v.label}
                </span>
                <span style={{
                  fontSize: '0.625rem',
                  fontWeight: 400,
                  opacity: isActive ? 0.8 : 0.6,
                  lineHeight: '1.2',
                }}>
                  {v.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Active variant ── */}
      <div role="tabpanel" aria-label={`${VARIANTS.find(v => v.id === activeVariant)?.label} layout`}>
        {activeVariant === 'baseline' && <SupersededClient data={data} />}
        {activeVariant === 'split-panel' && <VariantDSuperseded data={data} />}
      </div>
    </div>
  )
}
