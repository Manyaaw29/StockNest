/**
 * StockNest — Reusable Top Bar Component
 * Usage: import { renderTopbar } from './components/topbar.js';
 *        renderTopbar(document.getElementById('topbar-root'));
 */

/**
 * Renders the top bar into the given container element.
 * @param {HTMLElement} container - Mount point for the top bar
 * @param {{ userInitials?: string, userName?: string }} options
 */
export function renderTopbar(container, { userInitials = 'NY', userName = 'Neha Yadav', searchPlaceholder = 'Search rooms, assets, or bookings (Cmd+K)' } = {}) {
  // Fetch user initials and background styles dynamically from storage
  let initials = userInitials;
  let userId = 'default';

  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.user_id) userId = user.user_id;
      if (user.name) {
        const parts = user.name.split(' ');
        initials = `${parts[0] ? parts[0][0] : ''}${parts[1] ? parts[1][0] : ''}`.toUpperCase() || 'U';
      }
    } catch (e) {
      console.error(e);
    }
  }

  const savedBg = localStorage.getItem(`sn_user_avatar_bg_${userId}`);
  const savedImg = localStorage.getItem(`sn_user_avatar_img_${userId}`);
  const savedText = localStorage.getItem(`sn_user_avatar_text_${userId}`);
  if (savedText) initials = savedText;

  let avatarStyle = '';
  if (savedImg) {
    avatarStyle = `background-image: url(${savedImg}); background-size: cover; background-position: center;`;
  } else if (savedBg) {
    avatarStyle = `background-color: ${savedBg};`;
  }

  container.innerHTML = `
    <header class="topbar" role="banner">
      <div class="topbar__search-wrap">
        <svg class="topbar__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          id="global-search"
          class="topbar__search-input"
          placeholder="${searchPlaceholder}"
          aria-label="${searchPlaceholder}"
        />
      </div>

      <div class="topbar__actions">
        <button type="button" class="topbar__icon-btn topbar__icon-btn--notifications" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span class="topbar__notification-dot" aria-hidden="true"></span>
        </button>

        <button type="button" class="topbar__quick-add">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Quick Add
        </button>

        <button type="button" class="topbar__avatar" style="${avatarStyle}" aria-label="User menu: ${userName}">
          <span class="topbar__avatar-initials">${savedImg ? '' : initials}</span>
        </button>
      </div>
    </header>`;
}

/**
 * Attaches basic event listeners for search and top bar actions.
 * Call after renderTopbar().
 * @param {HTMLElement} container - The topbar root element
 */
export function initTopbarEvents(container) {
  const searchInput = container.querySelector('#global-search');
  const quickAddBtn = container.querySelector('.topbar__quick-add');
  const notifBtn = container.querySelector('.topbar__icon-btn--notifications');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      console.log('[Search]', e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        console.log('[Search] Cmd+K shortcut activated');
      }
    });
  }

  if (quickAddBtn) {
    quickAddBtn.addEventListener('click', () => {
      console.log('[Quick Add] Button clicked');
    });
  }

  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      console.log('[Notifications] Bell clicked');
    });
  }

  // Global Cmd+K listener when focus is elsewhere
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput?.focus();
    }
  });
}
