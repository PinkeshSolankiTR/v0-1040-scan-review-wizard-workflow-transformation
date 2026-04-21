'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Plus, GripVertical, X, Pencil, Check, Trash2, ChevronDown,
  Loader2, Filter, Search, Layers, Tag as TagIcon, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

/* ── Merge ADO items with local data ── */
function buildColumns(adoItems: AdoWorkItemFlat[], localData: LocalData | null): StoryColumn[] {
  const allMap = new Map<number, AdoWorkItemFlat>()
  adoItems.forEach(item => allMap.set(item.id, item))

  /* Find top-level items (Epics/Features with no parent, or parent not in dataset) */
  const topLevel = adoItems.filter(item => {
    const isTopType = ['Epic', 'Feature'].includes(item.workItemType)
    const parentMissing = !item.parentId || !allMap.has(item.parentId)
    return isTopType && parentMissing
  })

  /* Build ADO columns */
  const adoColumns: StoryColumn[] = topLevel.map(parent => {
    const children = adoItems.filter(item => item.parentId === parent.id && item.id !== parent.id)
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
    return {
      id: `ado-col-${parent.id}`,
      title: parent.title,
      description: parent.description || '',
      source: 'ado' as const,
      adoId: parent.id,
      cards,
    }
  })

  if (!localData) return adoColumns

  /* Merge: keep local columns, update ADO columns with any local card additions */
  const merged: StoryColumn[] = []
  const localColMap = new Map(localData.columns.map(c => [c.id, c]))

  /* First add ADO columns in their original order, merging local cards */
  for (const adoCol of adoColumns) {
    const localCol = localColMap.get(adoCol.id)
    if (localCol) {
      /* Merge: ADO cards first, then local-only cards */
      const localOnlyCards = localCol.cards.filter(c => c.source === 'local')
      merged.push({ ...adoCol, cards: [...adoCol.cards, ...localOnlyCards] })
      localColMap.delete(adoCol.id)
    } else {
      merged.push(adoCol)
    }
  }

  /* Then add purely local columns */
  for (const [, localCol] of localColMap) {
    if (localCol.source === 'local') {
      merged.push(localCol)
    }
  }

  return merged
}

function extractLabels(tags: string[]): Label[] {
  return tags
    .map(t => t.trim())
    .filter((t): t is Label => LABELS.includes(t as Label))
}

/* ══════════════════════════════════════════════
   COMPONENTS
   ══════════════════════════════════════════════ */

/* ── Add Column Form ── */
function AddColumnForm({ onAdd, onCancel }: { onAdd: (title: string, desc: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 min-w-[280px] shrink-0">
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Feature / Epic title"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground"
        onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onAdd(title.trim(), desc.trim()) }}
      />
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground resize-none"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => { if (title.trim()) onAdd(title.trim(), desc.trim()) }} disabled={!title.trim()} className="text-xs h-7">
          <Plus className="size-3" /> Add Column
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs h-7">Cancel</Button>
      </div>
    </div>
  )
}

/* ── Add Card Form ── */
function AddCardForm({ onAdd, onCancel }: { onAdd: (card: Omit<StoryCard, 'id' | 'order' | 'source'>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [type, setType] = useState<WorkItemType>('User Story')
  const [labels, setLabels] = useState<Label[]>([])
  const [showLabels, setShowLabels] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const toggleLabel = (label: Label) => {
    setLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])
  }

  const handleSubmit = () => {
    if (!title.trim()) return
    onAdd({ title: title.trim(), description: desc.trim(), workItemType: type, labels })
    setTitle('')
    setDesc('')
    setType('User Story')
    setLabels([])
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 flex flex-col gap-2">
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Card title"
        className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground"
        onKeyDown={e => { if (e.key === 'Enter' && title.trim()) handleSubmit() }}
      />
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[0.6875rem] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground resize-none"
      />
      {/* Work Item Type Selector */}
      <div className="flex flex-wrap gap-1">
        {WORK_ITEM_TYPES.map(t => {
          const isSelected = type === t
          const c = TYPE_COLORS[t]
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="rounded-full px-2 py-0.5 text-[0.625rem] font-medium transition-all"
              style={{
                backgroundColor: isSelected ? c.bg : 'transparent',
                color: isSelected ? c.text : 'var(--muted-foreground)',
                border: `1px solid ${isSelected ? c.text : 'var(--border)'}`,
              }}
            >
              {t}
            </button>
          )
        })}
      </div>
      {/* Labels */}
      <div>
        <button type="button" onClick={() => setShowLabels(p => !p)} className="flex items-center gap-1 text-[0.625rem] text-muted-foreground hover:text-foreground">
          <TagIcon className="size-2.5" /> {showLabels ? 'Hide labels' : 'Add labels'}
          <ChevronDown className="size-2.5" style={{ transform: showLabels ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
        {showLabels && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {LABELS.map(label => {
              const isSelected = labels.includes(label)
              const c = LABEL_COLORS[label]
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleLabel(label)}
                  className="rounded-full px-2 py-0.5 text-[0.5625rem] font-medium transition-all"
                  style={{
                    backgroundColor: isSelected ? c.bg : 'transparent',
                    color: isSelected ? c.text : 'var(--muted-foreground)',
                    border: `1px solid ${isSelected ? c.text : 'var(--border)'}`,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSubmit} disabled={!title.trim()} className="text-xs h-7">
          <Plus className="size-3" /> Add Card
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs h-7">Cancel</Button>
      </div>
    </div>
  )
}

/* ── Story Card ── */
function StoryCardItem({
  card,
  onEdit,
  onDelete,
  onDragStart,
  isDragging,
}: {
  card: StoryCard
  onEdit: (card: StoryCard) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void
  isDragging: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(card.title)
  const [desc, setDesc] = useState(card.description)
  const [type, setType] = useState(card.workItemType)
  const [labels, setLabels] = useState<Label[]>(card.labels)
  const [showLabels, setShowLabels] = useState(false)

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
      <div className="rounded-lg border border-foreground/20 bg-card p-2.5 flex flex-col gap-2 shadow-sm">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-foreground"
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          autoFocus
        />
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={2}
          className="rounded border border-border bg-background px-2 py-1 text-[0.6875rem] text-foreground outline-none focus:ring-1 focus:ring-foreground resize-none"
        />
        <div className="flex flex-wrap gap-1">
          {WORK_ITEM_TYPES.map(t => {
            const isSelected = type === t
            const c = TYPE_COLORS[t]
            return (
              <button key={t} type="button" onClick={() => setType(t)}
                className="rounded-full px-2 py-0.5 text-[0.5625rem] font-medium transition-all"
                style={{ backgroundColor: isSelected ? c.bg : 'transparent', color: isSelected ? c.text : 'var(--muted-foreground)', border: `1px solid ${isSelected ? c.text : 'var(--border)'}` }}
              >
                {t}
              </button>
            )
          })}
        </div>
        <div>
          <button type="button" onClick={() => setShowLabels(p => !p)} className="flex items-center gap-1 text-[0.625rem] text-muted-foreground hover:text-foreground">
            <TagIcon className="size-2.5" /> Labels
          </button>
          {showLabels && (
            <div className="flex flex-wrap gap-1 mt-1">
              {LABELS.map(label => {
                const isSelected = labels.includes(label)
                const c = LABEL_COLORS[label]
                return (
                  <button key={label} type="button" onClick={() => toggleLabel(label)}
                    className="rounded-full px-2 py-0.5 text-[0.5rem] font-medium"
                    style={{ backgroundColor: isSelected ? c.bg : 'transparent', color: isSelected ? c.text : 'var(--muted-foreground)', border: `1px solid ${isSelected ? c.text : 'var(--border)'}` }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
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
      className="group rounded-lg border border-border bg-card p-2.5 flex flex-col gap-1.5 cursor-grab active:cursor-grabbing transition-all hover:shadow-sm"
      style={{ opacity: isDragging ? 0.4 : 1, borderLeftWidth: 3, borderLeftColor: tc.dot }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <GripVertical className="size-3 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{card.title}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => setEditing(true)} className="rounded p-0.5 hover:bg-muted" aria-label="Edit card">
            <Pencil className="size-3 text-muted-foreground" />
          </button>
          {card.source === 'local' && (
            <button type="button" onClick={() => onDelete(card.id)} className="rounded p-0.5 hover:bg-muted" aria-label="Delete card">
              <Trash2 className="size-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      {/* Description */}
      {card.description && (
        <p className="text-[0.625rem] text-muted-foreground leading-relaxed line-clamp-2 pl-[18px]">{card.description}</p>
      )}
      {/* Badges row */}
      <div className="flex flex-wrap gap-1 pl-[18px]">
        <span
          className="rounded-full px-1.5 py-0 text-[0.5625rem] font-medium flex items-center gap-1"
          style={{ backgroundColor: tc.bg, color: tc.text }}
        >
          <span className="size-1 rounded-full" style={{ backgroundColor: tc.dot }} />
          {card.workItemType}
        </span>
        {card.state && (
          <span className="rounded-full px-1.5 py-0 text-[0.5625rem] font-medium bg-muted text-muted-foreground">
            {card.state}
          </span>
        )}
        {card.labels.map(label => {
          const c = LABEL_COLORS[label]
          return (
            <span key={label} className="rounded-full px-1.5 py-0 text-[0.5rem] font-medium" style={{ backgroundColor: c.bg, color: c.text }}>
              {label}
            </span>
          )
        })}
        {card.source === 'ado' && card.adoId && (
          <span className="rounded-full px-1.5 py-0 text-[0.5rem] font-mono text-muted-foreground bg-muted/50">
            ADO #{card.adoId}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Column ── */
function StoryColumn({
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
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(column.title)
  const isDragOver = dragOverColumnId === column.id

  return (
    <div
      className="flex flex-col rounded-xl border bg-muted/20 min-w-[280px] w-[280px] shrink-0 transition-colors"
      style={{
        borderColor: isDragOver ? 'var(--foreground)' : 'var(--border)',
        backgroundColor: isDragOver ? 'oklch(0.97 0.01 260)' : undefined,
      }}
      onDragOver={e => { e.preventDefault(); onDragOver(e, column.id) }}
      onDrop={e => onDrop(e, column.id)}
    >
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Layers className="size-3.5 text-foreground shrink-0" />
          {editingTitle ? (
            <input
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={() => { onEditColumn(column.id, titleDraft.trim() || column.title); setEditingTitle(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { onEditColumn(column.id, titleDraft.trim() || column.title); setEditingTitle(false) } }}
              className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-foreground"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => { setTitleDraft(column.title); setEditingTitle(true) }}
              className="flex-1 text-left text-xs font-semibold text-foreground truncate hover:underline"
              title="Click to edit"
            >
              {column.title}
            </button>
          )}
          <Badge variant="secondary" className="text-[0.5625rem] px-1.5 py-0 shrink-0">{column.cards.length}</Badge>
        </div>
        {column.source === 'local' && (
          <button type="button" onClick={() => onDeleteColumn(column.id)} className="rounded p-0.5 hover:bg-muted" aria-label="Delete column">
            <Trash2 className="size-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-380px)]">
        {column.cards
          .sort((a, b) => a.order - b.order)
          .map(card => (
            <StoryCardItem
              key={card.id}
              card={card}
              onEdit={updated => onEditCard(column.id, updated)}
              onDelete={cardId => onDeleteCard(column.id, cardId)}
              onDragStart={(e, cardId) => onDragStart(e, cardId, column.id)}
              isDragging={false}
            />
          ))}

        {/* Add card */}
        {showAddForm ? (
          <AddCardForm
            onAdd={card => { onAddCard(column.id, card); setShowAddForm(false) }}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <Plus className="size-3" /> Add card
          </button>
        )}
      </div>
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

  /* Load local data on mount */
  useEffect(() => {
    setLocalData(loadLocalData())
  }, [])

  /* Merge ADO + local */
  const columns = useMemo(() => buildColumns(adoItems, localData), [adoItems, localData])

  /* Persist helper */
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

  /* ── Column actions ── */
  const addColumn = useCallback((title: string, description: string) => {
    persist(cols => [
      ...cols,
      { id: generateId(), title, description, source: 'local' as const, cards: [] },
    ])
    setShowAddColumn(false)
  }, [persist])

  const deleteColumn = useCallback((columnId: string) => {
    persist(cols => cols.filter(c => c.id !== columnId))
  }, [persist])

  const editColumnTitle = useCallback((columnId: string, title: string) => {
    persist(cols => cols.map(c => c.id === columnId ? { ...c, title } : c))
  }, [persist])

  /* ── Card actions ── */
  const addCard = useCallback((columnId: string, card: Omit<StoryCard, 'id' | 'order' | 'source'>) => {
    persist(cols => cols.map(c => {
      if (c.id !== columnId) return c
      const newCard: StoryCard = {
        ...card,
        id: generateId(),
        source: 'local',
        order: c.cards.length,
      }
      return { ...c, cards: [...c.cards, newCard] }
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

  /* ── Drag & Drop ── */
  const handleDragStart = useCallback((e: React.DragEvent, cardId: string, columnId: string) => {
    setDragState({ cardId, fromColumnId: columnId })
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((_e: React.DragEvent, columnId: string) => {
    setDragOverColumnId(columnId)
  }, [])

  const handleDrop = useCallback((_e: React.DragEvent, toColumnId: string) => {
    if (!dragState) return
    const { cardId, fromColumnId } = dragState

    if (fromColumnId === toColumnId) {
      setDragState(null)
      setDragOverColumnId(null)
      return
    }

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

    setDragState(null)
    setDragOverColumnId(null)
  }, [dragState, persist])

  /* ── Filtering ── */
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
  const totalLocal = columns.reduce((sum, c) => sum + c.cards.filter(card => card.source === 'local').length, 0)
  const totalAdo = totalCards - totalLocal

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading work items from ADO...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search cards..."
            className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="size-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="size-3 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as WorkItemType | 'all')}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="all">All Types</option>
            {WORK_ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Label filter */}
        <div className="flex items-center gap-1.5">
          <TagIcon className="size-3 text-muted-foreground" />
          <select
            value={labelFilter}
            onChange={e => setLabelFilter(e.target.value as Label | 'all')}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="all">All Labels</option>
            {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-[0.625rem] text-muted-foreground">
            {filteredColumns.length} columns &middot; {totalCards} cards ({totalAdo} ADO, {totalLocal} local)
          </span>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4" onDragLeave={() => setDragOverColumnId(null)}>
        {filteredColumns.map(column => (
          <StoryColumn
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
          />
        ))}

        {/* Add column */}
        {showAddColumn ? (
          <AddColumnForm onAdd={addColumn} onCancel={() => setShowAddColumn(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddColumn(true)}
            className="flex items-center gap-2 rounded-xl border border-dashed border-border min-w-[280px] w-[280px] shrink-0 px-4 py-8 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors justify-center"
          >
            <Plus className="size-4" /> Add Feature / Epic
          </button>
        )}
      </div>

      {/* Footer note */}
      <p className="text-center text-[0.625rem] text-muted-foreground/60">
        ADO cards are read-only. Locally added cards and columns persist across sessions.
        Drag cards between columns to reorganize.
      </p>
    </div>
  )
}
