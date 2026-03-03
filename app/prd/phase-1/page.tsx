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
  FileStack,
  Copy,
  Link2,
  FileSearch,
  Layers,
  Cpu,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Phase1PrdPage() {
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
              <li className="text-foreground font-medium">Phase 1 PRD</li>
            </ol>
          </nav>

          <div className="flex items-start gap-4 mb-10">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--ai-accent)]/10">
              <FileText className="size-6 text-[var(--ai-accent)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[var(--confidence-high)] text-white">
                  Reviewed &amp; Finalized
                </Badge>
                <Badge variant="outline">Phase 1</Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                Elimination of Wizard -- PRD Context
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI-Automated Business Rules &amp; Wizard Reduction
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
                      Currently, users navigate seven dynamic wizards, each with multiple steps, to complete verification. This process is time-consuming (minutes approx. for 150 pg. binder), repetitive, and leads to user unproductive time. Many steps are triggered dynamically based on document data, making the workflow unpredictable and lengthy.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The existing wizard experience is not significantly changing, but it remains page-by-page and requires excessive clicks. Users want a more efficient, intuitive, and less repetitive process. There are also issues with unclear actions, slow performance, and missing guidance.
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
                    <li>Remove at least four redundant wizard steps in Phase 1. (Pre-verification, Superseded, Duplicate data &amp; Finalization wizard)</li>
                    <li>AI automates tasks, presents the results to the customer with a confidence indicator or %, and requests human validation for actions when AI confidence is low.</li>
                    <li>Make sure export occurs once the final required action has been completed, according to admin settings.</li>
                    <li>Update UI as necessary to reflect the new streamlined workflow.</li>
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
                    <CardTitle className="text-sm">Target Wizards (4 Eliminated)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <FileStack className="size-4 text-[oklch(0.65_0.15_300)]" />
                        <span className="text-sm text-muted-foreground">Superseded Wizard</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Copy className="size-4 text-[var(--ai-accent)]" />
                        <span className="text-sm text-muted-foreground">Duplicate Data Wizard</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link2 className="size-4 text-[oklch(0.65_0.15_170)]" />
                        <span className="text-sm text-muted-foreground">CFA (Child Form Association) Wizard</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileSearch className="size-4 text-[var(--confidence-medium)]" />
                        <span className="text-sm text-muted-foreground">NFR (New Form Review) Wizard</span>
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
                      <li>Tax professionals who perform post-verification review of scanned 1040 binders.</li>
                      <li>Users currently navigating 7 wizard steps per binder, spending minutes on 150+ page binders.</li>
                      <li>Administrators managing workflow rules and compliance settings.</li>
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
                    <p className="text-2xl font-bold text-foreground mb-1">{'\u2265'} 4 Steps</p>
                    <p className="text-xs text-muted-foreground">Wizard Steps Eliminated in Phase 1</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-[var(--ai-accent)]">
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-foreground mb-1">{'\u2265'} 50%</p>
                    <p className="text-xs text-muted-foreground">Verification Time Reduction</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-[oklch(0.65_0.15_170)]">
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-foreground mb-1">{'\u2265'} 80%</p>
                    <p className="text-xs text-muted-foreground">User Satisfaction Post-Implementation</p>
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
                Each wizard follows a consistent three-step pattern: the AI reads document data, applies predefined business rules to make decisions, and presents results with a confidence score so reviewers know exactly where to focus.
              </p>

              <div className="flex flex-col gap-6">

                {/* Superseded Wizard */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <FileStack className="size-4 text-[oklch(0.65_0.15_300)]" />
                      <CardTitle className="text-sm">Superseded Wizard</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">What Goes In</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Scanned tax documents with identifying details -- payer name, tax ID, recipient, account number, and corrected/amended indicators.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">How AI Decides</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Compares documents within the same group using predefined business rules. Identifies newer, corrected, or amended versions and determines which to retain. High-confidence decisions apply automatically; lower-confidence ones go to the reviewer.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">What Comes Out</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Each document is classified as Original or Superseded -- with a confidence score and plain-language explanation. Reviewers can accept, reject, or override any recommendation.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Duplicate Data Wizard */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Copy className="size-4 text-[var(--ai-accent)]" />
                      <CardTitle className="text-sm">Duplicate Data Wizard</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">What Goes In</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Organizer entries alongside scanned source documents and consolidated statements -- names, amounts, tax IDs, account numbers, and document dates for comparison.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">How AI Decides</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Applies business rules for duplicate identification: comparing amounts, payer/recipient identifiers, account numbers, jurisdictions, and document dates. Jurisdiction mismatches are an automatic hard stop.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">What Comes Out</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Each comparison is marked Duplicate or Original -- with match type, confidence score, and a clear explanation of which fields were compared and why.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CFA Wizard */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Link2 className="size-4 text-[oklch(0.65_0.15_170)]" />
                      <CardTitle className="text-sm">CFA (Child Form Association) Wizard</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">What Goes In</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Unassociated child forms (schedules, worksheets) and available parent forms -- form names, compatibility codes, and identifying details.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">How AI Decides</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Checks mandatory compatibility first, then matches by name and identifiers. Avoids placeholder parents and creates new parent forms when no valid match exists. Ambiguous cases go to human review.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">What Comes Out</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Each child form is assigned to its best-matching parent or a newly created one -- with a confidence score and explanation. Reviewers can reassign if needed.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* NFR Wizard */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <FileSearch className="size-4 text-[var(--confidence-medium)]" />
                      <CardTitle className="text-sm">NFR (New Form Review) Wizard</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">What Goes In</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Unmatched scanned documents and available proforma input forms -- document names, form types, identifiers, and eligibility indicators.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">How AI Decides</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Checks form type compatibility first (hard stop if mismatched), verifies eligibility, then matches by name and identifiers against an accuracy threshold. Never forces a match -- uncertain documents stay unmatched for human review.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">What Comes Out</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Each document is matched to a proforma form or left unmatched -- with a confidence score and status. May recommend supersede or merge actions, but never executes them automatically.
                        </p>
                      </div>
                    </div>
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
