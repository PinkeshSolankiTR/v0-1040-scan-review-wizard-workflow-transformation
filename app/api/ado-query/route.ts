export const runtime = 'nodejs'

/* ── Azure DevOps Query API Route ──
   Returns ALL work items from the saved query as a flat list
   with parent-child relationships preserved.
   Supports both flat and tree/one-hop queries.
   ─────────────────────────────────────────────────────────── */

import { NextResponse } from 'next/server'

/* ── ADO config ── */
const ADO_ORG = process.env.ADO_ORG || 'tr-tax'
const ADO_PROJECT = 'TaxProf'
const QUERY_ID = '2788c428-8768-429b-8b28-4bcfa0bb26cc'
const ADO_API_VERSION = '7.1'

/* ── Exported types used by the frontend ── */
export interface AdoWorkItemFlat {
  id: number
  title: string
  description: string
  state: string
  workItemType: string
  assignedTo: string
  tags: string[]
  iterationPath: string
  areaPath: string
  url: string
  parentId: number | null
  childIds: number[]
}

export interface AdoQueryResponse {
  items: AdoWorkItemFlat[]
  queryId: string
  fetchedAt: string
}

/* ── Helpers ── */
function resolvePat(): string {
  /* Check ADO_PAT first; if empty, check if the PAT was accidentally stored in ADO_ORG */
  const pat = process.env.ADO_PAT
  if (pat && pat.length > 20) return pat
  const org = process.env.ADO_ORG
  if (org && org.length > 20) return org
  throw new Error('ADO_PAT environment variable is not set')
}

function getAuthHeader(): string {
  const pat = resolvePat()
  return `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
}

function adoApiUrl(path: string): string {
  return `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis/${path}?api-version=${ADO_API_VERSION}`
}

function workItemWebUrl(id: number): string {
  return `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_workitems/edit/${id}`
}

function stripHtml(html: string): string {
  if (!html) return ''
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

function extractStr(fields: Record<string, unknown>, field: string): string {
  const val = fields[field]
  if (!val) return ''
  if (typeof val === 'object' && val !== null && 'displayName' in val) {
    return (val as { displayName: string }).displayName
  }
  return String(val)
}

function extractTags(fields: Record<string, unknown>): string[] {
  const t = extractStr(fields, 'System.Tags')
  return t ? t.split(';').map(s => s.trim()).filter(Boolean) : []
}

/* ── Fetch work items in batches of 200 (ADO limit) ── */
async function fetchWorkItemsBatch(
  ids: number[],
  fields: string[],
  auth: string,
): Promise<Map<number, Record<string, unknown>>> {
  const result = new Map<number, Record<string, unknown>>()
  const batchSize = 200

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const resp = await fetch(
      `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis/wit/workitems?ids=${batch.join(',')}&fields=${fields.join(',')}&api-version=${ADO_API_VERSION}`,
      { headers: { Authorization: auth, 'Content-Type': 'application/json' } },
    )
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`ADO workitems fetch failed (${resp.status}): ${text}`)
    }
    const data = await resp.json()
    for (const item of (data.value ?? []) as { id: number; fields: Record<string, unknown> }[]) {
      result.set(item.id, item.fields)
    }
  }
  return result
}

/* ── Main handler ── */
export async function GET() {
  try {
    const auth = getAuthHeader()
    const queryUrl = adoApiUrl(`wit/wiql/${QUERY_ID}`)
    console.log('[v0] ADO_ORG env:', process.env.ADO_ORG ? `"${process.env.ADO_ORG.substring(0, 10)}..."` : 'NOT SET')
    console.log('[v0] ADO_PAT env:', process.env.ADO_PAT ? `SET (length: ${process.env.ADO_PAT.length})` : 'NOT SET')
    console.log('[v0] Resolved ORG for URL:', ADO_ORG)
    console.log('[v0] Query URL:', queryUrl)

    /* 1. Execute the saved query */
    const queryResp = await fetch(queryUrl, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
    })
    if (!queryResp.ok) {
      const text = await queryResp.text()
      console.error('[v0] ADO Query failed:', queryResp.status, text.substring(0, 500))
      return NextResponse.json(
        { error: `ADO query failed (${queryResp.status})`, details: text.substring(0, 500) },
        { status: queryResp.status === 401 ? 401 : 502 },
      )
    }
    const queryResult = await queryResp.json()

    /* 2. Collect all work item IDs + parent-child edges */
    const allIdSet = new Set<number>()
    const parentOf = new Map<number, number>() // child -> parent
    const childrenOf = new Map<number, number[]>() // parent -> [children]

    if (queryResult.workItemRelations) {
      // Tree or one-hop query
      for (const rel of queryResult.workItemRelations as { rel: string | null; source: { id: number } | null; target: { id: number } }[]) {
        allIdSet.add(rel.target.id)
        if (rel.source) {
          allIdSet.add(rel.source.id)
          parentOf.set(rel.target.id, rel.source.id)
          if (!childrenOf.has(rel.source.id)) childrenOf.set(rel.source.id, [])
          childrenOf.get(rel.source.id)!.push(rel.target.id)
        }
      }
    } else if (queryResult.workItems) {
      // Flat query
      for (const wi of queryResult.workItems as { id: number }[]) {
        allIdSet.add(wi.id)
      }
    }

    const allIds = [...allIdSet]
    if (allIds.length === 0) {
      return NextResponse.json({ items: [], queryId: QUERY_ID, fetchedAt: new Date().toISOString() })
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
    const workItemFields = await fetchWorkItemsBatch(allIds, fields, auth)

    /* 4. Build flat items list */
    const items: AdoWorkItemFlat[] = []
    for (const id of allIds) {
      const f = workItemFields.get(id)
      if (!f) continue
      items.push({
        id,
        title: extractStr(f, 'System.Title'),
        description: stripHtml(extractStr(f, 'System.Description')),
        state: extractStr(f, 'System.State'),
        workItemType: extractStr(f, 'System.WorkItemType'),
        assignedTo: extractStr(f, 'System.AssignedTo'),
        tags: extractTags(f),
        iterationPath: extractStr(f, 'System.IterationPath'),
        areaPath: extractStr(f, 'System.AreaPath'),
        url: workItemWebUrl(id),
        parentId: parentOf.get(id) ?? null,
        childIds: childrenOf.get(id) ?? [],
      })
    }

    const response: AdoQueryResponse = {
      items,
      queryId: QUERY_ID,
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[ADO API Error]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
