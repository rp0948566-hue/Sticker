import os

dir_path = r'C:\Users\maste\OneDrive\Desktop\sticker\Sticker'

count = 0
for root, dirs, files in os.walk(dir_path):
    for f in files:
        if f == 'style.css' or f == 'home.css':
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            if 'overflow-x: hidden;' in content and 'body {' in content:
                content = content.replace('overflow-x: hidden;', 'overflow-x: clip;')
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                count += 1

print(f'Updated CSS in {count} files.')
