"use client"

import Link from "next/link"
import {
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Brain,
  Route,
  Database,
  Lightbulb,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  Zap,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

/* ────────────────────────────────────────── DATA ── */

const AGENTS = [
  {
    name: "Determination & Orchestration Agent",
    icon: Brain,
    description: "Analyzes submitted binder, determines which wizard applies to each document, and dispatches accordingly.",
  },
  {
    name: "Routing Agent",
    icon: Route,
    description: "Routes individual pages to the correct wizard agent based on determination output.",
  },
  {
    name: "Data Collection Agent",
    icon: Database,
    description: "Extracts relevant fields and data points from routed documents for wizard processing.",
  },
  {
    name: "Guideline Agent",
    icon: Lightbulb,
    description: "Identifies which decision guidelines are applicable based on collected data.",
  },
  {
    name: "Hallucination Agent",
    icon: ShieldAlert,
    description: "Validates guideline accuracy, blocks incorrect or misleading instructions before reasoning.",
  },
  {
    name: "Refinement & Reasoning Agent",
    icon: RefreshCw,
    description: "Produces final AI decision with human-readable reasoning and confidence score for reviewer UI.",
  },
]

/* ────────────────────────────────────────── PAGE ── */

export default function MultiAgentArchitecturePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
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
        <div className="mx-auto max-w-5xl px-6 py-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
              <li><ChevronRight className="size-3" /></li>
              <li><Link href="/phase-1" className="hover:text-foreground transition-colors">Phase 1</Link></li>
              <li><ChevronRight className="size-3" /></li>
              <li className="text-foreground font-medium">Multi-Agent Architecture</li>
            </ol>
          </nav>

          {/* Title */}
          <div className="flex items-start gap-4 mb-8">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--ai-accent)]/10">
              <Brain className="size-6 text-[var(--ai-accent)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[var(--ai-accent)] text-white">Product Brief</Badge>
                <Badge variant="outline">v2</Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                Multi-Agent Architecture
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Overview of self-learning agents powering binder review automation.
              </p>
            </div>
          </div>

          {/* Current Process + How Agents Help */}
          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="size-4 text-[var(--status-warning)]" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Current Process</p>
                </div>
                <ul className="flex flex-col gap-2 text-xs text-muted-foreground leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground" />
                    Verifiers manually compare documents side by side to identify superseded, duplicate, CFA, and NFR pages.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground" />
                    Each binder requires reviewing every page individually with no automated classification or grouping.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground" />
                    Decision guidelines are applied inconsistently across verifiers, leading to variable quality and throughput.
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="size-4 text-[var(--ai-accent)]" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">How Agents Help</p>
                </div>
                <ul className="flex flex-col gap-2 text-xs text-muted-foreground leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-[var(--ai-accent)]" />
                    Automate document classification and wizard assignment -- no manual sorting required.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-[var(--ai-accent)]" />
                    Apply guidelines consistently across every binder with built-in hallucination checks for accuracy.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-[var(--ai-accent)]" />
                    Self-learn from verifier overrides -- decision quality improves continuously without manual rule updates.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Agent Overview Table */}
          <Card>
            <CardContent className="py-5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Agent Overview</p>
              <p className="text-xs text-muted-foreground mb-5">All agents are self-learning. No manual updates required.</p>
              <div className="flex flex-col gap-3">
                {AGENTS.map((agent, idx) => {
                  const AgentIcon = agent.icon
                  return (
                    <div
                      key={agent.name}
                      className="flex items-start gap-4 rounded-lg border border-border p-4"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ai-accent)]/10 text-xs font-bold text-[var(--ai-accent)]">
                        {idx + 1}
                      </div>
                      <div className="flex items-start gap-3 flex-1">
                        <AgentIcon className="size-4 shrink-0 text-[var(--ai-accent)] mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{agent.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-center gap-3 mt-10">
            <Button variant="outline" size="sm" asChild>
              <Link href="/phase-1">
                <ArrowLeft className="size-3.5" />
                Back to Phase 1
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/">Overview</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-4">
        <p className="text-center text-xs text-muted-foreground/60">
          Multi-Agent Architecture v2 -- Product Brief -- Prototype data is for demonstration purposes.
        </p>
      </footer>
    </div>
  )
}
