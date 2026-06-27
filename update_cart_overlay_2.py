import os

dir_path = r'C:\Users\maste\OneDrive\Desktop\sticker\Sticker'

old_css_block = '''
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

new_css_block = '''
/* Updated cart overlay coverage and z-indexes to keep navbar visible */
.cart-overlay {
  top: 0 !important;
  height: 100vh !important;
  z-index: 999 !important;
}
.cart-drawer {
  z-index: 2001 !important;
}
.navbar {
  z-index: 2000 !important;
}
'''

count = 0
for root, dirs, files in os.walk(dir_path):
    for f in files:
        if f == 'style.css' or f == 'home.css':
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            if old_css_block in content:
                content = content.replace(old_css_block, new_css_block)
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                count += 1
            elif '/* Updated cart overlay coverage' not in content:
                # Fallback if the old block wasn't exactly matched
                with open(path, 'a', encoding='utf-8') as file:
                    file.write(new_css_block)
                count += 1

print(f'Updated CSS in {count} files.')
