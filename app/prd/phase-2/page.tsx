import Link from 'next/link'
import {
  Sparkles,
  ArrowLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Users,
  Target,
  ArrowDown,
  Layers,
  Cpu,
  BarChart3,
  LayoutDashboard,
  Eye,
  FileEdit,
  ClipboardList,
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

          <div className="flex items-start gap-4 mb-10">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--confidence-medium)]/10">
              <FileText className="size-6 text-[var(--confidence-medium)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[var(--confidence-medium)] text-foreground">
                  In Progress
                </Badge>
                <Badge variant="outline">Phase 2</Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                Quick Validation -- PRD Context
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Unified Validation View &amp; Field-Level AI Scoring
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-10">

            {/* ── Section 1: Problem Statement ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="size-5 text-[var(--confidence-medium)]" />
                <h2 className="text-lg font-semibold text-foreground">1. Problem Statement</h2>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Users need a fast way to validate extracted fields across forms, without being constrained by the traditional wizard format. The current process is not optimized for rapid review and relies heavily on manual matching. Pain points include too many steps, high manual effort, and lack of AI support.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ── Section 2: Solution Overview ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="size-5 text-[var(--confidence-high)]" />
                <h2 className="text-lg font-semibold text-foreground">2. Solution Overview</h2>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <ul className="flex flex-col gap-3 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
                    <li>{'Introduce a "Quick Validate" feature that displays snapshots and extracted fields for validation, independent of form structure.'}</li>
                    <li>Integrate AI to highlight fields with high confidence, reducing manual verification.</li>
                    <li>Display confidence levels for each extracted field, allowing users to focus only on items that require attention.</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* ── Section 3: Scope & Audience ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="size-5 text-[var(--ai-accent)]" />
                <h2 className="text-lg font-semibold text-foreground">3. Scope &amp; Audience</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Key Functional Areas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="size-4 text-[var(--ai-accent)]" />
                        <span className="text-sm text-muted-foreground">Unified Validation Dashboard (User &amp; Engagement Statistics)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="size-4 text-[oklch(0.65_0.15_300)]" />
                        <span className="text-sm text-muted-foreground">Field Level Validation with AI Confidence</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileEdit className="size-4 text-[oklch(0.65_0.15_170)]" />
                        <span className="text-sm text-muted-foreground">Override &amp; Edit (add, edit, delete, undo)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="size-4 text-[var(--confidence-medium)]" />
                        <span className="text-sm text-muted-foreground">Audit Trail for Compliance &amp; Analytics</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Target Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex flex-col gap-3 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
                      <li>Tax professionals launching RW from SCD, FR, TC, and other platforms.</li>
                      <li>Users navigating to the Quick Validation dashboard for rapid field-level review.</li>
                      <li>Reviewers who need page view, duplicate page view, and review/association views.</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ── Section 4: Key Benefits ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Target className="size-5 text-[var(--confidence-high)]" />
                <h2 className="text-lg font-semibold text-foreground">4. Key Benefits</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-[var(--confidence-high)]">
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-foreground mb-1">{'\u2265'} 70%</p>
                    <p className="text-xs text-muted-foreground">Adoption Rate within 3 Months</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-[var(--ai-accent)]">
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-foreground mb-1">{'\u2265'} 20%</p>
                    <p className="text-xs text-muted-foreground">Reduction in Validation Time Per Binder</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-[oklch(0.65_0.15_170)]">
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-foreground mb-1">{'\u2265'} 95%</p>
                    <p className="text-xs text-muted-foreground">AI-Validated Fields Require No Manual Correction</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ── Section 5: How It Works ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="size-5 text-[var(--ai-accent)]" />
                <h2 className="text-lg font-semibold text-foreground">5. How It Works</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Quick Validation replaces the traditional wizard navigation with a single unified interface. Instead of stepping through multiple screens, reviewers see all fields and documents in one view, with AI highlighting where to focus.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-t-2 border-t-[var(--ai-accent)]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="size-4 text-[var(--ai-accent)]" />
                      <CardTitle className="text-sm">What Goes In</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      All extracted fields, document snapshots, and AI confidence scores from the binder are loaded into a single unified view. User and engagement statistics provide context for the review session.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-[oklch(0.65_0.15_300)]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="size-4 text-[oklch(0.65_0.15_300)]" />
                      <CardTitle className="text-sm">How AI Decides</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      AI highlights high-confidence fields that need no manual review, while flagging low-confidence items for human attention. Reviewers can add, edit, or delete fields with full undo capability -- all within the same screen.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-[var(--confidence-high)]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-4 text-[var(--confidence-high)]" />
                      <CardTitle className="text-sm">What Comes Out</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Validated fields with user confirmations, a complete override audit trail for compliance, and engagement-level completion status. All activity feeds into the analytics dashboard for continuous improvement.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  )
}
