const fs = require('fs');
const path = require('path');

const viewsDir = path.resolve(__dirname, 'src/views');
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

const oldLink = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">';
const newLink = '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">';

for (const file of files) {
  const filePath = path.join(viewsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(oldLink, newLink);
  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Fonts updated!');
