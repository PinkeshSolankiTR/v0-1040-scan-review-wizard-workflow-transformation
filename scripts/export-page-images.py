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
    print("Downloading PDF...")
    urllib.request.urlretrieve(PDF_URL, pdf_path)
    print(f"Downloaded: {os.path.getsize(pdf_path):,} bytes")

doc = fitz.open(pdf_path)
total = doc.page_count
print(f"TOTAL PAGES: {total}")

for i in range(total):
    page = doc[i]
    embedded_text = page.get_text().strip()
    has_embedded = len(embedded_text) > 20
    
    # Render to image at 72 DPI (1:1) to keep memory low
    pix = page.get_pixmap()
    img_bytes = pix.tobytes("png")
    
    print(f"\n{'='*60}")
    print(f"PAGE {i+1}/{total}")
    print(f"{'='*60}")
    
    if has_embedded:
        print(f"[NATIVE TEXT]")
        for line in embedded_text.split('\n')[:15]:
            if line.strip():
                print(f"  {line.strip()[:120]}")
    else:
        print(f"[SCANNED IMAGE]")
        print(f"  Dimensions: {pix.width}x{pix.height}")
        # Extract any embedded images info
        img_list = page.get_images()
        print(f"  Embedded images: {len(img_list)}")
    
    # Save image
    out_dir = "/tmp/pdf_pages"
    os.makedirs(out_dir, exist_ok=True)
    out_path = f"{out_dir}/page-{i+1:03d}.png"
    pix.save(out_path)

doc.close()
print(f"\nDone. All {total} pages processed.")
