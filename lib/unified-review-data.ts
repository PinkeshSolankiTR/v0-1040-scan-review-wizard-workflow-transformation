/**
 * Unified Review Data
 *
 * Single-model approach: every document has ONE status.
 * Superseded/Duplicate docs are paired with their original counterpart.
 * Priority: Superseded > CFA > Duplicate > NFR > Clean
 */

import type { ComparedValue } from '@/lib/types'

// ── Types ──

export type DocStatus =
  | 'superseded'
  | 'duplicate'
  | 'cfa-child'
  | 'nfr-unmatched'
  | 'needs-review'
  | 'incorrect-tax-year'
  | 'verified'

export type ReviewState = 'pending' | 'accepted' | 'overridden' | 'flagged'

export interface RuleEvidence {
  rule: string
  reason: string
  confidence: number
  comparedValues: ComparedValue[]
  originalPageId?: number
  parentFormLabel?: string
  isAddForm?: boolean
  sourceMapping?: string
  returnMapping?: string
}

export interface PairInfo {
  pairedDocId: string
  role: 'original' | 'superseded' | 'duplicate' | 'parent' | 'child'
  pairedLabel: string
  pairedPage: number
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
  evidence: RuleEvidence | null
  pair: PairInfo | null
}

// ── Status display config ──

export const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; bg: string; border: string }> = {
  superseded:           { label: 'Superseded',        color: 'oklch(0.40 0.18 290)', bg: 'oklch(0.96 0.02 290)', border: 'oklch(0.85 0.06 290)' },
  duplicate:            { label: 'Duplicate',         color: 'oklch(0.40 0.15 250)', bg: 'oklch(0.96 0.02 250)', border: 'oklch(0.85 0.06 250)' },
  'cfa-child':          { label: 'CFA Child',         color: 'oklch(0.40 0.17 165)', bg: 'oklch(0.96 0.02 165)', border: 'oklch(0.85 0.06 165)' },
  'nfr-unmatched':      { label: 'NFR Unmatched',     color: 'oklch(0.45 0.15 60)',  bg: 'oklch(0.97 0.02 60)',  border: 'oklch(0.88 0.06 60)' },
  'needs-review':       { label: 'Needs review',      color: 'oklch(0.50 0.18 45)',  bg: 'oklch(0.97 0.03 45)',  border: 'oklch(0.88 0.08 45)' },
  'incorrect-tax-year': { label: 'Incorrect tax year', color: 'oklch(0.50 0.20 25)', bg: 'oklch(0.97 0.02 25)', border: 'oklch(0.88 0.06 25)' },
  verified:             { label: 'Verified',          color: 'oklch(0.40 0.16 145)', bg: 'oklch(0.97 0.02 145)', border: 'oklch(0.88 0.06 145)' },
}

export const REVIEW_STATE_CONFIG: Record<ReviewState, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: 'oklch(0.50 0.16 50)', bg: 'oklch(0.97 0.02 60)' },
  accepted:   { label: 'Accepted',   color: 'oklch(0.40 0.16 145)', bg: 'oklch(0.97 0.02 145)' },
  overridden: { label: 'Overridden', color: 'oklch(0.40 0.15 250)', bg: 'oklch(0.95 0.03 250)' },
  flagged:    { label: 'Flagged',    color: 'oklch(0.50 0.20 25)', bg: 'oklch(0.97 0.02 25)' },
}

// ── Mock documents with pairing ──

export const DOCUMENTS: UnifiedDocument[] = [
  // ── Superseded Pair 1: W-2 WHYNOT STOP ──
  {
    id: 'page-5',
    pageNumber: 5,
    fileName: 'W-2-WHYNOT-STOP.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (WHYNOT STOP INC)',
    status: 'superseded',
    fieldsToReview: 0,
    reviewState: 'pending',
    pair: {
      pairedDocId: 'page-14',
      role: 'superseded',
      pairedLabel: 'W-2 (WHYNOT STOP) - Corrected',
      pairedPage: 14,
    },
    evidence: {
      rule: 'A9',
      reason: 'Page 14 is the corrected version with updated wage amounts.',
      confidence: 0.95,
      originalPageId: 14,
      comparedValues: [
        { field: 'Employer Name', valueA: 'WHYNOT STOP INC', valueB: 'WHYNOT STOP INC', match: true, category: 'Employer' },
        { field: 'Employer EIN', valueA: '53-XXXXXXX', valueB: '53-XXXXXXX', match: true, category: 'Employer' },
        { field: 'Wages (Box 1)', valueA: '$62,400.00', valueB: '$63,150.00', match: false, category: 'Income' },
        { field: 'Fed Tax Withheld', valueA: '$9,360.00', valueB: '$9,472.50', match: false, category: 'Income' },
        { field: 'Corrected', valueA: 'No', valueB: 'Yes', match: false, category: 'Document' },
      ],
    },
  },
  {
    id: 'page-14',
    pageNumber: 14,
    fileName: 'W-2-WHYNOT-corrected.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (WHYNOT STOP) - Corrected',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    pair: {
      pairedDocId: 'page-5',
      role: 'original',
      pairedLabel: 'W-2 (WHYNOT STOP INC)',
      pairedPage: 5,
    },
    evidence: null,
  },

  // ── Superseded Pair 2: 1099-DIV ExxonMobil ──
  {
    id: 'page-21',
    pageNumber: 21,
    fileName: 'ExxonMobil-1099-DIV.pdf',
    formType: '1099-DIV',
    formLabel: '1099-DIV (ExxonMobil)',
    status: 'superseded',
    fieldsToReview: 0,
    reviewState: 'pending',
    pair: {
      pairedDocId: 'page-32',
      role: 'superseded',
      pairedLabel: '1099-DIV (ExxonMobil) - Corrected',
      pairedPage: 32,
    },
    evidence: {
      rule: 'A9',
      reason: 'Page 32 is the corrected version with updated dividend amounts.',
      confidence: 0.92,
      originalPageId: 32,
      comparedValues: [
        { field: 'Payer Name', valueA: 'EXXON MOBIL CORP', valueB: 'EXXON MOBIL CORP', match: true, category: 'Payer' },
        { field: 'Dividends (1a)', valueA: '$3,285.60', valueB: '$3,412.80', match: false, category: 'Income' },
        { field: 'Corrected', valueA: 'No', valueB: 'Yes', match: false, category: 'Document' },
      ],
    },
  },
  {
    id: 'page-32',
    pageNumber: 32,
    fileName: 'ExxonMobil-1099-DIV-corrected.pdf',
    formType: '1099-DIV',
    formLabel: '1099-DIV (ExxonMobil) - Corrected',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    pair: {
      pairedDocId: 'page-21',
      role: 'original',
      pairedLabel: '1099-DIV (ExxonMobil)',
      pairedPage: 21,
    },
    evidence: null,
  },

  // ── Superseded Pair 3 (low confidence): 1099-INT Chase ──
  {
    id: 'page-8',
    pageNumber: 8,
    fileName: 'Chase-1099-INT.pdf',
    formType: '1099-INT',
    formLabel: '1099-INT (Chase Bank)',
    status: 'superseded',
    fieldsToReview: 2,
    reviewState: 'pending',
    pair: {
      pairedDocId: 'page-22',
      role: 'superseded',
      pairedLabel: '1099-INT (Chase) - Updated',
      pairedPage: 22,
    },
    evidence: {
      rule: 'A6',
      reason: 'Same bank, same account. Page 22 has higher interest. Could be corrected or different period.',
      confidence: 0.72,
      originalPageId: 22,
      comparedValues: [
        { field: 'Payer Name', valueA: 'JPMORGAN CHASE BANK NA', valueB: 'JPMORGAN CHASE BANK NA', match: true, category: 'Payer' },
        { field: 'Interest (Box 1)', valueA: '$1,845.00', valueB: '$1,987.00', match: false, category: 'Income' },
        { field: 'Account', valueA: '****8821', valueB: '****8821', match: true, category: 'Account' },
      ],
    },
  },
  {
    id: 'page-22',
    pageNumber: 22,
    fileName: 'Chase-1099-INT-updated.pdf',
    formType: '1099-INT',
    formLabel: '1099-INT (Chase) - Updated',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    pair: {
      pairedDocId: 'page-8',
      role: 'original',
      pairedLabel: '1099-INT (Chase Bank)',
      pairedPage: 8,
    },
    evidence: null,
  },

  // ── Duplicate Pair 1: W-2 Organizer ──
  {
    id: 'page-1-dup',
    pageNumber: 1,
    fileName: 'W-2-WHYNOT-organizer.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (WHYNOT STOP) - Organizer',
    status: 'duplicate',
    fieldsToReview: 0,
    reviewState: 'pending',
    pair: {
      pairedDocId: 'page-1',
      role: 'duplicate',
      pairedLabel: 'W-2 (WHYNOT STOP) - Source',
      pairedPage: 2,
    },
    evidence: {
      rule: 'EXACT_DATA_MATCH',
      reason: 'Exact data match between organizer W-2 and source W-2. All fields identical.',
      confidence: 0.97,
      comparedValues: [
        { field: 'Employee SSN', valueA: '***-**-1234', valueB: '***-**-1234', match: true },
        { field: 'Employer EIN', valueA: '53-XXXXXXX', valueB: '53-XXXXXXX', match: true },
        { field: 'Employer Name', valueA: 'WHYNOT STOP INC', valueB: 'WHYNOT STOP INC', match: true },
      ],
    },
  },
  {
    id: 'page-1',
    pageNumber: 2,
    fileName: 'W-2-WHYNOT-source.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (WHYNOT STOP) - Source',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    pair: {
      pairedDocId: 'page-1-dup',
      role: 'original',
      pairedLabel: 'W-2 (WHYNOT STOP) - Organizer',
      pairedPage: 1,
    },
    evidence: null,
  },

  // ── Duplicate Pair 2: 1099-MISC Organizer ──
  {
    id: 'page-4-dup',
    pageNumber: 4,
    fileName: '1099-MISC-RICHMONT-organizer.pdf',
    formType: '1099-MISC',
    formLabel: '1099-MISC (RICHMONT) - Organizer',
    status: 'duplicate',
    fieldsToReview: 0,
    reviewState: 'pending',
    pair: {
      pairedDocId: 'page-4-src',
      role: 'duplicate',
      pairedLabel: '1099-MISC (RICHMONT) - Source',
      pairedPage: 15,
    },
    evidence: {
      rule: 'NEAR_DATA_MATCH',
      reason: 'Income amounts match exactly. Same payer and recipient on both.',
      confidence: 0.94,
      comparedValues: [
        { field: 'Recipient', valueA: 'JACK ANDERSON', valueB: 'JACK ANDERSON', match: true },
        { field: 'Payer', valueA: 'RICHMONT NORTH AMERICA', valueB: 'RICHMONT NORTH AMERICA', match: true },
        { field: 'Box 3', valueA: '$14,921.24', valueB: '$14,921.24', match: true },
      ],
    },
  },
  {
    id: 'page-4-src',
    pageNumber: 15,
    fileName: '1099-MISC-RICHMONT-source.pdf',
    formType: '1099-MISC',
    formLabel: '1099-MISC (RICHMONT) - Source',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    pair: {
      pairedDocId: 'page-4-dup',
      role: 'original',
      pairedLabel: '1099-MISC (RICHMONT) - Organizer',
      pairedPage: 4,
    },
    evidence: null,
  },

  // ── CFA ──
  {
    id: 'page-4-cfa',
    pageNumber: 30,
    fileName: '1099-MISC-RICHMONT.pdf',
    formType: '1099-MISC',
    formLabel: '1099-MISC (RICHMONT NORTH AMERICA)',
    status: 'cfa-child',
    fieldsToReview: 2,
    reviewState: 'pending',
    pair: {
      pairedDocId: 'page-1040',
      role: 'child',
      pairedLabel: 'Form 1040 (Jill Anderson)',
      pairedPage: 0,
    },
    evidence: {
      rule: 'CFA-4',
      reason: 'Recipient name and TIN do not match primary filer. AddForm required for spouse filing.',
      confidence: 0.78,
      parentFormLabel: 'Form 1040 (Jill Anderson)',
      isAddForm: true,
      comparedValues: [
        { field: 'Recipient', valueA: 'JACK ANDERSON', valueB: 'JILL ANDERSON (Filer)', match: false },
        { field: 'Recipient TIN', valueA: '111-11-1111', valueB: '***-**-1234', match: false },
        { field: 'Address', valueA: '1234 MAIN ST, DALLAS TX', valueB: '1234 MAIN ST, DALLAS TX', match: true },
      ],
    },
  },

  // ── NFR ──
  {
    id: 'page-nfr-1',
    pageNumber: 35,
    fileName: '1099-MISC-Other.pdf',
    formType: '1099-MISC',
    formLabel: '1099-MISC Other Income',
    status: 'nfr-unmatched',
    fieldsToReview: 1,
    reviewState: 'pending',
    pair: null,
    evidence: {
      rule: 'NFR-6',
      reason: 'Recipient does not match filer. No proforma form meets threshold.',
      confidence: 0.68,
      sourceMapping: '1099-MISC Box 3',
      returnMapping: '1040 Schedule 1, Line 8z',
      comparedValues: [
        { field: 'Recipient', valueA: 'JACK ANDERSON', valueB: 'JILL ANDERSON (Filer)', match: false },
        { field: 'Box 3 Amount', valueA: '$14,921.24', valueB: '$14,921.24', match: true },
      ],
    },
  },
  {
    id: 'page-nfr-2',
    pageNumber: 38,
    fileName: 'K1-Chapman-Business.pdf',
    formType: 'Schedule K-1',
    formLabel: 'K-1 Business Income',
    status: 'nfr-unmatched',
    fieldsToReview: 2,
    reviewState: 'pending',
    pair: null,
    evidence: {
      rule: 'NFR-3',
      reason: 'Business income differs. Beneficiary name does not match filer.',
      confidence: 0.55,
      sourceMapping: 'K-1 (1041) Box 6',
      returnMapping: '1040 Schedule E, Part III',
      comparedValues: [
        { field: 'Business Income', valueA: '$8,748', valueB: '$9,200', match: false },
        { field: 'Beneficiary', valueA: 'JILL BAKER FAMILY TRUST', valueB: 'JILL ANDERSON', match: false },
      ],
    },
  },

  // ── Verification issues ──
  {
    id: 'page-v1',
    pageNumber: 12,
    fileName: 'Wendy1099-div.pdf',
    formType: '1099-DIV',
    formLabel: '1099-DIV (Wendy)',
    status: 'incorrect-tax-year',
    fieldsToReview: 4,
    reviewState: 'pending',
    pair: null,
    evidence: null,
  },
  {
    id: 'page-v2',
    pageNumber: 18,
    fileName: 'W-2-2024.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (2024 Filing)',
    status: 'needs-review',
    fieldsToReview: 4,
    reviewState: 'pending',
    pair: null,
    evidence: null,
  },

  // ── Verified / Clean ──
  {
    id: 'page-3',
    pageNumber: 3,
    fileName: 'Schedule-C-Craft-Shop.pdf',
    formType: 'Schedule C',
    formLabel: 'Schedule C (Craft Shop)',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    pair: null,
    evidence: null,
  },
  {
    id: 'page-42',
    pageNumber: 42,
    fileName: 'Chapman-Trust-K1-amended.pdf',
    formType: 'Schedule K-1',
    formLabel: 'K-1 (Chapman Trust) - Amended',
    status: 'verified',
    fieldsToReview: 0,
    reviewState: 'accepted',
    pair: null,
    evidence: null,
  },
]

// ── Helpers ──

export function getSummary(docs: UnifiedDocument[]) {
  const out = {
    total: docs.length,
    superseded: 0,
    duplicate: 0,
    cfa: 0,
    nfr: 0,
    needsReview: 0,
    verified: 0,
    pending: 0,
    accepted: 0,
  }
  for (const d of docs) {
    if (d.status === 'superseded') out.superseded++
    else if (d.status === 'duplicate') out.duplicate++
    else if (d.status === 'cfa-child') out.cfa++
    else if (d.status === 'nfr-unmatched') out.nfr++
    else if (d.status === 'verified') out.verified++
    else out.needsReview++

    if (d.reviewState === 'pending') out.pending++
    else if (d.reviewState === 'accepted') out.accepted++
  }
  return out
}

/** Group documents by their pair for visual grouping in table */
export function getGroupedDocs(docs: UnifiedDocument[]): (UnifiedDocument | UnifiedDocument[])[] {
  const used = new Set<string>()
  const result: (UnifiedDocument | UnifiedDocument[])[] = []

  for (const doc of docs) {
    if (used.has(doc.id)) continue
    used.add(doc.id)

    if (doc.pair) {
      const paired = docs.find(d => d.id === doc.pair!.pairedDocId)
      if (paired && !used.has(paired.id)) {
        used.add(paired.id)
        // Put the actionable doc (superseded/duplicate) first, original second
        if (doc.status === 'superseded' || doc.status === 'duplicate') {
          result.push([doc, paired])
        } else {
          result.push([paired, doc])
        }
        continue
      }
    }
    result.push(doc)
  }
  return result
}

export const FORM_TYPES = ['All', 'W-2', '1099-DIV', '1099-INT', '1099-MISC', 'Schedule K-1', 'Schedule C'] as const
export const STATUS_FILTERS = ['All', 'Superseded', 'Duplicate', 'CFA Child', 'NFR Unmatched', 'Needs review', 'Incorrect tax year', 'Verified'] as const
export const REVIEW_FILTERS = ['All', 'Pending', 'Accepted', 'Overridden', 'Flagged'] as const
