'use client'

import Link from 'next/link'
import { useState } from 'react'
import useSWR from 'swr'
import {
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Layers,
  Hash,
  Crosshair,
  Wrench,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CloudOff,
  User,
  Tag,
  FolderGit2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ROADMAP as STATIC_ROADMAP, type Feature as StaticFeature, type Spike as StaticSpike } from './roadmap-data'
import type { RoadmapEpic, RoadmapFeature, RoadmapSpike } from '@/app/api/ado-query/route'

/* ── Data Fetcher ── */
const fetcher = (url: string) => fetch(url).then(r => r.json())

/* ── State color mapping ── */
function stateColor(state: string): { bg: string; text: string } {
  const s = state.toLowerCase()
  if (s === 'done' || s === 'closed' || s === 'completed' || s === 'resolved')
    return { bg: 'oklch(0.92 0.06 145)', text: 'oklch(0.35 0.14 145)' }
  if (s === 'active' || s === 'in progress' || s === 'committed')
    return { bg: 'oklch(0.92 0.06 240)', text: 'oklch(0.35 0.14 240)' }
  if (s === 'new' || s === 'proposed')
    return { bg: 'oklch(0.94 0.01 260)', text: 'oklch(0.5 0.01 260)' }
  if (s === 'removed' || s === 'cut')
    return { bg: 'oklch(0.94 0.04 25)', text: 'oklch(0.45 0.18 25)' }
  return { bg: 'oklch(0.94 0.01 260)', text: 'oklch(0.5 0.01 260)' }
}

/* ── Spike Row (Live ADO data) ── */
function LiveSpikeRow({ spike }: { spike: RoadmapSpike }) {
  const [open, setOpen] = useState(false)
  const sc = stateColor(spike.state)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="mt-0.5 shrink-0">
          {open ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="shrink-0 text-[0.625rem] font-mono px-1.5 py-0">
              {spike.id}
            </Badge>
            <span
              className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold"
              style={{ backgroundColor: sc.bg, color: sc.text }}
            >
              {spike.state}
            </span>
            <span className="text-sm font-medium text-foreground leading-snug">
              {spike.title}
            </span>
          </div>
          {/* Assigned To + Iteration */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {spike.assignedTo && (
              <span className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
                <User className="size-2.5" />
                {spike.assignedTo}
              </span>
            )}
            {spike.iterationPath && (
              <span className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
                <FolderGit2 className="size-2.5" />
                {spike.iterationPath}
              </span>
            )}
          </div>
        </div>
        {/* Link to ADO */}
        <a
          href={spike.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title="Open in Azure DevOps"
        >
          <ExternalLink className="size-3" />
        </a>
      </button>
      {open && (
        <div className="px-4 pb-3 pl-10">
          {spike.description ? (
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {spike.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">No description available.</p>
          )}
          {spike.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <Tag className="size-2.5 text-muted-foreground" />
              {spike.tags.map(t => (
                <Badge key={t} variant="outline" className="text-[0.5rem] px-1 py-0">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Spike Row (Static fallback) ── */
function StaticSpikeRow({ spike }: { spike: StaticSpike }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="mt-0.5 shrink-0">
          {open ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="shrink-0 text-[0.625rem] font-mono px-1.5 py-0">
              {spike.id}
            </Badge>
            <span className="text-sm font-medium text-foreground leading-snug">
              {spike.title}
            </span>
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pl-10">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {spike.description}
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Feature Card (Live ADO data) ── */
function LiveFeatureCard({ feature }: { feature: RoadmapFeature }) {
  const [expanded, setExpanded] = useState(false)
  const [showDescription, setShowDescription] = useState(false)

  const spikeCount = feature.spikes.length
  const categoryIcon = feature.category === 'wizard' ? <Crosshair className="size-3.5" /> : <Wrench className="size-3.5" />
  const categoryLabel = feature.category === 'wizard' ? 'Wizard-Specific' : 'Cross-Cutting'
  const sc = stateColor(feature.state)

  return (
    <Card className="border-l-4 overflow-hidden" style={{ borderLeftColor: feature.accentColor }}>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[0.625rem] gap-1 py-0">
                {categoryIcon}
                {categoryLabel}
              </Badge>
              <span className="text-[0.625rem] font-mono text-muted-foreground">
                ID: {feature.id}
              </span>
              <span
                className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold"
                style={{ backgroundColor: sc.bg, color: sc.text }}
              >
                {feature.state}
              </span>
              <a
                href={feature.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Open in Azure DevOps"
              >
                <ExternalLink className="size-3" />
              </a>
            </div>
            <h3 className="text-base font-semibold text-foreground leading-snug text-balance">
              {feature.title}
            </h3>
            {feature.assignedTo && (
              <div className="flex items-center gap-1 mt-1">
                <User className="size-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{feature.assignedTo}</span>
              </div>
            )}
          </div>
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5"
            style={{ backgroundColor: `color-mix(in oklch, ${feature.accentColor} 10%, transparent)` }}
          >
            <Hash className="size-3.5" style={{ color: feature.accentColor }} />
            <span className="text-sm font-bold" style={{ color: feature.accentColor }}>
              {spikeCount}
            </span>
            <span className="text-[0.625rem] text-muted-foreground">
              {spikeCount === 1 ? 'spike' : 'spikes'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {feature.tags.length > 0 && (
          <div className="flex items-center gap-1 mb-3 flex-wrap">
            <Tag className="size-3 text-muted-foreground" />
            {feature.tags.map(t => (
              <Badge key={t} variant="outline" className="text-[0.5625rem] px-1.5 py-0">
                {t}
              </Badge>
            ))}
          </div>
        )}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowDescription(p => !p)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
          >
            {showDescription ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {showDescription ? 'Hide description' : 'View description'}
          </button>
          {showDescription && (
            <div className="mt-2 rounded-md border border-border bg-muted/30 p-3">
              {feature.description ? (
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {feature.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">No description available.</p>
              )}
            </div>
          )}
        </div>
        {spikeCount > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded(p => !p)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Spikes ({spikeCount})
              </span>
              {expanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
            </button>
            {expanded && (
              <div className="mt-1 rounded-md border border-border overflow-hidden">
                {feature.spikes.map(spike => (
                  <LiveSpikeRow key={spike.id} spike={spike} />
                ))}
              </div>
            )}
          </div>
        )}
        {spikeCount === 0 && (
          <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground italic">No spikes defined yet -- tasks to be created.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Feature Card (Static fallback) ── */
function StaticFeatureCard({ feature }: { feature: StaticFeature }) {
  const [expanded, setExpanded] = useState(false)
  const [showDescription, setShowDescription] = useState(false)

  const spikeCount = feature.spikes.length
  const categoryIcon = feature.category === 'wizard' ? <Crosshair className="size-3.5" /> : <Wrench className="size-3.5" />
  const categoryLabel = feature.category === 'wizard' ? 'Wizard-Specific' : 'Cross-Cutting'

  return (
    <Card className="border-l-4 overflow-hidden" style={{ borderLeftColor: feature.accentColor }}>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[0.625rem] gap-1 py-0">
                {categoryIcon}
                {categoryLabel}
              </Badge>
              {feature.id && (
                <span className="text-[0.625rem] font-mono text-muted-foreground">ID: {feature.id}</span>
              )}
            </div>
            <h3 className="text-base font-semibold text-foreground leading-snug text-balance">{feature.title}</h3>
          </div>
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5"
            style={{ backgroundColor: `color-mix(in oklch, ${feature.accentColor} 10%, transparent)` }}
          >
            <Hash className="size-3.5" style={{ color: feature.accentColor }} />
            <span className="text-sm font-bold" style={{ color: feature.accentColor }}>{spikeCount}</span>
            <span className="text-[0.625rem] text-muted-foreground">{spikeCount === 1 ? 'spike' : 'spikes'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowDescription(p => !p)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
          >
            {showDescription ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {showDescription ? 'Hide description' : 'View description'}
          </button>
          {showDescription && (
            <div className="mt-2 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{feature.description}</p>
            </div>
          )}
        </div>
        {spikeCount > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded(p => !p)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Spikes ({spikeCount})</span>
              {expanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
            </button>
            {expanded && (
              <div className="mt-1 rounded-md border border-border overflow-hidden">
                {feature.spikes.map(spike => (
                  <StaticSpikeRow key={spike.id} spike={spike} />
                ))}
              </div>
            )}
          </div>
        )}
        {spikeCount === 0 && (
          <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground italic">No spikes defined yet -- tasks to be created.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Main Page ── */
export default function DeliveryRoadmapPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/ado-query', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  const isLive = !error && data?.epic
  const epic: RoadmapEpic | null = isLive ? data.epic : null

  /* Static fallback data */
  const staticWizardFeatures = STATIC_ROADMAP.features.filter(f => f.category === 'wizard')
  const staticCrossCuttingFeatures = STATIC_ROADMAP.features.filter(f => f.category === 'cross-cutting')

  /* Live data */
  const liveWizardFeatures = epic?.features.filter(f => f.category === 'wizard') ?? []
  const liveCrossCuttingFeatures = epic?.features.filter(f => f.category === 'cross-cutting') ?? []

  const totalFeatures = isLive ? epic!.features.length : STATIC_ROADMAP.features.length
  const totalSpikes = isLive
    ? epic!.features.reduce((sum, f) => sum + f.spikes.length, 0)
    : STATIC_ROADMAP.features.reduce((sum, f) => sum + f.spikes.length, 0)
  const wizardCount = isLive ? liveWizardFeatures.length : staticWizardFeatures.length

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="size-7 text-foreground" />
            <span className="text-lg font-bold text-foreground">1040SCAN</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/phase-1">
                <ArrowLeft className="size-3.5" />
                Back to Phase 1
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10">
          {/* Page header */}
          <div className="flex flex-col gap-1 mb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-foreground text-background">Delivery Roadmap</Badge>
              {/* Data source indicator */}
              {isLoading && (
                <Badge variant="outline" className="text-[0.5625rem] gap-1 py-0">
                  <Loader2 className="size-2.5 animate-spin" />
                  Connecting to ADO...
                </Badge>
              )}
              {isLive && (
                <Badge variant="outline" className="text-[0.5625rem] gap-1 py-0" style={{ borderColor: 'oklch(0.7 0.14 145)', color: 'oklch(0.35 0.14 145)' }}>
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: 'oklch(0.55 0.2 145)' }} />
                  Live from ADO
                </Badge>
              )}
              {error && (
                <Badge variant="outline" className="text-[0.5625rem] gap-1 py-0 border-amber-400 text-amber-700">
                  <CloudOff className="size-2.5" />
                  Offline -- showing cached data
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              Phase 1: Delivery Roadmap
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Epic, Feature & Spike tracking for Wizard Elimination
              </p>
              {!isLoading && (
                <button
                  type="button"
                  onClick={() => mutate()}
                  className="flex items-center gap-1 text-[0.625rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh data from Azure DevOps"
                >
                  <RefreshCw className="size-3" />
                  Refresh
                </button>
              )}
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Could not connect to Azure DevOps</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Showing static fallback data. The live query may be unavailable due to network or authentication issues.
                </p>
                <button
                  type="button"
                  onClick={() => mutate()}
                  className="text-xs font-medium text-amber-800 hover:underline mt-1"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Fetching work items from Azure DevOps...</p>
            </div>
          )}

          {/* Content -- either live or static */}
          {!isLoading && (
            <>
              {/* Epic card */}
              <Card className="mb-8 border-l-4 border-l-foreground">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Layers className="size-5 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0">
                          Epic: {isLive ? epic!.id : STATIC_ROADMAP.id}
                        </Badge>
                        {isLive && epic!.state && (
                          <span
                            className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold"
                            style={stateColor(epic!.state)}
                          >
                            {epic!.state}
                          </span>
                        )}
                        {!isLive && (
                          <Badge className="bg-foreground text-background text-[0.625rem]">Active</Badge>
                        )}
                        {isLive && (
                          <a
                            href={epic!.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Open Epic in Azure DevOps"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-foreground leading-snug text-balance">
                        {isLive ? epic!.title : STATIC_ROADMAP.title}
                      </h2>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {isLive ? epic!.description : STATIC_ROADMAP.description}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-3 text-center">
                      <p className="text-lg font-bold text-foreground">{totalFeatures}</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">Features</p>
                    </div>
                    <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-3 text-center">
                      <p className="text-lg font-bold text-foreground">{totalSpikes}</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">Spikes</p>
                    </div>
                    <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-3 text-center">
                      <p className="text-lg font-bold text-foreground">{wizardCount}</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">Wizards</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wizard-Specific Features */}
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Crosshair className="size-4 text-foreground" />
                  <h2 className="text-lg font-bold text-foreground">Wizard-Specific Features</h2>
                  <Badge variant="secondary" className="text-[0.625rem]">
                    {isLive ? liveWizardFeatures.length : staticWizardFeatures.length}
                  </Badge>
                </div>
                <div className="grid gap-4">
                  {isLive
                    ? liveWizardFeatures.map(f => <LiveFeatureCard key={f.id} feature={f} />)
                    : staticWizardFeatures.map(f => <StaticFeatureCard key={f.id} feature={f} />)
                  }
                </div>
              </div>

              {/* Cross-Cutting Features */}
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Wrench className="size-4 text-foreground" />
                  <h2 className="text-lg font-bold text-foreground">Cross-Cutting Features</h2>
                  <Badge variant="secondary" className="text-[0.625rem]">
                    {isLive ? liveCrossCuttingFeatures.length : staticCrossCuttingFeatures.length}
                  </Badge>
                </div>
                <div className="grid gap-4">
                  {isLive
                    ? liveCrossCuttingFeatures.map(f => <LiveFeatureCard key={f.id} feature={f} />)
                    : staticCrossCuttingFeatures.map(f => <StaticFeatureCard key={f.id} feature={f} />)
                  }
                </div>
              </div>

              {/* Footer note */}
              <p className="text-center text-xs text-muted-foreground/60">
                Delivery Roadmap -- {isLive ? 'Live data from Azure DevOps query.' : 'Showing static fallback data.'}
                {' '}Spike descriptions reflect current work item definitions.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
