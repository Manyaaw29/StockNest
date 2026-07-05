import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';

// Initialise App Navigation Shell
function initApp() {
  const sidebarRoot = document.getElementById('sidebar-root');
  const topbarRoot = document.getElementById('topbar-root');

  renderSidebar(sidebarRoot, { activeItem: 'settings' });
  initSidebarNav(sidebarRoot);
  renderTopbar(topbarRoot, { searchPlaceholder: 'Search settings...' });
}

document.addEventListener('DOMContentLoaded', initApp);

// Load original data chart scripts
const scriptEl = document.createElement('script');
scriptEl.src = 'stocknest-settings-actions.js';
document.body.appendChild(scriptEl);
