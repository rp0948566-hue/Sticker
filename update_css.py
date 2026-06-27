import os

dir_path = r'C:\Users\maste\OneDrive\Desktop\sticker\Sticker'

css_block = '''
/* Mirror Quick View frame effect onto Product Card frame */
.placeholder-image.frame-on {
  padding: 15px !important;
  background: radial-gradient(circle at top left, #3a3a3a, #141414) !important;
  box-shadow: 
    inset 0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 0 0 12px #1f1f1f,
    inset 0 0 0 13px rgba(255, 255, 255, 0.05),
    0 15px 35px rgba(0, 0, 0, 0.4),
    0 5px 15px rgba(0, 0, 0, 0.3) !important;
  border-radius: 4px !important;
  position: relative !important;
}

.placeholder-image.frame-on::after {
  content: '';
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  bottom: 12px;
  box-shadow: inset 0 8px 15px rgba(0, 0, 0, 0.7),
              inset 0 -2px 5px rgba(255, 255, 255, 0.05);
  pointer-events: none;
  z-index: 2;
  border-radius: 2px;
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 25%, transparent 26%, transparent 100%),
    linear-gradient(135deg, transparent 28%, rgba(255, 255, 255, 0.12) 29%, rgba(255, 255, 255, 0.22) 32%, rgba(255, 255, 255, 0.04) 38%, transparent 39%),
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 60%);
}

.placeholder-image.frame-on::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ffffff;
  z-index: 0;
  border-radius: 2px;
}

.placeholder-image.frame-on img {
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.18)) !important;
  border-radius: 2px !important;
  z-index: 1 !important;
  position: relative;
  background-color: transparent !important;
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
