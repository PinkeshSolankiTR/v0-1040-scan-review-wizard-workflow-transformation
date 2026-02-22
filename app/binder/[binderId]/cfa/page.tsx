import type { CfaRecord } from '@/lib/types'
import { CfaClient } from './cfa-client'

async function getData(binderId: string): Promise<CfaRecord[]> {
  const { cfaA } = await import('@/lib/mock-data/demo-a')
  const { cfaB } = await import('@/lib/mock-data/demo-b')
  return binderId === 'demo-b' ? cfaB : cfaA
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
