import os

dir_path = r'C:\Users\maste\OneDrive\Desktop\sticker\Sticker'

css_block = '''
/* Update save badge position to be closer to top right edge */
.save-badge {
  top: 6px !important;
  right: 6px !important;
}
'''

count = 0
for root, dirs, files in os.walk(dir_path):
    for f in files:
        if f == 'style.css' or f == 'home.css':
            path = os.path.join(root, f)
            with open(path, 'a', encoding='utf-8') as file:
                file.write(css_block)
            count += 1

print(f'Updated CSS in {count} files.')
