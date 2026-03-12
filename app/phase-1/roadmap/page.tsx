'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
  Sparkles, ArrowLeft, ChevronDown, ChevronRight, Layers, Hash,
  Crosshair, Wrench, ExternalLink, RefreshCw, Loader2, AlertTriangle,
  CloudOff, User, Tag, FolderGit2, MapPin, Search, Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ROADMAP as STATIC_ROADMAP, type Feature as StaticFeature, type Spike as StaticSpike } from './roadmap-data'
import type { AdoWorkItemFlat, AdoQueryResponse } from '@/app/api/ado-query/route'

/* ── Fetcher ── */
const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

/* ── State styling ── */
function stateStyle(state: string): React.CSSProperties {
  const s = state.toLowerCase()
  if (['done', 'closed', 'completed', 'resolved'].includes(s))
    return { backgroundColor: 'oklch(0.92 0.06 145)', color: 'oklch(0.3 0.14 145)' }
  if (['active', 'in progress', 'committed'].includes(s))
    return { backgroundColor: 'oklch(0.92 0.06 240)', color: 'oklch(0.3 0.14 240)' }
  if (['new', 'proposed'].includes(s))
    return { backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.45 0.01 260)' }
  if (['removed', 'cut'].includes(s))
    return { backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.4 0.18 25)' }
  return { backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.45 0.01 260)' }
}

function isDone(s: string) { return ['done', 'closed', 'completed', 'resolved'].includes(s.toLowerCase()) }
function isActive(s: string) { return ['active', 'in progress', 'committed'].includes(s.toLowerCase()) }

/* ── Work Item Type styling ── */
function typeStyle(wit: string): React.CSSProperties {
  const w = wit.toLowerCase()
  if (w === 'epic') return { backgroundColor: 'oklch(0.92 0.06 290)', color: 'oklch(0.35 0.18 290)' }
  if (w === 'feature') return { backgroundColor: 'oklch(0.92 0.06 240)', color: 'oklch(0.35 0.14 240)' }
  if (['spike', 'task', 'user story', 'product backlog item'].includes(w))
    return { backgroundColor: 'oklch(0.93 0.04 60)', color: 'oklch(0.4 0.14 60)' }
  if (w === 'bug') return { backgroundColor: 'oklch(0.93 0.06 25)', color: 'oklch(0.4 0.18 25)' }
  return { backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.45 0.01 260)' }
}

/* ── Accent colors for epics ── */
const ACCENT_COLORS = [
  'oklch(0.55 0.18 290)', 'oklch(0.55 0.15 250)', 'oklch(0.55 0.17 200)',
  'oklch(0.55 0.17 145)', 'oklch(0.55 0.17 165)', 'oklch(0.6 0.15 60)',
  'oklch(0.55 0.15 330)', 'oklch(0.55 0.17 110)', 'oklch(0.55 0.15 20)',
  'oklch(0.5 0.14 280)', 'oklch(0.5 0.14 220)', 'oklch(0.5 0.14 170)',
  'oklch(0.5 0.14 50)',
]

/* ──────────────────────────────────────────────
   LIVE: Work item tree node (recursive)
   ────────────────────────────────────────────── */
function WorkItemNode({
  item,
  allItems,
  depth = 0,
}: {
  item: AdoWorkItemFlat
  allItems: Map<number, AdoWorkItemFlat>
  depth?: number
}) {
  const [open, setOpen] = useState(depth < 2)
  const children = item.childIds.map(id => allItems.get(id)).filter(Boolean) as AdoWorkItemFlat[]
  const hasChildren = children.length > 0

  const doneChildren = children.filter(c => isDone(c.state)).length
  const progressPct = children.length > 0 ? Math.round((doneChildren / children.length) * 100) : null

  const depthColors = [
    'oklch(0.97 0.005 260)', // depth 0 - lightest
    'oklch(0.98 0.003 260)', // depth 1
    'oklch(1 0 0)',           // depth 2+
  ]
  const bgColor = depthColors[Math.min(depth, depthColors.length - 1)]

  return (
    <div
      style={{
        borderLeft: depth > 0 ? '0.125rem solid oklch(0.9 0.01 260)' : 'none',
        marginLeft: depth > 0 ? '0.75rem' : '0',
      }}
    >
      {/* Work item row */}
      <div
        className="group flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40 cursor-pointer"
        style={{ backgroundColor: bgColor }}
        onClick={() => setOpen(p => !p)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(p => !p) } }}
      >
        {/* Expand toggle */}
        <span className="shrink-0 mt-0.5 text-muted-foreground" style={{ width: '0.875rem' }}>
          {hasChildren ? (
            open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />
          ) : (
            <span className="block size-1.5 rounded-full bg-border mx-auto mt-1" />
          )}
        </span>

        {/* Type badge */}
        <span
          className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold shrink-0 mt-0.5"
          style={typeStyle(item.workItemType)}
        >
          {item.workItemType}
        </span>

        {/* ID */}
        <span className="text-[0.6875rem] font-mono text-muted-foreground shrink-0 mt-px">{item.id}</span>

        {/* Title */}
        <span className="text-sm font-medium text-foreground leading-snug flex-1 min-w-0">{item.title}</span>

        {/* State */}
        <span
          className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold shrink-0"
          style={stateStyle(item.state)}
        >
          {item.state || 'N/A'}
        </span>

        {/* Assigned To */}
        {item.assignedTo ? (
          <span className="flex items-center gap-1 text-[0.625rem] text-muted-foreground shrink-0 max-w-[9rem] truncate" title={item.assignedTo}>
            <User className="size-3 shrink-0" />
            {item.assignedTo.split(' ').slice(0, 2).join(' ')}
          </span>
        ) : (
          <span className="text-[0.625rem] text-muted-foreground/30 shrink-0" style={{ minWidth: '5rem' }}>Unassigned</span>
        )}

        {/* Iteration (last segment) */}
        <span className="text-[0.625rem] text-muted-foreground shrink-0 max-w-[8rem] truncate" title={item.iterationPath}>
          {item.iterationPath ? item.iterationPath.split('\\').pop() : '--'}
        </span>

        {/* Progress if has children */}
        {progressPct !== null && (
          <div className="flex items-center gap-1 shrink-0" style={{ width: '4rem' }}>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'oklch(0.92 0.01 260)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: progressPct === 100 ? 'oklch(0.5 0.18 145)' : 'oklch(0.5 0.14 240)',
                }}
              />
            </div>
            <span className="text-[0.5rem] font-mono text-muted-foreground">{progressPct}%</span>
          </div>
        )}

        {/* ADO link */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-muted-foreground/40 hover:text-foreground transition-colors shrink-0"
          title="Open in Azure DevOps"
        >
          <ExternalLink className="size-3" />
        </a>
      </div>

      {/* Expanded detail row */}
      {open && !hasChildren && (item.description || item.tags.length > 0 || item.areaPath) && (
        <div className="px-4 py-2.5 border-t border-border/40" style={{ marginLeft: '2rem', backgroundColor: 'oklch(0.98 0.003 260)' }}>
          {item.description && (
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line max-w-prose mb-1.5">
              {item.description.length > 400 ? item.description.slice(0, 400) + '...' : item.description}
            </p>
          )}
          <div className="flex items-center gap-4 flex-wrap text-[0.5625rem] text-muted-foreground/70">
            {item.areaPath && (
              <span className="flex items-center gap-1"><MapPin className="size-2.5" />{item.areaPath}</span>
            )}
            {item.iterationPath && (
              <span className="flex items-center gap-1"><FolderGit2 className="size-2.5" />{item.iterationPath}</span>
            )}
            {item.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="size-2.5" />
                {item.tags.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Children */}
      {open && hasChildren && (
        <div className="border-t border-border/30">
          {children.map(child => (
            <WorkItemNode key={child.id} item={child} allItems={allItems} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────
   LIVE: Epic accordion section
   ────────────────────────────────────────────── */
function EpicSection({
  epic,
  allItems,
  accentColor,
}: {
  epic: AdoWorkItemFlat
  allItems: Map<number, AdoWorkItemFlat>
  accentColor: string
}) {
  const [expanded, setExpanded] = useState(true)
  const children = epic.childIds.map(id => allItems.get(id)).filter(Boolean) as AdoWorkItemFlat[]

  // Count all descendants recursively
  const countDescendants = (item: AdoWorkItemFlat): { total: number; done: number; active: number } => {
    let total = 0, done = 0, active = 0
    for (const cid of item.childIds) {
      const child = allItems.get(cid)
      if (!child) continue
      total++
      if (isDone(child.state)) done++
      if (isActive(child.state)) active++
      const sub = countDescendants(child)
      total += sub.total
      done += sub.done
      active += sub.active
    }
    return { total, done, active }
  }
  const stats = countDescendants(epic)
  const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="mb-4 rounded-lg border border-border overflow-hidden">
      {/* Epic header */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
        style={{
          borderLeft: `0.25rem solid ${accentColor}`,
          backgroundColor: expanded ? 'oklch(0.97 0.005 260)' : undefined,
        }}
      >
        {expanded
          ? <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        }

        <span
          className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold shrink-0"
          style={typeStyle(epic.workItemType)}
        >
          {epic.workItemType}
        </span>
        <span className="text-[0.6875rem] font-mono text-muted-foreground shrink-0">{epic.id}</span>

        <span className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0 truncate">
          {epic.title}
        </span>

        <span
          className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5625rem] font-semibold shrink-0"
          style={stateStyle(epic.state)}
        >
          {epic.state}
        </span>

        {epic.assignedTo && (
          <span className="flex items-center gap-1 text-[0.625rem] text-muted-foreground shrink-0">
            <User className="size-3" />
            {epic.assignedTo.split(' ').slice(0, 2).join(' ')}
          </span>
        )}

        {/* Stats: children count */}
        <span className="text-[0.625rem] text-muted-foreground shrink-0">
          {children.length} children / {stats.total} total
        </span>

        {/* Progress bar */}
        <div className="flex items-center gap-1 shrink-0" style={{ width: '5rem' }}>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'oklch(0.92 0.01 260)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${progressPct}%`,
                backgroundColor: progressPct === 100 ? 'oklch(0.5 0.18 145)' : accentColor,
              }}
            />
          </div>
          <span className="text-[0.5625rem] font-mono text-muted-foreground">{progressPct}%</span>
        </div>

        <a
          href={epic.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Open in Azure DevOps"
        >
          <ExternalLink className="size-3" />
        </a>
      </button>

      {/* Expanded content */}
      {expanded && (
        <>
          {/* Epic metadata */}
          {(epic.description || epic.tags.length > 0) && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/20">
              {epic.description && (
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line max-w-prose mb-1.5">
                  {epic.description.length > 500 ? epic.description.slice(0, 500) + '...' : epic.description}
                </p>
              )}
              <div className="flex items-center gap-3 flex-wrap text-[0.5625rem] text-muted-foreground/70">
                {epic.iterationPath && (
                  <span className="flex items-center gap-1"><FolderGit2 className="size-2.5" />{epic.iterationPath}</span>
                )}
                {epic.areaPath && (
                  <span className="flex items-center gap-1"><MapPin className="size-2.5" />{epic.areaPath}</span>
                )}
                {epic.tags.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Tag className="size-2.5" />
                    {epic.tags.join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick stats row */}
          <div className="flex items-center gap-0 border-t border-border bg-muted/30 text-center divide-x divide-border">
            <div className="flex-1 px-3 py-2">
              <p className="text-base font-bold text-foreground">{children.length}</p>
              <p className="text-[0.5625rem] text-muted-foreground">Direct Children</p>
            </div>
            <div className="flex-1 px-3 py-2">
              <p className="text-base font-bold text-foreground">{stats.total}</p>
              <p className="text-[0.5625rem] text-muted-foreground">Total Items</p>
            </div>
            <div className="flex-1 px-3 py-2">
              <p className="text-base font-bold" style={{ color: 'oklch(0.4 0.16 145)' }}>{stats.done}</p>
              <p className="text-[0.5625rem] text-muted-foreground">Done</p>
            </div>
            <div className="flex-1 px-3 py-2">
              <p className="text-base font-bold" style={{ color: 'oklch(0.4 0.14 240)' }}>{stats.active}</p>
              <p className="text-[0.5625rem] text-muted-foreground">Active</p>
            </div>
          </div>

          {/* Children tree */}
          <div className="border-t border-border">
            {children.length > 0 ? (
              children.map(child => (
                <WorkItemNode key={child.id} item={child} allItems={allItems} depth={0} />
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-muted-foreground/50 italic">No child work items.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────
   STATIC: components (unchanged from before)
   ────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────── */
type RoadmapTab = 'ado' | 'static'
type StateFilter = 'all' | 'active' | 'done' | 'new'

export default function DeliveryRoadmapPage() {
  const [activeTab, setActiveTab] = useState<RoadmapTab>('ado')
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<StateFilter>('all')

  const { data, error, isLoading, mutate } = useSWR<AdoQueryResponse>('/api/ado-query', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  const isLive = !error && !!data?.items

  /* Build lookup map + identify root items (epics / top-level) */
  const { allItems, rootItems, stats } = useMemo(() => {
    const allMap = new Map<number, AdoWorkItemFlat>()
    if (!data?.items) return { allItems: allMap, rootItems: [] as AdoWorkItemFlat[], stats: { total: 0, done: 0, active: 0, epics: 0, types: new Map<string, number>() } }

    for (const item of data.items) allMap.set(item.id, item)

    // Root items = those without a parent (or parent not in the dataset)
    const roots = data.items.filter(i => i.parentId === null || !allMap.has(i.parentId))

    // Global stats
    let total = data.items.length
    let done = 0
    let active = 0
    const types = new Map<string, number>()
    for (const item of data.items) {
      if (isDone(item.state)) done++
      if (isActive(item.state)) active++
      types.set(item.workItemType, (types.get(item.workItemType) ?? 0) + 1)
    }

    return {
      allItems: allMap,
      rootItems: roots,
      stats: { total, done, active, epics: roots.length, types },
    }
  }, [data])

  /* Filter root items */
  const filteredRoots = useMemo(() => {
    let items = rootItems

    if (stateFilter !== 'all') {
      items = items.filter(item => {
        const s = item.state.toLowerCase()
        if (stateFilter === 'done') return isDone(s)
        if (stateFilter === 'active') return isActive(s)
        if (stateFilter === 'new') return ['new', 'proposed'].includes(s)
        return true
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesTree = (item: AdoWorkItemFlat): boolean => {
        if (
          item.title.toLowerCase().includes(q) ||
          String(item.id).includes(q) ||
          item.assignedTo.toLowerCase().includes(q) ||
          item.workItemType.toLowerCase().includes(q) ||
          item.tags.some(t => t.toLowerCase().includes(q))
        ) return true
        return item.childIds.some(cid => {
          const child = allItems.get(cid)
          return child ? matchesTree(child) : false
        })
      }
      items = items.filter(matchesTree)
    }

    return items
  }, [rootItems, stateFilter, searchQuery, allItems])

  /* Static data */
  const staticWizardFeatures = STATIC_ROADMAP.features.filter(f => f.category === 'wizard')
  const staticCrossCuttingFeatures = STATIC_ROADMAP.features.filter(f => f.category === 'cross-cutting')

  const tabs: { id: RoadmapTab; label: string; sublabel: string }[] = [
    { id: 'ado', label: 'Azure DevOps (Live)', sublabel: 'Real-time from ADO query' },
    { id: 'static', label: 'Static Roadmap', sublabel: 'Original CSV-based data' },
  ]

  const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

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
              const isTabActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={isTabActive}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex flex-col gap-0.5 px-5 py-3 text-left transition-colors"
                  style={{ color: isTabActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                >
                  <span className="text-sm font-semibold leading-tight">{tab.label}</span>
                  <span className="text-[0.625rem] leading-tight opacity-70">{tab.sublabel}</span>
                  {isTabActive && (
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
                {isLive && data?.fetchedAt && (
                  <span className="text-[0.5625rem] text-muted-foreground/60">
                    Fetched {new Date(data.fetchedAt).toLocaleTimeString()}
                  </span>
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
                    className="flex items-center gap-1 text-[0.625rem] font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
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
                      Check your network connection and PAT validity. View the Static Roadmap tab for cached data.
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
              {!isLoading && isLive && (
                <>
                  {/* Dashboard strip */}
                  <div className="mb-6 rounded-lg border border-border overflow-hidden">
                    <div className="flex items-stretch divide-x divide-border">
                      {/* Summary info */}
                      <div className="flex-1 px-5 py-4">
                        <p className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Query Results</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          {Array.from(stats.types.entries()).map(([type, count]) => (
                            <span key={type} className="flex items-center gap-1">
                              <span
                                className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5rem] font-semibold"
                                style={typeStyle(type)}
                              >
                                {type}
                              </span>
                              <span className="text-sm font-bold text-foreground">{count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Stat cells */}
                      <div className="flex flex-col items-center justify-center px-5 py-3" style={{ minWidth: '5rem' }}>
                        <p className="text-xl font-bold text-foreground">{stats.total}</p>
                        <p className="text-[0.5625rem] text-muted-foreground">Total</p>
                      </div>
                      <div className="flex flex-col items-center justify-center px-5 py-3" style={{ minWidth: '5rem' }}>
                        <p className="text-xl font-bold" style={{ color: 'oklch(0.4 0.16 145)' }}>{stats.done}</p>
                        <p className="text-[0.5625rem] text-muted-foreground">Done</p>
                      </div>
                      <div className="flex flex-col items-center justify-center px-5 py-3" style={{ minWidth: '5rem' }}>
                        <p className="text-xl font-bold" style={{ color: 'oklch(0.4 0.14 240)' }}>{stats.active}</p>
                        <p className="text-[0.5625rem] text-muted-foreground">Active</p>
                      </div>
                    </div>

                    {/* Overall progress */}
                    {stats.total > 0 && (
                      <div className="px-5 py-2 border-t border-border bg-muted/30 flex items-center gap-3">
                        <span className="text-[0.5625rem] font-semibold text-muted-foreground uppercase tracking-wider">Progress</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'oklch(0.92 0.01 260)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${progressPct}%`, backgroundColor: 'oklch(0.5 0.18 145)' }}
                          />
                        </div>
                        <span className="text-[0.6875rem] font-mono text-muted-foreground">{progressPct}%</span>
                      </div>
                    )}
                  </div>

                  {/* Toolbar */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search by title, ID, assignee, type, tag..."
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
                      {filteredRoots.length} of {rootItems.length} top-level items
                    </span>
                  </div>

                  {/* Epic/root item sections */}
                  {filteredRoots.length > 0 ? (
                    filteredRoots.map((root, idx) => (
                      <EpicSection
                        key={root.id}
                        epic={root}
                        allItems={allItems}
                        accentColor={ACCENT_COLORS[idx % ACCENT_COLORS.length]}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Search className="size-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No items match your filters.</p>
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
                    All data fetched live from Azure DevOps query. Every field displayed directly from ADO work items.
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
                      Switch to the <strong>Static Roadmap</strong> tab to view the original CSV-based data.
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
