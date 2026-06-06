const fs = require('fs');
const css = fs.readFileSync('src/style.css', 'utf8');
const lines = css.split('\n');
const idx = lines.findIndex(l => l.includes('.quick-view-modal'));
if (idx !== -1) {
  console.log(lines.slice(idx - 10, idx + 20).join('\n'));
} else {
  console.log('.quick-view-modal not found');
}
