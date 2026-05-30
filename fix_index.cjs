const fs = require('fs');

// Read file preserving exact encoding and line endings
let content = fs.readFileSync('index.html', 'utf8');

const SEP = '\r\n'; // CRLF

// 1. Replace the inline CSS override block (using CRLF)
const oldStyle = `    <style>${SEP}      .products-grid {${SEP}        display: flex !important;${SEP}        flex-direction: column !important;${SEP}        gap: 40px !important;${SEP}        padding: 40px 20px !important;${SEP}        overflow-x: hidden !important;${SEP}      }${SEP}      .product-card {${SEP}        width: 100% !important;${SEP}        max-width: 500px !important;${SEP}        margin: 0 auto !important;${SEP}        transition: transform 0.3s ease, box-shadow 0.3s ease !important;${SEP}      }${SEP}      .carousel-container {${SEP}        overflow: visible !important;${SEP}      }${SEP}      #carousel-prev, #carousel-next {${SEP}        display: none !important;${SEP}      }${SEP}    </style>`;

const newStyle = `    <style>${SEP}      /* Products grid - proper 4-column layout */${SEP}      .all-products-grid {${SEP}        display: grid;${SEP}        grid-template-columns: repeat(4, 1fr);${SEP}        gap: 24px;${SEP}        padding: 40px;${SEP}        background-color: #FFFDD0;${SEP}      }${SEP}      @media (max-width: 1100px) {${SEP}        .all-products-grid { grid-template-columns: repeat(3, 1fr); }${SEP}      }${SEP}      @media (max-width: 768px) {${SEP}        .all-products-grid { grid-template-columns: repeat(2, 1fr); padding: 20px; gap: 16px; }${SEP}      }${SEP}      @media (max-width: 480px) {${SEP}        .all-products-grid { grid-template-columns: repeat(2, 1fr); padding: 12px; gap: 12px; }${SEP}      }${SEP}    </style>`;

if (content.includes(oldStyle)) {
  content = content.replace(oldStyle, newStyle);
  console.log('Style replacement: SUCCESS');
} else {
  console.log('Style block: FAILED - trying partial match...');
  // Try just checking first line
  const partialCheck = content.includes('.products-grid {');
  console.log('Partial check (.products-grid):', partialCheck);
}

// 2. Replace carousel container opening tag
const oldCarouselOpen = `      <div class="carousel-container"><section class="products-carousel products-grid" id="products-carousel">`;
const newGridOpen = `      <!-- All Products Grid -->${SEP}      <div class="all-products-grid" id="all-products-grid">`;

if (content.includes(oldCarouselOpen)) {
  content = content.replace(oldCarouselOpen, newGridOpen);
  console.log('Grid open replacement: SUCCESS');
} else {
  console.log('Grid open: FAILED');
}

// 3. Remove 'display: none' from product-card elements (show all products)
const hiddenCard = ` style="display: none;"`;
const count = (content.split(hiddenCard).length - 1);
content = content.split(hiddenCard).join('');
console.log(`Hidden card style removal: ${count} occurrences removed`);

// 4. Replace closing section + carousel controls
// Look for the section closing and carousel controls
const oldSectionClose = `        </section>${SEP}        ${SEP}        <div class="carousel-controls">${SEP}          <button class="view-all-btn">View all</button>${SEP}          <div class="arrow-buttons">${SEP}            <button class="carousel-arrow prev-btn is-dash" id="carousel-prev">${SEP}              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${SEP}                <line class="svg-dash" x1="8" y1="12" x2="16" y2="12"></line>${SEP}                <polyline class="svg-chevron" points="15 18 9 12 15 6"></polyline>${SEP}              </svg>${SEP}            </button>${SEP}            <button class="carousel-arrow next-btn" id="carousel-next">${SEP}              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${SEP}                <line class="svg-dash" x1="8" y1="12" x2="16" y2="12"></line>${SEP}                <polyline class="svg-chevron" points="9 18 15 12 9 6"></polyline>${SEP}              </svg>${SEP}            </button>${SEP}          </div>${SEP}        </div>${SEP}      </div>`;

if (content.includes(oldSectionClose)) {
  content = content.replace(oldSectionClose, `      </div>`);
  console.log('Closing replacement: SUCCESS');
} else {
  console.log('Closing: FAILED - need to check actual content');
  // Let's find what comes after the last product card in the carousel
  const lastProductEnd = content.lastIndexOf('</div>\r\n        </div>\r\n        </section>');
  console.log('Last product end:', lastProductEnd);
  if (lastProductEnd !== -1) {
    const sample = content.substring(lastProductEnd, lastProductEnd + 400);
    console.log('Sample after last product:', JSON.stringify(sample));
  }
}

// 5. Remove the empty autoplay marquee section
const autoplayMarker = `<!-- Combined Autoplay Section (Gold Yellow Background) -->`;
const bestSellersMarker = `<!-- BEST SELLERS Carousel Section -->`;

const autoplayIdx = content.indexOf(autoplayMarker);
const bestSellersIdx = content.indexOf(bestSellersMarker);

console.log(`Autoplay marker found at: ${autoplayIdx}`);
console.log(`Best sellers marker found at: ${bestSellersIdx}`);

if (autoplayIdx !== -1 && bestSellersIdx !== -1) {
  // Find the start of the autoplay section (the whitespace before the comment)
  let sectionStart = autoplayIdx;
  // Go back to find the newline before the comment
  while (sectionStart > 0 && content[sectionStart - 1] !== '\n') {
    sectionStart--;
  }
  // Keep 2 newlines before BEST SELLERS
  content = content.substring(0, sectionStart) + SEP + '      ' + content.substring(bestSellersIdx);
  console.log('Marquee removal: SUCCESS');
} else {
  console.log('Marquee removal: FAILED');
}

// Write back preserving encoding
fs.writeFileSync('index.html', content, 'utf8');
console.log('\nDone! index.html updated.');
