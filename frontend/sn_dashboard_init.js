/* ==========================================================================
   sn_dashboard_script.js
   Analytics & Reporting page logic.
   Depends on: sn_toast_module.js, sn_common.js (both loaded first)
   ========================================================================== */

(function () {
  "use strict";

  const DATE_RANGES = ["Today", "Last 7 Days", "Last 30 Days", "Last Quarter", "Year to Date"];
  const EXPORT_FORMATS = [
    { id: "pdf", label: "Export as PDF", icon: "pdf" },
    { id: "csv", label: "Export as CSV", icon: "csv" },
    { id: "email", label: "Email report", icon: "mail" },
  ];

  const ROOM_UTIL_DATA = [
    { label: "Mon", value: 62 },
    { label: "Tue", value: 71 },
    { label: "Wed", value: 68 },
    { label: "Thu", value: 84 },
    { label: "Fri", value: 90 },
    { label: "Sat", value: 45 },
    { label: "Sun", value: 30 },
  ];

  /* ------------------------------------------------------------------ *
   * Bar chart (Room Utilization Trends)
   * ------------------------------------------------------------------ */
  function renderBarChart() {
    const el = document.getElementById("snBarChart");
    if (!el) return;
    el.innerHTML = ROOM_UTIL_DATA.map(
      (d) => `
      <div class="sn-bar" title="${d.label}: ${d.value}%">
        <div class="sn-bar__col" style="height:0%" data-target="${d.value}"></div>
        <span class="sn-bar__label">${d.label}</span>
      </div>`
    ).join("");
    // Animate to target height on next frame.
    requestAnimationFrame(() => {
      el.querySelectorAll(".sn-bar__col").forEach((bar) => {
        bar.style.height = bar.dataset.target + "%";
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Donut chart (Asset Status) — draws stroke-dasharray arcs from %.
   * ------------------------------------------------------------------ */
  function renderDonut() {
    const svg = document.querySelector(".sn-donut");
    if (!svg) return;
    const r = 70;
    const circumference = 2 * Math.PI * r;
    const segments = [
      { selector: ".sn-donut__seg--available", pct: 60 },
      { selector: ".sn-donut__seg--inuse", pct: 25 },
      { selector: ".sn-donut__seg--maint", pct: 15 },
    ];
    let offsetAccum = 0;
    segments.forEach((seg) => {
      const el = svg.querySelector(seg.selector);
      if (!el) return;
      const len = (seg.pct / 100) * circumference;
      el.style.strokeDasharray = `${len} ${circumference - len}`;
      el.style.strokeDashoffset = -offsetAccum;
      offsetAccum += len;
    });
  }

  /* ------------------------------------------------------------------ *
   * Date range dropdown
   * ------------------------------------------------------------------ */
  function initDateRangeDropdown() {
    const trigger = document.getElementById("snDateRangeBtn");
    if (!trigger) return;
    const wrap = document.createElement("div");
    wrap.className = "sn-dropdown-anchor";
    trigger.parentNode.insertBefore(wrap, trigger);
    wrap.appendChild(trigger);

    const panel = document.createElement("div");
    panel.className = "sn-dropdown sn-dropdown--menu-sm";
    panel.innerHTML = DATE_RANGES.map(
      (r) => `<button class="sn-dropdown__option" type="button" data-range="${r}">${r}</button>`
    ).join("");
    wrap.appendChild(panel);

    window.SN.wireDropdown(trigger, panel);

    const label = trigger.querySelector(".sn-daterange-label");
    function markSelected(range) {
      panel.querySelectorAll(".sn-dropdown__option").forEach((opt) => {
        opt.classList.toggle("is-selected", opt.dataset.range === range);
      });
    }
    markSelected(label.textContent.trim());

    panel.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-range]");
      if (!opt) return;
      label.textContent = opt.dataset.range;
      markSelected(opt.dataset.range);
      panel.classList.remove("sn-dropdown--open");
      snToast(`Analytics now showing data for "${opt.dataset.range}".`, { title: "Date range updated", type: "info" });
    });
  }

  /* ------------------------------------------------------------------ *
   * Export dropdown
   * ------------------------------------------------------------------ */
  function initExportDropdown() {
    const trigger = document.getElementById("snExportBtn");
    if (!trigger) return;
    const wrap = document.createElement("div");
    wrap.className = "sn-dropdown-anchor";
    trigger.parentNode.insertBefore(wrap, trigger);
    wrap.appendChild(trigger);

    const panel = document.createElement("div");
    panel.className = "sn-dropdown sn-dropdown--menu-sm";
    panel.innerHTML = EXPORT_FORMATS.map(
      (f) => `
      <button class="sn-dropdown__option" type="button" data-format="${f.id}">
        <span style="display:flex;align-items:center;gap:8px;">
          <span class="sn-icon sn-icon--${f.icon}" aria-hidden="true"></span>${f.label}
        </span>
      </button>`
    ).join("");
    wrap.appendChild(panel);

    window.SN.wireDropdown(trigger, panel);

    panel.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-format]");
      if (!opt) return;
      panel.classList.remove("sn-dropdown--open");
      const fmt = EXPORT_FORMATS.find((f) => f.id === opt.dataset.format);
      snToast(`Preparing your ${fmt.label.replace("Export as ", "").replace("Email report", "email")}... this can take a few seconds.`, {
        title: "Export started",
        type: "info",
      });
      setTimeout(() => {
        snToast("Feature simulated: connecting to backend infrastructure required for live data export.", {
          title: "Export complete",
          type: "success",
        });
      }, 1400);
    });
  }

  /* ------------------------------------------------------------------ *
   * Chart panel "more options" menu
   * ------------------------------------------------------------------ */
  function initChartMenu() {
    const trigger = document.getElementById("snChartMenuBtn");
    if (!trigger) return;
    const wrap = document.createElement("div");
    wrap.className = "sn-dropdown-anchor";
    trigger.parentNode.insertBefore(wrap, trigger);
    wrap.appendChild(trigger);

    const panel = document.createElement("div");
    panel.className = "sn-dropdown sn-dropdown--menu-sm";
    panel.innerHTML = `
      <button class="sn-dropdown__option" type="button" data-action="refresh">
        <span style="display:flex;align-items:center;gap:8px;"><span class="sn-icon sn-icon--donut" aria-hidden="true"></span>Refresh data</span>
      </button>
      <button class="sn-dropdown__option" type="button" data-action="expand">
        <span style="display:flex;align-items:center;gap:8px;"><span class="sn-icon sn-icon--chart" aria-hidden="true"></span>View full screen</span>
      </button>
      <button class="sn-dropdown__option" type="button" data-action="download">
        <span style="display:flex;align-items:center;gap:8px;"><span class="sn-icon sn-icon--download" aria-hidden="true"></span>Download chart</span>
      </button>
    `;
    wrap.appendChild(panel);
    window.SN.wireDropdown(trigger, panel);

    panel.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-action]");
      if (!opt) return;
      panel.classList.remove("sn-dropdown--open");
      if (opt.dataset.action === "refresh") {
        ROOM_UTIL_DATA.forEach((d) => (d.value = Math.max(20, Math.min(96, d.value + (Math.random() * 20 - 10) | 0))));
        renderBarChart();
        snToast("Room utilization trends refreshed.", { title: "Chart updated", type: "success" });
      } else if (opt.dataset.action === "expand") {
        snToast("Full-screen chart view isn't available in this prototype yet.", { title: "View full screen", type: "info" });
      } else if (opt.dataset.action === "download") {
        snToast("Feature simulated: connecting to backend infrastructure required for live chart download.", {
          title: "Download",
          type: "info",
        });
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * React live to Quick Add submissions from sn_common.js
   * ------------------------------------------------------------------ */
  function formatCurrency(n) {
    return "$" + (n / 1000000).toFixed(2) + "M";
  }

  function refreshStatCards() {
    const m = window.SN.store.metrics;
    const valueEl = document.querySelector(".sn-stat-card__value");
    if (valueEl) valueEl.textContent = formatCurrency(m.totalValue);

    const maintCard = Array.from(document.querySelectorAll(".sn-stat-card")).find((c) =>
      c.querySelector(".sn-stat-card__label")?.textContent.includes("Maint.")
    );
    if (maintCard) maintCard.querySelector(".sn-stat-card__value").textContent = m.inMaintenance;

    const donutCenter = document.querySelector(".sn-donut__center strong");
    if (donutCenter) donutCenter.textContent = (m.totalAssets / 1000).toFixed(1) + "k";
  }

  document.addEventListener("sn:data-changed", refreshStatCards);

  /* ------------------------------------------------------------------ */
  function boot() {
    renderBarChart();
    renderDonut();
    initDateRangeDropdown();
    initExportDropdown();
    initChartMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
