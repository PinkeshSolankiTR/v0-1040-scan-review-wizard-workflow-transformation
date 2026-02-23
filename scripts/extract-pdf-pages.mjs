import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * Since we cannot use pdf-to-image libraries easily in the sandbox,
 * we'll create structured HTML-based page representations as
 * static JSON metadata files, and render them as styled cards
 * in the UI instead of pixel images.
 *
 * Each page gets a JSON file describing its content for the UI to render.
 */

const outputDir = join(process.cwd(), 'public', 'documents', 'pages')
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

const pages = [
  {
    pageNumber: 1,
    formType: 'W-2',
    formTitle: 'Wage and Tax Statement',
    taxYear: '2024',
    fields: [
      { label: 'Employer Name', value: 'WHYNOT STOP INC', box: 'c' },
      { label: 'Employer Address', value: '532 MAIN STREET, WATERVILLE, ME 25570', box: 'c' },
      { label: 'Employer EIN', value: '53-XXXXXXX', box: 'b' },
      { label: 'Employee Name', value: 'JILL ANDERSON', box: 'e' },
      { label: 'Employee SSN', value: '***-**-1234', box: 'a' },
      { label: 'Employee Address', value: '1234 MAIN STREET, DALLAS, TX 75202', box: 'f' },
    ],
  },
  {
    pageNumber: 2,
    formType: 'W-2 (Page 2)',
    formTitle: 'Wage and Tax Statement — Instructions',
    taxYear: '2024',
    fields: [
      { label: 'Employer Name', value: 'WHYNOT STOP INC', box: 'c' },
      { label: 'Employee Name', value: 'JILL ANDERSON', box: 'e' },
      { label: 'Content', value: 'Box instructions and itemized deduction details', box: 'info' },
    ],
  },
  {
    pageNumber: 3,
    formType: 'Schedule C',
    formTitle: 'Profit or Loss From Business',
    taxYear: '2024',
    fields: [
      { label: 'Business Name', value: "Jill's Craft Shop", box: 'C' },
      { label: 'Proprietor', value: 'JILL ANDERSON', box: 'A' },
      { label: 'Craft Sales', value: '$41,200.00', box: '42500' },
      { label: 'Other Sales', value: '$7,450.00', box: '43400' },
      { label: 'Total Income', value: '$48,650.00', box: 'total' },
      { label: 'Advertising', value: '$1,550.42', box: '60900' },
      { label: 'Legal Fees', value: '$1,200.00', box: '62100' },
      { label: 'Office Expense', value: '$4,267.89', box: '62800' },
      { label: 'Supplies', value: '$3,560.98', box: '65000' },
      { label: 'Utilities', value: '$1,500.86', box: '66000' },
      { label: 'Telephone', value: '$1,000.00', box: '68300' },
      { label: 'Total Expenses', value: '$13,080.15', box: 'total-exp' },
      { label: 'Net Income', value: '$28,119.85', box: 'net' },
    ],
  },
  {
    pageNumber: 4,
    formType: '1099-MISC',
    formTitle: 'Miscellaneous Information',
    taxYear: '2024',
    fields: [
      { label: 'Payer Name', value: 'RICHMONT NORTH AMERICA, INC', box: 'payer' },
      { label: 'Payer Address', value: '3 ENTERPRISE DRIVE, SHELTON, CT 06484', box: 'payer-addr' },
      { label: 'Payer TIN', value: '13-2852910', box: 'payer-tin' },
      { label: 'Recipient Name', value: 'JACK ANDERSON', box: 'recipient' },
      { label: 'Recipient TIN', value: '111-11-1111', box: 'recipient-tin' },
      { label: 'Recipient Address', value: '1234 MAIN STREET, DALLAS, TX 75202', box: 'recipient-addr' },
      { label: 'Box 3 (Other Income)', value: '$14,921.24', box: '3' },
    ],
  },
  {
    pageNumber: 5,
    formType: 'Schedule K-1 (Form 1041)',
    formTitle: "Beneficiary's Share of Income, Deductions, Credits",
    taxYear: '2024',
    fields: [
      { label: 'Trust EIN', value: '34-3353535', box: 'A' },
      { label: 'Trust Name', value: 'CHAPMAN IRREVOCABLE TRUST', box: 'B' },
      { label: 'Fiduciary', value: 'FIRST CHICAGO BANK, TRUSTEE', box: 'C' },
      { label: 'Fiduciary Address', value: 'P.O. BOX 1000, CHICAGO, IL 01234', box: 'C-addr' },
      { label: 'Beneficiary ID', value: '12-3674289', box: 'F' },
      { label: 'Beneficiary Name', value: 'JILL BAKER FAMILY TRUST', box: 'G' },
      { label: 'Beneficiary Address', value: '2450 MAIN STREET, DALLAS, TX 75202', box: 'G-addr' },
      { label: 'Interest Income', value: '$2,575', box: '1' },
      { label: 'Ordinary Dividends', value: '$62,565', box: '2a' },
      { label: 'Qualified Dividends', value: '$52,355', box: '2b' },
      { label: 'Business Income', value: '$8,748', box: '6' },
    ],
  },
]

pages.forEach((page) => {
  const filePath = join(outputDir, `page-${page.pageNumber}.json`)
  writeFileSync(filePath, JSON.stringify(page, null, 2))
  console.log(`Wrote ${filePath}`)
})

console.log(`\nExtracted ${pages.length} page metadata files to ${outputDir}`)
