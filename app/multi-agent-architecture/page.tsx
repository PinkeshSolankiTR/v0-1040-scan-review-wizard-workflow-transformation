"use client"

import Link from "next/link"
import {
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Brain,
  Route,
  FileStack,
  Copy,
  Link2,
  FileSearch,
  ArrowDown,
  Target,
  Database,
  Shield,
  ShieldAlert,
  Lightbulb,
  RefreshCw,
  BarChart3,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

/* ────────────────────────────────────────── DATA ── */

const WIZARD_ICONS = {
  superseded: FileStack,
  duplicate: Copy,
  cfa: Link2,
  nfr: FileSearch,
}

const SUB_AGENTS = [
  {
    name: "Data Collection Agent",
    icon: Database,
    objective: "Extract and structure all relevant fields from routed documents (payer names, amounts, IDs, dates, form types).",
    selfLearning: "Adapts to new form layouts, OCR variations, and edge cases from correction history.",
  },
  {
    name: "Guideline Agent",
    icon: Lightbulb,
    objective: "Based on collected data, determine which decision guidelines are applicable to this wizard context.",
    selfLearning: "Adjusts guideline prioritization from override patterns -- learns which guidelines matter most.",
  },
  {
    name: "Hallucination Agent",
    icon: ShieldAlert,
    objective: "Validate that the guidelines and instructions from the Guideline Agent are correct, consistent, and not misleading.",
    selfLearning: "Builds a library of known false-positive and false-negative patterns from flagged errors.",
  },
  {
    name: "Refinement & Reasoning Agent",
    icon: RefreshCw,
    objective: "Using validated guidelines, produce the final AI decision with human-readable reasoning and confidence score for UI display.",
    selfLearning: "Refines explanation clarity and confidence calibration from verifier feedback.",
  },
]

const WIZARDS = [
  { id: "superseded", name: "Superseded", desc: "Identifies newer, corrected, or amended document versions within same-type groups." },
  { id: "duplicate", name: "Duplicate", desc: "Detects exact or near-exact duplicate documents by comparing key fields." },
  { id: "cfa", name: "Child Form Association", desc: "Associates child forms (schedules, attachments) with their correct parent forms." },
  { id: "nfr", name: "New Form Review", desc: "Matches unclassified documents to existing proforma input forms." },
] as const

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
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                After binder submission, a pipeline of self-learning agents determines, routes, and processes documents through post-wizards -- producing AI reasoning with confidence scores for verifier validation.
              </p>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-4 gap-4 mb-10">
            {[
              { value: "2", label: "Pipeline Agents", sub: "Determination + Routing" },
              { value: "4", label: "Post-Wizards", sub: "Superseded, Duplicate, CFA, NFR" },
              { value: "4", label: "Sub-Agents per Wizard", sub: "Uniform across all wizards" },
              { value: "18", label: "Total Agents", sub: "All self-learning" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-4 text-center">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs font-medium text-foreground mt-1">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-10">

            {/* ═══════════════ SECTION 1: PIPELINE ═══════════════ */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ai-accent)]/10">
                  <Route className="size-4 text-[var(--ai-accent)]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Agent Pipeline</h2>
              </div>

              <div className="flex flex-col gap-3">
                {/* Stage 1: Determination & Orchestration */}
                <Card className="border-l-4 border-l-[var(--ai-accent)]">
                  <CardContent className="py-5">
                    <div className="flex items-start gap-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--ai-accent)]/10 text-sm font-bold text-[var(--ai-accent)]">1</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground">Determination & Orchestration Agent</h3>
                          <Badge variant="outline" className="text-xs">Self-learning</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          Analyzes binder contents (document types, metadata, relationships) to decide which post-wizard each document belongs to. A document goes to exactly one wizard -- single-label classification. Also manages parallel dispatch and timeout handling across wizards.
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded bg-muted/50 px-3 py-2">
                            <p className="text-xs font-medium text-foreground">Input</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Binder documents + metadata</p>
                          </div>
                          <div className="rounded bg-muted/50 px-3 py-2">
                            <p className="text-xs font-medium text-foreground">Output</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Wizard assignment per document</p>
                          </div>
                          <div className="rounded bg-muted/50 px-3 py-2">
                            <p className="text-xs font-medium text-foreground">Learns from</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Misclassification corrections</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <ArrowDown className="size-5 text-muted-foreground mx-auto" />

                {/* Stage 2: Routing */}
                <Card className="border-l-4 border-l-[var(--ai-accent)]">
                  <CardContent className="py-5">
                    <div className="flex items-start gap-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--ai-accent)]/10 text-sm font-bold text-[var(--ai-accent)]">2</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground">Routing Agent</h3>
                          <Badge variant="outline" className="text-xs">Self-learning</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          Routes each page to its assigned wizard agent. Takes the determination output and dispatches pages to the correct wizard pipeline for processing.
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded bg-muted/50 px-3 py-2">
                            <p className="text-xs font-medium text-foreground">Input</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Determination output</p>
                          </div>
                          <div className="rounded bg-muted/50 px-3 py-2">
                            <p className="text-xs font-medium text-foreground">Output</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Pages dispatched to wizards</p>
                          </div>
                          <div className="rounded bg-muted/50 px-3 py-2">
                            <p className="text-xs font-medium text-foreground">Learns from</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Routing correction patterns</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <ArrowDown className="size-5 text-muted-foreground mx-auto" />

                {/* Stage 3: Wizard Pipelines */}
                <Card className="border-l-4 border-l-[var(--status-success)]">
                  <CardContent className="py-5">
                    <div className="flex items-start gap-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--status-success)]/10 text-sm font-bold text-[var(--status-success)]">3</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground">Post-Wizard Pipelines (4 wizards, uniform structure)</h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          Each wizard executes the same 4-agent sub-pipeline sequentially. Independent wizards run in parallel.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {WIZARDS.map((w) => {
                            const WIcon = WIZARD_ICONS[w.id]
                            return (
                              <div key={w.id} className="rounded-lg border border-border p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <WIcon className="size-3.5 text-[var(--ai-accent)]" />
                                  <p className="text-xs font-semibold text-foreground">{w.name}</p>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{w.desc}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ═══════════════ SECTION 2: SUB-PIPELINE ═══════════════ */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ai-accent)]/10">
                  <Target className="size-4 text-[var(--ai-accent)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Per-Wizard Sub-Pipeline</h2>
                  <p className="text-xs text-muted-foreground">Runs identically in Superseded, Duplicate, CFA, and NFR. All 4 agents are self-learning.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {SUB_AGENTS.map((agent, idx) => {
                  const AgentIcon = agent.icon
                  return (
                    <div key={agent.name}>
                      <Card>
                        <CardContent className="py-4">
                          <div className="flex items-start gap-4">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{idx + 1}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <AgentIcon className="size-3.5 text-[var(--ai-accent)]" />
                                <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                <div className="rounded bg-muted/50 px-3 py-2">
                                  <p className="text-xs font-medium text-foreground mb-0.5">Objective</p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{agent.objective}</p>
                                </div>
                                <div className="rounded bg-muted/50 px-3 py-2">
                                  <p className="text-xs font-medium text-foreground mb-0.5">Self-Learning</p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{agent.selfLearning}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      {idx < SUB_AGENTS.length - 1 && (
                        <ArrowDown className="size-4 text-muted-foreground mx-auto mt-2" />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Hallucination → Confidence mapping */}
              <Card className="mt-4">
                <CardContent className="py-4">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Hallucination Agent Impact on Confidence</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border p-3 border-l-4 border-l-[var(--confidence-high)]">
                      <p className="text-xs font-semibold text-foreground">High Confidence</p>
                      <p className="text-xs text-muted-foreground mt-1">All guidelines validated. No issues detected.</p>
                    </div>
                    <div className="rounded-lg border border-border p-3 border-l-4 border-l-[var(--confidence-medium)]">
                      <p className="text-xs font-semibold text-foreground">Medium / Low Confidence</p>
                      <p className="text-xs text-muted-foreground mt-1">Some guidelines flagged. Reasoning produced with fewer guidelines -- confidence reduced proportionally.</p>
                    </div>
                    <div className="rounded-lg border border-border p-3 border-l-4 border-l-muted-foreground">
                      <p className="text-xs font-semibold text-foreground">All Guidelines Flagged</p>
                      <p className="text-xs text-muted-foreground mt-1">Lowest confidence. Verifier sees the group requires careful manual review.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ═══════════════ SECTION 3: FLOW DIAGRAM ═══════════════ */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ai-accent)]/10">
                  <BarChart3 className="size-4 text-[var(--ai-accent)]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">End-to-End Flow</h2>
              </div>

              <Card>
                <CardContent className="py-6">
                  <div className="flex flex-col items-center gap-3">
                    {/* Binder Submitted */}
                    <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 px-8 py-3 text-center">
                      <p className="text-xs font-semibold text-foreground">Binder Submitted</p>
                    </div>
                    <ArrowDown className="size-4 text-muted-foreground" />

                    {/* Determination */}
                    <div className="rounded-lg border-2 border-[var(--ai-accent)] bg-[var(--ai-accent)]/5 px-8 py-3 text-center w-full max-w-md">
                      <p className="text-xs font-semibold text-foreground">Determination & Orchestration Agent</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Which wizard does each document need?</p>
                    </div>
                    <ArrowDown className="size-4 text-muted-foreground" />

                    {/* Routing */}
                    <div className="rounded-lg border-2 border-[var(--ai-accent)] bg-[var(--ai-accent)]/5 px-8 py-3 text-center w-full max-w-md">
                      <p className="text-xs font-semibold text-foreground">Routing Agent</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Route pages to assigned wizard</p>
                    </div>
                    <ArrowDown className="size-4 text-muted-foreground" />

                    {/* Wizard pipelines */}
                    <div className="grid grid-cols-4 gap-3 w-full">
                      {WIZARDS.map((w) => {
                        const WIcon = WIZARD_ICONS[w.id]
                        return (
                          <div key={w.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <WIcon className="size-3.5 text-[var(--ai-accent)]" />
                              <p className="text-xs font-semibold text-foreground">{w.name}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                              {["Data Collection", "Guideline", "Hallucination", "Refinement"].map((a, i) => (
                                <div key={a} className="flex items-center gap-1.5">
                                  <span className="text-xs font-mono text-muted-foreground w-3">{i + 1}.</span>
                                  <span className="text-xs text-muted-foreground">{a}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <ArrowDown className="size-4 text-muted-foreground" />

                    {/* Reviewer UI */}
                    <div className="rounded-lg border-2 border-[var(--status-success)] bg-[var(--status-success)]/5 px-8 py-3 text-center w-full max-w-md">
                      <p className="text-xs font-semibold text-foreground">Verifier UI</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Accept / Reclassify / Not Applicable -- with confidence badges</p>
                    </div>
                    <ArrowDown className="size-4 text-muted-foreground" />

                    {/* Feedback Loop */}
                    <div className="rounded-lg border-2 border-dashed border-[var(--ai-accent)] bg-[var(--ai-accent)]/5 px-8 py-3 text-center w-full max-w-md">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="size-3.5 text-[var(--ai-accent)]" />
                        <p className="text-xs font-semibold text-foreground">Feedback Loop</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">All agents self-learn from verifier actions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ═══════════════ SECTION 4: SELF-LEARNING ═══════════════ */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ai-accent)]/10">
                  <Shield className="size-4 text-[var(--ai-accent)]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Self-Learning & Feedback Loop</h2>
              </div>

              <Card className="mb-4">
                <CardContent className="py-5">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Core Principle</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    No agent depends on manual updates. Each agent maintains its own learning context. There is one verifier role -- every override carries equal weight. Pattern detection is purely frequency-based.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { title: "Override Capture", desc: "Every verifier action (accept, reclassify, reject) is recorded with full decision context." },
                      { title: "Pattern Detection", desc: "Agents detect recurring override patterns and adjust behavior automatically." },
                      { title: "Confidence Ramp", desc: "New learned patterns start at lower confidence and ramp up as they prove accurate." },
                      { title: "Admin Visibility", desc: "All learned patterns are auditable. Administrators can review, approve, or retire them." },
                    ].map((item) => (
                      <div key={item.title} className="rounded-lg border border-border p-3">
                        <p className="text-xs font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Learned Pattern Lifecycle */}
              <Card>
                <CardContent className="py-5">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Learned Pattern Lifecycle</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { stage: "1. Candidate", desc: "Pattern detected from N consistent overrides. Not yet active. Visible to administrators for review." },
                      { stage: "2. Active", desc: "Admin-approved pattern. Applied to future decisions with confidence ramp. Monitored for re-overrides." },
                      { stage: "3. Retired", desc: "Pattern no longer applies or frequently re-overridden. Kept in audit trail. Auto-flags if override rate increases." },
                    ].map((s) => (
                      <div key={s.stage} className="rounded-lg border border-border p-3">
                        <p className="text-xs font-semibold text-foreground">{s.stage}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ═══════════════ KEY DESIGN DECISIONS ═══════════════ */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ai-accent)]/10">
                  <Brain className="size-4 text-[var(--ai-accent)]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Key Design Decisions for Dev</h2>
              </div>

              <Card>
                <CardContent className="py-5">
                  <div className="flex flex-col gap-4">
                    {[
                      {
                        decision: "Single-label classification",
                        rationale: "Each document goes to exactly one wizard. No conflict resolution needed between wizards.",
                      },
                      {
                        decision: "Determination includes orchestration",
                        rationale: "The Determination Agent also manages parallel dispatch and timeout handling -- no separate orchestrator layer needed.",
                      },
                      {
                        decision: "Uniform 4-agent sub-pipeline",
                        rationale: "Every wizard uses the same agent structure (Data Collection, Guideline, Hallucination, Refinement). Enables shared infrastructure, consistent monitoring, and reusable learning frameworks.",
                      },
                      {
                        decision: "Hallucination Agent is a binary gate",
                        rationale: "It either passes guidelines through (valid) or blocks them (invalid), reducing confidence proportionally. It never silently corrects -- this prevents compounding errors.",
                      },
                      {
                        decision: "Self-learning is per-agent, not global",
                        rationale: "Each agent learns independently within its domain. Data Collection learns extraction; Guideline learns applicability. Prevents cross-contamination of learning signals.",
                      },
                      {
                        decision: "Equal-weight feedback",
                        rationale: "Single verifier role. Every override carries equal signal. Pattern detection is purely frequency-based.",
                      },
                    ].map((d, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{d.decision}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{d.rationale}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Navigation */}
            <div className="flex justify-center gap-3">
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
        </div>
      </main>

      <footer className="border-t border-border bg-card py-4">
        <p className="text-center text-xs text-muted-foreground/60">
          Multi-Agent Architecture v2 -- Product Brief for Dev -- Prototype data is for demonstration purposes.
        </p>
      </footer>
    </div>
  )
}
