export const runtime = 'nodejs'

/* ── Azure DevOps Iterations API Route ──
   Returns sprint iteration data for all 3 teams.
   Member capacity is now derived from work items + lib/team-config.ts
   on the frontend. This API only provides iterations/timeline.
   ─────────────────────────────────────────────────────────── */

import { NextResponse } from 'next/server'

/* ── ADO config ── */
const ADO_ORG = 'tr-tax'
const ADO_PROJECT = 'TaxProf'
const ADO_API_VERSION = '7.1'
const TEAMS = ['surePrep-rw-wizards1', 'surePrep-rw-wizards2', 'surePrep-rw-infinity']

/* ── Exported types ── */
export interface IterationInfo {
  id: string
  name: string
  path: string
  startDate: string | null
  finishDate: string | null
  timeFrame: 'past' | 'current' | 'future'
}

export interface TeamCapacityData {
  name: string
  currentIteration: IterationInfo | null
  allIterations: IterationInfo[]
}

export interface CapacityResponse {
  teams: TeamCapacityData[]
  fetchedAt: string
}

/* ── Helpers ── */
function getAuthHeader(): string {
  const pat = process.env.ADO_PAT
  if (!pat) throw new Error('ADO_PAT environment variable is not set')
  return `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
}

function teamApiUrl(team: string, path: string): string {
  return `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/${encodeURIComponent(team)}/_apis/${path}?api-version=${ADO_API_VERSION}`
}

/* ── Fetch iterations for a team ── */
async function fetchIterations(team: string, auth: string): Promise<IterationInfo[]> {
  const resp = await fetch(teamApiUrl(team, 'work/teamsettings/iterations'), {
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
  })
  if (!resp.ok) {
    const text = await resp.text()
    console.error(`[ADO Capacity] Iterations fetch failed for ${team} (${resp.status}):`, text)
    return []
  }
  const data = await resp.json()
  return ((data.value ?? []) as {
    id: string
    name: string
    path: string
    attributes?: { startDate?: string; finishDate?: string; timeFrame?: string }
  }[]).map(it => ({
    id: it.id,
    name: it.name,
    path: it.path,
    startDate: it.attributes?.startDate ?? null,
    finishDate: it.attributes?.finishDate ?? null,
    timeFrame: (it.attributes?.timeFrame?.toLowerCase() ?? 'future') as 'past' | 'current' | 'future',
  }))
}

/* ── Main handler ── */
export async function GET() {
  try {
    const auth = getAuthHeader()

    // Fetch iterations for all teams in parallel
    const iterationsResults = await Promise.all(
      TEAMS.map(team => fetchIterations(team, auth))
    )

    const teams: TeamCapacityData[] = TEAMS.map((team, idx) => {
      const allIterations = iterationsResults[idx]
      const currentIteration = allIterations.find(it => it.timeFrame === 'current') ?? null

      return {
        name: team,
        currentIteration,
        allIterations,
      }
    })

    const response: CapacityResponse = {
      teams,
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[ADO Capacity API Error]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
