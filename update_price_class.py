import os

dir_path = r'C:\Users\maste\OneDrive\Desktop\sticker\Sticker'

count = 0
for root, dirs, files in os.walk(dir_path):
    for f in files:
        if f == 'app.js':
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            if 'card.querySelector(\'.price-new\')' in content:
                new_content = content.replace('card.querySelector(\'.price-new\')', 'card.querySelector(\'.price-current\')')
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                count += 1

print(f'Updated price selector in {count} files.')
