import { DesignShowcase } from './design-showcase'
import { supersededA, duplicateA, cfaA, nfrA } from '@/lib/mock-data/demo-a'

export const metadata = {
  title: 'Design Samples — 1040Scan UI Variants',
  description: 'Three alternative UI design approaches for the post-verification AI review wizards.',
}

export default function DesignSamplesPage() {
  return (
    <DesignShowcase
      superseded={supersededA}
      duplicate={duplicateA}
      cfa={cfaA}
      nfr={nfrA}
    />
  )
}
