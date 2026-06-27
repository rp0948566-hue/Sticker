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
            
            # We want to add size update logic inside the click listener
            # The current listener has:
            # if (group === 'frame') { ... } // Add visual frame logic
            # We will insert size logic right after it.
            
            if 'if (group === \'frame\')' in content and 'Update card price based on size' not in content:
                pattern = r"(\} // Add visual frame logic)"
                
                replacement = '''} // Add visual frame logic
    
    // Update card price based on size
    if (group === 'size') {
      const priceDisplay = card.querySelector('.price-new');
      const oldPriceDisplay = card.querySelector('.price-old');
      const badgeDisplay = card.querySelector('.price-badge');
      
      let newPrice = '15.00';
      let oldPrice = '79.00';
      let discount = '64.00';
      
      if (pill.dataset.val.includes('3')) {
        newPrice = '15.00'; oldPrice = '79.00'; discount = '64.00';
      } else if (pill.dataset.val.includes('4')) {
        newPrice = '29.00'; oldPrice = '89.00'; discount = '60.00';
      } else if (pill.dataset.val.includes('5')) {
        newPrice = '39.00'; oldPrice = '99.00'; discount = '60.00';
      }
      
      if (priceDisplay) priceDisplay.textContent = 'Rs. ' + newPrice;
      if (oldPriceDisplay) oldPriceDisplay.textContent = 'Rs. ' + oldPrice;
      if (badgeDisplay) badgeDisplay.textContent = '-Rs. ' + discount;
    }'''
                
                new_content = re.sub(pattern, replacement, content)
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(new_content)
                    count += 1

print(f'Updated price logic in {count} files.')
