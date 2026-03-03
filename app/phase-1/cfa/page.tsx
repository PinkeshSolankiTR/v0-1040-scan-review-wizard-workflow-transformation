'use client'

import { Suspense } from 'react'
import { WizardArtifactPage } from '@/components/wizard-artifact-page'
import { cfaData } from '@/lib/wizard-artifact-data'

export default function CfaArtifactPage() {
  return (
    <Suspense>
      <WizardArtifactPage data={cfaData} />
    </Suspense>
  )
}
