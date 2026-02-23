import subprocess
import sys
import os
import urllib.request
import base64

subprocess.check_call([sys.executable, "-m", "pip", "install", "PyMuPDF", "-q"])
import fitz

PDF_URL = "https://blobs.vusercontent.net/blob/1TDI-CCH-2024%201-AoCcp9ntCvzb0G0QNdwPmq3Q1Y6ZFQ.pdf"
pdf_path = "/tmp/binder.pdf"

if not os.path.exists(pdf_path):
    urllib.request.urlretrieve(PDF_URL, pdf_path)

doc = fitz.open(pdf_path)
print(f"TOTAL PAGES: {doc.page_count}")

# Export pages 1-12 as base64 (batch 1)
START = 1
END = 12

for i in range(START - 1, min(END, doc.page_count)):
    page = doc[i]
    text = page.get_text().strip()
    
    # Render at lower DPI (100) to keep base64 smaller
    mat = fitz.Matrix(100/72, 100/72)
    pix = page.get_pixmap(matrix=mat)
    img_bytes = pix.tobytes("png")
    b64 = base64.b64encode(img_bytes).decode('ascii')
    
    has_text = len(text) > 20
    page_type = "TEXT" if has_text else "SCANNED"
    first_line = text.split('\n')[0][:80] if has_text else "(image only)"
    
    # Save as file so we can access it
    out_path = f"/tmp/pdf_pages/page-{i+1:03d}.png"
    os.makedirs("/tmp/pdf_pages", exist_ok=True)
    pix.save(out_path)
    
    print(f"\n=== PAGE {i+1} [{page_type}] ===")
    print(f"Preview: {first_line}")
    print(f"Size: {len(img_bytes):,} bytes")
    print(f"Saved: {out_path}")

doc.close()
