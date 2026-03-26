import type { SupersededRecord } from '@/lib/types'
import { LayoutAWizard } from '@/components/design-variants/layout-a-wizard'

async function getData(): Promise<SupersededRecord[]> {
  const { supersededA } = await import('@/lib/mock-data/demo-a')
  return supersededA
}

export default async function LayoutAPage() {
  const data = await getData()
  return <LayoutAWizard data={data} />
}
