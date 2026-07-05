/* =========================================================
   StockNest — Toast Notification Module (shared across pages)
   Exposes a single global: SNToast.show({ type, title, message, duration })
   ========================================================= */
(function () {
  const ICONS = {
    success: 'M5 12l5 5L20 7',
    info: 'M12 11v5.5M12 7.5h.01',
    warn: 'M12 9v4m0 4h.01M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    error: 'M6 6l12 12M18 6 6 18'
  };

  function ensureStack() {
    let stack = document.getElementById('snToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'snToastStack';
      stack.className = 'sn-toast-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    return stack;
  }

  function show({ type = 'info', title = '', message = '', duration = 4200 } = {}) {
    const stack = ensureStack();
    const toast = document.createElement('div');
    toast.className = `sn-toast sn-toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span class="sn-toast__icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="${ICONS[type] || ICONS.info}"/>
        </svg>
      </span>
      <span class="sn-toast__body">
        ${title ? `<strong>${title}</strong>` : ''}
        ${message ? `<span>${message}</span>` : ''}
      </span>
      <button class="sn-toast__close" type="button" aria-label="Dismiss notification">
        <span class="sn-icon sn-icon--close"></span>
      </button>
    `;
    stack.appendChild(toast);

    const remove = () => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 200);
    };
    toast.querySelector('.sn-toast__close').addEventListener('click', remove);
    if (duration > 0) setTimeout(remove, duration);
    return toast;
  }

  /* Global convenience function used throughout every page:
     snToast(message, { title, type, duration }) */
  function snToast(message, opts = {}) {
    return show({ message, ...opts });
  }

  window.SNToast = { show, snToast };
  window.snToast = snToast;
})();
