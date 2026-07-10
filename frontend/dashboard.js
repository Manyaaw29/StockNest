/**
 * StockNest Dashboard
 * Handles navigation, modals, search, sorting, pagination, and all interactive features.
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     Data
     -------------------------------------------------------------------------- */

  const MODULE_LABELS = {
    'dashboard': { title: 'Operational Overview', subtitle: 'Real-time telemetry for Floor 3 & 4.' },
    'setup-locations': { title: 'Setup and Locations', subtitle: 'Configure floors, wings, and storage zones.' },
    'asset-registry': { title: 'Asset Registry', subtitle: 'Browse and manage registered assets.' },
    'inventory-management': { title: 'Inventory Management', subtitle: 'Track stock levels and replenishment.' },
    'maintenance': { title: 'Maintenance', subtitle: 'Work orders and preventive maintenance schedules.' },
    'room-booking': { title: 'Room Booking', subtitle: 'Reserve meeting rooms and shared spaces.' },
    'room-allocation': { title: 'Room Allocation and Transfer', subtitle: 'Assign and move assets between rooms.' },
    'analytics': { title: 'Analytics & Reporting', subtitle: 'Insights and exportable reports.' },
    'settings': { title: 'Settings', subtitle: 'Workspace preferences and user management.' },
  };

  const AVATAR_COLORS = ['#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#10b981', '#6366f1'];

  const NOTIFICATIONS = [
    { title: 'Low stock alert', detail: 'Printer Toner (Blk) below threshold', time: '5 min ago' },
    { title: 'Maintenance due', detail: 'Espresso Machine — scheduled service', time: '1 hour ago' },
    { title: 'New shipment', detail: 'Ergonomic upgrades arrived at East Wing', time: '2 hours ago' },
    { title: 'Room booking', detail: 'Conference Room B booked for 3 PM', time: '3 hours ago' },
  ];

  /** @type {Array<{id:string,name:string,category:string,action:string,user:string,userInitial:string,status:string,statusClass:string,time:string,timeMinutes:number}>} */
  let activities = [
    { id: '#442', name: 'MacBook Pro 16"', category: 'IT Equipment', action: 'Checked Out', user: 'Sarah Jenkins', userInitial: 'S', status: 'In Use', statusClass: 'badge--in-use', time: '10 mins ago', timeMinutes: 10 },
    { id: '#115', name: 'Espresso Machine', category: 'Kitchen Appliance', action: 'Maintenance Req.', user: 'Mike Ross', userInitial: 'M', status: 'Maintenance', statusClass: 'badge--maintenance', time: '1 hour ago', timeMinutes: 60 },
    { id: '#902', name: 'Printer Toner (Blk)', category: 'Consumables', action: 'Stock Added', user: 'System Auto', userInitial: 'S', status: 'Available', statusClass: 'badge--available', time: '3 hours ago', timeMinutes: 180 },
    { id: '#318', name: 'Herman Miller Aeron', category: 'Furniture', action: 'Tagged', user: 'Alex Chen', userInitial: 'A', status: 'Available', statusClass: 'badge--available', time: '5 hours ago', timeMinutes: 300 },
    { id: '#721', name: 'Dell UltraSharp 27"', category: 'IT Equipment', action: 'Transferred', user: 'Jordan Lee', userInitial: 'J', status: 'In Use', statusClass: 'badge--in-use', time: 'Yesterday', timeMinutes: 1440 },
    { id: '#556', name: 'Standing Desk V2', category: 'Furniture', action: 'Request Submitted', user: 'Emma Wilson', userInitial: 'E', status: 'Pending', statusClass: 'badge--pending', time: 'Yesterday', timeMinutes: 1500 },
    { id: '#803', name: 'Conference Phone', category: 'IT Equipment', action: 'Checked In', user: 'David Park', userInitial: 'D', status: 'Available', statusClass: 'badge--available', time: '2 days ago', timeMinutes: 2880 },
    { id: '#129', name: 'Paper Ream A4', category: 'Consumables', action: 'Stock Added', user: 'System Auto', userInitial: 'S', status: 'Available', statusClass: 'badge--available', time: '2 days ago', timeMinutes: 3000 },
    { id: '#674', name: 'Projector Epson', category: 'IT Equipment', action: 'Maintenance Req.', user: 'Lisa Tran', userInitial: 'L', status: 'Maintenance', statusClass: 'badge--maintenance', time: '3 days ago', timeMinutes: 4320 },
    { id: '#991', name: 'Whiteboard Markers', category: 'Consumables', action: 'Checked Out', user: 'Tom Baker', userInitial: 'T', status: 'In Use', statusClass: 'badge--in-use', time: '4 days ago', timeMinutes: 5760 },
  ];

  const PAGE_SIZE = 5;
  let currentPage = 1;
  let sortKey = 'time';
  let sortDir = 'asc';
  let searchQuery = '';
  let currentModule = 'dashboard';
  let currentLocation = 'Floor 3 & 4';
  const BACKEND_URL = 'http://localhost:5000/api';

  /* --------------------------------------------------------------------------
     DOM references
     -------------------------------------------------------------------------- */

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const sidebar = $('#sidebar');
  const sidebarOverlay = $('#sidebarOverlay');
  const sidebarToggle = $('#sidebarToggle');
  const sidebarClose = $('#sidebarClose');
  const moduleDashboard = $('#module-dashboard');
  const modulePlaceholder = $('#module-placeholder');
  const activityTableBody = $('#activityTableBody');
  const globalSearch = $('#globalSearch');
  const modal = $('#genericModal');
  const modalBackdrop = $('#modalBackdrop');
  const modalTitle = $('#modalTitle');
  const modalBody = $('#modalBody');
  const modalFooter = $('#modalFooter');
  const toastContainer = $('#toastContainer');

  /* --------------------------------------------------------------------------
     Utilities
     -------------------------------------------------------------------------- */

  /** Show a toast notification */
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('is-leaving');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3200);
  }

  /** Animate a number counter */
  function animateCounter(el, target, duration = 1200) {
    const start = performance.now();
    const isPercent = el.parentElement?.textContent?.includes('%');

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
      else if (!isPercent) el.textContent = target.toLocaleString();
    }

    requestAnimationFrame(tick);
  }

  /** Get filtered and sorted activities */
  function getFilteredActivities() {
    let list = [...activities];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.action.toLowerCase().includes(q) ||
          a.user.toLowerCase().includes(q) ||
          a.status.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === 'name') { va = a.name; vb = b.name; }
      if (typeof va === 'string') {
        const cmp = va.localeCompare(vb);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    return list;
  }

  /** Avatar background color from initial */
  function avatarColor(initial) {
    const code = initial.charCodeAt(0);
    return AVATAR_COLORS[code % AVATAR_COLORS.length];
  }

  /* --------------------------------------------------------------------------
     Activity table
     -------------------------------------------------------------------------- */

  function renderActivityTable() {
    const filtered = getFilteredActivities();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    activityTableBody.innerHTML = pageItems
      .map(
        (a) => `
        <tr>
          <td>
            <div class="asset-cell">
              <div class="asset-thumb">${a.id}</div>
              <div>
                <span class="asset-name">${a.name}</span>
                <span class="asset-category">${a.category}</span>
              </div>
            </div>
          </td>
          <td>${a.action}</td>
          <td>
            <div class="user-cell">
              <div class="user-avatar" style="background:${avatarColor(a.userInitial)}">${a.userInitial}</div>
              <span>${a.user}</span>
            </div>
          </td>
          <td><span class="badge ${a.statusClass}">${a.status}</span></td>
          <td class="time-cell">${a.time}</td>
        </tr>`
      )
      .join('');

    if (!pageItems.length) {
      activityTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:#9ca3af;">No activities match your search.</td></tr>`;
    }

    $('#paginationInfo').textContent = `${currentPage} / ${totalPages}`;
    $('#prevPage').disabled = currentPage <= 1;
    $('#nextPage').disabled = currentPage >= totalPages;

    $$('.activity-table th.sortable').forEach((th) => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === sortKey) {
        th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }
    });
  }

  function initTableSorting() {
    $$('.activity-table th.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = key === 'time' ? 'asc' : 'asc';
        }
        currentPage = 1;
        renderActivityTable();
      });
    });
  }

  /* --------------------------------------------------------------------------
     Stats & progress animations
     -------------------------------------------------------------------------- */

  function animateStatCounters() {
    const statsGrid = $('#statsGrid');
    statsGrid.querySelectorAll('[data-count]').forEach((el) => {
      const target = parseInt(el.dataset.count, 10);
      setTimeout(() => animateCounter(el, target), 300);
    });

    setTimeout(() => {
      const progressBar = statsGrid.querySelector('.stat-card__progress-bar[data-progress]');
      if (progressBar) {
        progressBar.style.width = progressBar.dataset.progress + '%';
      }
    }, 500);
  }

  async function loadDashboardStats() {
    try {
      const res = await fetch('http://localhost:5000/api/dashboard');
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();

      const statsGrid = $('#statsGrid');
      const [totalEl, lowStockEl, maintenanceEl, roomEl] = statsGrid.querySelectorAll('[data-count]');
      const progressBar = statsGrid.querySelector('.stat-card__progress-bar[data-progress]');
      const roomUtil = Math.round(data.roomUtilization);

      totalEl.dataset.count = data.totalAssets;
      lowStockEl.dataset.count = data.lowStock;
      maintenanceEl.dataset.count = data.pendingMaintenance;
      roomEl.dataset.count = roomUtil;
      if (progressBar) progressBar.dataset.progress = roomUtil;

      animateStatCounters();
    } catch {
      showToast('Failed to load dashboard data.', 'error');
      animateStatCounters();
    }
  }

  function initAnimations() {
    $$('.stat-card[data-animate]').forEach((card, i) => {
      setTimeout(() => card.classList.add('is-visible'), i * 100);
    });

    setTimeout(() => {
      $$('[data-progress]').forEach((bar) => {
        if (bar.closest('#statsGrid')) return;
        bar.style.width = bar.dataset.progress + '%';
      });
    }, 500);
  }

  /* --------------------------------------------------------------------------
     Sidebar navigation
     -------------------------------------------------------------------------- */

  const MODULE_ROUTES = {
    'setup-locations': 'organisation.html',
    'asset-registry': 'asset_registry.html',
    'inventory-management': 'inventory.html',
    'maintenance': 'maintainance.html',
    'room-booking': 'room-booking.html',
    'room-allocation': 'allocation.html',
    'analytics': 'sn_dashboard_view.html',
    'settings': 'stocknest-settings-view.html',
  };

  function switchModule(moduleId) {
    if (moduleId !== 'dashboard' && MODULE_ROUTES[moduleId]) {
      window.location.href = MODULE_ROUTES[moduleId];
      return;
    }

    currentModule = moduleId;

    // Define the actual routes available in the app
    const NAV_ROUTES = {
      'asset-registry': 'asset_registry.html',
      'inventory-management': 'inventory.html',
      'room-booking': 'room-booking.html',
      'room-allocation': 'allocation.html',
    };

    if (NAV_ROUTES[moduleId]) {
      window.location.href = NAV_ROUTES[moduleId];
      return;
    }

    $$('.sidebar__nav-btn').forEach((btn) => {
      btn.classList.toggle('sidebar__nav-btn--active', btn.dataset.module === moduleId);
    });

    if (moduleId === 'dashboard') {
      moduleDashboard.hidden = false;
      modulePlaceholder.hidden = true;
    } else {
      moduleDashboard.hidden = true;
      modulePlaceholder.hidden = false;

      const info = MODULE_LABELS[moduleId] || { title: 'Module', subtitle: '' };
      $('#placeholderTitle').textContent = info.title;
      $('#placeholderSubtitle').textContent = info.subtitle;
      $('#placeholderText').textContent = `The ${info.title} module is under development. Use the sidebar to navigate back to the dashboard.`;
    }

    closeSidebar();
  }

  function openSidebar() {
    sidebar.classList.add('is-open');
    sidebarOverlay.classList.add('is-visible');
    sidebarOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    sidebarOverlay.classList.remove('is-visible');
    sidebarOverlay.setAttribute('aria-hidden', 'true');
  }

  /* --------------------------------------------------------------------------
     Dropdowns
     -------------------------------------------------------------------------- */

  function closeAllDropdowns() {
    $$('.dropdown-panel').forEach((p) => { p.hidden = true; });
    $$('[aria-expanded="true"]').forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
  }

  function toggleDropdown(btn, panel) {
    const isOpen = !panel.hidden;
    closeAllDropdowns();
    if (!isOpen) {
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }
  }

  function renderNotifications() {
    $('#notifList').innerHTML = NOTIFICATIONS.map(
      (n) => `<li><strong>${n.title}</strong><span>${n.detail} · ${n.time}</span></li>`
    ).join('');
  }

  /* --------------------------------------------------------------------------
     Modals
     -------------------------------------------------------------------------- */

  function openModal(title, bodyHTML, footerHTML = '', wide = false) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHTML;
    modalFooter.innerHTML = footerHTML;
    modal.classList.toggle('modal--wide', wide);
    modal.showModal();
    modalBackdrop.hidden = false;
    modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.close();
    modalBackdrop.hidden = true;
    modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modalFooter.innerHTML = '';
    modal.classList.remove('modal--wide');
  }

  /* ---- Quick Add modal ---- */
  function openQuickAddModal() {
    openModal(
      'Quick Add',
      `<form id="quickAddForm">
        <div class="form-group">
          <label class="form-label" for="qaName">Asset Name</label>
          <input class="form-input" id="qaName" required placeholder="e.g. Wireless Mouse">
        </div>
        <div class="form-group">
          <label class="form-label" for="qaCategory">Category</label>
          <select class="form-select" id="qaCategory">
            <option>IT Equipment</option>
            <option>Furniture</option>
            <option>Consumables</option>
            <option>Kitchen Appliance</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="qaQty">Quantity</label>
          <input class="form-input" id="qaQty" type="number" min="1" value="1" required>
        </div>
      </form>`,
      `<button class="btn btn--outline" type="button" data-close-modal>Cancel</button>
       <button class="btn btn--primary" type="button" id="qaSubmit">Add Asset</button>`
    );

    $('#qaSubmit').addEventListener('click', async () => {
      const name = $('#qaName').value.trim();
      if (!name) return;

      const category = $('#qaCategory').value;
      const qty = parseInt($('#qaQty').value, 10) || 1;
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        alert('You must be logged in to add assets.');
        return;
      }

      try {
        $('#qaSubmit').disabled = true;
        $('#qaSubmit').textContent = 'Adding...';

        for (let i = 0; i < qty; i++) {
          const assetName = qty > 1 ? `${name} #${i + 1}` : name;
          const response = await fetch(`${BACKEND_URL}/assets`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: assetName,
              condition_level: 100,
              status: 'Active'
            })
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Failed to create asset in database.');
          }
        }

        closeModal();
        showToast(`"${name}" (×${qty}) added to database successfully.`);
        
        activities.unshift({
          id: '#NEW',
          name: name,
          category: category,
          action: `Added (×${qty})`,
          user: 'You',
          userInitial: 'U',
          status: 'Available',
          statusClass: 'badge--available',
          time: 'Just now',
          timeMinutes: 0,
        });
        renderActivityTable();

      } catch (err) {
        console.error('Error adding asset:', err);
        alert(err.message);
      } finally {
        const qaSubmit = $('#qaSubmit');
        if (qaSubmit) {
          qaSubmit.disabled = false;
          qaSubmit.textContent = 'Add Asset';
        }
      }
    });
  }

  /* ---- Add Stock modal ---- */
  function openAddStockModal() {
    openModal(
      'Add Stock',
      `<form id="addStockForm">
        <div class="form-group">
          <label class="form-label" for="asItem">Item Name</label>
          <input class="form-input" id="asItem" required placeholder="Item name">
        </div>
        <div class="form-group">
          <label class="form-label" for="asQty">Quantity</label>
          <input class="form-input" id="asQty" type="number" min="1" value="1" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="asLocation">Location</label>
          <input class="form-input" id="asLocation" value="${currentLocation}" required>
        </div>
      </form>`,
      `<button class="btn btn--outline" type="button" data-close-modal>Cancel</button>
       <button class="btn btn--primary" type="button" id="asSubmit">Add Stock</button>`
    );

    $('#asSubmit').addEventListener('click', () => {
      const name = $('#asItem').value.trim();
      const qty = $('#asQty').value;
      if (!name) return;

      activities.unshift({
        id: '#' + Math.floor(100 + Math.random() * 900),
        name,
        category: 'Consumables',
        action: `Stock Added (×${qty})`,
        user: 'You',
        userInitial: 'U',
        status: 'Available',
        statusClass: 'badge--available',
        time: 'Just now',
        timeMinutes: 0,
      });

      renderActivityTable();
      closeModal();
      showToast(`Added ${qty} units of "${name}".`);
    });
  }

  /* ---- Request modal ---- */
  function openRequestModal() {
    openModal(
      'Submit Request',
      `<form id="requestForm">
        <div class="form-group">
          <label class="form-label" for="reqItem">Requested Item</label>
          <input class="form-input" id="reqItem" required placeholder="What do you need?">
        </div>
        <div class="form-group">
          <label class="form-label" for="reqPriority">Priority</label>
          <select class="form-select" id="reqPriority">
            <option>Normal</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="reqNotes">Notes</label>
          <textarea class="form-textarea" id="reqNotes" placeholder="Additional details..."></textarea>
        </div>
      </form>`,
      `<button class="btn btn--outline" type="button" data-close-modal>Cancel</button>
       <button class="btn btn--primary" type="button" id="reqSubmit">Submit Request</button>`
    );

    $('#reqSubmit').addEventListener('click', () => {
      const item = $('#reqItem').value.trim();
      if (!item) return;

      activities.unshift({
        id: '#' + Math.floor(100 + Math.random() * 900),
        name: item,
        category: 'General',
        action: 'Request Submitted',
        user: 'You',
        userInitial: 'U',
        status: 'Pending',
        statusClass: 'badge--pending',
        time: 'Just now',
        timeMinutes: 0,
      });

      renderActivityTable();
      closeModal();
      showToast('Request submitted successfully.');
    });
  }

  /* ---- Transfer modal ---- */
  function openTransferModal() {
    openModal(
      'Transfer Asset',
      `<form id="transferForm">
        <div class="form-group">
          <label class="form-label" for="trAsset">Asset</label>
          <select class="form-select" id="trAsset">
            ${activities.slice(0, 6).map((a) => `<option value="${a.name}">${a.name} (${a.id})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="trFrom">From Location</label>
          <input class="form-input" id="trFrom" value="${currentLocation}">
        </div>
        <div class="form-group">
          <label class="form-label" for="trTo">To Location</label>
          <input class="form-input" id="trTo" required placeholder="Destination">
        </div>
      </form>`,
      `<button class="btn btn--outline" type="button" data-close-modal>Cancel</button>
       <button class="btn btn--primary" type="button" id="trSubmit">Transfer</button>`
    );

    $('#trSubmit').addEventListener('click', () => {
      const asset = $('#trAsset').value;
      const to = $('#trTo').value.trim();
      if (!to) return;

      const match = activities.find((a) => asset.startsWith(a.name));
      activities.unshift({
        id: match?.id || '#000',
        name: match?.name || asset,
        category: match?.category || 'General',
        action: `Transferred to ${to}`,
        user: 'You',
        userInitial: 'U',
        status: 'In Use',
        statusClass: 'badge--in-use',
        time: 'Just now',
        timeMinutes: 0,
      });

      renderActivityTable();
      closeModal();
      showToast(`Asset transferred to ${to}.`);
    });
  }

  /* ---- Fix / Maintenance modal ---- */
  function openFixModal() {
    openModal(
      'Create Maintenance Ticket',
      `<form id="fixForm">
        <div class="form-group">
          <label class="form-label" for="fixAsset">Asset</label>
          <input class="form-input" id="fixAsset" required placeholder="Asset name or ID">
        </div>
        <div class="form-group">
          <label class="form-label" for="fixIssue">Issue Description</label>
          <textarea class="form-textarea" id="fixIssue" required placeholder="Describe the problem..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="fixPriority">Priority</label>
          <select class="form-select" id="fixPriority">
            <option>Low</option>
            <option>Medium</option>
            <option selected>High</option>
            <option>Critical</option>
          </select>
        </div>
      </form>`,
      `<button class="btn btn--outline" type="button" data-close-modal>Cancel</button>
       <button class="btn btn--primary" type="button" id="fixSubmit">Create Ticket</button>`
    );

    $('#fixSubmit').addEventListener('click', async () => {
      const assetIdentifier = $('#fixAsset').value.trim();
      const issue = $('#fixIssue').value.trim();
      const priority = $('#fixPriority').value;
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!assetIdentifier || !issue) {
        alert('Please fill out all fields.');
        return;
      }

      if (!token) {
        alert('You must be logged in to create maintenance tickets.');
        return;
      }

      try {
        $('#fixSubmit').disabled = true;
        $('#fixSubmit').textContent = 'Creating...';

        // 1. Fetch assets to find a match by ID or Name
        const assetsRes = await fetch(`${BACKEND_URL}/assets`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const assetsData = await assetsRes.json();
        
        const matchedAsset = assetsData.assets.find(a => 
          a.name.toLowerCase().includes(assetIdentifier.toLowerCase()) || 
          String(a.asset_id) === assetIdentifier ||
          `AST-${String(a.asset_id).padStart(4, '0')}`.toLowerCase() === assetIdentifier.toLowerCase()
        );

        if (!matchedAsset) {
          throw new Error(`Could not find an asset matching "${assetIdentifier}". Register it in the Asset Registry first.`);
        }

        // 2. Create the ticket
        const response = await fetch(`${BACKEND_URL}/maintenance`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            asset_id: matchedAsset.asset_id,
            priority: priority,
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to create ticket.');
        }

        // 3. Mark asset status as 'In-Maintenance'
        await fetch(`${BACKEND_URL}/assets/${matchedAsset.asset_id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'In-Maintenance'
          })
        });

        closeModal();
        showToast(`Maintenance ticket created for "${matchedAsset.name}"!`);
        
        activities.unshift({
          id: `AST-${String(matchedAsset.asset_id).padStart(4, '0')}`,
          name: matchedAsset.name,
          category: 'Hardware',
          action: 'Maintenance Req.',
          user: 'You',
          userInitial: 'U',
          status: 'Maintenance',
          statusClass: 'badge--maintenance',
          time: 'Just now',
          timeMinutes: 0,
        });
        renderActivityTable();

      } catch (err) {
        console.error('Error creating maintenance ticket:', err);
        alert(err.message);
      } finally {
        const fixSubmit = $('#fixSubmit');
        if (fixSubmit) {
          fixSubmit.disabled = false;
          fixSubmit.textContent = 'Create Ticket';
        }
      }
    });
  }

  /* ---- Scan Asset modal ---- */
  function openScanModal() {
    openModal(
      'Scan Asset',
      `<div class="scan-viewfinder">
        <div class="scan-viewfinder__corners"></div>
        <div class="scan-line"></div>
        <span class="scan-viewfinder__label">Point camera at asset QR code</span>
      </div>
      <p style="margin-top:16px;font-size:13px;color:#6b7280;text-align:center;">Simulating scan — asset will be detected automatically.</p>`,
      `<button class="btn btn--outline" type="button" data-close-modal>Cancel</button>
       <button class="btn btn--primary" type="button" id="scanSimulate">Simulate Scan</button>`
    );

    $('#scanSimulate').addEventListener('click', () => {
      closeModal();
      showToast('Asset #442 — MacBook Pro 16" scanned successfully.', 'info');
    });
  }

  /* ---- Tagging sequence modal ---- */
  function openTaggingModal() {
    openModal(
      'Asset Tagging Sequence',
      `<p style="font-size:14px;color:#6b7280;margin-bottom:16px;">Tagging Herman Miller Aeron and Uplift V2 Desk for East Wing deployment.</p>
       <div class="tagging-progress">
         <div class="tagging-progress__bar"><div class="tagging-progress__fill" id="tagProgressFill"></div></div>
         <p class="tagging-progress__text" id="tagProgressText">Ready to begin...</p>
       </div>
       <ul style="margin-top:16px;font-size:13px;color:#374151;list-style:none;">
         <li style="padding:6px 0;border-bottom:1px solid #f3f4f6;">☐ Herman Miller Aeron — Qty: 24</li>
         <li style="padding:6px 0;">☐ Uplift V2 Desk — Qty: 18</li>
       </ul>`,
      `<button class="btn btn--outline" type="button" data-close-modal>Cancel</button>
       <button class="btn btn--primary" type="button" id="tagStart">Start Tagging</button>`
    );

    const tagStart = $('#tagStart');
    tagStart.addEventListener('click', function handler() {
      tagStart.disabled = true;
      tagStart.textContent = 'Tagging...';

      const fill = $('#tagProgressFill');
      const text = $('#tagProgressText');
      let progress = 0;
      const items = ['Herman Miller Aeron', 'Uplift V2 Desk'];
      let itemIndex = 0;

      const interval = setInterval(() => {
        progress += 2;
        fill.style.width = progress + '%';

        if (progress >= 50 && itemIndex === 0) {
          text.textContent = `Tagged: ${items[0]} (24 units)`;
          itemIndex = 1;
        }

        if (progress >= 100) {
          clearInterval(interval);
          text.textContent = `Complete! All ${items.length} product lines tagged.`;
          tagStart.textContent = 'Done';
          showToast('Tagging sequence completed successfully.');
          setTimeout(closeModal, 1500);
        } else if (progress > 50) {
          text.textContent = `Tagging: ${items[1]}...`;
        } else {
          text.textContent = `Tagging: ${items[0]}...`;
        }
      }, 60);
    });
  }

  /* ---- View All modal ---- */
  function openViewAllModal() {
    const filtered = getFilteredActivities();

    openModal(
      'All Activity',
      `<div class="table-wrap">
        <table class="activity-table">
          <thead>
            <tr>
              <th>Asset ID / Name</th>
              <th>Action</th>
              <th>User</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map(
                (a) => `
              <tr>
                <td><div class="asset-cell"><div class="asset-thumb">${a.id}</div><div><span class="asset-name">${a.name}</span><span class="asset-category">${a.category}</span></div></div></td>
                <td>${a.action}</td>
                <td><div class="user-cell"><div class="user-avatar" style="background:${avatarColor(a.userInitial)}">${a.userInitial}</div><span>${a.user}</span></div></td>
                <td><span class="badge ${a.statusClass}">${a.status}</span></td>
                <td class="time-cell">${a.time}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`,
      `<button class="btn btn--primary" type="button" data-close-modal>Close</button>`,
      true
    );
  }

  /* ---- Export CSV ---- */
  function exportCSV() {
    const filtered = getFilteredActivities();
    const headers = ['Asset ID', 'Name', 'Category', 'Action', 'User', 'Status', 'Time'];
    const rows = filtered.map((a) => [a.id, a.name, a.category, a.action, a.user, a.status, a.time]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stocknest-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('Dashboard data exported as CSV.');
  }

  /* --------------------------------------------------------------------------
     Event bindings
     -------------------------------------------------------------------------- */

  function bindEvents() {
    /* Sidebar */
    $$('.sidebar__nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchModule(btn.dataset.module));
    });

    sidebarToggle?.addEventListener('click', openSidebar);
    sidebarClose?.addEventListener('click', closeSidebar);
    sidebarOverlay?.addEventListener('click', closeSidebar);

    /* Location switcher */
    const locationBtn = $('#locationBtn');
    const locationMenu = $('#locationMenu');

    locationBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !locationMenu.hidden;
      closeAllDropdowns();
      locationMenu.hidden = isOpen;
      locationBtn.setAttribute('aria-expanded', String(!isOpen));
    });

    $$('#locationMenu li').forEach((li) => {
      li.addEventListener('click', () => {
        currentLocation = li.dataset.location;
        $('#pageSubtitle').textContent = `Real-time telemetry for ${currentLocation}.`;
        locationMenu.hidden = true;
        locationBtn.setAttribute('aria-expanded', 'false');
        showToast(`Switched to ${currentLocation}.`, 'info');
      });
    });

    $('#helpCenterBtn')?.addEventListener('click', () => {
      showToast('Help Center opening soon. Contact admin@stocknest.io for support.', 'info');
    });

    /* Topbar */
    const notifBtn = $('#notifBtn');
    const notifPanel = $('#notifPanel');
    notifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(notifBtn, notifPanel);
    });

    const profileBtn = $('#profileBtn');
    const profilePanel = $('#profilePanel');
    profileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(profileBtn, profilePanel);
    });

    $$('#profilePanel [data-action]').forEach((item) => {
      item.addEventListener('click', () => {
        closeAllDropdowns();
        const action = item.dataset.action;
        if (action === 'logout') {
          showToast('Logging out...', 'info');
          setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        } else if (action === 'settings') {
          switchModule('settings');
        } else {
          showToast('Profile page coming soon.', 'info');
        }
      });
    });

    $('#quickAddBtn')?.addEventListener('click', openQuickAddModal);

    /* Search */
    globalSearch?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      currentPage = 1;
      renderActivityTable();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        globalSearch?.focus();
      }
    });

    /* Dashboard actions */
    $('#exportBtn')?.addEventListener('click', exportCSV);
    $('#scanAssetBtn')?.addEventListener('click', openScanModal);
    $('#taggingBtn')?.addEventListener('click', openTaggingModal);
    $('#viewAllBtn')?.addEventListener('click', openViewAllModal);

    /* Quick actions */
    $$('.quick-action').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'add-stock') openAddStockModal();
        else if (action === 'request') openRequestModal();
        else if (action === 'transfer') openTransferModal();
        else if (action === 'fix') openFixModal();
      });
    });

    /* Pagination */
    $('#prevPage')?.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderActivityTable(); }
    });

    $('#nextPage')?.addEventListener('click', () => {
      const totalPages = Math.ceil(getFilteredActivities().length / PAGE_SIZE);
      if (currentPage < totalPages) { currentPage++; renderActivityTable(); }
    });

    /* Modal close */
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-modal]') || e.target === modalBackdrop) {
        closeModal();
      }
    });

    modal?.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeModal();
    });

    /* Close dropdowns on outside click */
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar__dropdown-wrap') && !e.target.closest('.sidebar__footer')) {
        closeAllDropdowns();
        if (locationMenu) locationMenu.hidden = true;
        if (locationBtn) locationBtn.setAttribute('aria-expanded', 'false');
      }
    });

    /* Responsive: close sidebar on resize */
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) closeSidebar();
    });
  }

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */

  function init() {
    renderNotifications();
    renderActivityTable();
    initTableSorting();
    initAnimations();
    bindEvents();
    loadDashboardStats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
