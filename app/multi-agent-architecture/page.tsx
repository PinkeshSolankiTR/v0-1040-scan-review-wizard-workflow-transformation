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
  Zap,
  Users,
  TrendingUp,
  Clock,
  Target,
  Database,
  AlertTriangle,
  Settings,
  BarChart3,
  Network,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

/* ────────────────────────────────────────── DATA ── */

const QUALITY_SUB_AGENTS = [
  { name: "Information Collection Agent", desc: "Validates input data completeness and OCR quality before processing", parallel: false, role: "quality" as const },
  { name: "Rule Validation Agent", desc: "Checks if input patterns have clear historical outcomes and flags ambiguities", parallel: true, role: "quality" as const },
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
      { name: "Completeness Agent", desc: "Checks if all required documents are present in the binder", parallel: true, role: "core" as const },
      { name: "Data Quality Agent", desc: "Checks if OCR extracted data is readable and usable", parallel: true, role: "core" as const },
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
      { name: "Cross-Reference Agent", desc: "Validates data consistency across related documents", parallel: true, role: "core" as const },
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
      { name: "Grouping Agent", desc: "Groups pages by shared characteristics (ocrtemplateid, payer, form type) for comparison", parallel: false, role: "core" as const },
      { name: "Comparison Agent", desc: "Compares document pairs within each group on payer, recipient, account, tax year, amounts", parallel: false, role: "core" as const },
      { name: "Precedence Agent", desc: "For matched pairs, determines which document to retain", parallel: false, role: "core" as const },
      { name: "Confidence Agent", desc: "Scores decision confidence based on Library patterns", parallel: false, role: "core" as const },
    ],
    coreExecution: "Sequential",
  },
  {
    id: "duplicate",
    title: "Duplicate",
    icon: Copy,
    accent: "oklch(0.55 0.15 250)",
    group: 2,
    totalAgents: 6,
    subAgents: [
      ...QUALITY_SUB_AGENTS,
      { name: "Data Duplicate Agent", desc: "Compares organizer entries vs source documents for duplication", parallel: true, role: "core" as const },
      { name: "Source Document Duplicate Agent", desc: "Compares two source documents for duplication", parallel: true, role: "core" as const },
      { name: "Consolidated Statement Agent", desc: "Compares two consolidated broker statements for duplication", parallel: true, role: "core" as const },
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
      { name: "Compatibility Agent", desc: "Filters which parent forms are compatible with the child form", parallel: false, role: "core" as const },
      { name: "Matching Agent", desc: "Scores each compatible parent on name, identifier, and search string similarity", parallel: false, role: "core" as const },
      { name: "Resolution Agent", desc: "Makes final association decision, handles ambiguity or no-match cases", parallel: false, role: "core" as const },
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
      { name: "Eligibility Agent", desc: "Filters which proforma input forms are eligible for matching", parallel: false, role: "core" as const },
      { name: "Matching Agent", desc: "Scores similarity between document and eligible proforma forms", parallel: false, role: "core" as const },
      { name: "Decision Agent", desc: "Makes final match or leave-unmatched decision based on threshold", parallel: false, role: "core" as const },
    ],
    coreExecution: "Sequential",
  },
  {
    id: "finalization",
    title: "Finalization",
    icon: Shield,
    accent: "oklch(0.55 0.22 25)",
    group: 4,
    totalAgents: 5,
    subAgents: [
      ...QUALITY_SUB_AGENTS,
      { name: "Conflict Agent", desc: "Detects conflicting decisions across all previous wizards", parallel: false, role: "core" as const },
      { name: "Completeness Agent", desc: "Verifies every document in the binder has a final status", parallel: false, role: "core" as const },
    ],
    coreExecution: "Sequential",
  },
]

const PRE_WIZARD_AGENTS = [
  {
    name: "Information Collection Agent",
    icon: Eye,
    accent: "oklch(0.55 0.15 250)",
    timing: "Runs first (sequential)",
    purpose: "Is the input data complete and clean before the wizard starts?",
    checks: [
      "Are all required fields extracted from the document?",
      "Is OCR data clean and readable?",
      "Are all related documents included for comparison?",
      "Is context from previous wizards available?",
    ],
    prevents: "Prevents the wizard from making decisions on incomplete or corrupted data",
  },
  {
    name: "Rule Validation Agent",
    icon: ClipboardCheck,
    accent: "oklch(0.55 0.17 165)",
    timing: "Runs second (parallel)",
    purpose: "Do the input characteristics match patterns where experienced reviewers had clear outcomes?",
    checks: [
      "Does this document pattern have a dominant historical outcome?",
      "Are there conflicting patterns in the Library for this input?",
      "Were all relevant learned guidelines identified for this pattern?",
      "Is this a known edge case that previously caused overrides?",
    ],
    prevents: "Flags ambiguous or historically contentious patterns before the wizard processes them",
  },
  {
    name: "Hallucination Detection Agent",
    icon: ShieldAlert,
    accent: "oklch(0.55 0.22 25)",
    timing: "Runs second (parallel)",
    purpose: "Is the input data internally consistent? Are there signs the AI could fabricate relationships?",
    checks: [
      "Do the document fields contain actual data or empty/placeholder values?",
      "Are field values internally consistent (e.g., amounts match totals)?",
      "Are there known hallucination-prone fields for this document type?",
      "Does this document type historically trigger AI fabrication?",
    ],
    prevents: "Identifies hallucination risk areas so the wizard can be extra cautious or flag for human review",
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

const AGENT_INVENTORY = [
  { num: 1, group: "--", wizard: "--", name: "Routing Agent", type: "Router", seq: "--", parallelWith: "Nothing", dependsOn: "Nothing" },
  { num: 2, group: "G1", wizard: "Pre-verification", name: "Information Collection Agent", type: "Quality", seq: "1", parallelWith: "Nothing", dependsOn: "Routing Agent" },
  { num: 3, group: "G1", wizard: "Pre-verification", name: "Rule Validation Agent", type: "Quality", seq: "2a", parallelWith: "Hallucination Agent", dependsOn: "Info Collection" },
  { num: 4, group: "G1", wizard: "Pre-verification", name: "Hallucination Detection Agent", type: "Quality", seq: "2b", parallelWith: "Rule Validation Agent", dependsOn: "Info Collection" },
  { num: 5, group: "G1", wizard: "Pre-verification", name: "Completeness Agent", type: "Core", seq: "3a", parallelWith: "Data Quality Agent", dependsOn: "Quality sub-agents" },
  { num: 6, group: "G1", wizard: "Pre-verification", name: "Data Quality Agent", type: "Core", seq: "3b", parallelWith: "Completeness Agent", dependsOn: "Quality sub-agents" },
  { num: 7, group: "G1", wizard: "Verification", name: "Information Collection Agent", type: "Quality", seq: "1", parallelWith: "Nothing", dependsOn: "Routing Agent" },
  { num: 8, group: "G1", wizard: "Verification", name: "Rule Validation Agent", type: "Quality", seq: "2a", parallelWith: "Hallucination Agent", dependsOn: "Info Collection" },
  { num: 9, group: "G1", wizard: "Verification", name: "Hallucination Detection Agent", type: "Quality", seq: "2b", parallelWith: "Rule Validation Agent", dependsOn: "Info Collection" },
  { num: 10, group: "G1", wizard: "Verification", name: "Cross-Reference Agent", type: "Core", seq: "3a", parallelWith: "Anomaly Agent", dependsOn: "Quality sub-agents" },
  { num: 11, group: "G1", wizard: "Verification", name: "Anomaly Agent", type: "Core", seq: "3b", parallelWith: "Cross-Reference Agent", dependsOn: "Quality sub-agents" },
  { num: 12, group: "G2", wizard: "Superseded", name: "Information Collection Agent", type: "Quality", seq: "1", parallelWith: "Nothing", dependsOn: "Routing Agent" },
  { num: 13, group: "G2", wizard: "Superseded", name: "Rule Validation Agent", type: "Quality", seq: "2a", parallelWith: "Hallucination Agent", dependsOn: "Info Collection" },
  { num: 14, group: "G2", wizard: "Superseded", name: "Hallucination Detection Agent", type: "Quality", seq: "2b", parallelWith: "Rule Validation Agent", dependsOn: "Info Collection" },
  { num: 15, group: "G2", wizard: "Superseded", name: "Grouping Agent", type: "Core", seq: "3", parallelWith: "Nothing", dependsOn: "Quality sub-agents" },
  { num: 16, group: "G2", wizard: "Superseded", name: "Comparison Agent", type: "Core", seq: "4", parallelWith: "Nothing", dependsOn: "Grouping Agent" },
  { num: 17, group: "G2", wizard: "Superseded", name: "Precedence Agent", type: "Core", seq: "5", parallelWith: "Nothing", dependsOn: "Comparison Agent" },
  { num: 18, group: "G2", wizard: "Superseded", name: "Confidence Agent", type: "Core", seq: "6", parallelWith: "Nothing", dependsOn: "Precedence Agent" },
  { num: 19, group: "G2", wizard: "Duplicate", name: "Information Collection Agent", type: "Quality", seq: "1", parallelWith: "Nothing", dependsOn: "Routing Agent" },
  { num: 20, group: "G2", wizard: "Duplicate", name: "Rule Validation Agent", type: "Quality", seq: "2a", parallelWith: "Hallucination Agent", dependsOn: "Info Collection" },
  { num: 21, group: "G2", wizard: "Duplicate", name: "Hallucination Detection Agent", type: "Quality", seq: "2b", parallelWith: "Rule Validation Agent", dependsOn: "Info Collection" },
  { num: 22, group: "G2", wizard: "Duplicate", name: "Data Duplicate Agent", type: "Core", seq: "3a", parallelWith: "Source Doc, Consolidated", dependsOn: "Quality sub-agents" },
  { num: 23, group: "G2", wizard: "Duplicate", name: "Source Document Duplicate Agent", type: "Core", seq: "3b", parallelWith: "Data Dup, Consolidated", dependsOn: "Quality sub-agents" },
  { num: 24, group: "G2", wizard: "Duplicate", name: "Consolidated Statement Agent", type: "Core", seq: "3c", parallelWith: "Data Dup, Source Doc", dependsOn: "Quality sub-agents" },
  { num: 25, group: "G2", wizard: "CFA", name: "Information Collection Agent", type: "Quality", seq: "1", parallelWith: "Nothing", dependsOn: "Routing Agent" },
  { num: 26, group: "G2", wizard: "CFA", name: "Rule Validation Agent", type: "Quality", seq: "2a", parallelWith: "Hallucination Agent", dependsOn: "Info Collection" },
  { num: 27, group: "G2", wizard: "CFA", name: "Hallucination Detection Agent", type: "Quality", seq: "2b", parallelWith: "Rule Validation Agent", dependsOn: "Info Collection" },
  { num: 28, group: "G2", wizard: "CFA", name: "Compatibility Agent", type: "Core", seq: "3", parallelWith: "Nothing", dependsOn: "Quality sub-agents" },
  { num: 29, group: "G2", wizard: "CFA", name: "Matching Agent", type: "Core", seq: "4", parallelWith: "Nothing", dependsOn: "Compatibility Agent" },
  { num: 30, group: "G2", wizard: "CFA", name: "Resolution Agent", type: "Core", seq: "5", parallelWith: "Nothing", dependsOn: "Matching Agent" },
  { num: 31, group: "G3", wizard: "NFR", name: "Information Collection Agent", type: "Quality", seq: "1", parallelWith: "Nothing", dependsOn: "Group 2 results" },
  { num: 32, group: "G3", wizard: "NFR", name: "Rule Validation Agent", type: "Quality", seq: "2a", parallelWith: "Hallucination Agent", dependsOn: "Info Collection" },
  { num: 33, group: "G3", wizard: "NFR", name: "Hallucination Detection Agent", type: "Quality", seq: "2b", parallelWith: "Rule Validation Agent", dependsOn: "Info Collection" },
  { num: 34, group: "G3", wizard: "NFR", name: "Eligibility Agent", type: "Core", seq: "3", parallelWith: "Nothing", dependsOn: "Quality sub-agents" },
  { num: 35, group: "G3", wizard: "NFR", name: "Matching Agent", type: "Core", seq: "4", parallelWith: "Nothing", dependsOn: "Eligibility Agent" },
  { num: 36, group: "G3", wizard: "NFR", name: "Decision Agent", type: "Core", seq: "5", parallelWith: "Nothing", dependsOn: "Matching Agent" },
  { num: 37, group: "G4", wizard: "Finalization", name: "Information Collection Agent", type: "Quality", seq: "1", parallelWith: "Nothing", dependsOn: "All prior results" },
  { num: 38, group: "G4", wizard: "Finalization", name: "Rule Validation Agent", type: "Quality", seq: "2a", parallelWith: "Hallucination Agent", dependsOn: "Info Collection" },
  { num: 39, group: "G4", wizard: "Finalization", name: "Hallucination Detection Agent", type: "Quality", seq: "2b", parallelWith: "Rule Validation Agent", dependsOn: "Info Collection" },
  { num: 40, group: "G4", wizard: "Finalization", name: "Conflict Agent", type: "Core", seq: "3", parallelWith: "Nothing", dependsOn: "Quality sub-agents" },
  { num: 41, group: "G4", wizard: "Finalization", name: "Completeness Agent", type: "Core", seq: "4", parallelWith: "Nothing", dependsOn: "Conflict Agent" },
]

const LEARNING_STAGES = [
  {
    stage: "Before Season 1",
    library: "Pre-loaded with 2-3 years of historical tracking data. Millions of past decisions.",
    behavior: "Agents make reasonable decisions based on historical patterns. Conservative confidence scores.",
    workload: "High -- most decisions reviewed by humans",
  },
  {
    stage: "During Season 1",
    library: "Every decision and every human review adds to the Library. Thousands of new data points daily.",
    behavior: "Agents start recognizing patterns specific to this season. Confidence increases on common patterns.",
    workload: "Gradually decreasing -- common patterns handled automatically",
  },
  {
    stage: "Season 2",
    library: "Contains all historical data plus every Season 1 decision and correction.",
    behavior: "Agents handle routine cases with 90%+ confidence. Edge cases clearly identified.",
    workload: "Noticeably lower -- reviewers focus on exceptions",
  },
  {
    stage: "Season 3+",
    library: "Comprehensive. Most common patterns have hundreds or thousands of data points.",
    behavior: "Highly accurate on known patterns. New patterns immediately flagged as unknown.",
    workload: "Minimal for routine cases. Genuine exceptions only.",
  },
]

/* ────────────────────────────────────────── SECTION NAV ── */

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "how-it-works", label: "How It Works" },
  { id: "routing-agent", label: "Routing Agent" },
  { id: "wizard-agents", label: "Wizard Agents" },
  { id: "quality-agents", label: "Quality Sub-Agents" },
  { id: "disagreements", label: "Disagreement Resolution" },
  { id: "learning", label: "Self-Learning" },
  { id: "decision-walkthrough", label: "Decision Walkthrough" },
  { id: "inventory", label: "Agent Inventory" },
  { id: "rollout", label: "Rollout Plan" },
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
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ai-accent)]/10"
      >
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

function StatCard({
  value,
  label,
  accent,
}: {
  value: string
  label: string
  accent?: string
}) {
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
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-card">
          <nav aria-label="Document sections" className="sticky top-16 flex flex-col gap-0.5 p-4 w-full max-h-[calc(100vh-4rem)] overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">
              Contents
            </p>
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
          <div className="mx-auto max-w-5xl px-6 py-10">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
                </li>
                <li><ChevronRight className="size-3" /></li>
                <li>
                  <Link href="/phase-1" className="hover:text-foreground transition-colors">Phase 1</Link>
                </li>
                <li><ChevronRight className="size-3" /></li>
                <li className="text-foreground font-medium">Multi Agent Architecture</li>
              </ol>
            </nav>

            {/* Title */}
            <div className="flex items-start gap-4 mb-10">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--ai-accent)]/10">
                <Brain className="size-6 text-[var(--ai-accent)]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-[var(--ai-accent)] text-white">Architecture</Badge>
                  <Badge variant="outline">Phase 1+</Badge>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                  Multi-Agent Architecture -- Self-Learning System
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  1 Routing Agent + 7 Wizard Agents containing 40 sub-agents (including 3 quality sub-agents per wizard that always run first)
                </p>
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <StatCard value="1" label="Routing Agent" accent="oklch(0.55 0.17 165)" />
              <StatCard value="7" label="Wizard Agents" accent="oklch(0.55 0.15 250)" />
              <StatCard value="40" label="Total Sub-Agents" accent="oklch(0.55 0.18 290)" />
              <StatCard value="3" label="Quality Agents per Wizard" accent="oklch(0.55 0.22 25)" />
            </div>

            <div className="flex flex-col gap-14">

              {/* ═══════════════ SECTION 1: OVERVIEW ═══════════════ */}
              <section>
                <SectionHeading id="overview" number="1" icon={Layers} title="Architecture Overview" />
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      The system has 2 levels. A Routing Agent at the top decides which wizard departments each document needs. 7 Wizard Agents act as specialist departments, each containing all its sub-agents. Within each wizard, 3 quality sub-agents always run first (Information Collection, Rule Validation, Hallucination Detection) to validate data before the core sub-agents begin their work.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { layer: "Level 1", who: "Routing Agent", what: "Looks at a document and decides which wizard departments it needs. Does not make any tax decisions -- only routes.", count: "1 agent", icon: Route },
                        { layer: "Level 2", who: "7 Wizard Agents", what: "Each wizard is a specialist department containing all its sub-agents. Within each wizard, 3 quality sub-agents run first (info check, rule check, hallucination check), then the core sub-agents perform the specific wizard tasks.", count: "7 wizards, 40 sub-agents total", icon: Layers },
                      ].map((l) => {
                        const LIcon = l.icon
                        return (
                          <div
                            key={l.layer}
                            className="flex flex-col rounded-lg border border-border bg-muted/30 p-4"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <LIcon className="size-4 text-[var(--ai-accent)]" />
                              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">{l.layer}</p>
                            </div>
                            <p className="text-sm font-medium text-foreground mb-1">{l.who}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed flex-1">{l.what}</p>
                            <p className="text-xs font-semibold text-[var(--ai-accent)] mt-3">{l.count}</p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ═══════════════ SECTION 2: HOW IT WORKS ═══════════════ */}
              <section>
                <SectionHeading id="how-it-works" number="2" icon={GitBranch} title="How It Works (Simple Version)" />

                <div className="flex flex-col gap-4">
                  {/* Flow steps */}
                  {[
                    {
                      step: "Step 1",
                      title: "Front Desk -- Routing Agent",
                      desc: "Routing Agent examines document characteristics and decides which of the 7 wizard departments it needs. Unnecessary departments are skipped entirely.",
                      highlight: "Only relevant wizard departments are invoked",
                    },
                    {
                      step: "Step 2",
                      title: "Quality Sub-Agents Run First (Inside Each Wizard)",
                      desc: "When a wizard starts, its first 3 sub-agents are always the quality agents: Is the data complete? Does this pattern have a clear historical outcome? Are there known hallucination risks? These run before any core sub-agents within the same wizard.",
                      highlight: "Quality gates are embedded inside each wizard, not a separate layer",
                    },
                    {
                      step: "Step 3",
                      title: "Wizards Work in Parallel",
                      desc: "Independent wizards work at the same time. Superseded and Duplicate do not depend on each other, so they run simultaneously -- each running their own quality sub-agents first, then their core sub-agents. This makes the system roughly 50% faster.",
                      highlight: "Up to 3 wizards run at the same time, each with self-contained quality checks",
                    },
                    {
                      step: "Step 4",
                      title: "Core Sub-Agents Execute with Validated Data",
                      desc: "After the 3 quality sub-agents finish, the core sub-agents within each wizard begin. Each does one specific task -- grouping documents, comparing fields, scoring confidence -- working with data that has already been validated by their wizard's quality gate.",
                      highlight: "Core sub-agents never start until the quality sub-agents have cleared the data",
                    },
                  ].map((s, i) => (
                    <Card key={s.step}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ai-accent)] text-white text-sm font-bold">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground mb-1">{s.title}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                            <p className="text-xs font-medium text-[var(--ai-accent)] mt-2">{s.highlight}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* ═══════════════ SECTION 3: ROUTING AGENT ═══════════════ */}
              <section>
                <SectionHeading id="routing-agent" number="3" icon={Route} title="Routing Agent" />
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      The Routing Agent is the single entry point for every document. It does NOT process the document or make any tax decisions. It only routes. It queries the Library to learn which wizard(s) each document type historically needed.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">What It Learns From Library</p>
                        <ul className="flex flex-col gap-2 text-sm text-muted-foreground leading-relaxed">
                          <li className="flex items-start gap-2">
                            <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--ai-accent)]" />
                            Which form types typically need which wizards
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--ai-accent)]" />
                            Which document characteristics trigger multiple wizards
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--ai-accent)]" />
                            Which wizards can be skipped for certain patterns
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--ai-accent)]" />
                            Which combinations of wizards appear together
                          </li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Example Decision</p>
                        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm font-mono text-muted-foreground leading-relaxed">
                          <p className="text-foreground font-semibold font-sans mb-2">Input: 1099-INT from Bank XYZ with prior version</p>
                          <p>Route to: Superseded (94%)</p>
                          <p>Route to: Duplicate (67%)</p>
                          <p className="text-muted-foreground/60">Skip: CFA (2%)</p>
                          <p className="text-muted-foreground/60">Skip: NFR (8%)</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ═══════════════ SECTION 4: WIZARD AGENTS ═══════════════ */}
              <section>
                <SectionHeading id="wizard-agents" number="4" icon={Layers} title="Wizard Agents and Their Sub-Agents" />

                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  7 wizard agents are organized into 4 execution groups. Wizards within the same group run in parallel. Groups execute sequentially because later groups depend on earlier results. Each wizard contains all its sub-agents: 3 quality sub-agents that always run first, followed by the core sub-agents.
                </p>

                {/* Group labels */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { group: "Group 1", wizards: "Pre-verification, Verification", exec: "Parallel", color: "oklch(0.55 0.15 250)" },
                    { group: "Group 2", wizards: "Superseded, Duplicate, CFA", exec: "Parallel", color: "oklch(0.55 0.18 290)" },
                    { group: "Group 3", wizards: "NFR", exec: "After Group 2", color: "oklch(0.6 0.15 60)" },
                    { group: "Group 4", wizards: "Finalization", exec: "After all", color: "oklch(0.55 0.22 25)" },
                  ].map((g) => (
                    <div
                      key={g.group}
                      className="rounded-lg border border-border p-3"
                      style={{ borderLeftWidth: "4px", borderLeftColor: g.color }}
                    >
                      <p className="text-xs font-semibold text-foreground">{g.group}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{g.wizards}</p>
                      <Badge variant="outline" className="mt-2 text-xs">{g.exec}</Badge>
                    </div>
                  ))}
                </div>

                {/* Wizard detail cards */}
                <div className="flex flex-col gap-4">
                  {WIZARD_AGENTS.map((w) => {
                    const WIcon = w.icon
                    return (
                      <Card key={w.id} style={{ borderLeftWidth: "4px", borderLeftColor: w.accent }}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <WIcon className="size-4" style={{ color: w.accent }} />
                              <CardTitle className="text-sm">{w.title}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">Group {w.group}</Badge>
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
                                  <th className="text-left py-2 pr-4 text-xs font-semibold text-foreground">Seq</th>
                                  <th className="text-left py-2 pr-4 text-xs font-semibold text-foreground">Sub-Agent</th>
                                  <th className="text-left py-2 pr-4 text-xs font-semibold text-foreground">Role</th>
                                  <th className="text-left py-2 pr-4 text-xs font-semibold text-foreground">Purpose</th>
                                  <th className="text-left py-2 text-xs font-semibold text-foreground">Parallel</th>
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
                                      <td className="py-2 pr-4 text-xs text-muted-foreground font-mono">
                                        {seqLabel}
                                      </td>
                                      <td className="py-2 pr-4 text-xs font-medium text-foreground whitespace-nowrap">{a.name}</td>
                                      <td className="py-2 pr-4 text-xs">
                                        {isQuality ? (
                                          <Badge variant="outline" className="text-xs" style={{ borderColor: "oklch(0.6 0.15 60)", color: "oklch(0.6 0.15 60)" }}>Quality</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-xs" style={{ borderColor: "oklch(0.55 0.15 250)", color: "oklch(0.55 0.15 250)" }}>Core</Badge>
                                        )}
                                      </td>
                                      <td className="py-2 pr-4 text-xs text-muted-foreground">{a.desc}</td>
                                      <td className="py-2 text-xs">
                                        {a.parallel ? (
                                          <Badge variant="outline" className="text-xs bg-[var(--confidence-high)]/10 text-[var(--confidence-high)] border-[var(--confidence-high)]/30">Yes</Badge>
                                        ) : (
                                          <span className="text-muted-foreground">No</span>
                                        )}
                                      </td>
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

              {/* ═══════════════ SECTION 5: QUALITY SUB-AGENTS ═══════════════ */}
              <section>
                <SectionHeading id="quality-agents" number="5" icon={Shield} title="Quality Sub-Agents (Inside Each Wizard)" />

                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Every wizard contains 3 quality sub-agents that always execute first, before any core sub-agents begin. These are not a separate layer -- they are the first sub-agents in each wizard's execution sequence. Information Collection runs first (seq 1), then Rule Validation and Hallucination Detection run in parallel (seq 2a, 2b). Only after all 3 finish do the core sub-agents start. This pattern repeats identically in all 7 wizards (21 quality sub-agent instances total).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PRE_WIZARD_AGENTS.map((a) => {
                    const AIcon = a.icon
                    return (
                      <Card key={a.name} style={{ borderLeftWidth: "4px", borderLeftColor: a.accent }}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <AIcon className="size-4" style={{ color: a.accent }} />
                            <CardTitle className="text-sm">{a.name}</CardTitle>
                          </div>
                          <Badge variant="outline" className="w-fit text-xs mt-1">{a.timing}</Badge>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm font-medium text-foreground mb-3">
                            {`"${a.purpose}"`}
                          </p>
                          <ul className="flex flex-col gap-2 mb-4">
                            {a.checks.map((c) => (
                              <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                                <span className="mt-1.5 block size-1.5 shrink-0 rounded-full" style={{ backgroundColor: a.accent }} />
                                {c}
                              </li>
                            ))}
                          </ul>
                          <div className="rounded-lg bg-muted/50 p-3 border border-border">
                            <p className="text-xs font-semibold text-foreground mb-1">Early Detection Benefit</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{a.prevents}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Execution flow */}
                <Card className="mt-4">
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Sub-Agent Execution Order (inside each wizard)</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                      Within each wizard, the 3 quality sub-agents execute first. Only after they complete do the core sub-agents begin. All agents shown below are sub-agents of the same wizard.
                    </p>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                      <div className="flex-1 rounded-lg border-2 border-[oklch(0.55_0.15_250)] bg-[oklch(0.55_0.15_250)]/5 p-3 text-center">
                        <p className="text-xs font-semibold text-foreground">Information Collection</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Sub-agent 1 (quality)</p>
                      </div>
                      <ArrowDown className="size-4 text-muted-foreground mx-auto md:hidden" />
                      <ChevronRight className="size-4 text-muted-foreground hidden md:block shrink-0" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="rounded-lg border-2 border-[oklch(0.55_0.17_165)] bg-[oklch(0.55_0.17_165)]/5 p-3 text-center">
                          <p className="text-xs font-semibold text-foreground">Rule Validation</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Sub-agent 2a (quality, parallel)</p>
                        </div>
                        <div className="rounded-lg border-2 border-[oklch(0.55_0.22_25)] bg-[oklch(0.55_0.22_25)]/5 p-3 text-center">
                          <p className="text-xs font-semibold text-foreground">Hallucination Detection</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Sub-agent 2b (quality, parallel)</p>
                        </div>
                      </div>
                      <ArrowDown className="size-4 text-muted-foreground mx-auto md:hidden" />
                      <ChevronRight className="size-4 text-muted-foreground hidden md:block shrink-0" />
                      <div className="flex-1 rounded-lg border-2 border-dashed border-border bg-muted/30 p-3 text-center">
                        <p className="text-xs font-semibold text-foreground">Quality Gate Output</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Flags and risk areas</p>
                      </div>
                      <ArrowDown className="size-4 text-muted-foreground mx-auto md:hidden" />
                      <ChevronRight className="size-4 text-muted-foreground hidden md:block shrink-0" />
                      <div className="flex-1 rounded-lg border-2 border-[var(--ai-accent)] bg-[var(--ai-accent)]/10 p-3 text-center">
                        <p className="text-xs font-semibold text-foreground">Core Wizard Agents</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Work with validated data</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ═══════════════ SECTION 6: DISAGREEMENTS ═══════════════ */}
              <section>
                <SectionHeading id="disagreements" number="6" icon={AlertTriangle} title="Disagreement Resolution" />

                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      When the 3 quality sub-agents within a wizard disagree, a strict priority hierarchy determines how the core sub-agents should proceed. Hallucination risk always takes highest priority -- if data is prone to fabrication, the core sub-agents are instructed to flag for human review regardless of what the other quality agents say. Because these checks happen first within the wizard, problems are caught before any core processing begins.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { priority: "1st (Highest)", agent: "Hallucination Detection", reason: "If the AI made up facts, the entire decision is unreliable.", color: "oklch(0.55 0.22 25)" },
                        { priority: "2nd", agent: "Rule Validation", reason: "Decision contradicts history but at least used real data. Fixable.", color: "oklch(0.7 0.15 75)" },
                        { priority: "3rd (Lowest)", agent: "Information Collection", reason: "Missing data is concerning but does not automatically mean the decision is wrong.", color: "oklch(0.55 0.15 250)" },
                      ].map((p) => (
                        <div key={p.priority} className="rounded-lg border border-border p-4" style={{ borderLeftWidth: "4px", borderLeftColor: p.color }}>
                          <p className="text-xs font-semibold text-foreground">{p.priority}</p>
                          <p className="text-sm font-medium text-foreground mt-1">{p.agent}</p>
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.reason}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">All Possible Outcomes</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 pr-3 text-xs font-semibold text-foreground">Info Collection</th>
                            <th className="text-left py-2 pr-3 text-xs font-semibold text-foreground">Rule Validation</th>
                            <th className="text-left py-2 pr-3 text-xs font-semibold text-foreground">Hallucination</th>
                            <th className="text-left py-2 pr-3 text-xs font-semibold text-foreground">Action</th>
                            <th className="text-left py-2 text-xs font-semibold text-foreground">Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DISAGREEMENT_MATRIX.map((row, i) => (
                            <tr key={i} className="border-b border-border/50 last:border-0">
                              <td className="py-2 pr-3 text-xs text-muted-foreground">{row.info}</td>
                              <td className="py-2 pr-3 text-xs text-muted-foreground">{row.rule}</td>
                              <td className="py-2 pr-3 text-xs">
                                <span className={row.hall === "Hallucination" ? "font-semibold text-[oklch(0.55_0.22_25)]" : "text-muted-foreground"}>
                                  {row.hall}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-xs font-medium text-foreground">{row.action}</td>
                              <td className="py-2 text-xs">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{ borderColor: row.color, color: row.color }}
                                >
                                  {row.priority}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ═══════════════ SECTION 7: LEARNING ═══════════════ */}
              <section>
                <SectionHeading id="learning" number="7" icon={TrendingUp} title="Self-Learning -- The Library" />

                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      There are no hardcoded rules in this system. Every agent learns its behavior from a Library of past decisions -- millions of records showing what documents were involved, what the AI decided, what the human reviewer decided, and whether they agreed.
                    </p>

                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">The Learning Cycle</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {[
                        { step: "Study", desc: "Agent reads millions of past decisions from Library. Discovers patterns: 'When X happened, humans decided Y.'" },
                        { step: "Apply", desc: "Agent uses patterns to make decisions on new documents. Decides based on historical agreement rates." },
                        { step: "Correct", desc: "Human reviewer agrees or overrides. Library updated with new data point." },
                      ].map((s) => (
                        <div key={s.step} className="rounded-lg border border-border bg-muted/30 p-4">
                          <p className="text-sm font-semibold text-foreground mb-1">{s.step}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { step: "Detect", desc: "System groups corrections to find new patterns. 'Oh, 25 corrections all involve amounts under $5.'" },
                        { step: "Adapt", desc: "Agent incorporates new patterns. Better decisions, higher confidence on known patterns." },
                        { step: "Self-correct", desc: "Patterns that cause more overrides are automatically retired. Agent stops using bad patterns." },
                      ].map((s) => (
                        <div key={s.step} className="rounded-lg border border-border bg-muted/30 p-4">
                          <p className="text-sm font-semibold text-foreground mb-1">{s.step}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Season-over-Season Improvement</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 pr-4 text-xs font-semibold text-foreground">Season</th>
                            <th className="text-left py-2 pr-4 text-xs font-semibold text-foreground">Library State</th>
                            <th className="text-left py-2 pr-4 text-xs font-semibold text-foreground">Agent Behavior</th>
                            <th className="text-left py-2 text-xs font-semibold text-foreground">Reviewer Workload</th>
                          </tr>
                        </thead>
                        <tbody>
                          {LEARNING_STAGES.map((s) => (
                            <tr key={s.stage} className="border-b border-border/50 last:border-0">
                              <td className="py-2.5 pr-4 text-xs font-medium text-foreground whitespace-nowrap">{s.stage}</td>
                              <td className="py-2.5 pr-4 text-xs text-muted-foreground">{s.library}</td>
                              <td className="py-2.5 pr-4 text-xs text-muted-foreground">{s.behavior}</td>
                              <td className="py-2.5 text-xs text-muted-foreground">{s.workload}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ═══════════════ SECTION 8: DECISION WALKTHROUGH ═══════════════ */}
              <section>
                <SectionHeading id="decision-walkthrough" number="8" icon={BookOpen} title="Complete Decision Walkthrough" />

                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">The Scenario</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      A tax binder arrives with 500 pages. Among them are 3 pages of 1099-INT from Bank XYZ:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { page: "Page 12", details: "Account 9876, Amount $1,200, Jan 2025, Not corrected" },
                        { page: "Page 15", details: "Account 9876, Amount $1,250, Mar 2025, Marked 'Corrected'" },
                        { page: "Page 22", details: "Account 5555, Amount $800, Jan 2025, Not corrected" },
                      ].map((p) => (
                        <div key={p.page} className="rounded-lg border border-border bg-muted/30 p-3">
                          <p className="text-xs font-semibold text-foreground">{p.page}</p>
                          <p className="text-xs text-muted-foreground mt-1">{p.details}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Walk-through steps */}
                {[
                  {
                    step: "Step 1: Routing Agent",
                    color: "oklch(0.55 0.15 250)",
                    content: [
                      { label: "Library Query", value: "For 1099-INT with multiple pages from same payer, which wizards were historically needed?" },
                      { label: "Decision", value: "Route to: Pre-verification, Verification, Superseded, Duplicate. Skip: CFA (2%), NFR (8%)." },
                      { label: "Confidence", value: "96% based on strong historical patterns for this form type" },
                    ],
                  },
                  {
                    step: "Step 2: Pre-verification + Verification (Parallel)",
                    color: "oklch(0.55 0.17 165)",
                    content: [
                      { label: "Pre-verification -- Pre-Checks Run First", value: "Information Collection: all fields present on 3 pages. Rule Validation: 1099-INT completeness pattern matches 99.1% of past cases. Hallucination Detection: no hallucination-prone fields identified. Pre-check report: CLEAN." },
                      { label: "Pre-verification -- Core Agents (with validated data)", value: "Completeness Agent: 3 pages found, no missing documents. Data Quality Agent: all fields readable on all pages." },
                      { label: "Verification -- Pre-Checks Run First", value: "Information Collection: cross-reference data available for all pages. Rule Validation: amount difference pattern is normal for corrected docs (89% historical). Hallucination Detection: no risk areas. Pre-check report: CLEAN." },
                      { label: "Verification -- Core Agents (with validated data)", value: "Cross-Reference Agent: amounts differ by $50 between pages 12 and 15 (expected for corrected). Anomaly Agent: no anomalies detected." },
                    ],
                  },
                  {
                    step: "Step 3: Superseded + Duplicate (Parallel)",
                    color: "oklch(0.55 0.18 290)",
                    content: [
                      { label: "Superseded -- Pre-Checks Run First", value: "Information Collection: all comparison fields present (payer, recipient, account, amount, corrected flag, tax year). Rule Validation: corrected-vs-uncorrected pattern matches 99.4% historical. Hallucination Detection: account number is a known hallucination-prone field -- flagged for extra scrutiny. Pre-check report: CLEAN with one watch area." },
                      { label: "Superseded - Grouping", value: "Group A: Pages 12 and 15 (Bank XYZ, account 9876). Group B: Page 22 alone (account 5555)." },
                      { label: "Superseded - Comparison", value: "Page 12 vs 15: Comparable. Same payer, same account (pre-validated by hallucination agent), same year. Page 22: no pair." },
                      { label: "Superseded - Precedence", value: "Retain Page 15 (corrected, later date). Supersede Page 12." },
                      { label: "Superseded - Confidence", value: "97.7% based on 347 historical cases. Account match was pre-validated -- no hallucination risk." },
                      { label: "Duplicate -- Pre-Checks Run First", value: "Information Collection: all fields available. Rule Validation: original-vs-corrected pattern is 98.9% NotDuplicate. Pre-check report: CLEAN." },
                      { label: "Duplicate -- Core Agents", value: "Page 12 vs 15: NOT duplicate (original vs corrected). Page 12 vs 22: NOT duplicate (different accounts)." },
                    ],
                  },
                  {
                    step: "Step 4: NFR -- Skipped",
                    color: "oklch(0.6 0.15 60)",
                    content: [
                      { label: "Result", value: "Routing Agent determined NFR was not needed. Only 8% historical need for 1099-INT, and no unmatched forms remain." },
                    ],
                  },
                  {
                    step: "Step 5: Finalization",
                    color: "oklch(0.55 0.22 25)",
                    content: [
                      { label: "Pre-Checks Run First", value: "Information Collection: all wizard results received. Rule Validation: Superseded + NotDuplicate combination matches 97.2% of past finalization outcomes. Hallucination Detection: no fabrication risk areas. Pre-check report: CLEAN." },
                      { label: "Conflict Agent", value: "Superseded says retain Page 15. Duplicate says NOT duplicate. These are consistent -- no conflict." },
                      { label: "Completeness Agent", value: "Page 12: Superseded. Page 15: Retained. Page 22: No action. All 3 pages accounted for." },
                    ],
                  },
                ].map((s) => (
                  <Card key={s.step} className="mb-4" style={{ borderLeftWidth: "4px", borderLeftColor: s.color }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{s.step}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-3">
                        {s.content.map((c) => (
                          <div key={c.label}>
                            <p className="text-xs font-semibold text-foreground mb-0.5">{c.label}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{c.value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Final result */}
                <Card className="border-2 border-[var(--confidence-high)]">
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold text-[var(--confidence-high)] uppercase tracking-wider mb-4">Final Result</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold text-foreground">Page 12</p>
                        <p className="text-xs text-muted-foreground mt-1">SUPERSEDED by Page 15</p>
                        <p className="text-xs text-[var(--confidence-high)] mt-1">Confidence: 97.7%</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold text-foreground">Page 15</p>
                        <p className="text-xs text-muted-foreground mt-1">RETAINED (corrected version)</p>
                        <p className="text-xs text-[var(--confidence-high)] mt-1">Confidence: 97.7%</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold text-foreground">Page 22</p>
                        <p className="text-xs text-muted-foreground mt-1">NO ACTION (different account)</p>
                        <p className="text-xs text-[var(--confidence-high)] mt-1">Confidence: 98.9%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">29</p>
                        <p className="text-xs text-muted-foreground">Agents Invoked</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">5</p>
                        <p className="text-xs text-muted-foreground">Sequential Steps</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">0</p>
                        <p className="text-xs text-muted-foreground">Hallucinations Found</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">Auto</p>
                        <p className="text-xs text-muted-foreground">Approval Status</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ═══════════════ SECTION 9: AGENT INVENTORY ═══════════════ */}
              <section>
                <SectionHeading id="inventory" number="9" icon={Database} title="Complete Agent Inventory" />

                <Card>
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 pr-2 text-xs font-semibold text-foreground">#</th>
                            <th className="text-left py-2 pr-2 text-xs font-semibold text-foreground">Group</th>
                            <th className="text-left py-2 pr-2 text-xs font-semibold text-foreground">Wizard</th>
                            <th className="text-left py-2 pr-2 text-xs font-semibold text-foreground">Agent Name</th>
                            <th className="text-left py-2 pr-2 text-xs font-semibold text-foreground">Type</th>
                            <th className="text-left py-2 pr-2 text-xs font-semibold text-foreground">Seq</th>
                            <th className="text-left py-2 pr-2 text-xs font-semibold text-foreground">Parallel With</th>
                            <th className="text-left py-2 text-xs font-semibold text-foreground">Depends On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {AGENT_INVENTORY.map((row) => (
                            <tr key={row.num} className="border-b border-border/50 last:border-0">
                              <td className="py-1.5 pr-2 text-xs text-muted-foreground font-mono">{row.num}</td>
                              <td className="py-1.5 pr-2 text-xs text-muted-foreground">{row.group}</td>
                              <td className="py-1.5 pr-2 text-xs text-muted-foreground whitespace-nowrap">{row.wizard}</td>
                              <td className="py-1.5 pr-2 text-xs font-medium text-foreground whitespace-nowrap">{row.name}</td>
                              <td className="py-1.5 pr-2 text-xs">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={
                                    row.type === "Core"
                                      ? { borderColor: "oklch(0.55 0.15 250)", color: "oklch(0.55 0.15 250)" }
                                      : row.type === "Quality"
                                        ? { borderColor: "oklch(0.6 0.15 60)", color: "oklch(0.6 0.15 60)" }
                                        : { borderColor: "oklch(0.55 0.17 165)", color: "oklch(0.55 0.17 165)" }
                                  }
                                >
                                  {row.type}
                                </Badge>
                              </td>
                              <td className="py-1.5 pr-2 text-xs text-muted-foreground font-mono">{row.seq}</td>
                              <td className="py-1.5 pr-2 text-xs text-muted-foreground">{row.parallelWith}</td>
                              <td className="py-1.5 text-xs text-muted-foreground">{row.dependsOn}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">1</p>
                        <p className="text-xs text-muted-foreground">Routing Agent</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">7</p>
                        <p className="text-xs text-muted-foreground">Wizard Agents</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">21</p>
                        <p className="text-xs text-muted-foreground">Quality Sub-Agents</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">19</p>
                        <p className="text-xs text-muted-foreground">Core Sub-Agents</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ═══════════════ SECTION 10: ROLLOUT PLAN ═══════════════ */}
              <section>
                <SectionHeading id="rollout" number="10" icon={Target} title="Rollout Plan" />

                <div className="flex flex-col gap-4">
                  {[
                    {
                      phase: "Phase 1",
                      title: "One Wizard",
                      status: "First",
                      color: "oklch(0.55 0.17 145)",
                      what: "Build Routing Agent + Superseded Wizard with all 7 sub-agents (3 quality sub-agents that run first + 4 core sub-agents). Pre-load Library with historical tracking data.",
                      proves: "Does the pattern work? Do quality sub-agents catch data issues before core agents start? Do core agents make accurate decisions on validated data?",
                      risk: "Low -- one wizard only",
                    },
                    {
                      phase: "Phase 2",
                      title: "Three Wizards",
                      status: "Second",
                      color: "oklch(0.7 0.15 75)",
                      what: "Add Duplicate and CFA wizards using the same pattern. Enable parallel execution across Group 2.",
                      proves: "Can multiple wizards run at the same time? Does the Library support multiple wizards?",
                      risk: "Medium -- testing parallelism",
                    },
                    {
                      phase: "Phase 3",
                      title: "Full Pipeline",
                      status: "Third",
                      color: "oklch(0.55 0.15 250)",
                      what: "Add NFR, Pre-verification, Verification, Finalization. Complete the 48-agent system.",
                      proves: "Full end-to-end pipeline works. All wizards learning independently.",
                      risk: "Medium -- full integration",
                    },
                    {
                      phase: "Phase 4",
                      title: "Learning at Scale",
                      status: "Ongoing",
                      color: "oklch(0.55 0.18 290)",
                      what: "Enable learning from reviewer corrections. Library grows. Agents improve. Routine workload decreases.",
                      proves: "Does accuracy improve over time? Does reviewer workload decrease each season?",
                      risk: "Low -- learning is additive",
                    },
                  ].map((p) => (
                    <Card key={p.phase} style={{ borderLeftWidth: "4px", borderLeftColor: p.color }}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold text-foreground">{p.phase}: {p.title}</p>
                          <Badge variant="outline" className="text-xs" style={{ borderColor: p.color, color: p.color }}>{p.status}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">What We Do</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{p.what}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">What We Prove</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{p.proves}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">Risk</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{p.risk}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* CTA */}
                <Card className="mt-6 border-[var(--ai-accent)]/30 bg-[var(--ai-accent)]/5">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm font-semibold text-foreground mb-2">
                      Each phase is independently valuable.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xl mx-auto">
                      Phase 1 alone delivers a working Superseded wizard with quality sub-agents and core sub-agents. We do not need to complete all 4 phases to see benefit. No hardcoded rules. No code changes between seasons. The system improves by watching and learning from human expertise.
                    </p>
                    <div className="flex justify-center gap-3 mt-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/phase-1">
                          <ArrowLeft className="size-3.5" />
                          Back to Phase 1
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href="/">
                          Overview
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </section>

            </div>
          </div>
        </main>
      </div>

      <footer className="border-t border-border bg-card py-4">
        <p className="text-center text-xs text-muted-foreground/60">
          Multi-Agent Architecture Documentation -- Product Strategy -- Prototype data is for demonstration purposes.
        </p>
      </footer>
    </div>
  )
}
