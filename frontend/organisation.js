// ============ PAGE ROUTING ============
// Human-readable titles for the placeholder pages
const PAGE_TITLES = {
  dashboard: "Dashboard",
  setup: "Organization Setup",
  registry: "Asset Registry",
  inventory: "Inventory Management",
  maintenance: "Maintenance",
  booking: "Room Booking",
  allocation: "Room Allocation and Transfer",
  analytics: "Analytics & Reporting",
  settings: "Settings"
};

const content = document.getElementById("page-content");
const navItems = document.querySelectorAll(".nav-item");

function renderPage(page) {
  // Highlight the active nav item
  navItems.forEach(item => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  content.innerHTML = "";

  if (page === "setup") {
    const tpl = document.getElementById("tpl-setup");
    content.appendChild(tpl.content.cloneNode(true));
    initSetupPage();
  } else {
    const tpl = document.getElementById("tpl-placeholder");
    const clone = tpl.content.cloneNode(true);
    clone.querySelector("[data-placeholder-title]").textContent = PAGE_TITLES[page] || "Coming soon";
    content.appendChild(clone);
  }
}

navItems.forEach(item => {
  item.addEventListener("click", () => renderPage(item.dataset.page));
});

// ============ SETUP PAGE INTERACTIONS ============
function initSetupPage() {
  // Organization tier radio selection
  const tierOptions = content.querySelectorAll(".tier-option");
  tierOptions.forEach(option => {
    option.addEventListener("click", () => {
      tierOptions.forEach(o => o.classList.remove("selected"));
      option.classList.add("selected");
      option.querySelector("input[type=radio]").checked = true;
    });
  });

  // Grid / list view toggle for spatial distribution
  const viewButtons = content.querySelectorAll(".view-toggle");
  viewButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      viewButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Location tree expand / collapse
  const carets = content.querySelectorAll(".caret");
  carets.forEach(caret => {
    caret.addEventListener("click", () => {
      caret.classList.toggle("open");
    });
  });

  // Cancel / Save button feedback (no backend — purely presentational)
  const saveBtn = content.querySelector(".btn-primary:not(.full)");
  const cancelBtn = content.querySelector(".btn-ghost");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      saveBtn.textContent = "Saved ✓";
      setTimeout(() => (saveBtn.textContent = "Save Changes"), 1400);
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      content.querySelectorAll(".branch-card input").forEach(input => input.blur());
    });
  }
}

// ============ INITIAL LOAD ============
renderPage("setup");
