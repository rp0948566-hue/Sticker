import os
import re

dir_path = r'C:\Users\maste\OneDrive\Desktop\sticker\Sticker'

count = 0
for root, dirs, files in os.walk(dir_path):
    for f in files:
        if f == 'style.css' or f == 'home.css':
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # replace top: 6px with top: -2px, and right: 6px with right: -2px, maybe? 
            # Or just top: 0, right: 0
            if '.save-badge {' in content and 'top: 6px !important;' in content:
                content = content.replace('top: 6px !important;', 'top: 2px !important;')
                content = content.replace('right: 6px !important;', 'right: 2px !important;')
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                count += 1

print(f'Updated CSS in {count} files.')
