import os
import base64
import json

# Read the manifest and print base64-encoded images
# so the orchestrator can save them via Write tool
manifest_path = "/tmp/pdf_pages/manifest.json"
if not os.path.exists(manifest_path):
    print("No manifest found. Run pdf-to-images.py first.")
    exit(1)

with open(manifest_path) as f:
    manifest = json.load(f)

print(f"Total pages: {len(manifest)}")

# For each page, print page number and file size
for entry in manifest:
    img_path = entry["img_path"]
    if os.path.exists(img_path):
        size = os.path.getsize(img_path)
        print(f"Page {entry['page']:2d}: {entry['type']:8s} | {size:>8,} bytes | {entry['text_preview']}")
    else:
        print(f"Page {entry['page']:2d}: IMAGE NOT FOUND at {img_path}")
