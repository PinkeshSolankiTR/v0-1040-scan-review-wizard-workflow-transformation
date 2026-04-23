"""Extract each page from the binder PDF as a high-quality JPG image.
Run with: cd scripts && uv run extract-pdf-pages.py
"""
import subprocess
import sys
import os

# Ensure pymupdf is installed
subprocess.check_call([sys.executable, "-m", "pip", "install", "pymupdf", "Pillow"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

import fitz  # PyMuPDF

# Paths relative to project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_PATH = os.path.join(PROJECT_ROOT, "user_read_only_context", "text_attachments", "1TDI-CCH-2024-1-wRcBW.pdf")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "documents", "pages")

def main():
    if not os.path.exists(PDF_PATH):
        print(f"ERROR: PDF not found at {PDF_PATH}")
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    doc = fitz.open(PDF_PATH)
    total_pages = len(doc)
    print(f"PDF has {total_pages} pages")

    for i in range(total_pages):
        page = doc[i]
        # Render at 2x resolution for crisp thumbnails (144 DPI)
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)

        output_path = os.path.join(OUTPUT_DIR, f"page-{i + 1}.jpg")
        pix.save(output_path)

        # Print page info
        text_snippet = page.get_text()[:120].replace('\n', ' ').strip()
        print(f"  Page {i + 1}: {pix.width}x{pix.height}px -> page-{i + 1}.jpg")
        print(f"    Text: {text_snippet}")

    doc.close()
    print(f"\nDone. Extracted {total_pages} pages to public/documents/pages/")

if __name__ == "__main__":
    main()
