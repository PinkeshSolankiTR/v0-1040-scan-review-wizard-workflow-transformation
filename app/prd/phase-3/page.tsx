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
  Trophy,
  TrendingUp,
  MessageSquare,
  Award,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Phase3PrdPage() {
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
              <li className="text-foreground font-medium">Phase 3 PRD</li>
            </ol>
          </nav>

          <div className="flex items-start gap-4 mb-10">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary">
                  Planned
                </Badge>
                <Badge variant="outline">Phase 3</Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                Dashboard &amp; Gamification -- PRD Context
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Analytics, Gamification &amp; Continuous Feedback
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
                      Users lack visibility into their progress, performance, and time savings. There is no engaging way to track or motivate improvements in workflow efficiency. Product teams need actionable analytics to drive improvements.
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
                      Develop a dashboard to monitor time savings, AI actions, and overall workflow metrics.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Introduce gamification elements to encourage adoption and continuous improvement.
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
                    <CardTitle className="text-sm">Key Functional Areas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="size-4 text-[var(--ai-accent)]" />
                        <span className="text-sm text-muted-foreground">Analytics Dashboard (fields extracted, time saved, AI actions)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="size-4 text-[var(--confidence-medium)]" />
                        <span className="text-sm text-muted-foreground">Gamification (badges, leaderboards, progress bars, streaks)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-4 text-[var(--confidence-high)]" />
                        <span className="text-sm text-muted-foreground">Actionable Insights &amp; Workflow Recommendations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-[oklch(0.65_0.15_170)]" />
                        <span className="text-sm text-muted-foreground">Built-in Feedback Mechanism</span>
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
                        Tax professionals tracking their own efficiency, accuracy, and progress over time.
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Team leads and managers monitoring team performance and identifying top performers.
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Product teams needing actionable analytics to drive workflow improvements.
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
                    <p className="text-2xl font-bold text-foreground mb-1">{'\\u2265'} 60%</p>
                    <p className="text-xs text-muted-foreground">Users Engage with Dashboard Features</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-[var(--ai-accent)]">
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-foreground mb-1">{'\\u2265'} 15%</p>
                    <p className="text-xs text-muted-foreground">Workflow Efficiency Increase (Top Performers)</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-[oklch(0.65_0.15_170)]">
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-foreground mb-1">{'\\u2265'} 80%</p>
                    <p className="text-xs text-muted-foreground">Positive Feedback on Dashboard &amp; Gamification</p>
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
                The Dashboard &amp; Gamification system aggregates data from all verification activities and transforms it into actionable insights and motivational elements.
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
                    <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      <li>User activity data (binders completed, fields reviewed)</li>
                      <li>AI action logs (auto-applied, suggested, escalated)</li>
                      <li>Time spent per binder and per wizard step</li>
                      <li>Override and edit history</li>
                      <li>User feedback submissions</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-[oklch(0.65_0.15_300)]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="size-4 text-[oklch(0.65_0.15_300)]" />
                      <CardTitle className="text-sm">How It Processes</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      <li>Aggregate metrics: total fields extracted, time saved, AI actions</li>
                      <li>Compute gamification: badges, streaks, leaderboard rankings</li>
                      <li>Generate actionable recommendations for workflow improvement</li>
                      <li>Focus on metrics that drive improvements, not vanity stats</li>
                      <li>Process user feedback for product team visibility</li>
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
                      <li>Visual analytics dashboard with user and engagement metrics</li>
                      <li>
                        <Award className="inline size-3" /> Badges for milestones (fastest review, most binders)
                      </li>
                      <li>Leaderboards for top performers</li>
                      <li>Progress bars and streak counters</li>
                      <li>Personalized workflow improvement recommendations</li>
                    </ul>
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
