import type { SupersededRecord } from '@/lib/types'
import { SupersededClient } from './superseded-client'

async function getData(binderId: string): Promise<SupersededRecord[]> {
  const { supersededA } = await import('@/lib/mock-data/demo-a')
  const { supersededB } = await import('@/lib/mock-data/demo-b')
  return binderId === 'demo-b' ? supersededB : supersededA
}

export default async function SupersededPage({
  params,
}: {
  params: Promise<{ binderId: string }>
}) {
  const { binderId } = await params
  const data = await getData(binderId)
  return <SupersededClient data={data} />
}
