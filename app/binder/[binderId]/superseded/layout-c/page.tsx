import type { SupersededRecord } from '@/lib/types'
import { LayoutCSplitFocus } from '@/components/design-variants/layout-c-split-focus'

async function getData(): Promise<SupersededRecord[]> {
  const { supersededA } = await import('@/lib/mock-data/demo-a')
  return supersededA
}

export default async function LayoutCPage() {
  const data = await getData()
  return <LayoutCSplitFocus data={data} />
}
