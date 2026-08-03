// global-nav.js — only handles mobile sidebar toggle
// Sidebar & topbar are rendered by each page's own <script type="module">
document.addEventListener('DOMContentLoaded', () => {
  const sidebarRoot    = document.getElementById('sidebar-root');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarToggle  = document.getElementById('sidebarToggle');

  if (sidebarToggle && sidebarRoot) {
    sidebarToggle.addEventListener('click', () => {
      sidebarRoot.classList.toggle('app-shell__sidebar--open');
      if (sidebarOverlay) sidebarOverlay.classList.toggle('sidebar-overlay--active');
    });
  }

  if (sidebarOverlay && sidebarRoot) {
    sidebarOverlay.addEventListener('click', () => {
      sidebarRoot.classList.remove('app-shell__sidebar--open');
      sidebarOverlay.classList.remove('sidebar-overlay--active');
    });
  }

  // Logout button (if any on this page)
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Log out of StockNest?')) {
        ['token', 'user', 'stocknest_token', 'stocknest_user'].forEach(k => {
          localStorage.removeItem(k); sessionStorage.removeItem(k);
        });
        window.location.href = 'index.html';
      }
    });
  });
});

