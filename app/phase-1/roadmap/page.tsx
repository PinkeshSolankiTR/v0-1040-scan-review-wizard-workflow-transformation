'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
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
  MapPin,
  Search,
  LayoutList,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ROADMAP as STATIC_ROADMAP, type Feature as StaticFeature, type Spike as StaticSpike } from './roadmap-data'
import type { RoadmapEpic, RoadmapFeature, RoadmapSpike } from '@/app/api/ado-query/route'

/* ── Data Fetcher ── */
const fetcher = (url: string) => fetch(url).then(r => r.json())

/* ── State color + style ── */
function stateStyle(state: string): React.CSSProperties {
  const s = state.toLowerCase()
  if (s === 'done' || s === 'closed' || s === 'completed' || s === 'resolved')
    return { backgroundColor: 'oklch(0.92 0.06 145)', color: 'oklch(0.3 0.14 145)' }
  if (s === 'active' || s === 'in progress' || s === 'committed')
    return { backgroundColor: 'oklch(0.92 0.06 240)', color: 'oklch(0.3 0.14 240)' }
  if (s === 'new' || s === 'proposed')
    return { backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.45 0.01 260)' }
  if (s === 'removed' || s === 'cut')
    return { backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.4 0.18 25)' }
  return { backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.45 0.01 260)' }
}

/* Work item type badge color */
function typeStyle(wit: string): React.CSSProperties {
  const w = wit.toLowerCase()
  if (w === 'epic') return { backgroundColor: 'oklch(0.92 0.06 290)', color: 'oklch(0.35 0.18 290)' }
  if (w === 'feature') return { backgroundColor: 'oklch(0.92 0.06 240)', color: 'oklch(0.35 0.14 240)' }
  if (w === 'spike' || w === 'task' || w === 'user story' || w === 'product backlog item')
    return { backgroundColor: 'oklch(0.93 0.04 60)', color: 'oklch(0.4 0.14 60)' }
  if (w === 'bug') return { backgroundColor: 'oklch(0.93 0.06 25)', color: 'oklch(0.4 0.18 25)' }
  return { backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.45 0.01 260)' }
}

/* ── Live Spike Row (table-style) ── */
function LiveWorkItemRow({ item, depth = 0 }: { item: RoadmapSpike; depth?: number }) {
  const [open, setOpen] = useState(false)
  const indent = depth * 1.25

  return (
    <>
      <tr
        className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer group"
        onClick={() => setOpen(p => !p)}
      >
        {/* Expand + ID */}
        <td className="px-3 py-2.5 whitespace-nowrap" style={{ paddingLeft: `${0.75 + indent}rem` }}>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">
              {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </span>
            <span className="text-[0.6875rem] font-mono text-muted-foreground">{item.id}</span>
          </div>
        </td>
        {/* Type */}
        <td className="px-3 py-2.5 whitespace-nowrap">
          <span
            className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold"
            style={typeStyle(item.workItemType)}
          >
            {item.workItemType}
          </span>
        </td>
        {/* Title */}
        <td className="px-3 py-2.5">
          <span className="text-sm font-medium text-foreground leading-snug">{item.title}</span>
        </td>
        {/* State */}
        <td className="px-3 py-2.5 whitespace-nowrap">
          <span
            className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold"
            style={stateStyle(item.state)}
          >
            {item.state || 'N/A'}
          </span>
        </td>
        {/* Assigned To */}
        <td className="px-3 py-2.5 whitespace-nowrap">
          {item.assignedTo ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="size-3 shrink-0" />
              <span className="truncate max-w-[10rem]">{item.assignedTo}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">Unassigned</span>
          )}
        </td>
        {/* Iteration */}
        <td className="px-3 py-2.5 whitespace-nowrap">
          {item.iterationPath ? (
            <span className="text-[0.6875rem] text-muted-foreground truncate block max-w-[12rem]" title={item.iterationPath}>
              {item.iterationPath.split('\\').pop()}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">--</span>
          )}
        </td>
        {/* Link */}
        <td className="px-3 py-2.5 text-center">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Open in Azure DevOps"
          >
            <ExternalLink className="size-3" />
          </a>
        </td>
      </tr>
      {/* Expanded detail row */}
      {open && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-3 py-3" style={{ paddingLeft: `${1.75 + indent}rem` }}>
            <div className="flex flex-col gap-2">
              {item.description ? (
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line max-w-prose">
                  {item.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">No description available.</p>
              )}
              <div className="flex items-center gap-4 flex-wrap text-[0.625rem] text-muted-foreground">
                {item.areaPath && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-2.5" />
                    Area: {item.areaPath}
                  </span>
                )}
                {item.iterationPath && (
                  <span className="flex items-center gap-1">
                    <FolderGit2 className="size-2.5" />
                    Iteration: {item.iterationPath}
                  </span>
                )}
              </div>
              {item.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="size-2.5 text-muted-foreground" />
                  {item.tags.map(t => (
                    <Badge key={t} variant="outline" className="text-[0.5rem] px-1 py-0">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ── Live Feature Section (table + expandable children) ── */
function LiveFeatureSection({ feature }: { feature: RoadmapFeature }) {
  const [expanded, setExpanded] = useState(true)
  const sc = stateStyle(feature.state)
  const doneCount = feature.spikes.filter(s => ['done', 'closed', 'completed', 'resolved'].includes(s.state.toLowerCase())).length
  const progressPct = feature.spikes.length > 0 ? Math.round((doneCount / feature.spikes.length) * 100) : 0

  return (
    <div className="mb-6">
      {/* Feature header bar */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="flex w-full items-center gap-3 px-4 py-3 rounded-t-lg border border-border transition-colors hover:bg-muted/40"
        style={{
          borderLeft: `0.25rem solid ${feature.accentColor}`,
          backgroundColor: expanded ? 'var(--muted)' : undefined,
        }}
      >
        {expanded ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}

        {/* Feature ID + Type */}
        <span className="text-[0.6875rem] font-mono text-muted-foreground shrink-0">#{feature.id}</span>
        <span
          className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold shrink-0"
          style={typeStyle('feature')}
        >
          Feature
        </span>

        {/* Title */}
        <span className="text-sm font-semibold text-foreground leading-snug text-left flex-1 min-w-0 truncate">
          {feature.title}
        </span>

        {/* State */}
        <span
          className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold shrink-0"
          style={sc}
        >
          {feature.state || 'N/A'}
        </span>

        {/* Assigned */}
        {feature.assignedTo && (
          <span className="flex items-center gap-1 text-[0.625rem] text-muted-foreground shrink-0">
            <User className="size-3" />
            {feature.assignedTo}
          </span>
        )}

        {/* Child count + progress */}
        <span className="flex items-center gap-1 shrink-0">
          <LayoutList className="size-3 text-muted-foreground" />
          <span className="text-[0.6875rem] font-semibold text-muted-foreground">
            {feature.spikes.length}
          </span>
        </span>

        {/* Progress bar */}
        <div className="flex items-center gap-1.5 shrink-0" style={{ inlineSize: '4.5rem' }}>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'oklch(0.92 0.01 260)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                inlineSize: `${progressPct}%`,
                backgroundColor: progressPct === 100 ? 'oklch(0.55 0.18 145)' : feature.accentColor,
              }}
            />
          </div>
          <span className="text-[0.5625rem] font-mono text-muted-foreground">{progressPct}%</span>
        </div>

        {/* ADO link */}
        <a
          href={feature.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Open Feature in Azure DevOps"
        >
          <ExternalLink className="size-3" />
        </a>
      </button>

      {/* Expanded: Feature description + children table */}
      {expanded && (
        <div className="border border-t-0 border-border rounded-b-lg overflow-hidden">
          {/* Feature metadata */}
          {(feature.description || feature.tags.length > 0) && (
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              {feature.description && (
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line max-w-prose mb-2">
                  {feature.description}
                </p>
              )}
              {feature.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="size-2.5 text-muted-foreground" />
                  {feature.tags.map(t => (
                    <Badge key={t} variant="outline" className="text-[0.5625rem] px-1.5 py-0">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Children table */}
          {feature.spikes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider" style={{ minWidth: '7rem' }}>ID</th>
                    <th className="px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider" style={{ minWidth: '5rem' }}>Type</th>
                    <th className="px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                    <th className="px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider" style={{ minWidth: '5rem' }}>State</th>
                    <th className="px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider" style={{ minWidth: '8rem' }}>Assigned To</th>
                    <th className="px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider" style={{ minWidth: '7rem' }}>Iteration</th>
                    <th className="px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider text-center" style={{ minWidth: '2rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {feature.spikes.map(spike => (
                    <LiveWorkItemRow key={spike.id} item={spike} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground/60 italic">No child work items.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Static components (unchanged) ── */
function StaticSpikeRow({ spike }: { spike: StaticSpike }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-b-0">
      <button type="button" onClick={() => setOpen(p => !p)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors">
        <div className="mt-0.5 shrink-0">
          {open ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="shrink-0 text-[0.625rem] font-mono px-1.5 py-0">{spike.id}</Badge>
            <span className="text-sm font-medium text-foreground leading-snug">{spike.title}</span>
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pl-10">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{spike.description}</p>
        </div>
      )}
    </div>
  )
}

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
              <Badge variant="secondary" className="text-[0.625rem] gap-1 py-0">{categoryIcon}{categoryLabel}</Badge>
              {feature.id && <span className="text-[0.625rem] font-mono text-muted-foreground">ID: {feature.id}</span>}
            </div>
            <h3 className="text-base font-semibold text-foreground leading-snug text-balance">{feature.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5" style={{ backgroundColor: `color-mix(in oklch, ${feature.accentColor} 10%, transparent)` }}>
            <Hash className="size-3.5" style={{ color: feature.accentColor }} />
            <span className="text-sm font-bold" style={{ color: feature.accentColor }}>{spikeCount}</span>
            <span className="text-[0.625rem] text-muted-foreground">{spikeCount === 1 ? 'spike' : 'spikes'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="mb-3">
          <button type="button" onClick={() => setShowDescription(p => !p)} className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1">
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
            <button type="button" onClick={() => setExpanded(p => !p)} className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-left hover:bg-muted/50 transition-colors">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Spikes ({spikeCount})</span>
              {expanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
            </button>
            {expanded && (
              <div className="mt-1 rounded-md border border-border overflow-hidden">
                {feature.spikes.map(spike => <StaticSpikeRow key={spike.id} spike={spike} />)}
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

/* ── Sub-tab type ── */
type RoadmapTab = 'ado' | 'static'
type StateFilter = 'all' | 'active' | 'done' | 'new'

/* ── Main Page ── */
export default function DeliveryRoadmapPage() {
  const [activeTab, setActiveTab] = useState<RoadmapTab>('ado')
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<StateFilter>('all')

  const { data, error, isLoading, mutate } = useSWR('/api/ado-query', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  const isLive = !error && data?.epic
  const epic: RoadmapEpic | null = isLive ? data.epic : null

  /* Static data */
  const staticWizardFeatures = STATIC_ROADMAP.features.filter(f => f.category === 'wizard')
  const staticCrossCuttingFeatures = STATIC_ROADMAP.features.filter(f => f.category === 'cross-cutting')

  /* Filtered live features */
  const filteredFeatures = useMemo(() => {
    if (!epic) return []
    let features = epic.features

    // State filter
    if (stateFilter !== 'all') {
      features = features.filter(f => {
        const s = f.state.toLowerCase()
        if (stateFilter === 'done') return ['done', 'closed', 'completed', 'resolved'].includes(s)
        if (stateFilter === 'active') return ['active', 'in progress', 'committed'].includes(s)
        if (stateFilter === 'new') return ['new', 'proposed'].includes(s)
        return true
      })
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      features = features.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.id.includes(q) ||
        f.assignedTo.toLowerCase().includes(q) ||
        f.spikes.some(s =>
          s.title.toLowerCase().includes(q) ||
          s.id.includes(q) ||
          s.assignedTo.toLowerCase().includes(q)
        )
      )
    }

    return features
  }, [epic, stateFilter, searchQuery])

  /* Summary stats */
  const totalSpikes = epic?.features.reduce((sum, f) => sum + f.spikes.length, 0) ?? 0
  const doneSpikes = epic?.features.reduce((sum, f) =>
    sum + f.spikes.filter(s => ['done', 'closed', 'completed', 'resolved'].includes(s.state.toLowerCase())).length, 0) ?? 0
  const activeSpikes = epic?.features.reduce((sum, f) =>
    sum + f.spikes.filter(s => ['active', 'in progress', 'committed'].includes(s.state.toLowerCase())).length, 0) ?? 0

  const tabs: { id: RoadmapTab; label: string; sublabel: string }[] = [
    { id: 'ado', label: 'Azure DevOps (Live)', sublabel: 'Real-time from ADO query' },
    { id: 'static', label: 'Static Roadmap', sublabel: 'Original CSV-based data' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="size-7 text-foreground" />
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
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* Page header */}
          <div className="flex flex-col gap-1 mb-6">
            <Badge className="bg-foreground text-background w-fit">Delivery Roadmap</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              Phase 1: Delivery Roadmap
            </h1>
            <p className="text-sm text-muted-foreground">
              Epic, Feature & Spike tracking for Wizard Elimination
            </p>
          </div>

          {/* Sub-tabs */}
          <nav className="flex items-stretch gap-0 mb-8 border-b border-border" role="tablist" aria-label="Roadmap data source">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex flex-col gap-0.5 px-5 py-3 text-left transition-colors"
                  style={{ color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                >
                  <span className="text-sm font-semibold leading-tight">{tab.label}</span>
                  <span className="text-[0.625rem] leading-tight opacity-70">{tab.sublabel}</span>
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full" style={{ backgroundColor: 'var(--foreground)' }} />
                  )}
                </button>
              )
            })}
          </nav>

          {/* ── TAB: Azure DevOps (Live) ── */}
          {activeTab === 'ado' && (
            <div>
              {/* Status bar */}
              <div className="flex items-center gap-2 mb-4">
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
                    Connection failed
                  </Badge>
                )}
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

              {/* Error banner */}
              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Could not connect to Azure DevOps</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Check your network connection and PAT validity. You can view the static roadmap data in the other tab.
                    </p>
                    <button type="button" onClick={() => mutate()} className="text-xs font-medium text-amber-800 hover:underline mt-1">Try again</button>
                  </div>
                </div>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Fetching work items from Azure DevOps...</p>
                </div>
              )}

              {/* Live content */}
              {!isLoading && isLive && epic && (
                <>
                  {/* Epic summary card -- horizontal dashboard strip */}
                  <div className="mb-6 rounded-lg border border-border overflow-hidden">
                    <div className="flex items-stretch">
                      {/* Epic info */}
                      <div className="flex-1 px-5 py-4 border-r border-border">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold"
                            style={typeStyle('epic')}
                          >
                            Epic
                          </span>
                          <span className="text-[0.6875rem] font-mono text-muted-foreground">#{epic.id}</span>
                          <span
                            className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold"
                            style={stateStyle(epic.state)}
                          >
                            {epic.state}
                          </span>
                          <a
                            href={epic.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Open Epic in Azure DevOps"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                        <h2 className="text-base font-bold text-foreground leading-snug text-balance">
                          {epic.title}
                        </h2>
                        {epic.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                            {epic.description}
                          </p>
                        )}
                      </div>

                      {/* Stats strip */}
                      <div className="flex items-center gap-0 shrink-0">
                        <div className="flex flex-col items-center justify-center px-5 py-4 border-r border-border" style={{ minWidth: '5rem' }}>
                          <p className="text-xl font-bold text-foreground">{epic.features.length}</p>
                          <p className="text-[0.625rem] text-muted-foreground">Features</p>
                        </div>
                        <div className="flex flex-col items-center justify-center px-5 py-4 border-r border-border" style={{ minWidth: '5rem' }}>
                          <p className="text-xl font-bold text-foreground">{totalSpikes}</p>
                          <p className="text-[0.625rem] text-muted-foreground">Work Items</p>
                        </div>
                        <div className="flex flex-col items-center justify-center px-5 py-4 border-r border-border" style={{ minWidth: '5rem' }}>
                          <p className="text-xl font-bold" style={{ color: 'oklch(0.45 0.18 145)' }}>{doneSpikes}</p>
                          <p className="text-[0.625rem] text-muted-foreground">Done</p>
                        </div>
                        <div className="flex flex-col items-center justify-center px-5 py-4" style={{ minWidth: '5rem' }}>
                          <p className="text-xl font-bold" style={{ color: 'oklch(0.45 0.14 240)' }}>{activeSpikes}</p>
                          <p className="text-[0.625rem] text-muted-foreground">Active</p>
                        </div>
                      </div>
                    </div>

                    {/* Overall progress bar */}
                    {totalSpikes > 0 && (
                      <div className="px-5 py-2 border-t border-border bg-muted/30 flex items-center gap-3">
                        <span className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">Progress</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'oklch(0.92 0.01 260)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              inlineSize: `${Math.round((doneSpikes / totalSpikes) * 100)}%`,
                              backgroundColor: 'oklch(0.5 0.18 145)',
                            }}
                          />
                        </div>
                        <span className="text-[0.6875rem] font-mono text-muted-foreground">
                          {Math.round((doneSpikes / totalSpikes) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Toolbar: search + filter */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search features, work items, assignees..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 pl-8 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Filter className="size-3.5 text-muted-foreground" />
                      {(['all', 'active', 'done', 'new'] as const).map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setStateFilter(f)}
                          className="rounded-md border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors"
                          style={{
                            borderColor: stateFilter === f ? 'var(--foreground)' : 'var(--border)',
                            backgroundColor: stateFilter === f ? 'var(--foreground)' : 'transparent',
                            color: stateFilter === f ? 'var(--background)' : 'var(--muted-foreground)',
                          }}
                        >
                          {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                    <span className="text-[0.625rem] text-muted-foreground ml-auto">
                      Showing {filteredFeatures.length} of {epic.features.length} features
                    </span>
                  </div>

                  {/* Feature sections */}
                  {filteredFeatures.length > 0 ? (
                    filteredFeatures.map(f => <LiveFeatureSection key={f.id} feature={f} />)
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Search className="size-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No features match your filters.</p>
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setStateFilter('all') }}
                        className="text-xs font-medium text-foreground hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}

                  <p className="text-center text-xs text-muted-foreground/50 mt-8">
                    Live data from Azure DevOps query #{QUERY_ID.slice(0, 8)}... -- all fields rendered directly from ADO work items.
                  </p>
                </>
              )}

              {/* Fallback when ADO failed */}
              {!isLoading && !isLive && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                  <CloudOff className="size-10 text-muted-foreground/40" />
                  <div>
                    <p className="text-sm font-medium text-foreground">No live data available</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Switch to the <strong>Static Roadmap</strong> tab to view the original CSV-based delivery roadmap.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => mutate()}>
                    <RefreshCw className="size-3.5" />
                    Retry ADO Connection
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Static Roadmap (CSV) ── */}
          {activeTab === 'static' && (
            <div>
              <Card className="mb-8 border-l-4 border-l-foreground">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Layers className="size-5 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0">Epic: {STATIC_ROADMAP.id}</Badge>
                        <Badge className="bg-foreground text-background text-[0.625rem]">Active</Badge>
                      </div>
                      <h2 className="text-lg font-bold text-foreground leading-snug text-balance">{STATIC_ROADMAP.title}</h2>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{STATIC_ROADMAP.description}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-3 text-center">
                      <p className="text-lg font-bold text-foreground">{STATIC_ROADMAP.features.length}</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">Features</p>
                    </div>
                    <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-3 text-center">
                      <p className="text-lg font-bold text-foreground">{STATIC_ROADMAP.features.reduce((sum, f) => sum + f.spikes.length, 0)}</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">Spikes</p>
                    </div>
                    <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-3 text-center">
                      <p className="text-lg font-bold text-foreground">{staticWizardFeatures.length}</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">Wizards</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Crosshair className="size-4 text-foreground" />
                  <h2 className="text-lg font-bold text-foreground">Wizard-Specific Features</h2>
                  <Badge variant="secondary" className="text-[0.625rem]">{staticWizardFeatures.length}</Badge>
                </div>
                <div className="grid gap-4">
                  {staticWizardFeatures.map(f => <StaticFeatureCard key={f.id} feature={f} />)}
                </div>
              </div>
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Wrench className="size-4 text-foreground" />
                  <h2 className="text-lg font-bold text-foreground">Cross-Cutting Features</h2>
                  <Badge variant="secondary" className="text-[0.625rem]">{staticCrossCuttingFeatures.length}</Badge>
                </div>
                <div className="grid gap-4">
                  {staticCrossCuttingFeatures.map(f => <StaticFeatureCard key={f.id} feature={f} />)}
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground/60">
                Static roadmap data from original CSV import. This data is not updated in real-time.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

const QUERY_ID = '2788c428-8768-429b-8b28-4bcfa0bb26cc'
