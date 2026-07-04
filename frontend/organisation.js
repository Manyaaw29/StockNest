import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';

const content = document.getElementById("page-content");

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

function loadSetupPage() {
  content.innerHTML = "";
  const tpl = document.getElementById("tpl-setup");
  if (tpl) {
    content.appendChild(tpl.content.cloneNode(true));
    initSetupPage();
  }
}

// Initialise App
function initApp() {
  renderSidebar(document.getElementById('sidebar-root'), { activeItem: 'setup-locations' });
  initSidebarNav(document.getElementById('sidebar-root'));
  renderTopbar(document.getElementById('topbar-root'), { searchPlaceholder: 'Search organization...' });

  loadSetupPage();
}

document.addEventListener('DOMContentLoaded', initApp);
