// StockNest Global Avatar Sync & Nav Interceptor
(function () {
  function syncAvatarFromStorage() {
    const savedBg = localStorage.getItem('sn_user_avatar_bg');
    const savedImg = localStorage.getItem('sn_user_avatar_img');
    
    // Fetch user name and compute initials
    let initials = 'U';
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.name) {
          const parts = user.name.split(' ');
          initials = `${parts[0] ? parts[0][0] : ''}${parts[1] ? parts[1][0] : ''}`.toUpperCase() || 'U';
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    // Fallback to explicit saved text if set
    const savedText = localStorage.getItem('sn_user_avatar_text');
    if (savedText) initials = savedText;

    document.querySelectorAll('.topbar__avatar, #profileBtn, #mainHeaderAvatar, .user-avatar-badge').forEach(el => {
      if (savedImg) {
        el.style.backgroundImage = `url(${savedImg})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        const initialsSpan = el.querySelector('.topbar__avatar-initials');
        if (initialsSpan) initialsSpan.textContent = '';
        else el.textContent = '';
      } else {
        el.style.backgroundImage = '';
        if (savedBg) {
          el.style.backgroundColor = savedBg;
        }
        const initialsSpan = el.querySelector('.topbar__avatar-initials');
        if (initialsSpan) initialsSpan.textContent = initials;
        else el.textContent = initials;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncAvatarFromStorage();

    document.addEventListener('click', (e) => {
      // Sidebar Settings OR Dropdown Settings click
      const settingsTarget = e.target.closest('[data-module="settings"], [data-action="settings"], #btnSidebarSettings, button[onclick*="stocknest-settings"]');
      if (settingsTarget) {
        e.stopImmediatePropagation();
        e.preventDefault();
        window.location.href = 'stocknest-settings-view.html';
        return;
      }

      // Topbar Avatar click OR Profile link click
      const profileTarget = e.target.closest('[data-action="profile"], #profileBtn, #mainHeaderAvatar, .topbar__avatar');
      if (profileTarget) {
        e.stopImmediatePropagation();
        e.preventDefault();
        window.location.href = 'profile.html';
        return;
      }
    }, true);

    // Global Mobile Sidebar Toggle
    const sidebarToggleBtn = document.getElementById('sidebarToggle') || document.querySelector('.topbar__menu-btn');
    const sidebarRoot = document.getElementById('sidebar-root');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggleBtn && sidebarRoot) {
      sidebarToggleBtn.addEventListener('click', () => {
        sidebarRoot.classList.add('is-open');
        if (sidebarOverlay) sidebarOverlay.classList.add('is-visible');
      });
    }

    if (sidebarOverlay && sidebarRoot) {
      sidebarOverlay.addEventListener('click', () => {
        sidebarRoot.classList.remove('is-open');
        sidebarOverlay.classList.remove('is-visible');
      });
    }
  });
})();
