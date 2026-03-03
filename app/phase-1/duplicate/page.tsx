'use client'

import { Suspense } from 'react'
import { WizardArtifactPage } from '@/components/wizard-artifact-page'
import { duplicateData } from '@/lib/wizard-artifact-data'

export default function DuplicateArtifactPage() {
  return (
    <Suspense>
      <WizardArtifactPage data={duplicateData} />
    </Suspense>
  )
}
