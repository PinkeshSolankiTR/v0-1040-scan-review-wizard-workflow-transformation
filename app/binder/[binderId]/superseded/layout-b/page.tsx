import type { SupersededRecord } from '@/lib/types'
import { LayoutBCardStack } from '@/components/design-variants/layout-b-card-stack'

async function getData(): Promise<SupersededRecord[]> {
  const { supersededA } = await import('@/lib/mock-data/demo-a')
  return supersededA
}

export default async function LayoutBPage() {
  const data = await getData()
  return <LayoutBCardStack data={data} />
}
