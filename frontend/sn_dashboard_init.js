import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';

// Initialise App Navigation Shell
function initApp() {
  const sidebarRoot = document.getElementById('sidebar-root');
  const topbarRoot = document.getElementById('topbar-root');

  renderSidebar(sidebarRoot, { activeItem: 'analytics-reporting' });
  initSidebarNav(sidebarRoot);
  renderTopbar(topbarRoot, { searchPlaceholder: 'Search reports, assets, or locations...' });
}

document.addEventListener('DOMContentLoaded', initApp);

// Load original data chart scripts
const scriptEl = document.createElement('script');
scriptEl.src = 'assets/js/sn_dashboard_script.js';
document.body.appendChild(scriptEl);
