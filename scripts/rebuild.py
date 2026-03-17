import os
os.makedirs('/vercel/share/v0-project/components/design-variants', exist_ok=True)

# Read each part file and concatenate
parts = []
part_dir = '/vercel/share/v0-project/scripts/parts'
for i in range(1, 20):
    path = f'{part_dir}/part{i}.txt'
    if os.path.exists(path):
        with open(path, 'r') as f:
            parts.append(f.read())

content = ''.join(parts)
with open('/vercel/share/v0-project/components/design-variants/variant-e-doc-compare.tsx', 'w') as f:
    f.write(content)

print(f'[v0] Wrote {len(content)} chars, {content.count(chr(10))} lines')
