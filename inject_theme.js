const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'src/views');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const f of files) {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  
  if (!content.includes('theme.js')) {
    content = content.replace('</head>', '  <script src="/assets/theme.js"></script>\n</head>');
    fs.writeFileSync(p, content, 'utf8');
  }
}
console.log('Theme script injected to head');
