/**
 * Unified Review Data -- Originals-Only Model
 *
 * Main table shows ONLY original documents.
 * Superseded/Duplicate docs are surfaced as notifications on the original.
 * User can: Accept, Swap (reclassify which is original), or reject (Not Superseded / Not Duplicate).
 */

import type { ComparedValue } from '@/lib/types'

// ── Types ──

export type DocStatus =
  | 'needs-review'
  | 'incorrect-tax-year'
  | 'verified'

export type ReviewState = 'pending' | 'accepted' | 'overridden' | 'flagged'

export type NotificationType = 'superseded' | 'duplicate'

export interface RuleEvidence {
  rule: string
  reason: string
  confidence: number
  comparedValues: ComparedValue[]
  parentFormLabel?: string
  isAddForm?: boolean
  sourceMapping?: string
  returnMapping?: string
}

/** A superseded or duplicate document linked to an original */
export interface LinkedDocument {
  id: string
  pageNumber: number
  fileName: string
  formType: string
  formLabel: string
  type: NotificationType
  evidence: RuleEvidence
}

export interface UnifiedDocument {
  id: string
  pageNumber: number
  fileName: string
  formType: string
  formLabel: string
  status: DocStatus
  fieldsToReview: number
  reviewState: ReviewState
  /** Superseded/Duplicate documents linked to this original */
  linkedDocs: LinkedDocument[]
}

// ── Status display config ──

export const STATUS_CONFIG: Record<
  DocStatus | NotificationType,
  { label: string; color: string; bg: string; border: string }
> = {
  'needs-review':       { label: 'Needs review',       color: 'oklch(0.50 0.18 45)',  bg: 'oklch(0.97 0.03 45)',  border: 'oklch(0.88 0.08 45)' },
  'incorrect-tax-year': { label: 'Incorrect tax year',  color: 'oklch(0.50 0.20 25)',  bg: 'oklch(0.97 0.02 25)',  border: 'oklch(0.88 0.06 25)' },
  verified:             { label: 'Verified',            color: 'oklch(0.40 0.16 145)', bg: 'oklch(0.97 0.02 145)', border: 'oklch(0.88 0.06 145)' },
  superseded:           { label: 'Superseded',          color: 'oklch(0.40 0.18 290)', bg: 'oklch(0.96 0.02 290)', border: 'oklch(0.85 0.06 290)' },
  duplicate:            { label: 'Duplicate',           color: 'oklch(0.40 0.15 250)', bg: 'oklch(0.96 0.02 250)', border: 'oklch(0.85 0.06 250)' },
}

export const REVIEW_STATE_CONFIG: Record<ReviewState, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: 'oklch(0.50 0.16 50)',  bg: 'oklch(0.97 0.02 60)' },
  accepted:   { label: 'Accepted',   color: 'oklch(0.40 0.16 145)', bg: 'oklch(0.97 0.02 145)' },
  overridden: { label: 'Overridden', color: 'oklch(0.40 0.15 250)', bg: 'oklch(0.95 0.03 250)' },
  flagged:    { label: 'Flagged',    color: 'oklch(0.50 0.20 25)',  bg: 'oklch(0.97 0.02 25)' },
}

// ── Mock documents (originals only, with linked superseded/duplicate) ──

export const DOCUMENTS: UnifiedDocument[] = [
  // ── Original W-2 with 1 superseded document ──
  {
    id: 'doc-w2-whynot',
    pageNumber: 14,
    fileName: 'W-2-WHYNOT-corrected.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (WHYNOT STOP INC)',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    linkedDocs: [
      {
        id: 'doc-w2-whynot-old',
        pageNumber: 5,
        fileName: 'W-2-WHYNOT-STOP.pdf',
        formType: 'W-2',
        formLabel: 'W-2 (WHYNOT STOP INC) - Original Filing',
        type: 'superseded',
        evidence: {
          rule: 'A9',
          reason: 'Page 5 is the original filing. Page 14 (this document) is the corrected version with updated wage amounts. The corrected indicator is present on Page 14.',
          confidence: 0.95,
          comparedValues: [
            { field: 'Employer Name', valueA: 'WHYNOT STOP INC', valueB: 'WHYNOT STOP INC', match: true, category: 'Employer' },
            { field: 'Employer EIN', valueA: '53-XXXXXXX', valueB: '53-XXXXXXX', match: true, category: 'Employer' },
            { field: 'Wages (Box 1)', valueA: '$63,150.00', valueB: '$62,400.00', match: false, category: 'Income' },
            { field: 'Fed Tax Withheld', valueA: '$9,472.50', valueB: '$9,360.00', match: false, category: 'Income' },
            { field: 'Corrected Indicator', valueA: 'Yes (This doc)', valueB: 'No', match: false, category: 'Document' },
          ],
        },
      },
    ],
  },

  // ── Original 1099-DIV with 1 superseded document ──
  {
    id: 'doc-1099div-exxon',
    pageNumber: 32,
    fileName: 'ExxonMobil-1099-DIV-corrected.pdf',
    formType: '1099-DIV',
    formLabel: '1099-DIV (ExxonMobil)',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    linkedDocs: [
      {
        id: 'doc-1099div-exxon-old',
        pageNumber: 21,
        fileName: 'ExxonMobil-1099-DIV.pdf',
        formType: '1099-DIV',
        formLabel: '1099-DIV (ExxonMobil) - Original Filing',
        type: 'superseded',
        evidence: {
          rule: 'A9',
          reason: 'Page 21 is the original filing. Page 32 (this document) is the corrected version with updated dividend amounts.',
          confidence: 0.92,
          comparedValues: [
            { field: 'Payer Name', valueA: 'EXXON MOBIL CORP', valueB: 'EXXON MOBIL CORP', match: true, category: 'Payer' },
            { field: 'Payer TIN', valueA: '13-5409005', valueB: '13-5409005', match: true, category: 'Payer' },
            { field: 'Dividends (1a)', valueA: '$3,412.80', valueB: '$3,285.60', match: false, category: 'Income' },
            { field: 'Corrected Indicator', valueA: 'Yes (This doc)', valueB: 'No', match: false, category: 'Document' },
          ],
        },
      },
    ],
  },

  // ── Original 1099-INT with 1 superseded (low confidence) ──
  {
    id: 'doc-1099int-chase',
    pageNumber: 22,
    fileName: 'Chase-1099-INT-updated.pdf',
    formType: '1099-INT',
    formLabel: '1099-INT (Chase Bank)',
    status: 'needs-review',
    fieldsToReview: 2,
    reviewState: 'pending',
    linkedDocs: [
      {
        id: 'doc-1099int-chase-old',
        pageNumber: 8,
        fileName: 'Chase-1099-INT.pdf',
        formType: '1099-INT',
        formLabel: '1099-INT (Chase Bank) - Earlier Version',
        type: 'superseded',
        evidence: {
          rule: 'A6',
          reason: 'Same bank and account number. Page 22 has a higher interest amount. Could be a corrected version or a different reporting period. Low confidence -- manual review recommended.',
          confidence: 0.72,
          comparedValues: [
            { field: 'Payer Name', valueA: 'JPMORGAN CHASE BANK NA', valueB: 'JPMORGAN CHASE BANK NA', match: true, category: 'Payer' },
            { field: 'Account', valueA: '****8821', valueB: '****8821', match: true, category: 'Account' },
            { field: 'Interest (Box 1)', valueA: '$1,987.00', valueB: '$1,845.00', match: false, category: 'Income' },
          ],
        },
      },
    ],
  },

  // ── Original W-2 with 1 duplicate (organizer copy) ──
  {
    id: 'doc-w2-source',
    pageNumber: 2,
    fileName: 'W-2-WHYNOT-source.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (WHYNOT STOP) - Source',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    linkedDocs: [
      {
        id: 'doc-w2-organizer',
        pageNumber: 1,
        fileName: 'W-2-WHYNOT-organizer.pdf',
        formType: 'W-2',
        formLabel: 'W-2 (WHYNOT STOP) - Organizer Copy',
        type: 'duplicate',
        evidence: {
          rule: 'EXACT_DATA_MATCH',
          reason: 'All fields match exactly between the organizer W-2 (Page 1) and the source W-2 (Page 2). The source document is preferred for data capture.',
          confidence: 0.97,
          comparedValues: [
            { field: 'Employee SSN', valueA: '***-**-1234', valueB: '***-**-1234', match: true },
            { field: 'Employer EIN', valueA: '53-XXXXXXX', valueB: '53-XXXXXXX', match: true },
            { field: 'Employer Name', valueA: 'WHYNOT STOP INC', valueB: 'WHYNOT STOP INC', match: true },
            { field: 'Wages (Box 1)', valueA: '$62,400.00', valueB: '$62,400.00', match: true },
          ],
        },
      },
    ],
  },

  // ── Original 1099-MISC with 1 duplicate (organizer copy) ──
  {
    id: 'doc-1099misc-richmont',
    pageNumber: 15,
    fileName: '1099-MISC-RICHMONT-source.pdf',
    formType: '1099-MISC',
    formLabel: '1099-MISC (RICHMONT)',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    linkedDocs: [
      {
        id: 'doc-1099misc-richmont-dup',
        pageNumber: 4,
        fileName: '1099-MISC-RICHMONT-organizer.pdf',
        formType: '1099-MISC',
        formLabel: '1099-MISC (RICHMONT) - Organizer Copy',
        type: 'duplicate',
        evidence: {
          rule: 'NEAR_DATA_MATCH',
          reason: 'Income amounts match exactly. Same payer and recipient on both documents. Source document preferred.',
          confidence: 0.94,
          comparedValues: [
            { field: 'Recipient', valueA: 'JACK ANDERSON', valueB: 'JACK ANDERSON', match: true },
            { field: 'Payer', valueA: 'RICHMONT NORTH AMERICA', valueB: 'RICHMONT NORTH AMERICA', match: true },
            { field: 'Box 3', valueA: '$14,921.24', valueB: '$14,921.24', match: true },
          ],
        },
      },
    ],
  },

  // ── Verification issues (no linked docs) ──
  {
    id: 'doc-verify-1',
    pageNumber: 12,
    fileName: 'Wendy1099-div.pdf',
    formType: '1099-DIV',
    formLabel: '1099-DIV (Wendy)',
    status: 'incorrect-tax-year',
    fieldsToReview: 4,
    reviewState: 'pending',
    linkedDocs: [],
  },
  {
    id: 'doc-verify-2',
    pageNumber: 18,
    fileName: 'W-2-2024.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (2024 Filing)',
    status: 'needs-review',
    fieldsToReview: 4,
    reviewState: 'pending',
    linkedDocs: [],
  },

  // ── Clean / Verified (no issues) ──
  {
    id: 'doc-clean-1',
    pageNumber: 3,
    fileName: 'Schedule-C-Craft-Shop.pdf',
    formType: 'Schedule C',
    formLabel: 'Schedule C (Craft Shop)',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    linkedDocs: [],
  },
  {
    id: 'doc-clean-2',
    pageNumber: 42,
    fileName: 'Chapman-Trust-K1-amended.pdf',
    formType: 'Schedule K-1',
    formLabel: 'K-1 (Chapman Trust) - Amended',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    linkedDocs: [],
  },
]

// ── Helpers ──

export function getSummary(docs: UnifiedDocument[]) {
  let superseded = 0
  let duplicate = 0
  let needsReview = 0
  let verified = 0
  let pending = 0

  for (const d of docs) {
    // Count linked docs
    for (const ld of d.linkedDocs) {
      if (ld.type === 'superseded') superseded++
      if (ld.type === 'duplicate') duplicate++
    }
    // Count status
    if (d.status === 'verified') verified++
    else needsReview++

    if (d.reviewState === 'pending') pending++
  }

  return {
    total: docs.length,
    superseded,
    duplicate,
    needsReview,
    verified,
    pending,
    classified: superseded + duplicate,
  }
}

export const FORM_TYPES = ['All', 'W-2', '1099-DIV', '1099-INT', '1099-MISC', 'Schedule K-1', 'Schedule C'] as const
export const STATUS_FILTERS = ['All', 'Needs review', 'Incorrect tax year', 'Verified', 'Has Superseded', 'Has Duplicate'] as const
