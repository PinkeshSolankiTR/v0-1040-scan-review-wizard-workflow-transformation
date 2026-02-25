export interface LearnedRule {
  ruleId: string
  ruleSource: 'LEARNED'
  wizardType: 'superseded' | 'duplicate' | 'cfa' | 'nfr'
  appliedRuleSet: string

  conditions: {
    formType: string
    payerName: string | null
    fieldPattern: string
    valueRelationship: string
    correctedFlag: boolean | null
  }

  action: {
    classification: string
    overrideAIDecision: string
  }

  provenance: {
    sourceOverrides: {
      overrideId: string
      userId: string
      userName: string
      engagementId: string
      timestamp: string
    }[]
    overrideCount: number
    firstIdentifiedBy: string
    firstIdentifiedDate: string
  }

  confidence: {
    ruleConfidence: 'low' | 'medium' | 'high'
    autoApply: boolean
  }

  administration: {
    status: 'active' | 'inactive' | 'pending_review'
    approvedBy: string | null
    approvedDate: string | null
    rejectedBy: string | null
    rejectedDate: string | null
    rejectionReason: string | null
    lastTriggeredDate: string | null
    triggerCount: number
    createdDate: string
  }
}

export const learnedRules: LearnedRule[] = [
  {
    ruleId: 'LR-00042',
    ruleSource: 'LEARNED',
    wizardType: 'superseded',
    appliedRuleSet: 'SourceDocs',
    conditions: {
      formType: '1099-DIV',
      payerName: 'ExxonMobil',
      fieldPattern: "boxValue('1a') increased AND correctedFlag = true",
      valueRelationship: 'newerDate AND higherAmount',
      correctedFlag: true,
    },
    action: {
      classification: 'Classify newer document as Original',
      overrideAIDecision: 'AI would have classified as Superseded',
    },
    provenance: {
      sourceOverrides: [
        { overrideId: 'OVR-101', userId: 'usr-jane', userName: 'Jane Martinez', engagementId: 'ENG-2024-0451', timestamp: '2024-11-15T10:32:00Z' },
        { overrideId: 'OVR-118', userId: 'usr-mike', userName: 'Mike Chen', engagementId: 'ENG-2024-0523', timestamp: '2024-12-02T14:15:00Z' },
        { overrideId: 'OVR-127', userId: 'usr-jane', userName: 'Jane Martinez', engagementId: 'ENG-2024-0598', timestamp: '2024-12-18T09:20:00Z' },
        { overrideId: 'OVR-134', userId: 'usr-sarah', userName: 'Sarah Kim', engagementId: 'ENG-2025-0012', timestamp: '2025-01-08T09:45:00Z' },
        { overrideId: 'OVR-141', userId: 'usr-mike', userName: 'Mike Chen', engagementId: 'ENG-2025-0067', timestamp: '2025-01-22T11:30:00Z' },
      ],
      overrideCount: 5,
      firstIdentifiedBy: 'Jane Martinez',
      firstIdentifiedDate: '2024-11-15T10:32:00Z',
    },
    confidence: { ruleConfidence: 'high', autoApply: true },
    administration: {
      status: 'active',
      approvedBy: 'Sarah Thompson (Admin)',
      approvedDate: '2025-01-25T11:00:00Z',
      rejectedBy: null,
      rejectedDate: null,
      rejectionReason: null,
      lastTriggeredDate: '2025-02-20T08:30:00Z',
      triggerCount: 12,
      createdDate: '2024-11-15T10:32:00Z',
    },
  },
  {
    ruleId: 'LR-00058',
    ruleSource: 'LEARNED',
    wizardType: 'superseded',
    appliedRuleSet: 'SourceDocs',
    conditions: {
      formType: '1098',
      payerName: null,
      fieldPattern: "Box 1 (Mortgage Interest) changed AND correctedFlag = true",
      valueRelationship: 'newerDate AND amountDecreased',
      correctedFlag: true,
    },
    action: {
      classification: 'Classify newer document as Original (correction reduces amount)',
      overrideAIDecision: 'AI would have classified as Superseded',
    },
    provenance: {
      sourceOverrides: [
        { overrideId: 'OVR-155', userId: 'usr-mike', userName: 'Mike Chen', engagementId: 'ENG-2025-0089', timestamp: '2025-02-03T10:12:00Z' },
        { overrideId: 'OVR-162', userId: 'usr-jane', userName: 'Jane Martinez', engagementId: 'ENG-2025-0102', timestamp: '2025-02-10T15:45:00Z' },
        { overrideId: 'OVR-168', userId: 'usr-alex', userName: 'Alex Rivera', engagementId: 'ENG-2025-0115', timestamp: '2025-02-14T08:30:00Z' },
      ],
      overrideCount: 3,
      firstIdentifiedBy: 'Mike Chen',
      firstIdentifiedDate: '2025-02-03T10:12:00Z',
    },
    confidence: { ruleConfidence: 'medium', autoApply: false },
    administration: {
      status: 'active',
      approvedBy: null,
      approvedDate: null,
      rejectedBy: null,
      rejectedDate: null,
      rejectionReason: null,
      lastTriggeredDate: '2025-02-18T14:20:00Z',
      triggerCount: 4,
      createdDate: '2025-02-03T10:12:00Z',
    },
  },
  {
    ruleId: 'LR-00071',
    ruleSource: 'LEARNED',
    wizardType: 'superseded',
    appliedRuleSet: 'SourceDocs',
    conditions: {
      formType: 'W-2',
      payerName: null,
      fieldPattern: "Box 1 (Wages) unchanged AND Box 12 codes added",
      valueRelationship: 'sameWages AND newDeductionCodes',
      correctedFlag: true,
    },
    action: {
      classification: 'Retain Both (supplementary information, not a replacement)',
      overrideAIDecision: 'AI would have classified newer as Superseded',
    },
    provenance: {
      sourceOverrides: [
        { overrideId: 'OVR-189', userId: 'usr-sarah', userName: 'Sarah Kim', engagementId: 'ENG-2025-0134', timestamp: '2025-02-20T16:00:00Z' },
      ],
      overrideCount: 1,
      firstIdentifiedBy: 'Sarah Kim',
      firstIdentifiedDate: '2025-02-20T16:00:00Z',
    },
    confidence: { ruleConfidence: 'low', autoApply: false },
    administration: {
      status: 'active',
      approvedBy: null,
      approvedDate: null,
      rejectedBy: null,
      rejectedDate: null,
      rejectionReason: null,
      lastTriggeredDate: null,
      triggerCount: 0,
      createdDate: '2025-02-20T16:00:00Z',
    },
  },
  {
    ruleId: 'LR-00085',
    ruleSource: 'LEARNED',
    wizardType: 'duplicate',
    appliedRuleSet: 'DUP-SRC',
    conditions: {
      formType: '1099-INT',
      payerName: 'Chase Bank',
      fieldPattern: "All box values identical AND different scan dates",
      valueRelationship: 'exactMatch AND differentScanTimestamp',
      correctedFlag: null,
    },
    action: {
      classification: 'Not Duplicate (separate accounts, same institution)',
      overrideAIDecision: 'AI would have classified as Duplicate',
    },
    provenance: {
      sourceOverrides: [
        { overrideId: 'OVR-201', userId: 'usr-jane', userName: 'Jane Martinez', engagementId: 'ENG-2025-0045', timestamp: '2025-01-12T11:20:00Z' },
        { overrideId: 'OVR-210', userId: 'usr-alex', userName: 'Alex Rivera', engagementId: 'ENG-2025-0078', timestamp: '2025-01-28T13:45:00Z' },
        { overrideId: 'OVR-215', userId: 'usr-mike', userName: 'Mike Chen', engagementId: 'ENG-2025-0091', timestamp: '2025-02-05T10:00:00Z' },
        { overrideId: 'OVR-223', userId: 'usr-jane', userName: 'Jane Martinez', engagementId: 'ENG-2025-0110', timestamp: '2025-02-12T09:15:00Z' },
        { overrideId: 'OVR-228', userId: 'usr-sarah', userName: 'Sarah Kim', engagementId: 'ENG-2025-0128', timestamp: '2025-02-18T14:30:00Z' },
      ],
      overrideCount: 5,
      firstIdentifiedBy: 'Jane Martinez',
      firstIdentifiedDate: '2025-01-12T11:20:00Z',
    },
    confidence: { ruleConfidence: 'high', autoApply: false },
    administration: {
      status: 'pending_review',
      approvedBy: null,
      approvedDate: null,
      rejectedBy: null,
      rejectedDate: null,
      rejectionReason: null,
      lastTriggeredDate: '2025-02-22T09:00:00Z',
      triggerCount: 8,
      createdDate: '2025-01-12T11:20:00Z',
    },
  },
  {
    ruleId: 'LR-00093',
    ruleSource: 'LEARNED',
    wizardType: 'superseded',
    appliedRuleSet: 'ConsolidatedStatements',
    conditions: {
      formType: '1099-B',
      payerName: 'Fidelity Investments',
      fieldPattern: "Proceeds total differs AND correctedFlag = false",
      valueRelationship: 'partialYearStatement AND fullYearStatement',
      correctedFlag: false,
    },
    action: {
      classification: 'Retain Both (partial year + full year are complementary)',
      overrideAIDecision: 'AI would have classified partial year as Superseded',
    },
    provenance: {
      sourceOverrides: [
        { overrideId: 'OVR-250', userId: 'usr-alex', userName: 'Alex Rivera', engagementId: 'ENG-2025-0055', timestamp: '2025-01-18T10:00:00Z' },
        { overrideId: 'OVR-261', userId: 'usr-mike', userName: 'Mike Chen', engagementId: 'ENG-2025-0099', timestamp: '2025-02-08T11:30:00Z' },
        { overrideId: 'OVR-270', userId: 'usr-jane', userName: 'Jane Martinez', engagementId: 'ENG-2025-0121', timestamp: '2025-02-15T09:00:00Z' },
        { overrideId: 'OVR-275', userId: 'usr-sarah', userName: 'Sarah Kim', engagementId: 'ENG-2025-0138', timestamp: '2025-02-21T14:00:00Z' },
        { overrideId: 'OVR-280', userId: 'usr-alex', userName: 'Alex Rivera', engagementId: 'ENG-2025-0145', timestamp: '2025-02-24T08:45:00Z' },
        { overrideId: 'OVR-283', userId: 'usr-mike', userName: 'Mike Chen', engagementId: 'ENG-2025-0150', timestamp: '2025-02-25T10:15:00Z' },
      ],
      overrideCount: 6,
      firstIdentifiedBy: 'Alex Rivera',
      firstIdentifiedDate: '2025-01-18T10:00:00Z',
    },
    confidence: { ruleConfidence: 'high', autoApply: true },
    administration: {
      status: 'active',
      approvedBy: 'Sarah Thompson (Admin)',
      approvedDate: '2025-02-25T12:00:00Z',
      rejectedBy: null,
      rejectedDate: null,
      rejectionReason: null,
      lastTriggeredDate: '2025-02-25T14:30:00Z',
      triggerCount: 3,
      createdDate: '2025-01-18T10:00:00Z',
    },
  },
  {
    ruleId: 'LR-00037',
    ruleSource: 'LEARNED',
    wizardType: 'superseded',
    appliedRuleSet: 'SourceDocs',
    conditions: {
      formType: '1099-MISC',
      payerName: null,
      fieldPattern: "Box 7 (Nonemployee Compensation) reclassified to 1099-NEC",
      valueRelationship: 'formReclassification',
      correctedFlag: false,
    },
    action: {
      classification: 'Supersede 1099-MISC in favor of 1099-NEC',
      overrideAIDecision: 'AI would have classified as RetainBoth',
    },
    provenance: {
      sourceOverrides: [
        { overrideId: 'OVR-080', userId: 'usr-mike', userName: 'Mike Chen', engagementId: 'ENG-2024-0320', timestamp: '2024-09-10T08:00:00Z' },
        { overrideId: 'OVR-088', userId: 'usr-jane', userName: 'Jane Martinez', engagementId: 'ENG-2024-0355', timestamp: '2024-09-25T14:30:00Z' },
        { overrideId: 'OVR-095', userId: 'usr-sarah', userName: 'Sarah Kim', engagementId: 'ENG-2024-0390', timestamp: '2024-10-12T11:00:00Z' },
      ],
      overrideCount: 3,
      firstIdentifiedBy: 'Mike Chen',
      firstIdentifiedDate: '2024-09-10T08:00:00Z',
    },
    confidence: { ruleConfidence: 'medium', autoApply: false },
    administration: {
      status: 'inactive',
      approvedBy: null,
      approvedDate: null,
      rejectedBy: 'Sarah Thompson (Admin)',
      rejectedDate: '2024-10-20T09:00:00Z',
      rejectionReason: 'IRS guidance changed: 1099-MISC Box 7 should be retained alongside 1099-NEC for historical reference',
      lastTriggeredDate: '2024-10-15T10:00:00Z',
      triggerCount: 7,
      createdDate: '2024-09-10T08:00:00Z',
    },
  },
  {
    ruleId: 'LR-00099',
    ruleSource: 'LEARNED',
    wizardType: 'nfr',
    appliedRuleSet: 'NFR',
    conditions: {
      formType: 'Schedule C',
      payerName: null,
      fieldPattern: "Line 31 (Net profit) differs by rounding only (<= $1)",
      valueRelationship: 'roundingDifference',
      correctedFlag: null,
    },
    action: {
      classification: 'Auto-accept match (rounding difference is immaterial)',
      overrideAIDecision: 'AI flagged as NFR mismatch requiring review',
    },
    provenance: {
      sourceOverrides: [
        { overrideId: 'OVR-290', userId: 'usr-alex', userName: 'Alex Rivera', engagementId: 'ENG-2025-0155', timestamp: '2025-02-22T09:30:00Z' },
        { overrideId: 'OVR-295', userId: 'usr-jane', userName: 'Jane Martinez', engagementId: 'ENG-2025-0160', timestamp: '2025-02-23T11:00:00Z' },
        { overrideId: 'OVR-298', userId: 'usr-mike', userName: 'Mike Chen', engagementId: 'ENG-2025-0165', timestamp: '2025-02-24T15:00:00Z' },
        { overrideId: 'OVR-301', userId: 'usr-sarah', userName: 'Sarah Kim', engagementId: 'ENG-2025-0170', timestamp: '2025-02-25T08:00:00Z' },
        { overrideId: 'OVR-304', userId: 'usr-alex', userName: 'Alex Rivera', engagementId: 'ENG-2025-0175', timestamp: '2025-02-25T13:00:00Z' },
      ],
      overrideCount: 5,
      firstIdentifiedBy: 'Alex Rivera',
      firstIdentifiedDate: '2025-02-22T09:30:00Z',
    },
    confidence: { ruleConfidence: 'high', autoApply: false },
    administration: {
      status: 'pending_review',
      approvedBy: null,
      approvedDate: null,
      rejectedBy: null,
      rejectedDate: null,
      rejectionReason: null,
      lastTriggeredDate: null,
      triggerCount: 0,
      createdDate: '2025-02-22T09:30:00Z',
    },
  },
]
