import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx'
import { NextResponse } from 'next/server'

const AGENTS = [
  {
    number: '1',
    name: 'Determination & Orchestration Agent',
    description: 'Analyzes submitted binder, determines which wizard applies to each document, and dispatches accordingly.',
  },
  {
    number: '2',
    name: 'Routing Agent',
    description: 'Routes individual pages to the correct wizard agent based on determination output.',
  },
  {
    number: '3',
    name: 'Data Collection Agent',
    description: 'Extracts relevant fields and data points from routed documents for wizard processing.',
  },
  {
    number: '4',
    name: 'Guideline Agent',
    description: 'Identifies which decision guidelines are applicable based on collected data.',
  },
  {
    number: '5',
    name: 'Hallucination Agent',
    description: 'Validates guideline accuracy, blocks incorrect or misleading instructions before reasoning.',
  },
  {
    number: '6',
    name: 'Refinement & Reasoning Agent',
    description: 'Produces final AI decision with human-readable reasoning and confidence score for reviewer UI.',
  },
]

const HOW_AGENTS_HELP = [
  'Automate document classification and wizard assignment -- no manual sorting required.',
  'Apply guidelines consistently across every binder with built-in hallucination checks for accuracy.',
  'Self-learn from verifier overrides -- decision quality improves continuously without manual rule updates.',
]

const borderNone = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
} as const

const borderThin = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
} as const

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
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 900, right: 900 },
          },
        },
        children: [
          // Title
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '1040SCAN', bold: true, size: 32, color: '1A1A1A' }),
              new TextRun({ text: '  |  ', size: 20, color: '9CA3AF' }),
              new TextRun({ text: 'Product Brief v2', size: 20, color: '9CA3AF', italics: true }),
            ],
          }),

          // Main heading
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 80 },
            children: [
              new TextRun({ text: 'Multi-Agent Architecture', bold: true, size: 36, color: '111827' }),
            ],
          }),

          // Subtitle
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'Overview of self-learning agents powering binder review automation.',
                size: 22,
                color: '6B7280',
              }),
            ],
          }),

          // Divider
          new Paragraph({
            spacing: { after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' } },
            children: [new TextRun({ text: '' })],
          }),

          // How Agents Help - Section Header
          new Paragraph({
            spacing: { before: 100, after: 160 },
            children: [
              new TextRun({ text: 'HOW AGENTS HELP', bold: true, size: 20, color: '374151', allCaps: true }),
            ],
          }),

          // How Agents Help - Bullet points
          ...HOW_AGENTS_HELP.map(
            (text) =>
              new Paragraph({
                spacing: { after: 100 },
                indent: { left: 360 },
                children: [
                  new TextRun({ text: '\u2022  ', size: 20, color: 'F97316' }),
                  new TextRun({ text, size: 20, color: '4B5563' }),
                ],
              })
          ),

          // Spacer
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: '' })] }),

          // Divider
          new Paragraph({
            spacing: { after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' } },
            children: [new TextRun({ text: '' })],
          }),

          // Agent Overview - Section Header
          new Paragraph({
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({ text: 'AGENT OVERVIEW', bold: true, size: 20, color: '374151', allCaps: true }),
            ],
          }),

          // Agent Overview - Subtitle
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'All agents are self-learning. No manual updates required.',
                size: 20,
                color: '9CA3AF',
                italics: true,
              }),
            ],
          }),

          // Agent table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header row
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    width: { size: 5, type: WidthType.PERCENTAGE },
                    borders: borderThin,
                    shading: { color: 'auto', fill: 'F3F4F6' },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 60, after: 60 },
                        children: [new TextRun({ text: '#', bold: true, size: 18, color: '374151' })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    borders: borderThin,
                    shading: { color: 'auto', fill: 'F3F4F6' },
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [new TextRun({ text: 'Agent', bold: true, size: 18, color: '374151' })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 60, type: WidthType.PERCENTAGE },
                    borders: borderThin,
                    shading: { color: 'auto', fill: 'F3F4F6' },
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [new TextRun({ text: 'What it does', bold: true, size: 18, color: '374151' })],
                      }),
                    ],
                  }),
                ],
              }),
              // Agent rows
              ...AGENTS.map(
                (agent) =>
                  new TableRow({
                    children: [
                      new TableCell({
                        borders: borderThin,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 60, after: 60 },
                            children: [new TextRun({ text: agent.number, bold: true, size: 18, color: 'F97316' })],
                          }),
                        ],
                      }),
                      new TableCell({
                        borders: borderThin,
                        children: [
                          new Paragraph({
                            spacing: { before: 60, after: 60 },
                            children: [new TextRun({ text: agent.name, bold: true, size: 18, color: '111827' })],
                          }),
                        ],
                      }),
                      new TableCell({
                        borders: borderThin,
                        children: [
                          new Paragraph({
                            spacing: { before: 60, after: 60 },
                            children: [new TextRun({ text: agent.description, size: 18, color: '4B5563' })],
                          }),
                        ],
                      }),
                    ],
                  })
              ),
            ],
          }),

          // Footer
          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: '' })] }),
          new Paragraph({
            spacing: { before: 100 },
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' } },
            children: [new TextRun({ text: '' })],
          }),
          new Paragraph({
            spacing: { before: 100 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Multi-Agent Architecture v2 -- Product Brief -- Prototype data is for demonstration purposes.',
                size: 16,
                color: '9CA3AF',
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="Multi-Agent-Architecture-v2.docx"',
    },
  })
}
