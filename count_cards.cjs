const fs = require('fs');
const c = fs.readFileSync('index.html', 'utf8');
const count = (c.match(/class="product-card"/g) || []).length;
console.log('Total product cards:', count);
