import { Suspense } from 'react'
import { WizardArtifactPage } from '@/components/wizard-artifact-page'
import { supersededData } from '@/lib/wizard-artifact-data'

export default function SupersededArtifactPage() {
  return (
    <Suspense>
      <WizardArtifactPage data={supersededData} />
    </Suspense>
  )
}
