const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'src/views');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const badSelectHtmlRegex = /\s*<div style="padding: 0 16px 16px;">\s*<select class="globalTeamSelect".*?<\/select>\s*<\/div>/g;

for (const f of files) {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  
  // 1. Remove bad select
  content = content.replace(badSelectHtmlRegex, '');
  
  // 2. Wrap page-header contents and add team switcher
  content = content.replace(/<div class="page-header">([\s\S]*?)<\/div>/, (match, inner) => {
    // If it already has team-switcher-wrapper, skip
    if (inner.includes('team-switcher-wrapper')) return match;
    
    return `<div class="page-header">
        <div class="page-header-info">${inner}</div>
        <div class="team-switcher-wrapper">
          <span class="team-switcher-label">TEAM</span>
          <select class="globalTeamSelect"></select>
        </div>
      </div>`;
  });
  
  fs.writeFileSync(p, content, 'utf8');
}
console.log('Fixed Team Switcher position!');
