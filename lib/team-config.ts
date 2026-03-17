/* ── Team & Member Configuration ──
   Defines team structure and member role mappings.
   
   - Members are auto-discovered from current sprint work items
   - This config provides the ROLE (activity) for each member
   - Members not listed here default to "Development"
   - Team is derived from iterationPath automatically
   
   To update: just edit the MEMBER_ROLES map below.
   ─────────────────────────────────────────────────── */

export const TEAMS = ['wizards1', 'wizards2', 'infinity'] as const
export type TeamName = typeof TEAMS[number]

/** ADO team name prefix -- iteration paths look like:
 *  TaxProf\surePrep-rw-wizards2\2026_S06_Mar11-Mar24 */
export const ADO_TEAM_PREFIX = 'surePrep-rw-'

export type Activity = 'Development' | 'Testing' | 'Support'

/**
 * Member role mapping.
 * Key: display name exactly as it appears in ADO (case-sensitive).
 * Value: array of activities with capacity hours per day.
 * 
 * Members with multiple activities (e.g. Support + Testing) should
 * have separate entries for each activity.
 * 
 * Members NOT listed here will default to [{ activity: 'Development', hrsPerDay: 6 }]
 */
export interface MemberActivity {
  activity: Activity
  hrsPerDay: number
}

export const MEMBER_ROLES: Record<string, MemberActivity[]> = {
  // ── wizards2 (from ADO Capacity tab) ──
  'Ashokumar, Preethika (TR Technology)': [
    { activity: 'Support', hrsPerDay: 3 },
    { activity: 'Testing', hrsPerDay: 3 },
  ],
  'Bulai, Inga (TR Technology)': [
    { activity: 'Support', hrsPerDay: 5 },
    { activity: 'Testing', hrsPerDay: 1 },
  ],
  'Chau, Sam (TR Technology)': [
    { activity: 'Development', hrsPerDay: 6 },
  ],
  'Chen, Van (TR Technology)': [
    { activity: 'Support', hrsPerDay: 6 },
  ],
  'Gama, Robert (TR Technology)': [
    { activity: 'Support', hrsPerDay: 3 },
    { activity: 'Testing', hrsPerDay: 3 },
  ],
  'Harbison, Robert (TR Technology)': [
    { activity: 'Development', hrsPerDay: 3 },
  ],

  // ── Add wizards1 and infinity members below ──
  // Example:
  // 'Doe, Jane (TR Technology)': [
  //   { activity: 'Development', hrsPerDay: 6 },
  // ],
}

/**
 * Exclude members whose display name contains any of these substrings.
 * Operations & Technology staff are not part of dev/test/support capacity.
 */
export const EXCLUDED_ORG_PATTERNS = [
  '(Operations & Technology)',
  '(TR Product)',
] as const

/** Check if a member should be excluded based on their display name */
export function isMemberExcluded(displayName: string): boolean {
  return EXCLUDED_ORG_PATTERNS.some(pattern => displayName.includes(pattern))
}

/** Default activity for members not found in MEMBER_ROLES */
export const DEFAULT_MEMBER_ACTIVITIES: MemberActivity[] = [
  { activity: 'Development', hrsPerDay: 6 },
]

/** Target release date */
export const TARGET_RELEASE_DATE = new Date('2026-06-28')

/**
 * Extract team name from ADO iterationPath.
 * e.g. "TaxProf\\surePrep-rw-wizards2\\2026_S06" -> "wizards2"
 */
export function extractTeamFromPath(iterationPath: string): TeamName | null {
  const pathLower = iterationPath.toLowerCase()
  for (const team of TEAMS) {
    if (pathLower.includes(team)) return team
  }
  return null
}

/**
 * Get activities for a member. Uses config if available, otherwise defaults.
 */
export function getMemberActivities(displayName: string): MemberActivity[] {
  return MEMBER_ROLES[displayName] ?? DEFAULT_MEMBER_ACTIVITIES
}
