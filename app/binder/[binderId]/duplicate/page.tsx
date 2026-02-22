import type { DuplicateRecord } from '@/lib/types'
import { DuplicateClient } from './duplicate-client'

async function getData(binderId: string): Promise<DuplicateRecord[]> {
  const { duplicateA } = await import('@/lib/mock-data/demo-a')
  const { duplicateB } = await import('@/lib/mock-data/demo-b')
  return binderId === 'demo-b' ? duplicateB : duplicateA
}

export default async function DuplicatePage({
  params,
}: {
  params: Promise<{ binderId: string }>
}) {
  const { binderId } = await params
  const data = await getData(binderId)
  return <DuplicateClient data={data} />
}
