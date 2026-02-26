import type { CfaRecord } from '@/lib/types'
import { CfaClient } from './cfa-client'

async function getData(_binderId: string): Promise<CfaRecord[]> {
  const { cfaA } = await import('@/lib/mock-data/demo-a')
  return cfaA
}

export default async function CfaPage({
  params,
}: {
  params: Promise<{ binderId: string }>
}) {
  const { binderId } = await params
  const data = await getData(binderId)
  return <CfaClient data={data} />
}
