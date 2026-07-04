/* =======================================================
   StockNest — Settings
   Script: sn_settings_script.js
   ======================================================= */

document.addEventListener("DOMContentLoaded", function () {
  initSidebarToggle();
  renderUserTable();
  renderAuditLog();
  wireSlaSliders();
  wireTabs();
  wireHeaderActions();
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

/* ---------- Users & Roles table ---------- */
var USER_PAGES = [
  [
    { initials: "JD", color: "#2F5DE8", name: "Jane Doe", email: "jane.doe@stocknest.io", role: "Admin", roleClass: "sn-role-badge--admin", status: "Active", statusClass: "active", lastActive: "2 mins ago" },
    { initials: "AS", color: "#F5B400", name: "Alex Smith", email: "alex.smith@stocknest.io", role: "Manager", roleClass: "sn-role-badge--neutral", status: "Active", statusClass: "active", lastActive: "1 hour ago" },
    { initials: "RJ", color: "#8B92A0", name: "Robert Johnson", email: "robert.j@stocknest.io", role: "Technician", roleClass: "sn-role-badge--neutral", status: "Away", statusClass: "away", lastActive: "3 days ago" }
  ],
  [
    { initials: "PL", color: "#7C6CF0", name: "Priya Lal", email: "priya.lal@stocknest.io", role: "Manager", roleClass: "sn-role-badge--neutral", status: "Active", statusClass: "active", lastActive: "18 mins ago" },
    { initials: "MC", color: "#F06A6A", name: "Marcus Chen", email: "marcus.chen@stocknest.io", role: "Technician", roleClass: "sn-role-badge--neutral", status: "Away", statusClass: "away", lastActive: "1 day ago" },
    { initials: "SO", color: "#22C55E", name: "Sara Osei", email: "sara.osei@stocknest.io", role: "Admin", roleClass: "sn-role-badge--admin", status: "Active", statusClass: "active", lastActive: "6 mins ago" }
  ]
];

var currentUserPage = 0;
var totalUsers = 12;
var usersPerPage = 3;

function renderUserTable() {
  var body = document.getElementById("snUserTableBody");
  var footLabel = document.getElementById("snTableFootLabel");
  if (!body) return;

  var pageData = USER_PAGES[currentUserPage] || USER_PAGES[0];
  body.innerHTML = "";

  pageData.forEach(function (user) {
    var row = document.createElement("tr");

    row.innerHTML =
      '<td>' +
        '<div class="sn-user-cell">' +
          '<span class="sn-user-avatar" style="background:' + user.color + '">' + user.initials + '</span>' +
          '<span class="sn-user-name">' + user.name + '<span class="sn-user-email">' + user.email + '</span></span>' +
        '</div>' +
      '</td>' +
      '<td><span class="sn-role-badge ' + user.roleClass + '">' + user.role + '</span></td>' +
      '<td>' +
        '<span class="sn-status-cell sn-status--' + user.statusClass + '">' +
          '<span class="sn-status-dot sn-status-dot--' + user.statusClass + '"></span>' + user.status +
        '</span>' +
      '</td>' +
      '<td class="sn-last-active">' + user.lastActive + '</td>' +
      '<td class="sn-row-actions">' +
        '<button class="sn-icon-btn sn-icon-btn--ghost" type="button" aria-label="More actions for ' + user.name + '">' +
          '<span class="sn-icon sn-icon--dots" aria-hidden="true"></span>' +
        '</button>' +
      '</td>';

    body.appendChild(row);
  });

  var start = currentUserPage * usersPerPage + 1;
  var end = Math.min(start + usersPerPage - 1, totalUsers);
  if (footLabel) {
    footLabel.textContent = "Showing " + start + " to " + end + " of " + totalUsers + " users";
  }

  var prevBtn = document.getElementById("snPagerPrev");
  var nextBtn = document.getElementById("snPagerNext");
  if (prevBtn) prevBtn.disabled = currentUserPage === 0;
  if (nextBtn) nextBtn.disabled = currentUserPage >= USER_PAGES.length - 1;
}

function wireUserTablePager() {
  var prevBtn = document.getElementById("snPagerPrev");
  var nextBtn = document.getElementById("snPagerNext");

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      if (currentUserPage > 0) {
        currentUserPage -= 1;
        renderUserTable();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      if (currentUserPage < USER_PAGES.length - 1) {
        currentUserPage += 1;
        renderUserTable();
      }
    });
  }
}

/* ---------- System Audit Log ---------- */
function renderAuditLog() {
  var list = document.getElementById("snAuditList");
  if (!list) return;

  var entries = [
    { icon: "edit", tone: "info", text: "Jane Doe modified role for Alex Smith.", time: "10:42 AM Today" },
    { icon: "check", tone: "success", text: "System successfully backed up database.", time: "09:38 AM Today" },
    { icon: "warning", tone: "warning", text: "API Gateway detected unusually high traffic.", time: "11:15 PM Yesterday" },
    { icon: "gear", tone: "neutral", text: "Admin User updated SLA rules.", time: "09:38 AM Yesterday" }
  ];

  list.innerHTML = "";
  entries.forEach(function (entry) {
    var item = document.createElement("li");
    item.className = "sn-audit-item";
    item.innerHTML =
      '<span class="sn-audit-icon sn-audit-icon--' + entry.tone + '">' +
        '<span class="sn-icon sn-icon--' + entry.icon + '" aria-hidden="true"></span>' +
      '</span>' +
      '<span class="sn-audit-text">' + entry.text + '<span class="sn-audit-time">' + entry.time + '</span></span>';
    list.appendChild(item);
  });

  var viewAllBtn = document.getElementById("snViewAllAuditBtn");
  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", function () {
      alert("Opening the full system audit log...");
    });
  }
}

/* ---------- SLA Rules sliders ---------- */
function wireSlaSliders() {
  var repairRange = document.getElementById("snRepairTimeRange");
  var repairBadge = document.getElementById("snRepairTimeBadge");
  var restockRange = document.getElementById("snRestockRange");
  var restockBadge = document.getElementById("snRestockBadge");
  var saveBtn = document.getElementById("snSaveSlaBtn");

  if (repairRange && repairBadge) {
    repairRange.addEventListener("input", function () {
      repairBadge.textContent = repairRange.value + " Hours";
    });
  }

  if (restockRange && restockBadge) {
    restockRange.addEventListener("input", function () {
      restockBadge.textContent = restockRange.value + "% Capacity";
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var repairVal = repairRange ? repairRange.value : "24";
      var restockVal = restockRange ? restockRange.value : "15";
      alert(
        "SLA rules saved:\n" +
        "- Critical asset repair time: " + repairVal + " hours\n" +
        "- Standard vendor restock alert: " + restockVal + "% capacity"
      );
    });
  }

  wireUserTablePager();
}

/* ---------- Settings tabs ---------- */
function wireTabs() {
  var tabs = document.querySelectorAll(".sn-tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.classList.remove("sn-tab--active"); });
      tab.classList.add("sn-tab--active");
      // In a full build, this would swap the visible panel per tab.
      // Kept as a lightweight demo since only the "User Management" panel
      // was provided in the design.
    });
  });
}

/* ---------- Header actions ---------- */
function wireHeaderActions() {
  var quickAddBtn = document.getElementById("snQuickAddBtn");
  var notifBtn = document.getElementById("snNotifBtn");
  var inviteBtn = document.getElementById("snInviteUserBtn");

  if (quickAddBtn) {
    quickAddBtn.addEventListener("click", function () {
      alert("Quick Add: choose an asset, room, or maintenance ticket to create.");
    });
  }

  if (notifBtn) {
    notifBtn.addEventListener("click", function () {
      alert("Notifications: 1 unread — SLA compliance dropped below target for Location #4.");
    });
  }

  if (inviteBtn) {
    inviteBtn.addEventListener("click", function () {
      alert("Invite User: enter an email address to send a workspace invite.");
    });
  }
}
