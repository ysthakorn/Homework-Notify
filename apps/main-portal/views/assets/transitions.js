document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a[href^="/"]');
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      // Ignore new tabs or hash links
      if (e.ctrlKey || e.metaKey || link.target === '_blank') return;
      const href = link.getAttribute('href');
      if (href.startsWith('#')) return;
      
      e.preventDefault();
      document.body.classList.add('page-exiting');
      
      setTimeout(() => {
        window.location.href = href;
      }, 150); // Matches the CSS animation duration
    });
  });
});
