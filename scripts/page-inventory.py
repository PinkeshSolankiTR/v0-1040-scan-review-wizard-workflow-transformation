import subprocess
import sys
import os
import urllib.request

subprocess.check_call([sys.executable, "-m", "pip", "install", "PyMuPDF", "-q"])
import fitz

PDF_URL = "https://blobs.vusercontent.net/blob/1TDI-CCH-2024%201-AoCcp9ntCvzb0G0QNdwPmq3Q1Y6ZFQ.pdf"
pdf_path = "/tmp/binder.pdf"

if not os.path.exists(pdf_path):
    urllib.request.urlretrieve(PDF_URL, pdf_path)

doc = fitz.open(pdf_path)
print(f"TOTAL PAGES: {doc.page_count}\n")

for i in range(doc.page_count):
    page = doc[i]
    
    # Extract ALL text (including hidden/small text)
    text = page.get_text("text").strip()
    
    # Also try extracting text blocks with position info
    blocks = page.get_text("blocks")
    
    # Get page dimensions
    rect = page.rect
    w, h = rect.width, rect.height
    
    # Count images on the page
    images = page.get_images(full=True)
    
    # Get any annotations
    annots = list(page.annots()) if page.annots() else []
    
    print(f"=== PAGE {i+1}/{doc.page_count} ===")
    print(f"  Dimensions: {w:.0f} x {h:.0f} pts")
    print(f"  Images: {len(images)}")
    print(f"  Annotations: {len(annots)}")
    print(f"  Text length: {len(text)} chars")
    
    if text:
        # Print first 500 chars of text
        lines = text.split('\n')
        print(f"  Text lines: {len(lines)}")
        print(f"  --- TEXT START ---")
        for line in lines[:20]:
            if line.strip():
                print(f"    {line.strip()[:120]}")
        if len(lines) > 20:
            print(f"    ... ({len(lines) - 20} more lines)")
        print(f"  --- TEXT END ---")
    else:
        print(f"  [NO EXTRACTABLE TEXT - SCANNED IMAGE PAGE]")
        # For image pages, try to get image metadata
        if images:
            for img_idx, img in enumerate(images[:3]):
                xref = img[0]
                print(f"  Image {img_idx+1}: xref={xref}, size={img[2]}x{img[3]}, bpc={img[4]}, colorspace={img[5]}")
    
    print()

doc.close()
print("=== INVENTORY COMPLETE ===")
