const { readFileSync } = require('fs')
const { execSync } = require('child_process')

const pdfPath = '/vercel/share/v0-project/public/documents/1TDI-CCH-2024-binder.pdf'
const buf = readFileSync(pdfPath)
const raw = buf.toString('latin1')

console.log(`PDF file size: ${buf.length} bytes`)

// Method 1: /Count in page tree
const countMatches = raw.match(/\/Count\s+(\d+)/g)
if (countMatches) {
  console.log(`/Count entries found:`)
  countMatches.forEach(m => console.log(`  ${m}`))
}

// Method 2: Count /Type /Page (not /Pages)
const pageObjs = raw.match(/\/Type\s*\/Page\b(?!s)/g)
console.log(`/Type /Page objects: ${pageObjs ? pageObjs.length : 0}`)

// Try pdftotext
try {
  const result = execSync(`pdfinfo "${pdfPath}" 2>/dev/null`).toString()
  console.log(`\npdfinfo output:\n${result}`)
} catch {
  console.log(`pdfinfo not available`)
}

try {
  const fullText = execSync(`pdftotext -layout "${pdfPath}" - 2>/dev/null`).toString()
  const pages = fullText.split('\f')
  console.log(`\nPage breaks (form feeds): ${pages.length} pages`)

  pages.forEach((page, i) => {
    const pageLines = page.split('\n').filter(l => l.trim()).slice(0, 8)
    console.log(`\n=== PAGE ${i + 1} ===`)
    pageLines.forEach(l => console.log(`  ${l.trim().substring(0, 120)}`))
  })

  console.log(`\n=== KEY TERM SEARCH ===`)
  const terms = ['ExxonMobil', 'Exxon', 'Computershare', '1099-DIV', '1099-MISC', '1099-INT', '1099-R', '1099-B',
    'W-2', 'Schedule C', 'Schedule K', 'Schedule D', 'Schedule E', 'Schedule B', 'Form 1040', 'Form 8949',
    'WHYNOT', 'ANDERSON', 'CHAPMAN', 'RICHMONT', 'Craft Shop', 'D04018']
  for (const term of terms) {
    const regex = new RegExp(term, 'gi')
    const matches = fullText.match(regex)
    if (matches) {
      console.log(`"${term}" found ${matches.length} time(s)`)
    }
  }
} catch(e) {
  console.log(`pdftotext not available: ${e.message}`)
  console.log(`\nFalling back to raw PDF binary search...`)

  const terms = ['ExxonMobil', 'Exxon', 'Computershare', '1099-DIV', '1099-MISC', 'W-2', 'Schedule C', 'Schedule K',
    'WHYNOT', 'ANDERSON', 'CHAPMAN', 'RICHMONT', 'Craft', 'D04018', '1099-INT', '1099-R']
  for (const term of terms) {
    let count = 0, pos = 0
    while ((pos = raw.indexOf(term, pos)) !== -1) { count++; pos += term.length }
    if (count > 0) {
      const idx = raw.indexOf(term)
      const context = raw.substring(Math.max(0, idx - 20), Math.min(raw.length, idx + term.length + 30)).replace(/[^\x20-\x7E]/g, '.')
      console.log(`"${term}" found ${count} time(s) - context: ...${context}...`)
    }
  }
}
