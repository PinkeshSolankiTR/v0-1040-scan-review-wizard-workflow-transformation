import Link from 'next/link'
import { FileStack, Copy, Link2, FileSearch, ArrowRight, Sparkles, Brain } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Binder, WizardSummary } from '@/lib/types'

const WIZARD_META: Record<string, { icon: React.ElementType; label: string; path: string }> = {
  superseded: { icon: FileStack, label: 'Superseded', path: 'superseded' },
  duplicate: { icon: Copy, label: 'Duplicate', path: 'duplicate' },
  cfa: { icon: Link2, label: 'CFA', path: 'cfa' },
  nfr: { icon: FileSearch, label: 'NFR', path: 'nfr' },
}

function WizardCard({ summary, binderId }: { summary: WizardSummary; binderId: string }) {
  const meta = WIZARD_META[summary.wizardType]
  if (!meta) return null
  const Icon = meta.icon

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-[var(--ai-accent)]/10">
          <Icon className="size-5 text-[var(--ai-accent)]" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">{meta.label}</CardTitle>
        </div>
        <Badge variant="secondary">{summary.totalItems} items</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-[var(--confidence-high)]/10 py-2">
            <p className="text-lg font-bold text-[var(--confidence-high)]">{summary.highConfidence}</p>
            <p className="text-xs text-muted-foreground">High</p>
          </div>
          <div className="rounded-md bg-[var(--confidence-medium)]/10 py-2">
            <p className="text-lg font-bold text-[var(--confidence-medium)]">{summary.mediumConfidence}</p>
            <p className="text-xs text-muted-foreground">Medium</p>
          </div>
          <div className="rounded-md bg-[var(--confidence-low)]/10 py-2">
            <p className="text-lg font-bold text-[var(--confidence-low)]">{summary.lowConfidence}</p>
            <p className="text-xs text-muted-foreground">Low</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href={`/binder/${binderId}/${meta.path}`}>
            View Details
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

async function getBinder(_binderId: string): Promise<Binder> {
  const { binderA } = await import('@/lib/mock-data/demo-a')
  return binderA
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ binderId: string }>
}) {
  const { binderId } = await params
  const binder = await getBinder(binderId)
  const totalItems = binder.summary.reduce((s, w) => s + w.totalItems, 0)
  const autoApplied = binder.summary.reduce((s, w) => s + w.highConfidence, 0)
  const reviewNeeded = binder.summary.reduce((s, w) => s + w.mediumConfidence + w.lowConfidence, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            AI review summary for {binder.taxpayerName} — TY {binder.taxYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/learned-rules">
              <Brain className="size-4" />
              AI Rules Admin
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/binder/${binderId}/review-queue`}>
              Review Queue
              <Badge className="bg-[var(--confidence-low)] text-white">{reviewNeeded}</Badge>
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex size-10 items-center justify-center rounded-md bg-muted">
              <Sparkles className="size-5 text-[var(--ai-accent)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total AI Decisions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex size-10 items-center justify-center rounded-md bg-[var(--confidence-high)]/10">
              <div className="size-3 rounded-full bg-[var(--confidence-high)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--confidence-high)]">{autoApplied}</p>
              <p className="text-xs text-muted-foreground">Auto-applied (High)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex size-10 items-center justify-center rounded-md bg-[var(--confidence-low)]/10">
              <div className="size-3 rounded-full bg-[var(--confidence-low)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--confidence-low)]">{reviewNeeded}</p>
              <p className="text-xs text-muted-foreground">Review Needed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wizard cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {binder.summary.map((s) => (
          <WizardCard key={s.wizardType} summary={s} binderId={binderId} />
        ))}
      </div>
    </div>
  )
}
