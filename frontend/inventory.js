/**
 * StockNest — Inventory Management (Consumables) Page (PostgreSQL Connected)
 */

import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

const PAGE_SIZE = 4;
const CATEGORIES = ['Office Supplies', 'Stationery', 'Pantry', 'Cleaning', 'General', 'Housekeeping', 'Kitchen', 'Electronics'];

let consumables = [];
let filters = { search: '', category: 'All', status: 'All' };
let sortKey = 'name';
let sortDir = 'asc';
let currentPage = 1;
let actionTargetId = null;

const $ = (sel, ctx = document) => ctx.querySelector(sel);

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  $('#toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ─────────────────────────────────────────────
// Fetch inventory data from PostgreSQL
// ─────────────────────────────────────────────
async function loadData() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  try {
    const res = await fetch('http://localhost:5000/api/inventory', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const list = data.inventory || [];
      consumables = list.map(item => {
        let statusClass = 'status-pill--healthy';
        if (item.status === 'Low Stock') statusClass = 'status-pill--low';
        if (item.status === 'Out of Stock') statusClass = 'status-pill--critical';

        return {
          id: item.inventory_id, // Map database ID to id parameter
          sku: item.sku,
          name: item.item_name,
          category: item.category,
          qty: parseFloat(item.current_stock),
          unit: item.unit || 'Units',
          minStock: parseFloat(item.reorder_point),
          status: item.status,
          statusClass: statusClass,
          critical: item.status === 'Out of Stock' || item.status === 'Low Stock'
        };
      });
      renderTable();
    } else {
      showToast('Failed to load items from database.', 'error');
    }
  } catch (err) {
    showToast('Connection error loading database.', 'error');
  }
}

function getFilteredItems() {
  let list = [...consumables];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q)
    );
  }

  if (filters.category !== 'All') list = list.filter((item) => item.category === filters.category);
  if (filters.status !== 'All') list = list.filter((item) => item.status === filters.status);

  list.sort((a, b) => {
    let va;
    let vb;
    if (sortKey === 'qty') {
      va = a.qty;
      vb = b.qty;
      return sortDir === 'asc' ? va - vb : vb - va;
    }
    va = a[sortKey] || '';
    vb = b[sortKey] || '';
    const cmp = String(va).localeCompare(String(vb));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return list;
}

function updateStatCards() {
  const active = consumables.length;
  const low = consumables.filter((i) => i.status === 'Low Stock' || i.status === 'Critical' || i.status === 'Out of Stock').length;
  const cards = document.querySelectorAll('.stat-card__value');
  if (cards[0]) cards[0].textContent = active;
  if (cards[3]) cards[3].textContent = low;
}

function buildRow(item) {
  return `<tr class="${item.critical ? 'row--critical' : ''}" data-id="${item.id}">
    <td class="col-check"><input type="checkbox" class="row-check" data-id="${item.id}" /></td>
    <td><div class="item-cell__name">${item.name}</div><div class="item-cell__sku">${item.sku}</div></td>
    <td><span class="category-pill">${item.category}</span></td>
    <td><div class="stock-cell__qty">${item.qty} ${item.unit}</div><div class="stock-cell__min">Min: ${item.minStock}</div></td>
    <td><span class="status-pill ${item.statusClass}">${item.status}</span></td>
    <td class="col-actions" style="display:flex;align-items:center;justify-content:center;gap:8px;">
      <button type="button" class="row-maintenance-direct-btn" data-id="${item.id}" title="Request Maintenance for ${item.name}" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.18);color:#d97706;padding:4px 8px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700;transition:all 0.2s ease;outline:none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;stroke-width:2.5;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        Fix
      </button>
      <button type="button" class="row-action-btn" data-action-menu="${item.id}" aria-label="Actions" style="padding:4px 4px;">⋮</button>
    </td>
  </tr>`;
}

function renderTable() {
  const filtered = getFilteredItems();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  const tbody = $('#consumablesBody');

  tbody.innerHTML = pageItems.length
    ? pageItems.map(buildRow).join('')
    : '<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748b">No items found.</td></tr>';

  const end = Math.min(start + PAGE_SIZE, filtered.length);
  $('#paginationInfo').textContent = filtered.length
    ? `Showing ${start + 1} to ${end} of ${filtered.length} items`
    : 'Showing 0 items';

  renderPagination(totalPages);
  $('#selectAll').checked = false;
  updateStatCards();

  document.querySelectorAll('.sortable').forEach((th) => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.sort === sortKey) th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
  });
}

function renderPagination(totalPages) {
  const controls = $('#paginationControls');
  let html = `<button type="button" class="page-btn" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" class="page-btn${i === currentPage ? ' page-btn--active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button type="button" class="page-btn" data-page="next" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>`;
  controls.innerHTML = html;
}

function openModal(title, body, footer = '') {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = body;
  $('#modalFooter').innerHTML = footer;
  $('#inventoryModal').showModal();
  $('#modalBackdrop').hidden = false;
}

function closeModal() {
  $('#inventoryModal').close();
  $('#modalBackdrop').hidden = true;
  $('#modalFooter').innerHTML = '';
}

function exportInventory() {
  const filtered = getFilteredItems();
  const headers = ['SKU', 'Name', 'Category', 'Quantity', 'Unit', 'Min Stock', 'Status'];
  const rows = filtered.map((i) => [i.sku, i.name, i.category, i.qty, i.unit, i.minStock, i.status]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stocknest-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Inventory exported as CSV.');
}

function openImportModal() {
  openModal('Import Inventory', `
    <p style="margin-bottom:12px;font-size:13px;color:#64748b;">Paste CSV lines: SKU,Name,Category,Qty,Unit,MinStock</p>
    <textarea class="modal-field" id="importData" rows="5" placeholder="SKU-001,Item Name,Pantry,10,Units,5"></textarea>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--primary" id="importConfirm">Import</button>`);

  $('#importConfirm').addEventListener('click', async () => {
    const lines = $('#importData').value.trim().split('\n').filter(Boolean);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    let count = 0;

    for (const line of lines) {
      const [sku, name, category, qty, unit, minStock] = line.split(',').map((s) => s.trim());
      if (!sku || !name) continue;

      try {
        const res = await fetch('http://localhost:5000/api/inventory', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_name: name,
            sku,
            category: category || 'General',
            current_stock: parseInt(qty, 10) || 0,
            reorder_point: parseInt(minStock, 10) || 10,
            unit: unit || 'Units'
          })
        });
        if (res.ok) count++;
      } catch (err) {
        console.error(err);
      }
    }

    showToast(count ? `Imported ${count} item(s).` : 'No valid rows imported.', count ? 'success' : 'error');
    await loadData();
    closeModal();
  });
}

function openFilterModal() {
  openModal('Filter Inventory', `
    <div class="modal-field"><label>Category</label>
      <select id="filterCategory"><option value="All">All</option>${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}</select></div>
    <div class="modal-field"><label>Status</label>
      <select id="filterStatus"><option value="All">All</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option></select></div>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--outline" id="resetFilterBtn">Reset</button>
     <button type="button" class="btn btn--primary" id="applyFilterBtn">Apply</button>`);

  $('#filterCategory').value = filters.category;
  $('#filterStatus').value = filters.status;

  $('#applyFilterBtn').addEventListener('click', () => {
    filters.category = $('#filterCategory').value;
    filters.status = $('#filterStatus').value;
    currentPage = 1;
    renderTable();
    closeModal();
    showToast('Filters applied.', 'info');
  });

  $('#resetFilterBtn').addEventListener('click', () => {
    filters.category = 'All';
    filters.status = 'All';
    currentPage = 1;
    renderTable();
    closeModal();
    showToast('Filters reset.', 'info');
  });
}

function openAddStockModal() {
  openModal('Add Stock', `
    <div class="modal-field"><label>Item Name</label><input type="text" id="stockName" required></div>
    <div class="modal-field"><label>SKU</label><input type="text" id="stockSku" required></div>
    <div class="modal-field"><label>Category</label><select id="stockCategory">${CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select></div>
    <div class="modal-field"><label>Quantity</label><input type="number" id="stockQty" min="1" value="1"></div>
    <div class="modal-field"><label>Unit</label><input type="text" id="stockUnit" value="Units"></div>
    <div class="modal-field"><label>Minimum Stock</label><input type="number" id="stockMin" min="0" value="10"></div>
    <p class="modal-error" id="stockError"></p>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--primary" id="saveStockBtn">Add Stock</button>`);

  $('#saveStockBtn').addEventListener('click', async () => {
    const name = $('#stockName').value.trim();
    const sku = $('#stockSku').value.trim();
    const category = $('#stockCategory').value;
    const qty = parseInt($('#stockQty').value, 10) || 1;
    const unit = $('#stockUnit').value.trim() || 'Units';
    const minStock = parseInt($('#stockMin').value, 10) || 10;
    
    if (!name || !sku) { $('#stockError').textContent = 'Name and SKU are required.'; return; }
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    try {
      const res = await fetch('http://localhost:5000/api/inventory', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_name: name,
          sku,
          category,
          current_stock: qty,
          reorder_point: minStock,
          unit
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Added stock: ${name}`);
        closeModal();
        await loadData();
      } else {
        $('#stockError').textContent = data.message || 'Failed to add item.';
      }
    } catch(err) {
      $('#stockError').textContent = 'Connection error.';
    }
  });
}

function openAdjustModal(id, mode) {
  const item = consumables.find((i) => i.id === id);
  if (!item) return;
  let adjustQty = 1;

  openModal(mode === 'remove' ? 'Remove Stock' : 'Adjust Stock', `
    <p style="margin-bottom:12px;"><strong>${item.name}</strong> (${item.sku})</p>
    <p style="margin-bottom:12px;font-size:13px;color:#64748b;">Current: ${item.qty} ${item.unit}</p>
    <div class="qty-controls">
      <button type="button" id="qtyMinus">−</button>
      <span id="qtyValue">${adjustQty}</span>
      <button type="button" id="qtyPlus">+</button>
    </div>
    <p class="modal-error" id="adjustError"></p>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--primary" id="confirmAdjust">${mode === 'remove' ? 'Remove' : 'Apply'}</button>`);

  const updateQty = () => { $('#qtyValue').textContent = adjustQty; };
  $('#qtyMinus').addEventListener('click', () => { if (adjustQty > 1) { adjustQty--; updateQty(); } });
  $('#qtyPlus').addEventListener('click', () => { adjustQty++; updateQty(); });

  $('#confirmAdjust').addEventListener('click', async () => {
    if (mode === 'remove' && item.qty - adjustQty < 0) {
      $('#adjustError').textContent = 'Cannot remove more than current stock.';
      return;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const adjustmentValue = mode === 'remove' ? -adjustQty : adjustQty;

    try {
      const res = await fetch(`http://localhost:5000/api/inventory/${id}/adjust`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adjustment: adjustmentValue,
          reason: mode === 'remove' ? 'Consumption' : 'Restock'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${mode === 'remove' ? 'Removed' : 'Added'} ${adjustQty} ${item.unit} of ${item.name}.`);
        closeModal();
        await loadData();
      } else {
        $('#adjustError').textContent = data.message || 'Failed to adjust stock.';
      }
    } catch(err) {
      $('#adjustError').textContent = 'Connection error.';
    }
  });
}

function openEditModal(id) {
  const item = consumables.find((i) => i.id === id);
  if (!item) return;

  openModal('Edit Item', `
    <div class="modal-field"><label>Item Name</label><input type="text" id="editName" value="${item.name}"></div>
    <div class="modal-field"><label>Category</label><select id="editCategory">${CATEGORIES.map((c) => `<option${c === item.category ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="modal-field"><label>Minimum Stock</label><input type="number" id="editMin" min="0" value="${item.minStock}"></div>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--primary" id="saveEditBtn">Save</button>`);

  $('#saveEditBtn').addEventListener('click', async () => {
    const name = $('#editName').value.trim();
    const category = $('#editCategory').value;
    const minStock = parseInt($('#editMin').value, 10);

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/inventory/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_name: name || item.name,
          category,
          reorder_point: minStock !== undefined ? minStock : item.minStock
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Updated ${name || item.name}.`);
        closeModal();
        await loadData();
      } else {
        showToast(data.message || 'Failed to update item.', 'error');
      }
    } catch(err) {
      showToast('Connection error.', 'error');
    }
  });
}

function openViewModal(id) {
  const item = consumables.find((i) => i.id === id);
  if (!item) return;
  openModal('Item Details', `
    <p><strong>Name:</strong> ${item.name}</p>
    <p><strong>SKU:</strong> ${item.sku}</p>
    <p><strong>Category:</strong> ${item.category}</p>
    <p><strong>Stock:</strong> ${item.qty} ${item.unit}</p>
    <p><strong>Min Stock:</strong> ${item.minStock}</p>
    <p><strong>Status:</strong> ${item.status}</p>`,
    `<button type="button" class="btn btn--primary" data-close-modal>Close</button>`);
}

function deleteItem(id) {
  const item = consumables.find((i) => i.id === id);
  if (!item) return;
  openModal('Delete Item', `<p>Delete <strong>${item.name}</strong> (${item.sku})?</p>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--primary" id="confirmDelete">Delete</button>`);

  $('#confirmDelete').addEventListener('click', async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Deleted ${item.name}.`, 'info');
        closeModal();
        await loadData();
      } else {
        showToast(data.message || 'Failed to delete item.', 'error');
      }
    } catch(err) {
      showToast('Connection error.', 'error');
    }
  });
}

function showActionMenu(id, btn) {
  actionTargetId = id;
  const menu = $('#actionMenu');
  menu.innerHTML = `
    <button type="button" data-action="view">View Item</button>
    <button type="button" data-action="edit">Edit Item</button>
    <button type="button" data-action="add">Add Stock</button>
    <button type="button" data-action="remove">Remove Stock</button>
    <button type="button" data-action="maintenance" style="color: #f59e0b;">Request Maintenance</button>
    <button type="button" data-action="delete" class="is-danger">Delete Item</button>`;
  const rect = btn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.left = `${Math.max(8, rect.left - 130)}px`;
  menu.hidden = false;
}

function initEvents() {
  $('#exportBtn').addEventListener('click', exportInventory);
  $('#importBtn').addEventListener('click', openImportModal);
  $('#filterBtn').addEventListener('click', openFilterModal);
  $('#addStockBtn').addEventListener('click', openAddStockModal);

  $('#tableFilter').addEventListener('input', (e) => {
    filters.search = e.target.value;
    currentPage = 1;
    renderTable();
  });

  $('#clearSearchBtn').addEventListener('click', () => {
    filters.search = '';
    $('#tableFilter').value = '';
    currentPage = 1;
    renderTable();
    showToast('Search cleared.', 'info');
  });

  $('#selectAll').addEventListener('change', (e) => {
    document.querySelectorAll('.row-check').forEach((cb) => { cb.checked = e.target.checked; });
  });

  document.querySelectorAll('.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortKey = key; sortDir = 'asc'; }
      renderTable();
    });
  });

  $('#paginationControls').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    const totalPages = Math.ceil(getFilteredItems().length / PAGE_SIZE);
    if (btn.dataset.page === 'prev') currentPage--;
    else if (btn.dataset.page === 'next') currentPage++;
    else currentPage = parseInt(btn.dataset.page, 10);
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    renderTable();
  });

  $('#consumablesBody').addEventListener('click', (e) => {
    const maintBtn = e.target.closest('.row-maintenance-direct-btn');
    if (maintBtn) {
      e.stopPropagation();
      const itemId = maintBtn.dataset.id;
      const item = consumables.find(c => c.id === parseInt(itemId, 10));
      if (item) {
        window.location.href = `maintainance.html?item_name=${encodeURIComponent(item.name)}`;
      }
      return;
    }

    const btn = e.target.closest('[data-action-menu]');
    if (!btn) return;
    e.stopPropagation();
    showActionMenu(parseInt(btn.dataset.actionMenu, 10), btn);
  });

  $('#actionMenu').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !actionTargetId) return;
    const action = btn.dataset.action;
    $('#actionMenu').hidden = true;
    if (action === 'view') openViewModal(actionTargetId);
    else if (action === 'edit') openEditModal(actionTargetId);
    else if (action === 'add') openAdjustModal(actionTargetId, 'add');
    else if (action === 'remove') openAdjustModal(actionTargetId, 'remove');
    else if (action === 'delete') deleteItem(actionTargetId);
    else if (action === 'maintenance') {
      const item = consumables.find(c => c.id === actionTargetId);
      if (item) {
        window.location.href = `maintainance.html?item_name=${encodeURIComponent(item.name)}`;
      }
    }
  });

  $('#purchaseOrderBtn').addEventListener('click', () => {
    showToast('Purchase order generated for Coffee Beans (CFB-ESP-104).');
  });

  // Register form database call
  $('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#itemName').value.trim();
    const category = $('#itemCategory').value;
    const minStock = parseInt($('#minStock').value, 10) || 10;
    if (!name) { showToast('Please enter an item name.', 'error'); return; }

    const sku = 'SKU-' + Math.floor(1000 + Math.random() * 9000);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:5000/api/inventory', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_name: name,
          sku,
          category: category || 'General',
          current_stock: minStock,
          reorder_point: minStock,
          unit: 'Units'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Registered: ${name}`);
        e.target.reset();
        await loadData();
      } else {
        showToast(data.message || 'Failed to register consumable.', 'error');
      }
    } catch(err) {
      showToast('Connection error.', 'error');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu') && !e.target.closest('[data-action-menu]')) $('#actionMenu').hidden = true;
    if (e.target.matches('[data-close-modal]') || e.target === $('#modalBackdrop')) closeModal();
  });

  $('#modalCloseBtn').addEventListener('click', closeModal);
  $('#inventoryModal').addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });
}

function initTopbarIntegration() {
  const topbarRoot = $('#topbar-root');
  const searchInput = topbarRoot?.querySelector('#global-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filters.search = e.target.value;
      $('#tableFilter').value = e.target.value;
      currentPage = 1;
      renderTable();
    });
  }

  const quickAdd = topbarRoot?.querySelector('.topbar__quick-add');
  if (quickAdd) {
    // Redirection to the central modal
    quickAdd.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.openQuickAddModal) window.openQuickAddModal();
      else openAddStockModal();
    });
  }
}

async function initApp() {
  renderSidebar($('#sidebar-root'), { activeItem: 'inventory-management' });
  initSidebarNav($('#sidebar-root'));
  renderTopbar($('#topbar-root'), { searchPlaceholder: 'Search inventory, SKUs, or locations...' });
  initTopbarEvents($('#topbar-root'));
  initTopbarIntegration();
  initEvents();
  
  await loadData(); // Initial load from PostgreSQL
}

document.addEventListener('DOMContentLoaded', initApp);
