import re

# Read the file in binary mode to preserve exact encoding
with open('index.html', 'rb') as f:
    raw = f.read()

# Decode as UTF-8
content = raw.decode('utf-8')

# 1. Replace the inline CSS override block
old_style = '''    <style>
      .products-grid {
        display: flex !important;
        flex-direction: column !important;
        gap: 40px !important;
        padding: 40px 20px !important;
        overflow-x: hidden !important;
      }
      .product-card {
        width: 100% !important;
        max-width: 500px !important;
        margin: 0 auto !important;
        transition: transform 0.3s ease, box-shadow 0.3s ease !important;
      }
      .carousel-container {
        overflow: visible !important;
      }
      #carousel-prev, #carousel-next {
        display: none !important;
      }
    </style>'''

new_style = '''    <style>
      /* Products grid - proper 4-column layout */
      .all-products-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 24px;
        padding: 40px;
        background-color: #FFFDD0;
      }
      @media (max-width: 1100px) {
        .all-products-grid { grid-template-columns: repeat(3, 1fr); }
      }
      @media (max-width: 768px) {
        .all-products-grid { grid-template-columns: repeat(2, 1fr); padding: 20px; gap: 16px; }
      }
      @media (max-width: 480px) {
        .all-products-grid { grid-template-columns: repeat(2, 1fr); padding: 12px; gap: 12px; }
      }
    </style>'''

content = content.replace(old_style, new_style)
print(f"Style replacement: {'SUCCESS' if new_style in content else 'FAILED'}")

# 2. Replace the carousel container opening tag
old_carousel_open = '      <div class="carousel-container"><section class="products-carousel products-grid" id="products-carousel">'
new_grid_open = '      <!-- All Products Grid -->\n      <div class="all-products-grid" id="all-products-grid">'
content = content.replace(old_carousel_open, new_grid_open)
print(f"Grid open replacement: {'SUCCESS' if new_grid_open in content else 'FAILED'}")

# 3. Remove inline styles from product cards
old_card_style = ' style="display: block; margin-bottom: 20px; width: 100%; max-width: 600px; margin-left: auto; margin-right: auto;"'
count = content.count(old_card_style)
content = content.replace(old_card_style, '')
print(f"Card style replacement: {count} occurrences removed")

# 4. Replace the closing section + carousel controls + empty marquee section
old_closing = '''        </section>
        
        <div class="carousel-controls">
          <button class="view-all-btn">View all</button>
          <div class="arrow-buttons">
            <button class="carousel-arrow prev-btn is-dash" id="carousel-prev">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <line class="svg-dash" x1="8" y1="12" x2="16" y2="12"></line>
                <polyline class="svg-chevron" points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button class="carousel-arrow next-btn" id="carousel-next">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <line class="svg-dash" x1="8" y1="12" x2="16" y2="12"></line>
                <polyline class="svg-chevron" points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>'''

new_closing = '      </div>'
content = content.replace(old_closing, new_closing)
print(f"Closing replacement: {'SUCCESS' if new_closing in content else 'FAILED - section closing'}")

# 5. Remove the empty autoplay marquee section
# Find and remove the combined autoplay section
import re
old_marquee = re.compile(
    r'\s*<!-- Combined Autoplay Section \(Gold Yellow Background\) -->.*?</section>',
    re.DOTALL
)
match = old_marquee.search(content)
if match:
    content = old_marquee.sub('\n', content, count=1)
    print("Marquee section removal: SUCCESS")
else:
    print("Marquee section removal: NOT FOUND - may need manual check")

# Write back in binary mode to preserve exact encoding
with open('index.html', 'wb') as f:
    f.write(content.encode('utf-8'))

print("\nAll done! index.html updated.")
