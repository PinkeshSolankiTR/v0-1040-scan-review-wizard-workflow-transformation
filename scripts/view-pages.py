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

# View specific pages - render at 150 DPI and output base64
# We'll do pages in batches to avoid output limits
PAGES_TO_VIEW = [1, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

for pg in PAGES_TO_VIEW:
    page = doc[pg - 1]
    mat = fitz.Matrix(150/72, 150/72)
    pix = page.get_pixmap(matrix=mat)
    
    # Save as PNG
    out_dir = "/tmp/pdf_pages"
    os.makedirs(out_dir, exist_ok=True)
    out_path = f"{out_dir}/page-{pg:03d}.png"
    pix.save(out_path)
    
    # Output base64 for embedding
    img_bytes = pix.tobytes("png")
    b64 = base64.b64encode(img_bytes).decode('ascii')
    
    print(f"\n=== PAGE {pg} === ({pix.width}x{pix.height}, {len(img_bytes):,} bytes)")
    # Output as data URI that can be viewed
    print(f"data:image/png;base64,{b64[:200]}...")
    print(f"Full base64 length: {len(b64)}")
    
    # Try to save to project public dir
    try:
        proj_dir = "/vercel/share/v0-project/public/documents/pages"
        os.makedirs(proj_dir, exist_ok=True)
        pix.save(f"{proj_dir}/page-{pg:03d}.png")
        print(f"Saved to project: {proj_dir}/page-{pg:03d}.png")
    except Exception as e:
        print(f"Cannot save to project: {e}")

doc.close()
print("\nDone.")
