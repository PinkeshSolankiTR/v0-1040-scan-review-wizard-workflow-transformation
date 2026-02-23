import subprocess
import sys
import os
import urllib.request
import io

# Install pypdf
subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf", "-q"])

from pypdf import PdfReader

# Download the PDF from the public blob URL where the user uploaded it
# The user uploaded: 1TDI-CCH-2024-1-5v1G9.pdf
# Let's read the raw PDF bytes from the project's own binary

# Try to find the file in common sandbox locations
pdf_data = None
search_paths = []

# Construct paths relative to CWD
cwd = os.getcwd()
for root, dirs, files in os.walk(cwd):
    for f in files:
        fp = os.path.join(root, f)
        search_paths.append(fp)
        if f.endswith('.pdf'):
            with open(fp, 'rb') as fh:
                pdf_data = fh.read()
            print(f"Found: {fp} ({len(pdf_data)} bytes)")

if not pdf_data:
    print(f"No PDF in CWD tree ({cwd}). Files found: {search_paths[:20]}")
    # Try /tmp
    for root, dirs, files in os.walk('/tmp'):
        for f in files:
            if f.endswith('.pdf'):
                fp = os.path.join(root, f)
                with open(fp, 'rb') as fh:
                    pdf_data = fh.read()
                print(f"Found in /tmp: {fp} ({len(pdf_data)} bytes)")
                break
        if pdf_data:
            break

if not pdf_data:
    print("No PDF found. Cannot proceed.")
    sys.exit(1)

reader = PdfReader(io.BytesIO(pdf_data))

total_pages = len(reader.pages)
print(f"\n=== TOTAL PAGES: {total_pages} ===\n")

# Extract first few lines of text from each page to identify form types
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    first_lines = lines[:6] if lines else ["[No extractable text - possibly scanned image]"]
    print(f"--- PAGE {i+1} ---")
    for l in first_lines:
        print(f"  {l[:150]}")
    print()

# Search for key terms across all pages
print("\n=== KEY TERM SEARCH ===")
terms = ["ExxonMobil", "Exxon", "Computershare", "1099-DIV", "1099-MISC", "1099-INT", 
         "1099-R", "1099-B", "W-2", "Schedule C", "Schedule K", "Schedule D", "Schedule E",
         "Schedule B", "Form 1040", "WHYNOT", "ANDERSON", "CHAPMAN", "RICHMONT", 
         "Craft Shop", "D04018", "1099-NEC", "Form 8949"]

for term in terms:
    found_pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if term.lower() in text.lower():
            found_pages.append(i + 1)
    if found_pages:
        print(f'"{term}" found on page(s): {found_pages}')
