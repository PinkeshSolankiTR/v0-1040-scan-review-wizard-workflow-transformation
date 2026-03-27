import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
  BarChart3,
  Clock,
  Target,
  Zap,
  FileText,
  Brain,
  Map,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const PHASES = [
  {
    id: 'phase-1',
    phase: 'Phase 1',
    title: 'Elimination of Wizard',
    subtitle: 'AI-Driven Intelligent Automation & Wizard Reduction',
    status: 'Active',
    statusColor: 'bg-[var(--confidence-high)] text-white',
    borderColor: 'border-l-[var(--confidence-high)]',
    icon: Layers,
    description:
      'Remove 4 of 7 wizard steps through AI-driven automation. AI learns from document patterns and presents results with confidence indicators for reviewer validation.',
    metrics: [
      { label: 'Target Time Reduction', value: '50%', icon: Clock },
      { label: 'Wizards Prototyped', value: '4/4', icon: Target },
      { label: 'AI Guidelines', value: '4', icon: Zap },
    ],
    href: '/phase-1',
    prdHref: '/prd/phase-1',
    archHref: '/multi-agent-architecture',
    roadmapHref: '/phase-1/roadmap',
    actionLabel: 'Explore Phase 1',
    available: true,
  },
  {
    id: 'phase-2',
    phase: 'Phase 2',
    title: 'Quick Validation',
    subtitle: 'Unified Validation View & Field-Level AI Scoring',
    status: 'In Progress',
    statusColor: 'bg-[var(--confidence-medium)] text-foreground',
    borderColor: 'border-l-[var(--confidence-medium)]',
    icon: CheckCircle2,
    description:
      'Unified validation view replacing the wizard-driven flow. Dashboard with field-level validation, AI confidence scores, and page-level review.',
    metrics: [
      { label: 'Target Time Savings', value: '20%', icon: Clock },
      { label: 'AI Accuracy Target', value: '95%', icon: Target },
      { label: 'Team', value: 'Other', icon: Zap },
    ],
    href: '#',
    prdHref: '/prd/phase-2',
    actionLabel: 'Coming Soon',
    available: false,
  },
  {
    id: 'phase-3',
    phase: 'Phase 3',
    title: 'Dashboard & Gamification',
    subtitle: 'Analytics, Gamification & Continuous Feedback',
    status: 'Planned',
    statusColor: 'bg-muted text-muted-foreground',
    borderColor: 'border-l-border',
    icon: BarChart3,
    description:
      'Analytics dashboard with badges, leaderboards, progress bars, streak counters, and actionable insights. Built-in feedback mechanism for continuous improvement.',
    metrics: [
      { label: 'Engagement Target', value: '60%', icon: Clock },
      { label: 'Efficiency Increase', value: '15%', icon: Target },
      { label: 'Status', value: 'Future', icon: Zap },
    ],
    href: '#',
    prdHref: '/prd/phase-3',
    actionLabel: 'Coming Soon',
    available: false,
  },
]

function PhaseCard({
  phase,
}: {
  phase: (typeof PHASES)[number]
}) {
  const Icon = phase.icon
  return (
    <Card
      className={`flex flex-col border-l-4 ${phase.borderColor} ${
        phase.available
          ? 'hover:shadow-lg transition-shadow'
          : 'opacity-75'
      }`}
    >
      <CardHeader className="flex-row items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--ai-accent)]/10">
          <Icon className="size-5 text-[var(--ai-accent)]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {phase.phase}
            </span>
            <Badge className={phase.statusColor}>{phase.status}</Badge>
          </div>
          <CardTitle className="text-lg leading-snug">{phase.title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{phase.subtitle}</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {phase.description}
        </p>

        <div className="grid grid-cols-3 gap-3">
          {phase.metrics.map((m) => (
            <div
              key={m.label}
              className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-3 text-center"
            >
              <p className="text-lg font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                {m.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href={phase.prdHref}>
              <FileText className="size-3.5" />
              PRD Context
            </Link>
          </Button>
          {phase.archHref && (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={phase.archHref}>
                <Brain className="size-3.5" />
                Multi Agent Architecture
              </Link>
            </Button>
          )}
          {phase.roadmapHref && (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={phase.roadmapHref}>
                <Map className="size-3.5" />
                Delivery Roadmap
              </Link>
            </Button>
          )}
          {phase.available ? (
            <Button asChild className="w-full">
              <Link href={phase.href}>
                {phase.actionLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" disabled className="w-full">
              {phase.actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function HomePage() {
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

        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-2 mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
              Review Wizard Web Workflow Transformation
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground leading-relaxed text-pretty">
              AI-powered transformation of the 1040SCAN post-verification
              review process. Eliminating manual wizard steps, introducing
              intelligent validation, and driving engagement through
              analytics.
            </p>
          </div>

          {/* Phase Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {PHASES.map((phase) => (
              <PhaseCard key={phase.id} phase={phase} />
            ))}
          </div>

          {/* Initial Draft / Idea */}
          <div className="mt-10 flex justify-center">
            <Button variant="outline" asChild className="gap-2">
              <Link href="/initial-draft">
                <Sparkles className="size-4" />
                Initial Draft / Idea
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-muted-foreground/60">
            Product Strategy Presentation — Prototype data is mocked for
            demonstration purposes.
          </p>
        </div>
      </main>
    </div>
  )
}
