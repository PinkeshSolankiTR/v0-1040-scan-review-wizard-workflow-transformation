import type { SupersededRecord } from '@/lib/types'
import { SupersededWithVariants } from './superseded-with-variants'

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
  return <SupersededWithVariants data={data} />
}
