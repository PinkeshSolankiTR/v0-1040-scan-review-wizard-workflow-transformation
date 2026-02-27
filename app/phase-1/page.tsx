import Link from 'next/link'
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  FileStack,
  Copy,
  Link2,
  FileSearch,
  BookOpen,
  Brain,
  RefreshCw,
  Monitor,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const WIZARDS = [
  {
    id: 'superseded',
    title: 'Superseded',
    icon: FileStack,
    accentColor: 'oklch(0.55 0.18 290)',
    description:
      'Identifies superseded source documents (W-2, 1099, 1098, K-1, Consolidated Statements) using payer matching, EIN comparison, corrected indicator analysis, and date-based retention logic.',
    ruleSets: ['Rule Set A (Source Docs): A1-A9', 'Rule Set B (Consolidated): B1-B10'],
    ruleCount: 19,
    decisionTypes: 'Original / Superseded / RetainBoth',
    confidenceBands: '4 bands',
    artifacts: [
      { label: 'AI Decision Spec', icon: Brain, type: 'decision-spec' },
      { label: 'LLM Prompts', icon: BookOpen, type: 'prompts' },
      { label: 'Feedback Loop', icon: RefreshCw, type: 'feedback-loop' },
      { label: 'View Prototype', icon: Monitor, type: 'prototype' },
    ],
  },
  {
    id: 'duplicate',
    title: 'Duplicate Data',
    icon: Copy,
    accentColor: 'oklch(0.55 0.15 250)',
    description:
      'Three determination areas: Duplicate Data (amounts matching), Duplicate Source Documents (payer/jurisdiction matching), and Duplicate Consolidated Statements (broker/account matching).',
    ruleSets: ['DUP-DATA: 1-3', 'DUP-SRC: 1-9', 'DUP-CS: 1-5'],
    ruleCount: 17,
    decisionTypes: 'Duplicate / NotDuplicate',
    confidenceBands: '3 bands',
    artifacts: [
      { label: 'AI Decision Spec', icon: Brain, type: 'decision-spec' },
      { label: 'LLM Prompts', icon: BookOpen, type: 'prompts' },
      { label: 'Feedback Loop', icon: RefreshCw, type: 'feedback-loop' },
      { label: 'View Prototype', icon: Monitor, type: 'prototype' },
    ],
  },
  {
    id: 'cfa',
    title: 'Child Form Association',
    icon: Link2,
    accentColor: 'oklch(0.55 0.17 165)',
    description:
      'Associates unassociated child documents to the most appropriate parent form. Enforces mandatory compatibility checks, name/identifier matching, placeholder avoidance, and AddForm creation.',
    ruleSets: ['CFA-1 to CFA-5'],
    ruleCount: 5,
    decisionTypes: 'Associate / AddForm / Unmatched',
    confidenceBands: '4 bands',
    artifacts: [
      { label: 'AI Decision Spec', icon: Brain, type: 'decision-spec' },
      { label: 'LLM Prompts', icon: BookOpen, type: 'prompts' },
      { label: 'Feedback Loop', icon: RefreshCw, type: 'feedback-loop' },
      { label: 'View Prototype', icon: Monitor, type: 'prototype' },
    ],
  },
  {
    id: 'nfr',
    title: 'New Form Review',
    icon: FileSearch,
    accentColor: 'oklch(0.6 0.15 60)',
    description:
      'Matches unmatched documents to existing proforma input forms. Enforces formTypeId compatibility, ImageIndex eligibility, 80% accuracy threshold, and no forced matches.',
    ruleSets: ['NFR-1 to NFR-6'],
    ruleCount: 6,
    decisionTypes: 'Match / Unmatched / Supersede / Merge',
    confidenceBands: '4 bands',
    artifacts: [
      { label: 'AI Decision Spec', icon: Brain, type: 'decision-spec' },
      { label: 'LLM Prompts', icon: BookOpen, type: 'prompts' },
      { label: 'Feedback Loop', icon: RefreshCw, type: 'feedback-loop' },
      { label: 'View Prototype', icon: Monitor, type: 'prototype' },
    ],
  },
]

const PROTOTYPE_ROUTES: Record<string, string> = {
  superseded: '/binder/demo-a/superseded',
  duplicate: '/binder/demo-a/duplicate',
  cfa: '/binder/demo-a/cfa',
  nfr: '/binder/demo-a/nfr',
}

function WizardCard({ wizard }: { wizard: (typeof WIZARDS)[number] }) {
  const Icon = wizard.icon
  return (
    <Card
      className="flex flex-col border-l-4 hover:shadow-lg transition-shadow"
      style={{ borderLeftColor: wizard.accentColor }}
    >
      <CardHeader className="flex-row items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in oklch, ${wizard.accentColor} 12%, transparent)` }}
        >
          <Icon className="size-5" style={{ color: wizard.accentColor }} />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">{wizard.title}</CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {wizard.ruleCount} rules
            </Badge>
            <Badge variant="outline" className="text-xs">
              {wizard.confidenceBands}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {wizard.description}
        </p>

        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Rule Sets
          </p>
          <ul className="flex flex-col gap-0.5">
            {wizard.ruleSets.map((rs) => (
              <li key={rs} className="text-xs text-muted-foreground">
                {rs}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs">
          <span className="font-semibold text-foreground">Decisions: </span>
          <span className="text-muted-foreground">{wizard.decisionTypes}</span>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          {wizard.artifacts.map((artifact) => {
            const AIcon = artifact.icon
            if (artifact.type === 'prototype') {
              return (
                <a
                  key={artifact.type}
                  href={PROTOTYPE_ROUTES[wizard.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <AIcon className="size-3.5 text-muted-foreground" />
                  {artifact.label}
                </a>
              )
            }
            return (
              <Link
                key={artifact.type}
                href={`/phase-1/${wizard.id}?tab=${artifact.type}`}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                <AIcon className="size-3.5 text-muted-foreground" />
                {artifact.label}
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Phase1Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
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
          {/* Phase header */}
          <div className="flex flex-col gap-1 mb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-[var(--confidence-high)] text-white">
                Active
              </Badge>
              <span className="text-xs text-muted-foreground">
                Epic 4651627
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              Phase 1: Elimination of Wizard
            </h1>
          </div>

          {/* Summary strip */}
          <div className="rounded-lg border border-border bg-card p-4 mb-8">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Phase 1 eliminates 4 of 7 wizard steps through AI-automated
              business rules. Each wizard below has a complete AI Decision
              Specification, LLM Prompt design, Feedback Loop mechanism, and a
              working interactive prototype. Target:{' '}
              <strong className="text-foreground">
                50% verification time reduction
              </strong>
              .
            </p>
          </div>

          {/* Wizard cards grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {WIZARDS.map((wizard) => (
              <WizardCard key={wizard.id} wizard={wizard} />
            ))}
          </div>

          {/* Quick access to full prototype */}
          <div className="mt-8 flex justify-center">
            <Button variant="outline" asChild>
              <a
                href="/binder/demo-a"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Full Prototype Demo
                <ArrowRight className="size-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
