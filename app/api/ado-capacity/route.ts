/* ── Azure DevOps Team Capacity & Iterations API Route ──
   Returns team member capacities (roles, hours/day, days off)
   and sprint iteration data for all 3 teams.
   ─────────────────────────────────────────────────────────── */

import { NextResponse } from 'next/server'

/* ── ADO config ── */
const ADO_ORG = 'tr-tax'
const ADO_PROJECT = 'TaxProf'
const ADO_API_VERSION = '7.1'
const TEAMS = ['surePrep-rw-wizards1', 'surePrep-rw-wizards2', 'surePrep-rw-infinity']

/* ── Exported types ── */
export interface TeamMemberCapacity {
  displayName: string
  activities: { name: string; capacityPerDay: number }[]
  daysOff: { start: string; end: string }[]
  /** Whether capacity was derived from team roster (true) or from ADO capacity API (false) */
  isEstimated?: boolean
}

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
  members: TeamMemberCapacity[]
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

/* ── Fetch capacity for a specific iteration ── */
async function fetchCapacity(team: string, iterationId: string, auth: string): Promise<TeamMemberCapacity[]> {
  const capacityUrl = teamApiUrl(team, `work/teamsettings/iterations/${iterationId}/capacities`)
  console.log(`[v0] Fetching capacity: ${capacityUrl}`)
  const resp = await fetch(capacityUrl, {
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
  })
  if (!resp.ok) {
    const text = await resp.text()
    console.error(`[ADO Capacity] Capacity fetch failed for ${team}/${iterationId} (${resp.status}):`, text)
    return []
  }
  const data = await resp.json()
  console.log(`[v0] Capacity raw response for ${team}: count=${data.count ?? 'n/a'}, value.length=${(data.value ?? []).length}`)
  const members = ((data.value ?? []) as {
    teamMember: { displayName: string }
    activities: { name: string; capacityPerDay: number }[]
    daysOff: { start: string; end: string }[]
  }[]).map(m => ({
    displayName: m.teamMember.displayName,
    activities: m.activities ?? [],
    daysOff: m.daysOff ?? [],
  }))

  console.log(`[ADO Capacity] ${team}: capacities API returned ${members.length} members`, members.length > 0 ? `first=${members[0].displayName}, activities=${JSON.stringify(members[0].activities)}` : '')
  return members
}

/* ── Fetch team members directly from the Team Members API ── */
async function fetchTeamMembers(team: string, auth: string): Promise<{ displayName: string; uniqueName: string }[]> {
  // This API requires preview version
  const url = `https://dev.azure.com/${ADO_ORG}/_apis/projects/${encodeURIComponent(ADO_PROJECT)}/teams/${encodeURIComponent(team)}/members?api-version=7.1-preview.2`
  console.log(`[v0] Fetching team members: ${url}`)
  const resp = await fetch(url, {
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
  })
  if (!resp.ok) {
    const text = await resp.text()
    console.error(`[ADO Capacity] Team members fetch failed for ${team} (${resp.status}):`, text)
    return []
  }
  const data = await resp.json()
  const members = ((data.value ?? []) as {
    identity: { displayName: string; uniqueName: string }
  }[]).map(m => ({
    displayName: m.identity.displayName,
    uniqueName: m.identity.uniqueName,
  }))
  console.log(`[v0] Team ${team}: got ${members.length} members`, members.slice(0, 3).map(m => m.displayName))
  return members
}

/* ── Main handler ── */
export async function GET() {
  try {
    const auth = getAuthHeader()

    // Fetch iterations and team members for all teams in parallel
    const [iterationsResults, teamMembersResults] = await Promise.all([
      Promise.all(TEAMS.map(team => fetchIterations(team, auth))),
      Promise.all(TEAMS.map(team => fetchTeamMembers(team, auth))),
    ])

    // For each team: find current iteration, fetch capacity, fallback to team members
    const teams: TeamCapacityData[] = await Promise.all(
      TEAMS.map(async (team, idx) => {
        const allIterations = iterationsResults[idx]
        const teamMembers = teamMembersResults[idx]
        const currentIteration = allIterations.find(it => it.timeFrame === 'current') ?? null

        let members: TeamMemberCapacity[] = []
        if (currentIteration) {
          members = await fetchCapacity(team, currentIteration.id, auth)
        }

        console.log(`[v0] ${team}: capacity members=${members.length}, teamMembers=${teamMembers.length}, currentIteration=${currentIteration?.name ?? 'NONE'}`)

        // If capacity API returned no members but we have team members,
        // build capacity entries from the team roster with default 6 hrs/day
        if (members.length === 0 && teamMembers.length > 0) {
          console.log(`[ADO Capacity] ${team}: capacity API empty, falling back to ${teamMembers.length} team members with default 6 hrs/day`)
          members = teamMembers.map(tm => ({
            displayName: tm.displayName,
            activities: [{ name: 'Development', capacityPerDay: 6 }],
            daysOff: [],
            isEstimated: true,
          }))
        }

        return {
          name: team,
          currentIteration,
          allIterations,
          members,
        }
      })
    )

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
