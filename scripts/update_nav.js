const fs = require('fs');
const path = require('path');

const viewsDir = path.resolve(__dirname, 'src/views');
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

const baseNav = `      <nav class="sidebar-nav">
        <a class="sidebar-link __DASHBOARD__" href="/">
          <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Dashboard
        </a>
        <a class="sidebar-link __SHEET__" href="/sheet">
          <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
          Google Sheet
        </a>
        <a class="sidebar-link __SETUP__" href="/setup">
          <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Setup
        </a>
        <a class="sidebar-link __DOCS__" href="/docs">
          <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          API Docs
        </a>
        <a class="sidebar-link __STATUS__" href="/status">
          <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Status
        </a>
      </nav>`;

const baseMobileNav = `    <div class="mobile-nav">
      <a class="__DASHBOARD__" href="/">Dashboard</a>
      <a class="__SHEET__" href="/sheet">Sheet</a>
      <a class="__SETUP__" href="/setup">Setup</a>
      <a class="__DOCS__" href="/docs">Docs</a>
      <a class="__STATUS__" href="/status">Status</a>
    </div>`;

for (const file of files) {
  const filePath = path.join(viewsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to replace nav sections
  content = content.replace(/<nav class="sidebar-nav">[\s\S]*?<\/nav>/, baseNav);
  content = content.replace(/<div class="mobile-nav">[\s\S]*?<\/div>/, baseMobileNav);

  // Set active classes
  const cleanBase = (c) => c.replace(/__(DASHBOARD|SHEET|SETUP|DOCS|STATUS)__/g, '');
  
  if (file === 'index.html') {
    content = content.replace(/__DASHBOARD__/g, 'is-active');
  } else if (file === 'sheet.html') {
    content = content.replace(/__SHEET__/g, 'is-active');
  } else if (file === 'setup.html') {
    content = content.replace(/__SETUP__/g, 'is-active');
  } else if (file === 'docs.html') {
    content = content.replace(/__DOCS__/g, 'is-active');
  } else if (file === 'status.html') {
    content = content.replace(/__STATUS__/g, 'is-active');
  }

  content = cleanBase(content);

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Navs updated!');
