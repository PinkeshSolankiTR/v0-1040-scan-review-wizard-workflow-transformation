import { readFileSync, writeFileSync } from 'fs';

const filePath = '/vercel/share/v0-project/components/design-variants/variant-e-doc-compare.tsx';
let content = readFileSync(filePath, 'utf-8');

// Find the marker for the header end (after "once the review is complete.")
const headerEnd = '                        All {effectiveRecords.length} documents in this group will be marked as not superseded and will be available in SPBinder as independent records once the review is complete.\n                      </p>';

// Find the fieldset start
const fieldsetStart = '                      <fieldset style={{ border: \'none\', padding: 0, margin: 0 }}>\n                        <legend className="sr-only">Select reason for not superseded</legend>';

const headerEndIdx = content.indexOf(headerEnd);
const fieldsetStartIdx = content.indexOf(fieldsetStart);

if (headerEndIdx === -1) {
  console.log('ERROR: Could not find header end marker');
  process.exit(1);
}
if (fieldsetStartIdx === -1) {
  console.log('ERROR: Could not find fieldset start marker');
  process.exit(1);
}

console.log('Header end found at char index:', headerEndIdx);
console.log('Fieldset start found at char index:', fieldsetStartIdx);

// Everything between headerEnd+headerEnd.length and fieldsetStartIdx should be removed
const beforeRemoval = content.substring(0, headerEndIdx + headerEnd.length);
const afterRemoval = content.substring(fieldsetStartIdx);

// Join them with a blank line separator
const newContent = beforeRemoval + '\n\n' + afterRemoval;

// Verify the change removes a good chunk
const removedChars = content.length - newContent.length;
console.log('Removed', removedChars, 'characters of old code');
console.log('Original file length:', content.length);
console.log('New file length:', newContent.length);

writeFileSync(filePath, newContent, 'utf-8');
console.log('File written successfully');
