// Mock data for the 1040SCAN Quick Validation Dashboard prototype

export type FieldStatus = 'mandatory' | 'proforma' | 'uncertain' | 'missing' | 'fully-confident'
export type FieldSource = 'System' | 'By Users'
export type DocumentStatus = 'Incorrect tax year' | 'Needs review' | 'Reviewed'

export interface ExtractedField {
  id: number
  label: string
  value: string
  status: FieldStatus
  source: FieldSource
  hasOverride?: boolean
}

export interface DocumentItem {
  id: string
  name: string
  formType: string
  status: DocumentStatus
  fieldsToReview: number
  documentTitle: string
  documentType: string
  formTypeDetail: string
  extractedFields: ExtractedField[]
}

export const ENGAGEMENT_SUMMARY = {
  taxYear: '2024',
  engagementId: '41184350',
  clientNumber: '7362WN',
  pagesUploaded: '3',
  taxSoftware: 'GoSystem',
  officeLocation: 'Mumbai',
  residentState: 'CO',
  filingStatus: 'MFJ',
}

export const DOCUMENTS_SUMMARY = {
  totalPages: 6,
  confident: 3,
  needsReview: 1,
}

export const W2_EXTRACTED_FIELDS: ExtractedField[] = [
  { id: 1, label: 'Wages, tips, other compensation', value: '$ 2,000', status: 'mandatory', source: 'System' },
  { id: 2, label: 'Federal income tax withheld', value: '$ 2,000', status: 'proforma', source: 'System' },
  { id: 3, label: 'Social security wages', value: '', status: 'uncertain', source: 'System' },
  { id: 4, label: 'Social secuirity tax withheld', value: '$ 2,000', status: 'mandatory', source: 'By Users' },
  { id: 5, label: 'Medicare wages and tips', value: '$', status: 'missing', source: 'System', hasOverride: true },
  { id: 6, label: 'Medicare tax withheld', value: '$ 1,111.0', status: 'fully-confident', source: 'System' },
]

export const DOCUMENT_ITEMS: DocumentItem[] = [
  {
    id: 'doc-1',
    name: 'Wendy1099-div.pdf',
    formType: '1099-DIV',
    status: 'Incorrect tax year',
    fieldsToReview: 4,
    documentTitle: 'W-2 - Wage and Tax Statement',
    documentType: 'Source Document',
    formTypeDetail: 'W-2 wages',
    extractedFields: W2_EXTRACTED_FIELDS,
  },
  {
    id: 'doc-2',
    name: 'W-2-2024.pdf',
    formType: '1099-DIV',
    status: 'Needs review',
    fieldsToReview: 4,
    documentTitle: 'W-2 - Wage and Tax Statement',
    documentType: 'Source Document',
    formTypeDetail: 'W-2 wages',
    extractedFields: W2_EXTRACTED_FIELDS,
  },
  {
    id: 'doc-3',
    name: 'W-2.pdf',
    formType: 'W-2',
    status: 'Needs review',
    fieldsToReview: 4,
    documentTitle: 'W-2 - Wage and Tax Statement',
    documentType: 'Source Document',
    formTypeDetail: 'W-2 wages',
    extractedFields: W2_EXTRACTED_FIELDS,
  },
  {
    id: 'doc-4',
    name: 'Wendy1099-div.pdf',
    formType: '1099-DIV',
    status: 'Reviewed',
    fieldsToReview: 4,
    documentTitle: 'W-2 - Wage and Tax Statement',
    documentType: 'Source Document',
    formTypeDetail: 'W-2 wages',
    extractedFields: W2_EXTRACTED_FIELDS,
  },
  {
    id: 'doc-5',
    name: 'Wendy1099-div.pdf',
    formType: '1099-DIV',
    status: 'Incorrect tax year',
    fieldsToReview: 4,
    documentTitle: 'W-2 - Wage and Tax Statement',
    documentType: 'Source Document',
    formTypeDetail: 'W-2 wages',
    extractedFields: W2_EXTRACTED_FIELDS,
  },
  {
    id: 'doc-6',
    name: 'W-2-2024.pdf',
    formType: '1099-DIV',
    status: 'Needs review',
    fieldsToReview: 4,
    documentTitle: 'W-2 - Wage and Tax Statement',
    documentType: 'Source Document',
    formTypeDetail: 'W-2 wages',
    extractedFields: W2_EXTRACTED_FIELDS,
  },
  {
    id: 'doc-7',
    name: 'W-2.pdf',
    formType: 'W-2',
    status: 'Needs review',
    fieldsToReview: 4,
    documentTitle: 'W-2 - Wage and Tax Statement',
    documentType: 'Source Document',
    formTypeDetail: 'W-2 wages',
    extractedFields: W2_EXTRACTED_FIELDS,
  },
  {
    id: 'doc-8',
    name: 'Wendy1099-div.pdf',
    formType: '1099-DIV',
    status: 'Incorrect tax year',
    fieldsToReview: 4,
    documentTitle: 'W-2 - Wage and Tax Statement',
    documentType: 'Source Document',
    formTypeDetail: 'W-2 wages',
    extractedFields: W2_EXTRACTED_FIELDS,
  },
  {
    id: 'doc-9',
    name: 'Schedule-K1.pdf',
    formType: 'K-1',
    status: 'Reviewed',
    fieldsToReview: 2,
    documentTitle: 'Schedule K-1 - Partner Share',
    documentType: 'Source Document',
    formTypeDetail: 'K-1 income',
    extractedFields: W2_EXTRACTED_FIELDS,
  },
  {
    id: 'doc-10',
    name: '1099-INT-2024.pdf',
    formType: '1099-INT',
    status: 'Needs review',
    fieldsToReview: 3,
    documentTitle: '1099-INT - Interest Income',
    documentType: 'Source Document',
    formTypeDetail: '1099-INT interest',
    extractedFields: W2_EXTRACTED_FIELDS,
  },
]

export const DOCUMENT_TYPE_OPTIONS = ['All', 'Consolidated Statement', 'Organizer', 'Unidentified']
export const FORM_TYPE_FILTER_OPTIONS = ['All', '1099-DIV', 'W-2', 'K-1', '1099-INT']
export const STATUS_FILTER_OPTIONS = ['All', 'Incorrect tax year', 'Needs review', 'Reviewed']
export const FIELD_TYPE_OPTIONS = ['All fields', 'Uncertain Fields', 'Mandatory Fields', 'Proforma Fields', 'Missing Fields', 'Fully Confident Fields']
