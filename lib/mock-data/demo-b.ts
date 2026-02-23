import type { Binder, SupersededRecord, DuplicateRecord, CfaRecord, NfrRecord } from '@/lib/types'

export const binderB: Binder = {
  id: 'demo-b',
  label: 'Demo Binder B',
  taxpayerName: 'Robert & Maria Garcia',
  taxYear: 2023,
  totalDocuments: 18,
  summary: [
    { wizardType: 'superseded', totalItems: 8, highConfidence: 2, mediumConfidence: 3, lowConfidence: 3 },
    { wizardType: 'duplicate', totalItems: 7, highConfidence: 1, mediumConfidence: 3, lowConfidence: 3 },
    { wizardType: 'cfa', totalItems: 5, highConfidence: 1, mediumConfidence: 2, lowConfidence: 2 },
    { wizardType: 'nfr', totalItems: 6, highConfidence: 1, mediumConfidence: 2, lowConfidence: 3 },
  ],
}

export const supersededB: SupersededRecord[] = [
  {
    engagementPageId: 10, isSuperseded: true, retainedPageId: 14, confidenceLevel: 0.95,
    decisionType: 'Superseded', appliedRuleSet: 'SourceDocs', decisionRule: 'SUPERSEDED_BY_AMENDED',
    decisionReason: 'Form 1040X clearly supersedes original 1040. All identifiers match.',
    reviewRequired: false, escalationReason: null,
  },
  {
    engagementPageId: 11, isSuperseded: false, retainedPageId: null, confidenceLevel: 0.92,
    decisionType: 'Original', appliedRuleSet: 'SourceDocs', decisionRule: 'ORIGINAL_RETAINED',
    decisionReason: 'No superseding form found. Original W-2 retained.',
    reviewRequired: false, escalationReason: null,
  },
  {
    engagementPageId: 12, isSuperseded: true, retainedPageId: 10, confidenceLevel: 0.85,
    decisionType: 'Superseded', appliedRuleSet: 'ConsolidatedStatements', decisionRule: 'SUPERSEDED_BY_CORRECTED',
    decisionReason: 'W-2C received after original W-2. Corrected amounts differ.',
    reviewRequired: true, escalationReason: null,
  },

  {
    engagementPageId: 14, isSuperseded: true, retainedPageId: 11, confidenceLevel: 0.73,
    decisionType: 'Superseded', appliedRuleSet: 'SourceDocs', decisionRule: 'SUPERSEDED_BY_AMENDED',
    decisionReason: 'Possible amendment but form types do not align perfectly.',
    reviewRequired: true, escalationReason: null,
  },
  {
    engagementPageId: 15, isSuperseded: true, retainedPageId: 12, confidenceLevel: 0.62,
    decisionType: 'Superseded', appliedRuleSet: 'ConsolidatedStatements', decisionRule: 'SUPERSEDED_UNCERTAIN',
    decisionReason: 'Dates very close. Could be a re-scan rather than a supersession.',
    reviewRequired: true, escalationReason: 'Dates within 24 hours of each other.',
  },

  {
    engagementPageId: 17, isSuperseded: true, retainedPageId: 13, confidenceLevel: 0.48,
    decisionType: 'Superseded', appliedRuleSet: 'SourceDocs', decisionRule: 'SUPERSEDED_UNCERTAIN',
    decisionReason: 'Very low confidence. Only SSN matches; form types, dates, and amounts all differ.',
    reviewRequired: true, escalationReason: 'Multiple field mismatches. Requires human review.',
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
