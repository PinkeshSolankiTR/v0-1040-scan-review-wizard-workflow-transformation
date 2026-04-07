import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx'
import { NextResponse } from 'next/server'
import { supersededData, duplicateData, cfaData, nfrData } from '@/lib/wizard-artifact-data'
import type { WizardArtifactData } from '@/components/wizard-artifact-page'

/* ── Shared helpers ── */

const borderThin = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
} as const

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 36, color: '111827' })],
  })
}

function sectionSubtitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 250 },
    children: [new TextRun({ text, size: 22, color: '6B7280' })],
  })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, color: '1F2937' })],
  })
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, color: '374151' })],
  })
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 20, color: '4B5563' })],
  })
}

function bullet(text: string, color = 'F97316'): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: '\u2022  ', size: 20, color }),
      new TextRun({ text, size: 20, color: '4B5563' }),
    ],
  })
}

function divider(): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' } },
    children: [new TextRun({ text: '' })],
  })
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: '' })] })
}

function metricRow(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: value, bold: true, size: 22, color: '111827' }),
      new TextRun({ text: '  --  ', size: 18, color: '9CA3AF' }),
      new TextRun({ text: label, size: 20, color: '4B5563' }),
    ],
  })
}

function wizardBlock(name: string, goesIn: string, decides: string, comesOut: string): Paragraph[] {
  return [
    subHeading(name),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'What Goes In: ', bold: true, size: 20, color: '374151' }),
        new TextRun({ text: goesIn, size: 20, color: '4B5563' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'How AI Decides: ', bold: true, size: 20, color: '374151' }),
        new TextRun({ text: decides, size: 20, color: '4B5563' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'What Comes Out: ', bold: true, size: 20, color: '374151' }),
        new TextRun({ text: comesOut, size: 20, color: '4B5563' }),
      ],
    }),
  ]
}

/* ── Wizard Spec Section Generator ── */

function generateWizardSection(data: WizardArtifactData, sectionNumber: number, accentColor: string) {
  const children: Paragraph[] = []

  // Header
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `Section ${sectionNumber}`, bold: true, size: 20, color: accentColor }),
      new TextRun({ text: '  |  ', size: 20, color: '9CA3AF' }),
      new TextRun({ text: 'Wizard Specification', size: 20, color: accentColor, italics: true }),
    ],
  }))
  children.push(sectionTitle(`${data.title} Wizard`))
  children.push(sectionSubtitle(`AI Decision Spec (${data.decisionSpec.version}), LLM Prompts & Feedback Loop`))

  // AI Decision Spec
  children.push(sectionHeading('AI Decision Spec'))
  for (const section of data.decisionSpec.sections) {
    children.push(subHeading(section.title))
    for (const line of section.content) {
      children.push(bullet(line, accentColor))
    }
  }

  children.push(divider())

  // LLM Prompts
  children.push(sectionHeading('LLM Prompts'))

  // Mapping Table
  children.push(subHeading('Key Mappings'))
  for (const mapping of data.prompts.mappingTable) {
    for (const line of mapping.content) {
      children.push(bullet(line, accentColor))
    }
  }

  // Output Contract
  children.push(subHeading('Output Contract'))
  for (const contract of data.prompts.outputContract) {
    for (const line of contract.content) {
      children.push(bullet(line, accentColor))
    }
  }

  // System Prompt
  children.push(subHeading('System Prompt'))
  children.push(new Paragraph({
    spacing: { after: 120 },
    indent: { left: 360 },
    children: [new TextRun({ text: data.prompts.systemPrompt, size: 18, color: '4B5563', font: 'Consolas' })],
  }))

  // Task Prompt
  children.push(subHeading('Task Prompt'))
  children.push(new Paragraph({
    spacing: { after: 120 },
    indent: { left: 360 },
    children: [new TextRun({ text: data.prompts.taskPrompt, size: 18, color: '4B5563', font: 'Consolas' })],
  }))

  children.push(divider())

  // Feedback Loop
  children.push(sectionHeading('Feedback Loop'))
  for (const section of data.feedbackLoop.sections) {
    children.push(subHeading(section.title))
    for (const line of section.content) {
      children.push(bullet(line, accentColor))
    }
  }

  // Footer
  children.push(spacer())
  children.push(divider())

  return {
    properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
    children,
  }
}

/* ── Data ── */

const AGENTS = [
  { number: '1', name: 'Determination & Orchestration Agent', description: 'Analyzes submitted binder, determines which wizard applies to each document, and dispatches accordingly.' },
  { number: '2', name: 'Routing Agent', description: 'Routes individual pages to the correct wizard agent based on determination output.' },
  { number: '3', name: 'Data Collection Agent', description: 'Extracts relevant fields and data points from routed documents for wizard processing.' },
  { number: '4', name: 'Guideline Agent', description: 'Identifies which decision guidelines are applicable based on collected data.' },
  { number: '5', name: 'Hallucination Agent', description: 'Validates guideline accuracy, blocks incorrect or misleading instructions before reasoning.' },
  { number: '6', name: 'Refinement & Reasoning Agent', description: 'Produces final AI decision with human-readable reasoning and confidence score for reviewer UI.' },
]

/* ── Route Handler ── */

export async function GET() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
    sections: [
      /* ═══════════════════════════ COVER PAGE ═══════════════════════════ */
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: [
          spacer(), spacer(), spacer(), spacer(), spacer(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: '1040SCAN', bold: true, size: 48, color: '111827' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'Review Wizard Web Workflow Transformation', size: 28, color: '4B5563' })],
          }),
          divider(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 60 },
            children: [new TextRun({ text: 'AI-powered transformation of the 1040SCAN post-verification review process.', size: 22, color: '6B7280' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: 'Eliminating manual wizard steps, introducing intelligent validation,', size: 22, color: '6B7280' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: 'and driving engagement through analytics.', size: 22, color: '6B7280' })],
          }),
          divider(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [new TextRun({ text: 'Product Specification Document', size: 20, color: '9CA3AF', italics: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60 },
            children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 20, color: '9CA3AF', italics: true })],
          }),
        ],
      },

      /* ═══════════════════════════ TABLE OF CONTENTS ═══════════════════════════ */
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: [
          sectionTitle('Table of Contents'),
          spacer(),
          bodyText('1.  Phase 1 -- Elimination of Wizard (PRD)'),
          bodyText('2.  Phase 2 -- Quick Validation (PRD)'),
          bodyText('3.  Phase 3 -- Dashboard & Gamification (PRD)'),
          bodyText('4.  Multi-Agent Architecture'),
          bodyText('5.  Superseded Wizard -- AI Decision Spec, LLM Prompts, Feedback Loop'),
          bodyText('6.  Duplicate Data Wizard -- AI Decision Spec, LLM Prompts, Feedback Loop'),
          bodyText('7.  CFA Wizard -- AI Decision Spec, LLM Prompts, Feedback Loop'),
          bodyText('8.  NFR Wizard -- AI Decision Spec, LLM Prompts, Feedback Loop'),
          spacer(),
        ],
      },

      /* ═══════════════════════════ PHASE 1 PRD ═══════════════════════════ */
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Phase 1', bold: true, size: 20, color: '16A34A' }),
              new TextRun({ text: '  |  ', size: 20, color: '9CA3AF' }),
              new TextRun({ text: 'Reviewed & Finalized', size: 20, color: '16A34A', italics: true }),
            ],
          }),
          sectionTitle('Elimination of Wizard -- PRD'),
          sectionSubtitle('AI-Driven Intelligent Automation & Wizard Reduction'),

          // 1. Problem Statement
          sectionHeading('1. Problem Statement'),
          bodyText('Currently, users navigate seven dynamic wizards, each with multiple steps, to complete verification. This process is time-consuming (minutes approx. for 150 pg. binder), repetitive, and leads to user unproductive time. Many steps are triggered dynamically based on document data, making the workflow unpredictable and lengthy.'),
          bodyText('The existing wizard experience is not significantly changing, but it remains page-by-page and requires excessive clicks. Users want a more efficient, intuitive, and less repetitive process. There are also issues with unclear actions, slow performance, and missing guidance.'),

          // 2. Solution Overview
          sectionHeading('2. Solution Overview'),
          bullet('Remove at least four redundant wizard steps in Phase 1. (Pre-verification, Superseded, Duplicate data & Finalization wizard)'),
          bullet('AI automates tasks, presents the results to the customer with a confidence indicator or %, and requests human validation for actions when AI confidence is low.'),
          bullet('Make sure export occurs once the final required action has been completed, according to admin settings.'),
          bullet('Update UI as necessary to reflect the new streamlined workflow.'),

          // 3. Scope & Audience
          sectionHeading('3. Scope & Audience'),
          subHeading('Target Wizards (4 Eliminated)'),
          bullet('Superseded Wizard'),
          bullet('Duplicate Data Wizard'),
          bullet('CFA (Child Form Association) Wizard'),
          bullet('NFR (New Form Review) Wizard'),
          subHeading('Target Users'),
          bullet('Tax professionals who perform post-verification review of scanned 1040 binders.'),
          bullet('Users currently navigating 7 wizard steps per binder, spending minutes on 150+ page binders.'),
          bullet('Administrators managing workflow rules and compliance settings.'),

          // 4. Key Benefits
          sectionHeading('4. Key Benefits'),
          metricRow('Wizard Steps Eliminated in Phase 1', '\u2265 4 Steps'),
          metricRow('Verification Time Reduction', '\u2265 50%'),
          metricRow('User Satisfaction Post-Implementation', '\u2265 80%'),

          // 5. How It Works
          sectionHeading('5. How It Works'),
          bodyText('Each wizard follows a consistent three-step pattern: the AI reads document data, applies learned patterns and guidelines to make decisions, and presents results with a confidence score so reviewers know exactly where to focus.'),

          ...wizardBlock(
            'Superseded Wizard',
            'Scanned tax documents with identifying details -- payer name, tax ID, recipient, account number, and corrected/amended indicators.',
            'Compares documents within the same group using learned patterns and guidelines. Identifies newer, corrected, or amended versions and determines which to retain. High-confidence decisions apply automatically; lower-confidence ones go to the reviewer.',
            'Each document is classified as Original or Superseded -- with a confidence score and plain-language explanation. Reviewers can accept, reject, or override any recommendation.',
          ),

          ...wizardBlock(
            'Duplicate Data Wizard',
            'Organizer entries alongside scanned source documents and consolidated statements -- names, amounts, tax IDs, account numbers, and document dates for comparison.',
            'Applies learned patterns for duplicate identification: comparing amounts, payer/recipient identifiers, account numbers, jurisdictions, and document dates. Jurisdiction mismatches are an automatic hard stop.',
            'Each comparison is marked Duplicate or Original -- with match type, confidence score, and a clear explanation of which fields were compared and why.',
          ),

          ...wizardBlock(
            'CFA (Child Form Association) Wizard',
            'Unassociated child forms (schedules, worksheets) and available parent forms -- form names, compatibility codes, and identifying details.',
            'Checks mandatory compatibility first, then matches by name and identifiers. Avoids placeholder parents and creates new parent forms when no valid match exists. Ambiguous cases go to human review.',
            'Each child form is assigned to its best-matching parent or a newly created one -- with a confidence score and explanation. Reviewers can reassign if needed.',
          ),

          ...wizardBlock(
            'NFR (New Form Review) Wizard',
            'Unmatched scanned documents and available proforma input forms -- document names, form types, identifiers, and eligibility indicators.',
            'Checks form type compatibility first (hard stop if mismatched), verifies eligibility, then matches by name and identifiers against an accuracy threshold. Never forces a match -- uncertain documents stay unmatched for human review.',
            'Each document is matched to a proforma form or left unmatched -- with a confidence score and status. May recommend supersede or merge actions, but never executes them automatically.',
          ),
        ],
      },

      /* ═══════════════════════════ PHASE 2 PRD ═══════════════════════════ */
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Phase 2', bold: true, size: 20, color: 'EAB308' }),
              new TextRun({ text: '  |  ', size: 20, color: '9CA3AF' }),
              new TextRun({ text: 'In Progress', size: 20, color: 'EAB308', italics: true }),
            ],
          }),
          sectionTitle('Quick Validation -- PRD'),
          sectionSubtitle('Unified Validation View & Field-Level AI Scoring'),

          sectionHeading('1. Problem Statement'),
          bodyText('Users need a fast way to validate extracted fields across forms, without being constrained by the traditional wizard format. The current process is not optimized for rapid review and relies heavily on manual matching. Pain points include too many steps, high manual effort, and lack of AI support.'),

          sectionHeading('2. Solution Overview'),
          bullet('Introduce a "Quick Validate" feature that displays snapshots and extracted fields for validation, independent of form structure.'),
          bullet('Integrate AI to highlight fields with high confidence, reducing manual verification.'),
          bullet('Display confidence levels for each extracted field, allowing users to focus only on items that require attention.'),

          sectionHeading('3. Scope & Audience'),
          subHeading('Key Functional Areas'),
          bullet('Unified Validation Dashboard (User & Engagement Statistics)'),
          bullet('Field Level Validation with AI Confidence'),
          bullet('Override & Edit (add, edit, delete, undo)'),
          bullet('Audit Trail for Compliance & Analytics'),
          subHeading('Target Users'),
          bullet('Tax professionals launching RW from SCD, FR, TC, and other platforms.'),
          bullet('Users navigating to the Quick Validation dashboard for rapid field-level review.'),
          bullet('Reviewers who need page view, duplicate page view, and review/association views.'),

          sectionHeading('4. Key Benefits'),
          metricRow('Adoption Rate within 3 Months', '\u2265 70%'),
          metricRow('Reduction in Validation Time Per Binder', '\u2265 20%'),
          metricRow('AI-Validated Fields Require No Manual Correction', '\u2265 95%'),

          sectionHeading('5. How It Works'),
          bodyText('Quick Validation replaces the traditional wizard navigation with a single unified interface. Instead of stepping through multiple screens, reviewers see all fields and documents in one view, with AI highlighting where to focus.'),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'What Goes In: ', bold: true, size: 20, color: '374151' }),
              new TextRun({ text: 'All extracted fields, document snapshots, and AI confidence scores from the binder are loaded into a single unified view.', size: 20, color: '4B5563' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'How AI Decides: ', bold: true, size: 20, color: '374151' }),
              new TextRun({ text: 'AI highlights high-confidence fields that need no manual review, while flagging low-confidence items for human attention.', size: 20, color: '4B5563' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'What Comes Out: ', bold: true, size: 20, color: '374151' }),
              new TextRun({ text: 'Validated fields with user confirmations, a complete override audit trail for compliance, and engagement-level completion status.', size: 20, color: '4B5563' }),
            ],
          }),
        ],
      },

      /* ═══════════════════════════ PHASE 3 PRD ═══════════════════════════ */
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Phase 3', bold: true, size: 20, color: '6B7280' }),
              new TextRun({ text: '  |  ', size: 20, color: '9CA3AF' }),
              new TextRun({ text: 'Planned', size: 20, color: '6B7280', italics: true }),
            ],
          }),
          sectionTitle('Dashboard & Gamification -- PRD'),
          sectionSubtitle('Analytics, Gamification & Continuous Feedback'),

          sectionHeading('1. Problem Statement'),
          bodyText('Users lack visibility into their progress, performance, and time savings. There is no engaging way to track or motivate improvements in workflow efficiency. Product teams need actionable analytics to drive improvements.'),

          sectionHeading('2. Solution Overview'),
          bullet('Develop a dashboard to monitor time savings, AI actions, and overall workflow metrics.'),
          bullet('Introduce gamification elements to encourage adoption and continuous improvement.'),

          sectionHeading('3. Scope & Audience'),
          subHeading('Key Functional Areas'),
          bullet('Analytics Dashboard (fields extracted, time saved, AI actions)'),
          bullet('Gamification (badges, leaderboards, progress bars, streaks)'),
          bullet('Actionable Insights & Workflow Recommendations'),
          bullet('Built-in Feedback Mechanism'),
          subHeading('Target Users'),
          bullet('Tax professionals tracking their own efficiency, accuracy, and progress over time.'),
          bullet('Team leads and managers monitoring team performance and identifying top performers.'),
          bullet('Product teams needing actionable analytics to drive workflow improvements.'),

          sectionHeading('4. Key Benefits'),
          metricRow('Users Engage with Dashboard Features', '\u2265 60%'),
          metricRow('Workflow Efficiency Increase (Top Performers)', '\u2265 15%'),
          metricRow('Positive Feedback on Dashboard & Gamification', '\u2265 80%'),

          sectionHeading('5. How It Works'),
          bodyText('The Dashboard & Gamification system collects data from all verification activities and turns it into visual insights and motivational elements that drive adoption and continuous improvement.'),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'What Goes In: ', bold: true, size: 20, color: '374151' }),
              new TextRun({ text: 'User activity from every verification session -- binders completed, fields reviewed, time spent, AI actions taken, overrides made, and direct user feedback submissions.', size: 20, color: '4B5563' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'How AI Decides: ', bold: true, size: 20, color: '374151' }),
              new TextRun({ text: 'The system aggregates activity data into meaningful metrics, computes gamification elements like badges and streaks, and generates personalized workflow improvement recommendations.', size: 20, color: '4B5563' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'What Comes Out: ', bold: true, size: 20, color: '374151' }),
              new TextRun({ text: 'A visual analytics dashboard showing user and engagement metrics, milestone badges, leaderboards for top performers, progress bars, streak counters, and personalized recommendations.', size: 20, color: '4B5563' }),
            ],
          }),
        ],
      },

      /* ═══════════════════════════ MULTI-AGENT ARCHITECTURE ═══════════════════════════ */
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Architecture', bold: true, size: 20, color: 'F97316' }),
              new TextRun({ text: '  |  ', size: 20, color: '9CA3AF' }),
              new TextRun({ text: 'Product Brief v2', size: 20, color: 'F97316', italics: true }),
            ],
          }),
          sectionTitle('Multi-Agent Architecture'),
          sectionSubtitle('Overview of self-learning agents powering binder review automation.'),

          // How Agents Help
          new Paragraph({
            spacing: { before: 100, after: 160 },
            children: [new TextRun({ text: 'HOW AGENTS HELP', bold: true, size: 20, color: '374151', allCaps: true })],
          }),
          bullet('Automate document classification and wizard assignment -- no manual sorting required.'),
          bullet('Apply guidelines consistently across every binder with built-in hallucination checks for accuracy.'),
          bullet('Self-learn from verifier overrides -- decision quality improves continuously without manual rule updates.'),

          spacer(),
          divider(),

          // Agent Overview
          new Paragraph({
            spacing: { before: 100, after: 80 },
            children: [new TextRun({ text: 'AGENT OVERVIEW', bold: true, size: 20, color: '374151', allCaps: true })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: 'All agents are self-learning. No manual updates required.', size: 20, color: '9CA3AF', italics: true })],
          }),

          // Agent table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    width: { size: 5, type: WidthType.PERCENTAGE },
                    borders: borderThin,
                    shading: { color: 'auto', fill: 'F3F4F6' },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: '#', bold: true, size: 18, color: '374151' })] })],
                  }),
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    borders: borderThin,
                    shading: { color: 'auto', fill: 'F3F4F6' },
                    children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: 'Agent', bold: true, size: 18, color: '374151' })] })],
                  }),
                  new TableCell({
                    width: { size: 60, type: WidthType.PERCENTAGE },
                    borders: borderThin,
                    shading: { color: 'auto', fill: 'F3F4F6' },
                    children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: 'What it does', bold: true, size: 18, color: '374151' })] })],
                  }),
                ],
              }),
              ...AGENTS.map(
                (agent) =>
                  new TableRow({
                    children: [
                      new TableCell({
                        borders: borderThin,
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: agent.number, bold: true, size: 18, color: 'F97316' })] })],
                      }),
                      new TableCell({
                        borders: borderThin,
                        children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: agent.name, bold: true, size: 18, color: '111827' })] })],
                      }),
                      new TableCell({
                        borders: borderThin,
                        children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: agent.description, size: 18, color: '4B5563' })] })],
                      }),
                    ],
                  })
              ),
            ],
          }),

          // Footer
          spacer(), spacer(),
          divider(),
          new Paragraph({
            spacing: { before: 100 },
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '1040SCAN -- Product Specification -- Prototype data is for demonstration purposes.', size: 16, color: '9CA3AF', italics: true })],
          }),
        ],
      },

      /* ═══════════════════════════ WIZARD SPECS ═══════════════════════════ */
      generateWizardSection(supersededData, 5, '7C3AED'),
      generateWizardSection(duplicateData, 6, '2563EB'),
      generateWizardSection(cfaData, 7, '059669'),
      generateWizardSection(nfrData, 8, 'D97706'),
    ],
  })

  const buffer = await Packer.toBuffer(doc)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="1040SCAN-Product-Specification.docx"',
    },
  })
}
