/* ── Azure DevOps Query API Route ──
   Fetches work items from an ADO saved query and returns
   the Epic > Feature > Spike hierarchy for the delivery roadmap.
   ─────────────────────────────────────────────────────────── */

import { NextResponse } from 'next/server'

/* ── ADO config ── */
const ADO_ORG = 'tr-tax'
const ADO_PROJECT = 'TaxProf'
const QUERY_ID = '2788c428-8768-429b-8b28-4bcfa0bb26cc'
const ADO_API_VERSION = '7.1'

/* ── Types ── */
interface AdoWorkItem {
  id: number
  fields: Record<string, unknown>
}

interface AdoQueryResult {
  queryType: string
  queryResultType: string
  workItems?: { id: number; url: string }[]
  workItemRelations?: {
    rel: string | null
    source: { id: number; url: string } | null
    target: { id: number; url: string }
  }[]
  columns?: { referenceName: string; name: string; url: string }[]
}

export interface RoadmapSpike {
  id: string
  title: string
  description: string
  state: string
  assignedTo: string
  tags: string[]
  iterationPath: string
  areaPath: string
  workItemType: string
  url: string
}

export interface RoadmapFeature {
  id: string
  title: string
  description: string
  state: string
  assignedTo: string
  tags: string[]
  accentColor: string
  category: 'wizard' | 'cross-cutting'
  spikes: RoadmapSpike[]
  url: string
}

export interface RoadmapEpic {
  id: string
  title: string
  description: string
  state: string
  features: RoadmapFeature[]
  url: string
}

/* ── Helpers ── */
function getAuthHeader(): string {
  const pat = process.env.ADO_PAT
  if (!pat) throw new Error('ADO_PAT environment variable is not set')
  return `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
}

function adoUrl(path: string): string {
  return `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis/${path}?api-version=${ADO_API_VERSION}`
}

function workItemUrl(id: number): string {
  return `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_workitems/edit/${id}`
}

/* Feature accent colors -- wizard-specific get unique colors, cross-cutting gets neutral */
const WIZARD_COLORS = [
  'oklch(0.55 0.18 290)',
  'oklch(0.55 0.15 250)',
  'oklch(0.55 0.17 200)',
  'oklch(0.55 0.17 145)',
  'oklch(0.55 0.17 165)',
  'oklch(0.6 0.15 60)',
  'oklch(0.55 0.15 330)',
  'oklch(0.55 0.17 110)',
  'oklch(0.55 0.15 20)',
]
const CROSS_CUTTING_COLOR = 'oklch(0.5 0.01 260)'

function inferCategory(title: string, tags: string[]): 'wizard' | 'cross-cutting' {
  const lowerTitle = title.toLowerCase()
  const lowerTags = tags.map(t => t.toLowerCase())
  if (lowerTitle.includes('wizard') || lowerTags.includes('wizard')) return 'wizard'
  return 'cross-cutting'
}

/* ── Fetch work items in batches of 200 (ADO max) ── */
async function fetchWorkItems(ids: number[], fields: string[]): Promise<Map<number, AdoWorkItem>> {
  const auth = getAuthHeader()
  const result = new Map<number, AdoWorkItem>()
  const batchSize = 200

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const resp = await fetch(
      `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis/wit/workitems?ids=${batch.join(',')}&fields=${fields.join(',')}&api-version=${ADO_API_VERSION}`,
      { headers: { Authorization: auth, 'Content-Type': 'application/json' } }
    )
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`ADO workitems fetch failed (${resp.status}): ${text}`)
    }
    const data = await resp.json()
    for (const item of (data.value ?? []) as AdoWorkItem[]) {
      result.set(item.id, item)
    }
  }
  return result
}

/* ── Main handler ── */
export async function GET() {
  try {
    const auth = getAuthHeader()

    /* 1. Execute the saved query */
    const queryResp = await fetch(adoUrl(`wit/wiql/${QUERY_ID}`), {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
    })
    if (!queryResp.ok) {
      const text = await queryResp.text()
      return NextResponse.json(
        { error: `ADO query failed (${queryResp.status})`, details: text },
        { status: queryResp.statusText === 'Unauthorized' ? 401 : 502 }
      )
    }
    const queryResult: AdoQueryResult = await queryResp.json()

    /* 2. Collect all work item IDs */
    let allIds: number[] = []

    if (queryResult.queryResultType === 'workItemLink' && queryResult.workItemRelations) {
      // Tree / one-hop query -- extract IDs from relations
      for (const rel of queryResult.workItemRelations) {
        if (rel.source) allIds.push(rel.source.id)
        allIds.push(rel.target.id)
      }
    } else if (queryResult.workItems) {
      // Flat query
      allIds = queryResult.workItems.map(wi => wi.id)
    }

    allIds = [...new Set(allIds)]

    if (allIds.length === 0) {
      return NextResponse.json({ epic: null, message: 'Query returned no work items' })
    }

    /* 3. Fetch full work item details */
    const fields = [
      'System.Id',
      'System.Title',
      'System.Description',
      'System.State',
      'System.WorkItemType',
      'System.AssignedTo',
      'System.Tags',
      'System.IterationPath',
      'System.AreaPath',
    ]
    const workItems = await fetchWorkItems(allIds, fields)

    /* 4. Build hierarchy from relations */
    // Map: parent ID -> child IDs
    const childrenOf = new Map<number, number[]>()
    if (queryResult.workItemRelations) {
      for (const rel of queryResult.workItemRelations) {
        if (rel.source && rel.target) {
          const parentId = rel.source.id
          const childId = rel.target.id
          if (!childrenOf.has(parentId)) childrenOf.set(parentId, [])
          childrenOf.get(parentId)!.push(childId)
        }
      }
    }

    /* 5. Identify the Epic (top-level work item with no parent) */
    const hasParent = new Set<number>()
    if (queryResult.workItemRelations) {
      for (const rel of queryResult.workItemRelations) {
        if (rel.source && rel.target) {
          hasParent.add(rel.target.id)
        }
      }
    }
    // Root nodes are those that appear in query but have no parent
    const rootIds = allIds.filter(id => !hasParent.has(id))

    // Find the Epic among roots (or just use the first root)
    let epicId = rootIds[0]
    for (const rid of rootIds) {
      const wi = workItems.get(rid)
      if (wi && String(wi.fields['System.WorkItemType']).toLowerCase() === 'epic') {
        epicId = rid
        break
      }
    }

    const epicWi = workItems.get(epicId)
    if (!epicWi) {
      return NextResponse.json({ epic: null, message: 'Could not find Epic work item' })
    }

    /* Helper to extract field values */
    const str = (wi: AdoWorkItem, field: string): string => {
      const val = wi.fields[field]
      if (!val) return ''
      if (typeof val === 'object' && val !== null && 'displayName' in val) {
        return (val as { displayName: string }).displayName
      }
      return String(val)
    }
    const tags = (wi: AdoWorkItem): string[] => {
      const t = str(wi, 'System.Tags')
      return t ? t.split(';').map(s => s.trim()).filter(Boolean) : []
    }
    // Strip HTML tags from descriptions
    const cleanHtml = (html: string): string => {
      return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }

    /* 6. Build Feature + Spike objects */
    const featureIds = childrenOf.get(epicId) ?? []
    let wizardIdx = 0
    const features: RoadmapFeature[] = []

    for (const fId of featureIds) {
      const fWi = workItems.get(fId)
      if (!fWi) continue

      const fTitle = str(fWi, 'System.Title')
      const fTags = tags(fWi)
      const category = inferCategory(fTitle, fTags)
      const accentColor = category === 'wizard'
        ? WIZARD_COLORS[wizardIdx++ % WIZARD_COLORS.length]
        : CROSS_CUTTING_COLOR

      // Build spikes (children of this feature)
      const spikeIds = childrenOf.get(fId) ?? []
      const spikes: RoadmapSpike[] = []
      for (const sId of spikeIds) {
        const sWi = workItems.get(sId)
        if (!sWi) continue
        spikes.push({
          id: String(sWi.id),
          title: str(sWi, 'System.Title'),
          description: cleanHtml(str(sWi, 'System.Description')),
          state: str(sWi, 'System.State'),
          assignedTo: str(sWi, 'System.AssignedTo'),
          tags: tags(sWi),
          iterationPath: str(sWi, 'System.IterationPath'),
          areaPath: str(sWi, 'System.AreaPath'),
          workItemType: str(sWi, 'System.WorkItemType'),
          url: workItemUrl(sWi.id),
        })
      }

      features.push({
        id: String(fWi.id),
        title: fTitle,
        description: cleanHtml(str(fWi, 'System.Description')),
        state: str(fWi, 'System.State'),
        assignedTo: str(fWi, 'System.AssignedTo'),
        tags: fTags,
        accentColor,
        category,
        spikes,
        url: workItemUrl(fWi.id),
      })
    }

    const epic: RoadmapEpic = {
      id: String(epicWi.id),
      title: str(epicWi, 'System.Title'),
      description: cleanHtml(str(epicWi, 'System.Description')),
      state: str(epicWi, 'System.State'),
      features,
      url: workItemUrl(epicWi.id),
    }

    return NextResponse.json({ epic })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[ADO API Error]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
