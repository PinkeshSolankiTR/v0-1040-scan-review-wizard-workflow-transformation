import type { DuplicateRecord } from '@/lib/types'
import { DuplicateClient } from './duplicate-client'

async function getData(_binderId: string): Promise<DuplicateRecord[]> {
  const { duplicateA } = await import('@/lib/mock-data/demo-a')
  return duplicateA
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
