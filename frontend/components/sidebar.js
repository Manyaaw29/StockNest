/**
 * StockNest — Reusable Sidebar Component
 */

/** Maps nav item ids to page URLs. */
const NAV_ROUTES = {
  'dashboard': 'dashboard.html',
  'setup-locations': 'organisation.html',
  'inventory-management': 'inventory.html',
  'maintenance': 'maintainance.html',
  'room-booking': 'room-booking.html',
  'bookings.html': 'room-booking',
  'room-allocation-transfer': 'allocation.html',
  'analytics-reporting': 'sn_dashboard_view.html',
  'profile': 'profile.html',
  'settings': 'stocknest-settings-view.html',
};

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  },
  {
    id: 'setup-locations',
    label: 'Setup & Locations',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  },
  {
    id: 'inventory-management',
    label: 'Inventory Management',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  },
  {
    id: 'room-booking',
    label: 'Room Booking',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  },
  {
    id: 'room-allocation-transfer',
    label: 'Allocation & Transfer',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  },
  {
    id: 'analytics-reporting',
    label: 'Analytics & Reports',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  },
  {
    id: 'profile',
    label: 'My Profile',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  },
  {
    id: 'settings',
    label: 'Account Settings',
    icon: `<svg class="sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  },
];

/** Detect active nav item from current page filename. */
export function detectActiveItem() {
  const page = window.location.pathname.split('/').pop() || 'dashboard.html';
  const map = {
    'dashboard.html': 'dashboard',
    'organisation.html': 'setup-locations',
    'inventory.html': 'inventory-management',
    'maintainance.html': 'maintenance',
    'room-booking.html': 'room-booking',
    'bookings.html': 'room-booking',
    'allocation.html': 'room-allocation-transfer',
    'sn_dashboard_view.html': 'analytics-reporting',
    'profile.html': 'profile',
    'stocknest-settings-view.html': 'settings',
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
          <span class="sidebar__link-accent"></span>
          ${item.icon}
          <span class="sidebar__nav-label">${item.label}</span>
        </a>
      </li>`;
  }).join('');

  // Fetch logged-in user profile attributes for the sidebar card
  const cachedUserStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  let initials = 'JD';
  let userName = 'John Doe';
  let userRole = 'Workspace Administrator';
  let userAvatarBg = '#2563eb';
  let userAvatarImg = '';

  if (cachedUserStr) {
    try {
      const user = JSON.parse(cachedUserStr);
      userName = user.name || userName;
      userRole = user.role || userRole;
      const parts = userName.split(' ');
      initials = `${parts[0] ? parts[0][0] : ''}${parts[1] ? parts[1][0] : ''}`.toUpperCase() || 'JD';
    } catch (e) {
      console.error(e);
    }
  }

  // Load avatar styling variables if set in global-nav or profile
  const savedBg = localStorage.getItem('sn_user_avatar_bg');
  const savedImg = localStorage.getItem('sn_user_avatar_img');
  const savedText = localStorage.getItem('sn_user_avatar_text');
  if (savedBg) userAvatarBg = savedBg;
  if (savedText) initials = savedText;
  if (savedImg) userAvatarImg = savedImg;

  const avatarStyle = userAvatarImg 
    ? `background-image: url(${userAvatarImg}); background-size: cover; background-position: center; color: transparent;`
    : `background-color: ${userAvatarBg};`;

  container.innerHTML = `
    <nav class="sidebar" aria-label="Main navigation">
      <div class="sidebar__glow-effect"></div>
      
      <a href="dashboard.html" class="sidebar__brand-container sidebar__brand-link" aria-label="StockNest home">
        <div class="sidebar__logo-icon-box" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="sidebar__brand-text-container">
          <h1 class="sidebar__logo-title">StockNest</h1>
          <p class="sidebar__subtitle-desc">Workspace Hub</p>
        </div>
      </a>

      <div class="sidebar__scroller">
        <ul class="sidebar__nav">
          ${navLinks}
        </ul>
      </div>

      <div class="sidebar__footer">
        <div class="sidebar__location-wrapper">
          <button class="sidebar__location" id="sidebarSwitchBtn" type="button" aria-haspopup="listbox" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sidebar__location-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span class="sidebar__location-label">${location}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sidebar__location-chevron"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <ul class="sidebar__location-menu" id="sidebarLocationMenu" role="listbox" hidden>
            <li role="option" data-location="Floor 3 &amp; 4">Floor 3 &amp; 4</li>
            <li role="option" data-location="East Wing">East Wing</li>
            <li role="option" data-location="HQ Alpha">HQ Alpha</li>
          </ul>
        </div>

        <button class="sidebar__help" type="button" id="sidebarHelpLink">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Help Center</span>
        </button>

        <!-- User Profile Card -->
        <div class="sidebar__user-card" id="sidebarUserCard">
          <div class="sidebar__user-avatar" style="${avatarStyle}">
            ${userAvatarImg ? '' : initials}
          </div>
          <div class="sidebar__user-info">
            <div class="sidebar__user-name">${userName}</div>
            <div class="sidebar__user-role">
              <span class="sidebar__user-status-dot"></span>
              ${userRole}
            </div>
          </div>
        </div>
      </div>
    </nav>`;
}

/**
 * Attaches navigation handlers for placeholder routes and footer actions.
 * @param {HTMLElement} container
 */
export function initSidebarNav(container) {
  const helpLink = container.querySelector('#sidebarHelpLink');
  if (helpLink) {
    helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Help Center — contact admin@stocknest.io for support.');
    });
  }

  const switchBtn = container.querySelector('#sidebarSwitchBtn');
  const locationMenu = container.querySelector('#sidebarLocationMenu');
  if (switchBtn && locationMenu) {
    switchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = locationMenu.hasAttribute('hidden');
      if (isHidden) {
        locationMenu.removeAttribute('hidden');
        switchBtn.setAttribute('aria-expanded', 'true');
      } else {
        locationMenu.setAttribute('hidden', '');
        switchBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      locationMenu.setAttribute('hidden', '');
      switchBtn.setAttribute('aria-expanded', 'false');
    });

    // Handle selection
    locationMenu.addEventListener('click', (e) => {
      const item = e.target.closest('li');
      if (!item) return;
      const selectedLoc = item.dataset.location;
      
      // Update label in UI
      const labelEl = container.querySelector('.sidebar__location-label');
      if (labelEl) labelEl.textContent = selectedLoc;
      
      locationMenu.setAttribute('hidden', '');
      switchBtn.setAttribute('aria-expanded', 'false');
      
      // Trigger event or sync state across page if necessary
      const event = new CustomEvent('sn-location-change', { detail: selectedLoc });
      document.dispatchEvent(event);
    });
  }
}
