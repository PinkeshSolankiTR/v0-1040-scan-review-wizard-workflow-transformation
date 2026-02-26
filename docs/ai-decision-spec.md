# Post-Verification AI Review -- Decision Specification

## 1. Overview

This document defines the AI decision framework for 1040Scan's Post-Verification AI Review system. The system consolidates 4 post-wizards (Superseded, Duplicate, CFA, NFR) into one unified experience with AI-assisted decision-making.

---

## 2. AI Decision Framework

### 2.1 Confidence Thresholds

| Level | Range | Behavior | UI Indicator |
|---|---|---|---|
| High | >= 0.90 | Auto-applied, no user action required | Green badge |
| Medium | 0.70 - 0.89 | Listed in Review Queue, requires user confirmation | Amber badge |
| Low | < 0.70 | Listed in Review Queue with escalation reason, requires review | Red badge |

### 2.2 Decision States per Record

Each record progresses through these states:

| State | Description | Triggered By |
|---|---|---|
| AI-Applied | AI made a decision with high confidence, auto-applied | System (confidence >= 0.90) |
| Pending Review | AI made a suggestion but confidence is not high enough | System (confidence < 0.90) |
| Accepted | User confirmed the AI's suggestion | User action (Accept) |
| Rejected / Undone | User rejected or reversed the AI's suggestion | User action (Undo) |
| Overridden | User changed the classification to something different from AI's recommendation | User action (flip classification) |

### 2.3 Decision Data Model (per record)

```
{
  confidenceLevel: number,          // 0.0 - 1.0
  decisionType: string,             // Wizard-specific (e.g., "Original" | "Superseded")
  appliedRuleSet: string,           // Which ruleset was used
  decisionRule: string,             // Specific rule that fired
  decisionReason: string,           // Human-readable explanation
  reviewRequired: boolean,          // Whether item appears in Review Queue
  escalationReason: string | null   // Why confidence is low (if applicable)
}
```

---

## 3. Wizard-Specific Decision Logic

### 3.1 Superseded Wizard

- **Purpose:** Identify which document is the original and which supersedes it
- **User Action:** Accept (agree with AI) or Override (flip the classification)
- **AI Decision Types:** Original, Superseded, RetainBoth
- **Rulesets:** SourceDocs, ConsolidatedStatements

### 3.2 Duplicate Wizard

- **Purpose:** Match organizer pages to source documents
- **User Action:** Match (pair two items) or Unmatch (break a pair)
- **Default State:** All records start as Unmatched
- **AI Auto-Match:** High-confidence pairs (>= 0.90) auto-move to Matched section
- **AI Decision Types:** DuplicateData, NotDuplicateData, Duplicate, NotDuplicate
- **Rulesets:** DUP-DATA, DUP-SRC, DUP-CS
- **Form Category Tabs:** Dynamic, driven by `documentRefA.formType` (e.g., FORM 1099-DIV, FORM 1098-MORTGAGE)

### 3.3 CFA (Child Form Association)

- **Purpose:** Associate child forms with their parent forms
- **User Action:** Confirm or reassign parent association
- **AI Decision Types:** IsAddForm (true/false)

### 3.4 NFR (New Form Review)

- **Purpose:** Match newly detected forms to engagement records
- **User Action:** Confirm match or mark as unmatched
- **AI Decision Types:** MatchStatus (true/false)

---

## 4. User Override Workflow

### 4.1 What is an Override?

An override occurs when a user changes the AI's classification to something different. This is distinct from Accept (agreeing with AI) or Undo (reverting a decision).

Example in Superseded wizard:
- AI says: Doc A = Superseded, Doc B = Original
- User flips: Doc A = Original, Doc B = Superseded

### 4.2 Override Handling

When a user overrides an AI decision:

1. **AI Analysis stays unchanged** -- the original AI reasoning is preserved for audit purposes
2. **Override banner appears** -- a visible warning indicator at the top of the AI Analysis section:
   - "User has reversed this classification"
   - Shows AI's original recommendation vs user's override
3. **Confidence badge changes** -- displays "Manual Override" instead of the AI's percentage (since AI confidence no longer applies to the user's decision)
4. **Audit Trail entry created** -- timestamp, user, original classification, new classification

### 4.3 Override Data Model

```
{
  recordKey: string,                    // Unique identifier for the record
  originalAIDecision: string,           // What AI recommended (e.g., "Doc A = Superseded")
  userOverrideDecision: string,         // What user changed it to (e.g., "Doc A = Original")
  overrideTimestamp: ISO 8601 string,   // When the override occurred
  overrideUserId: string,              // Who made the override
  overrideReason: string | null,       // Optional: why user disagreed (free text)
  wizardType: string,                   // Which wizard (superseded, duplicate, cfa, nfr)
  formType: string,                     // Document form type (e.g., "1099-DIV")
  fieldContext: {                        // Field values at time of override (for pattern matching)
    field: string,
    valueA: string,
    valueB: string
  }[]
}
```

### 4.4 UI Presentation of Overrides

**AI Analysis section when override exists:**

```
[Amber warning banner]
  User has reversed this classification
  AI recommended: Doc A = Superseded, Doc B = Original
  User changed to: Doc A = Original, Doc B = Superseded

[Collapsed AI reasoning - original, unchanged]
  - Corrected form received after original filing
  - Date comparison shows newer issuance
  - Amount differences in Box 1a confirm updated values

[Confidence badge shows: "Manual Override" instead of "92%"]
```

---

## 5. AI Learning from User Overrides (Feedback Loop)

### 5.1 Objective

When a user overrides an AI decision, the system should learn from that override so that similar document pairs in the future are handled automatically without requiring repeated manual intervention.

### 5.2 Learning Approach: Rule-Based (Deterministic)

The system uses a rule-based learning approach rather than ML model fine-tuning. This is chosen because:

- Tax preparation requires full explainability for auditors
- Each learned rule must be traceable to specific user overrides
- Rules must be reviewable, editable, and deactivatable by administrators
- The system must explain exactly why a classification was made

### 5.3 How the Learning Loop Works

| Step | What Happens | System Component |
|---|---|---|
| 1. User overrides | User changes AI's classification on a specific document pair | UI / Decisions context |
| 2. Log the override | System records: form type, field values, AI's original decision, user's override | Override Event Store (DB) |
| 3. Pattern extraction | System identifies characteristics of this document pair that led to disagreement | Background job |
| 4. Rule creation | A new learned rule is generated based on the pattern | Rules Engine |
| 5. Auto-apply | Next time a similar pair appears, AI applies the learned rule with a "Learned from prior review" tag | AI Decision Engine |

### 5.4 Learned Rule Structure

Each override generates a deterministic rule stored in a rules table:

```
{
  ruleId: string,                       // Unique rule identifier
  ruleSource: "LEARNED",                // Distinguishes from built-in rules
  wizardType: string,                   // superseded | duplicate | cfa | nfr
  
  // Matching conditions
  conditions: {
    formType: string,                   // e.g., "1099-DIV"
    payerName: string | null,           // Optional: specific payer/institution
    fieldPattern: string,               // e.g., "boxValue('1a') increased"
    valueRelationship: string,          // e.g., "newerDate AND higherAmount"
    correctedFlag: boolean | null       // Whether document is flagged as corrected
  },
  
  // What the rule does
  action: {
    classification: string,             // e.g., "Classify newer as Original"
    overrideAIDecision: string          // What AI would have said
  },
  
  // Provenance
  sourceOverrides: {
    overrideId: string,
    userId: string,
    timestamp: ISO 8601 string
  }[],
  
  // Confidence ramp
  overrideCount: number,                // How many times this pattern was overridden
  ruleConfidence: "low" | "medium" | "high",
  autoApply: boolean,                   // Whether this rule auto-applies without user confirmation
  
  // Administration
  status: "active" | "inactive" | "pending_review",
  createdAt: ISO 8601 string,
  lastTriggered: ISO 8601 string | null,
  approvedBy: string | null             // Admin who approved the rule (if applicable)
}
```

### 5.5 Confidence Ramp

The system does not blindly trust a single user's override. Confidence builds over repeated consistent overrides:

| Override Count | Rule Confidence | AI Behavior |
|---|---|---|
| 1 override | Low | AI flags as a suggestion with "Learned from 1 prior review" -- still requires user confirmation |
| 2-4 overrides (same pattern) | Medium | AI auto-applies with medium confidence, shows "Learned rule based on N prior reviews" |
| 5+ overrides | High | AI auto-applies with high confidence, behaves like a built-in rule |

**Important safeguard:** A manager/admin must approve rules before they reach "High" confidence and auto-apply. This prevents a single user's repeated mistakes from becoming system-wide behavior.

### 5.6 UI Presentation of Learned Decisions

When the AI applies a learned rule (not a built-in rule), the AI Analysis section clearly indicates this:

```
AI ANALYSIS  94%  [Learned Rule]

- Classification based on learned rule from 5 prior reviews
- Pattern: Corrected 1099-DIV with increased dividend amounts
  should be classified as Original (not Superseded)
- First identified by: [preparer name] on [date]
- Escalation: None (high confidence learned rule)
```

Key UI differences from built-in rules:
- A "Learned Rule" tag appears next to the confidence badge
- Reasoning bullets reference the number of prior reviews and the pattern
- The first user who identified the pattern is credited (traceability)
- Admin can click through to the rule management UI from this tag

### 5.7 Example: End-to-End Learning Scenario

**Scenario:** ExxonMobil 1099-DIV with corrected amounts

1. **First occurrence:**
   - AI classifies newer document as Superseded (92% confidence)
   - Preparer reviews and flips it: newer should be Original (it's a correction, not a replacement)
   - System logs override and creates a learned rule with Low confidence

2. **Second occurrence (different engagement):**
   - Similar ExxonMobil 1099-DIV with corrected amounts arrives
   - AI applies learned rule as a suggestion: "Learned from 1 prior review -- classify newer as Original"
   - Preparer confirms (override count increases to 2, confidence stays Medium)

3. **Fifth occurrence:**
   - Override count reaches 5, rule confidence becomes High
   - Admin reviews and approves the rule
   - AI now auto-applies: newer corrected 1099-DIV with increased amounts = Original
   - AI Analysis shows "Learned Rule" tag and references 5 prior reviews

4. **Future occurrences:**
   - No user action needed -- AI handles it like a built-in rule
   - Audit trail shows full provenance: which users, which engagements, when the rule was created and approved

---

## 6. Administration: Learned Rules Management

### 6.1 Admin UI Requirements

Administrators need a dedicated interface to manage learned rules:

| Feature | Description |
|---|---|
| Rule List | Table of all learned rules with status, override count, last triggered date |
| Rule Detail | Full view of conditions, action, source overrides, and provenance |
| Approve / Reject | Admin can approve pending rules or deactivate problematic ones |
| Edit Conditions | Admin can refine rule conditions (e.g., broaden or narrow the pattern) |
| Override History | View all user overrides that contributed to a specific rule |
| Conflict Detection | Highlight rules that contradict each other or contradict built-in rules |
| Usage Analytics | How often each rule fires, acceptance rate when applied |

### 6.2 Rule Lifecycle

```
[User Override] 
    --> [Rule Created (status: active, confidence: low)]
        --> [More overrides of same pattern]
            --> [Confidence ramps to medium]
                --> [5+ overrides: Admin notified for review]
                    --> [Admin approves: confidence = high, autoApply = true]
                        --> [Rule behaves like built-in]

At any point:
    --> [Admin deactivates: status = inactive, stops firing]
    --> [Admin edits: conditions refined, override count preserved]
```

### 6.3 Conflict Resolution

If a learned rule contradicts a built-in rule:
- The built-in rule takes precedence by default
- Admin can explicitly override this by marking the learned rule as "takes precedence"
- A conflict warning appears in both the rule management UI and the AI Analysis section

If two learned rules contradict each other:
- The rule with higher override count takes precedence
- Both are flagged for admin review
- The AI Analysis section shows: "Conflicting rules detected -- admin review required"

---

## 7. AI Analysis UI Specification

### 7.1 Placement

- **Document Compare variant:** Collapsible section at the top of the right panel (replaces the redundant document pair header bar), collapsed by default
- **Table View / Split Panel / other variants:** Group-level collapsible `<details>` element

### 7.2 Content Format

AI reasoning is presented as **bullet points** (not paragraphs). Each distinct observation is a separate bullet:

**Correct:**
- Corrected form received after original filing
- Date comparison shows newer issuance
- Amount differences in Box 1a confirm updated dividend distribution

**Incorrect (do not use):**
> Corrected form received after original filing. Date comparison shows newer issuance. Amount differences in Box 1a confirm updated dividend distribution.

### 7.3 Content Structure

| Element | Shown | Format |
|---|---|---|
| Confidence badge | Always (in summary bar) | Percentage with color coding |
| Reasoning | Always (in expanded body) | Individual bullet points |
| Escalation | Only when `escalationReason` is present | Bullet with warning color |
| AI-Flagged Fields | Only when mismatched fields exist | Bullet with sub-bullets showing valueA vs valueB |
| Learned Rule tag | Only when decision came from a learned rule | Tag next to confidence badge |
| Override warning | Only when user has overridden AI | Amber banner above reasoning |

### 7.4 Elements NOT shown in AI Analysis

| Element | Reason |
|---|---|
| Rule Applied (ruleset / rule name) | Internal technical metadata; not relevant to the reviewer |
| Duplicate confidence score | Already shown in the summary bar; no need to repeat |

---

## 8. Data Model Reference

### 8.1 Superseded Record

```
{
  engagementPageId: number,
  isSuperseded: boolean,
  retainedPageId: number | null,
  confidenceLevel: number,
  decisionType: "Original" | "Superseded" | "RetainBoth",
  appliedRuleSet: "SourceDocs" | "ConsolidatedStatements",
  decisionRule: string,
  decisionReason: string,
  reviewRequired: boolean,
  escalationReason: string | null,
  documentRef: { formType, formLabel, pageNumber, pdfUrl },
  comparedValues: { field, valueA, valueB, match }[]
}
```

### 8.2 Duplicate Record (Data)

```
{
  itemType: "DUPLICATE_DATA",
  organizerItemId: string,
  sourceReferenceId: string,
  decision: "DuplicateData" | "NotDuplicateData",
  matchType: "DirectAmount" | "SumMatch" | "Other",
  confidenceLevel: number,
  appliedRuleSet: "DUP-DATA",
  decisionRule: string,
  decisionReason: string,
  fieldsCompared: string[],
  reviewRequired: boolean,
  escalationReason: string | null,
  documentRefA: { formType, formLabel, pageNumber, pdfUrl },
  documentRefB: { formType, formLabel, pageNumber, pdfUrl },
  comparedValues: { field, valueA, valueB, match }[]
}
```

### 8.3 Duplicate Record (Document / Consolidated Statement)

```
{
  itemType: "DUPLICATE_SOURCE_DOC" | "DUPLICATE_CONSOLIDATED_STATEMENT",
  docIdA: number,
  docIdB: number,
  decision: "Duplicate" | "NotDuplicate",
  retainDocId: number | null,
  confidenceLevel: number,
  appliedRuleSet: "DUP-SRC" | "DUP-CS",
  decisionRule: string,
  decisionReason: string,
  fieldsCompared: string[],
  reviewRequired: boolean,
  escalationReason: string | null,
  documentRefA: { formType, formLabel, pageNumber, pdfUrl },
  documentRefB: { formType, formLabel, pageNumber, pdfUrl },
  comparedValues: { field, valueA, valueB, match }[]
}
```

### 8.4 CFA Record

```
{
  EngagementFaxFormId: number,
  ParentEngagementFaxFormId: number,
  EngagementPageId: number,
  ConfidenceLevel: number,
  IsAddForm: boolean,
  ParentFaxFormDwpCode: string,
  ParentFaxFormId: number
}
```

### 8.5 NFR Record

```
{
  EngagementId: number,
  EngagementPageId: number,
  EngagementFormId: number,
  EngagementFieldGroupId: number,
  FieldGroupId: number,
  EngagementFaxFormId: number,
  FaxRowNumber: number,
  TaxFormInstanceNo: number,
  ConfidenceLevel: number,
  MatchStatus: boolean
}
```

---

## 9. Revision History

| Version | Date | Changes |
|---|---|---|
| 1.0 | Initial | Original spec: 4 wizards, mock data, confidence thresholds, UI layout |
| 2.0 | Current | Added: User Override Workflow (Section 4), AI Learning Feedback Loop (Section 5), Learned Rules Administration (Section 6), AI Analysis UI Specification (Section 7), updated data models with documentRef and comparedValues |
