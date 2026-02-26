import type { SupersededRecord, DuplicateRecord, CfaRecord, NfrRecord } from '@/lib/types'
import { ReviewQueueClient } from './review-queue-client'

interface ReviewItem {
  key: string
  wizardType: 'superseded' | 'duplicate' | 'cfa' | 'nfr'
  wizardLabel: string
  confidence: number
  decision: string
  reason: string
  rule: string
  reviewRequired: boolean
  escalation: string | null
}

function buildItems(
  superseded: SupersededRecord[],
  duplicates: DuplicateRecord[],
  cfas: CfaRecord[],
  nfrs: NfrRecord[]
): ReviewItem[] {
  const items: ReviewItem[] = []

  for (const r of superseded) {
    if (r.confidenceLevel < 0.9) {
      items.push({
        key: `sup-pg${r.engagementPageId}`,
        wizardType: 'superseded',
        wizardLabel: 'Superseded',
        confidence: r.confidenceLevel,
        decision: r.decisionType,
        reason: r.decisionReason,
        rule: r.decisionRule,
        reviewRequired: r.reviewRequired,
        escalation: r.escalationReason,
      })
    }
  }

  for (const r of duplicates) {
    if (r.confidenceLevel < 0.9) {
      const key = r.itemType === 'DUPLICATE_DATA'
        ? `dup-${(r as { organizerItemId: string }).organizerItemId}`
        : `dup-${(r as { docIdA: number }).docIdA}-${(r as { docIdB: number }).docIdB}`
      items.push({
        key,
        wizardType: 'duplicate',
        wizardLabel: 'Duplicate',
        confidence: r.confidenceLevel,
        decision: r.itemType === 'DUPLICATE_DATA'
          ? (r as { decision: string }).decision
          : (r as { decision: string }).decision,
        reason: r.decisionReason,
        rule: r.decisionRule,
        reviewRequired: r.reviewRequired,
        escalation: r.escalationReason,
      })
    }
  }

  for (const r of cfas) {
    if (r.ConfidenceLevel < 0.9) {
      items.push({
        key: `cfa-${r.EngagementFaxFormId}`,
        wizardType: 'cfa',
        wizardLabel: 'CFA',
        confidence: r.ConfidenceLevel,
        decision: r.IsAddForm ? 'Add Form' : 'Standard',
        reason: `Child form ${r.EngagementFaxFormId} associated with parent ${r.ParentEngagementFaxFormId} via ${r.ParentFaxFormDwpCode}.`,
        rule: 'CFA_ASSOCIATION',
        reviewRequired: true,
        escalation: r.ConfidenceLevel < 0.7 ? 'Low confidence association' : null,
      })
    }
  }

  for (const r of nfrs) {
    if (r.ConfidenceLevel < 0.9) {
      items.push({
        key: `nfr-${r.EngagementPageId}-${r.FaxRowNumber}`,
        wizardType: 'nfr',
        wizardLabel: 'NFR',
        confidence: r.ConfidenceLevel,
        decision: r.MatchStatus ? 'Matched' : 'Unmatched',
        reason: `Form ${r.EngagementFormId}, field group ${r.FieldGroupId}, fax row ${r.FaxRowNumber}. Match status: ${r.MatchStatus ? 'matched' : 'unmatched'}.`,
        rule: 'NFR_MATCH',
        reviewRequired: true,
        escalation: !r.MatchStatus ? 'Field group not matched to fax form' : null,
      })
    }
  }

  return items.sort((a, b) => a.confidence - b.confidence)
}

async function getAllData(_binderId: string) {
  const { supersededA, duplicateA, cfaA, nfrA } = await import('@/lib/mock-data/demo-a')
  return {
    superseded: supersededA,
    duplicates: duplicateA,
    cfas: cfaA,
    nfrs: nfrA,
  }
}

export default async function ReviewQueuePage({
  params,
}: {
  params: Promise<{ binderId: string }>
}) {
  const { binderId } = await params
  const { superseded, duplicates, cfas, nfrs } = await getAllData(binderId)
  const items = buildItems(superseded, duplicates, cfas, nfrs)

  return <ReviewQueueClient items={items} />
}

export type { ReviewItem }
