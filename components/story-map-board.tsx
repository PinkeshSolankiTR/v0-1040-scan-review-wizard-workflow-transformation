'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Plus, GripVertical, X, Pencil, Check, Trash2, ChevronDown, ChevronRight,
  Loader2, Filter, Search, Layers, Tag as TagIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AdoWorkItemFlat } from '@/app/api/ado-query/route'

/* ── Constants ── */
const STORAGE_KEY = 'storymap-local-data'

const WORK_ITEM_TYPES = ['User Story', 'Task', 'Bug', 'Spike'] as const
type WorkItemType = typeof WORK_ITEM_TYPES[number]

const LABELS = ['API', 'UI', 'Spike', 'Infrastructure', 'Database', 'Testing', 'Documentation'] as const
type Label = typeof LABELS[number]

const LABEL_COLORS: Record<Label, { bg: string; text: string }> = {
  API:            { bg: 'oklch(0.92 0.08 240)', text: 'oklch(0.35 0.14 240)' },
  UI:             { bg: 'oklch(0.92 0.08 300)', text: 'oklch(0.35 0.14 300)' },
  Spike:          { bg: 'oklch(0.92 0.08 80)',  text: 'oklch(0.35 0.14 80)' },
  Infrastructure: { bg: 'oklch(0.92 0.06 50)',  text: 'oklch(0.35 0.12 50)' },
  Database:       { bg: 'oklch(0.92 0.08 145)', text: 'oklch(0.35 0.14 145)' },
  Testing:        { bg: 'oklch(0.92 0.08 25)',  text: 'oklch(0.35 0.14 25)' },
  Documentation:  { bg: 'oklch(0.90 0.04 260)', text: 'oklch(0.35 0.06 260)' },
}

const TYPE_COLORS: Record<WorkItemType, { bg: string; text: string; dot: string }> = {
  'User Story': { bg: 'oklch(0.92 0.08 240)', text: 'oklch(0.35 0.14 240)', dot: 'oklch(0.55 0.2 240)' },
  'Task':       { bg: 'oklch(0.92 0.08 80)',  text: 'oklch(0.35 0.14 80)',  dot: 'oklch(0.6 0.2 80)' },
  'Bug':        { bg: 'oklch(0.92 0.1 25)',   text: 'oklch(0.35 0.18 25)',  dot: 'oklch(0.55 0.25 25)' },
  'Spike':      { bg: 'oklch(0.92 0.06 300)', text: 'oklch(0.35 0.12 300)', dot: 'oklch(0.55 0.15 300)' },
}

/* ── Types ── */
interface StoryCard {
  id: string
  title: string
  description: string
  workItemType: WorkItemType
  labels: Label[]
  source: 'ado' | 'local'
  adoId?: number
  state?: string
  order: number
}

interface StoryColumn {
  id: string
  title: string
  description: string
  source: 'ado' | 'local'
  adoId?: number
  cards: StoryCard[]
}

interface LocalData {
  columns: StoryColumn[]
  version: number
}

/* ── Helpers ── */
function generateId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function loadLocalData(): LocalData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LocalData
  } catch {
    return null
  }
}

function saveLocalData(data: LocalData) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/* ── Default columns ── */
const DEFAULT_COLUMNS: StoryColumn[] = [
  { id: 'default-superseded', title: 'Superseded Wizard', description: 'Identify and classify superseded documents within a binder', source: 'local', cards: [] },
  { id: 'default-duplicate', title: 'Duplicate Data Wizard', description: 'Detect and resolve duplicate data entries across documents', source: 'local', cards: [] },
  { id: 'default-cfa', title: 'CFA Wizard', description: 'Review and validate CFA-related document classifications', source: 'local', cards: [] },
  { id: 'default-nfr', title: 'NFR Wizard', description: 'Classify and handle Not For Review documents', source: 'local', cards: [] },
  { id: 'default-shared', title: 'Shared / Cross-Cutting', description: 'Components, services, and patterns shared across all wizards', source: 'local', cards: [] },
]

const ELIMINATION_WIZARD_EPIC_ID = 4651627

function collectDescendants(rootId: number, allItems: AdoWorkItemFlat[]): Set<number> {
  const descendants = new Set<number>()
  const queue = [rootId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const item of allItems) {
      if (item.parentId === current && !descendants.has(item.id)) {
        descendants.add(item.id)
        queue.push(item.id)
      }
    }
  }
  return descendants
}

function buildColumns(adoItems: AdoWorkItemFlat[], localData: LocalData | null): StoryColumn[] {
  const scopedIds = collectDescendants(ELIMINATION_WIZARD_EPIC_ID, adoItems)
  const scopedItems = adoItems.filter(item => scopedIds.has(item.id))
  const features = scopedItems.filter(item =>
    item.workItemType === 'Feature' && item.parentId === ELIMINATION_WIZARD_EPIC_ID
  )
  const adoColumns: StoryColumn[] = features.map(feature => {
    const featureDescendants = collectDescendants(feature.id, scopedItems)
    const children = scopedItems.filter(item => featureDescendants.has(item.id) && item.workItemType !== 'Feature')
    const cards: StoryCard[] = children.map((child, idx) => ({
      id: `ado-${child.id}`,
      title: child.title,
      description: child.description || '',
      workItemType: (WORK_ITEM_TYPES.includes(child.workItemType as WorkItemType) ? child.workItemType : 'Task') as WorkItemType,
      labels: extractLabels(child.tags),
      source: 'ado' as const,
      adoId: child.id,
      state: child.state,
      order: idx,
    }))
    return { id: `ado-col-${feature.id}`, title: feature.title, description: feature.description || '', source: 'ado' as const, adoId: feature.id, cards }
  })
  const baseColumns = adoColumns.length > 0 ? adoColumns : (localData?.columns.length ? [] : DEFAULT_COLUMNS)
  if (!localData) return baseColumns
  const merged: StoryColumn[] = []
  const localColMap = new Map(localData.columns.map(c => [c.id, c]))
  for (const baseCol of baseColumns) {
    const localCol = localColMap.get(baseCol.id)
    if (localCol) {
      const localOnlyCards = localCol.cards.filter(c => c.source === 'local')
      merged.push({ ...baseCol, cards: [...baseCol.cards, ...localOnlyCards] })
      localColMap.delete(baseCol.id)
    } else {
      merged.push(baseCol)
    }
  }
  for (const [, localCol] of localColMap) {
    if (localCol.source === 'local') merged.push(localCol)
  }
  return merged
}

function extractLabels(tags: string[]): Label[] {
  return tags.map(t => t.trim()).filter((t): t is Label => LABELS.includes(t as Label))
}

/* ══════════════════════════════════════════════
   COMPACT CARD (single row)
   ══════════════════════════════════════════════ */
function CompactCard({
  card,
  onEdit,
  onDelete,
  onDragStart,
}: {
  card: StoryCard
  onEdit: (card: StoryCard) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(card.title)
  const [desc, setDesc] = useState(card.description)
  const [type, setType] = useState(card.workItemType)
  const [labels, setLabels] = useState<Label[]>(card.labels)
  const tc = TYPE_COLORS[card.workItemType]

  const handleSave = () => {
    onEdit({ ...card, title: title.trim() || card.title, description: desc, workItemType: type, labels })
    setEditing(false)
  }

  const toggleLabel = (label: Label) => {
    setLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])
  }

  if (editing) {
    return (
      <div className="rounded-md border border-foreground/20 bg-card p-2.5 flex flex-col gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-foreground"
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }} autoFocus />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
          className="rounded border border-border bg-background px-2 py-1 text-[0.6875rem] text-foreground outline-none focus:ring-1 focus:ring-foreground resize-none" />
        <div className="flex flex-wrap gap-1">
          {WORK_ITEM_TYPES.map(t => {
            const isSelected = type === t; const c = TYPE_COLORS[t]
            return (
              <button key={t} type="button" onClick={() => setType(t)}
                className="rounded-full px-2 py-0.5 text-[0.5625rem] font-medium transition-all"
                style={{ backgroundColor: isSelected ? c.bg : 'transparent', color: isSelected ? c.text : 'var(--muted-foreground)', border: `1px solid ${isSelected ? c.text : 'var(--border)'}` }}>
                {t}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-1">
          {LABELS.map(label => {
            const isSelected = labels.includes(label); const c = LABEL_COLORS[label]
            return (
              <button key={label} type="button" onClick={() => toggleLabel(label)}
                className="rounded-full px-2 py-0.5 text-[0.5rem] font-medium"
                style={{ backgroundColor: isSelected ? c.bg : 'transparent', color: isSelected ? c.text : 'var(--muted-foreground)', border: `1px solid ${isSelected ? c.text : 'var(--border)'}` }}>
                {label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={handleSave} className="text-[0.625rem] h-6 px-2"><Check className="size-2.5" /> Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-[0.625rem] h-6 px-2">Cancel</Button>
        </div>
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, card.id, '')}
      className="group flex items-start gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 cursor-grab active:cursor-grabbing transition-all hover:shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: tc.dot }}
    >
      <GripVertical className="size-3 text-muted-foreground/40 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Type dot + badge */}
          <span className="rounded-full px-1.5 py-0 text-[0.5rem] font-medium flex items-center gap-0.5 shrink-0"
            style={{ backgroundColor: tc.bg, color: tc.text }}>
            <span className="size-1 rounded-full" style={{ backgroundColor: tc.dot }} />
            {card.workItemType}
          </span>
          {/* Title */}
          <button type="button" onClick={() => setExpanded(p => !p)}
            className="text-xs font-medium text-foreground leading-tight text-left truncate hover:underline min-w-0 flex-1">
            {card.title}
          </button>
          {/* State */}
          {card.state && (
            <span className="rounded-full px-1.5 py-0 text-[0.5rem] font-medium bg-muted text-muted-foreground shrink-0">
              {card.state}
            </span>
          )}
          {/* ADO ID */}
          {card.source === 'ado' && card.adoId && (
            <span className="text-[0.5rem] font-mono text-muted-foreground/60 shrink-0">#{card.adoId}</span>
          )}
        </div>

        {/* Labels row */}
        {card.labels.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-0.5 ml-0.5">
            {card.labels.map(label => {
              const c = LABEL_COLORS[label]
              return <span key={label} className="rounded-full px-1 py-0 text-[0.4375rem] font-medium" style={{ backgroundColor: c.bg, color: c.text }}>{label}</span>
            })}
          </div>
        )}

        {/* Expandable description */}
        {expanded && card.description && (
          <p className="text-[0.625rem] text-muted-foreground leading-relaxed mt-1 border-t border-border/50 pt-1">{card.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={() => { setTitle(card.title); setDesc(card.description); setType(card.workItemType); setLabels(card.labels); setEditing(true) }}
          className="rounded p-0.5 hover:bg-muted" aria-label="Edit card">
          <Pencil className="size-2.5 text-muted-foreground" />
        </button>
        {card.source === 'local' && (
          <button type="button" onClick={() => onDelete(card.id)} className="rounded p-0.5 hover:bg-muted" aria-label="Delete card">
            <Trash2 className="size-2.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   INLINE ADD CARD (compact)
   ══════════════════════════════════════════════ */
function InlineAddCard({ onAdd, onCancel }: { onAdd: (card: Omit<StoryCard, 'id' | 'order' | 'source'>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<WorkItemType>('User Story')
  const [showMore, setShowMore] = useState(false)
  const [desc, setDesc] = useState('')
  const [labels, setLabels] = useState<Label[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const toggleLabel = (label: Label) => setLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])

  const handleSubmit = () => {
    if (!title.trim()) return
    onAdd({ title: title.trim(), description: desc.trim(), workItemType: type, labels })
    setTitle(''); setDesc(''); setType('User Story'); setLabels([]); setShowMore(false)
  }

  return (
    <div className="rounded-md border border-dashed border-border bg-muted/20 p-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5">
          {WORK_ITEM_TYPES.map(t => {
            const isSelected = type === t; const c = TYPE_COLORS[t]
            return (
              <button key={t} type="button" onClick={() => setType(t)}
                className="rounded-full px-1.5 py-0 text-[0.5rem] font-medium transition-all"
                style={{ backgroundColor: isSelected ? c.bg : 'transparent', color: isSelected ? c.text : 'var(--muted-foreground)', border: `1px solid ${isSelected ? c.text : 'var(--border)'}` }}>
                {t}
              </button>
            )
          })}
        </div>
        <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)} placeholder="Card title..."
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground min-w-0"
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) handleSubmit(); if (e.key === 'Escape') onCancel() }} />
        <Button size="sm" onClick={handleSubmit} disabled={!title.trim()} className="text-[0.625rem] h-6 px-2 shrink-0">
          <Plus className="size-2.5" /> Add
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-[0.625rem] h-6 px-1.5 shrink-0">
          <X className="size-2.5" />
        </Button>
      </div>
      <button type="button" onClick={() => setShowMore(p => !p)}
        className="text-[0.5625rem] text-muted-foreground hover:text-foreground flex items-center gap-0.5 self-start">
        {showMore ? <ChevronDown className="size-2.5" /> : <ChevronRight className="size-2.5" />}
        Description & Labels
      </button>
      {showMore && (
        <div className="flex flex-col gap-1.5">
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" rows={2}
            className="rounded border border-border bg-background px-2 py-1 text-[0.625rem] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground resize-none" />
          <div className="flex flex-wrap gap-0.5">
            {LABELS.map(label => {
              const isSelected = labels.includes(label); const c = LABEL_COLORS[label]
              return (
                <button key={label} type="button" onClick={() => toggleLabel(label)}
                  className="rounded-full px-1.5 py-0 text-[0.5rem] font-medium"
                  style={{ backgroundColor: isSelected ? c.bg : 'transparent', color: isSelected ? c.text : 'var(--muted-foreground)', border: `1px solid ${isSelected ? c.text : 'var(--border)'}` }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   FEATURE ROW (replaces column layout)
   ══════════════════════════════════════════════ */
function FeatureRow({
  column,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onDeleteColumn,
  onEditColumn,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverColumnId,
  defaultExpanded,
}: {
  column: StoryColumn
  onAddCard: (columnId: string, card: Omit<StoryCard, 'id' | 'order' | 'source'>) => void
  onEditCard: (columnId: string, card: StoryCard) => void
  onDeleteCard: (columnId: string, cardId: string) => void
  onDeleteColumn: (columnId: string) => void
  onEditColumn: (columnId: string, title: string) => void
  onDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void
  onDragOver: (e: React.DragEvent, columnId: string) => void
  onDrop: (e: React.DragEvent, columnId: string) => void
  dragOverColumnId: string | null
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(column.title)
  const isDragOver = dragOverColumnId === column.id

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    column.cards.forEach(c => { counts[c.workItemType] = (counts[c.workItemType] || 0) + 1 })
    return counts
  }, [column.cards])

  return (
    <div
      className="rounded-lg border transition-colors"
      style={{
        borderColor: isDragOver ? 'var(--foreground)' : 'var(--border)',
        backgroundColor: isDragOver ? 'oklch(0.97 0.01 260)' : undefined,
      }}
      onDragOver={e => { e.preventDefault(); onDragOver(e, column.id) }}
      onDrop={e => onDrop(e, column.id)}
    >
      {/* Feature header -- always visible */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={() => setExpanded(p => !p)} className="shrink-0 rounded p-0.5 hover:bg-muted" aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <ChevronDown className="size-3.5 text-foreground" /> : <ChevronRight className="size-3.5 text-foreground" />}
        </button>
        <Layers className="size-3.5 text-foreground shrink-0" />
        {editingTitle ? (
          <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
            onBlur={() => { onEditColumn(column.id, titleDraft.trim() || column.title); setEditingTitle(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { onEditColumn(column.id, titleDraft.trim() || column.title); setEditingTitle(false) } }}
            className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-sm font-semibold text-foreground outline-none focus:ring-1 focus:ring-foreground"
            autoFocus />
        ) : (
          <button type="button" onClick={() => { setTitleDraft(column.title); setEditingTitle(true) }}
            className="flex-1 text-left text-sm font-semibold text-foreground hover:underline truncate" title={column.title}>
            {column.title}
          </button>
        )}

        {/* Type breakdown badges */}
        <div className="flex items-center gap-1 shrink-0">
          {Object.entries(typeCounts).map(([type, count]) => {
            const tc = TYPE_COLORS[type as WorkItemType]
            return tc ? (
              <span key={type} className="rounded-full px-1.5 py-0 text-[0.5rem] font-medium flex items-center gap-0.5"
                style={{ backgroundColor: tc.bg, color: tc.text }}>
                <span className="size-1 rounded-full" style={{ backgroundColor: tc.dot }} />
                {count}
              </span>
            ) : null
          })}
          <Badge variant="secondary" className="text-[0.5625rem] px-1.5 py-0">{column.cards.length}</Badge>
        </div>

        {column.source === 'ado' && column.adoId && (
          <span className="text-[0.5rem] font-mono text-muted-foreground/60 shrink-0">#{column.adoId}</span>
        )}
        {column.source === 'local' && (
          <button type="button" onClick={() => onDeleteColumn(column.id)} className="rounded p-0.5 hover:bg-muted shrink-0" aria-label="Delete feature">
            <Trash2 className="size-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Expanded: show cards */}
      {expanded && (
        <div className="border-t border-border px-3 pb-2 pt-1.5">
          <div className="flex flex-col gap-1">
            {column.cards
              .sort((a, b) => a.order - b.order)
              .map(card => (
                <CompactCard
                  key={card.id}
                  card={card}
                  onEdit={updated => onEditCard(column.id, updated)}
                  onDelete={cardId => onDeleteCard(column.id, cardId)}
                  onDragStart={(e, cardId) => onDragStart(e, cardId, column.id)}
                />
              ))}
          </div>

          {/* Add card */}
          {showAddForm ? (
            <div className="mt-1.5">
              <InlineAddCard
                onAdd={card => { onAddCard(column.id, card); setShowAddForm(false) }}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          ) : (
            <button type="button" onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 mt-1.5 rounded-md border border-dashed border-border px-2 py-1 text-[0.625rem] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors w-full justify-center">
              <Plus className="size-2.5" /> Add card
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   ADD FEATURE FORM (inline)
   ══════════════════════════════════════════════ */
function AddFeatureForm({ onAdd, onCancel }: { onAdd: (title: string, desc: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="rounded-lg border border-dashed border-border p-3 flex items-center gap-2">
      <Layers className="size-3.5 text-muted-foreground shrink-0" />
      <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)} placeholder="Feature / Wizard title..."
        className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground min-w-0"
        onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onAdd(title.trim(), desc.trim()); if (e.key === 'Escape') onCancel() }} />
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
        className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground min-w-0 max-w-xs" />
      <Button size="sm" onClick={() => { if (title.trim()) onAdd(title.trim(), desc.trim()) }} disabled={!title.trim()} className="text-xs h-7 shrink-0">
        <Plus className="size-3" /> Add
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs h-7 shrink-0"><X className="size-3" /></Button>
    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN BOARD
   ══════════════════════════════════════════════ */
export function StoryMapBoard({ adoItems, isLoading }: { adoItems: AdoWorkItemFlat[]; isLoading: boolean }) {
  const [localData, setLocalData] = useState<LocalData | null>(null)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<WorkItemType | 'all'>('all')
  const [labelFilter, setLabelFilter] = useState<Label | 'all'>('all')
  const [dragState, setDragState] = useState<{ cardId: string; fromColumnId: string } | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [expandAll, setExpandAll] = useState(true)

  useEffect(() => { setLocalData(loadLocalData()) }, [])

  const columns = useMemo(() => buildColumns(adoItems, localData), [adoItems, localData])

  const persist = useCallback((updater: (cols: StoryColumn[]) => StoryColumn[]) => {
    setLocalData(prev => {
      const current = prev ?? { columns: [], version: 1 }
      const merged = buildColumns(adoItems, current)
      const updated = updater(merged)
      const next: LocalData = { columns: updated, version: current.version + 1 }
      saveLocalData(next)
      return next
    })
  }, [adoItems])

  const addColumn = useCallback((title: string, description: string) => {
    persist(cols => [...cols, { id: generateId(), title, description, source: 'local' as const, cards: [] }])
    setShowAddColumn(false)
  }, [persist])

  const deleteColumn = useCallback((columnId: string) => {
    persist(cols => cols.filter(c => c.id !== columnId))
  }, [persist])

  const editColumnTitle = useCallback((columnId: string, title: string) => {
    persist(cols => cols.map(c => c.id === columnId ? { ...c, title } : c))
  }, [persist])

  const addCard = useCallback((columnId: string, card: Omit<StoryCard, 'id' | 'order' | 'source'>) => {
    persist(cols => cols.map(c => {
      if (c.id !== columnId) return c
      return { ...c, cards: [...c.cards, { ...card, id: generateId(), source: 'local', order: c.cards.length }] }
    }))
  }, [persist])

  const editCard = useCallback((columnId: string, card: StoryCard) => {
    persist(cols => cols.map(c => {
      if (c.id !== columnId) return c
      return { ...c, cards: c.cards.map(existing => existing.id === card.id ? card : existing) }
    }))
  }, [persist])

  const deleteCard = useCallback((columnId: string, cardId: string) => {
    persist(cols => cols.map(c => {
      if (c.id !== columnId) return c
      return { ...c, cards: c.cards.filter(card => card.id !== cardId) }
    }))
  }, [persist])

  const handleDragStart = useCallback((e: React.DragEvent, cardId: string, columnId: string) => {
    setDragState({ cardId, fromColumnId: columnId }); e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((_e: React.DragEvent, columnId: string) => { setDragOverColumnId(columnId) }, [])

  const handleDrop = useCallback((_e: React.DragEvent, toColumnId: string) => {
    if (!dragState) return
    const { cardId, fromColumnId } = dragState
    if (fromColumnId === toColumnId) { setDragState(null); setDragOverColumnId(null); return }
    persist(cols => {
      let movedCard: StoryCard | null = null
      const withoutCard = cols.map(c => {
        if (c.id !== fromColumnId) return c
        const card = c.cards.find(card => card.id === cardId)
        if (card) movedCard = { ...card }
        return { ...c, cards: c.cards.filter(card => card.id !== cardId) }
      })
      if (!movedCard) return cols
      return withoutCard.map(c => {
        if (c.id !== toColumnId) return c
        return { ...c, cards: [...c.cards, { ...movedCard!, order: c.cards.length }] }
      })
    })
    setDragState(null); setDragOverColumnId(null)
  }, [dragState, persist])

  const filteredColumns = useMemo(() => {
    return columns.map(col => {
      const filtered = col.cards.filter(card => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          if (!card.title.toLowerCase().includes(q) && !card.description.toLowerCase().includes(q)) return false
        }
        if (typeFilter !== 'all' && card.workItemType !== typeFilter) return false
        if (labelFilter !== 'all' && !card.labels.includes(labelFilter)) return false
        return true
      })
      return { ...col, cards: filtered }
    })
  }, [columns, searchQuery, typeFilter, labelFilter])

  const totalCards = columns.reduce((sum, c) => sum + c.cards.length, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading work items from ADO...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header + Toolbar combined */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 mr-auto">
          <div className="flex size-7 items-center justify-center rounded-md bg-foreground">
            <Layers className="size-3.5 text-background" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">Phase 1: Elimination of Wizard</p>
            <p className="text-[0.625rem] text-muted-foreground">{filteredColumns.length} features &middot; {totalCards} cards</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[160px] max-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..."
            className="w-full rounded-md border border-border bg-background pl-7 pr-6 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground" />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <X className="size-2.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1">
          <Filter className="size-2.5 text-muted-foreground" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as WorkItemType | 'all')}
            className="rounded-md border border-border bg-background px-1.5 py-1 text-[0.625rem] text-foreground outline-none focus:ring-1 focus:ring-foreground">
            <option value="all">All Types</option>
            {WORK_ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <TagIcon className="size-2.5 text-muted-foreground" />
          <select value={labelFilter} onChange={e => setLabelFilter(e.target.value as Label | 'all')}
            className="rounded-md border border-border bg-background px-1.5 py-1 text-[0.625rem] text-foreground outline-none focus:ring-1 focus:ring-foreground">
            <option value="all">All Labels</option>
            {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Expand/Collapse all */}
        <Button size="sm" variant="ghost" onClick={() => setExpandAll(p => !p)} className="text-[0.625rem] h-6 px-2">
          {expandAll ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          {expandAll ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      {/* Feature list (vertical) */}
      <div className="flex flex-col gap-2" onDragLeave={() => setDragOverColumnId(null)}>
        {filteredColumns.map(column => (
          <FeatureRow
            key={column.id}
            column={column}
            onAddCard={addCard}
            onEditCard={editCard}
            onDeleteCard={deleteCard}
            onDeleteColumn={deleteColumn}
            onEditColumn={editColumnTitle}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragOverColumnId={dragOverColumnId}
            defaultExpanded={expandAll}
          />
        ))}

        {/* Add feature */}
        {showAddColumn ? (
          <AddFeatureForm onAdd={addColumn} onCancel={() => setShowAddColumn(false)} />
        ) : (
          <button type="button" onClick={() => setShowAddColumn(true)}
            className="flex items-center gap-1.5 justify-center rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            <Plus className="size-3.5" /> Add Wizard / Feature
          </button>
        )}
      </div>
    </div>
  )
}
