'use client'

import { useState } from 'react'
import type { SupersededRecord, DuplicateRecord, CfaRecord, NfrRecord } from '@/lib/types'

import {
  VariantBSuperseded,
  VariantBDuplicate,
  VariantBCfa,
  VariantBNfr,
} from '@/components/design-variants/variant-b-card-stack'

import {
  VariantCSuperseded,
  VariantCDuplicate,
  VariantCCfa,
  VariantCNfr,
} from '@/components/design-variants/variant-c-kanban'

import {
  VariantDSuperseded,
  VariantDDuplicate,
  VariantDCfa,
  VariantDNfr,
} from '@/components/design-variants/variant-d-split-panel'

type DesignId = 'B' | 'C' | 'D'
type WizardId = 'superseded' | 'duplicate' | 'cfa' | 'nfr'

const DESIGNS: { id: DesignId; label: string; subtitle: string; colorAccent: string }[] = [
  {
    id: 'B',
    label: 'Card Stack',
    subtitle: 'Vertical cards with left-edge confidence strip and inline reasoning accordion',
    colorAccent: 'oklch(0.55 0.17 175)',
  },
  {
    id: 'C',
    label: 'Kanban Swim Lane',
    subtitle: 'Three-column board grouped by confidence tier (High / Medium / Low)',
    colorAccent: 'oklch(0.5 0.15 260)',
  },
  {
    id: 'D',
    label: 'Split Panel',
    subtitle: 'Master-detail layout with compact list and rich detail pane',
    colorAccent: 'oklch(0.22 0.03 240)',
  },
]

const WIZARDS: { id: WizardId; label: string }[] = [
  { id: 'superseded', label: 'Superseded' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'cfa', label: 'CFA' },
  { id: 'nfr', label: 'NFR' },
]

export function DesignShowcase({
  superseded,
  duplicate,
  cfa,
  nfr,
}: {
  superseded: SupersededRecord[]
  duplicate: DuplicateRecord[]
  cfa: CfaRecord[]
  nfr: NfrRecord[]
}) {
  const [activeDesign, setActiveDesign] = useState<DesignId>('B')
  const [activeWizard, setActiveWizard] = useState<WizardId>('superseded')

  const renderContent = () => {
    if (activeDesign === 'B') {
      switch (activeWizard) {
        case 'superseded': return <VariantBSuperseded data={superseded} />
        case 'duplicate': return <VariantBDuplicate data={duplicate} />
        case 'cfa': return <VariantBCfa data={cfa} />
        case 'nfr': return <VariantBNfr data={nfr} />
      }
    }
    if (activeDesign === 'C') {
      switch (activeWizard) {
        case 'superseded': return <VariantCSuperseded data={superseded} />
        case 'duplicate': return <VariantCDuplicate data={duplicate} />
        case 'cfa': return <VariantCCfa data={cfa} />
        case 'nfr': return <VariantCNfr data={nfr} />
      }
    }
    if (activeDesign === 'D') {
      switch (activeWizard) {
        case 'superseded': return <VariantDSuperseded data={superseded} />
        case 'duplicate': return <VariantDDuplicate data={duplicate} />
        case 'cfa': return <VariantDCfa data={cfa} />
        case 'nfr': return <VariantDNfr data={nfr} />
      }
    }
    return null
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'oklch(0.97 0.003 260)' }}>
      {/* Page header */}
      <header className="border-b px-6 py-5" style={{ borderColor: 'oklch(0.9 0.005 260)', backgroundColor: 'oklch(1 0 0)' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.15 0.01 260)' }}>
          UI Design Samples
        </h1>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'oklch(0.5 0.01 260)' }}>
          Three alternative visual styles for the post-verification AI review wizard pages.
          Each renders the same Demo Binder A mock data with a distinctly different layout and color scheme.
        </p>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Design selector */}
        <nav aria-label="Design variant selector" className="flex flex-col gap-4 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'oklch(0.5 0.01 260)' }}>
            Select Design Style
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {DESIGNS.map((d) => {
              const isActive = d.id === activeDesign
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDesign(d.id)}
                  className="flex flex-col gap-1.5 rounded-lg border-2 px-4 py-3 text-left transition-all"
                  style={{
                    borderColor: isActive ? d.colorAccent : 'oklch(0.92 0.005 260)',
                    backgroundColor: isActive ? `color-mix(in oklch, ${d.colorAccent} 5%, white)` : 'oklch(1 0 0)',
                  }}
                  aria-pressed={isActive}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex size-6 items-center justify-center rounded text-xs font-bold text-white"
                      style={{ backgroundColor: d.colorAccent }}
                    >
                      {d.id}
                    </span>
                    <span className="text-sm font-bold" style={{ color: 'oklch(0.2 0.01 260)' }}>
                      {d.label}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.5 0.01 260)' }}>
                    {d.subtitle}
                  </p>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Wizard tab strip */}
        <nav
          aria-label="Wizard category selector"
          className="mb-6 flex gap-1 rounded-lg p-1"
          style={{ backgroundColor: 'oklch(0.94 0.005 260)' }}
        >
          {WIZARDS.map((w) => {
            const isActive = w.id === activeWizard
            return (
              <button
                key={w.id}
                onClick={() => setActiveWizard(w.id)}
                className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? 'oklch(1 0 0)' : 'transparent',
                  color: isActive ? 'oklch(0.15 0.01 260)' : 'oklch(0.5 0.01 260)',
                  boxShadow: isActive ? '0 1px 2px oklch(0 0 0 / 0.06)' : 'none',
                }}
                aria-pressed={isActive}
              >
                {w.label}
              </button>
            )
          })}
        </nav>

        {/* Active design content */}
        <div className="rounded-xl border p-6" style={{ borderColor: 'oklch(0.91 0.005 260)', backgroundColor: 'oklch(1 0 0)' }}>
          {renderContent()}
        </div>
      </div>
    </main>
  )
}
