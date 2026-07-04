// =========================================================
// StockNest — Maintenance Center
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- Priority toggle ---------------- */
  const priorityToggle = document.getElementById("priorityToggle");
  const slaValue = document.getElementById("slaValue");

  const slaByPriority = {
    Critical: "4 Hours",
    High: "24 Hours",
    Low: "72 Hours",
  };

  if (priorityToggle) {
    priorityToggle.addEventListener("click", (e) => {
      const btn = e.target.closest(".priority-btn");
      if (!btn) return;

      priorityToggle
        .querySelectorAll(".priority-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const priority = btn.dataset.priority;
      slaValue.textContent = slaByPriority[priority] || "24 Hours";
    });
  }

  /* ---------------- Report Issue form submit ---------------- */
  const reportForm = document.getElementById("reportIssueForm");

  if (reportForm) {
    reportForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const assetInput = document.getElementById("assetInput");
      const descriptionInput = document.getElementById("descriptionInput");
      const activePriorityBtn = priorityToggle.querySelector(".priority-btn.active");

      const ticket = {
        assetId: assetInput.value.trim(),
        priority: activePriorityBtn ? activePriorityBtn.dataset.priority : "High",
        description: descriptionInput.value.trim(),
      };

      if (!ticket.assetId || !ticket.description) {
        alert("Please fill in the Asset ID / Name and Description before submitting.");
        return;
      }

      // TODO (backend): POST ticket to /api/maintenance/tickets
      // fetch("/api/maintenance/tickets", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(ticket),
      // });

      console.log("Ticket submitted (frontend only):", ticket);

      assetInput.value = "";
      descriptionInput.value = "";
      alert("Ticket submitted successfully.");
    });
  }

  /* ---------------- Export Log ---------------- */
  const exportLogBtn = document.getElementById("exportLogBtn");
  if (exportLogBtn) {
    exportLogBtn.addEventListener("click", () => {
      // TODO (backend): GET /api/maintenance/export-log and trigger file download
      alert("Export Log will be available once the backend export endpoint is connected.");
    });
  }

  /* ---------------- Category select (Asset Health) ---------------- */
  const categorySelect = document.getElementById("categorySelect");
  if (categorySelect) {
    categorySelect.addEventListener("click", () => {
      // TODO (backend): replace with real dropdown fed by /api/asset-categories
      alert("Category filter dropdown will be wired up once category data is available.");
    });
  }

  /* ---------------- Row menu buttons ---------------- */
  document.querySelectorAll(".row-menu-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      // TODO (backend): open per-row action menu (edit / cancel / reschedule)
      alert("Row actions (reschedule, cancel, edit) will be added here.");
    });
  });

  /* ---------------- Asset Health Overview chart ---------------- */
  // TODO (backend): replace this static data with data fetched from
  // /api/assets/health-overview
  const assetHealthData = [
    { label: "Printers", lifespan: 100, age: 78, warn: false },
    { label: "Coffee Machines", lifespan: 100, age: 42, warn: false },
    { label: "Laptops", lifespan: 100, age: 88, warn: false },
    { label: "HVAC Units", lifespan: 100, age: 30, warn: true },
    { label: "Furniture", lifespan: 100, age: 62, warn: false },
  ];

  const chartWrap = document.getElementById("assetHealthChart");

  function renderAssetHealthChart(data) {
    if (!chartWrap) return;
    chartWrap.innerHTML = "";

    data.forEach((item) => {
      const group = document.createElement("div");
      group.className = "chart-bar-group";

      const bar = document.createElement("div");
      bar.className = "chart-bar";
      bar.style.height = "140px";

      const fill = document.createElement("div");
      fill.className = "chart-bar-fill" + (item.warn ? " warn" : "");
      fill.style.height = `${item.age}%`;

      bar.appendChild(fill);

      const label = document.createElement("div");
      label.className = "chart-label";
      label.textContent = item.label;

      group.appendChild(bar);
      group.appendChild(label);
      chartWrap.appendChild(group);
    });
  }

  renderAssetHealthChart(assetHealthData);

});
