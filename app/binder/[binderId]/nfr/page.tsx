import type { NfrRecord } from '@/lib/types'
import { NfrClient } from './nfr-client'

async function getData(binderId: string): Promise<NfrRecord[]> {
  const { nfrA } = await import('@/lib/mock-data/demo-a')
  const { nfrB } = await import('@/lib/mock-data/demo-b')
  return binderId === 'demo-b' ? nfrB : nfrA
}

export default async function NfrPage({
  params,
}: {
  params: Promise<{ binderId: string }>
}) {
  const { binderId } = await params
  const data = await getData(binderId)
  return <NfrClient data={data} />
}
