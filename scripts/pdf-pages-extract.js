const https = require('https');
const fs = require('fs');
const path = require('path');

const PDF_URL = "https://blobs.vusercontent.net/blob/1TDI-CCH-2024%201-AoCcp9ntCvzb0G0QNdwPmq3Q1Y6ZFQ.pdf";

// Download PDF
function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log("Downloading PDF...");
  const pdfBytes = await download(PDF_URL);
  console.log(`Downloaded: ${pdfBytes.length} bytes`);
  
  // Save the PDF locally first
  const pdfPath = path.join(__dirname, 'binder-full.pdf');
  fs.writeFileSync(pdfPath, pdfBytes);
  console.log(`Saved to: ${pdfPath}`);
  
  // Count pages from raw PDF binary
  const raw = pdfBytes.toString('latin1');
  
  // Method 1: Count /Type /Page (not /Pages)
  const pageObjs = raw.match(/\/Type\s*\/Page\b(?!s)/g);
  console.log(`/Type /Page objects: ${pageObjs ? pageObjs.length : 0}`);
  
  // Method 2: /Count in catalog
  const countMatches = raw.match(/\/Count\s+(\d+)/g);
  if (countMatches) {
    countMatches.forEach(m => console.log(`Page tree: ${m}`));
  }
  
  // Search for key terms in the raw PDF stream
  console.log("\n=== KEY TERM SEARCH IN RAW PDF ===");
  const terms = [
    'ExxonMobil', 'Exxon Mobil', 'EXXON', 'Computershare',
    '1099-DIV', '1099-MISC', '1099-INT', '1099-R', '1099-B', '1099-NEC', '1099-OID', '1099-SA',
    'W-2', 'W-2G', 'W2',
    'Schedule C', 'Schedule K', 'Schedule D', 'Schedule E', 'Schedule B', 'Schedule A',
    'Form 1040', 'Form 1041', 'Form 8949', 'Form 5498', 'Form 1098', 'Form 8889',
    'WHYNOT', 'ANDERSON', 'CHAPMAN', 'RICHMONT',
    'Craft Shop', 'D04018',
    'Charles Schwab', 'Fidelity', 'Vanguard', 'Merrill', 'TD Ameritrade',
    'CORRECTED', 'AMENDED', 'VOID',
    'IMPORTANT TAX', 'TAX RETURN DOCUMENT',
    'Dividend', 'Interest', 'Capital Gain',
    'SSA-1099', 'RRB-1099',
    'Morgan Stanley', 'JP Morgan', 'Goldman', 'UBS',
    'Brokerage', 'Trust', 'IRA', 'Roth',
  ];
  
  for (const term of terms) {
    let count = 0, pos = 0;
    const searchTerm = term;
    while ((pos = raw.indexOf(searchTerm, pos)) !== -1) { count++; pos += searchTerm.length; }
    if (count > 0) {
      // Get context around first match
      const firstIdx = raw.indexOf(searchTerm);
      const ctx = raw.substring(Math.max(0, firstIdx - 40), Math.min(raw.length, firstIdx + searchTerm.length + 40))
        .replace(/[^\x20-\x7E]/g, '.');
      console.log(`"${term}" -> ${count} occurrence(s). Context: ...${ctx}...`);
    }
  }
  
  // Also do case-insensitive search for common terms
  console.log("\n=== CASE-INSENSITIVE SEARCH ===");
  const ciTerms = ['exxon', 'schwab', 'fidelity', 'vanguard', 'dividend', 'corrected', 'amended'];
  for (const term of ciTerms) {
    const regex = new RegExp(term, 'gi');
    const matches = raw.match(regex);
    if (matches) {
      console.log(`"${term}" (case-insensitive) -> ${matches.length} occurrence(s)`);
    }
  }
}

main().catch(e => console.error(e));
