import os
import glob

# List common locations
dirs_to_check = [
    '/vercel',
    '/vercel/share',
    '/vercel/share/v0-project',
    '/vercel/share/v0-project/public',
    '/home',
    '/tmp',
    '.',
    os.getcwd(),
]

print(f"CWD: {os.getcwd()}")

for d in dirs_to_check:
    if os.path.exists(d):
        print(f"\n=== {d} ===")
        try:
            entries = os.listdir(d)
            for e in sorted(entries):
                full = os.path.join(d, e)
                size = ""
                if os.path.isfile(full):
                    size = f" ({os.path.getsize(full)} bytes)"
                print(f"  {'[DIR]' if os.path.isdir(full) else '[FILE]'} {e}{size}")
        except PermissionError:
            print(f"  [PERMISSION DENIED]")
    else:
        print(f"{d} does not exist")

# Recursive search for any .pdf file
print("\n=== SEARCHING FOR ALL .pdf FILES ===")
for root, dirs, files in os.walk('/vercel/share/v0-project'):
    for f in files:
        if f.endswith('.pdf'):
            full = os.path.join(root, f)
            print(f"  {full} ({os.path.getsize(full)} bytes)")

# Also check user home
for root, dirs, files in os.walk('/home'):
    for f in files:
        if f.endswith('.pdf'):
            full = os.path.join(root, f)
            print(f"  {full} ({os.path.getsize(full)} bytes)")
