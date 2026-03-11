import Link from "next/link"
import {
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Brain,
  Route,
  Layers,
  FileStack,
  Copy,
  Link2,
  FileSearch,
  CheckCircle2,
  Shield,
  BookOpen,
  Eye,
  ShieldAlert,
  ClipboardCheck,
  ArrowDown,
  GitBranch,
  TrendingUp,
  Target,
  AlertTriangle,
  Database,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

/* ────────────────────────────────────────── DATA ── */

const QUALITY_SUB_AGENTS = [
  { name: "Information Collection Agent", desc: "Validates input data completeness and OCR quality", parallel: false, role: "quality" as const },
  { name: "Rule Validation Agent", desc: "Checks historical patterns and Decision Spec rules for this input", parallel: true, role: "quality" as const },
  { name: "Hallucination Detection Agent", desc: "Identifies hallucination-prone fields and data consistency risks", parallel: true, role: "quality" as const },
]

const WIZARD_AGENTS = [
  {
    id: "pre-verification",
    title: "Pre-verification",
    icon: ClipboardCheck,
    accent: "oklch(0.55 0.15 250)",
    group: 1,
    totalAgents: 5,
    subAgents: [
      ...QUALITY_SUB_AGENTS,
      { name: "Completeness Agent", desc: "Checks if all required documents are present", parallel: true, role: "core" as const },
      { name: "Data Quality Agent", desc: "Checks if OCR extracted data is readable", parallel: true, role: "core" as const },
    ],
    coreExecution: "Parallel",
  },
  {
    id: "verification",
    title: "Verification",
    icon: CheckCircle2,
    accent: "oklch(0.55 0.17 165)",
    group: 1,
    totalAgents: 5,
    subAgents: [
      ...QUALITY_SUB_AGENTS,
      { name: "Cross-Reference Agent", desc: "Validates data consistency across documents", parallel: true, role: "core" as const },
      { name: "Anomaly Agent", desc: "Detects unusual patterns or outlier data", parallel: true, role: "core" as const },
    ],
    coreExecution: "Parallel",
  },
  {
    id: "superseded",
    title: "Superseded",
    icon: FileStack,
    accent: "oklch(0.55 0.18 290)",
    group: 2,
    totalAgents: 7,
    subAgents: [
      ...QUALITY_SUB_AGENTS,
      { name: "Grouping Agent", desc: "Groups pages by payer, form type, account for comparison", parallel: false, role: "core" as const },
      { name: "Comparison Agent", desc: "Compares document pairs on key fields", parallel: false, role: "core" as const },
      { name: "Precedence Agent", desc: "Determines which document to retain", parallel: false, role: "core" as const },
      { name: "Confidence Agent", desc: "Scores decision confidence from Library", parallel: false, role: "core" as const },
    ],
    coreExecution: "Sequential",
  },
  {
    id: "duplicate",
    title: "Duplicate",
    icon: Copy,
    accent: "oklch(0.55 0.15 250)",
    group: 2,
    totalAgents: 4,
    subAgents: [
      ...QUALITY_SUB_AGENTS,
      { name: "Data Duplicate Agent", desc: "Applies DUP-DATA rules: amount matching, source document comparison, and consolidated statement comparison", parallel: true, role: "core" as const },
    ],
    coreExecution: "Parallel",
  },
  {
    id: "cfa",
    title: "Child Form Association",
    icon: Link2,
    accent: "oklch(0.55 0.17 165)",
    group: 2,
    totalAgents: 6,
    subAgents: [
      ...QUALITY_SUB_AGENTS,
      { name: "Compatibility Agent", desc: "Filters compatible parent forms", parallel: false, role: "core" as const },
      { name: "Matching Agent", desc: "Scores parent-child similarity", parallel: false, role: "core" as const },
      { name: "Resolution Agent", desc: "Makes final association decision", parallel: false, role: "core" as const },
    ],
    coreExecution: "Sequential",
  },
  {
    id: "nfr",
    title: "New Form Review",
    icon: FileSearch,
    accent: "oklch(0.6 0.15 60)",
    group: 3,
    totalAgents: 6,
    subAgents: [
      ...QUALITY_SUB_AGENTS,
      { name: "Eligibility Agent", desc: "Filters eligible proforma input forms", parallel: false, role: "core" as const },
      { name: "Matching Agent", desc: "Scores document-proforma similarity", parallel: false, role: "core" as const },
      { name: "Decision Agent", desc: "Makes match or leave-unmatched decision", parallel: false, role: "core" as const },
    ],
    coreExecution: "Sequential",
  },

]

const DISAGREEMENT_MATRIX = [
  { info: "Clean", rule: "Validated", hall: "Clean", action: "Auto-approve", priority: "Routine", color: "oklch(0.55 0.17 145)" },
  { info: "Incomplete", rule: "Validated", hall: "Clean", action: "Proceed with caution", priority: "Medium", color: "oklch(0.7 0.15 75)" },
  { info: "Clean", rule: "Contradicts", hall: "Clean", action: "Flag for human review", priority: "Medium-High", color: "oklch(0.7 0.15 75)" },
  { info: "Clean", rule: "Validated", hall: "Hallucination", action: "BLOCK -- Human must review", priority: "Highest", color: "oklch(0.55 0.22 25)" },
  { info: "Incomplete", rule: "Contradicts", hall: "Clean", action: "Flag for human review", priority: "High", color: "oklch(0.6 0.15 60)" },
  { info: "Incomplete", rule: "Validated", hall: "Hallucination", action: "BLOCK -- Human must review", priority: "Highest", color: "oklch(0.55 0.22 25)" },
  { info: "Clean", rule: "Contradicts", hall: "Hallucination", action: "BLOCK immediately", priority: "Highest", color: "oklch(0.55 0.22 25)" },
  { info: "Incomplete", rule: "Contradicts", hall: "Hallucination", action: "BLOCK and escalate", priority: "Highest", color: "oklch(0.55 0.22 25)" },
]

/* ────────────────────────────────────────── SECTION NAV ── */

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "how-it-works", label: "How It Works" },
  { id: "wizard-agents", label: "Wizard Agents" },
  { id: "quality-gate", label: "Quality Gate" },
  { id: "library", label: "The Library" },
  { id: "walkthrough", label: "Walkthrough" },
  { id: "workflow", label: "Workflow Diagram" },
]

/* ────────────────────────────────────────── COMPONENTS ── */

function SectionHeading({
  id,
  number,
  icon: Icon,
  title,
}: {
  id: string
  number: string
  icon: typeof Brain
  title: string
}) {
  return (
    <div id={id} className="flex items-center gap-3 mb-4 scroll-mt-24">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ai-accent)]/10">
        <Icon className="size-4.5 text-[var(--ai-accent)]" />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          Section {number}
        </p>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
    </div>
  )
}

function StatCard({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div
      className="flex flex-col items-center rounded-lg border border-border bg-card px-4 py-5 text-center"
      style={accent ? { borderLeftWidth: "4px", borderLeftColor: accent } : undefined}
    >
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
    </div>
  )
}

/* ────────────────────────────────────────── PAGE ── */

export default function MultiAgentArchitecturePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
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

      <div className="flex flex-1">
        {/* Side navigation */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-border bg-card">
          <nav aria-label="Document sections" className="sticky top-16 flex flex-col gap-0.5 p-4 w-full max-h-[calc(100vh-4rem)] overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">Contents</p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md px-3 py-1.5 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-4xl px-6 py-10">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
                <li><ChevronRight className="size-3" /></li>
                <li><Link href="/phase-1" className="hover:text-foreground transition-colors">Phase 1</Link></li>
                <li><ChevronRight className="size-3" /></li>
                <li className="text-foreground font-medium">Multi Agent Architecture</li>
              </ol>
            </nav>

            {/* Title */}
            <div className="flex items-start gap-4 mb-8">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--ai-accent)]/10">
                <Brain className="size-6 text-[var(--ai-accent)]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-[var(--ai-accent)] text-white">Architecture</Badge>
                  <Badge variant="outline">Phase 1+</Badge>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                  Multi-Agent Architecture
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  1 Routing Agent + 6 Wizards containing 33 sub-agents. Each wizard runs 3 quality sub-agents first, then its core sub-agents.
                </p>
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <StatCard value="1" label="Routing Agent" accent="oklch(0.55 0.17 165)" />
              <StatCard value="6" label="Wizard Agents" accent="oklch(0.55 0.15 250)" />
              <StatCard value="18" label="Quality Sub-Agents" accent="oklch(0.6 0.15 60)" />
              <StatCard value="15" label="Core Sub-Agents" accent="oklch(0.55 0.18 290)" />
            </div>

            <div className="flex flex-col gap-12">

              {/* ═══════════════ SECTION 1: OVERVIEW ═══════════════ */}
              <section>
                <SectionHeading id="overview" number="1" icon={Layers} title="Architecture Overview" />
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      The system has 2 levels. A Routing Agent decides which wizards each document needs. 6 Wizard Agents each contain all their sub-agents internally -- 3 quality sub-agents that run first, followed by the core sub-agents.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Route className="size-4 text-[var(--ai-accent)]" />
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Level 1</p>
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">Routing Agent</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">Examines document characteristics and routes to the relevant wizards. Does not make tax decisions.</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Layers className="size-4 text-[var(--ai-accent)]" />
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Level 2</p>
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">6 Wizard Agents</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">Each wizard is a self-contained department. Within it: 3 quality sub-agents run first (data check, rule check, hallucination check), then core sub-agents execute with validated data.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ═══════════════ SECTION 2: HOW IT WORKS ═══════════════ */}
              <section>
                <SectionHeading id="how-it-works" number="2" icon={GitBranch} title="How It Works" />
                <div className="flex flex-col gap-3">
                  {[
                    { step: "1", title: "Route", desc: "Routing Agent decides which wizards are needed. Unnecessary wizards are skipped." },
                    { step: "2", title: "Quality Gate (inside each wizard)", desc: "3 quality sub-agents run first: Information Collection (seq 1), then Rule Validation + Hallucination Detection in parallel (seq 2a, 2b). Discrepancies are caught before core processing." },
                    { step: "3", title: "Core Processing", desc: "Core sub-agents execute with validated data. Independent wizards run in parallel (e.g., Superseded + Duplicate simultaneously). Final results from all wizards are presented to the reviewer with confidence scores." },
                  ].map((s) => (
                    <Card key={s.step}>
                      <CardContent className="py-4 flex items-start gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ai-accent)]/10 text-xs font-bold text-[var(--ai-accent)]">
                          {s.step}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{s.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{s.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* ═══════════════ SECTION 3: WIZARD AGENTS ═══════════════ */}
              <section>
                <SectionHeading id="wizard-agents" number="3" icon={Database} title="Wizard Agents and Sub-Agents" />

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  6 wizards in 3 execution groups. Wizards in the same group run in parallel. Each wizard contains 3 quality sub-agents (shaded rows) that run first, followed by its core sub-agents.
                </p>

                {/* Group overview */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { group: "Group 1", wizards: "Pre-verif, Verification", color: "oklch(0.55 0.15 250)" },
                    { group: "Group 2", wizards: "Superseded, Duplicate, CFA", color: "oklch(0.55 0.18 290)" },
                    { group: "Group 3", wizards: "NFR", color: "oklch(0.6 0.15 60)" },
                  ].map((g) => (
                    <div key={g.group} className="rounded-lg border border-border p-3" style={{ borderLeftWidth: "4px", borderLeftColor: g.color }}>
                      <p className="text-xs font-semibold text-foreground">{g.group}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{g.wizards}</p>
                    </div>
                  ))}
                </div>

                {/* Wizard detail cards */}
                <div className="flex flex-col gap-3">
                  {WIZARD_AGENTS.map((w) => {
                    const WIcon = w.icon
                    return (
                      <Card key={w.id} style={{ borderLeftWidth: "4px", borderLeftColor: w.accent }}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <WIcon className="size-4" style={{ color: w.accent }} />
                              <CardTitle className="text-sm">{w.title}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">G{w.group}</Badge>
                              <Badge variant="outline" className="text-xs">{w.totalAgents} sub-agents</Badge>
                              <Badge variant="outline" className="text-xs">Core: {w.coreExecution}</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Seq</th>
                                  <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Sub-Agent</th>
                                  <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Role</th>
                                  <th className="text-left py-1.5 text-xs font-semibold text-foreground">Purpose</th>
                                </tr>
                              </thead>
                              <tbody>
                                {w.subAgents.map((a, i) => {
                                  const isQuality = a.role === "quality"
                                  const isLastQuality = isQuality && i === 2
                                  const seqLabel = i === 0 ? "1" : i === 1 ? "2a" : i === 2 ? "2b" : (() => {
                                    const coreIndex = i - 3
                                    const coreAgents = w.subAgents.filter(sa => sa.role === "core")
                                    const hasCoreParallel = coreAgents.some(sa => sa.parallel)
                                    if (hasCoreParallel) return `${3}${String.fromCharCode(97 + coreIndex)}`
                                    return `${3 + coreIndex}`
                                  })()
                                  return (
                                    <tr key={`${a.name}-${a.role}`} className={`border-b ${isLastQuality ? "border-border" : "border-border/50"} last:border-0 ${isQuality ? "bg-muted/30" : ""}`}>
                                      <td className="py-1.5 pr-3 text-xs text-muted-foreground font-mono">{seqLabel}</td>
                                      <td className="py-1.5 pr-3 text-xs font-medium text-foreground whitespace-nowrap">{a.name}</td>
                                      <td className="py-1.5 pr-3 text-xs">
                                        <Badge variant="outline" className="text-xs" style={isQuality
                                          ? { borderColor: "oklch(0.6 0.15 60)", color: "oklch(0.6 0.15 60)" }
                                          : { borderColor: "oklch(0.55 0.15 250)", color: "oklch(0.55 0.15 250)" }
                                        }>
                                          {isQuality ? "Quality" : "Core"}
                                        </Badge>
                                      </td>
                                      <td className="py-1.5 text-xs text-muted-foreground">{a.desc}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>

              {/* ═══════════════ SECTION 4: QUALITY GATE ═══════════════ */}
              <section>
                <SectionHeading id="quality-gate" number="4" icon={Shield} title="Quality Gate and Disagreement Resolution" />

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  The 3 quality sub-agents inside each wizard act as a gate. Core sub-agents only start after all 3 quality agents finish. When quality agents disagree, a strict priority hierarchy applies.
                </p>

                {/* Execution flow */}
                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Execution order inside each wizard</p>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                      <div className="flex-1 rounded-lg border-2 border-[oklch(0.55_0.15_250)] bg-[oklch(0.55_0.15_250)]/5 p-3 text-center">
                        <p className="text-xs font-semibold text-foreground">Information Collection</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Seq 1 (quality)</p>
                      </div>
                      <ArrowDown className="size-4 text-muted-foreground mx-auto md:hidden" />
                      <ChevronRight className="size-4 text-muted-foreground hidden md:block shrink-0" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="rounded-lg border-2 border-[oklch(0.55_0.17_165)] bg-[oklch(0.55_0.17_165)]/5 p-3 text-center">
                          <p className="text-xs font-semibold text-foreground">Rule Validation</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Seq 2a (parallel)</p>
                        </div>
                        <div className="rounded-lg border-2 border-[oklch(0.55_0.22_25)] bg-[oklch(0.55_0.22_25)]/5 p-3 text-center">
                          <p className="text-xs font-semibold text-foreground">Hallucination Detection</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Seq 2b (parallel)</p>
                        </div>
                      </div>
                      <ArrowDown className="size-4 text-muted-foreground mx-auto md:hidden" />
                      <ChevronRight className="size-4 text-muted-foreground hidden md:block shrink-0" />
                      <div className="flex-1 rounded-lg border-2 border-[var(--ai-accent)] bg-[var(--ai-accent)]/10 p-3 text-center">
                        <p className="text-xs font-semibold text-foreground">Core Sub-Agents</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Seq 3+ (with validated data)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Priority hierarchy */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  {[
                    { priority: "1st (Highest)", agent: "Hallucination Detection", reason: "If AI fabricated data, the decision is unreliable.", color: "oklch(0.55 0.22 25)" },
                    { priority: "2nd", agent: "Rule Validation", reason: "Contradicts history but uses real data. Fixable.", color: "oklch(0.7 0.15 75)" },
                    { priority: "3rd", agent: "Information Collection", reason: "Missing data is concerning but not fatal.", color: "oklch(0.55 0.15 250)" },
                  ].map((p) => (
                    <div key={p.priority} className="rounded-lg border border-border p-3" style={{ borderLeftWidth: "4px", borderLeftColor: p.color }}>
                      <p className="text-xs font-semibold text-foreground">{p.priority}</p>
                      <p className="text-sm font-medium text-foreground mt-1">{p.agent}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.reason}</p>
                    </div>
                  ))}
                </div>

                {/* Disagreement matrix */}
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">All possible outcomes</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Info Collection</th>
                            <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Rule Validation</th>
                            <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Hallucination</th>
                            <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Action</th>
                            <th className="text-left py-1.5 text-xs font-semibold text-foreground">Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DISAGREEMENT_MATRIX.map((row, i) => (
                            <tr key={i} className="border-b border-border/50 last:border-0">
                              <td className="py-1.5 pr-3 text-xs text-muted-foreground">{row.info}</td>
                              <td className="py-1.5 pr-3 text-xs text-muted-foreground">{row.rule}</td>
                              <td className="py-1.5 pr-3 text-xs text-muted-foreground">{row.hall}</td>
                              <td className="py-1.5 pr-3 text-xs font-medium text-foreground">{row.action}</td>
                              <td className="py-1.5 text-xs">
                                <Badge variant="outline" className="text-xs" style={{ borderColor: row.color, color: row.color }}>{row.priority}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ═══════════════ SECTION 5: LIBRARY ═══════════════ */}
              <section>
                <SectionHeading id="library" number="5" icon={TrendingUp} title="The Library -- Dual-Source Learning" />

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Every agent learns from the Library, which contains two complementary sources. There are no hardcoded rules -- agents consult both sources and a priority hierarchy resolves conflicts.
                </p>

                {/* Two sources */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Card style={{ borderLeftWidth: "4px", borderLeftColor: "oklch(0.55 0.15 250)" }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Historical Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        Learned from millions of past decisions. Shows what reviewers decided, whether AI agreed, and at what confidence.
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {[
                          "\"97.7% of corrected-vs-original pairs: retain corrected\"",
                          "Grows automatically as reviewers work",
                          "Seasonal patterns emerge over time",
                          "Bad patterns auto-retire when overrides increase",
                        ].map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                            <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[oklch(0.55_0.15_250)]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card style={{ borderLeftWidth: "4px", borderLeftColor: "oklch(0.6 0.15 60)" }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">AI Decision Specs (4 authored)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        Formalized decision contracts authored by SMEs for each wizard. Each spec defines allowed inputs, ordered decision rules, output contracts, confidence semantics, and escalation criteria. Versioned per tax season.
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {[
                          "Superseded: Rule Sets A (A1-A9, source docs) and B (B1-B10, consolidated statements) with precedence rules",
                          "Duplicate: Unified DUP-DATA rule set covering amount matching, source document comparison, and consolidated statement comparison",
                          "CFA: Rules CFA-1 to CFA-5 (compatibility, name matching, placeholder avoidance, AddForm, ambiguity)",
                          "NFR: Rules NFR-1 to NFR-6 (form type, ImageIndex, name matching, 80% threshold, no forced matches)",
                        ].map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                            <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[oklch(0.6_0.15_60)]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Decision Spec detail per wizard */}
                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">AI Decision Spec summary by wizard</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Wizard</th>
                            <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Rule Sets</th>
                            <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Key Rules</th>
                            <th className="text-left py-1.5 text-xs font-semibold text-foreground">Confidence Bands</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            {
                              wizard: "Superseded",
                              ruleSets: "A (Source Docs), B (Consolidated)",
                              keyRules: "A1-A6: sequential field matching (stop at first fail). A7: exact match resolution. A8: short-year K-1 exception. A9: corrected override. B1-B10: statement date, corrected text, max data tie-breakers.",
                              confidence: ">=0.90 deterministic | 0.75-0.89 high | 0.60-0.74 partial (review) | <0.60 no match",
                            },
                            {
                              wizard: "Duplicate",
                              ruleSets: "DUP-DATA (unified)",
                              keyRules: "Amount matching: name match (hard stop), direct amount, sum-of-amounts. Source docs: payer/recipient/account/tax year match, jurisdiction hard stop, corrected precedence. Consolidated: broker/account/taxpayer match, latest date retention.",
                              confidence: ">0.90 automation | 0.70-0.90 recommend+review | <0.70 human review required",
                            },
                            {
                              wizard: "CFA",
                              ruleSets: "CFA-1 to CFA-5",
                              keyRules: "CFA-1: faxFormDWPCode compatibility (hard stop). CFA-2: name/identifier matching. CFA-3: placeholder avoidance. CFA-4: AddForm fallback. CFA-5: ambiguity handling (lower confidence).",
                              confidence: ">=0.90 clear | 0.70-0.89 strong | 0.50-0.69 weak (review) | <0.50 do not associate",
                            },
                            {
                              wizard: "NFR",
                              ruleSets: "NFR-1 to NFR-6",
                              keyRules: "NFR-1: formTypeId compatibility (hard stop). NFR-2: ImageIndex=3 constraint. NFR-3: name matching. NFR-4: 80% similarity threshold. NFR-5: placeholder avoidance. NFR-6: no forced matches.",
                              confidence: ">=0.90 clear | 0.70-0.89 strong | 0.50-0.69 weak (review) | <0.50 leave unmatched",
                            },
                          ].map((row) => (
                            <tr key={row.wizard} className="border-b border-border/50 last:border-0 align-top">
                              <td className="py-2 pr-3 text-xs font-medium text-foreground whitespace-nowrap">{row.wizard}</td>
                              <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{row.ruleSets}</td>
                              <td className="py-2 pr-3 text-xs text-muted-foreground leading-relaxed">{row.keyRules}</td>
                              <td className="py-2 text-xs text-muted-foreground leading-relaxed">{row.confidence}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Priority when sources conflict */}
                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">When sources disagree -- priority hierarchy</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {[
                        { priority: "1st", source: "Decision Spec", desc: "Explicit authored rule exists", color: "oklch(0.6 0.15 60)" },
                        { priority: "2nd", source: "High-confidence Pattern", desc: "Historical agreement > 95%", color: "oklch(0.55 0.15 250)" },
                        { priority: "3rd", source: "Moderate Pattern", desc: "Historical agreement 70-95%", color: "oklch(0.7 0.15 75)" },
                        { priority: "4th", source: "Escalate to Human", desc: "Low confidence or no data", color: "oklch(0.55 0.22 25)" },
                      ].map((p) => (
                        <div key={p.priority} className="rounded-lg border border-border p-3" style={{ borderLeftWidth: "4px", borderLeftColor: p.color }}>
                          <p className="text-xs font-semibold text-foreground">{p.priority}: {p.source}</p>
                          <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* How quality sub-agents use both sources */}
                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">How quality sub-agents use both sources</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Quality Agent</th>
                            <th className="text-left py-1.5 pr-3 text-xs font-semibold text-foreground">Uses Historical Patterns</th>
                            <th className="text-left py-1.5 text-xs font-semibold text-foreground">Uses Decision Spec</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { agent: "Information Collection", patterns: "What fields were typically available for this form type?", spec: "Checks \"Allowed Inputs\" section of the spec -- e.g., Superseded requires ocrtemplateid, payer name, tax year" },
                            { agent: "Rule Validation", patterns: "What did reviewers decide in similar past cases?", spec: "Checks \"Decision Rules\" section -- e.g., CFA-1 compatibility hard stop, NFR-4 80% threshold" },
                            { agent: "Hallucination Detection", patterns: "Which fields historically caused fabrication?", spec: "Checks spec-defined escalation criteria -- e.g., missing critical identifiers, multiple corrected copies" },
                          ].map((row) => (
                            <tr key={row.agent} className="border-b border-border/50 last:border-0">
                              <td className="py-1.5 pr-3 text-xs font-medium text-foreground whitespace-nowrap">{row.agent}</td>
                              <td className="py-1.5 pr-3 text-xs text-muted-foreground">{row.patterns}</td>
                              <td className="py-1.5 text-xs text-muted-foreground">{row.spec}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Season-over-season */}
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Season-over-season improvement</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {[
                        { season: "Pre-Season 1", state: "Library pre-loaded with historical data + authored Decision Specs. Conservative confidence.", color: "oklch(0.55 0.22 25)" },
                        { season: "Season 1", state: "Library grows daily from reviewer decisions. Specs cover cold-start gaps. Workload gradually decreasing.", color: "oklch(0.7 0.15 75)" },
                        { season: "Season 2", state: "Routine cases at 90%+ confidence. Specs refined from Season 1 learnings. Reviewers focus on exceptions.", color: "oklch(0.55 0.15 250)" },
                        { season: "Season 3+", state: "Highly accurate on known patterns. Specs updated per regulation changes. Minimal reviewer workload.", color: "oklch(0.55 0.17 145)" },
                      ].map((s) => (
                        <div key={s.season} className="rounded-lg border border-border p-3" style={{ borderLeftWidth: "4px", borderLeftColor: s.color }}>
                          <p className="text-xs font-semibold text-foreground">{s.season}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.state}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ═══════════════ SECTION 6: WALKTHROUGH ═══════════════ */}
              <section>
                <SectionHeading id="walkthrough" number="6" icon={BookOpen} title="Decision Walkthrough" />

                <Card className="mb-3">
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Scenario</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      A tax binder with 500 pages includes 3 pages of 1099-INT from Bank XYZ: Page 12 (account 9876, $1,200, not corrected), Page 15 (account 9876, $1,250, corrected), and Page 22 (account 5555, $800, not corrected).
                    </p>
                  </CardContent>
                </Card>

                {[
                  {
                    step: "1. Routing",
                    color: "oklch(0.55 0.15 250)",
                    text: "Routes to Pre-verification, Verification, Superseded, Duplicate. Skips CFA and NFR (low historical need for 1099-INT). 96% confidence.",
                  },
                  {
                    step: "2. Pre-verification + Verification (parallel wizards)",
                    color: "oklch(0.55 0.17 165)",
                    text: "Quality sub-agents run first in each wizard: all fields present, patterns match 99% historical, no hallucination risks. Core agents confirm: 3 pages found, all readable, amounts differ by $50 (expected for corrected).",
                  },
                  {
                    step: "3. Superseded + Duplicate (parallel wizards)",
                    color: "oklch(0.55 0.18 290)",
                    text: "Superseded quality gate: account number flagged as hallucination-prone field for extra scrutiny. Core agents: Group pages 12+15 (same account 9876), page 22 alone. Rules A1-A6 pass for 12 vs 15. Rule A9 (corrected override from Decision Spec) triggers: retain Page 15 (corrected). decisionRule: A9, confidenceLevel: 0.97. Duplicate quality gate: clean. DUP-DATA corrected precedence rule: NOT duplicate, it is a supersede case.",
                  },

                ].map((s) => (
                  <Card key={s.step} className="mb-3" style={{ borderLeftWidth: "4px", borderLeftColor: s.color }}>
                    <CardContent className="py-4">
                      <p className="text-xs font-semibold text-foreground mb-1">{s.step}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                    </CardContent>
                  </Card>
                ))}

                {/* Result */}
                <Card className="border-2 border-[var(--confidence-high)]">
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-[var(--confidence-high)] uppercase tracking-wider mb-3">Result</p>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[
                        { page: "Page 12", status: "SUPERSEDED by Page 15", conf: "97.7%" },
                        { page: "Page 15", status: "RETAINED (corrected)", conf: "97.7%" },
                        { page: "Page 22", status: "NO ACTION (different account)", conf: "98.9%" },
                      ].map((r) => (
                        <div key={r.page} className="rounded-lg border border-border bg-muted/30 p-3">
                          <p className="text-xs font-semibold text-foreground">{r.page}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.status}</p>
                          <p className="text-xs text-[var(--confidence-high)] mt-0.5">{r.conf}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="rounded-lg bg-muted/30 p-2 text-center">
                        <p className="text-base font-bold text-foreground">24</p>
                        <p className="text-xs text-muted-foreground">Agents Invoked</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-2 text-center">
                        <p className="text-base font-bold text-foreground">3</p>
                        <p className="text-xs text-muted-foreground">Steps</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-2 text-center">
                        <p className="text-base font-bold text-foreground">0</p>
                        <p className="text-xs text-muted-foreground">Hallucinations</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-2 text-center">
                        <p className="text-base font-bold text-foreground">Auto</p>
                        <p className="text-xs text-muted-foreground">Approval</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ═══════════════ SECTION 7: WORKFLOW DIAGRAM ═══════════════ */}
              <section>
                <SectionHeading id="workflow" number="7" icon={GitBranch} title="Workflow Diagram" />

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Visual representation of how documents flow through the multi-agent system, from initial routing through wizard processing to final decision output.
                </p>

                {/* Main workflow diagram */}
                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-6">

                      {/* Level 1: Document Input */}
                      <div className="flex flex-col items-center">
                        <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-3 text-center">
                          <p className="text-xs font-semibold text-foreground">Document Input</p>
                          <p className="text-xs text-muted-foreground">Tax documents from binder</p>
                        </div>
                        <ArrowDown className="size-5 text-muted-foreground mt-2" />
                      </div>

                      {/* Level 2: Routing Agent */}
                      <div className="flex flex-col items-center">
                        <div className="rounded-xl border-2 border-[oklch(0.55_0.17_165)] bg-[oklch(0.55_0.17_165)]/10 px-8 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Route className="size-4 text-[oklch(0.55_0.17_165)]" />
                            <p className="text-sm font-semibold text-foreground">Routing Agent</p>
                          </div>
                          <p className="text-xs text-muted-foreground">Decides which wizards to invoke</p>
                        </div>
                        <ArrowDown className="size-5 text-muted-foreground mt-2" />
                      </div>

                      {/* Level 3: Wizard Groups */}
                      <div className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4 text-center">Wizard Execution (Groups run sequentially, wizards within groups run in parallel)</p>
                        
                        {/* Group 1 */}
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Group 1 (Parallel)</p>
                          <div className="flex gap-3">
                            <div className="flex-1 rounded-lg border border-[oklch(0.55_0.15_250)] bg-[oklch(0.55_0.15_250)]/5 p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <ClipboardCheck className="size-3.5 text-[oklch(0.55_0.15_250)]" />
                                <p className="text-xs font-semibold text-foreground">Pre-verification</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">Quality Gate (3 agents)</div>
                                <ArrowDown className="size-3 text-muted-foreground mx-auto" />
                                <div className="rounded bg-[oklch(0.55_0.15_250)]/10 px-2 py-1 text-xs text-foreground">Core (2 agents)</div>
                              </div>
                            </div>
                            <div className="flex-1 rounded-lg border border-[oklch(0.55_0.17_165)] bg-[oklch(0.55_0.17_165)]/5 p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <CheckCircle2 className="size-3.5 text-[oklch(0.55_0.17_165)]" />
                                <p className="text-xs font-semibold text-foreground">Verification</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">Quality Gate (3 agents)</div>
                                <ArrowDown className="size-3 text-muted-foreground mx-auto" />
                                <div className="rounded bg-[oklch(0.55_0.17_165)]/10 px-2 py-1 text-xs text-foreground">Core (2 agents)</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <ArrowDown className="size-4 text-muted-foreground mx-auto mb-4" />

                        {/* Group 2 */}
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Group 2 (Parallel)</p>
                          <div className="flex gap-3">
                            <div className="flex-1 rounded-lg border border-[oklch(0.55_0.18_290)] bg-[oklch(0.55_0.18_290)]/5 p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <FileStack className="size-3.5 text-[oklch(0.55_0.18_290)]" />
                                <p className="text-xs font-semibold text-foreground">Superseded</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">Quality Gate (3)</div>
                                <ArrowDown className="size-3 text-muted-foreground mx-auto" />
                                <div className="rounded bg-[oklch(0.55_0.18_290)]/10 px-2 py-1 text-xs text-foreground">Core (4)</div>
                              </div>
                            </div>
                            <div className="flex-1 rounded-lg border border-[oklch(0.55_0.15_250)] bg-[oklch(0.55_0.15_250)]/5 p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Copy className="size-3.5 text-[oklch(0.55_0.15_250)]" />
                                <p className="text-xs font-semibold text-foreground">Duplicate</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">Quality Gate (3)</div>
                                <ArrowDown className="size-3 text-muted-foreground mx-auto" />
                                <div className="rounded bg-[oklch(0.55_0.15_250)]/10 px-2 py-1 text-xs text-foreground">Core (1)</div>
                              </div>
                            </div>
                            <div className="flex-1 rounded-lg border border-[oklch(0.55_0.17_165)] bg-[oklch(0.55_0.17_165)]/5 p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Link2 className="size-3.5 text-[oklch(0.55_0.17_165)]" />
                                <p className="text-xs font-semibold text-foreground">CFA</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">Quality Gate (3)</div>
                                <ArrowDown className="size-3 text-muted-foreground mx-auto" />
                                <div className="rounded bg-[oklch(0.55_0.17_165)]/10 px-2 py-1 text-xs text-foreground">Core (3)</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <ArrowDown className="size-4 text-muted-foreground mx-auto mb-4" />

                        {/* Group 3 */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Group 3</p>
                          <div className="flex justify-center">
                            <div className="w-1/3 rounded-lg border border-[oklch(0.6_0.15_60)] bg-[oklch(0.6_0.15_60)]/5 p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <FileSearch className="size-3.5 text-[oklch(0.6_0.15_60)]" />
                                <p className="text-xs font-semibold text-foreground">NFR</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">Quality Gate (3)</div>
                                <ArrowDown className="size-3 text-muted-foreground mx-auto" />
                                <div className="rounded bg-[oklch(0.6_0.15_60)]/10 px-2 py-1 text-xs text-foreground">Core (3)</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <ArrowDown className="size-5 text-muted-foreground mx-auto" />

                      {/* Level 4: Library Integration */}
                      <div className="flex justify-center gap-4">
                        <div className="rounded-lg border border-dashed border-[oklch(0.55_0.15_250)] bg-[oklch(0.55_0.15_250)]/5 px-4 py-3 text-center">
                          <Database className="size-4 text-[oklch(0.55_0.15_250)] mx-auto mb-1" />
                          <p className="text-xs font-semibold text-foreground">Historical Patterns</p>
                          <p className="text-xs text-muted-foreground">Learned outcomes</p>
                        </div>
                        <div className="rounded-lg border border-dashed border-[oklch(0.6_0.15_60)] bg-[oklch(0.6_0.15_60)]/5 px-4 py-3 text-center">
                          <BookOpen className="size-4 text-[oklch(0.6_0.15_60)] mx-auto mb-1" />
                          <p className="text-xs font-semibold text-foreground">AI Decision Specs</p>
                          <p className="text-xs text-muted-foreground">Authored rules</p>
                        </div>
                      </div>

                      <ArrowDown className="size-5 text-muted-foreground mx-auto" />

                      {/* Level 5: Output */}
                      <div className="flex flex-col items-center">
                        <div className="rounded-xl border-2 border-[var(--confidence-high)] bg-[var(--confidence-high)]/10 px-8 py-4 text-center">
                          <p className="text-sm font-semibold text-foreground mb-1">Decision Output</p>
                          <p className="text-xs text-muted-foreground">Per-document status + confidence + applied rule</p>
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>

                {/* Legend */}
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Legend</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded bg-muted/50 border border-border" />
                        <span className="text-xs text-muted-foreground">Quality Gate (runs first)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded bg-[var(--ai-accent)]/20 border border-[var(--ai-accent)]" />
                        <span className="text-xs text-muted-foreground">Core Sub-Agents</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded border-2 border-dashed border-border" />
                        <span className="text-xs text-muted-foreground">Library (dual-source)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowDown className="size-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Sequential flow</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-center gap-3 mt-6">
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
              </section>

            </div>
          </div>
        </main>
      </div>

      <footer className="border-t border-border bg-card py-4">
        <p className="text-center text-xs text-muted-foreground/60">
          Multi-Agent Architecture -- Product Strategy -- Prototype data is for demonstration purposes.
        </p>
      </footer>
    </div>
  )
}
