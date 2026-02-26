import type { SupersededRecord } from '@/lib/types'
import { VariantEDocCompare } from '@/components/design-variants/variant-e-doc-compare'
import { Check } from 'lucide-react'

async function getData(_binderId: string): Promise<SupersededRecord[]> {
  const { supersededA } = await import('@/lib/mock-data/demo-a')
  return supersededA
}

export default async function SupersededPage({
  params,
}: {
  params: Promise<{ binderId: string }>
}) {
  const { binderId } = await params
  const data = await getData(binderId)

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
              All documents are retained.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <VariantEDocCompare data={data} />
}
