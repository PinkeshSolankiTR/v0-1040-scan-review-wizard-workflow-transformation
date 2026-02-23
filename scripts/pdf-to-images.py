import subprocess
import sys
import os
import urllib.request

# Install PyMuPDF (fitz) - works without external system dependencies
subprocess.check_call([sys.executable, "-m", "pip", "install", "PyMuPDF", "-q"])

import fitz  # PyMuPDF

# Download the PDF from the blob URL
PDF_URL = "https://blobs.vusercontent.net/blob/1TDI-CCH-2024%201-AoCcp9ntCvzb0G0QNdwPmq3Q1Y6ZFQ.pdf"
pdf_path = "/tmp/binder.pdf"

print(f"Downloading PDF from blob URL...")
urllib.request.urlretrieve(PDF_URL, pdf_path)
file_size = os.path.getsize(pdf_path)
print(f"Downloaded: {pdf_path} ({file_size:,} bytes)")

print(f"\nOpening PDF: {pdf_path}")
doc = fitz.open(pdf_path)
total_pages = doc.page_count
print(f"TOTAL PAGES: {total_pages}")

# Convert each page to PNG at 150 DPI and encode as base64
# Print base64 data so we can capture it
import base64
import json

results = []
for i in range(total_pages):
    page = doc[i]
    text = page.get_text().strip()
    has_text = len(text) > 20
    
    mat = fitz.Matrix(150/72, 150/72)  # 150 DPI
    pix = page.get_pixmap(matrix=mat)
    img_bytes = pix.tobytes("png")
    
    img_path = f"/tmp/pdf_pages/page-{i+1:03d}.png"
    os.makedirs("/tmp/pdf_pages", exist_ok=True)
    pix.save(img_path)
    
    page_type = "TEXT" if has_text else "SCANNED"
    first_line = text.split('\n')[0][:80] if has_text else "(image only)"
    print(f"Page {i+1:2d}/{total_pages} [{page_type}]: {first_line}")
    results.append({"page": i+1, "type": page_type, "text_preview": first_line, "img_path": img_path})

doc.close()

# Write a manifest
with open("/tmp/pdf_pages/manifest.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"\nDone. Saved {total_pages} page images to /tmp/pdf_pages/")
