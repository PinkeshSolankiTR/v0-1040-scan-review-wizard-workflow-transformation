import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function InitialDraftPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="size-7 text-[var(--ai-accent)]" />
            <span className="text-lg font-bold text-foreground">
              1040SCAN
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-2 mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
              Initial Draft / Idea
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground leading-relaxed text-pretty">
              Early-stage design concepts and Figma explorations for the
              1040SCAN workflow transformation.
            </p>
          </div>

          {/* Placeholder for Figma designs */}
          <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 px-8 py-16 text-center">
            <Sparkles className="mx-auto size-10 text-muted-foreground/40 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              Figma designs will be uploaded here
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Initial concepts, wireframes, and design explorations
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
