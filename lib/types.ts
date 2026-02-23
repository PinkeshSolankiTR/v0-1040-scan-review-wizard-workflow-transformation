// ── Binder ──
export interface Binder {
  id: string
  label: string
  taxpayerName: string
  taxYear: number
  totalDocuments: number
  summary: WizardSummary[]
}

export interface WizardSummary {
  wizardType: WizardType
  totalItems: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
}

export type WizardType = 'superseded' | 'duplicate' | 'cfa' | 'nfr'

// ── Confidence ──
export type ConfidenceLevel = 'high' | 'medium' | 'low'

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.9) return 'high'
  if (score >= 0.7) return 'medium'
  return 'low'
}

// ── Superseded ──
export interface SupersededRecord {
  engagementPageId: number
  isSuperseded: boolean
  retainedPageId: number | null
  confidenceLevel: number
  decisionType: 'Original' | 'Superseded'
  appliedRuleSet: 'SourceDocs' | 'ConsolidatedStatements'
  decisionRule: string
  decisionReason: string
  reviewRequired: boolean
  escalationReason: string | null
  comparedValues?: ComparedValue[]
  documentRef?: DocumentRef
}

// ── Duplicate ──
export interface DuplicateDataRecord {
  itemType: 'DUPLICATE_DATA'
  organizerItemId: string
  sourceReferenceId: string
  decision: 'DuplicateData' | 'NotDuplicateData'
  matchType: 'DirectAmount' | 'SumMatch' | 'Other'
  confidenceLevel: number
  appliedRuleSet: 'DUP-DATA'
  decisionRule: string
  decisionReason: string
  fieldsCompared: string[]
  reviewRequired: boolean
  escalationReason: string | null
  comparedValues?: ComparedValue[]
  documentRefA?: DocumentRef
  documentRefB?: DocumentRef
}

export interface DuplicateDocRecord {
  itemType: 'DUPLICATE_SOURCE_DOC' | 'DUPLICATE_CONSOLIDATED_STATEMENT'
  docIdA: number
  docIdB: number
  decision: 'Duplicate' | 'NotDuplicate'
  retainDocId: number | null
  confidenceLevel: number
  appliedRuleSet: 'DUP-SRC' | 'DUP-CS'
  decisionRule: string
  decisionReason: string
  fieldsCompared: string[]
  reviewRequired: boolean
  escalationReason: string | null
  comparedValues?: ComparedValue[]
  documentRefA?: DocumentRef
  documentRefB?: DocumentRef
}

export type DuplicateRecord = DuplicateDataRecord | DuplicateDocRecord

// ── CFA ──
export interface CfaRecord {
  EngagementFaxFormId: number
  ParentEngagementFaxFormId: number
  EngagementPageId: number
  ConfidenceLevel: number
  IsAddForm: boolean
  ParentFaxFormDwpCode: string
  ParentFaxFormId: number
  childFormLabel?: string
  parentFormLabel?: string
  comparedValues?: ComparedValue[]
  documentRef?: DocumentRef
}

// ── NFR ──
export interface NfrRecord {
  EngagementId: number
  EngagementPageId: number
  EngagementFormId: number
  EngagementFieldGroupId: number
  FieldGroupId: number
  EngagementFaxFormId: number
  FaxRowNumber: number
  TaxFormInstanceNo: number
  ConfidenceLevel: number
  MatchStatus: boolean
  fieldLabel?: string
  sourceValue?: string
  returnValue?: string
  comparedValues?: ComparedValue[]
  documentRef?: DocumentRef
}

// ── Audit ──
export interface AuditEntry {
  timestamp: string
  wizardType: WizardType
  itemKey: string
  action: 'accepted' | 'undone'
  confidence: number
  method: 'manual' | 'bulk'
}

// ── Compared Field Values ──
export interface ComparedValue {
  field: string
  valueA: string
  valueB: string
  match: boolean
}

// ── Document Reference ──
export interface DocumentRef {
  pdfPath: string
  pageNumber: number
  formType: string
  formLabel: string
}

// ── Document ──
export interface UploadedDoc {
  id: string
  name: string
  type: 'pdf' | 'image'
  objectURL: string
}
