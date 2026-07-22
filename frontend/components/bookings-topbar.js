/**
 * StockNest Topbar Component
 * Injects the global search bar, notifications, quick add, and user avatar
 */

(function () {
  const topbarHTML = `
    <header class="topbar">
      <div class="topbar__search">
        <span class="topbar__search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          type="search"
          id="global-search"
          class="topbar__search-input"
          placeholder="Search rooms, assets, or bookings (Cmd+K)"
          aria-label="Global search"
        />
      </div>

      <div class="topbar__actions">
        <button type="button" class="topbar__notification" aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span class="topbar__notification-dot" aria-hidden="true"></span>
        </button>

        <button type="button" class="topbar__quick-add">
          <span aria-hidden="true">+</span> Quick Add
        </button>

        <div class="topbar__avatar" title="Neha Yadav" aria-label="User avatar NY">NY</div>
      </div>
    </header>
  `;

  const root = document.getElementById('topbar-root');
  if (root) {
    root.innerHTML = topbarHTML;
  }
})();
