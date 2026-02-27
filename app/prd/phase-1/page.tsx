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
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Remove at least four redundant wizard steps in Phase 1. (Pre-verification, Superseded, Duplicate data &amp; Finalization wizard)
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      AI automates tasks, presents the results to the customer with a confidence indicator or %, and requests human validation for actions when AI confidence is low.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Make sure export occurs once the final required action has been completed, according to admin settings.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Update UI as necessary to reflect the new streamlined workflow.
                    </p>
                  </div>
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
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Tax professionals who perform post-verification review of scanned 1040 binders.
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Users currently navigating 7 wizard steps per binder, spending minutes on 150+ page binders.
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Administrators managing workflow rules and compliance settings.
                      </p>
                    </div>
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
                    <p className="text-2xl font-bold text-foreground mb-1">{'\\u2265'} 4 Steps</p>
                    <p className="text-xs text-muted-foreground">Wizard Steps Eliminated in Phase 1</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-[var(--ai-accent)]">
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-foreground mb-1">{'\\u2265'} 50%</p>
                    <p className="text-xs text-muted-foreground">Verification Time Reduction</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-[oklch(0.65_0.15_170)]">
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-foreground mb-1">{'\\u2265'} 80%</p>
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
                Each wizard follows the same three-layer architecture: data enters the Input Layer, is evaluated by the Processing Layer using deterministic rule sets, and produces structured decisions in the Output Layer.
              </p>

              {/* Superseded Wizard */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <FileStack className="size-4 text-[oklch(0.65_0.15_300)]" />
                  <h3 className="text-base font-semibold text-foreground">Superseded Wizard</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-t-2 border-t-[var(--ai-accent)]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="size-4 text-[var(--ai-accent)]" />
                        <CardTitle className="text-sm">What Goes In</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li>Document type / form category</li>
                        <li>Payer / Issuer name and EIN/TIN</li>
                        <li>Recipient / Taxpayer name</li>
                        <li>Account number, Tax year</li>
                        <li>Corrected / Amended indicators</li>
                        <li>Statement dates, K-1 start/end dates</li>
                        <li>Amount field presence (existence only)</li>
                      </ul>
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
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li><strong>Rule Set A</strong> (Source Docs): 9 rules (A1-A9)</li>
                        <li><strong>Rule Set B</strong> (Consolidated): 10 rules (B1-B10)</li>
                        <li>Precedence: Corrected {'>'} Uncorrected, Latest Amended {'>'} Older</li>
                        <li>Short-Year K-1 exception: retain both</li>
                        <li>Confidence bands: {'\\u2265'}0.90 auto-apply, 0.75-0.89 suggest, 0.60-0.74 user review, {'<'}0.60 do not supersede</li>
                      </ul>
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
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li>engagementPageId</li>
                        <li>isSuperseded (true/false)</li>
                        <li>retainedPageId</li>
                        <li>confidenceLevel (0.0 - 1.0)</li>
                        <li>decisionType: Original / Superseded / RetainBoth</li>
                        <li>appliedRuleSet, decisionRule, decisionReason</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Duplicate Wizard */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Copy className="size-4 text-[var(--ai-accent)]" />
                  <h3 className="text-base font-semibold text-foreground">Duplicate Data Wizard</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-t-2 border-t-[var(--ai-accent)]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="size-4 text-[var(--ai-accent)]" />
                        <CardTitle className="text-sm">What Goes In</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li>Organizer entry name/description and amounts</li>
                        <li>Source document entity name and amounts</li>
                        <li>Payer/Issuer name and EIN/TIN</li>
                        <li>Ownership code (T/S/J), Jurisdiction</li>
                        <li>Broker/payer name, Account number</li>
                        <li>Statement/issue date, Tax year</li>
                        <li>Corrected indicator</li>
                      </ul>
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
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li><strong>DUP-DATA</strong>: 3 rules -- name match, $1 tolerance, sum match</li>
                        <li><strong>DUP-SRC</strong>: 9 rules -- identifier matching, jurisdiction hard stop, corrected precedence</li>
                        <li><strong>DUP-CS</strong>: 5 rules -- broker/account match, latest date retention</li>
                        <li>Confidence: {'>'}90% auto-eligible, 70-90% recommend + review, {'<'}70% human review</li>
                      </ul>
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
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li>decision: DuplicateData / NotDuplicateData</li>
                        <li>decision: Duplicate / NotDuplicate (for docs)</li>
                        <li>matchType: DirectAmount / SumMatch / Other</li>
                        <li>retainDocId, confidenceLevel</li>
                        <li>appliedRuleSet, decisionRule, decisionReason</li>
                        <li>fieldsCompared</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* CFA Wizard */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Link2 className="size-4 text-[oklch(0.65_0.15_170)]" />
                  <h3 className="text-base font-semibold text-foreground">CFA (Child Form Association) Wizard</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-t-2 border-t-[var(--ai-accent)]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="size-4 text-[var(--ai-accent)]" />
                        <CardTitle className="text-sm">What Goes In</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li>Child: engagementFormName</li>
                        <li>Child: parentFaxFormDWPCode</li>
                        <li>Child: engagementFaxFormId, engagementPageId</li>
                        <li>Parent: faxFormDWPCode, formName</li>
                        <li>Parent: searchString, toolTip</li>
                        <li>Parent: engagementFaxFormId, faxFormId</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-t-2 border-t-[oklch(0.65_0.15_170)]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="size-4 text-[oklch(0.65_0.15_170)]" />
                        <CardTitle className="text-sm">How AI Decides</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li><strong>CFA-1</strong>: Mandatory Compatibility (hard stop on DWPCode)</li>
                        <li><strong>CFA-2</strong>: Name &amp; Identifier Matching</li>
                        <li><strong>CFA-3</strong>: Placeholder Avoidance</li>
                        <li><strong>CFA-4</strong>: AddForm Resolution (IsAddForm=true)</li>
                        <li><strong>CFA-5</strong>: Ambiguity Handling -- lower confidence, require review</li>
                        <li>Confidence: {'\\u2265'}0.90 deterministic, 0.70-0.89 strong, 0.50-0.69 weak, {'<'}0.50 uncertain</li>
                      </ul>
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
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li>EngagementFaxFormId (child)</li>
                        <li>ParentEngagementFaxFormId (selected parent)</li>
                        <li>EngagementPageId</li>
                        <li>ConfidenceLevel (0-1)</li>
                        <li>IsAddForm (boolean)</li>
                        <li>ParentFaxFormDwpCode, ParentFaxFormId</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* NFR Wizard */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FileSearch className="size-4 text-[var(--confidence-medium)]" />
                  <h3 className="text-base font-semibold text-foreground">NFR (New Form Review) Wizard</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-t-2 border-t-[var(--ai-accent)]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="size-4 text-[var(--ai-accent)]" />
                        <CardTitle className="text-sm">What Goes In</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li>EngagementId, EngagementPageId</li>
                        <li>EngagementFaxFormId, FieldGroupId</li>
                        <li>FaxRowNumber, TaxFormInstanceNo</li>
                        <li>taxInputForm name, identifiers</li>
                        <li>Proforma: formTypeId, nodeName, searchString</li>
                        <li>Proforma: ImageIndex, EngagementFormId</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-t-2 border-t-[var(--confidence-medium)]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="size-4 text-[var(--confidence-medium)]" />
                        <CardTitle className="text-sm">How AI Decides</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li><strong>NFR-1</strong>: Form Type Compatibility (hard stop)</li>
                        <li><strong>NFR-2</strong>: ImageIndex=3 constraint</li>
                        <li><strong>NFR-3</strong>: Name &amp; Identifier Matching</li>
                        <li><strong>NFR-4</strong>: Accuracy Threshold ({'\\u2265'}80%)</li>
                        <li><strong>NFR-5</strong>: Placeholder Avoidance</li>
                        <li><strong>NFR-6</strong>: No Forced Matches</li>
                        <li>Confidence: {'\\u2265'}0.90 deterministic, 0.70-0.89 reviewable, 0.50-0.69 weak, {'<'}0.50 unmatched</li>
                      </ul>
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
                      <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <li>EngagementId, EngagementPageId</li>
                        <li>EngagementFormId, EngagementFieldGroupId</li>
                        <li>FieldGroupId, EngagementFaxFormId</li>
                        <li>FaxRowNumber, TaxFormInstanceNo</li>
                        <li>MatchStatus (true/false)</li>
                        <li>ConfidenceLevel (0-1)</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

            </section>

          </div>
        </div>
      </main>
    </div>
  )
}
