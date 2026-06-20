const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'src/views');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const selectHtml = `
      <div style="padding: 0 16px 16px;">
        <select class="globalTeamSelect" style="width:100%; padding: 6px; border-radius:4px; border:1px solid var(--border); background: var(--bg); color: var(--ink); font-family: inherit; font-size: 0.88rem; outline: none; cursor: pointer;"></select>
      </div>`;

for (const f of files) {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  
  // Insert team select after sidebar-brand
  if (!content.includes('globalTeamSelect')) {
    content = content.replace(/(<div class="sidebar-brand">[\s\S]*?<\/div>)/, `$1\n${selectHtml}`);
  }
  
  // Insert teams.js script tag BEFORE transitions.js
  if (!content.includes('teams.js')) {
    content = content.replace('<script src="/assets/transitions.js"></script>', '<script src="/assets/teams.js"></script>\n  <script src="/assets/transitions.js"></script>');
  }
  
  fs.writeFileSync(p, content, 'utf8');
}
console.log('Team selector and script added!');
