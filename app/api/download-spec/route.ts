import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  TableLayoutType, convertInchesToTwip,
} from 'docx'

/* Helper: styled paragraph */
function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, bold: true, font: 'Calibri', size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 22 })],
  })
}

function para(text: string) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, font: 'Calibri', size: 22 })],
  })
}

function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: 'Calibri', size: 22 })],
  })
}

function subBullet(text: string) {
  return new Paragraph({
    bullet: { level: 1 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: 'Calibri', size: 22 })],
  })
}

function boldLabel(label: string, value: string) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, font: 'Calibri', size: 22 }),
      new TextRun({ text: value, font: 'Calibri', size: 22 }),
    ],
  })
}

/* Helper: table with header row */
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'B0B0B0' }
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }

function headerCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    shading: { type: ShadingType.SOLID, color: '2B579A', fill: '2B579A' },
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, bold: true, font: 'Calibri', size: 20, color: 'FFFFFF' })],
    })],
  })
}

function cell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    children: [new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, font: 'Calibri', size: 20 })],
    })],
  })
}

function makeTable(headers: string[], rows: string[][], widths: number[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, widths[i])) }),
      ...rows.map(row => new TableRow({
        children: row.map((c, i) => cell(c, widths[i])),
      })),
    ],
  })
}

function spacer() {
  return new Paragraph({ spacing: { after: 120 }, children: [] })
}

export async function GET() {
  const doc = new Document({
    creator: 'AI Decision Spec',
    title: 'AI Learning from User Overrides (Feedback Loop)',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      children: [

        /* TITLE */
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: 'AI Learning from User Overrides', bold: true, font: 'Calibri', size: 40, color: '2B579A' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: '(Feedback Loop)', font: 'Calibri', size: 32, color: '2B579A' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'Decision Rules - Source Documents (Rule Set A)', italics: true, font: 'Calibri', size: 22, color: '666666' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: `Version 1.0  |  Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, font: 'Calibri', size: 20, color: '888888' })],
        }),

        /* 1. DOCUMENT PURPOSE */
        heading('1. Document Purpose', HeadingLevel.HEADING_1),
        para('This document defines the feedback loop mechanism by which the AI decision engine learns from user overrides in the Superseded Document Review workflow. When a user reverses an AI classification (e.g., changes a document from Superseded to Original or vice versa), the system captures the pattern and generates deterministic rules that improve future automated decisions.'),
        spacer(),
        boldLabel('Scope', 'Superseded Wizard - Source Documents (Rule Set A)'),
        boldLabel('Approach', 'Rule-based (deterministic) - not ML model fine-tuning'),
        boldLabel('Rationale', 'Tax preparation requires full explainability for audit. Each learned rule must be traceable to specific user overrides, reviewable by administrators, and deactivatable at any time.'),
        spacer(),

        /* 2. USER OVERRIDE DEFINITION */
        heading('2. User Override Definition', HeadingLevel.HEADING_1),
        para('An override occurs when a user changes the AI\'s Superseded/Original classification to the opposite direction. This is distinct from:'),
        bullet('Accept - user agrees with AI\'s recommendation'),
        bullet('Undo - user reverts a previously accepted decision back to pending'),
        bullet('Override - user reverses the classification entirely'),
        spacer(),

        heading('2.1 Override Example', HeadingLevel.HEADING_2),
        makeTable(
          ['', 'AI Recommended', 'User Override'],
          [
            ['Doc A (Page 21)', 'Superseded', 'Original'],
            ['Doc B (Page 32)', 'Original', 'Superseded'],
          ],
          [30, 35, 35]
        ),
        spacer(),

        heading('2.2 System Behavior on Override', HeadingLevel.HEADING_2),
        makeTable(
          ['Step', 'Action', 'Detail'],
          [
            ['1', 'Preserve AI decision', 'Original AI reasoning, rule, and confidence are retained in the record - no modification'],
            ['2', 'Record override', 'Create an Override Event entry with user ID, timestamp, original decision, and new decision'],
            ['3', 'Update UI state', 'Confidence badge changes to "Manual Override"; amber warning banner displayed above AI Analysis'],
            ['4', 'Log to Audit Trail', 'Entry created in Audit wizard with full before/after context'],
            ['5', 'Feed to Learning Engine', 'Override event is passed to the Pattern Extraction pipeline'],
          ],
          [8, 22, 70]
        ),
        spacer(),

        heading('2.3 UI Presentation on Override', HeadingLevel.HEADING_2),
        para('When a user overrides, the AI Analysis section displays:'),
        bullet('AI Analysis section remains visible with original reasoning as bullet points'),
        bullet('Amber warning banner appears at the top of the AI Analysis section'),
        subBullet('Line 1: "User has reversed this classification"'),
        subBullet('Line 2: "AI recommended: [Page X] = Superseded, [Page Y] = Original"'),
        subBullet('Line 3: "User changed to: [Page X] = Original, [Page Y] = Superseded"'),
        bullet('Confidence badge displays "Manual Override" instead of percentage'),
        bullet('Original AI reasoning bullets remain unchanged below the banner'),
        spacer(),

        /* 3. OVERRIDE EVENT DATA MODEL */
        heading('3. Override Event Data Model', HeadingLevel.HEADING_1),
        makeTable(
          ['Field', 'Type', 'Description'],
          [
            ['overrideId', 'string', 'Unique identifier for this override event'],
            ['recordKey', 'string', 'Unique identifier for the record being overridden'],
            ['wizardType', '"superseded"', 'Always "superseded" for this Rule Set'],
            ['engagementPageId', 'number', 'Page ID of the document being overridden'],
            ['formType', 'string', 'Document form type (e.g., "1099-DIV", "W-2")'],
            ['originalAIDecision.decisionType', 'string', '"Superseded" | "Original" | "RetainBoth"'],
            ['originalAIDecision.confidenceLevel', 'number', 'AI confidence at time of override (0-100)'],
            ['originalAIDecision.appliedRuleSet', '"SourceDocs"', 'Rule set that was active'],
            ['originalAIDecision.decisionRule', 'string', 'Specific rule AI used for original decision'],
            ['originalAIDecision.decisionReason', 'string', 'AI reasoning text at time of override'],
            ['userOverrideDecision.decisionType', 'string', 'What user changed classification to'],
            ['overrideReason', 'string | null', 'Optional free text: why user disagreed'],
            ['overrideUserId', 'string', 'Who made the override'],
            ['overrideTimestamp', 'ISO 8601 string', 'When the override occurred'],
            ['fieldContext', 'array', 'Field values at time of override for pattern matching'],
            ['fieldContext[].field', 'string', 'Field name (e.g., "Total Ordinary Dividends")'],
            ['fieldContext[].valueA', 'string', 'Value from Document A'],
            ['fieldContext[].valueB', 'string', 'Value from Document B'],
            ['fieldContext[].match', 'boolean', 'Whether values matched'],
          ],
          [30, 18, 52]
        ),
        spacer(),

        /* 4. LEARNING PIPELINE */
        heading('4. Learning Pipeline', HeadingLevel.HEADING_1),
        para('The following steps describe how an override event flows through the system to generate or update a learned rule:'),
        spacer(),
        makeTable(
          ['Step', 'Component', 'Action'],
          [
            ['1', 'UI / Decisions Context', 'User overrides AI classification on a document pair'],
            ['2', 'Override Event Store (DB)', 'System logs: form type, field values, AI\'s original decision, user\'s override, user ID, timestamp'],
            ['3', 'Pattern Extractor (Background Job)', 'System identifies which characteristics of this document pair led to the disagreement (form type, payer, field value relationships, corrected flag)'],
            ['4', 'Rules Engine', 'A new learned rule is created OR an existing matching rule\'s override count is incremented'],
            ['5', 'AI Decision Engine', 'Next time a similar pair appears, AI applies the learned rule with a "Learned from prior review" tag'],
          ],
          [8, 25, 67]
        ),
        spacer(),

        heading('4.1 Pattern Extraction Logic', HeadingLevel.HEADING_2),
        para('The Pattern Extractor analyzes the override event and generates matching conditions based on:'),
        bullet('Form type (e.g., 1099-DIV, W-2, 1098-MORTGAGE)'),
        bullet('Payer/institution name (optional - may be null for broader rules)'),
        bullet('Field value relationships (e.g., "Box 1a value increased", "date is newer")'),
        bullet('Corrected flag (whether document is marked as corrected/amended)'),
        bullet('Direction of change (which document had higher/lower/newer/older values)'),
        spacer(),
        para('The extractor checks if an existing learned rule already matches the same pattern. If yes, it increments that rule\'s override count rather than creating a duplicate rule.'),
        spacer(),

        /* 5. LEARNED RULE DATA MODEL */
        heading('5. Learned Rule Data Model', HeadingLevel.HEADING_1),
        makeTable(
          ['Field', 'Type', 'Description'],
          [
            ['ruleId', 'string', 'Unique rule identifier (e.g., "LR-00042")'],
            ['ruleSource', '"LEARNED"', 'Distinguishes from built-in rules'],
            ['wizardType', '"superseded"', 'Always "superseded" for this Rule Set'],
            ['appliedRuleSet', '"SourceDocs"', 'Identifies this as Rule Set A'],
            ['', '', ''],
            ['conditions.formType', 'string', 'e.g., "1099-DIV"'],
            ['conditions.payerName', 'string | null', 'Specific payer/institution (null for broad rules)'],
            ['conditions.fieldPattern', 'string', 'e.g., "boxValue(\'1a\') increased"'],
            ['conditions.valueRelationship', 'string', 'e.g., "newerDate AND higherAmount"'],
            ['conditions.correctedFlag', 'boolean | null', 'Whether document is flagged as corrected'],
            ['', '', ''],
            ['action.classification', 'string', 'e.g., "Classify newer document as Original"'],
            ['action.overrideAIDecision', 'string', 'What AI would have decided without this rule'],
            ['', '', ''],
            ['provenance.sourceOverrides', 'array', 'List of override IDs, user IDs, engagement IDs, timestamps'],
            ['provenance.overrideCount', 'number', 'How many times this pattern was overridden'],
            ['provenance.firstIdentifiedBy', 'string', 'User who first identified this pattern'],
            ['provenance.firstIdentifiedDate', 'string', 'Date of first override'],
            ['', '', ''],
            ['confidence.ruleConfidence', 'string', '"low" | "medium" | "high"'],
            ['confidence.autoApply', 'boolean', 'Whether rule auto-applies without user confirmation'],
            ['', '', ''],
            ['administration.status', 'string', '"active" | "inactive" | "pending_review"'],
            ['administration.approvedBy', 'string | null', 'Admin who approved (required for high confidence)'],
            ['administration.approvedDate', 'string | null', 'Date of admin approval'],
            ['administration.lastTriggeredDate', 'string | null', 'Last time rule was applied to a document pair'],
            ['administration.triggerCount', 'number', 'Total times rule has been applied'],
          ],
          [28, 18, 54]
        ),
        spacer(),

        /* 5.1 EXAMPLE LEARNED RULE */
        heading('5.1 Example Learned Rule (ExxonMobil 1099-DIV)', HeadingLevel.HEADING_2),
        makeTable(
          ['Field', 'Value'],
          [
            ['ruleId', 'LR-00042'],
            ['ruleSource', 'LEARNED'],
            ['appliedRuleSet', 'SourceDocs'],
            ['conditions.formType', '1099-DIV'],
            ['conditions.payerName', 'ExxonMobil'],
            ['conditions.fieldPattern', 'boxValue(\'1a\') increased AND correctedFlag = true'],
            ['conditions.valueRelationship', 'newerDate AND higherAmount'],
            ['action.classification', 'Classify newer document as Original'],
            ['action.overrideAIDecision', 'AI would have classified as Superseded'],
            ['provenance.overrideCount', '5'],
            ['provenance.firstIdentifiedBy', 'preparer-jane'],
            ['confidence.ruleConfidence', 'high'],
            ['confidence.autoApply', 'true'],
            ['administration.status', 'active'],
            ['administration.approvedBy', 'admin-sarah'],
          ],
          [40, 60]
        ),
        spacer(),

        /* 6. CONFIDENCE RAMP */
        heading('6. Confidence Ramp', HeadingLevel.HEADING_1),
        para('The system does not blindly trust a single user\'s override. Confidence builds over repeated consistent overrides of the same pattern:'),
        spacer(),
        makeTable(
          ['Override Count', 'Confidence', 'Auto-Apply', 'AI Behavior'],
          [
            ['1', 'Low', 'No', 'AI flags as suggestion: "Learned from 1 prior review" - requires user confirmation'],
            ['2 to 4 (same pattern)', 'Medium', 'No', 'AI auto-applies with medium confidence: "Learned rule based on N prior reviews" - user can still override'],
            ['5 or more', 'High', 'Yes (requires admin approval)', 'AI auto-applies with high confidence - behaves like a built-in rule'],
          ],
          [15, 12, 15, 58]
        ),
        spacer(),

        heading('6.1 Ramp Transition Logic', HeadingLevel.HEADING_2),
        makeTable(
          ['Transition', 'Trigger', 'System Action'],
          [
            ['Low to Medium', 'Second override of same pattern by same or different user', 'ruleConfidence updated to "medium"; rule continues to require user confirmation'],
            ['Medium to High', 'Fifth override of same pattern', 'Rule status changes to "pending_review"; admin notification sent'],
            ['Pending Review to Active (High)', 'Admin approves the rule', 'autoApply set to true; rule now fires automatically'],
            ['Any to Inactive', 'Admin deactivates the rule', 'Rule stops firing; existing decisions made by rule remain unchanged'],
          ],
          [22, 30, 48]
        ),
        spacer(),

        heading('6.2 Safeguard', HeadingLevel.HEADING_2),
        para('A manager/admin must approve a rule before it transitions from medium to high confidence with autoApply = true. This prevents a single user\'s repeated errors from becoming system-wide behavior.'),
        spacer(),

        /* 7. UI PRESENTATION OF LEARNED DECISIONS */
        heading('7. UI Presentation of Learned Decisions', HeadingLevel.HEADING_1),
        para('When the AI applies a learned rule instead of a built-in rule, the AI Analysis section displays the following elements:'),
        spacer(),
        makeTable(
          ['UI Element', 'Content', 'Condition'],
          [
            ['Confidence badge', 'Percentage derived from learned rule accuracy', 'Always shown'],
            ['"Learned Rule" tag', 'Tag displayed next to confidence badge', 'Always shown for learned decisions'],
            ['Reasoning bullets', 'Individual pointers derived from rule pattern', 'Always shown'],
            ['Override count', '"Based on N prior reviews"', 'Always shown'],
            ['First identifier', '"First identified by: [user] on [date]"', 'Always shown'],
            ['Escalation', '"None (high confidence learned rule)" or escalation text', 'Based on rule confidence'],
          ],
          [20, 42, 38]
        ),
        spacer(),

        heading('7.1 Example: Learned Rule AI Analysis Output', HeadingLevel.HEADING_2),
        para('When a learned rule fires, the AI Analysis section renders as:'),
        spacer(),
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: convertInchesToTwip(0.5) },
          children: [
            new TextRun({ text: 'AI ANALYSIS  94%  ', bold: true, font: 'Calibri', size: 22, color: '2B579A' }),
            new TextRun({ text: '[Learned Rule]', bold: true, font: 'Calibri', size: 20, color: '2E7D32' }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          indent: { left: convertInchesToTwip(0.5) },
          children: [new TextRun({ text: 'Corrected 1099-DIV with increased dividend amounts classified as Original', font: 'Calibri', size: 22 })],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          indent: { left: convertInchesToTwip(0.5) },
          children: [new TextRun({ text: 'Newer document date confirms this is a correction, not a replacement', font: 'Calibri', size: 22 })],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          indent: { left: convertInchesToTwip(0.5) },
          children: [new TextRun({ text: 'Pattern matches 5 prior reviews across 3 engagements', font: 'Calibri', size: 22 })],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          indent: { left: convertInchesToTwip(0.5) },
          children: [new TextRun({ text: 'First identified by: Jane (Preparer) on Nov 15, 2024', font: 'Calibri', size: 22 })],
        }),
        spacer(),

        heading('7.2 Differences from Built-in Rule Display', HeadingLevel.HEADING_2),
        makeTable(
          ['Aspect', 'Built-in Rule', 'Learned Rule'],
          [
            ['Tag', 'No tag', '"Learned Rule" tag next to confidence badge'],
            ['Reasoning', 'Based on predefined logic', 'References prior review count and extracted pattern'],
            ['Attribution', 'None', 'First user who identified the pattern is credited'],
            ['Confidence source', 'Algorithm-derived', 'Derived from override count and consistency'],
          ],
          [20, 40, 40]
        ),
        spacer(),

        /* 8. LEARNED RULES ADMINISTRATION */
        heading('8. Learned Rules Administration', HeadingLevel.HEADING_1),
        para('Administrators require a dedicated interface to manage learned rules. This ensures oversight and prevents incorrect patterns from propagating system-wide.'),
        spacer(),

        heading('8.1 Admin Interface Features', HeadingLevel.HEADING_2),
        makeTable(
          ['Feature', 'Description'],
          [
            ['Rule List', 'Sortable, filterable table of all learned rules with columns: Rule ID, Form Type, Status, Override Count, Confidence, Last Triggered, Trigger Count'],
            ['Rule Detail', 'Full view of conditions, action, all source overrides with user IDs and timestamps'],
            ['Approve', 'Admin approves a pending_review rule, transitioning it to high confidence with autoApply'],
            ['Reject', 'Admin rejects a pending_review rule, setting status to inactive'],
            ['Edit Conditions', 'Admin refines rule conditions (broaden or narrow the matching pattern)'],
            ['Deactivate', 'Admin sets status to inactive; rule stops firing immediately'],
            ['Reactivate', 'Admin sets status back to active; rule resumes firing'],
            ['Override History', 'View all user overrides that contributed to a specific rule'],
            ['Usage Analytics', 'How often each rule fires, user acceptance rate when applied'],
          ],
          [22, 78]
        ),
        spacer(),

        heading('8.2 Conflict Resolution', HeadingLevel.HEADING_2),
        makeTable(
          ['Conflict Type', 'Resolution'],
          [
            ['Learned rule contradicts a built-in rule', 'Built-in rule takes precedence by default. Admin can explicitly override this.'],
            ['Two learned rules contradict each other', 'Rule with higher overrideCount takes precedence. Both are flagged for admin review.'],
            ['Learned rule contradicts user\'s current override', 'User\'s current action always takes precedence. New override logged against the rule.'],
          ],
          [35, 65]
        ),
        spacer(),

        heading('8.3 Rule Lifecycle', HeadingLevel.HEADING_2),
        para('The following describes the complete lifecycle of a learned rule from creation to maturity:'),
        spacer(),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: 'Creation Path:', bold: true, font: 'Calibri', size: 22 })],
        }),
        bullet('User Override occurs'),
        subBullet('Rule Created (status: active, confidence: low, autoApply: false)'),
        subBullet('Additional overrides of same pattern increment override count'),
        subBullet('Confidence ramps to medium at 2nd override'),
        subBullet('At 5th override: status changes to "pending_review"; admin notified'),
        subBullet('Admin approves: confidence = high, autoApply = true'),
        subBullet('Rule now behaves like a built-in rule'),
        spacer(),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: 'Administrative Actions (at any point):', bold: true, font: 'Calibri', size: 22 })],
        }),
        bullet('Admin deactivates: status = inactive, rule stops firing'),
        bullet('Admin edits: conditions refined, override count preserved'),
        bullet('Admin rejects: status = inactive, flagged as rejected'),
        spacer(),

        /* 9. EXAMPLE SCENARIO */
        heading('9. Example Scenario: ExxonMobil 1099-DIV', HeadingLevel.HEADING_1),
        para('The following scenario illustrates the complete feedback loop from first override to fully automated learned rule:'),
        spacer(),

        heading('9.1 Engagement 1 - First Occurrence', HeadingLevel.HEADING_2),
        bullet('AI classifies newer 1099-DIV (Page 32, Corrected) as Superseded with 92% confidence'),
        bullet('Preparer Jane reviews field comparison: Box 1a increased from $3,285.60 to $3,412.80'),
        bullet('Jane determines: this is a corrected form, newer document should be Original'),
        bullet('Jane flips classification: Page 32 = Original, Page 21 = Superseded'),
        bullet('System logs Override Event OVR-101'),
        bullet('System creates Learned Rule LR-00042 (confidence: low, autoApply: false)'),
        spacer(),

        heading('9.2 Engagement 2 - Second Occurrence', HeadingLevel.HEADING_2),
        bullet('Different engagement, similar ExxonMobil 1099-DIV with corrected amounts'),
        bullet('AI detects Learned Rule LR-00042 matches this pair'),
        bullet('AI applies as suggestion: "Learned from 1 prior review" - requires confirmation'),
        bullet('Preparer Mike confirms the suggestion'),
        bullet('Override count increases to 2; confidence ramps to medium'),
        spacer(),

        heading('9.3 Engagements 3 and 4', HeadingLevel.HEADING_2),
        bullet('Similar patterns confirmed by different preparers'),
        bullet('Override count reaches 4; confidence remains medium'),
        bullet('AI continues to suggest but still requires user confirmation'),
        spacer(),

        heading('9.4 Engagement 5 - Threshold Reached', HeadingLevel.HEADING_2),
        bullet('Override count reaches 5'),
        bullet('Rule status automatically changes to "pending_review"'),
        bullet('Admin Sarah receives notification to review Learned Rule LR-00042'),
        bullet('Sarah reviews: rule conditions, all 5 source overrides, affected form type and pattern'),
        bullet('Sarah approves: confidence = high, autoApply = true'),
        spacer(),

        heading('9.5 Future Engagements', HeadingLevel.HEADING_2),
        bullet('Similar ExxonMobil 1099-DIV pairs are auto-classified by Learned Rule LR-00042'),
        bullet('No user action needed - AI handles it like a built-in rule'),
        bullet('AI Analysis shows: "Learned Rule" tag, "Based on 5 prior reviews"'),
        bullet('First identified by: Jane on Nov 15, 2024'),
        bullet('Audit trail shows full provenance: which users, which engagements, when rule was created and approved'),
        spacer(),

        /* 10. APPENDIX */
        heading('10. Appendix: AI Analysis Display Rules', HeadingLevel.HEADING_1),
        makeTable(
          ['Element', 'When Shown', 'Format'],
          [
            ['Confidence badge', 'Always, in summary bar', 'Percentage with color coding (green >= 90, amber >= 70, red < 70)'],
            ['Reasoning', 'Always, in expanded body', 'Individual bullet points (one observation per bullet)'],
            ['Escalation', 'Only when escalationReason is present', 'Bullet point with warning/amber color'],
            ['Key Differences', 'Only when mismatched fields exist', 'Bullet with sub-bullets showing valueA vs valueB'],
            ['Learned Rule tag', 'Only when decision came from a learned rule', 'Green tag next to confidence badge'],
            ['Override warning', 'Only when user has overridden AI', 'Amber banner above reasoning bullets'],
          ],
          [18, 30, 52]
        ),
        spacer(),

        heading('10.1 Not Shown in AI Analysis', HeadingLevel.HEADING_2),
        bullet('Rule Applied (ruleset / rule name) - internal technical metadata, not relevant to reviewer'),
        bullet('Duplicate confidence score - already shown in summary bar, no need for repetition'),
        spacer(),
        spacer(),

        /* Footer */
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: '--- End of Document ---', italics: true, font: 'Calibri', size: 20, color: '999999' })],
        }),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="AI-Learning-Feedback-Loop-Spec.docx"',
    },
  })
}
