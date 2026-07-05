/* ==========================================================================
   sn_common.js
   Shared, page-agnostic StockNest interactions:
     - Profile dropdown (avatar menu)
     - Quick Add / Report Generator modal
     - Global search overlay
     - A tiny in-memory mock data store other scripts can read/react to
   Depends on: sn_toast_module.js (must load first)
   ========================================================================== */

window.SN = (function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Mock data store — shared "backend" for the prototype.
   * Other page scripts (dashboard/settings) read this and can subscribe
   * to the "sn:data-changed" event to re-render when it updates.
   * ------------------------------------------------------------------ */
  const store = {
    metrics: {
      totalValue: 1240000,
      utilization: 87,
      slaCompliance: 94.2,
      inMaintenance: 142,
      totalAssets: 4200,
    },
    entries: [], // mock assets / rooms / tickets added via Quick Add
  };

  function emitChange(detail) {
    document.dispatchEvent(new CustomEvent("sn:data-changed", { detail }));
  }

  const SAMPLE_INDEX = [
    { title: "Dell Latitude 7440 — Laptop", meta: "Asset · Floor 3, Room 302", icon: "asset" },
    { title: "Conference Room B", meta: "Room · Building A, Level 2", icon: "room" },
    { title: "HVAC unit failure — Ticket #4021", meta: "Maintenance · Open", icon: "ticket" },
    { title: "Herman Miller Aeron Chair", meta: "Asset · Storage Bay 4", icon: "asset" },
    { title: "Downtown Distribution Center", meta: "Location · 12 rooms tracked", icon: "room" },
    { title: "Projector bulb replacement — Ticket #3988", meta: "Maintenance · In progress", icon: "ticket" },
    { title: "Q2 Utilization Report", meta: "Report · Generated Jun 30", icon: "asset" },
    { title: "Standing Desk (Electric)", meta: "Asset · 3rd Floor Open Plan", icon: "asset" },
  ];

  /* ------------------------------------------------------------------ *
   * Generic dropdown helper: wires a trigger button to a floating panel,
   * toggles on click, and closes on outside click / Escape.
   * ------------------------------------------------------------------ */
  function wireDropdown(triggerEl, panelEl, { onOpen } = {}) {
    if (!triggerEl || !panelEl) return;

    function close() {
      panelEl.classList.remove("sn-dropdown--open");
      triggerEl.setAttribute("aria-expanded", "false");
    }
    function open() {
      closeAllDropdowns();
      panelEl.classList.add("sn-dropdown--open");
      triggerEl.setAttribute("aria-expanded", "true");
      if (onOpen) onOpen();
    }
    triggerEl.setAttribute("aria-haspopup", "true");
    triggerEl.setAttribute("aria-expanded", "false");

    triggerEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = panelEl.classList.contains("sn-dropdown--open");
      isOpen ? close() : open();
    });
    panelEl.addEventListener("click", (e) => e.stopPropagation());

    registerDropdown(close);
    return { open, close };
  }

  const activeClosers = [];
  function registerDropdown(closeFn) {
    activeClosers.push(closeFn);
  }
  function closeAllDropdowns() {
    activeClosers.forEach((fn) => fn());
  }
  document.addEventListener("click", closeAllDropdowns);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllDropdowns();
  });

  /* ------------------------------------------------------------------ *
   * Profile dropdown
   * ------------------------------------------------------------------ */
  function initProfileDropdown() {
    const trigger = document.getElementById("snAvatarBtn");
    if (!trigger) return;

    const wrap = document.createElement("div");
    wrap.className = "sn-dropdown-anchor";
    trigger.parentNode.insertBefore(wrap, trigger);
    wrap.appendChild(trigger);

    const panel = document.createElement("div");
    panel.className = "sn-dropdown";
    panel.id = "snProfileDropdown";
    panel.innerHTML = `
      <div class="sn-dropdown__user">
        <img src="https://i.pravatar.cc/64?img=13" alt="" />
        <div>
          <strong>Jordan Reyes</strong>
          <span>Workspace Admin</span>
        </div>
      </div>
      <button class="sn-dropdown__item" type="button" data-action="profile">
        <span class="sn-icon sn-icon--user" aria-hidden="true"></span>My Profile
      </button>
      <button class="sn-dropdown__item" type="button" data-action="account-settings">
        <span class="sn-icon sn-icon--settings-sm" aria-hidden="true"></span>Account Settings
      </button>
      <div class="sn-dropdown__divider"></div>
      <button class="sn-dropdown__item sn-dropdown__item--danger" type="button" data-action="logout">
        <span class="sn-icon sn-icon--logout" aria-hidden="true"></span>Logout
      </button>
    `;
    wrap.appendChild(panel);

    wireDropdown(trigger, panel);

    panel.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      panel.classList.remove("sn-dropdown--open");

      if (btn.dataset.action === "profile") {
        snToast("Viewing your profile details.", { title: "My Profile", type: "info" });
      } else if (btn.dataset.action === "account-settings") {
        snToast("Opening account preferences.", { title: "Account Settings", type: "info" });
        const settingsLink = document.getElementById("snNavSettings");
        if (settingsLink) window.location.href = settingsLink.href;
      } else if (btn.dataset.action === "logout") {
        snToast("You have been signed out of StockNest.", { title: "Logged out", type: "success" });
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Quick Add / Report Generator modal
   * ------------------------------------------------------------------ */
  function initQuickAddModal() {
    const trigger = document.getElementById("snQuickAddBtn");
    if (!trigger) return;

    const overlay = document.createElement("div");
    overlay.className = "sn-modal-overlay";
    overlay.id = "snQuickAddOverlay";
    overlay.innerHTML = `
      <div class="sn-modal" role="dialog" aria-modal="true" aria-labelledby="snQuickAddTitle">
        <div class="sn-modal__head">
          <div>
            <h2 id="snQuickAddTitle">Quick Add</h2>
            <p>Add a new asset, room, or maintenance ticket — or generate a report.</p>
          </div>
          <button class="sn-modal__close" id="snQuickAddClose" type="button" aria-label="Close">
            <span class="sn-icon sn-icon--close" aria-hidden="true"></span>
          </button>
        </div>
        <div class="sn-modal__body">
          <div class="sn-type-choice" id="snQuickAddTypeChoice">
            <button class="sn-type-choice__opt is-active" type="button" data-type="asset">
              <span class="sn-icon sn-icon--asset" aria-hidden="true"></span><span>Asset</span>
            </button>
            <button class="sn-type-choice__opt" type="button" data-type="room">
              <span class="sn-icon sn-icon--room" aria-hidden="true"></span><span>Room</span>
            </button>
            <button class="sn-type-choice__opt" type="button" data-type="ticket">
              <span class="sn-icon sn-icon--ticket" aria-hidden="true"></span><span>Maint. Ticket</span>
            </button>
          </div>

          <form id="snQuickAddForm">
            <div class="sn-field" id="snFieldName">
              <label for="snQaName">Name</label>
              <input type="text" id="snQaName" placeholder="e.g. Dell Latitude 7440" required />
            </div>

            <div class="sn-field-row">
              <div class="sn-field" id="snFieldTypeSelect">
                <label for="snQaTypeSelect">Asset Type</label>
                <select id="snQaTypeSelect">
                  <option>Electronics</option>
                  <option>Furniture</option>
                  <option>Vehicle</option>
                  <option>Facility Equipment</option>
                  <option>Consumable</option>
                </select>
              </div>
              <div class="sn-field" id="snFieldQuantity">
                <label for="snQaQuantity">Quantity</label>
                <input type="number" id="snQaQuantity" min="1" value="1" />
              </div>
            </div>

            <div class="sn-field-row">
              <div class="sn-field">
                <label for="snQaLocation">Location</label>
                <select id="snQaLocation">
                  <option>Downtown HQ — Floor 3</option>
                  <option>Downtown HQ — Floor 4</option>
                  <option>Warehouse B</option>
                  <option>Remote Office — Austin</option>
                </select>
              </div>
              <div class="sn-field">
                <label for="snQaStatus">Status</label>
                <select id="snQaStatus">
                  <option>Available</option>
                  <option>In Use</option>
                  <option>In Maintenance</option>
                  <option>Reserved</option>
                </select>
              </div>
            </div>

            <div class="sn-field">
              <label for="snQaNotes">Notes (optional)</label>
              <textarea id="snQaNotes" rows="2" placeholder="Anything else worth recording..."></textarea>
            </div>

            <div class="sn-field">
              <label><input type="checkbox" id="snQaGenerateReport" style="width:auto;margin-right:6px;" />Also generate a summary report for this entry</label>
            </div>

            <div class="sn-modal__foot">
              <button type="button" class="sn-btn sn-btn--ghost" id="snQuickAddCancel">Cancel</button>
              <button type="submit" class="sn-btn sn-btn--primary" id="snQuickAddSubmit">
                <span class="sn-icon sn-icon--plus" aria-hidden="true"></span>
                <span id="snQuickAddSubmitLabel">Add Asset</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const typeChoice = overlay.querySelector("#snQuickAddTypeChoice");
    const nameLabel = overlay.querySelector('label[for="snQaName"]');
    const namePlaceholderByType = {
      asset: "e.g. Dell Latitude 7440",
      room: "e.g. Conference Room B",
      ticket: "e.g. HVAC unit not cooling",
    };
    const typeSelectField = overlay.querySelector("#snFieldTypeSelect");
    const quantityField = overlay.querySelector("#snFieldQuantity");
    const submitLabel = overlay.querySelector("#snQuickAddSubmitLabel");
    let currentType = "asset";

    function applyTypeUI(type) {
      currentType = type;
      overlay.querySelectorAll(".sn-type-choice__opt").forEach((opt) => {
        opt.classList.toggle("is-active", opt.dataset.type === type);
      });
      overlay.querySelector("#snQaName").placeholder = namePlaceholderByType[type];
      typeSelectField.style.display = type === "asset" ? "block" : "none";
      quantityField.style.display = type === "asset" ? "block" : "none";
      submitLabel.textContent = type === "asset" ? "Add Asset" : type === "room" ? "Add Room" : "Create Ticket";
      nameLabel.textContent = type === "ticket" ? "Issue Summary" : "Name";
    }

    typeChoice.addEventListener("click", (e) => {
      const opt = e.target.closest(".sn-type-choice__opt");
      if (!opt) return;
      applyTypeUI(opt.dataset.type);
    });

    function openModal() {
      overlay.classList.add("sn-modal-overlay--open");
      document.body.style.overflow = "hidden";
      setTimeout(() => overlay.querySelector("#snQaName").focus(), 50);
    }
    function closeModal() {
      overlay.classList.remove("sn-modal-overlay--open");
      document.body.style.overflow = "";
      overlay.querySelector("#snQuickAddForm").reset();
      applyTypeUI("asset");
    }

    trigger.addEventListener("click", openModal);
    overlay.querySelector("#snQuickAddClose").addEventListener("click", closeModal);
    overlay.querySelector("#snQuickAddCancel").addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("sn-modal-overlay--open")) closeModal();
    });

    overlay.querySelector("#snQuickAddForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = overlay.querySelector("#snQaName").value.trim();
      const quantity = Number(overlay.querySelector("#snQaQuantity").value) || 1;
      const location = overlay.querySelector("#snQaLocation").value;
      const status = overlay.querySelector("#snQaStatus").value;
      const wantsReport = overlay.querySelector("#snQaGenerateReport").checked;

      const entry = { type: currentType, name, quantity, location, status, createdAt: new Date() };
      store.entries.unshift(entry);

      // Nudge the mock metrics so the dashboard visibly reacts.
      if (currentType === "asset") {
        store.metrics.totalAssets += quantity;
        store.metrics.totalValue += quantity * 850; // rough mock unit value
        if (status === "In Maintenance") store.metrics.inMaintenance += 1;
      } else if (currentType === "ticket") {
        store.metrics.inMaintenance += 1;
      }
      emitChange({ reason: "quick-add", entry });

      closeModal();

      const successMessage =
        currentType === "asset"
          ? `"${name}" was added to the asset registry.`
          : currentType === "room"
          ? `"${name}" was added to your rooms.`
          : `Ticket "${name}" was created and queued for maintenance.`;

      snToast(successMessage, { title: "Added successfully", type: "success" });

      if (wantsReport) {
        setTimeout(() => {
          snToast(`A summary report for "${name}" has been generated.`, { title: "Report ready", type: "info" });
        }, 900);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Global search overlay
   * ------------------------------------------------------------------ */
  function initGlobalSearch() {
    const input = document.getElementById("snSearchInput");
    if (!input) return;
    const searchWrap = input.closest(".sn-search");
    searchWrap.style.position = "relative";

    const overlay = document.createElement("div");
    overlay.className = "sn-search-overlay";
    overlay.id = "snSearchOverlay";
    searchWrap.appendChild(overlay);

    function render(query) {
      const q = query.trim().toLowerCase();
      if (!q) {
        overlay.innerHTML = `<div class="sn-search-overlay__empty">Start typing to search assets, rooms, tickets and reports.</div>`;
        return;
      }
      const results = SAMPLE_INDEX.filter((item) => item.title.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q));
      if (!results.length) {
        overlay.innerHTML = `<div class="sn-search-overlay__empty">No matches for "${escapeHtml(query)}".</div>`;
        return;
      }
      overlay.innerHTML =
        `<div class="sn-search-overlay__meta">${results.length} result${results.length > 1 ? "s" : ""} for "${escapeHtml(query)}"</div>` +
        results
          .map(
            (r) => `
        <div class="sn-search-result" data-title="${escapeHtml(r.title)}">
          <span class="sn-search-result__icon"><span class="sn-icon sn-icon--${r.icon}" aria-hidden="true"></span></span>
          <span>
            <span class="sn-search-result__title">${escapeHtml(r.title)}</span><br/>
            <span class="sn-search-result__meta">${escapeHtml(r.meta)}</span>
          </span>
        </div>`
          )
          .join("");
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function open() {
      closeAllDropdowns();
      overlay.classList.add("sn-search-overlay--open");
      render(input.value);
    }
    function close() {
      overlay.classList.remove("sn-search-overlay--open");
    }
    registerDropdown(close);

    input.addEventListener("focus", open);
    input.addEventListener("click", (e) => {
      e.stopPropagation();
      open();
    });
    input.addEventListener("input", () => {
      render(input.value);
      overlay.classList.add("sn-search-overlay--open");
    });
    overlay.addEventListener("click", (e) => e.stopPropagation());
    overlay.addEventListener("click", (e) => {
      const result = e.target.closest(".sn-search-result");
      if (!result) return;
      close();
      snToast(`Opening "${result.dataset.title}"...`, { title: "Search", type: "info" });
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (!input.value.trim()) return;
        close();
        snToast(`Showing results for "${input.value.trim()}".`, { title: "Search", type: "info" });
      }
    });

    // Cmd/Ctrl+K focuses the search box from anywhere.
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.focus();
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Sidebar collapse toggle (mobile-friendly)
   * ------------------------------------------------------------------ */
  function initSidebarToggle() {
    const toggle = document.getElementById("snSidebarToggle");
    const sidebar = document.getElementById("snSidebar");
    if (!toggle || !sidebar) return;
    toggle.addEventListener("click", () => sidebar.classList.toggle("sn-sidebar--open"));
  }

  function initNotifications() {
    const btn = document.getElementById("snNotifBtn");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      snToast("You're all caught up — no new alerts.", { title: "Notifications", type: "info" });
    });
  }

  function initHelpCenter() {
    document.querySelectorAll(".sn-help-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        snToast("Opening the Help Center in a new tab (simulated).", { title: "Help Center", type: "info" });
      });
    });
  }

  function initSwitchLocation() {
    document.querySelectorAll(".sn-switch-location").forEach((btn) => {
      btn.addEventListener("click", () => {
        snToast("Location switching is available from the workspace picker.", { title: "Switch Location", type: "info" });
      });
    });
  }

  function boot() {
    initProfileDropdown();
    initQuickAddModal();
    initGlobalSearch();
    initSidebarToggle();
    initNotifications();
    initHelpCenter();
    initSwitchLocation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  return { store, wireDropdown, registerDropdown, closeAllDropdowns, emitChange };
})();
