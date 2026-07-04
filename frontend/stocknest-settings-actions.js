/* ==========================================================================
   sn_settings_script.js
   Settings page logic: tabs, user table, SLA rules, audit log,
   and fully mocked System Config / Backup & Security panels.
   Depends on: sn_toast_module.js, sn_common.js (both loaded first)
   ========================================================================== */

(function () {
  "use strict";

  const USERS = [
    { name: "Jordan Reyes", email: "jordan.reyes@stocknest.io", role: "Workspace Admin", status: "active", lastActive: "Just now", avatar: 13 },
    { name: "Priya Nair", email: "priya.nair@stocknest.io", role: "Facilities Manager", status: "active", lastActive: "2h ago", avatar: 47 },
    { name: "Marcus Cole", email: "marcus.cole@stocknest.io", role: "Technician", status: "active", lastActive: "1d ago", avatar: 22 },
    { name: "Elena Ruiz", email: "elena.ruiz@stocknest.io", role: "Front Desk", status: "invited", lastActive: "Never", avatar: 5 },
    { name: "Tom Whitfield", email: "tom.whitfield@stocknest.io", role: "Technician", status: "suspended", lastActive: "14d ago", avatar: 33 },
  ];
  const PAGE_SIZE = 3;
  let currentPage = 0;

  const AUDIT_LOG = [
    { text: "Priya Nair updated SLA rule \u201cCritical Asset Repair Time\u201d to 24 hours.", time: "12 minutes ago" },
    { text: "New user Elena Ruiz was invited as Front Desk.", time: "1 hour ago" },
    { text: "Marcus Cole resolved maintenance ticket #3991.", time: "3 hours ago" },
    { text: "Automated backup completed successfully.", time: "6 hours ago" },
    { text: "Tom Whitfield's account was suspended by admin.", time: "1 day ago" },
  ];

  /* ------------------------------------------------------------------ *
   * Sub-tab switching
   * ------------------------------------------------------------------ */
  function initTabs() {
    const tabs = document.querySelectorAll("#snSettingsTabs .sn-tab");
    const panels = {
      "user-management": document.getElementById("snPanelUserManagement"),
      "organization": document.getElementById("snPanelOrganization"),
      "system-config": document.getElementById("snPanelSystemConfig"),
      "backup-security": document.getElementById("snPanelBackupSecurity"),
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const key = tab.dataset.tab;
        if (!panels[key]) return;

        tabs.forEach((t) => t.classList.toggle("sn-tab--active", t === tab));
        Object.entries(panels).forEach(([panelKey, panelEl]) => {
          if (!panelEl) return;
          const show = panelKey === key;
          // Fully hide every other panel so content never leaks between tabs.
          panelEl.hidden = !show;
          if (show && panelEl.dataset.rendered !== "true") {
            renderPanel(key, panelEl);
            panelEl.dataset.rendered = "true";
          }
        });
      });
    });
  }

  function renderPanel(key, panelEl) {
    if (key === "organization") panelEl.innerHTML = organizationMarkup();
    if (key === "system-config") panelEl.innerHTML = systemConfigMarkup();
    if (key === "backup-security") panelEl.innerHTML = backupSecurityMarkup();
    wireConfigPanel(panelEl, key);
  }

  function organizationMarkup() {
    return `
      <div class="sn-settings-col">
        <div class="sn-config-card">
          <h2>Company Profile</h2>
          <p class="sn-config-card__desc">Basic information shown on invoices and reports.</p>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Organization name</strong><span>Legal or trading name.</span></div>
            <div class="sn-config-row__control"><input type="text" value="StockNest, Inc." /></div>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Primary contact</strong><span>Billing and account correspondence.</span></div>
            <div class="sn-config-row__control"><input type="text" value="ops@stocknest.io" /></div>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Address</strong><span>Used on invoices and shipping labels.</span></div>
            <div class="sn-config-row__control"><input type="text" value="500 Market St, Suite 210, San Francisco, CA" /></div>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Fiscal year start</strong><span>Used for annual reporting periods.</span></div>
            <div class="sn-config-row__control"><select><option>January</option><option>April</option><option>July</option><option>October</option></select></div>
          </div>
          <div class="sn-config-actions">
            <button class="sn-btn sn-btn--primary sn-btn--sm" type="button" data-action="save-org">Save Changes</button>
          </div>
        </div>

        <div class="sn-config-card">
          <h2>Company Logo</h2>
          <p class="sn-config-card__desc">Shown in the sidebar and on generated reports.</p>
          <div class="sn-logo-uploader">
            <span class="sn-logo-uploader__preview" id="snLogoPreview">SN</span>
            <div class="sn-logo-uploader__actions">
              <button class="sn-btn sn-btn--outline sn-btn--sm" type="button" data-action="upload-logo">
                <span class="sn-icon sn-icon--asset" aria-hidden="true"></span>Upload new logo
              </button>
              <span class="sn-logo-uploader__hint">PNG or SVG, at least 256&times;256px.</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sn-settings-col">
        <div class="sn-config-card">
          <h2>Plan &amp; Billing</h2>
          <p class="sn-config-card__desc">Current subscription for this workspace.</p>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Plan</strong><span>Business — 12 locations included</span></div>
            <span class="sn-badge sn-badge--active">Active</span>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Next invoice</strong><span>Aug 1, 2026 &middot; $890.00</span></div>
          </div>
          <div class="sn-config-actions">
            <button class="sn-btn sn-btn--outline sn-btn--sm" type="button" data-action="manage-billing">Manage Billing</button>
          </div>
        </div>
      </div>
    `;
  }

  function systemConfigMarkup() {
    return `
      <div class="sn-settings-col" style="grid-column: 1 / -1;">
        <div class="sn-config-card">
          <h2>General</h2>
          <p class="sn-config-card__desc">Workspace-wide preferences that affect how StockNest looks and behaves.</p>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Dark mode</strong><span>Switch the interface to a low-light theme.</span></div>
            <div class="sn-config-row__control">
              <label class="sn-toggle"><input type="checkbox" data-toggle="dark-mode" /><span class="sn-toggle__track"></span></label>
            </div>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Default landing page</strong><span>Where users land after signing in.</span></div>
            <div class="sn-config-row__control">
              <select><option>Analytics &amp; Reporting</option><option>Dashboard</option><option>Asset Registry</option></select>
            </div>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Timezone</strong><span>Used for reports, SLAs, and audit timestamps.</span></div>
            <div class="sn-config-row__control">
              <select><option>(GMT-05:00) Eastern Time</option><option>(GMT+00:00) UTC</option><option>(GMT+05:30) India Standard Time</option></select>
            </div>
          </div>
        </div>

        <div class="sn-config-card">
          <h2>Email &amp; SMTP</h2>
          <p class="sn-config-card__desc">Configure the outbound mail server used for alerts and reports.</p>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>SMTP host</strong><span>e.g. smtp.stocknest.io</span></div>
            <div class="sn-config-row__control"><input type="text" value="smtp.stocknest.io" /></div>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Port</strong><span>Usually 587 (TLS) or 465 (SSL).</span></div>
            <div class="sn-config-row__control"><input type="text" value="587" style="max-width:100px;" /></div>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Sender address</strong><span>Appears as the "From" on outbound mail.</span></div>
            <div class="sn-config-row__control"><input type="text" value="alerts@stocknest.io" /></div>
          </div>
          <div class="sn-config-actions">
            <button class="sn-btn sn-btn--outline sn-btn--sm" type="button" data-action="test-smtp">
              <span class="sn-icon sn-icon--mail" aria-hidden="true"></span>Send test email
            </button>
          </div>
        </div>

        <div class="sn-config-card">
          <h2>API Keys</h2>
          <p class="sn-config-card__desc">Used by integrations to read and write StockNest data.</p>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Production key</strong><span>sk_live_••••••••••••4f2a</span></div>
            <div class="sn-config-row__control" style="display:flex;gap:8px;">
              <button class="sn-btn sn-btn--outline sn-btn--sm" type="button" data-action="copy-key">
                <span class="sn-icon sn-icon--key" aria-hidden="true"></span>Copy
              </button>
              <button class="sn-btn sn-btn--ghost sn-btn--sm" type="button" data-action="regen-key">Regenerate</button>
            </div>
          </div>
          <div class="sn-config-actions">
            <button class="sn-btn sn-btn--primary sn-btn--sm" type="button" data-action="save-config">Save Changes</button>
          </div>
        </div>
      </div>
    `;
  }

  function backupSecurityMarkup() {
    return `
      <div class="sn-settings-col" style="grid-column: 1 / -1;">
        <div class="sn-config-card">
          <h2>Encryption</h2>
          <p class="sn-config-card__desc">Protect data at rest and in transit across the workspace.</p>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Encrypt data at rest</strong><span>AES-256 encryption for stored records.</span></div>
            <div class="sn-config-row__control">
              <label class="sn-toggle"><input type="checkbox" checked data-toggle="encrypt-rest" /><span class="sn-toggle__track"></span></label>
            </div>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Force TLS 1.2+</strong><span>Reject connections using older TLS versions.</span></div>
            <div class="sn-config-row__control">
              <label class="sn-toggle"><input type="checkbox" checked data-toggle="force-tls" /><span class="sn-toggle__track"></span></label>
            </div>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Require 2FA for all users</strong><span>Enforce two-factor authentication workspace-wide.</span></div>
            <div class="sn-config-row__control">
              <label class="sn-toggle"><input type="checkbox" data-toggle="force-2fa" /><span class="sn-toggle__track"></span></label>
            </div>
          </div>
        </div>

        <div class="sn-config-card">
          <h2>Cloud Backup</h2>
          <p class="sn-config-card__desc">Automatic backups of your asset registry and settings.</p>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Automatic backups</strong><span>Back up workspace data on a schedule.</span></div>
            <div class="sn-config-row__control">
              <label class="sn-toggle"><input type="checkbox" checked data-toggle="auto-backup" /><span class="sn-toggle__track"></span></label>
            </div>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Backup frequency</strong><span>How often a new backup snapshot is taken.</span></div>
            <div class="sn-config-row__control">
              <select><option>Every 6 hours</option><option selected>Daily</option><option>Weekly</option></select>
            </div>
          </div>
          <div class="sn-config-row">
            <div class="sn-config-row__label"><strong>Retention period</strong><span>How long backup snapshots are kept.</span></div>
            <div class="sn-config-row__control">
              <select><option>7 days</option><option selected>30 days</option><option>90 days</option><option>1 year</option></select>
            </div>
          </div>
          <div class="sn-config-actions">
            <button class="sn-btn sn-btn--outline sn-btn--sm" type="button" data-action="backup-now">
              <span class="sn-icon sn-icon--cloud" aria-hidden="true"></span>Back up now
            </button>
            <button class="sn-btn sn-btn--primary sn-btn--sm" type="button" data-action="save-config">Save Changes</button>
          </div>
        </div>

        <div class="sn-config-card">
          <h2>Recent Backups</h2>
          <div class="sn-config-row"><div class="sn-config-row__label"><strong>Jul 4, 2026 — 03:00 AM</strong><span>2.1 GB · Completed</span></div><span class="sn-badge sn-badge--active">Success</span></div>
          <div class="sn-config-row"><div class="sn-config-row__label"><strong>Jul 3, 2026 — 03:00 AM</strong><span>2.1 GB · Completed</span></div><span class="sn-badge sn-badge--active">Success</span></div>
          <div class="sn-config-row"><div class="sn-config-row__label"><strong>Jul 2, 2026 — 03:00 AM</strong><span>2.0 GB · Completed</span></div><span class="sn-badge sn-badge--active">Success</span></div>
        </div>
      </div>
    `;
  }

  function wireConfigPanel(panelEl, key) {
    panelEl.querySelectorAll("[data-toggle]").forEach((input) => {
      input.addEventListener("change", () => {
        const label = input.closest(".sn-config-row").querySelector("strong").textContent;
        snToast(`${label} ${input.checked ? "enabled" : "disabled"} (simulated — no backend connected).`, {
          title: "Setting updated",
          type: "success",
        });
      });
    });

    panelEl.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;

        if (action === "upload-logo") {
          snToast("Feature simulated: connecting to backend infrastructure required for logo storage.", {
            title: "Upload logo",
            type: "info",
          });
          return;
        }
        if (action === "manage-billing") {
          snToast("Feature simulated: connecting to backend infrastructure required for the billing portal.", {
            title: "Manage Billing",
            type: "info",
          });
          return;
        }

        const messages = {
          "save-org": ["Organization saved", "Feature simulated: connecting to backend infrastructure required to persist this change."],
          "test-smtp": ["Test email sent", "Feature simulated: connecting to backend infrastructure required for live email delivery."],
          "copy-key": ["Copied", "API key copied to clipboard."],
          "regen-key": ["Key regenerated", "Feature simulated: connecting to backend infrastructure required to revoke and reissue live keys."],
          "save-config": ["Settings saved", "Feature simulated: connecting to backend infrastructure required to persist this change."],
          "backup-now": ["Backup started", "Feature simulated: connecting to backend infrastructure required for live backups."],
        };
        const [title, msg] = messages[action] || ["Done", "Action completed."];
        snToast(msg, { title, type: "success" });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * User Management table
   * ------------------------------------------------------------------ */
  function badgeClass(status) {
    return { active: "sn-badge--active", invited: "sn-badge--invited", suspended: "sn-badge--suspended" }[status];
  }

  function renderUserTable() {
    const tbody = document.getElementById("snUserTableBody");
    if (!tbody) return;
    const start = currentPage * PAGE_SIZE;
    const rows = USERS.slice(start, start + PAGE_SIZE);

    tbody.innerHTML = rows
      .map(
        (u, i) => `
      <tr data-index="${start + i}">
        <td>
          <div class="sn-user-cell">
            <img src="https://i.pravatar.cc/64?img=${u.avatar}" alt="" />
            <div><strong>${u.name}</strong><span>${u.email}</span></div>
          </div>
        </td>
        <td>${u.role}</td>
        <td><span class="sn-badge ${badgeClass(u.status)}">${u.status[0].toUpperCase() + u.status.slice(1)}</span></td>
        <td>${u.lastActive}</td>
        <td class="sn-row-actions">
          <div class="sn-row-actions-wrap">
            <button class="sn-icon-btn sn-icon-btn--tiny" data-action="edit-user" aria-label="Edit ${u.name}"><span class="sn-icon sn-icon--edit" aria-hidden="true"></span></button>
            <button class="sn-icon-btn sn-icon-btn--tiny" data-action="remove-user" aria-label="Remove ${u.name}"><span class="sn-icon sn-icon--trash" aria-hidden="true"></span></button>
          </div>
        </td>
      </tr>`
      )
      .join("");

    const foot = document.getElementById("snTableFootLabel");
    if (foot) foot.textContent = `Showing ${start + 1} to ${Math.min(start + PAGE_SIZE, USERS.length)} of ${USERS.length} users`;

    document.getElementById("snPagerPrev").disabled = currentPage === 0;
    document.getElementById("snPagerNext").disabled = start + PAGE_SIZE >= USERS.length;
  }

  function initUserTable() {
    renderUserTable();

    document.getElementById("snPagerPrev")?.addEventListener("click", () => {
      if (currentPage > 0) {
        currentPage -= 1;
        renderUserTable();
      }
    });
    document.getElementById("snPagerNext")?.addEventListener("click", () => {
      if ((currentPage + 1) * PAGE_SIZE < USERS.length) {
        currentPage += 1;
        renderUserTable();
      }
    });

    document.getElementById("snUserTableBody")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const row = btn.closest("tr");
      const user = USERS[Number(row.dataset.index)];
      if (btn.dataset.action === "edit-user") {
        snToast(`Editing details for ${user.name}.`, { title: "Edit user", type: "info" });
      } else if (btn.dataset.action === "remove-user") {
        snToast(`${user.name} has been removed from the workspace.`, { title: "User removed", type: "success" });
        USERS.splice(Number(row.dataset.index), 1);
        if (currentPage > 0 && currentPage * PAGE_SIZE >= USERS.length) currentPage -= 1;
        renderUserTable();
      }
    });

    document.getElementById("snInviteUserBtn")?.addEventListener("click", () => {
      USERS.push({ name: "New Teammate", email: "pending@stocknest.io", role: "Front Desk", status: "invited", lastActive: "Never", avatar: 60 });
      currentPage = Math.floor((USERS.length - 1) / PAGE_SIZE);
      renderUserTable();
      snToast("Feature simulated: connecting to backend infrastructure required to send a live invite email.", {
        title: "User invited",
        type: "success",
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * SLA sliders
   * ------------------------------------------------------------------ */
  function initSlaRules() {
    const repairRange = document.getElementById("snRepairTimeRange");
    const repairBadge = document.getElementById("snRepairTimeBadge");
    const restockRange = document.getElementById("snRestockRange");
    const restockBadge = document.getElementById("snRestockBadge");

    repairRange?.addEventListener("input", () => (repairBadge.textContent = `${repairRange.value} Hour${repairRange.value == 1 ? "" : "s"}`));
    restockRange?.addEventListener("input", () => (restockBadge.textContent = `${restockRange.value}% Capacity`));

    document.getElementById("snSaveSlaBtn")?.addEventListener("click", () => {
      snToast("Feature simulated: connecting to backend infrastructure required to persist SLA rules for all locations.", {
        title: "SLA rules saved",
        type: "success",
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Audit log
   * ------------------------------------------------------------------ */
  function renderAuditLog(limit) {
    const list = document.getElementById("snAuditList");
    if (!list) return;
    const items = limit ? AUDIT_LOG.slice(0, limit) : AUDIT_LOG;
    list.innerHTML = items
      .map(
        (a) => `
      <li class="sn-audit-item">
        <span class="sn-audit-item__dot" aria-hidden="true"></span>
        <div class="sn-audit-item__body"><strong>${a.text}</strong><span>${a.time}</span></div>
      </li>`
      )
      .join("");
  }

  function initAuditLog() {
    renderAuditLog(3);
    document.getElementById("snViewAllAuditBtn")?.addEventListener("click", (e) => {
      const expanded = e.target.dataset.expanded === "true";
      renderAuditLog(expanded ? 3 : undefined);
      e.target.textContent = expanded ? "View All" : "Show Less";
      e.target.dataset.expanded = String(!expanded);
    });
  }

  /* ------------------------------------------------------------------ */
  function boot() {
    initTabs();
    initUserTable();
    initSlaRules();
    initAuditLog();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
