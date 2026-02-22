import type { AuditEntry } from '@/lib/types'

const seedAudit: AuditEntry[] = [
  { timestamp: '2026-02-22T08:00:00Z', wizardType: 'superseded', itemKey: 'sup-pg1', action: 'accepted', confidence: 0.96, method: 'bulk' },
  { timestamp: '2026-02-22T08:00:00Z', wizardType: 'superseded', itemKey: 'sup-pg2', action: 'accepted', confidence: 0.93, method: 'bulk' },
  { timestamp: '2026-02-22T08:00:00Z', wizardType: 'superseded', itemKey: 'sup-pg3', action: 'accepted', confidence: 0.91, method: 'bulk' },
  { timestamp: '2026-02-22T08:01:00Z', wizardType: 'duplicate', itemKey: 'dup-org001', action: 'accepted', confidence: 0.97, method: 'bulk' },
  { timestamp: '2026-02-22T08:01:00Z', wizardType: 'duplicate', itemKey: 'dup-org002', action: 'accepted', confidence: 0.94, method: 'bulk' },
]

export async function GET() {
  return Response.json(seedAudit)
}
