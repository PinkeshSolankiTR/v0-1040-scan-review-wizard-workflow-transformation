import subprocess
import sys
import os

# Install pypdf
subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf", "-q"])

from pypdf import PdfReader

# Try multiple paths
paths = [
    "/vercel/share/v0-project/public/documents/1TDI-CCH-2024-binder.pdf",
    "/vercel/share/v0-project/user_read_only_context/text_attachments/1TDI-CCH-2024-1-5v1G9.pdf",
]

reader = None
for p in paths:
    if os.path.exists(p):
        print(f"Found PDF at: {p}")
        reader = PdfReader(p)
        break
    else:
        print(f"Not found: {p}")

if not reader:
    # List directories to find the file
    for d in ["/vercel/share/v0-project/public/documents", "/vercel/share/v0-project/user_read_only_context/text_attachments"]:
        if os.path.isdir(d):
            files = [f for f in os.listdir(d) if f.endswith('.pdf')]
            print(f"PDFs in {d}: {files}")
    print("ERROR: PDF not found")
    sys.exit(1)

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
