import type { Binder, SupersededRecord, DuplicateRecord, CfaRecord, NfrRecord } from '@/lib/types'

export const binderB: Binder = {
  id: 'demo-b',
  label: 'Demo Binder B',
  taxpayerName: 'Robert & Maria Garcia',
  taxYear: 2023,
  totalDocuments: 18,
  summary: [
    { wizardType: 'superseded', totalItems: 8, highConfidence: 3, mediumConfidence: 1, lowConfidence: 4 },
    { wizardType: 'duplicate', totalItems: 7, highConfidence: 1, mediumConfidence: 3, lowConfidence: 3 },
    { wizardType: 'cfa', totalItems: 5, highConfidence: 1, mediumConfidence: 2, lowConfidence: 2 },
    { wizardType: 'nfr', totalItems: 6, highConfidence: 1, mediumConfidence: 2, lowConfidence: 3 },
  ],
}

const PDF_PATH_B = '/documents/1TDI-CCH-2024-binder.pdf'

export const supersededB: SupersededRecord[] = [
  // ── W-2 (GARCIA ENTERPRISES) ── 1 Original + 2 Superseded
  {
    engagementPageId: 10,
    isSuperseded: true,
    retainedPageId: 14,
    confidenceLevel: 0.95,
    decisionType: 'Superseded',
    appliedRuleSet: 'SourceDocs',
    decisionRule: 'SUPERSEDED_BY_AMENDED',
    decisionReason: 'Original W-2 from GARCIA ENTERPRISES (page 10) is superseded by corrected W-2 (page 14). All identifiers match. Wages updated from $72,000 to $74,500.',
    reviewRequired: false,
    escalationReason: null,
    documentRef: { pdfPath: PDF_PATH_B, pageNumber: 10, formType: 'W-2', formLabel: 'W-2 (GARCIA ENTERPRISES)' },
    comparedValues: [
      { field: 'Employee Name', valueA: 'ROBERT GARCIA', valueB: 'ROBERT GARCIA', match: true },
      { field: 'Employee SSN', valueA: '***-**-5678', valueB: '***-**-5678', match: true },
      { field: 'Employer EIN', valueA: '72-XXXXXXX', valueB: '72-XXXXXXX', match: true },
      { field: 'Wages (Box 1)', valueA: '$72,000.00', valueB: '$74,500.00', match: false },
      { field: 'Federal Tax Withheld', valueA: '$10,800.00', valueB: '$11,175.00', match: false },
      { field: 'Received Date', valueA: '01/20/2023', valueB: '04/15/2023', match: false },
    ],
  },
  {
    engagementPageId: 12,
    isSuperseded: true,
    retainedPageId: 14,
    confidenceLevel: 0.85,
    decisionType: 'Superseded',
    appliedRuleSet: 'ConsolidatedStatements',
    decisionRule: 'SUPERSEDED_BY_CORRECTED',
    decisionReason: 'W-2C (page 12) received after original W-2 but before final corrected version (page 14). Intermediate correction with partial wage update: $73,200. Also superseded by the final corrected W-2.',
    reviewRequired: true,
    escalationReason: null,
    documentRef: { pdfPath: PDF_PATH_B, pageNumber: 12, formType: 'W-2', formLabel: 'W-2 (GARCIA ENTERPRISES) - W-2C' },
    comparedValues: [
      { field: 'Employee Name', valueA: 'ROBERT GARCIA', valueB: 'ROBERT GARCIA', match: true },
      { field: 'Employee SSN', valueA: '***-**-5678', valueB: '***-**-5678', match: true },
      { field: 'Employer EIN', valueA: '72-XXXXXXX', valueB: '72-XXXXXXX', match: true },
      { field: 'Wages (Box 1)', valueA: '$73,200.00', valueB: '$74,500.00', match: false },
      { field: 'Federal Tax Withheld', valueA: '$10,980.00', valueB: '$11,175.00', match: false },
      { field: 'Received Date', valueA: '03/10/2023', valueB: '04/15/2023', match: false },
    ],
  },
  {
    engagementPageId: 14,
    isSuperseded: false,
    retainedPageId: null,
    confidenceLevel: 0.95,
    decisionType: 'Original',
    appliedRuleSet: 'SourceDocs',
    decisionRule: 'ORIGINAL_CORRECTED',
    decisionReason: 'Final corrected W-2 from GARCIA ENTERPRISES (page 14). Most recent version received 04/15/2023. Wages: $74,500. Supersedes pages 10 and 12.',
    reviewRequired: false,
    escalationReason: null,
    documentRef: { pdfPath: PDF_PATH_B, pageNumber: 14, formType: 'W-2', formLabel: 'W-2 (GARCIA ENTERPRISES) - Final Corrected' },
    comparedValues: [
      { field: 'Employee Name', valueA: 'ROBERT GARCIA', valueB: 'ROBERT GARCIA', match: true },
      { field: 'Employee SSN', valueA: '***-**-5678', valueB: '***-**-5678', match: true },
      { field: 'Employer EIN', valueA: '72-XXXXXXX', valueB: '72-XXXXXXX', match: true },
      { field: 'Wages (Box 1)', valueA: '$72,000.00', valueB: '$74,500.00', match: false },
      { field: 'Federal Tax Withheld', valueA: '$10,800.00', valueB: '$11,175.00', match: false },
      { field: 'Received Date', valueA: '01/20/2023', valueB: '04/15/2023', match: false },
    ],
  },

  // ── 1099-INT (FIRST NATIONAL BANK) ── 1 Original + 1 Superseded
  {
    engagementPageId: 15,
    isSuperseded: true,
    retainedPageId: 16,
    confidenceLevel: 0.62,
    decisionType: 'Superseded',
    appliedRuleSet: 'ConsolidatedStatements',
    decisionRule: 'SUPERSEDED_UNCERTAIN',
    decisionReason: '1099-INT from FIRST NATIONAL BANK (page 15) appears to be superseded by a corrected version (page 16). Interest amounts differ: $1,245.67 vs $1,312.50. Dates are close, could be a re-scan.',
    reviewRequired: true,
    escalationReason: 'Dates within 24 hours of each other. Could be duplicate scan rather than correction.',
    documentRef: { pdfPath: PDF_PATH_B, pageNumber: 15, formType: '1099-INT', formLabel: '1099-INT (FIRST NATIONAL BANK)' },
    comparedValues: [
      { field: 'Payer Name', valueA: 'FIRST NATIONAL BANK', valueB: 'FIRST NATIONAL BANK', match: true },
      { field: 'Payer TIN', valueA: '45-6789012', valueB: '45-6789012', match: true },
      { field: 'Recipient Name', valueA: 'MARIA GARCIA', valueB: 'MARIA GARCIA', match: true },
      { field: 'Interest Income (Box 1)', valueA: '$1,245.67', valueB: '$1,312.50', match: false },
      { field: 'Received Date', valueA: '02/01/2023', valueB: '02/02/2023', match: false },
    ],
  },
  {
    engagementPageId: 16,
    isSuperseded: false,
    retainedPageId: null,
    confidenceLevel: 0.62,
    decisionType: 'Original',
    appliedRuleSet: 'ConsolidatedStatements',
    decisionRule: 'ORIGINAL_LATER_FILING',
    decisionReason: 'Corrected 1099-INT from FIRST NATIONAL BANK (page 16). Received one day after initial version. Interest updated to $1,312.50.',
    reviewRequired: true,
    escalationReason: 'Dates within 24 hours of each other. Could be duplicate scan rather than correction.',
    documentRef: { pdfPath: PDF_PATH_B, pageNumber: 16, formType: '1099-INT', formLabel: '1099-INT (FIRST NATIONAL BANK) - Corrected' },
    comparedValues: [
      { field: 'Payer Name', valueA: 'FIRST NATIONAL BANK', valueB: 'FIRST NATIONAL BANK', match: true },
      { field: 'Payer TIN', valueA: '45-6789012', valueB: '45-6789012', match: true },
      { field: 'Recipient Name', valueA: 'MARIA GARCIA', valueB: 'MARIA GARCIA', match: true },
      { field: 'Interest Income (Box 1)', valueA: '$1,245.67', valueB: '$1,312.50', match: false },
      { field: 'Received Date', valueA: '02/01/2023', valueB: '02/02/2023', match: false },
    ],
  },

  // ── Schedule K-1 (GARCIA FAMILY LP) ── 1 Original + 1 Superseded
  {
    engagementPageId: 17,
    isSuperseded: true,
    retainedPageId: 18,
    confidenceLevel: 0.48,
    decisionType: 'Superseded',
    appliedRuleSet: 'SourceDocs',
    decisionRule: 'SUPERSEDED_UNCERTAIN',
    decisionReason: 'K-1 from GARCIA FAMILY LP (page 17) may be superseded by amended K-1 (page 18). SSN matches but ordinary income amounts differ significantly: $18,500 vs $22,100. Very low confidence due to multiple field mismatches.',
    reviewRequired: true,
    escalationReason: 'Multiple field mismatches. Requires human review.',
    documentRef: { pdfPath: PDF_PATH_B, pageNumber: 17, formType: 'Schedule K-1', formLabel: 'K-1 (GARCIA FAMILY LP)' },
    comparedValues: [
      { field: 'Partnership Name', valueA: 'GARCIA FAMILY LP', valueB: 'GARCIA FAMILY LP', match: true },
      { field: 'Partnership EIN', valueA: '88-XXXXXXX', valueB: '88-XXXXXXX', match: true },
      { field: 'Partner Name', valueA: 'ROBERT GARCIA', valueB: 'ROBERT GARCIA', match: true },
      { field: 'Partner SSN', valueA: '***-**-5678', valueB: '***-**-5678', match: true },
      { field: 'Ordinary Income (Box 1)', valueA: '$18,500.00', valueB: '$22,100.00', match: false },
      { field: 'Net Rental Income', valueA: '$4,200.00', valueB: '$3,800.00', match: false },
      { field: 'Amended K-1', valueA: 'No', valueB: 'Yes', match: false },
    ],
  },
  {
    engagementPageId: 18,
    isSuperseded: false,
    retainedPageId: null,
    confidenceLevel: 0.48,
    decisionType: 'Original',
    appliedRuleSet: 'SourceDocs',
    decisionRule: 'ORIGINAL_AMENDED',
    decisionReason: 'Amended K-1 from GARCIA FAMILY LP (page 18). "Amended K-1" checkbox is marked. Ordinary income updated to $22,100. Low confidence because other fields also differ.',
    reviewRequired: true,
    escalationReason: 'Multiple field mismatches. Requires human review.',
    documentRef: { pdfPath: PDF_PATH_B, pageNumber: 18, formType: 'Schedule K-1', formLabel: 'K-1 (GARCIA FAMILY LP) - Amended' },
    comparedValues: [
      { field: 'Partnership Name', valueA: 'GARCIA FAMILY LP', valueB: 'GARCIA FAMILY LP', match: true },
      { field: 'Partnership EIN', valueA: '88-XXXXXXX', valueB: '88-XXXXXXX', match: true },
      { field: 'Partner Name', valueA: 'ROBERT GARCIA', valueB: 'ROBERT GARCIA', match: true },
      { field: 'Partner SSN', valueA: '***-**-5678', valueB: '***-**-5678', match: true },
      { field: 'Ordinary Income (Box 1)', valueA: '$18,500.00', valueB: '$22,100.00', match: false },
      { field: 'Net Rental Income', valueA: '$4,200.00', valueB: '$3,800.00', match: false },
      { field: 'Amended K-1', valueA: 'No', valueB: 'Yes', match: false },
    ],
  },
]

export const duplicateB: DuplicateRecord[] = [
  {
    itemType: 'DUPLICATE_DATA', organizerItemId: 'ORG-B01', sourceReferenceId: 'SRC-B01',
    decision: 'DuplicateData', matchType: 'DirectAmount', confidenceLevel: 0.96,
    appliedRuleSet: 'DUP-DATA', decisionRule: 'EXACT_DATA_MATCH',
    decisionReason: 'Exact match on all key fields for 1099-DIV.',
    fieldsCompared: ['SSN', 'PayerTIN', 'DividendAmount'], reviewRequired: false, escalationReason: null,
  },
  {
    itemType: 'DUPLICATE_DATA', organizerItemId: 'ORG-B02', sourceReferenceId: 'SRC-B02',
    decision: 'DuplicateData', matchType: 'SumMatch', confidenceLevel: 0.84,
    appliedRuleSet: 'DUP-DATA', decisionRule: 'NEAR_DATA_MATCH',
    decisionReason: 'Amounts match within rounding tolerance. Different formatting suggests separate entry.',
    fieldsCompared: ['SSN', 'WagesAmount', 'EmployerName'], reviewRequired: true, escalationReason: null,
  },
  {
    itemType: 'DUPLICATE_DATA', organizerItemId: 'ORG-B03', sourceReferenceId: 'SRC-B03',
    decision: 'NotDuplicateData', matchType: 'Other', confidenceLevel: 0.76,
    appliedRuleSet: 'DUP-DATA', decisionRule: 'AMBIGUOUS_MATCH',
    decisionReason: 'SSN matches but employer names differ slightly. Could be name variation or different employer.',
    fieldsCompared: ['SSN', 'EIN', 'EmployerName'], reviewRequired: true, escalationReason: null,
  },
  {
    itemType: 'DUPLICATE_SOURCE_DOC', docIdA: 301, docIdB: 305, decision: 'Duplicate', retainDocId: 301,
    confidenceLevel: 0.82, appliedRuleSet: 'DUP-SRC', decisionRule: 'VISUAL_DOC_MATCH',
    decisionReason: 'High visual similarity but different scan quality levels.',
    fieldsCompared: ['PixelHash', 'OCRText'], reviewRequired: true, escalationReason: null,
  },
  {
    itemType: 'DUPLICATE_SOURCE_DOC', docIdA: 302, docIdB: 310, decision: 'Duplicate', retainDocId: null,
    confidenceLevel: 0.63, appliedRuleSet: 'DUP-SRC', decisionRule: 'PARTIAL_DOC_MATCH',
    decisionReason: 'Partial text overlap. Documents may be different pages of the same form.',
    fieldsCompared: ['OCRText', 'FormType'], reviewRequired: true,
    escalationReason: 'Cannot determine which document to retain.',
  },
  {
    itemType: 'DUPLICATE_CONSOLIDATED_STATEMENT', docIdA: 400, docIdB: 410, decision: 'Duplicate', retainDocId: null,
    confidenceLevel: 0.57, appliedRuleSet: 'DUP-CS', decisionRule: 'UNCERTAIN_DOC_MATCH',
    decisionReason: 'Headers match but content differs significantly.',
    fieldsCompared: ['HeaderText', 'AccountNumber'], reviewRequired: true,
    escalationReason: 'Content divergence too high for automated decision.',
  },
  {
    itemType: 'DUPLICATE_CONSOLIDATED_STATEMENT', docIdA: 401, docIdB: 411, decision: 'NotDuplicate', retainDocId: null,
    confidenceLevel: 0.45, appliedRuleSet: 'DUP-CS', decisionRule: 'NOT_DUPLICATE_UNCERTAIN',
    decisionReason: 'Very low similarity. Likely different statements entirely but flagged due to shared account.',
    fieldsCompared: ['AccountNumber', 'StatementDate', 'TotalAmount'], reviewRequired: true,
    escalationReason: 'Extremely low confidence. Human verification essential.',
  },
]

export const cfaB: CfaRecord[] = [
  {
    EngagementFaxFormId: 4001, ParentEngagementFaxFormId: 2001, EngagementPageId: 10,
    ConfidenceLevel: 0.94, IsAddForm: false, ParentFaxFormDwpCode: 'DWP-100', ParentFaxFormId: 2001,
  },
  {
    EngagementFaxFormId: 4002, ParentEngagementFaxFormId: 2001, EngagementPageId: 12,
    ConfidenceLevel: 0.81, IsAddForm: false, ParentFaxFormDwpCode: 'DWP-200', ParentFaxFormId: 2001,
  },
  {
    EngagementFaxFormId: 4003, ParentEngagementFaxFormId: 2001, EngagementPageId: 14,
    ConfidenceLevel: 0.77, IsAddForm: true, ParentFaxFormDwpCode: 'DWP-300', ParentFaxFormId: 2001,
  },
  {
    EngagementFaxFormId: 4004, ParentEngagementFaxFormId: 2001, EngagementPageId: 16,
    ConfidenceLevel: 0.64, IsAddForm: false, ParentFaxFormDwpCode: 'DWP-400', ParentFaxFormId: 2001,
  },
  {
    EngagementFaxFormId: 4005, ParentEngagementFaxFormId: 2001, EngagementPageId: 18,
    ConfidenceLevel: 0.52, IsAddForm: true, ParentFaxFormDwpCode: 'DWP-500', ParentFaxFormId: 2001,
  },
]

export const nfrB: NfrRecord[] = [
  {
    EngagementId: 6001, EngagementPageId: 10, EngagementFormId: 1040, EngagementFieldGroupId: 10,
    FieldGroupId: 100, EngagementFaxFormId: 7001, FaxRowNumber: 1, TaxFormInstanceNo: 1,
    ConfidenceLevel: 0.94, MatchStatus: true,
  },
  {
    EngagementId: 6001, EngagementPageId: 11, EngagementFormId: 1040, EngagementFieldGroupId: 20,
    FieldGroupId: 200, EngagementFaxFormId: 7002, FaxRowNumber: 2, TaxFormInstanceNo: 1,
    ConfidenceLevel: 0.83, MatchStatus: true,
  },
  {
    EngagementId: 6001, EngagementPageId: 12, EngagementFormId: 1040, EngagementFieldGroupId: 30,
    FieldGroupId: 300, EngagementFaxFormId: 7003, FaxRowNumber: 3, TaxFormInstanceNo: 1,
    ConfidenceLevel: 0.79, MatchStatus: false,
  },
  {
    EngagementId: 6001, EngagementPageId: 13, EngagementFormId: 1099, EngagementFieldGroupId: 40,
    FieldGroupId: 400, EngagementFaxFormId: 7004, FaxRowNumber: 4, TaxFormInstanceNo: 1,
    ConfidenceLevel: 0.62, MatchStatus: false,
  },
  {
    EngagementId: 6001, EngagementPageId: 14, EngagementFormId: 1040, EngagementFieldGroupId: 50,
    FieldGroupId: 500, EngagementFaxFormId: 7005, FaxRowNumber: 5, TaxFormInstanceNo: 1,
    ConfidenceLevel: 0.51, MatchStatus: false,
  },
  {
    EngagementId: 6001, EngagementPageId: 15, EngagementFormId: 1040, EngagementFieldGroupId: 60,
    FieldGroupId: 600, EngagementFaxFormId: 7006, FaxRowNumber: 6, TaxFormInstanceNo: 1,
    ConfidenceLevel: 0.44, MatchStatus: false,
  },
]
