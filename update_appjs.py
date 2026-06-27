import os
import re

dir_path = r'C:\Users\maste\OneDrive\Desktop\sticker\Sticker'

count = 0
for root, dirs, files in os.walk(dir_path):
    for f in files:
        if f == 'app.js':
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            if 'pill.classList.add(\'active\');' in content and 'Add visual frame logic' not in content:
                # Find the block where pill selection is handled
                pattern = r"(pill\.classList\.add\('active'\);\s*\}\);\s*\r?\n\}\)\(\);)"
                
                replacement = '''pill.classList.add('active');

    if (group === 'frame') {
      const imgContainer = card.querySelector('.placeholder-image');
      if (imgContainer) {
        if (pill.dataset.val === 'with') {
          imgContainer.classList.add('frame-on');
        } else {
          imgContainer.classList.remove('frame-on');
        }
      }
    } // Add visual frame logic
  });
})();'''
                
                new_content = re.sub(pattern, replacement, content)
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(new_content)
                    count += 1

print(f'Updated app.js in {count} files.')
