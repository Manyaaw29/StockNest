/**
 * StockNest — Inventory Management (Consumables) Page
 */

import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

const PAGE_SIZE = 4;
const CATEGORIES = ['Office Supplies', 'Stationery', 'Pantry', 'Cleaning'];

let consumables = [
  { id: 'PPR-A4-500', name: 'Premium Printer Paper, A4', category: 'Office Supplies', qty: 12, unit: 'Reams', minStock: 20, status: 'Low Stock', statusClass: 'status-pill--low', critical: false },
  { id: 'WBM-BLK-004', name: 'Whiteboard Markers (Set of 4)', category: 'Stationery', qty: 45, unit: 'Boxes', minStock: 10, status: 'Healthy', statusClass: 'status-pill--healthy', critical: false },
  { id: 'CFB-ESP-104', name: 'Coffee Beans (1kg)', category: 'Pantry', qty: 2, unit: 'kg', minStock: 5, status: 'Critical', statusClass: 'status-pill--critical', critical: true },
  { id: 'TBG-HD-100', name: 'Trash Bags (Heavy Duty)', category: 'Cleaning', qty: 120, unit: 'Rolls', minStock: 50, status: 'Healthy', statusClass: 'status-pill--healthy', critical: false },
  { id: 'INK-BLK-220', name: 'Printer Ink Cartridge (Black)', category: 'Office Supplies', qty: 8, unit: 'Units', minStock: 15, status: 'Low Stock', statusClass: 'status-pill--low', critical: false },
  { id: 'NAP-2PLY-50', name: 'Napkins 2-Ply Pack', category: 'Pantry', qty: 65, unit: 'Packs', minStock: 30, status: 'Healthy', statusClass: 'status-pill--healthy', critical: false },
];

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

function computeStatus(item) {
  if (item.qty <= Math.floor(item.minStock * 0.5)) {
    item.status = 'Critical';
    item.statusClass = 'status-pill--critical';
    item.critical = true;
  } else if (item.qty < item.minStock) {
    item.status = 'Low Stock';
    item.statusClass = 'status-pill--low';
    item.critical = false;
  } else {
    item.status = 'Healthy';
    item.statusClass = 'status-pill--healthy';
    item.critical = false;
  }
}

function getFilteredItems() {
  let list = [...consumables];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
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
  const low = consumables.filter((i) => i.status === 'Low Stock' || i.status === 'Critical').length;
  const cards = document.querySelectorAll('.stat-card__value');
  if (cards[0]) cards[0].textContent = active;
  if (cards[3]) cards[3].textContent = low;
}

function buildRow(item) {
  return `<tr class="${item.critical ? 'row--critical' : ''}" data-id="${item.id}">
    <td class="col-check"><input type="checkbox" class="row-check" data-id="${item.id}" /></td>
    <td><div class="item-cell__name">${item.name}</div><div class="item-cell__sku">${item.id}</div></td>
    <td><span class="category-pill">${item.category}</span></td>
    <td><div class="stock-cell__qty">${item.qty} ${item.unit}</div><div class="stock-cell__min">Min: ${item.minStock}</div></td>
    <td><span class="status-pill ${item.statusClass}">${item.status}</span></td>
    <td class="col-actions"><button type="button" class="row-action-btn" data-action-menu="${item.id}" aria-label="Actions">⋮</button></td>
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
  const rows = filtered.map((i) => [i.id, i.name, i.category, i.qty, i.unit, i.minStock, i.status]);
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

  $('#importConfirm').addEventListener('click', () => {
    const lines = $('#importData').value.trim().split('\n').filter(Boolean);
    let count = 0;
    lines.forEach((line) => {
      const [id, name, category, qty, unit, minStock] = line.split(',').map((s) => s.trim());
      if (!id || !name || consumables.some((i) => i.id === id)) return;
      const item = {
        id, name, category: category || 'Office Supplies',
        qty: parseInt(qty, 10) || 0, unit: unit || 'Units',
        minStock: parseInt(minStock, 10) || 10, status: 'Healthy', statusClass: 'status-pill--healthy', critical: false,
      };
      computeStatus(item);
      consumables.push(item);
      count++;
    });
    showToast(count ? `Imported ${count} item(s).` : 'No valid rows imported.', count ? 'success' : 'error');
    renderTable();
    closeModal();
  });
}

function openFilterModal() {
  openModal('Filter Inventory', `
    <div class="modal-field"><label>Category</label>
      <select id="filterCategory"><option value="All">All</option>${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}</select></div>
    <div class="modal-field"><label>Status</label>
      <select id="filterStatus"><option value="All">All</option><option>Healthy</option><option>Low Stock</option><option>Critical</option></select></div>`,
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

  $('#saveStockBtn').addEventListener('click', () => {
    const name = $('#stockName').value.trim();
    const id = $('#stockSku').value.trim();
    if (!name || !id) { $('#stockError').textContent = 'Name and SKU are required.'; return; }
    if (consumables.some((i) => i.id === id)) { $('#stockError').textContent = 'SKU already exists.'; return; }
    const item = {
      id, name, category: $('#stockCategory').value,
      qty: parseInt($('#stockQty').value, 10) || 1,
      unit: $('#stockUnit').value.trim() || 'Units',
      minStock: parseInt($('#stockMin').value, 10) || 10,
      status: 'Healthy', statusClass: 'status-pill--healthy', critical: false,
    };
    computeStatus(item);
    consumables.unshift(item);
    renderTable();
    closeModal();
    showToast(`Added stock: ${name}`);
  });
}

function openAdjustModal(id, mode) {
  const item = consumables.find((i) => i.id === id);
  if (!item) return;
  let adjustQty = 1;

  openModal(mode === 'remove' ? 'Remove Stock' : 'Adjust Stock', `
    <p style="margin-bottom:12px;"><strong>${item.name}</strong> (${item.id})</p>
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

  $('#confirmAdjust').addEventListener('click', () => {
    if (mode === 'remove' && item.qty - adjustQty < 0) {
      $('#adjustError').textContent = 'Cannot remove more than current stock.';
      return;
    }
    item.qty = mode === 'remove' ? item.qty - adjustQty : item.qty + adjustQty;
    computeStatus(item);
    renderTable();
    closeModal();
    showToast(`${mode === 'remove' ? 'Removed' : 'Added'} ${adjustQty} ${item.unit} of ${item.name}.`);
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

  $('#saveEditBtn').addEventListener('click', () => {
    item.name = $('#editName').value.trim() || item.name;
    item.category = $('#editCategory').value;
    item.minStock = parseInt($('#editMin').value, 10) || item.minStock;
    computeStatus(item);
    renderTable();
    closeModal();
    showToast(`Updated ${item.name}.`);
  });
}

function openViewModal(id) {
  const item = consumables.find((i) => i.id === id);
  if (!item) return;
  openModal('Item Details', `
    <p><strong>Name:</strong> ${item.name}</p>
    <p><strong>SKU:</strong> ${item.id}</p>
    <p><strong>Category:</strong> ${item.category}</p>
    <p><strong>Stock:</strong> ${item.qty} ${item.unit}</p>
    <p><strong>Min Stock:</strong> ${item.minStock}</p>
    <p><strong>Status:</strong> ${item.status}</p>`,
    `<button type="button" class="btn btn--primary" data-close-modal>Close</button>`);
}

function deleteItem(id) {
  const item = consumables.find((i) => i.id === id);
  if (!item) return;
  openModal('Delete Item', `<p>Delete <strong>${item.name}</strong> (${item.id})?</p>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--primary" id="confirmDelete">Delete</button>`);
  $('#confirmDelete').addEventListener('click', () => {
    consumables = consumables.filter((i) => i.id !== id);
    renderTable();
    closeModal();
    showToast(`Deleted ${item.name}.`, 'info');
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
    const btn = e.target.closest('[data-action-menu]');
    if (!btn) return;
    e.stopPropagation();
    showActionMenu(btn.dataset.actionMenu, btn);
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
  });

  $('#purchaseOrderBtn').addEventListener('click', () => {
    showToast('Purchase order generated for Coffee Beans (CFB-ESP-104).');
  });

  $('#registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#itemName').value.trim();
    const category = $('#itemCategory').value;
    const minStock = parseInt($('#minStock').value, 10) || 10;
    if (!name) { showToast('Please enter an item name.', 'error'); return; }
    const id = 'SKU-' + Math.floor(1000 + Math.random() * 9000);
    const item = {
      id, name, category: category || 'Office Supplies', qty: minStock, unit: 'Units',
      minStock, status: 'Healthy', statusClass: 'status-pill--healthy', critical: false,
    };
    computeStatus(item);
    consumables.unshift(item);
    renderTable();
    e.target.reset();
    showToast(`Registered: ${name}`);
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
    quickAdd.addEventListener('click', openAddStockModal);
  }

  const notifBtn = topbarRoot?.querySelector('.topbar__icon-btn--notifications');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      showToast('14 low stock alerts require attention.', 'info');
    });
  }
}

function initApp() {
  renderSidebar($('#sidebar-root'), { activeItem: 'inventory-management' });
  initSidebarNav($('#sidebar-root'));
  renderTopbar($('#topbar-root'), { searchPlaceholder: 'Search inventory, SKUs, or locations...' });
  initTopbarEvents($('#topbar-root'));
  initTopbarIntegration();
  initEvents();
  renderTable();
}

document.addEventListener('DOMContentLoaded', initApp);
