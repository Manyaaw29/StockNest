/**
 * StockNest — Reusable Sidebar Component
 */

/** Maps nav item ids to page URLs. */
const NAV_ROUTES = {
  'dashboard': 'dashboard.html',
  'setup-locations': 'organisation.html',
  'asset-registry': 'asset_registry.html',
  'inventory-management': 'inventory.html',
  'maintenance': 'maintainance.html',
  'room-booking': 'room-booking.html',
  'room-allocation-transfer': 'allocation.html',
  'analytics-reporting': '#',
  'settings': '#',
};

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  },
  {
    id: 'setup-locations',
    label: 'Setup and locations',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  },
  {
    id: 'asset-registry',
    label: 'Asset Registry',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  },
  {
    id: 'inventory-management',
    label: 'Inventory Management',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  },
  {
    id: 'room-booking',
    label: 'Room Booking',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  },
  {
    id: 'room-allocation-transfer',
    label: 'Room Allocation and Transfer',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  },
  {
    id: 'analytics-reporting',
    label: 'Analytics & Reporting',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  },
];

/** Detect active nav item from current page filename. */
export function detectActiveItem() {
  const page = window.location.pathname.split('/').pop() || 'dashboard.html';
  const map = {
    'dashboard.html': 'dashboard',
    'organisation.html': 'setup-locations',
    'asset_registry.html': 'asset-registry',
    'inventory.html': 'inventory-management',
    'maintainance.html': 'maintenance',
    'room-booking.html': 'room-booking',
    'allocation.html': 'room-allocation-transfer',
  };
  return map[page] || 'dashboard';
}

/**
 * Renders the sidebar into the given container element.
 * @param {HTMLElement} container
 * @param {{ activeItem?: string, location?: string }} options
 */
export function renderSidebar(container, { activeItem, location = 'HQ Alpha' } = {}) {
  const current = activeItem || detectActiveItem();

  const navLinks = NAV_ITEMS.map((item) => {
    const href = NAV_ROUTES[item.id] || '#';
    return `
      <li class="sidebar__nav-item">
        <a href="${href}"
           class="sidebar__nav-link${item.id === current ? ' sidebar__nav-link--active' : ''}"
           data-nav="${item.id}"
           aria-current="${item.id === current ? 'page' : 'false'}">
          ${item.icon}
          <span class="sidebar__nav-label">${item.label}</span>
        </a>
      </li>`;
  }).join('');

  container.innerHTML = `
    <nav class="sidebar" aria-label="Main navigation">
      <a href="dashboard.html" class="sidebar__brand-container sidebar__brand-link" aria-label="StockNest home">
        <h1 class="sidebar__logo-title">StockNest</h1>
        <p class="sidebar__subtitle-desc">Workspace Inventory</p>
      </a>

      <div class="sidebar__location">
        <label class="sidebar__location-label" for="sidebar-location">Location</label>
        <div class="sidebar__location-wrap">
          <select id="sidebar-location" class="sidebar__location-select" aria-label="Switch location">
            <option value="hq-alpha"${location === 'HQ Alpha' ? ' selected' : ''}>HQ Alpha</option>
            <option value="hq-beta"${location === 'HQ Beta' ? ' selected' : ''}>HQ Beta</option>
            <option value="hq-gamma"${location === 'HQ Gamma' ? ' selected' : ''}>HQ Gamma</option>
          </select>
          <svg class="sidebar__location-swap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
        </div>
      </div>

      <ul class="sidebar__nav">
        ${navLinks}
      </ul>

      <div class="sidebar__footer">
        <button type="button" class="sidebar__switch-btn" id="sidebarSwitchBtn">
          <svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          Switch Location
        </button>
        <a href="#" class="sidebar__help-link" id="sidebarHelpLink">Help Center</a>
      </div>
    </nav>`;
}

/**
 * Attaches navigation handlers for placeholder routes and footer actions.
 * @param {HTMLElement} container
 */
export function initSidebarNav(container) {
  const links = container.querySelectorAll('.sidebar__nav-link');

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const navId = link.dataset.nav;

      if (navId === 'analytics-reporting') {
        e.preventDefault();
        alert('Analytics page coming soon');
        return;
      }

      if (navId === 'settings') {
        e.preventDefault();
        alert('Settings page coming soon');
      }
    });
  });

  const helpLink = container.querySelector('#sidebarHelpLink');
  if (helpLink) {
    helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Help Center — contact admin@stocknest.io for support.');
    });
  }

  const switchBtn = container.querySelector('#sidebarSwitchBtn');
  const locationSelect = container.querySelector('#sidebar-location');
  if (switchBtn && locationSelect) {
    switchBtn.addEventListener('click', () => {
      locationSelect.focus();
      locationSelect.click();
    });
  }
}
