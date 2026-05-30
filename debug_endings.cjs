const fs = require('fs');

// Read file
const content = fs.readFileSync('index.html', 'utf8');

// Check line endings
const hasCRLF = content.includes('\r\n');
const hasLF = content.includes('\n') && !content.startsWith('\r\n');
console.log('Has CRLF:', hasCRLF);
console.log('Has LF only:', hasLF);

// Check what the actual card style looks like
const cardIdx = content.indexOf('product-card');
if (cardIdx !== -1) {
  const sample = content.substring(cardIdx - 5, cardIdx + 200);
  console.log('Card sample:');
  console.log(JSON.stringify(sample));
}

// Check what the style block looks like  
const styleIdx = content.indexOf('products-grid');
if (styleIdx !== -1) {
  const styleSample = content.substring(styleIdx - 20, styleIdx + 100);
  console.log('Style sample:');
  console.log(JSON.stringify(styleSample));
}
