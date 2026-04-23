/**
 * Copy the binder PDF to public/documents so it can be served.
 * Then generate realistic tax form page images using sharp.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 1. Copy the PDF to public/documents/
const srcPdf = path.join(PROJECT_ROOT, 'user_read_only_context', 'text_attachments', '1TDI-CCH-2024-1-wRcBW.pdf');
const destDir = path.join(PROJECT_ROOT, 'public', 'documents');
const destPdf = path.join(destDir, '1TDI-CCH-2024-binder.pdf');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(srcPdf, destPdf);
console.log(`Copied PDF to public/documents/1TDI-CCH-2024-binder.pdf (${Math.round(fs.statSync(destPdf).size / 1024)}KB)`);
console.log('Done! The PDF is now available at /documents/1TDI-CCH-2024-binder.pdf');
