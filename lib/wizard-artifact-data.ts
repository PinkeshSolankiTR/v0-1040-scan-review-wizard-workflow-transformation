import { FileStack, Copy, Link2, FileSearch } from 'lucide-react'
import type { WizardArtifactData, WizardSection } from '@/components/wizard-artifact-page'

/*
 * PRD content reproduced verbatim from the finalized and leadership-reviewed
 * Product Requirements Document. No edits, no summarization.
 */
const PHASE_1_PRD_SECTIONS: WizardSection[] = [
  {
    title: 'Background & Problem Statement',
    content: [
      'Currently, users navigate seven dynamic wizards, each with multiple steps, to complete verification. This process is time-consuming (minutes approx. for 150 pg. binder), repetitive, and leads to user unproductive time. Many steps are triggered dynamically based on document data, making the workflow unpredictable and lengthy.',
      'The existing wizard experience is not significantly changing, but it remains page-by-page and requires excessive clicks. Users want a more efficient, intuitive, and less repetitive process. There are also issues with unclear actions, slow performance, and missing guidance.',
    ],
  },
  {
    title: 'Objectives',
    content: [
      'Remove at least four of the seven wizard steps, streamlining the workflow.',
      'Refine the wizard to minimize clicks and improve usability.',
      'Integrate business rules and manual steps into an AI module for automation.',
      'Reduce verification time by 50% or less for the remaining wizards.',
      'Create a test harness to validate integrated rules.',
    ],
  },
  {
    title: 'Functional Requirements',
    content: [
      'Redundant Wizard Identification: Analyse usage frequency and necessity for each wizard step across binder types. Catalog all existing wizards (e.g., Pre-Verification, Verification, Superseded, CFA, Duplicate Data, NFR, Finalization). Identify wizards that can be eliminated without impacting compliance or data integrity. Document manual steps currently performed in these wizards.',
      'Streamlined Wizard: Fewer clicks, introduce the drag & drop in verification wizard, improved navigation, and clearer instructions.',
      'Change view: Document on left and fields or split view.',
      'AI Integration: Automate business rules and manual steps.',
      'Bulk Actions: Enable bulk review or Page and Field delete.',
      'Legend & Guidance: Display legend icons and tooltips for field types and statuses.',
      'Test Harness: Validate the effectiveness of integrated rules.',
    ],
  },
  {
    title: 'Workflow Redesign',
    content: [
      'Remove at least four redundant wizard steps in Phase 1. (Pre-verification, Superseded, Duplicate data & Finalization wizard)',
      'AI automates tasks, presents the results to the customer with a confidence indicator or %, and requests human validation for actions when AI confidence is low.',
      'Make sure export occurs once the final required action has been completed, according to admin settings.',
      'Update UI as necessary to reflect the new streamlined workflow.',
    ],
  },
  {
    title: 'Change Management',
    content: [
      'Provide training materials and documentation for users on the new workflow.',
      'Implement in-app notifications to guide users through the updated process.',
    ],
  },
  {
    title: 'Audit & Compliance',
    content: [
      'Maintain audit logs for wizard step completion and skipped steps.',
      'Ensure regulatory compliance for any eliminated steps.',
    ],
  },
  {
    title: 'Success Metrics',
    content: [
      'Wizard Steps Eliminated: \u2265 4 steps in Phase 1.',
      'Verification Time Reduction: \u2265 50% in Phase 2.',
      'User Satisfaction: \u2265 80% positive feedback post-implementation.',
    ],
  },
]

export const supersededData: WizardArtifactData = {
  id: 'superseded',
  title: 'Superseded',
  accentColor: 'oklch(0.55 0.18 290)',
  icon: FileStack,
  prototypeRoute: '/binder/demo-a/superseded',
  prd: {
    sections: PHASE_1_PRD_SECTIONS,
  },
  decisionSpec: {
    version: 'v1.0',
    sections: [
      {
        title: '1. Purpose & Scope',
        content: [
          'This AI Decision Spec defines how the Superseded Wizard AI is allowed to make decisions, under what conditions those decisions are applied automatically, and how those decisions are explained to users.',
          'In Scope: Superseded Wizard (Post-Verification), Source documents (W-2, 1099 series, 1098, K-1, Consolidated Statements), AI-generated supersede/retain recommendations.',
          'Out of Scope: Data correctness validation, OCR extraction quality, Child Form Association (CFA), Duplicate Organizer Wizard, Form merging or data entry.',
        ],
      },
      {
        title: '2. Decision Definition',
        content: [
          'Decision Name: Superseded Document Identification',
          'Decision Statement: When multiple source documents of the same type exist within an engagement, determine which documents should remain Original for data capture and which should be marked Superseded, using deterministic rules aligned to the Superseded SOP.',
          'AI Role: Decision support (rule-driven recommendations). Human Role: Review, override, or approve depending on confidence.',
          'The AI must not irreversibly remove documents without human visibility.',
        ],
      },
      {
        title: '3. Decision Inputs (Allowed Facts)',
        content: [
          'Core Identifiers: Document type/form category, Payer/Issuer name, Payer/Issuer EIN or TIN, Recipient/Taxpayer name, Account number (if applicable), Tax year.',
          'Status Indicators: Corrected indicator, Amended indicator, Federal/State/Employee copy type.',
          'Dates: Statement date (consolidated statements), Amended date, K-1 start/end dates.',
          'Amounts: Presence of common amount/box fields. Amount values only for equality/existence checks, not correctness.',
        ],
      },
      {
        title: '4. Decision Outputs',
        content: [
          'Required Output Fields: engagementPageId, isSuperseded (true/false), retainedPageId (if superseded), confidenceLevel (0.0-1.0).',
          'Explainability Fields (Mandatory): decisionType (Original | Superseded | RetainBoth), appliedRuleSet (SourceDocs | ConsolidatedStatements), decisionRule (e.g., A9, B4), decisionReason (human-readable explanation).',
        ],
      },
      {
        title: '5. Rule Set A: Source Documents (A1-A9)',
        content: [
          'A1. Payer/Issuer Name Match (Hard Stop) -- If payer names do not match, retain both.',
          'A2. Payer/Issuer ID Match (Hard Stop) -- If EIN/TIN does not match, retain both.',
          'A3. Recipient/Taxpayer Match (Hard Stop) -- If recipient names do not match, retain both.',
          'A4. Account Number Match (Conditional) -- If applicable and does not match, retain both.',
          'A5. Tax Year Match (Hard Stop) -- If tax year differs, retain both.',
          'A6. Common Amount Field Existence -- If no common amount field exists, retain both.',
          'A7. Exact Match Resolution -- If all qualifying fields match, retain document with maximum data. If tied, retain first in sequence.',
          'A8. Short-Year K-1 Exception (Override) -- If K-1s cover different periods within the same tax year, retain both.',
          'A9. Corrected Indicator Override (Precedence) -- If one is Corrected: keep Corrected as Original, supersede uncorrected. If both Corrected: use Maximum Data to determine Original.',
        ],
      },
      {
        title: '6. Rule Set B: Consolidated Statements (B1-B10)',
        content: [
          'B1. Multiple Copy Verification -- If only one copy exists, no duplicate identification required.',
          'B2. Statement Date Presence Check -- Check whether copies contain a Statement Date.',
          'B3. Statement Date Comparison -- Compare Statement Dates across copies.',
          'B4. Latest Statement Date Selection -- Retain copy with latest date.',
          'B5. Corrected Text Presence Check -- Check for Corrected Text indicator.',
          'B6. Single Corrected Copy Resolution -- If one copy has Corrected Text, retain it.',
          'B7. Maximum Data Tie-Breaker (Multiple Corrected) -- Retain copy with maximum data.',
          'B8. Maximum Data Tie-Breaker (No Corrected Text) -- Retain copy with maximum data.',
          'B9. Latest Date with Maximum Data Tie-Breaker -- Among latest-date copies, retain maximum data.',
          'B10. Finalization -- Mark selected copy as Original, all others as Superseded.',
        ],
      },
      {
        title: '7. Precedence Rules',
        content: [
          '1. Corrected > Uncorrected',
          '2. Latest Amended > Older Versions',
          '3. Federal Copy > State/Employee Copies',
          '4. Short-Year K-1s: Retain Both',
        ],
      },
      {
        title: '8. Confidence Semantics',
        content: [
          '>= 0.90: Deterministic outcome (corrected/exact match) -- Auto-apply.',
          '0.75-0.89: High match, minor gaps -- Suggest + explain.',
          '0.60-0.74: Partial match -- User review required.',
          '< 0.60: No reliable match -- Do not supersede.',
        ],
      },
      {
        title: '9. Human Oversight & Escalation',
        content: [
          'The AI must not auto-supersede when: Multiple corrected copies exist, Conflicting amended dates exist, Confidence < threshold.',
          'Such cases require user decision or escalation.',
        ],
      },
      {
        title: '10-13. UX, Audit, Guardrails & Summary',
        content: [
          'Every AI action must display a reason. Special conditions must be clearly flagged.',
          'All decisions must be logged with rule + confidence. User overrides must be captured.',
          'The AI does NOT: Validate correctness of tax amounts, Merge documents, Infer missing identifiers, Decide without user visibility.',
          'SOP changes require spec update. Prompt changes do not require spec changes if behavior remains compliant.',
        ],
      },
    ],
  },
  prompts: {
    mappingTable: [
      {
        title: 'Key Mappings',
        content: [
          'JSON-only output: Return ONLY valid JSON. No extra text, no markdown, no explanations outside JSON.',
          'Allowed comparisons: Only compare/supersede pages within the same ocrtemplateid group. Never supersede across groups.',
          'Every page must be represented: Return exactly one decision object per page in the dataset.',
          'At least one retained per group: For each ocrtemplateid group, ensure at least one page remains Original.',
          'Mandatory explainability: Populate decisionType, appliedRuleSet, decisionRule, decisionReason for EVERY page.',
          'Confidence semantics: Assign confidenceLevel and follow defined ranges.',
          'Human oversight/escalation: If multiple corrected copies or conflicting amended dates or confidence below threshold, set reviewRequired=true.',
          'Non-goals/guardrails: Do not validate correctness of amounts, merge documents, or infer missing identifiers.',
        ],
      },
    ],
    outputContract: [
      {
        title: 'Required Fields per Page',
        content: [
          'engagementPageId (integer), isSuperseded (boolean), retainedPageId (integer or null), confidenceLevel (number 0.0-1.0)',
          'decisionType ("Original" | "Superseded" | "RetainBoth"), appliedRuleSet ("SourceDocs" | "ConsolidatedStatements")',
          'decisionRule (string, e.g. "A9", "B4"), decisionReason (string, human-readable)',
          'reviewRequired (boolean), escalationReason (string or null)',
        ],
      },
    ],
    systemPrompt: `You are a tax document decision engine for the Superseded Wizard.

STRICT OUTPUT RULES
- Output MUST be valid JSON only. No extra text, no markdown.
- Return an array of objects. Every page in the dataset must appear exactly once.

HARD CONSTRAINTS
- You can only supersede a page using another page with the SAME ocrtemplateid group.
- In each ocrtemplateid group, at least one page must remain not superseded.

DECISION REQUIREMENTS
- You must follow the ordered rules and precedence described in the Superseded decision specification.
- You must produce mandatory explainability fields (decisionType, appliedRuleSet, decisionRule, decisionReason) for every page.
- You must assign confidenceLevel (0-1) using defined confidence ranges and set reviewRequired/escalationReason when appropriate.

GUARDRAILS
- Do not validate correctness of tax amounts (only compare/evaluate existence/equality as instructed).
- Do not infer missing identifiers.
- If required identifiers are missing or a special escalation case is detected, mark reviewRequired=true and explain why.`,
    taskPrompt: `You are given a dataset of document pages. Pages are grouped by "ocrtemplateid" and you may only supersede within the same ocrtemplateid group.

GOAL
For each ocrtemplateid group:
- Identify true duplicates/superseded copies using the rule sets below.
- Keep at least one page as Original (not superseded).
- Supersede duplicates when appropriate.
- Output one decision object per page.

RULE SET A: SOURCE DOCUMENTS (apply in order; stop at first failing rule)
A1 Payer/Issuer Name Match (if fail → RetainBoth)
A2 Payer/Issuer ID Match (if fail → RetainBoth)
A3 Recipient/Taxpayer Name Match (if fail → RetainBoth)
A4 Account Number Match (if applicable; if fail → RetainBoth)
A5 Tax Year Match (if fail → RetainBoth)
A6 Common Amount Field Existence (if fail → RetainBoth)
A7 Exact Match Resolution
A8 Short-Year K-1 Exception
A9 Corrected Indicator Override

RULE SET B: CONSOLIDATED STATEMENTS (apply sequentially)
B1-B10 (Multiple Copy Verification through Finalization)

PRECEDENCE RULES
- Corrected > Uncorrected
- Latest Amended > Older Versions
- Federal Copy > State/Employee Copies
- Short-Year K-1s → RetainBoth

CONFIDENCE SEMANTICS
- >= 0.90: deterministic outcome
- 0.75-0.89: high match with minor gaps
- 0.60-0.74: partial match (reviewRequired=true)
- < 0.60: no reliable match (isSuperseded must be false)

ESCALATION
Set reviewRequired=true when:
- Multiple corrected copies exist
- Conflicting amended dates exist
- Confidence below threshold

OUTPUT CONTRACT (JSON ONLY)
Return a JSON array with one object per page with all required fields.`,
  },
  feedbackLoop: {
    sections: [
      {
        title: 'Overview',
        content: [
          'The Feedback Loop enables the AI to learn from user overrides. When a reviewer changes an AI decision, the system captures the override pattern and may generate a learned rule for future use.',
          'This is a rule-based deterministic learning system, not a neural network retrain. Learned rules are transparent, auditable, and can be managed by administrators.',
        ],
      },
      {
        title: 'Override Capture',
        content: [
          'When a user overrides an AI decision (e.g., changes Superseded to Original), the system records: original AI decision, user decision, confidence level, applied rule, document characteristics, and reason if provided.',
          'Override patterns are tracked with frequency counters. When a pattern crosses a threshold, a learned rule candidate is generated.',
        ],
      },
      {
        title: 'Learned Rule Lifecycle',
        content: [
          'Stage 1 - Candidate: Pattern detected, not yet active. Requires admin review.',
          'Stage 2 - Active: Admin-approved rule. Applied to future decisions with confidence ramp.',
          'Stage 3 - Retired: Rule no longer applies. Kept in audit trail.',
          'Conflict resolution: If a learned rule conflicts with a base rule, the base rule wins unless the learned rule has admin override.',
        ],
      },
      {
        title: 'Confidence Ramp',
        content: [
          'New learned rules start at reduced confidence and ramp up based on successful application count.',
          'Initial confidence multiplier: 0.7x. After 10 successful applications: 0.85x. After 50: 1.0x.',
          'If a learned rule is frequently re-overridden, it is automatically flagged for review.',
        ],
      },
    ],
  },
}

export const duplicateData: WizardArtifactData = {
  id: 'duplicate',
  title: 'Duplicate Data',
  accentColor: 'oklch(0.55 0.15 250)',
  icon: Copy,
  prototypeRoute: '/binder/demo-a/duplicate',
  prd: {
    sections: PHASE_1_PRD_SECTIONS,
  },
  decisionSpec: {
    version: 'v1.0',
    sections: [
      {
        title: '1. Purpose & Scope',
        content: [
          'Three determination areas: Duplicate Data (Amounts), Duplicate Source Documents, Duplicate Consolidated Statements.',
          'In Scope: Identifying duplicate data between organizer and source, duplicate source documents within an engagement, duplicate consolidated statements.',
          'Out of Scope: Data entry, OCR quality, form merging, superseded logic (handled by Superseded Wizard).',
        ],
      },
      {
        title: '2. Decision Definition',
        content: [
          'Three decision names: (1) Duplicate Data Identification (organizer vs source amounts), (2) Duplicate Source Document Identification, (3) Duplicate Consolidated Statement Identification.',
          'AI Role: Decision support with rule-driven recommendations. Human Role: Review, override, or approve depending on confidence.',
        ],
      },
      {
        title: '3. Decision Inputs',
        content: [
          'Duplicate Data: Organizer fields (name, amount, type) vs Source fields (name, amount, type). Matching within $1 tolerance.',
          'Duplicate Source: Payer/recipient identifiers, EIN/TIN, ownership, jurisdiction, corrected indicator, account number, tax year.',
          'Duplicate Consolidated: Broker name, account number, taxpayer name, tax year, statement dates.',
        ],
      },
      {
        title: '4. Decision Outputs',
        content: [
          'DUPLICATE_DATA: decision (DuplicateData / NotDuplicateData), matchType (DirectAmount / SumMatch / Other), confidenceLevel, fieldsCompared.',
          'DUPLICATE_SOURCE_DOC: decision (Duplicate / NotDuplicate), retainDocId, confidenceLevel, appliedRuleSet, decisionRule, decisionReason.',
          'DUPLICATE_CONSOLIDATED_STATEMENT: Same structure as source doc with broker/account context.',
        ],
      },
      {
        title: '5. Rule Set DUP-DATA (DUP-DATA-1 to DUP-DATA-3)',
        content: [
          'DUP-DATA-1: Name Match -- Organizer name must match source name (Hard Stop).',
          'DUP-DATA-2: Direct Amount Match -- Amounts within $1 tolerance.',
          'DUP-DATA-3: Sum-of-Amounts Match -- Sum of multiple source amounts matches organizer amount within $1.',
        ],
      },
      {
        title: '6. Rule Set DUP-SRC (DUP-SRC-1 to DUP-SRC-9)',
        content: [
          'DUP-SRC-1: Payer/Issuer Name Match. DUP-SRC-2: Payer/Issuer ID Match. DUP-SRC-3: Recipient/Taxpayer Match.',
          'DUP-SRC-4: Account Number Match. DUP-SRC-5: Tax Year Match. DUP-SRC-6: Jurisdiction Hard Stop.',
          'DUP-SRC-7: Corrected Precedence. DUP-SRC-8: Exact Duplicate Resolution. DUP-SRC-9: Ownership Match.',
        ],
      },
      {
        title: '7. Rule Set DUP-CS (DUP-CS-1 to DUP-CS-5)',
        content: [
          'DUP-CS-1: Broker/Payer Name Match. DUP-CS-2: Account Number Match. DUP-CS-3: Taxpayer Name Match.',
          'DUP-CS-4: Tax Year Match. DUP-CS-5: Statement Date Retention Logic -- latest date takes precedence.',
        ],
      },
      {
        title: '8. Confidence Semantics',
        content: [
          '>90%: Automation eligible -- high confidence match.',
          '70-90%: Recommend + review -- strong match with minor gaps.',
          '<70%: Human review required -- insufficient evidence for automation.',
        ],
      },
      {
        title: '9-13. Oversight, UX, Guardrails & Summary',
        content: [
          'Escalation triggers: confidence <70%, missing identifiers, no deterministic tie-break.',
          'Known alignment items: $1 vs 5% tolerance debate (currently $1).',
          'All decisions logged with rule + confidence. User overrides captured.',
        ],
      },
    ],
  },
  prompts: {
    mappingTable: [
      {
        title: 'Key Mappings',
        content: [
          'JSON-only output: Return ONLY valid JSON array. No extra text.',
          'Three item types: DUPLICATE_DATA, DUPLICATE_SOURCE_DOC, DUPLICATE_CONSOLIDATED_STATEMENT.',
          'Mandatory explainability: Every item must include appliedRuleSet, decisionRule, decisionReason, fieldsCompared.',
          'Confidence semantics: >90% automation eligible, 70-90% recommend, <70% human review.',
        ],
      },
    ],
    outputContract: [
      {
        title: 'DUPLICATE_DATA Fields',
        content: [
          'decision (DuplicateData | NotDuplicateData), matchType (DirectAmount | SumMatch | Other), confidenceLevel, fieldsCompared, decisionReason.',
        ],
      },
      {
        title: 'DUPLICATE_SOURCE_DOC Fields',
        content: [
          'decision (Duplicate | NotDuplicate), retainDocId, confidenceLevel, appliedRuleSet, decisionRule, decisionReason.',
        ],
      },
      {
        title: 'DUPLICATE_CONSOLIDATED_STATEMENT Fields',
        content: [
          'decision (Duplicate | NotDuplicate), retainDocId, confidenceLevel, appliedRuleSet, decisionRule, decisionReason.',
        ],
      },
    ],
    systemPrompt: `You are a tax document decision engine for the Duplicate Wizard.

STRICT OUTPUT RULES
- Output MUST be valid JSON only. No extra text, no markdown.
- Return results for all three determination areas as applicable.

DECISION REQUIREMENTS
- Apply DUP-DATA rules sequentially (DUP-DATA-1 through DUP-DATA-3).
- Apply DUP-SRC rules sequentially (DUP-SRC-1 through DUP-SRC-9).
- Apply DUP-CS rules sequentially (DUP-CS-1 through DUP-CS-5).
- Populate mandatory explainability fields for every item.
- Assign confidenceLevel using defined ranges.

GUARDRAILS
- Do not validate correctness of tax amounts beyond matching rules.
- Do not merge documents.
- $1 tolerance for amount matching.
- If required identifiers are missing, mark for review.`,
    taskPrompt: `You are given engagement data containing organizer entries, source documents, and consolidated statements.

GOAL
Identify duplicates across three areas using the rule sets below.

RULE SET DUP-DATA (sequential)
DUP-DATA-1: Name match (hard stop)
DUP-DATA-2: Direct amount match within $1
DUP-DATA-3: Sum-of-amounts match within $1

RULE SET DUP-SRC (sequential)
DUP-SRC-1 through DUP-SRC-9

RULE SET DUP-CS (sequential)
DUP-CS-1 through DUP-CS-5

CONFIDENCE SEMANTICS
- >90%: automation eligible
- 70-90%: recommend + review
- <70%: human review required

OUTPUT: Return JSON with all required fields per item type.`,
  },
  feedbackLoop: {
    sections: [
      {
        title: 'Overview',
        content: [
          'The Duplicate Wizard feedback loop captures user overrides on all three determination types (Data, Source Doc, Consolidated Statement).',
          'Override patterns are tracked separately per determination type to enable targeted rule learning.',
        ],
      },
      {
        title: 'Override Capture',
        content: [
          'When a user changes a Duplicate decision to NotDuplicate (or vice versa), the system records the full context: amounts compared, identifiers matched, confidence level, and user rationale.',
          'Amount tolerance overrides are tracked separately to inform the $1 vs percentage tolerance decision.',
        ],
      },
      {
        title: 'Learned Rule Lifecycle',
        content: [
          'Same three-stage lifecycle as Superseded: Candidate, Active, Retired.',
          'DUP-DATA learned rules focus on amount matching patterns.',
          'DUP-SRC learned rules focus on identifier matching precedence.',
          'DUP-CS learned rules focus on broker/account disambiguation.',
        ],
      },
    ],
  },
}

export const cfaData: WizardArtifactData = {
  id: 'cfa',
  title: 'Child Form Association',
  accentColor: 'oklch(0.55 0.17 165)',
  icon: Link2,
  prototypeRoute: '/binder/demo-a/cfa',
  prd: {
    sections: PHASE_1_PRD_SECTIONS,
  },
  decisionSpec: {
  version: 'v1.0',
    sections: [
      {
        title: '1. Purpose & Scope',
        content: [
          'Parent Association Identification -- for each unassociated child document, determine the most appropriate parent form or create a new one.',
          'In Scope: Association of child forms to parents, AddForm parent selection, AI recommendations with confidence.',
          'Out of Scope: OCR accuracy, tax data correctness, editing proforma data.',
        ],
      },
      {
        title: '2. Decision Definition',
        content: [
          'Decision Name: Child Form Parent Association.',
          'For each unassociated child form, identify the best parent form or create a new parent via AddForm.',
          'AI Role: Decision support. Human Role: Review and confirm, especially for ambiguous cases.',
        ],
      },
      {
        title: '3. Decision Inputs',
        content: [
          'Child identifiers: engagementFormName, parentFaxFormDWPCode, engagementFaxFormId, engagementPageId.',
          'Parent attributes: faxFormDWPCode, formName, searchString, toolTip, engagementFaxFormId, faxFormId.',
        ],
      },
      {
        title: '4. Decision Outputs',
        content: [
          'EngagementFaxFormId, ParentEngagementFaxFormId, EngagementPageId, ConfidenceLevel, IsAddForm (boolean), ParentFaxFormDwpCode, ParentFaxFormId.',
        ],
      },
      {
        title: '5. Decision Rules (CFA-1 to CFA-5)',
        content: [
          'CFA-1: Mandatory Compatibility Check (Hard Stop) -- Child\'s parentFaxFormDWPCode must contain parent\'s faxFormDWPCode. If no compatible parent exists, AddForm is required.',
          'CFA-2: Name & Identifier Matching -- Match child engagementFormName against parent searchString and toolTip. Exact match gets highest confidence.',
          'CFA-3: Placeholder Avoidance -- Prefer parents with real data over placeholder/empty parents.',
          'CFA-4: AddForm Resolution -- When multiple AddForm-eligible parents exist, select based on best name match.',
          'CFA-5: Ambiguity Handling -- When multiple parents score similarly, flag for user review.',
        ],
      },
      {
        title: '6. Confidence Semantics',
        content: [
          '>= 0.90: Deterministic -- exact compatibility + name match.',
          '0.70-0.89: Strong match with minor ambiguity.',
          '0.50-0.69: Weak match -- user review required.',
          '< 0.50: Uncertain -- no auto-associate.',
        ],
      },
    ],
  },
  prompts: {
    mappingTable: [
      {
        title: 'Key Mappings',
        content: [
          'JSON-only output: Return ONLY valid JSON.',
          'One decision per child form: Each child gets exactly one association decision.',
          'Mandatory compatibility: parentFaxFormDWPCode must contain parent faxFormDWPCode (hard stop).',
          'Placeholder avoidance: Prefer real data parents over placeholder parents.',
          'AddForm creation: When no suitable parent exists, create via AddForm.',
        ],
      },
    ],
    outputContract: [
      {
        title: 'Required Fields per Child',
        content: [
          'EngagementFaxFormId (int), ParentEngagementFaxFormId (int), EngagementPageId (int), ConfidenceLevel (float 0-1), IsAddForm (boolean), ParentFaxFormDwpCode (string), ParentFaxFormId (int).',
        ],
      },
    ],
    systemPrompt: `You are a smart tax bot for the CFA (Child Form Association) wizard.

STRICT OUTPUT RULES
- Output MUST be valid JSON only. No extra text, no markdown.
- Return one decision per child form.

HARD CONSTRAINTS
- Child's parentFaxFormDWPCode must contain parent's faxFormDWPCode (mandatory compatibility).
- Avoid placeholder parents when real data parents exist.
- If no compatible parent exists, use AddForm.

CONFIDENCE SCORING
- >= 0.90: exact compatibility + name match
- 0.70-0.89: strong match, minor ambiguity
- 0.50-0.69: weak match
- < 0.50: uncertain, do not auto-associate`,
    taskPrompt: `You are given child forms that need parent association.

RULES (apply in order):
1. Mandatory Compatibility Check -- parentFaxFormDWPCode must contain parent faxFormDWPCode
2. Best Match Selection -- name/identifier matching
3. Avoid Placeholder Parents -- prefer parents with real data
4. AddForm Creation -- when no suitable parent exists

CONFIDENCE SCORING
- >= 0.90: exact match
- 0.70-0.89: strong match
- 0.50-0.69: weak match
- < 0.50: uncertain

OUTPUT: Return JSON array with one object per child form with all required fields.`,
  },
  feedbackLoop: {
    sections: [
      {
        title: 'Overview',
        content: [
          'The CFA feedback loop captures user corrections to parent-child associations.',
          'Common override patterns: user selects a different parent than AI recommended, user creates AddForm when AI found a match, user accepts match when AI recommended AddForm.',
        ],
      },
      {
        title: 'Override Capture',
        content: [
          'Records: original AI parent selection, user-selected parent, child form details, compatibility check result, and name matching scores.',
        ],
      },
      {
        title: 'Learned Rule Lifecycle',
        content: [
          'CFA learned rules focus on: name matching improvements (e.g., abbreviation handling), AddForm threshold adjustments, placeholder parent identification patterns.',
          'Same Candidate -> Active -> Retired lifecycle with confidence ramp.',
        ],
      },
    ],
  },
}

export const nfrData: WizardArtifactData = {
  id: 'nfr',
  title: 'New Form Review',
  accentColor: 'oklch(0.6 0.15 60)',
  icon: FileSearch,
  prototypeRoute: '/binder/demo-a/nfr',
  prd: {
    sections: PHASE_1_PRD_SECTIONS,
  },
  decisionSpec: {
  version: 'v1.0',
    sections: [
      {
        title: '1. Purpose & Scope',
        content: [
          'Proforma Association Decision -- for each unmatched document, determine whether it should be associated to an existing proforma input form, left unmatched, superseded, or merged.',
          'In Scope: Matching unmatched docs to proforma input forms, leaving unmatched when no valid proforma exists, identifying supersede/merge candidates (recommendation only).',
          'Out of Scope: OCR correctness, performing merge/supersede actions automatically, editing proforma data.',
        ],
      },
      {
        title: '2. Decision Definition',
        content: [
          'Decision Name: Proforma Association Decision.',
          'For each unmatched document, identify the best proforma input form match or leave unmatched.',
          'AI Role: Decision support. Human Role: Review and confirm, especially for merge/supersede recommendations.',
        ],
      },
      {
        title: '3. Decision Inputs',
        content: [
          'Child document: EngagementId, EngagementPageId, EngagementFaxFormId, FieldGroupId, formTypeId, engagementFormName.',
          'Proforma input form: formTypeId, nodeName, searchString, ImageIndex, EngagementFormId, EngagementFieldGroupId.',
        ],
      },
      {
        title: '4. Decision Outputs',
        content: [
          'EngagementId, EngagementPageId, EngagementFormId, EngagementFieldGroupId, FieldGroupId, EngagementFaxFormId, FaxRowNumber, TaxFormInstanceNo, MatchStatus, ConfidenceLevel.',
        ],
      },
      {
        title: '5. Decision Rules (NFR-1 to NFR-6)',
        content: [
          'NFR-1: Form Type Compatibility (Hard Stop) -- formTypeId must match between document and proforma.',
          'NFR-2: ImageIndex Eligibility -- Only proforma forms with ImageIndex=3 are eligible for matching.',
          'NFR-3: Name & Identifier Matching -- Compare document name against proforma nodeName and searchString.',
          'NFR-4: Accuracy Threshold (>= 80%) -- Match confidence must meet 80% threshold.',
          'NFR-5: Placeholder Avoidance -- Prefer proforma forms with real data.',
          'NFR-6: No Forced Matches -- If no proforma meets threshold, leave unmatched.',
        ],
      },
      {
        title: '6. Confidence Semantics',
        content: [
          '>= 0.90: Deterministic -- exact formTypeId + name match.',
          '0.70-0.89: Strong match -- reviewable.',
          '0.50-0.69: Weak match -- user review required.',
          '< 0.50: No reliable association.',
        ],
      },
    ],
  },
  prompts: {
    mappingTable: [
      {
        title: 'Key Mappings',
        content: [
          'JSON-only output: Return ONLY valid JSON.',
          'One decision per document: Each unmatched document gets exactly one decision.',
          'formTypeId compatibility: Hard stop -- must match between doc and proforma.',
          'ImageIndex=3: Only eligible proforma forms.',
          '80% accuracy threshold: Minimum confidence for association.',
          'No forced matches: Leave unmatched if threshold not met.',
        ],
      },
    ],
    outputContract: [
      {
        title: 'Required Fields per Document',
        content: [
          'EngagementId, EngagementPageId, EngagementFormId, EngagementFieldGroupId, FieldGroupId, EngagementFaxFormId, FaxRowNumber, TaxFormInstanceNo, MatchStatus, ConfidenceLevel.',
        ],
      },
    ],
    systemPrompt: `You are a tax document matching expert for the NFR (New Form Review) wizard.

STRICT OUTPUT RULES
- Output MUST be valid JSON only. No extra text, no markdown.
- Return one decision per unmatched document.

HARD CONSTRAINTS
- formTypeId must match between document and proforma (hard stop).
- Only proforma forms with ImageIndex=3 are eligible.
- Minimum 80% accuracy threshold for association.
- Do not force matches -- leave unmatched if threshold not met.

GUARDRAILS
- Do not perform merge/supersede actions -- only recommend.
- Do not edit proforma data.`,
    taskPrompt: `You are given unmatched documents that need proforma association.

RULES (apply in order):
1. Form Type Compatibility (Hard Stop) -- formTypeId must match
2. ImageIndex Eligibility -- only ImageIndex=3 proforma forms
3. Name & Identifier Matching -- nodeName, searchString comparison
4. Accuracy Threshold -- >= 80% confidence required
5. Placeholder Avoidance -- prefer real data proforma
6. No Forced Matches -- leave unmatched if threshold not met

CONFIDENCE SCORING
- >= 0.90: deterministic match
- 0.70-0.89: strong, reviewable
- 0.50-0.69: weak, user review
- < 0.50: no association

OUTPUT: Return JSON array with one object per document with all required fields.`,
  },
  feedbackLoop: {
    sections: [
      {
        title: 'Overview',
        content: [
          'The NFR feedback loop captures user corrections to proforma associations.',
          'Common override patterns: user matches to a different proforma, user leaves matched when AI left unmatched, user unmatches when AI matched.',
        ],
      },
      {
        title: 'Override Capture',
        content: [
          'Records: original AI match decision, user decision, formTypeId compatibility result, name matching scores, ImageIndex values, and user rationale.',
        ],
      },
      {
        title: 'Learned Rule Lifecycle',
        content: [
          'NFR learned rules focus on: name matching refinements, formTypeId edge cases, ImageIndex exceptions, threshold adjustments for specific form types.',
          'Same Candidate -> Active -> Retired lifecycle with confidence ramp.',
        ],
      },
    ],
  },
}
