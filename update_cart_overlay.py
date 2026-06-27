import os

dir_path = r'C:\Users\maste\OneDrive\Desktop\sticker\Sticker'

css_block = '''
/* Fix cart overlay coverage and z-indexes */
.cart-overlay {
  top: 0 !important;
  height: 100vh !important;
  z-index: 2000 !important;
}
.cart-drawer {
  z-index: 2001 !important;
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
