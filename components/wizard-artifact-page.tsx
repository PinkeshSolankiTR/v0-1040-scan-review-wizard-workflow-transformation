'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Sparkles,
  ArrowLeft,
  Brain,
  BookOpen,
  RefreshCw,
  Monitor,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface WizardSection {
  title: string
  content: string[]
}

export interface WizardArtifactData {
  id: string
  title: string
  accentColor: string
  icon: React.ElementType
  prototypeRoute: string
  decisionSpec: {
    version: string
    sections: WizardSection[]
  }
  prompts: {
    mappingTable: WizardSection[]
    outputContract: WizardSection[]
    systemPrompt: string
    taskPrompt: string
  }
  feedbackLoop: {
    sections: WizardSection[]
  }
}

type TabId = 'decision-spec' | 'prompts' | 'feedback-loop'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'decision-spec', label: 'AI Decision Spec', icon: Brain },
  { id: 'prompts', label: 'LLM Prompts', icon: BookOpen },
  { id: 'feedback-loop', label: 'Feedback Loop', icon: RefreshCw },
]

function SectionBlock({ section }: { section: WizardSection }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
      {section.content.map((line, i) => (
        <p key={i} className="text-sm text-muted-foreground leading-relaxed">
          {line}
        </p>
      ))}
    </div>
  )
}

function PromptBlock({ label, prompt }: { label: string; prompt: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <pre className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap overflow-x-auto font-mono">
        {prompt}
      </pre>
    </div>
  )
}

export function WizardArtifactPage({ data }: { data: WizardArtifactData }) {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabId) || 'decision-spec'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  const Icon = data.icon

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
            <Link href="/phase-1">
              <ArrowLeft className="size-3.5" />
              Back to Phase 1
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li><ChevronRight className="size-3" /></li>
              <li>
                <Link href="/phase-1" className="hover:text-foreground transition-colors">
                  Phase 1
                </Link>
              </li>
              <li><ChevronRight className="size-3" /></li>
              <li className="text-foreground font-medium">{data.title}</li>
            </ol>
          </nav>

          {/* Wizard header */}
          <div className="flex items-start gap-4 mb-8">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `color-mix(in oklch, ${data.accentColor} 12%, transparent)` }}
            >
              <Icon className="size-6" style={{ color: data.accentColor }} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {data.title} Wizard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Documentation, specifications, and prototype for the {data.title} wizard.
              </p>
            </div>
            <Button variant="outline" asChild>
              <a
                href={data.prototypeRoute}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Monitor className="size-4" />
                View Prototype
                <ExternalLink className="size-3" />
              </a>
            </Button>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 border-b border-border mb-8" role="tablist">
            {TABS.map((tab) => {
              const TabIcon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-[var(--ai-accent)] text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <TabIcon className="size-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          {activeTab === 'decision-spec' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{data.decisionSpec.version}</Badge>
                <span className="text-xs text-muted-foreground">
                  Binding specification for AI decision-making
                </span>
              </div>
              {data.decisionSpec.sections.map((section, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {section.content.map((line, j) => (
                        <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="flex flex-col gap-6">
              {data.prompts.mappingTable.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Mapping Table</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.prompts.mappingTable.map((section, i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold text-foreground mb-2">{section.title}</h3>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/50">
                                <th className="px-4 py-2.5 text-left font-semibold text-foreground w-[220px]">Rule</th>
                                <th className="px-4 py-2.5 text-left font-semibold text-foreground">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.content.map((line, j) => {
                                const colonIndex = line.indexOf(':')
                                const rule = colonIndex !== -1 ? line.slice(0, colonIndex).trim() : line
                                const description = colonIndex !== -1 ? line.slice(colonIndex + 1).trim() : ''
                                return (
                                  <tr key={j} className={j < section.content.length - 1 ? 'border-b border-border' : ''}>
                                    <td className="px-4 py-2.5 text-muted-foreground font-medium align-top whitespace-nowrap">{rule}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground leading-relaxed">{description}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {data.prompts.outputContract.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Output Contract (JSON)</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-6">
                    {data.prompts.outputContract.map((section, i) => {
                      const fields: { name: string; type: string }[] = []
                      section.content.forEach((line) => {
                        // Split on "), " followed by a word char (start of next field name)
                        // This preserves commas inside parentheses like (string, e.g. "A9", "B4")
                        const parts = line.split(/\),\s*(?=[a-zA-Z])/)
                        parts.forEach((part, idx) => {
                          // Re-add the closing paren that was consumed by split, except for last part
                          const cleaned = idx < parts.length - 1 ? part.trim() + ')' : part.trim()
                          const match = cleaned.match(/^([^\s(]+)\s*\((.+)\)\.?$/)
                          if (match) {
                            fields.push({ name: match[1], type: match[2] })
                          } else if (cleaned) {
                            const dotCleaned = cleaned.replace(/\.$/, '')
                            fields.push({ name: dotCleaned, type: '' })
                          }
                        })
                      })
                      return (
                        <div key={i} className="flex flex-col gap-2">
                          <h3 className="text-sm font-semibold text-foreground mb-2">{section.title}</h3>
                          <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border bg-muted/50">
                                  <th className="px-4 py-2.5 text-left font-semibold text-foreground w-[280px]">Field</th>
                                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">Type / Values</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fields.map((field, j) => (
                                  <tr key={j} className={j < fields.length - 1 ? 'border-b border-border' : ''}>
                                    <td className="px-4 py-2.5 text-muted-foreground font-medium font-mono text-xs align-top">{field.name}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground leading-relaxed">{field.type}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">System Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                  <PromptBlock label="" prompt={data.prompts.systemPrompt} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Task Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                  <PromptBlock label="" prompt={data.prompts.taskPrompt} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'feedback-loop' && (
            <div className="flex flex-col gap-6">
              {data.feedbackLoop.sections.map((section, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {section.content.map((line, j) => (
                        <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
