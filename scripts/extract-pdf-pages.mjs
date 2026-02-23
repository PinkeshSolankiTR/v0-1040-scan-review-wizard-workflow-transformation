import { readFileSync } from 'fs'
import { execSync } from 'child_process'

// ── 1. Get actual page count from the PDF ──
const pdfPath = '/vercel/share/v0-project/public/documents/1TDI-CCH-2024-binder.pdf'
const buf = readFileSync(pdfPath)
const raw = buf.toString('latin1')

console.log(`[v0] PDF file size: ${buf.length} bytes`)

// Method 1: /Count in page tree (most reliable)
const countMatches = raw.match(/\/Count\s+(\d+)/g)
if (countMatches) {
  console.log(`[v0] /Count entries found:`)
  countMatches.forEach(m => console.log(`  ${m}`))
}

// Method 2: Count /Type /Page (not /Pages)
const pageObjs = raw.match(/\/Type\s*\/Page\b(?!s)/g)
console.log(`[v0] /Type /Page objects: ${pageObjs ? pageObjs.length : 0}`)

// ── 2. Try pdftotext if available ──
try {
  const result = execSync(`pdfinfo "${pdfPath}" 2>/dev/null`).toString()
  console.log(`\n[v0] pdfinfo output:\n${result}`)
} catch {
  console.log(`[v0] pdfinfo not available, trying pdftotext...`)
}

try {
  const textOut = execSync(`pdftotext "${pdfPath}" - 2>/dev/null`).toString()
  const lines = textOut.split('\n').filter(l => l.trim())
  console.log(`\n[v0] pdftotext extracted ${lines.length} non-empty lines`)
  
  // Look for form feed / page break markers
  const fullText = execSync(`pdftotext -layout "${pdfPath}" - 2>/dev/null`).toString()
  const pages = fullText.split('\f')
  console.log(`[v0] Page breaks (form feeds) found: ${pages.length} pages`)
  
  // Print first 5 lines of each page to identify form types
  pages.forEach((page, i) => {
    const pageLines = page.split('\n').filter(l => l.trim()).slice(0, 8)
    console.log(`\n[v0] === PAGE ${i + 1} ===`)
    pageLines.forEach(l => console.log(`  ${l.trim().substring(0, 120)}`))
  })
  
  // Search for key terms across all pages
  console.log(`\n[v0] === KEY TERM SEARCH ===`)
  const terms = ['ExxonMobil', 'Exxon', 'Computershare', '1099-DIV', '1099-MISC', '1099-INT', '1099-R', '1099-B',
    'W-2', 'Schedule C', 'Schedule K', 'Schedule D', 'Schedule E', 'Schedule B', 'Form 1040', 'Form 8949',
    'WHYNOT', 'ANDERSON', 'CHAPMAN', 'RICHMONT', 'Craft Shop', 'D04018']
  for (const term of terms) {
    const regex = new RegExp(term, 'gi')
    const matches = fullText.match(regex)
    if (matches) {
      console.log(`[v0] "${term}" found ${matches.length} time(s)`)
    }
  }
} catch(e) {
  console.log(`[v0] pdftotext not available: ${e.message}`)
  
  // Fallback: extract text from PDF streams manually
  console.log(`\n[v0] Falling back to raw PDF text extraction...`)
  
  // Search raw bytes for readable strings
  const terms = ['ExxonMobil', 'Exxon', 'Computershare', '1099-DIV', '1099-MISC', 'W-2', 'Schedule C', 'Schedule K',
    'WHYNOT', 'ANDERSON', 'CHAPMAN', 'RICHMONT', 'Craft', 'D04018', '1099-INT', '1099-R']
  for (const term of terms) {
    const idx = raw.indexOf(term)
    if (idx !== -1) {
      const context = raw.substring(Math.max(0, idx - 30), Math.min(raw.length, idx + 50)).replace(/[^\x20-\x7E]/g, '.')
      console.log(`[v0] "${term}" found at byte offset ${idx}: ...${context}...`)
      // Count total occurrences
      let count = 0, pos = 0
      while ((pos = raw.indexOf(term, pos)) !== -1) { count++; pos += term.length }
      console.log(`[v0]   Total occurrences: ${count}`)
    }
  }
}
