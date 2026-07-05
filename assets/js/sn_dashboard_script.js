/* =======================================================
   StockNest — Analytics & Reporting
   Script: sn_dashboard_script.js
   ======================================================= */

document.addEventListener("DOMContentLoaded", function () {
  initSidebarToggle();
  renderRoomUtilizationChart();
  renderAssetStatusDonut();
  wireTopbarActions();
});

/* ---------- Sidebar toggle (mobile) ---------- */
function initSidebarToggle() {
  var toggleBtn = document.getElementById("snSidebarToggle");
  var sidebar = document.getElementById("snSidebar");
  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener("click", function () {
    sidebar.classList.toggle("sn-sidebar--open");
  });

  document.addEventListener("click", function (event) {
    var isClickInsideSidebar = sidebar.contains(event.target);
    var isToggleBtn = toggleBtn.contains(event.target);
    if (!isClickInsideSidebar && !isToggleBtn && sidebar.classList.contains("sn-sidebar--open")) {
      sidebar.classList.remove("sn-sidebar--open");
    }
  });
}

/* ---------- Room Utilization bar chart ---------- */
function renderRoomUtilizationChart() {
  var chartEl = document.getElementById("snBarChart");
  if (!chartEl) return;

  // Sample dataset representing weekly room utilization (%).
  var data = [
    { label: "Mon", value: 48 },
    { label: "Tue", value: 58 },
    { label: "Wed", value: 82 },
    { label: "Thu", value: 100, active: true },
    { label: "Fri", value: 70 },
    { label: "Sat", value: 74 },
    { label: "Sun", value: 52 }
  ];

  chartEl.innerHTML = "";

  data.forEach(function (item) {
    var col = document.createElement("div");
    col.className = "sn-bar-chart__col";

    var bar = document.createElement("div");
    bar.className = "sn-bar-chart__bar" + (item.active ? " sn-bar-chart__bar--active" : "");
    bar.style.height = item.value + "%";
    bar.title = item.label + ": " + item.value + "% utilization";

    var label = document.createElement("span");
    label.className = "sn-bar-chart__label";
    label.textContent = item.label;

    col.appendChild(bar);
    col.appendChild(label);
    chartEl.appendChild(col);
  });
}

/* ---------- Asset Status donut chart ---------- */
function renderAssetStatusDonut() {
  var radius = 70;
  var circumference = 2 * Math.PI * radius;

  var segments = [
    { selector: ".sn-donut__seg--available", percent: 60 },
    { selector: ".sn-donut__seg--inuse", percent: 25 },
    { selector: ".sn-donut__seg--maint", percent: 15 }
  ];

  var offset = 0;
  segments.forEach(function (seg) {
    var el = document.querySelector(seg.selector);
    if (!el) return;
    var length = (seg.percent / 100) * circumference;
    el.style.strokeDasharray = length + " " + circumference;
    el.style.strokeDashoffset = -offset;
    offset += length;
  });
}

/* ---------- Topbar / header demo actions ---------- */
function wireTopbarActions() {
  var quickAddBtn = document.getElementById("snQuickAddBtn");
  var exportBtn = document.getElementById("snExportBtn");
  var dateRangeBtn = document.getElementById("snDateRangeBtn");
  var notifBtn = document.getElementById("snNotifBtn");
  var chartMenuBtn = document.getElementById("snChartMenuBtn");

  if (quickAddBtn) {
    quickAddBtn.addEventListener("click", function () {
      alert("Quick Add: choose an asset, room, or maintenance ticket to create.");
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      alert("Exporting current analytics view as a report...");
    });
  }

  if (dateRangeBtn) {
    var labelEl = dateRangeBtn.querySelector(".sn-daterange-label");
    dateRangeBtn.addEventListener("click", function () {
      var ranges = ["Last 7 Days", "Last 30 Days", "Last 90 Days", "This Year"];
      var currentIndex = ranges.indexOf(labelEl.textContent.trim());
      var next = ranges[(currentIndex + 1) % ranges.length];
      labelEl.textContent = next;
    });
  }

  if (notifBtn) {
    notifBtn.addEventListener("click", function () {
      alert("Notifications: 1 unread — SLA compliance dropped below target for Location #4.");
    });
  }

  if (chartMenuBtn) {
    chartMenuBtn.addEventListener("click", function () {
      alert("Chart options: Download PNG, View as table, Change date range.");
    });
  }
}
