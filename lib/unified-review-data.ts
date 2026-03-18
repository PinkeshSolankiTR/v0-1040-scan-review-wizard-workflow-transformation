/**
 * Unified Review Data
 *
 * Merges verification, superseded, duplicate, CFA, and NFR
 * into a single document-centric model for the Initial Draft view.
 *
 * Classification priority (mutually exclusive):
 *   Superseded > Duplicate > CFA > NFR > Clean
 */

import type { ComparedValue, DocumentRef } from '@/lib/types'

// ── Classification types ──

export type ClassificationType =
  | 'superseded'
  | 'duplicate'
  | 'cfa'
  | 'nfr'
  | 'clean'

export type ReviewStatus = 'pending' | 'accepted' | 'overridden' | 'flagged'

export interface ClassificationDetail {
  type: ClassificationType
  decision: string
  rule: string
  reason: string
  confidence: number
  reviewRequired: boolean
  escalationReason: string | null
  comparedValues: ComparedValue[]
  /** For superseded: which page it's superseded by */
  retainedPageId?: number
  /** For duplicate: which doc to retain */
  retainDocId?: number
  /** For CFA: parent form info */
  parentFormLabel?: string
  isAddForm?: boolean
  /** For NFR: source/return mapping */
  sourceValue?: string
  returnValue?: string
}

export interface UnifiedDocument {
  id: string
  pageNumber: number
  fileName: string
  formType: string
  formLabel: string
  pdfPath: string
  /** Verification status from field extraction */
  verificationStatus: 'confident' | 'needs-review' | 'incorrect-tax-year'
  fieldsToReview: number
  /** AI classification (mutually exclusive, priority order applied) */
  classification: ClassificationDetail
  /** User review status */
  reviewStatus: ReviewStatus
}

// ── Constants ──

const PDF_PATH = '/documents/1TDI-CCH-2024-binder.pdf'

// ── Mock data: 48 pages scanned, each gets ONE classification ──

export const UNIFIED_DOCUMENTS: UnifiedDocument[] = [
  // ── SUPERSEDED DOCUMENTS ──
  {
    id: 'page-5',
    pageNumber: 5,
    fileName: 'W-2-WHYNOT-STOP.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (WHYNOT STOP INC)',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'superseded',
      decision: 'Superseded',
      rule: 'A9',
      reason: 'Page 14 is the corrected version with updated wage amounts.',
      confidence: 0.95,
      reviewRequired: false,
      escalationReason: null,
      retainedPageId: 14,
      comparedValues: [
        { field: 'Employer Name', valueA: 'WHYNOT STOP INC', valueB: 'WHYNOT STOP INC', match: true, category: 'Employer Info' },
        { field: 'Employer EIN', valueA: '53-XXXXXXX', valueB: '53-XXXXXXX', match: true, category: 'Employer Info' },
        { field: 'Employee Name', valueA: 'JILL ANDERSON', valueB: 'JILL ANDERSON', match: true, category: 'Employee Info' },
        { field: 'Wages (Box 1)', valueA: '$62,400.00', valueB: '$63,150.00', match: false, category: 'Income' },
        { field: 'Federal Tax Withheld (Box 2)', valueA: '$9,360.00', valueB: '$9,472.50', match: false, category: 'Income' },
        { field: 'Corrected', valueA: 'No', valueB: 'Yes', match: false, category: 'Document' },
      ],
    },
    reviewStatus: 'pending',
  },
  {
    id: 'page-21',
    pageNumber: 21,
    fileName: 'ExxonMobil-1099-DIV.pdf',
    formType: '1099-DIV',
    formLabel: '1099-DIV (ExxonMobil)',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'superseded',
      decision: 'Superseded',
      rule: 'A9',
      reason: 'Page 32 is the corrected version with updated dividend amounts.',
      confidence: 0.92,
      reviewRequired: false,
      escalationReason: null,
      retainedPageId: 32,
      comparedValues: [
        { field: 'Payer Name', valueA: 'EXXON MOBIL CORPORATION', valueB: 'EXXON MOBIL CORPORATION', match: true, category: 'Payer Info' },
        { field: 'Recipient Name', valueA: 'JILL ANDERSON', valueB: 'JILL ANDERSON', match: true, category: 'Recipient Info' },
        { field: 'Total Ordinary Dividends (Box 1a)', valueA: '$3,285.60', valueB: '$3,412.80', match: false, category: 'Income' },
        { field: 'Corrected', valueA: 'No', valueB: 'Yes', match: false, category: 'Document' },
      ],
    },
    reviewStatus: 'pending',
  },
  {
    id: 'page-17',
    pageNumber: 17,
    fileName: 'ExxonMobil-1099-DIV-draft.pdf',
    formType: '1099-DIV',
    formLabel: '1099-DIV (ExxonMobil) - Draft',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'superseded',
      decision: 'Superseded',
      rule: 'A9',
      reason: 'Earliest draft. Replaced first by page 21, then by corrected page 32.',
      confidence: 0.92,
      reviewRequired: false,
      escalationReason: null,
      retainedPageId: 32,
      comparedValues: [
        { field: 'Payer Name', valueA: 'EXXON MOBIL CORPORATION', valueB: 'EXXON MOBIL CORPORATION', match: true, category: 'Payer Info' },
        { field: 'Document Number', valueA: 'D04018-DRAFT', valueB: 'D04018-C', match: false, category: 'Document' },
        { field: 'Corrected', valueA: 'No', valueB: 'Yes', match: false, category: 'Document' },
      ],
    },
    reviewStatus: 'pending',
  },
  {
    id: 'page-8',
    pageNumber: 8,
    fileName: 'Chase-1099-INT.pdf',
    formType: '1099-INT',
    formLabel: '1099-INT (Chase Bank)',
    pdfPath: PDF_PATH,
    verificationStatus: 'needs-review',
    fieldsToReview: 2,
    classification: {
      type: 'superseded',
      decision: 'Superseded',
      rule: 'A6',
      reason: 'Same bank, same account. Interest amounts differ by $142. Page 22 has higher amount.',
      confidence: 0.78,
      reviewRequired: true,
      escalationReason: 'Interest amounts differ. Could be a corrected version or a different account.',
      retainedPageId: 22,
      comparedValues: [
        { field: 'Payer Name', valueA: 'JPMORGAN CHASE BANK NA', valueB: 'JPMORGAN CHASE BANK NA', match: true, category: 'Payer Info' },
        { field: 'Interest Income (Box 1)', valueA: '$1,845.00', valueB: '$1,987.00', match: false, category: 'Income' },
        { field: 'Account Number', valueA: '****8821', valueB: '****8821', match: true, category: 'Account' },
      ],
    },
    reviewStatus: 'pending',
  },
  {
    id: 'page-15',
    pageNumber: 15,
    fileName: 'Chapman-Trust-K1.pdf',
    formType: 'Schedule K-1',
    formLabel: 'K-1 (Chapman Trust)',
    pdfPath: PDF_PATH,
    verificationStatus: 'needs-review',
    fieldsToReview: 3,
    classification: {
      type: 'superseded',
      decision: 'Superseded',
      rule: 'A7',
      reason: 'Same trust EIN. Multiple income categories differ significantly. May be from different reporting periods.',
      confidence: 0.58,
      reviewRequired: true,
      escalationReason: 'Confidence below threshold. Multiple income categories differ. Could be amended K-1 or different distribution period.',
      retainedPageId: 42,
      comparedValues: [
        { field: 'Trust Name', valueA: 'CHAPMAN IRREVOCABLE TRUST', valueB: 'CHAPMAN IRREVOCABLE TRUST', match: true, category: 'Entity Info' },
        { field: 'Ordinary Business Income', valueA: '$8,748.00', valueB: '$12,200.00', match: false, category: 'Income' },
        { field: 'Ordinary Dividends', valueA: '$62,565.00', valueB: '$58,900.00', match: false, category: 'Income' },
        { field: 'Net Rental Income', valueA: '$4,200.00', valueB: '$0.00', match: false, category: 'Income' },
      ],
    },
    reviewStatus: 'pending',
  },

  // ── DUPLICATE DOCUMENTS ──
  {
    id: 'page-1-dup',
    pageNumber: 1,
    fileName: 'W-2-WHYNOT-organizer.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (WHYNOT STOP INC) - Organizer Copy',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'duplicate',
      decision: 'Duplicate Data',
      rule: 'EXACT_DATA_MATCH',
      reason: 'Exact match between organizer W-2 and source W-2. All fields identical.',
      confidence: 0.97,
      reviewRequired: false,
      escalationReason: null,
      retainDocId: 101,
      comparedValues: [
        { field: 'Employee SSN', valueA: '***-**-1234', valueB: '***-**-1234', match: true },
        { field: 'Employer EIN', valueA: '53-XXXXXXX', valueB: '53-XXXXXXX', match: true },
        { field: 'Employer Name', valueA: 'WHYNOT STOP INC', valueB: 'WHYNOT STOP INC', match: true },
        { field: 'Tax Year', valueA: '2024', valueB: '2024', match: true },
      ],
    },
    reviewStatus: 'pending',
  },
  {
    id: 'page-4-dup',
    pageNumber: 4,
    fileName: '1099-MISC-RICHMONT-organizer.pdf',
    formType: '1099-MISC',
    formLabel: '1099-MISC (RICHMONT) - Organizer Copy',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'duplicate',
      decision: 'Duplicate Data',
      rule: 'NEAR_DATA_MATCH',
      reason: 'Income amounts match exactly. Same person on both documents.',
      confidence: 0.94,
      reviewRequired: false,
      escalationReason: null,
      retainDocId: 102,
      comparedValues: [
        { field: 'Recipient Name', valueA: 'JACK ANDERSON', valueB: 'JACK ANDERSON', match: true },
        { field: 'Payer Name', valueA: 'RICHMONT NORTH AMERICA, INC', valueB: 'RICHMONT NORTH AMERICA, INC', match: true },
        { field: 'Box 3 (Other Income)', valueA: '$14,921.24', valueB: '$14,921.24', match: true },
      ],
    },
    reviewStatus: 'pending',
  },
  {
    id: 'page-2-scan',
    pageNumber: 2,
    fileName: 'W-2-scan-B.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (WHYNOT STOP) - Scan B',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'duplicate',
      decision: 'Duplicate Document',
      rule: 'VISUAL_DOC_MATCH',
      reason: 'Two copies of the same document. Pixel similarity 92%. Different scan quality (300 DPI vs 150 DPI).',
      confidence: 0.88,
      reviewRequired: true,
      escalationReason: null,
      retainDocId: 101,
      comparedValues: [
        { field: 'Employer Name', valueA: 'WHYNOT STOP INC', valueB: 'WHYNOT STOP INC', match: true },
        { field: 'Employee Name', valueA: 'JILL ANDERSON', valueB: 'JILL ANDERSON', match: true },
        { field: 'Pixel Similarity', valueA: '92%', valueB: '92%', match: true },
        { field: 'Scan Quality', valueA: '300 DPI', valueB: '150 DPI', match: false },
      ],
    },
    reviewStatus: 'pending',
  },

  // ── CFA DOCUMENTS ──
  {
    id: 'page-4-cfa',
    pageNumber: 4,
    fileName: '1099-MISC-RICHMONT.pdf',
    formType: '1099-MISC',
    formLabel: '1099-MISC (RICHMONT NORTH AMERICA)',
    pdfPath: PDF_PATH,
    verificationStatus: 'needs-review',
    fieldsToReview: 2,
    classification: {
      type: 'cfa',
      decision: 'Associate (AddForm)',
      rule: 'CFA-4',
      reason: 'Recipient name and TIN do not match primary filer. AddForm required for spouse filing.',
      confidence: 0.78,
      reviewRequired: true,
      escalationReason: null,
      parentFormLabel: 'Form 1040 (Jill Anderson)',
      isAddForm: true,
      comparedValues: [
        { field: 'Recipient Name', valueA: 'JACK ANDERSON', valueB: 'JILL ANDERSON (1040 Filer)', match: false },
        { field: 'Recipient TIN', valueA: '111-11-1111', valueB: '***-**-1234 (Primary SSN)', match: false },
        { field: 'Address', valueA: '1234 MAIN STREET, DALLAS, TX 75202', valueB: '1234 MAIN STREET, DALLAS, TX 75202', match: true },
      ],
    },
    reviewStatus: 'pending',
  },

  // ── NFR DOCUMENTS ──
  {
    id: 'page-4-nfr',
    pageNumber: 4,
    fileName: '1099-MISC-RICHMONT-nfr.pdf',
    formType: '1099-MISC',
    formLabel: '1099-MISC Other Income',
    pdfPath: PDF_PATH,
    verificationStatus: 'needs-review',
    fieldsToReview: 1,
    classification: {
      type: 'nfr',
      decision: 'Unmatched',
      rule: 'NFR-6',
      reason: 'Recipient name and TIN do not match primary filer. No proforma form meets threshold.',
      confidence: 0.68,
      reviewRequired: true,
      escalationReason: null,
      sourceValue: '1099-MISC Box 3',
      returnValue: '1040 Schedule 1, Line 8z',
      comparedValues: [
        { field: 'Recipient Name', valueA: 'JACK ANDERSON (1099-MISC)', valueB: 'JILL ANDERSON (1040 Filer)', match: false },
        { field: 'Box 3 Amount', valueA: '$14,921.24', valueB: '$14,921.24', match: true },
      ],
    },
    reviewStatus: 'pending',
  },
  {
    id: 'page-5-nfr',
    pageNumber: 5,
    fileName: 'K1-Chapman-Business.pdf',
    formType: 'Schedule K-1',
    formLabel: 'K-1 Business Income',
    pdfPath: PDF_PATH,
    verificationStatus: 'needs-review',
    fieldsToReview: 2,
    classification: {
      type: 'nfr',
      decision: 'Unmatched',
      rule: 'NFR-3',
      reason: 'Business income amount differs. Beneficiary name does not match filer.',
      confidence: 0.55,
      reviewRequired: true,
      escalationReason: null,
      sourceValue: 'K-1 (Form 1041) Box 6',
      returnValue: '1040 Schedule E, Part III',
      comparedValues: [
        { field: 'Business Income (Box 6)', valueA: '$8,748', valueB: '$9,200', match: false },
        { field: 'Beneficiary Name', valueA: 'JILL BAKER FAMILY TRUST', valueB: 'JILL ANDERSON', match: false },
      ],
    },
    reviewStatus: 'pending',
  },

  // ── CLEAN DOCUMENTS (no issues) ──
  {
    id: 'page-14',
    pageNumber: 14,
    fileName: 'W-2-WHYNOT-corrected.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (WHYNOT STOP INC) - Corrected',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'clean',
      decision: 'Original',
      rule: '-',
      reason: 'This is the corrected W-2. Retained as original.',
      confidence: 1.0,
      reviewRequired: false,
      escalationReason: null,
      comparedValues: [],
    },
    reviewStatus: 'accepted',
  },
  {
    id: 'page-32',
    pageNumber: 32,
    fileName: 'ExxonMobil-1099-DIV-corrected.pdf',
    formType: '1099-DIV',
    formLabel: '1099-DIV (ExxonMobil) - Corrected',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'clean',
      decision: 'Original',
      rule: '-',
      reason: 'Corrected 1099-DIV. Retained as original.',
      confidence: 1.0,
      reviewRequired: false,
      escalationReason: null,
      comparedValues: [],
    },
    reviewStatus: 'accepted',
  },
  {
    id: 'page-22',
    pageNumber: 22,
    fileName: 'Chase-1099-INT-updated.pdf',
    formType: '1099-INT',
    formLabel: '1099-INT (Chase Bank) - Updated',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'clean',
      decision: 'Original',
      rule: '-',
      reason: 'Updated 1099-INT with higher interest amount. Retained.',
      confidence: 1.0,
      reviewRequired: false,
      escalationReason: null,
      comparedValues: [],
    },
    reviewStatus: 'accepted',
  },
  {
    id: 'page-1',
    pageNumber: 1,
    fileName: 'W-2-WHYNOT-source.pdf',
    formType: 'W-2',
    formLabel: 'W-2 (WHYNOT STOP INC) - Source',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'clean',
      decision: 'Original',
      rule: '-',
      reason: 'Source W-2 document. No issues detected.',
      confidence: 1.0,
      reviewRequired: false,
      escalationReason: null,
      comparedValues: [],
    },
    reviewStatus: 'accepted',
  },
  {
    id: 'page-3',
    pageNumber: 3,
    fileName: 'Schedule-C-Craft-Shop.pdf',
    formType: 'Schedule C',
    formLabel: 'Schedule C (Jill\'s Craft Shop)',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'clean',
      decision: 'Original',
      rule: '-',
      reason: 'Schedule C verified. No duplicates or superseded versions found.',
      confidence: 1.0,
      reviewRequired: false,
      escalationReason: null,
      comparedValues: [],
    },
    reviewStatus: 'accepted',
  },
  {
    id: 'page-42',
    pageNumber: 42,
    fileName: 'Chapman-Trust-K1-amended.pdf',
    formType: 'Schedule K-1',
    formLabel: 'K-1 (Chapman Trust) - Amended',
    pdfPath: PDF_PATH,
    verificationStatus: 'confident',
    fieldsToReview: 0,
    classification: {
      type: 'clean',
      decision: 'Original',
      rule: '-',
      reason: 'Amended K-1. Retained as the current version.',
      confidence: 1.0,
      reviewRequired: false,
      escalationReason: null,
      comparedValues: [],
    },
    reviewStatus: 'accepted',
  },
]

// ── Derived summaries ──

export function getClassificationSummary(docs: UnifiedDocument[]) {
  const counts = {
    superseded: 0,
    duplicate: 0,
    cfa: 0,
    nfr: 0,
    clean: 0,
    total: docs.length,
    needsReview: 0,
    reviewed: 0,
  }

  for (const doc of docs) {
    counts[doc.classification.type]++
    if (doc.reviewStatus === 'pending' && doc.classification.reviewRequired) {
      counts.needsReview++
    }
    if (doc.reviewStatus === 'accepted' || doc.reviewStatus === 'overridden') {
      counts.reviewed++
    }
  }

  return counts
}

export const CLASSIFICATION_LABELS: Record<ClassificationType, string> = {
  superseded: 'Superseded',
  duplicate: 'Duplicate',
  cfa: 'Child Form Association',
  nfr: 'New Form Review',
  clean: 'Clean',
}

export const CLASSIFICATION_COLORS: Record<ClassificationType, { bg: string; text: string; border: string }> = {
  superseded: {
    bg: 'oklch(0.95 0.03 290)',
    text: 'oklch(0.40 0.18 290)',
    border: 'oklch(0.82 0.08 290)',
  },
  duplicate: {
    bg: 'oklch(0.95 0.03 250)',
    text: 'oklch(0.40 0.15 250)',
    border: 'oklch(0.82 0.08 250)',
  },
  cfa: {
    bg: 'oklch(0.95 0.03 165)',
    text: 'oklch(0.40 0.17 165)',
    border: 'oklch(0.82 0.08 165)',
  },
  nfr: {
    bg: 'oklch(0.95 0.03 60)',
    text: 'oklch(0.45 0.15 60)',
    border: 'oklch(0.82 0.08 60)',
  },
  clean: {
    bg: 'oklch(0.97 0.02 145)',
    text: 'oklch(0.40 0.16 145)',
    border: 'oklch(0.88 0.08 145)',
  },
}

export const FILTER_OPTIONS = ['All', 'Superseded', 'Duplicate', 'CFA', 'NFR', 'Clean'] as const
export const FORM_TYPE_OPTIONS = ['All', 'W-2', '1099-DIV', '1099-INT', '1099-MISC', 'Schedule K-1', 'Schedule C'] as const
export const REVIEW_STATUS_OPTIONS = ['All', 'Pending', 'Accepted', 'Overridden', 'Flagged'] as const
