// StockNest Global Avatar Sync & Nav Interceptor
(function () {
  function syncAvatarFromStorage() {
    const savedBg = localStorage.getItem('sn_user_avatar_bg');
    const savedImg = localStorage.getItem('sn_user_avatar_img');
    const savedText = localStorage.getItem('sn_user_avatar_text') || 'JD';

    document.querySelectorAll('.topbar__avatar, #profileBtn, #mainHeaderAvatar, .user-avatar-badge').forEach(el => {
      if (savedImg) {
        el.style.backgroundImage = `url(${savedImg})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
      } else if (savedBg) {
        el.style.backgroundImage = '';
        el.style.backgroundColor = savedBg;
        el.textContent = savedText;
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
  });
})();
