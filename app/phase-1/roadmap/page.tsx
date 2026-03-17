'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
  Sparkles, ArrowLeft, ChevronDown, ChevronRight, Layers, Hash,
  Crosshair, Wrench, ExternalLink, RefreshCw, Loader2, AlertTriangle,
  CloudOff, User, Tag, FolderGit2, MapPin, Search, Filter,
  ShieldAlert, Users, Clock, CalendarDays, TrendingUp, Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ROADMAP as STATIC_ROADMAP, type Feature as StaticFeature, type Spike as StaticSpike } from './roadmap-data'
import type { AdoWorkItemFlat, AdoQueryResponse } from '@/app/api/ado-query/route'
import type { CapacityResponse } from '@/app/api/ado-capacity/route'
import { MEMBER_ROLES, extractTeamFromPath, getMemberActivities, TARGET_RELEASE_DATE, type TeamName } from '@/lib/team-config'

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
   PO Dashboard: Collapsible section wrapper
   ────────────────────────────────────────────── */
function CollapsibleSection({ icon: Icon, title, subtitle, badge, defaultOpen = true, children }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 mb-3 w-full text-left group"
      >
        {open ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        <Icon className="size-4 text-foreground" />
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <span className="text-[0.5625rem] text-muted-foreground">{subtitle}</span>}
        {badge}
      </button>
      {open && children}
    </div>
  )
}

/* ──────────────────────────────────────────────
   PO Dashboard: Feature progress row (expandable)
   ────────────────────────────────────────────── */
type FeatureProgressItem = {
  id: number; title: string; state: string; url: string; assignedTo: string | null
  total: number; done: number; active: number; remaining: number
  byType: { type: string; total: number; done: number; active: number }[]
  children: AdoWorkItemFlat[]
}

function FeatureRow({ feature, idx }: { feature: FeatureProgressItem; idx: number }) {
  const [expanded, setExpanded] = useState(false)
  const pct = feature.total > 0 ? Math.round((feature.done / feature.total) * 100) : 0
  const barColor = pct === 100 ? 'oklch(0.5 0.18 145)' : feature.active > 0 ? 'oklch(0.55 0.18 240)' : 'oklch(0.7 0.01 260)'

  return (
    <>
      <tr
        style={{ backgroundColor: idx % 2 === 0 ? 'oklch(1 0 0)' : 'oklch(0.99 0.003 260)', cursor: feature.total > 0 ? 'pointer' : 'default' }}
        onClick={() => feature.total > 0 && setExpanded(prev => !prev)}
      >
        <td className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            {feature.total > 0 && (
              expanded
                ? <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                : <ChevronRight className="size-3 text-muted-foreground shrink-0" />
            )}
            <a href={feature.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:underline text-[0.6875rem] leading-snug" onClick={e => e.stopPropagation()}>
              {feature.title}
            </a>
          </div>
        </td>
        <td className="text-center px-2 py-2.5 border-b border-border">
          <span className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5rem] font-semibold" style={stateStyle(feature.state)}>
            {feature.state}
          </span>
        </td>
        <td className="text-center px-2 py-2.5 border-b border-border text-[0.6875rem] font-mono text-foreground">{feature.total}</td>
        <td className="text-center px-2 py-2.5 border-b border-border text-[0.6875rem] font-mono" style={{ color: 'oklch(0.4 0.16 145)' }}>{feature.done}</td>
        <td className="text-center px-2 py-2.5 border-b border-border text-[0.6875rem] font-mono" style={{ color: 'oklch(0.4 0.14 240)' }}>{feature.active}</td>
        <td className="text-center px-2 py-2.5 border-b border-border text-[0.6875rem] font-mono text-muted-foreground">{feature.remaining}</td>
        <td className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'oklch(0.92 0.01 260)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
            </div>
            <span className="text-[0.625rem] font-mono text-muted-foreground shrink-0" style={{ minWidth: '2rem', textAlign: 'right' }}>{pct}%</span>
          </div>
        </td>
      </tr>
      {/* Expanded: show child items grouped by type */}
      {expanded && (
        <tr>
          <td colSpan={7} className="px-0 py-0 border-b border-border" style={{ backgroundColor: 'oklch(0.98 0.003 260)' }}>
            <div className="px-6 py-3">
              {/* Type breakdown chips */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[0.5625rem] font-semibold text-muted-foreground">By type:</span>
                {feature.byType.map(bt => (
                  <span key={bt.type} className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[0.5625rem] border border-border" style={{ backgroundColor: 'oklch(1 0 0)' }}>
                    <span className="font-semibold text-foreground">{bt.type}</span>
                    <span className="text-muted-foreground">{bt.done}/{bt.total}</span>
                  </span>
                ))}
              </div>
              {/* Child item list */}
              <div className="divide-y divide-border rounded border border-border overflow-hidden" style={{ backgroundColor: 'oklch(1 0 0)' }}>
                {feature.children.map(child => (
                  <a key={child.id} href={child.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30 transition-colors">
                    <span className="text-[0.5625rem] font-mono text-muted-foreground shrink-0">{child.id}</span>
                    <span className="inline-flex items-center rounded-sm px-1 py-0 text-[0.5rem] font-medium shrink-0" style={{ backgroundColor: 'oklch(0.94 0.01 260)', color: 'oklch(0.5 0.01 260)' }}>
                      {child.workItemType}
                    </span>
                    <span className="text-[0.625rem] text-foreground leading-snug flex-1 min-w-0 truncate">{child.title}</span>
                    {child.assignedTo && <span className="text-[0.5625rem] text-muted-foreground shrink-0">{child.assignedTo}</span>}
                    <span className="inline-flex items-center rounded-sm px-1 py-0 text-[0.5rem] font-semibold shrink-0" style={stateStyle(child.state)}>{child.state}</span>
                  </a>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ──────────────────────────────────────────────
   PO Dashboard: Risk section card
   ────────────────────────────────────────────── */
function RiskSection({ label, icon: Icon, items, color }: { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; items: AdoWorkItemFlat[]; color: string }) {
  const [expanded, setExpanded] = useState(false)
  const displayItems = expanded ? items : items.slice(0, 5)
  return (
    <div className="rounded-lg border border-border overflow-hidden" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border" style={{ backgroundColor: 'oklch(0.97 0.005 260)' }}>
        <Icon className="size-3.5" style={{ color }} />
        <span className="text-[0.6875rem] font-semibold text-foreground">{label}</span>
        <span className="ml-auto text-[0.6875rem] font-bold" style={{ color: items.length > 0 ? color : 'oklch(0.45 0.01 260)' }}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="px-3 py-4 text-center">
          <p className="text-[0.625rem] text-muted-foreground/50 italic">None found</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {displayItems.map(item => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 px-3 py-1.5 hover:bg-muted/30 transition-colors">
              <span className="text-[0.5625rem] font-mono text-muted-foreground shrink-0 mt-0.5">{item.id}</span>
              <span className="text-[0.625rem] text-foreground leading-snug flex-1 min-w-0 truncate">{item.title}</span>
              <span className="inline-flex items-center rounded-sm px-1 py-0 text-[0.5rem] font-semibold shrink-0" style={stateStyle(item.state)}>{item.state}</span>
            </a>
          ))}
          {items.length > 5 && !expanded && (
            <button type="button" onClick={() => setExpanded(true)} className="w-full px-3 py-1.5 text-[0.625rem] font-medium text-muted-foreground hover:text-foreground text-center transition-colors">
              Show {items.length - 5} more...
            </button>
          )}
          {expanded && items.length > 5 && (
            <button type="button" onClick={() => setExpanded(false)} className="w-full px-3 py-1.5 text-[0.625rem] font-medium text-muted-foreground hover:text-foreground text-center transition-colors">
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────── */
type RoadmapTab = 'ado' | 'static' | 'dashboard'
type StateFilter = 'all' | 'active' | 'done' | 'new'

export default function DeliveryRoadmapPage() {
  const [activeTab, setActiveTab] = useState<RoadmapTab>('ado')
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<StateFilter>('all')

  const { data, error, isLoading, mutate } = useSWR<AdoQueryResponse>('/api/ado-query', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
  const { data: capacityData, error: capacityError, isLoading: capacityLoading } = useSWR<CapacityResponse>(
    activeTab === 'dashboard' ? '/api/ado-capacity' : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 120_000,
  })

  const isLive = !error && !!data?.items

  /* Build lookup map + identify root items (epics / top-level) */
  const { allItems, rootItems, stats, scopedItems } = useMemo(() => {
    const allMap = new Map<number, AdoWorkItemFlat>()
    if (!data?.items) return { allItems: allMap, rootItems: [] as AdoWorkItemFlat[], scopedItems: [] as AdoWorkItemFlat[], stats: { total: 0, done: 0, active: 0, epics: 0, types: new Map<string, number>() } }

    for (const item of data.items) allMap.set(item.id, item)

    // Only show epic 4651627 and its descendants
    const TARGET_EPIC_ID = 4651627
    const roots = data.items.filter(i => i.id === TARGET_EPIC_ID)

    // Stats scoped to epic 4651627 and its descendants only
    const collectDescendantIds = (id: number, visited: Set<number> = new Set()): Set<number> => {
      if (visited.has(id)) return visited
      visited.add(id)
      const item = allMap.get(id)
      if (item) for (const cid of item.childIds) collectDescendantIds(cid, visited)
      return visited
    }
    const epicDescendants = collectDescendantIds(TARGET_EPIC_ID)
    const scopedItems = data.items.filter(i => epicDescendants.has(i.id))
    let total = scopedItems.length
    let done = 0
    let active = 0
    const types = new Map<string, number>()
    for (const item of scopedItems) {
      if (isDone(item.state)) done++
      if (isActive(item.state)) active++
      types.set(item.workItemType, (types.get(item.workItemType) ?? 0) + 1)
    }

    return {
      allItems: allMap,
      rootItems: roots,
      scopedItems,
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

  /* ── PO Dashboard data ── */
  const dashboardData = useMemo(() => {
    if (scopedItems.length === 0) return null

    // All Features directly under the epic
    const features = scopedItems.filter(i => i.workItemType === 'Feature')
    // All non-Feature, non-Epic items (Spikes, Tasks, User Stories, etc.)
    const childWorkItems = scopedItems.filter(i => !['Feature', 'Epic'].includes(i.workItemType))

    // Helper: collect all descendant items of a given parent
    const getDescendants = (parentId: number): AdoWorkItemFlat[] => {
      const result: AdoWorkItemFlat[] = []
      const visit = (id: number) => {
        const item = allItems.get(id)
        if (!item) return
        for (const cid of item.childIds) {
          const child = allItems.get(cid)
          if (child) { result.push(child); visit(cid) }
        }
      }
      visit(parentId)
      return result
    }

    // Build Feature progress rows
    const featureProgress = features.map(f => {
      const children = getDescendants(f.id)
      const total = children.length
      const done = children.filter(c => isDone(c.state)).length
      const active = children.filter(c => isActive(c.state)).length
      const remaining = total - done - active

      // Group children by work item type
      const byType = new Map<string, { total: number; done: number; active: number }>()
      for (const c of children) {
        const entry = byType.get(c.workItemType) ?? { total: 0, done: 0, active: 0 }
        entry.total++
        if (isDone(c.state)) entry.done++
        if (isActive(c.state)) entry.active++
        byType.set(c.workItemType, entry)
      }

      return {
        id: f.id,
        title: f.title,
        state: f.state,
        url: f.url,
        assignedTo: f.assignedTo,
        total,
        done,
        active,
        remaining,
        byType: Array.from(byType.entries()).map(([type, counts]) => ({ type, ...counts })),
        children,
      }
    }).sort((a, b) => {
      // Sort: active features first, then by completion %, then alphabetical
      const aActive = isActive(a.state) ? 0 : isDone(a.state) ? 2 : 1
      const bActive = isActive(b.state) ? 0 : isDone(b.state) ? 2 : 1
      if (aActive !== bActive) return aActive - bActive
      const aPct = a.total > 0 ? a.done / a.total : 0
      const bPct = b.total > 0 ? b.done / b.total : 0
      return bPct - aPct
    })

    // Risk radar
    const unassigned = childWorkItems.filter(s => !s.assignedTo)
    const stale = childWorkItems.filter(s => ['new', 'proposed'].includes(s.state.toLowerCase()))
    const removed = scopedItems.filter(s => ['removed', 'cut'].includes(s.state.toLowerCase()))

    // Assignee distribution
    const assigneeMap = new Map<string, { active: number; done: number; total: number }>()
    for (const s of childWorkItems) {
      const name = s.assignedTo || 'Unassigned'
      const entry = assigneeMap.get(name) ?? { active: 0, done: 0, total: 0 }
      entry.total++
      if (isDone(s.state)) entry.done++
      if (isActive(s.state)) entry.active++
      assigneeMap.set(name, entry)
    }
    const assignees = Array.from(assigneeMap.entries())
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.active - a.active)

    // Hero stats
    const totalItems = scopedItems.length
    const doneItems = scopedItems.filter(i => isDone(i.state)).length
    const activeItems = scopedItems.filter(i => isActive(i.state)).length
    const unassignedCount = unassigned.length
    const newProposedCount = stale.length

    return {
      heroStats: { totalItems, doneItems, activeItems, unassignedCount, newProposedCount },
      featureProgress,
      risk: { unassigned, stale, removed },
      assignees,
    }
  }, [scopedItems, allItems])

  /* ── Team Capacity insights ──
     PRIMARY source: work item assignees from current sprint
     Role mapping: lib/team-config.ts (static config)
     Sprint timeline: capacity API (iterations only)
     ─────────────────────────────────────────────── */
  const capacityInsights = useMemo(() => {
    if (!capacityData?.teams || !scopedItems) return null

    type MemberRow = {
      displayName: string
      team: string
      role: string
      capacityPerDay: number
      daysOff: number
      sprintCapacityHrs: number
      isConfigured: boolean // true if role came from team-config.ts
    }

    // ── 1. Collect iterations from capacity API (this works reliably) ──
    const allIterationsMap = new Map<string, { name: string; startDate: string | null; finishDate: string | null; timeFrame: string }>()
    for (const team of capacityData.teams) {
      for (const it of team.allIterations) {
        if (!allIterationsMap.has(it.name)) {
          allIterationsMap.set(it.name, { name: it.name, startDate: it.startDate, finishDate: it.finishDate, timeFrame: it.timeFrame })
        }
      }
    }

    // ── 2. Find current sprint info for working days calculation ──
    const currentSprintInfo = Array.from(allIterationsMap.values()).find(s => s.timeFrame === 'current')
    let sprintWorkingDays = 10 // default 2-week sprint
    if (currentSprintInfo?.startDate && currentSprintInfo?.finishDate) {
      const start = new Date(currentSprintInfo.startDate)
      const end = new Date(currentSprintInfo.finishDate)
      let workDays = 0
      const d = new Date(start)
      while (d <= end) {
        const day = d.getDay()
        if (day !== 0 && day !== 6) workDays++
        d.setDate(d.getDate() + 1)
      }
      sprintWorkingDays = workDays
    }

    // ── 3. Identify current sprint name to filter work items ──
    const currentSprintName = currentSprintInfo?.name ?? null

    // ── 4. Discover members from ALL work items (not just scopedItems/epic) ──
    // Use full data.items so we capture every team member, not just those under one epic
    const allWorkItems = data?.items ?? []
    const memberTeams = new Map<string, Set<TeamName>>()

    let debugTotalItems = 0
    let debugSkippedNoAssignee = 0
    let debugSkippedSprintMismatch = 0
    let debugSkippedNoTeam = 0
    let debugMatched = 0

    for (const item of allWorkItems) {
      debugTotalItems++
      if (!item.assignedTo || !item.iterationPath) { debugSkippedNoAssignee++; continue }

      // Only include items from current sprint
      if (currentSprintName && !item.iterationPath.includes(currentSprintName)) { debugSkippedSprintMismatch++; continue }

      const team = extractTeamFromPath(item.iterationPath)
      if (!team) { debugSkippedNoTeam++; continue }

      debugMatched++
      const teams = memberTeams.get(item.assignedTo) ?? new Set<TeamName>()
      teams.add(team)
      memberTeams.set(item.assignedTo, teams)
    }

    console.log(`[v0] Capacity discovery: total=${debugTotalItems}, noAssignee=${debugSkippedNoAssignee}, sprintMismatch=${debugSkippedSprintMismatch}, noTeam=${debugSkippedNoTeam}, matched=${debugMatched}, uniqueMembers=${memberTeams.size}`)
    console.log(`[v0] Current sprint name: "${currentSprintName}"`)
    console.log(`[v0] Members found:`, Array.from(memberTeams.keys()))
    // Log a sample of iteration paths for debugging
    const samplePaths = allWorkItems.slice(0, 5).map(i => i.iterationPath)
    console.log(`[v0] Sample iterationPaths:`, samplePaths)

    // ── 5. Build member rows with role from team-config.ts ──
    const memberRows: MemberRow[] = []
    let totalDevCapacity = 0
    let totalQaCapacity = 0
    let totalSupportCapacity = 0
    let devCount = 0
    let qaCount = 0
    let supportCount = 0

    for (const [name, teams] of memberTeams) {
      const teamName = Array.from(teams)[0] // primary team
      const activities = getMemberActivities(name)
      const isConfigured = MEMBER_ROLES[name] !== undefined

      for (const act of activities) {
        const sprintHrs = sprintWorkingDays * act.hrsPerDay
        memberRows.push({
          displayName: name,
          team: teamName,
          role: act.activity,
          capacityPerDay: act.hrsPerDay,
          daysOff: 0,
          sprintCapacityHrs: sprintHrs,
          isConfigured,
        })

        if (act.activity === 'Development') { totalDevCapacity += sprintHrs; devCount++ }
        else if (act.activity === 'Testing') { totalQaCapacity += sprintHrs; qaCount++ }
        else if (act.activity === 'Support') { totalSupportCapacity += sprintHrs; supportCount++ }
      }
    }

    // Sort: by team, then by name
    memberRows.sort((a, b) => a.team.localeCompare(b.team) || a.displayName.localeCompare(b.displayName))

    // ── 6. Build sprint timeline ──
    const allSprints = Array.from(allIterationsMap.values())
      .filter(s => s.startDate && s.finishDate)
      .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())

    const currentSprint = allSprints.find(s => s.timeFrame === 'current')
    const futureSprints = allSprints.filter(s => s.timeFrame === 'future' && new Date(s.finishDate!) <= TARGET_RELEASE_DATE)
    const pastSprints = allSprints.filter(s => s.timeFrame === 'past')
    const sprintsRemaining = futureSprints.length + (currentSprint ? 1 : 0)

    // Mark target sprint (the sprint whose finish date is closest to and >= target release)
    let targetSprintName: string | null = null
    for (const s of allSprints) {
      if (s.finishDate && new Date(s.finishDate) >= TARGET_RELEASE_DATE) {
        targetSprintName = s.name
        break
      }
    }

    // Count unique members (deduplicated by name)
    const uniqueMembers = new Set(memberRows.map(r => r.displayName))
    const unconfiguredMembers = memberRows.filter(r => !r.isConfigured).map(r => r.displayName)
    const unconfiguredUnique = [...new Set(unconfiguredMembers)]

    return {
      memberRows,
      summary: {
        devCount, qaCount, supportCount,
        totalDevCapacity, totalQaCapacity, totalSupportCapacity,
        totalCapacity: totalDevCapacity + totalQaCapacity + totalSupportCapacity,
        uniqueMemberCount: uniqueMembers.size,
      },
      sprints: {
        all: allSprints,
        current: currentSprint,
        future: futureSprints,
        past: pastSprints,
        sprintsRemaining,
        targetSprintName,
        targetDate: TARGET_RELEASE_DATE,
      },
      teams: [...new Set(memberRows.map(r => r.team))].sort(),
      sprintWorkingDays,
      /** Members defaulting to Development because they're not in team-config.ts */
      unconfiguredMembers: unconfiguredUnique,
    }
  }, [capacityData, data, scopedItems])

  /* ── Release projection ── */
  const releaseProjection = useMemo(() => {
    if (!dashboardData || !capacityInsights) return null

    const remaining = dashboardData.heroStats.totalItems - dashboardData.heroStats.doneItems
    const sprintsRemaining = capacityInsights.sprints.sprintsRemaining
    const pastSprints = capacityInsights.sprints.past

    // Velocity: items done / past sprints
    const totalDone = dashboardData.heroStats.doneItems
    const pastSprintCount = pastSprints.length || 1
    const avgVelocity = pastSprintCount > 0 ? Math.round(totalDone / pastSprintCount) : 0

    // Current team from capacity insights (derived from work items + team-config)
    const currentDevs = capacityInsights.summary.devCount
    const currentQa = capacityInsights.summary.qaCount
    const currentSupport = capacityInsights.summary.supportCount
    const currentTotal = capacityInsights.summary.uniqueMemberCount

    // Required velocity
    const requiredVelocity = sprintsRemaining > 0 ? Math.ceil(remaining / sprintsRemaining) : remaining

    // Capacity-based estimation (hours)
    const totalCapacityHrsPerSprint = capacityInsights.summary.totalCapacity

    // Hours per item: use velocity if available, else baseline 8 hrs/item
    const hrsPerItem = avgVelocity > 0 && totalCapacityHrsPerSprint > 0
      ? totalCapacityHrsPerSprint / avgVelocity
      : 8
    const totalHrsNeeded = remaining * hrsPerItem
    const hrsAvailableUntilRelease = totalCapacityHrsPerSprint * sprintsRemaining
    const hrsGap = Math.max(0, totalHrsNeeded - hrsAvailableUntilRelease)

    // Average capacity per member per sprint
    const avgCapacityPerMember = currentTotal > 0
      ? totalCapacityHrsPerSprint / currentTotal
      : capacityInsights.sprintWorkingDays * 6 // fallback
    const avgCapacityPerMemberUntilRelease = avgCapacityPerMember * sprintsRemaining
    const additionalMembersNeeded = avgCapacityPerMemberUntilRelease > 0
      ? Math.ceil(hrsGap / avgCapacityPerMemberUntilRelease) : 0

    // Dev:QA ratio from current team for breakdown
    const contributingMembers = Math.max(currentDevs + currentQa, 1)
    const devRatio = currentDevs / contributingMembers
    const qaRatio = currentQa / contributingMembers
    const additionalDevs = Math.max(0, Math.round(additionalMembersNeeded * devRatio))
    const additionalQa = Math.max(0, Math.round(additionalMembersNeeded * qaRatio))
    // Ensure rounding doesn't lose people
    const adjustedAdditionalDevs = (additionalDevs + additionalQa) < additionalMembersNeeded
      ? additionalDevs + (additionalMembersNeeded - additionalDevs - additionalQa) : additionalDevs

    // Projected with additional resources
    const newTotalMembers = currentTotal + additionalMembersNeeded
    const projectedCapacityPerSprint = avgCapacityPerMember * newTotalMembers
    const projectedSprintsWithResources = projectedCapacityPerSprint > 0 && hrsPerItem > 0
      ? Math.ceil((remaining * hrsPerItem) / projectedCapacityPerSprint) : null

    // Status
    let status: 'on-track' | 'at-risk' | 'delayed'
    if (hrsGap <= 0) status = 'on-track'
    else if (hrsGap <= hrsAvailableUntilRelease * 0.3) status = 'at-risk'
    else status = 'delayed'

    const velocityGapPct = avgVelocity > 0 && requiredVelocity > avgVelocity
      ? Math.round(((requiredVelocity - avgVelocity) / avgVelocity) * 100) : null

    return {
      remaining,
      avgVelocity,
      requiredVelocity,
      sprintsRemaining,
      status,
      targetDate: capacityInsights.sprints.targetDate,
      currentDevs,
      currentQa,
      currentTotal,
      additionalMembersNeeded,
      additionalDevs: adjustedAdditionalDevs,
      additionalQa,
      projectedSprintsWithResources,
      velocityGapPct,
      totalCapacityHrsPerSprint,
      hrsPerItem: Math.round(hrsPerItem * 10) / 10,
      totalHrsNeeded: Math.round(totalHrsNeeded),
      hrsAvailableUntilRelease: Math.round(hrsAvailableUntilRelease),
      hrsGap: Math.round(hrsGap),
    }
  }, [dashboardData, capacityInsights])

  /* Static data */
  const staticWizardFeatures = STATIC_ROADMAP.features.filter(f => f.category === 'wizard')
  const staticCrossCuttingFeatures = STATIC_ROADMAP.features.filter(f => f.category === 'cross-cutting')

  const tabs: { id: RoadmapTab; label: string; sublabel: string }[] = [
    { id: 'ado', label: 'Azure DevOps (Live)', sublabel: 'Real-time from ADO query' },
    { id: 'dashboard', label: 'PO Dashboard', sublabel: 'Key insights & risk radar' },
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

          {/* ── TAB: PO Dashboard ── */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Reuse same loading / error states */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading dashboard data from Azure DevOps...</p>
                </div>
              )}

              {error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                  <CloudOff className="size-10 text-muted-foreground/40" />
                  <div>
                    <p className="text-sm font-medium text-foreground">No live data available</p>
                    <p className="text-xs text-muted-foreground mt-1">Dashboard requires a live ADO connection. Check the Azure DevOps (Live) tab.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => mutate()}>
                    <RefreshCw className="size-3.5" />
                    Retry Connection
                  </Button>
                </div>
              )}

              {!isLoading && isLive && dashboardData && (
                <>
                  {/* ── Section 1: Hero Stat Cards ── */}
                  <CollapsibleSection icon={Hash} title="Summary" subtitle="High-level project metrics">
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { label: 'Total Items', value: dashboardData.heroStats.totalItems, color: 'oklch(0.25 0 0)' },
                        { label: 'Done', value: dashboardData.heroStats.doneItems, color: 'oklch(0.4 0.16 145)' },
                        { label: 'Active', value: dashboardData.heroStats.activeItems, color: 'oklch(0.4 0.14 240)' },
                        { label: 'Unassigned', value: dashboardData.heroStats.unassignedCount, color: dashboardData.heroStats.unassignedCount > 0 ? 'oklch(0.5 0.16 60)' : 'oklch(0.45 0.01 260)' },
                        { label: 'New/Proposed', value: dashboardData.heroStats.newProposedCount, color: 'oklch(0.45 0.01 260)' },
                      ].map(stat => (
                        <div key={stat.label} className="rounded-lg border border-border px-4 py-4 text-center" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
                          <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                          <p className="text-[0.625rem] text-muted-foreground mt-0.5">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>

                  {/* ── Section 2: Feature Progress ── */}
                  <CollapsibleSection icon={Layers} title="Feature Progress" subtitle="Click a row to see child items (Spikes, Stories, Tasks)">
                    <div className="rounded-lg border border-border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[0.6875rem]">
                          <thead>
                            <tr style={{ backgroundColor: 'oklch(0.97 0.005 260)' }}>
                              <th className="text-left px-3 py-2.5 font-semibold text-foreground border-b border-border" style={{ minWidth: '16rem' }}>Feature</th>
                              <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground border-b border-border" style={{ width: '4.5rem' }}>State</th>
                              <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground border-b border-border" style={{ width: '3.5rem' }}>Total</th>
                              <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground border-b border-border" style={{ width: '3.5rem' }}>Done</th>
                              <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground border-b border-border" style={{ width: '3.5rem' }}>Active</th>
                              <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground border-b border-border" style={{ width: '4rem' }}>Remaining</th>
                              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground border-b border-border" style={{ minWidth: '8rem' }}>Progress</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.featureProgress.map((feature, idx) => (
                              <FeatureRow key={feature.id} feature={feature} idx={idx} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Summary footer */}
                      <div className="flex items-center gap-6 px-3 py-2 border-t border-border text-[0.5625rem]" style={{ backgroundColor: 'oklch(0.97 0.005 260)' }}>
                        <span className="font-semibold text-foreground">
                          {dashboardData.featureProgress.length} Features
                        </span>
                        <span className="text-muted-foreground">
                          {dashboardData.featureProgress.reduce((s, f) => s + f.total, 0)} total items
                        </span>
                        <span style={{ color: 'oklch(0.4 0.16 145)' }}>
                          {dashboardData.featureProgress.reduce((s, f) => s + f.done, 0)} done
                        </span>
                        <span style={{ color: 'oklch(0.4 0.14 240)' }}>
                          {dashboardData.featureProgress.reduce((s, f) => s + f.active, 0)} active
                        </span>
                        <span className="text-muted-foreground">
                          {dashboardData.featureProgress.reduce((s, f) => s + f.remaining, 0)} remaining
                        </span>
                      </div>
                    </div>
                  </CollapsibleSection>

                  {/* ── Section 3: Risk Radar ── */}
                  <CollapsibleSection icon={ShieldAlert} title="Risk Radar" badge={
                    (dashboardData.risk.unassigned.length + dashboardData.risk.removed.length) > 0
                      ? <span className="text-[0.5625rem] font-semibold px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.18 25)' }}>{dashboardData.risk.unassigned.length + dashboardData.risk.stale.length + dashboardData.risk.removed.length} items</span>
                      : undefined
                  }>
                    <div className="grid grid-cols-3 gap-3">
                      <RiskSection label="Unassigned" icon={User} items={dashboardData.risk.unassigned} color="oklch(0.5 0.16 60)" />
                      <RiskSection label="Stale (New/Proposed)" icon={Clock} items={dashboardData.risk.stale} color="oklch(0.45 0.01 260)" />
                      <RiskSection label="Removed/Cut" icon={AlertTriangle} items={dashboardData.risk.removed} color="oklch(0.5 0.18 25)" />
                    </div>
                  </CollapsibleSection>

                  {/* ── Section 4: Assignee Distribution ── */}
                  <CollapsibleSection icon={Users} title="Assignee Distribution" subtitle="Work allocation across team members (spikes & tasks)">
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-[0.6875rem]">
                        <thead>
                          <tr style={{ backgroundColor: 'oklch(0.97 0.005 260)' }}>
                            <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border">Assignee</th>
                            <th className="text-center px-3 py-2 font-semibold text-muted-foreground border-b border-border" style={{ width: '5rem' }}>Active</th>
                            <th className="text-center px-3 py-2 font-semibold text-muted-foreground border-b border-border" style={{ width: '5rem' }}>Done</th>
                            <th className="text-center px-3 py-2 font-semibold text-muted-foreground border-b border-border" style={{ width: '5rem' }}>Total</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b border-border" style={{ width: '10rem' }}>Workload</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.assignees.map((person, idx) => {
                            const isOverloaded = person.active > 5
                            const isIdle = person.active === 0 && person.name !== 'Unassigned'
                            const barWidth = dashboardData.assignees.length > 0 ? Math.round((person.total / Math.max(...dashboardData.assignees.map(a => a.total))) * 100) : 0
                            return (
                              <tr key={person.name} style={{ backgroundColor: idx % 2 === 0 ? 'oklch(1 0 0)' : 'oklch(0.99 0.003 260)' }}>
                                <td className="px-3 py-2 border-b border-border">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-foreground">{person.name}</span>
                                    {isOverloaded && (
                                      <span className="text-[0.5rem] font-semibold px-1 rounded-sm" style={{ backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.18 25)' }}>HIGH</span>
                                    )}
                                    {isIdle && person.done > 0 && (
                                      <span className="text-[0.5rem] font-semibold px-1 rounded-sm" style={{ backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>AVAILABLE</span>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center px-3 py-2 border-b border-border font-bold" style={{ color: isOverloaded ? 'oklch(0.5 0.18 25)' : 'oklch(0.4 0.14 240)' }}>
                                  {person.active}
                                </td>
                                <td className="text-center px-3 py-2 border-b border-border" style={{ color: 'oklch(0.4 0.16 145)' }}>
                                  {person.done}
                                </td>
                                <td className="text-center px-3 py-2 border-b border-border text-foreground">
                                  {person.total}
                                </td>
                                <td className="px-3 py-2 border-b border-border">
                                  <div className="flex items-center gap-1">
                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'oklch(0.92 0.01 260)' }}>
                                      <div className="h-full rounded-full flex">
                                        <div style={{ width: `${person.total > 0 ? Math.round((person.done / person.total) * barWidth) : 0}%`, backgroundColor: 'oklch(0.55 0.2 145)' }} />
                                        <div style={{ width: `${person.total > 0 ? Math.round((person.active / person.total) * barWidth) : 0}%`, backgroundColor: 'oklch(0.55 0.18 240)' }} />
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleSection>

                  {/* ── Section 5: Team Capacity ── */}
                  {capacityLoading && (
                    <div className="flex items-center justify-center py-10 gap-2 mb-6">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Loading team capacity data...</p>
                    </div>
                  )}

                  {capacityError && !capacityLoading && (
                    <div className="rounded-lg border border-border px-4 py-6 text-center mb-6" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
                      <p className="text-xs text-muted-foreground">Could not load team capacity data. Ensure ADO PAT has access to Team APIs.</p>
                    </div>
                  )}

                  {/* DEBUG: capacity data diagnosis */}
                  {data?.items && capacityData?.teams && (
                    <div className="rounded-lg border border-dashed border-yellow-500 bg-yellow-50 px-4 py-3 mb-4 text-[0.625rem] font-mono text-yellow-800 space-y-1">
                      <p className="font-bold">Capacity Debug (remove after fix):</p>
                      <p>Total work items (data.items): {data.items.length}</p>
                      <p>Scoped items: {scopedItems.length}</p>
                      <p>Capacity API teams: {capacityData.teams.map(t => t.name).join(', ')}</p>
                      <p>Current iterations: {capacityData.teams.map(t => `${t.name}=${t.currentIteration?.name ?? 'NONE'}`).join(' | ')}</p>
                      <p>Sample iterationPaths (first 5): {data.items.slice(0, 5).map(i => i.iterationPath).join(' | ')}</p>
                      <p>Sample assignedTo (first 10 unique): {[...new Set(data.items.filter(i => i.assignedTo).map(i => i.assignedTo))].slice(0, 10).join(' | ')}</p>
                      <p>Items with team in path: {data.items.filter(i => i.iterationPath && (i.iterationPath.toLowerCase().includes('wizards') || i.iterationPath.toLowerCase().includes('infinity'))).length}</p>
                      <p>capacityInsights null? {capacityInsights === null ? 'YES' : 'NO'}</p>
                      {capacityInsights && <p>memberRows count: {capacityInsights.memberRows.length}</p>}
                    </div>
                  )}

                  {capacityInsights && (
                    <>
                      <CollapsibleSection icon={Users} title="Team Capacity" subtitle={`${capacityInsights.sprints.current?.name ?? 'Current Sprint'} -- ${capacityInsights.summary.uniqueMemberCount} members across ${capacityInsights.teams.length} teams${capacityInsights.unconfiguredMembers.length > 0 ? ` (${capacityInsights.unconfiguredMembers.length} defaulting to Dev)` : ''}`}>
                        {/* Summary cards */}
                        <div className="grid grid-cols-6 gap-3 mb-4">
                          {[
                            { label: 'Developers', value: capacityInsights.summary.devCount, color: 'oklch(0.4 0.14 240)' },
                            { label: 'QA / Testing', value: capacityInsights.summary.qaCount, color: 'oklch(0.4 0.16 145)' },
                            { label: 'Support', value: capacityInsights.summary.supportCount, color: 'oklch(0.45 0.12 60)' },
                            { label: 'Dev Capacity (hrs)', value: capacityInsights.summary.totalDevCapacity, color: 'oklch(0.4 0.14 240)' },
                            { label: 'QA Capacity (hrs)', value: capacityInsights.summary.totalQaCapacity, color: 'oklch(0.4 0.16 145)' },
                            { label: 'Total Capacity (hrs)', value: capacityInsights.summary.totalCapacity, color: 'oklch(0.25 0 0)' },
                          ].map(stat => (
                            <div key={stat.label} className="rounded-lg border border-border px-3 py-3 text-center" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
                              <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                              <p className="text-[0.5625rem] text-muted-foreground mt-0.5">{stat.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Per-team member table */}
                        <div className="rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-[0.6875rem]">
                            <thead>
                              <tr style={{ backgroundColor: 'oklch(0.97 0.005 260)' }}>
                                <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border">Member</th>
                                <th className="text-center px-2 py-2 font-semibold text-muted-foreground border-b border-border" style={{ width: '5rem' }}>Team</th>
                                <th className="text-center px-2 py-2 font-semibold text-muted-foreground border-b border-border" style={{ width: '5.5rem' }}>Activity</th>
                                <th className="text-center px-2 py-2 font-semibold text-muted-foreground border-b border-border" style={{ width: '4.5rem' }}>Hrs/Day</th>
                                <th className="text-center px-2 py-2 font-semibold text-muted-foreground border-b border-border" style={{ width: '4.5rem' }}>Days Off</th>
                                <th className="text-center px-2 py-2 font-semibold text-muted-foreground border-b border-border" style={{ width: '5.5rem' }}>Sprint Hrs</th>
                              </tr>
                            </thead>
                            <tbody>
                              {capacityInsights.memberRows.map((row, idx) => {
                                const roleLower = row.role.toLowerCase()
                                const roleColor = roleLower === 'development' ? 'oklch(0.4 0.14 240)'
                                  : roleLower === 'testing' ? 'oklch(0.4 0.16 145)'
                                  : 'oklch(0.45 0.12 60)'
                                const roleBg = roleLower === 'development' ? 'oklch(0.94 0.04 240)'
                                  : roleLower === 'testing' ? 'oklch(0.94 0.04 145)'
                                  : 'oklch(0.94 0.03 60)'
                                return (
                                  <tr key={`${row.displayName}-${row.role}-${row.team}`} style={{ backgroundColor: idx % 2 === 0 ? 'oklch(1 0 0)' : 'oklch(0.99 0.003 260)' }}>
                                    <td className="px-3 py-2 border-b border-border font-medium text-foreground">
  {row.displayName}
  {!row.isConfigured && <span className="ml-1 text-[0.5rem] text-muted-foreground" title="Role defaulting to Development. Update lib/team-config.ts to set correct role.">*</span>}
 </td>
                                    <td className="text-center px-2 py-2 border-b border-border text-muted-foreground">{row.team}</td>
                                    <td className="text-center px-2 py-2 border-b border-border">
                                      <span className="inline-flex items-center rounded-sm px-1.5 py-0 text-[0.5rem] font-semibold" style={{ backgroundColor: roleBg, color: roleColor }}>
                                        {row.role}
                                      </span>
                                    </td>
                                    <td className="text-center px-2 py-2 border-b border-border font-mono text-foreground">{row.capacityPerDay}</td>
                                    <td className="text-center px-2 py-2 border-b border-border font-mono" style={{ color: row.daysOff > 0 ? 'oklch(0.5 0.16 60)' : 'oklch(0.6 0.01 260)' }}>
                                      {row.daysOff > 0 ? `${row.daysOff}d` : '0'}
                                    </td>
                                    <td className="text-center px-2 py-2 border-b border-border font-mono font-bold text-foreground">{row.sprintCapacityHrs}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        {capacityInsights.unconfiguredMembers.length > 0 && (
                          <p className="text-[0.5625rem] text-muted-foreground mt-2 leading-relaxed">
                            * {capacityInsights.unconfiguredMembers.length} member{capacityInsights.unconfiguredMembers.length > 1 ? 's' : ''} defaulting to Development (6 hrs/day).
                            Update <code className="text-[0.5rem] px-1 py-0.5 rounded" style={{ backgroundColor: 'oklch(0.95 0 0)' }}>lib/team-config.ts</code> to set correct roles.
                          </p>
                        )}
                      </CollapsibleSection>

                      {/* ── Section 6: Release Projection ── */}
                      <CollapsibleSection icon={Target} title="Release Projection" subtitle={`Target: June 28, 2026`}>
                        {releaseProjection ? (
                          <>
                            {/* Status banner */}
                            <div className="rounded-lg border px-4 py-3 mb-4 flex items-center gap-3" style={{
                              backgroundColor: releaseProjection.status === 'on-track' ? 'oklch(0.96 0.03 145)'
                                : releaseProjection.status === 'at-risk' ? 'oklch(0.96 0.03 60)'
                                : 'oklch(0.96 0.03 25)',
                              borderColor: releaseProjection.status === 'on-track' ? 'oklch(0.85 0.08 145)'
                                : releaseProjection.status === 'at-risk' ? 'oklch(0.85 0.08 60)'
                                : 'oklch(0.85 0.08 25)',
                            }}>
                              <div className="size-3 rounded-full" style={{
                                backgroundColor: releaseProjection.status === 'on-track' ? 'oklch(0.5 0.2 145)'
                                  : releaseProjection.status === 'at-risk' ? 'oklch(0.6 0.2 60)'
                                  : 'oklch(0.5 0.22 25)',
                              }} />
                              <div className="flex flex-col">
                                <span className="text-sm font-bold" style={{
                                  color: releaseProjection.status === 'on-track' ? 'oklch(0.35 0.14 145)'
                                    : releaseProjection.status === 'at-risk' ? 'oklch(0.4 0.14 60)'
                                    : 'oklch(0.4 0.18 25)',
                                }}>
                                  {releaseProjection.status === 'on-track' ? 'On Track' : releaseProjection.status === 'at-risk' ? 'At Risk' : 'Delayed'}
                                </span>
                                <span className="text-[0.6875rem] text-muted-foreground">
                                  {releaseProjection.status === 'on-track'
                                    ? `Current team capacity (${releaseProjection.totalCapacityHrsPerSprint} hrs/sprint) is sufficient to complete ${releaseProjection.remaining} remaining items within ${releaseProjection.sprintsRemaining} sprints.`
                                    : releaseProjection.additionalMembersNeeded > 0
                                    ? `Capacity gap of ${releaseProjection.hrsGap.toLocaleString()} hrs. To meet target, add ${releaseProjection.additionalMembersNeeded} resource${releaseProjection.additionalMembersNeeded > 1 ? 's' : ''} (${releaseProjection.additionalDevs} Dev + ${releaseProjection.additionalQa} QA).`
                                    : `${releaseProjection.remaining} items remaining (est. ${releaseProjection.totalHrsNeeded.toLocaleString()} hrs). ${releaseProjection.hrsAvailableUntilRelease.toLocaleString()} hrs available until target.`}
                                </span>
                              </div>
                            </div>

                            {/* Key metrics */}
                            <div className="grid grid-cols-5 gap-3 mb-4">
                              {[
                                { label: 'Items Remaining', value: String(releaseProjection.remaining), color: 'oklch(0.25 0 0)' },
                                { label: 'Est. Hours Needed', value: releaseProjection.totalHrsNeeded.toLocaleString(), color: 'oklch(0.4 0.14 240)' },
                                { label: 'Hours Available', value: releaseProjection.hrsAvailableUntilRelease.toLocaleString(), color: releaseProjection.status === 'on-track' ? 'oklch(0.4 0.16 145)' : 'oklch(0.45 0.12 60)' },
                                { label: 'Sprints Remaining', value: String(releaseProjection.sprintsRemaining), color: 'oklch(0.4 0.16 145)' },
                                { label: 'Capacity Gap', value: releaseProjection.hrsGap > 0 ? `${releaseProjection.hrsGap.toLocaleString()} hrs` : 'None', color: releaseProjection.hrsGap > 0 ? 'oklch(0.5 0.22 25)' : 'oklch(0.4 0.16 145)' },
                              ].map(stat => (
                                <div key={stat.label} className="rounded-lg border border-border px-3 py-3 text-center" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
                                  <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
                                  <p className="text-[0.5625rem] text-muted-foreground mt-0.5">{stat.label}</p>
                                </div>
                              ))}
                            </div>

                            {/* Resource Recommendation -- always visible */}
                            <div className="rounded-lg border border-border overflow-hidden mb-4">
                              <div className="px-3 py-2 border-b border-border flex items-center gap-2" style={{ backgroundColor: 'oklch(0.97 0.005 260)' }}>
                                <TrendingUp className="size-3.5 text-foreground" />
                                <span className="text-[0.6875rem] font-semibold text-foreground">Resource Recommendation</span>
                              </div>
                              <div className="px-4 py-3" style={{ backgroundColor: 'oklch(0.99 0 0)' }}>
                                {releaseProjection.status === 'on-track' && releaseProjection.additionalMembersNeeded === 0 ? (
                                  <div className="flex items-center gap-3 py-2">
                                    <div className="size-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.5 0.2 145)' }} />
                                    <div>
                                      <p className="text-[0.6875rem] font-semibold" style={{ color: 'oklch(0.35 0.14 145)' }}>No additional resources needed</p>
                                      <p className="text-[0.5625rem] text-muted-foreground">
                                        Current team of {releaseProjection.currentTotal} members ({releaseProjection.currentDevs} Dev, {releaseProjection.currentQa} QA) providing {releaseProjection.totalCapacityHrsPerSprint} hrs/sprint is sufficient to deliver {releaseProjection.remaining} items by target date.
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="grid grid-cols-3 gap-4 mb-3">
                                      {/* Current team */}
                                      <div>
                                        <p className="text-[0.5625rem] font-semibold text-muted-foreground mb-1.5">Current Team</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[0.5625rem] font-semibold" style={{ backgroundColor: 'oklch(0.94 0.04 240)', color: 'oklch(0.4 0.14 240)' }}>
                                            {releaseProjection.currentDevs} Dev
                                          </span>
                                          <span className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[0.5625rem] font-semibold" style={{ backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.4 0.16 145)' }}>
                                            {releaseProjection.currentQa} QA
                                          </span>
                                          <span className="text-[0.5625rem] text-muted-foreground">= {releaseProjection.totalCapacityHrsPerSprint} hrs/sprint</span>
                                        </div>
                                      </div>
                                      {/* Additional needed */}
                                      <div>
                                        <p className="text-[0.5625rem] font-semibold mb-1.5" style={{ color: 'oklch(0.5 0.22 25)' }}>Additional Needed</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[0.5625rem] font-bold" style={{ backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.18 25)' }}>
                                            +{releaseProjection.additionalDevs} Dev
                                          </span>
                                          <span className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[0.5625rem] font-bold" style={{ backgroundColor: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.18 25)' }}>
                                            +{releaseProjection.additionalQa} QA
                                          </span>
                                        </div>
                                      </div>
                                      {/* Projected after */}
                                      <div>
                                        <p className="text-[0.5625rem] font-semibold mb-1.5" style={{ color: 'oklch(0.35 0.14 145)' }}>With Additional Resources</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[0.5625rem] font-semibold" style={{ backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
                                            {releaseProjection.currentDevs + releaseProjection.additionalDevs} Dev
                                          </span>
                                          <span className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[0.5625rem] font-semibold" style={{ backgroundColor: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)' }}>
                                            {releaseProjection.currentQa + releaseProjection.additionalQa} QA
                                          </span>
                                          {releaseProjection.projectedSprintsWithResources && (
                                            <span className="text-[0.5625rem] text-muted-foreground">= done in ~{releaseProjection.projectedSprintsWithResources} sprints</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-[0.5625rem] text-muted-foreground leading-relaxed" style={{ borderTop: '1px solid oklch(0.92 0.01 260)', paddingTop: '0.5rem' }}>
                                      Estimated <strong>{releaseProjection.hrsPerItem} hrs/item</strong> based on {releaseProjection.avgVelocity > 0 ? 'current velocity' : 'baseline estimate (8 hrs/item)'}.
                                      Current team provides <strong>{releaseProjection.totalCapacityHrsPerSprint} hrs/sprint</strong> across {releaseProjection.currentTotal} members.
                                      {releaseProjection.hrsGap > 0 && <> Capacity gap of <strong>{releaseProjection.hrsGap.toLocaleString()} hrs</strong> needs to be covered by additional resources.</>}
                                      {' '}Roles from <code className="text-[0.5rem] px-1 py-0.5 rounded" style={{ backgroundColor: 'oklch(0.95 0 0)' }}>lib/team-config.ts</code>.
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Sprint timeline */}
                            <div className="rounded-lg border border-border overflow-hidden">
                              <div className="px-3 py-2 border-b border-border" style={{ backgroundColor: 'oklch(0.97 0.005 260)' }}>
                                <span className="text-[0.6875rem] font-semibold text-foreground">Sprint Timeline</span>
                              </div>
                              <div className="overflow-x-auto px-3 py-3">
                                <div className="flex gap-1.5" style={{ minWidth: 'max-content' }}>
                                  {capacityInsights.sprints.all.map(sprint => {
                                    const isCurrent = sprint.timeFrame === 'current'
                                    const isPast = sprint.timeFrame === 'past'
                                    const isTarget = sprint.name === capacityInsights.sprints.targetSprintName
                                    const start = sprint.startDate ? new Date(sprint.startDate) : null
                                    const end = sprint.finishDate ? new Date(sprint.finishDate) : null
                                    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`

                                    return (
                                      <div
                                        key={sprint.name}
                                        className="rounded px-2 py-1.5 text-center flex-shrink-0"
                                        style={{
                                          minWidth: '5rem',
                                          backgroundColor: isCurrent ? 'oklch(0.94 0.04 240)' : isPast ? 'oklch(0.96 0.01 260)' : 'oklch(0.99 0 0)',
                                          border: isTarget ? '2px solid oklch(0.5 0.22 25)' : isCurrent ? '1.5px solid oklch(0.6 0.14 240)' : '1px solid oklch(0.9 0.01 260)',
                                        }}
                                      >
                                        <p className="text-[0.5625rem] font-semibold truncate" style={{ color: isCurrent ? 'oklch(0.35 0.14 240)' : 'oklch(0.4 0.01 260)' }}>
                                          {sprint.name.replace(/^.*_/, '')}
                                        </p>
                                        {start && end && (
                                          <p className="text-[0.5rem] text-muted-foreground">{fmt(start)}-{fmt(end)}</p>
                                        )}
                                        {isTarget && (
                                          <p className="text-[0.5rem] font-bold mt-0.5" style={{ color: 'oklch(0.5 0.22 25)' }}>TARGET</p>
                                        )}
                                        {isCurrent && !isTarget && (
                                          <p className="text-[0.5rem] font-bold mt-0.5" style={{ color: 'oklch(0.35 0.14 240)' }}>CURRENT</p>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Waiting for capacity and work item data to calculate projection...</p>
                        )}
                      </CollapsibleSection>
                    </>
                  )}

                  <p className="text-center text-xs text-muted-foreground/50 mt-8">
                    Dashboard derived from live ADO data (Epic 4651627). All metrics auto-calculated from work item states and team capacity.
                  </p>
                </>
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
