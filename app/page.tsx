import Link from 'next/link'
import { Sparkles, ArrowRight, FileStack, Copy, Link2, FileSearch } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { binderA } from '@/lib/mock-data/demo-a'

const WIZARD_ICONS: Record<string, React.ElementType> = {
  superseded: FileStack,
  duplicate: Copy,
  cfa: Link2,
  nfr: FileSearch,
}

function BinderCard({ binder }: { binder: typeof binderA }) {
  const reviewNeeded = binder.summary.reduce((s, w) => s + w.mediumConfidence + w.lowConfidence, 0)
  const autoApplied = binder.summary.reduce((s, w) => s + w.highConfidence, 0)
  const total = binder.summary.reduce((s, w) => s + w.totalItems, 0)

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{binder.label}</CardTitle>
        <CardDescription>
          {binder.taxpayerName}{' | TY '}{binder.taxYear}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md bg-muted px-3 py-2 text-center">
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </div>
          <div className="rounded-md bg-[var(--confidence-high)]/10 px-3 py-2 text-center">
            <p className="text-2xl font-bold text-[var(--confidence-high)]">{autoApplied}</p>
            <p className="text-xs text-muted-foreground">Auto-applied</p>
          </div>
          <div className="rounded-md bg-[var(--confidence-medium)]/10 px-3 py-2 text-center">
            <p className="text-2xl font-bold text-[var(--confidence-low)]">{reviewNeeded}</p>
            <p className="text-xs text-muted-foreground">Review Needed</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {binder.summary.map((s) => {
            const Icon = WIZARD_ICONS[s.wizardType]
            return (
              <div key={s.wizardType} className="flex items-center gap-3 text-sm">
                {Icon && <Icon className="size-4 text-muted-foreground" />}
                <span className="flex-1 capitalize">{s.wizardType}</span>
                <Badge variant="secondary" className="text-xs">
                  {s.totalItems}
                </Badge>
              </div>
            )
          })}
        </div>

        <div className="mt-auto pt-2">
          <Button asChild className="w-full">
            <Link href={`/binder/${binder.id}`}>
              Start Demo
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <Sparkles className="size-8 text-[var(--ai-accent)]" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
            1040Scan Post-Verification AI Review
          </h1>
        </div>
        <p className="max-w-lg text-base text-muted-foreground leading-relaxed text-pretty">
          AI-assisted review of Superseded, Duplicate, CFA, and NFR decisions.
          Select a binder to explore AI-driven recommendations with
          confidence scoring.
        </p>
      </div>

      <div className="mt-10 w-full max-w-sm">
        <BinderCard binder={binderA} />
      </div>

      <p className="mt-10 text-xs text-muted-foreground/60">
        Prototype — All data is mocked. No external services required.
      </p>
    </div>
  )
}
