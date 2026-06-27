import os

dir_path = r'C:\Users\maste\OneDrive\Desktop\sticker\Sticker'

target_1 = '>FRAME <span class="dropdown-caret">&#9660;</span></a>'
replacement_1 = '>POSTER <span class="dropdown-caret">&#9660;</span></a>'

target_2 = '>FRAME</a>'
replacement_2 = '>POSTER</a>'

count = 0
for root, dirs, files in os.walk(dir_path):
    for f in files:
        if f.endswith('.html'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            if target_1 in content or target_2 in content:
                content = content.replace(target_1, replacement_1)
                
                target_2_safe = 'href="/frontend/FRAME/FRAME/index.html">FRAME</a>'
                replacement_2_safe = 'href="/frontend/FRAME/FRAME/index.html">POSTER</a>'
                
                content = content.replace(target_2_safe, replacement_2_safe)
                
                target_3_safe = 'href="./frontend/FRAME/FRAME/index.html">FRAME</a>'
                replacement_3_safe = 'href="./frontend/FRAME/FRAME/index.html">POSTER</a>'
                
                content = content.replace(target_3_safe, replacement_3_safe)
                
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                count += 1

print(f'Replaced in {count} HTML files.')
