import Link from 'next/link'
import {
  Sparkles,
  ArrowLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Phase2PrdPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="size-7 text-[var(--ai-accent)]" />
            <span className="text-lg font-bold text-foreground">1040SCAN</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Back to Overview
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li><ChevronRight className="size-3" /></li>
              <li className="text-foreground font-medium">Phase 2 PRD</li>
            </ol>
          </nav>

          <div className="flex items-start gap-4 mb-8">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--confidence-medium)]/10">
              <FileText className="size-6 text-[var(--confidence-medium)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[var(--confidence-medium)] text-foreground">
                  In Progress
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                Phase 2: Quick Validation -- PRD
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Product Requirements Document -- Unified Validation View & Field-Level AI Scoring
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Phase 2 PRD content will be added here. Please provide the specific PRD sections to display for this phase.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
