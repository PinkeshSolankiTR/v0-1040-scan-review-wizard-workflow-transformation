import type { NfrRecord } from '@/lib/types'
import { NfrClient } from './nfr-client'

async function getData(_binderId: string): Promise<NfrRecord[]> {
  const { nfrA } = await import('@/lib/mock-data/demo-a')
  return nfrA
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
