import type { Binder } from '@/lib/types'
import { BinderShell } from './binder-shell'

async function getBinder(_binderId: string): Promise<Binder> {
  const { binderA } = await import('@/lib/mock-data/demo-a')
  return binderA
}

export default async function BinderLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ binderId: string }>
}) {
  const { binderId } = await params
  const binder = await getBinder(binderId)

  return <BinderShell binder={binder}>{children}</BinderShell>
}
