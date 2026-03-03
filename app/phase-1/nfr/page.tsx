'use client'

import { Suspense } from 'react'
import { WizardArtifactPage } from '@/components/wizard-artifact-page'
import { nfrData } from '@/lib/wizard-artifact-data'

export default function NfrArtifactPage() {
  return (
    <Suspense>
      <WizardArtifactPage data={nfrData} />
    </Suspense>
  )
}
