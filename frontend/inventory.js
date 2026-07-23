/**
 * StockNest — Inventory Management (Consumables) Page
 * Fully connected to /api/inventory backend.
 */

import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const API_BASE   = 'http://localhost:5000/api';
const PAGE_SIZE  = 8;
const CATEGORIES = ['Office Supplies', 'Stationery', 'Pantry', 'Cleaning', 'General'];

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let consumables    = [];  // fetched from API
let filters        = { search: '', category: 'All', status: 'All' };
let sortKey        = 'item_name';
let sortDir        = 'asc';
let currentPage    = 1;
let actionTargetId = null;
let isLoading      = false;
let categoryInputMode = 'select'; // 'select' or 'custom'

const $ = (sel, ctx = document) => ctx.querySelector(sel);

// ─────────────────────────────────────────────
// AUTH HELPER — get stored JWT + user
// ─────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user') || '{}';
    return JSON.parse(raw);
  } catch { return {}; }
}

function getUserRole() {
  return getCurrentUser().role || 'Staff';
}

function canManageInventory() {
  return ['Admin', 'Manager'].includes(getUserRole());
}

function canDeleteInventory() {
  return getUserRole() === 'Admin';
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

function handleAuthError(status) {
  if (status === 401) {
    showToast('Session expired. Please log in again.', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return true;
  }
  if (status === 403) {
    showToast('⛔ Access denied. You need Admin or Manager permissions for this action.', 'error');
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  $('#toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ─────────────────────────────────────────────
// MAP API ITEM → local shape used by UI
// Backend fields: inventory_id, sku, item_name, category,
//   unit, current_stock, reorder_point, status, supplier_email
// ─────────────────────────────────────────────
function mapItem(raw) {
  // Backend status: 'In Stock' | 'Low Stock' | 'Out of Stock'
  // UI status classes: status-pill--healthy | status-pill--low | status-pill--critical
  const statusMap = {
    'In Stock':    { cls: 'status-pill--healthy', critical: false },
    'Low Stock':   { cls: 'status-pill--low',     critical: false },
    'Out of Stock':{ cls: 'status-pill--critical', critical: true  },
  };
  const mapped = statusMap[raw.status] || { cls: 'status-pill--healthy', critical: false };

  // UI-friendly display status label
  const displayStatus = raw.status === 'In Stock' ? 'In Stock'
    : raw.status === 'Low Stock' ? 'Low Stock'
    : 'Out of Stock';

  return {
    id:          raw.inventory_id,
    sku:         raw.sku || `INV-${raw.inventory_id}`,
    name:        raw.item_name,
    category:    raw.category,
    qty:         parseFloat(raw.current_stock),
    unit:        raw.unit,
    minStock:    parseFloat(raw.reorder_point),
    monthly:     parseFloat(raw.monthly_consumption || 0),
    status:      displayStatus,
    statusClass: mapped.cls,
    critical:    mapped.critical,
    supplierEmail: raw.supplier_email || '',
    history:     raw.consumption_history || [],
    createdAt:   raw.created_at,
  };
}

// ─────────────────────────────────────────────
// API CALLS
// ─────────────────────────────────────────────

/** GET /api/inventory  (with optional server-side filters) */
async function apiFetchInventory() {
  try {
    const params = new URLSearchParams();
    if (filters.search)                        params.set('search', filters.search);
    if (filters.category !== 'All')            params.set('category', filters.category);
    if (filters.status !== 'All') {
      // Map UI status label → backend enum
      const statusMap = { 'In Stock': 'In Stock', 'Low Stock': 'Low Stock', 'Out of Stock': 'Out of Stock' };
      const backendStatus = statusMap[filters.status];
      if (backendStatus) params.set('status', backendStatus);
    }

    const url = `${API_BASE}/inventory${params.toString() ? '?' + params.toString() : ''}`;
    const res  = await fetch(url, { headers: getAuthHeaders() });

    if (handleAuthError(res.status)) return;

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load inventory.');

    consumables = (data.inventory || []).map(mapItem);
    renderTable();
    updateStatCards();
    updateStockoutPredictor();
  } catch (err) {
    showToast(err.message || 'Network error loading inventory.', 'error');
    showTableError(err.message);
  }
}

/** POST /api/inventory — create new item */
async function apiCreateItem(payload) {
  const res  = await fetch(`${API_BASE}/inventory`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create item.');
  return data.item;
}

/** PUT /api/inventory/:id — update item */
async function apiUpdateItem(id, payload) {
  const res  = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update item.');
  return data.item;
}

/** DELETE /api/inventory/:id */
async function apiDeleteItem(id) {
  const res  = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete item.');
  return data;
}

/** PATCH /api/inventory/:id/adjust — stock adjustment */
async function apiAdjustStock(id, adjustment, reason = '') {
  const res  = await fetch(`${API_BASE}/inventory/${id}/adjust`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ adjustment, reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to adjust stock.');
  return data.item;
}

/** GET /api/inventory/alerts */
async function apiFetchAlerts() {
  const res  = await fetch(`${API_BASE}/inventory/alerts`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load alerts.');
  return data;
}

// ─────────────────────────────────────────────
// FILTER / SORT (client-side on loaded data)
// ─────────────────────────────────────────────
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
  if (filters.status !== 'All')   list = list.filter((item) => item.status === filters.status);

  list.sort((a, b) => {
    let va, vb;
    if (sortKey === 'qty') {
      va = a.qty; vb = b.qty;
      return sortDir === 'asc' ? va - vb : vb - va;
    }
    va = a[sortKey] || '';
    vb = b[sortKey] || '';
    const cmp = String(va).localeCompare(String(vb));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return list;
}

// ─────────────────────────────────────────────
// STAT CARDS (updated after fetch)
// ─────────────────────────────────────────────
function updateStatCards() {
  const total   = consumables.length;
  const lowCnt  = consumables.filter((i) => i.status === 'Low Stock' || i.status === 'Out of Stock').length;
  const avgBurn = consumables.reduce((s, i) => s + i.monthly, 0) / (consumables.length || 1);

  const cards = document.querySelectorAll('.stat-card__value');
  if (cards[0]) cards[0].textContent = total;
  if (cards[1]) cards[1].textContent = avgBurn > 0 ? `${Math.round(avgBurn / 4.3)}` : '—'; // monthly→weekly approx
  if (cards[3]) {
    cards[3].textContent = lowCnt;
    cards[3].style.color = lowCnt > 0 ? '#f59e0b' : 'inherit';
  }
}

// ─────────────────────────────────────────────
// STOCKOUT PREDICTOR WIDGET
// Shows the most critical item
// ─────────────────────────────────────────────
function updateStockoutPredictor() {
  const critical = consumables
    .filter((i) => i.monthly > 0)
    .map((i) => ({
      ...i,
      daysLeft: (i.qty / (i.monthly / 30)).toFixed(1),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const widget = document.querySelector('.widget-card__item-name');
  const alert  = document.querySelector('.predictor-alert');

  if (critical.length > 0) {
    const top = critical[0];
    if (widget) widget.textContent = `${top.name} (${top.sku})`;
    if (alert)  alert.textContent  = `Predicted Stockout in ${top.daysLeft} days`;
  } else if (consumables.length > 0) {
    if (widget) widget.textContent = 'All items sufficiently stocked';
    if (alert)  alert.textContent  = 'No immediate stockout risk';
  }
}

// ─────────────────────────────────────────────
// TABLE
// ─────────────────────────────────────────────
function buildRow(item) {
  return `<tr class="${item.critical ? 'row--critical' : ''}" data-id="${item.id}">
    <td class="col-check"><input type="checkbox" class="row-check" data-id="${item.id}" /></td>
    <td>
      <div class="item-cell__name">${escHtml(item.name)}</div>
      <div class="item-cell__sku">${escHtml(item.sku)}</div>
    </td>
    <td><span class="category-pill">${escHtml(item.category)}</span></td>
    <td>
      <div class="stock-cell__qty">${item.qty} ${escHtml(item.unit)}</div>
      <div class="stock-cell__min">Min: ${item.minStock}</div>
    </td>
    <td><span class="status-pill ${item.statusClass}">${escHtml(item.status)}</span></td>
    <td class="col-actions" style="display:flex;align-items:center;justify-content:center;gap:8px;">
      <button type="button" class="row-maintenance-direct-btn" data-id="${item.id}"
        title="Request Maintenance for ${escHtml(item.name)}"
        style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.18);color:#d97706;
               padding:4px 8px;border-radius:8px;cursor:pointer;display:flex;align-items:center;
               gap:4px;font-size:11px;font-weight:700;transition:all 0.2s ease;outline:none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;stroke-width:2.5;">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        Fix
      </button>
      <button type="button" class="row-action-btn" data-action-menu="${item.id}" aria-label="Actions" style="padding:4px 8px;">⋮</button>
    </td>
  </tr>`;
}

function showTableError(msg) {
  const tbody = $('#consumablesBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:#ef4444;">
      ⚠ ${escHtml(msg || 'Failed to load inventory data.')}
    </td></tr>`;
  }
}

function showTableLoading() {
  const tbody = $('#consumablesBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748b;">
      <span class="loading-spinner" style="display:inline-block;width:20px;height:20px;
        border:2px solid #334155;border-top-color:#6366f1;border-radius:50%;
        animation:spin 0.7s linear infinite;margin-right:8px;vertical-align:middle;"></span>
      Loading inventory...
    </td></tr>`;
  }
}

function renderTable() {
  const filtered   = getFilteredItems();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start     = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  const tbody     = $('#consumablesBody');

  tbody.innerHTML = pageItems.length
    ? pageItems.map(buildRow).join('')
    : '<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748b">No items found.</td></tr>';

  const end = Math.min(start + PAGE_SIZE, filtered.length);
  $('#paginationInfo').textContent = filtered.length
    ? `Showing ${start + 1} to ${end} of ${filtered.length} items`
    : 'Showing 0 items';

  renderPagination(totalPages);
  $('#selectAll').checked = false;

  document.querySelectorAll('.sortable').forEach((th) => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.sort === sortKey)
      th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
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

// ─────────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────────
function openModal(title, body, footer = '') {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML    = body;
  $('#modalFooter').innerHTML  = footer;
  $('#inventoryModal').showModal();
  $('#modalBackdrop').hidden = false;
}

function closeModal() {
  $('#inventoryModal').close();
  $('#modalBackdrop').hidden = true;
  $('#modalFooter').innerHTML = '';
}

function setModalLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? 'Saving...' : btn.dataset.origText || btn.textContent;
}

// ─────────────────────────────────────────────
// EXPORT (client-side CSV of current view)
// ─────────────────────────────────────────────
function exportInventory() {
  const filtered = getFilteredItems();
  const headers  = ['ID', 'SKU', 'Name', 'Category', 'Quantity', 'Unit', 'Min Stock', 'Monthly Consumption', 'Status', 'Supplier Email'];
  const rows     = filtered.map((i) => [i.id, i.sku, i.name, i.category, i.qty, i.unit, i.minStock, i.monthly, i.status, i.supplierEmail]);
  const csv      = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob     = new Blob([csv], { type: 'text/csv' });
  const url      = URL.createObjectURL(blob);
  const link     = document.createElement('a');
  link.href      = url;
  link.download  = `stocknest-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Inventory exported as CSV.');
}

// ─────────────────────────────────────────────
// IMPORT CSV (calls POST API for each row)
// ─────────────────────────────────────────────
function openImportModal() {
  openModal('Import Inventory',
    `<p style="margin-bottom:12px;font-size:13px;color:#64748b;">
       Paste CSV lines: SKU, Name, Category, Qty, Unit, MinStock, MonthlyConsumption, SupplierEmail
     </p>
     <textarea class="modal-field" id="importData" rows="6"
       placeholder="SKU-001,Printer Paper,Office Supplies,50,Reams,20,10,supplier@email.com"></textarea>
     <p class="modal-error" id="importError"></p>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--primary" id="importConfirm" data-orig-text="Import">Import</button>`);

  document.getElementById('importConfirm').addEventListener('click', async () => {
    const lines = document.getElementById('importData').value.trim().split('\n').filter(Boolean);
    if (!lines.length) {
      document.getElementById('importError').textContent = 'No data to import.';
      return;
    }

    setModalLoading('importConfirm', true);
    let imported = 0;
    const errors = [];

    for (const line of lines) {
      const [sku, name, category, qty, unit, minStock, monthly, supplierEmail] = line.split(',').map((s) => s.trim());
      if (!name) continue;
      try {
        await apiCreateItem({
          sku:                 sku || null,
          item_name:           name,
          category:            category || 'General',
          unit:                unit || 'Units',
          current_stock:       parseFloat(qty) || 0,
          reorder_point:       parseFloat(minStock) || 0,
          monthly_consumption: parseFloat(monthly) || 0,
          supplier_email:      supplierEmail || null,
        });
        imported++;
      } catch (err) {
        errors.push(`${name}: ${err.message}`);
      }
    }

    setModalLoading('importConfirm', false);
    if (errors.length) {
      document.getElementById('importError').textContent = `Errors: ${errors.slice(0, 3).join('; ')}`;
    }

    showToast(imported ? `Imported ${imported} item(s).` : 'No items imported.', imported ? 'success' : 'error');
    if (imported) {
      await apiFetchInventory();
      if (!errors.length) closeModal();
    }
  });
}

// ─────────────────────────────────────────────
// FILTER MODAL
// ─────────────────────────────────────────────
function openFilterModal() {
  openModal('Filter Inventory',
    `<div class="modal-field"><label>Category</label>
       <select id="filterCategory">
         <option value="All">All</option>
         ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}
       </select>
     </div>
     <div class="modal-field"><label>Status</label>
       <select id="filterStatus">
         <option value="All">All</option>
         <option>In Stock</option>
         <option>Low Stock</option>
         <option>Out of Stock</option>
       </select>
     </div>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--outline" id="resetFilterBtn">Reset</button>
     <button type="button" class="btn btn--primary" id="applyFilterBtn">Apply</button>`);

  document.getElementById('filterCategory').value = filters.category;
  document.getElementById('filterStatus').value   = filters.status;

  document.getElementById('applyFilterBtn').addEventListener('click', async () => {
    filters.category = document.getElementById('filterCategory').value;
    filters.status   = document.getElementById('filterStatus').value;
    currentPage      = 1;
    closeModal();
    showTableLoading();
    await apiFetchInventory();
    showToast('Filters applied.', 'info');
  });

  document.getElementById('resetFilterBtn').addEventListener('click', async () => {
    filters.category = 'All';
    filters.status   = 'All';
    currentPage      = 1;
    closeModal();
    showTableLoading();
    await apiFetchInventory();
    showToast('Filters reset.', 'info');
  });
}

// ─────────────────────────────────────────────
// ADD INVENTORY ITEM MODAL (POST /api/inventory)
// ─────────────────────────────────────────────
function openAddStockModal() {
  openModal('Add New Inventory Item',
    `<div class="modal-field"><label>Item Name *</label>
       <input type="text" id="stockName" placeholder="e.g. Printer Paper" required>
     </div>
     <div class="modal-field"><label>SKU / Code</label>
       <input type="text" id="stockSku" placeholder="e.g. PPR-A4-001">
     </div>
     <div class="modal-field"><label>Category</label>
       <select id="stockCategory">
         ${CATEGORIES.map((c) => `<option>${c}</option>`).join('')}
       </select>
     </div>
     <div class="modal-field"><label>Current Stock Quantity</label>
       <input type="number" id="stockQty" min="0" value="0" step="0.01">
     </div>
     <div class="modal-field"><label>Unit</label>
       <input type="text" id="stockUnit" value="Units">
     </div>
     <div class="modal-field"><label>Reorder Point (Min Stock)</label>
       <input type="number" id="stockMin" min="0" value="10" step="0.01">
     </div>
     <div class="modal-field"><label>Monthly Consumption</label>
       <input type="number" id="stockMonthly" min="0" value="0" step="0.01">
     </div>
     <div class="modal-field"><label>Supplier Email</label>
       <input type="email" id="stockSupplier" placeholder="supplier@example.com">
     </div>
     <p class="modal-error" id="stockError"></p>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--primary" id="saveStockBtn" data-orig-text="Add Item">Add Item</button>`);

  document.getElementById('saveStockBtn').addEventListener('click', async () => {
    const name = document.getElementById('stockName').value.trim();
    if (!name) {
      document.getElementById('stockError').textContent = 'Item name is required.';
      return;
    }

    setModalLoading('saveStockBtn', true);
    try {
      await apiCreateItem({
        item_name:           name,
        sku:                 document.getElementById('stockSku').value.trim() || null,
        category:            document.getElementById('stockCategory').value,
        unit:                document.getElementById('stockUnit').value.trim() || 'Units',
        current_stock:       parseFloat(document.getElementById('stockQty').value) || 0,
        reorder_point:       parseFloat(document.getElementById('stockMin').value) || 0,
        monthly_consumption: parseFloat(document.getElementById('stockMonthly').value) || 0,
        supplier_email:      document.getElementById('stockSupplier').value.trim() || null,
      });

      showToast(`✅ "${name}" added to inventory.`);
      closeModal();
      await apiFetchInventory();
    } catch (err) {
      document.getElementById('stockError').textContent = err.message;
      setModalLoading('saveStockBtn', false);
    }
  });
}

// ─────────────────────────────────────────────
// ADJUST STOCK MODAL (PATCH /api/inventory/:id/adjust)
// mode: 'add' | 'remove'
// ─────────────────────────────────────────────
function openAdjustModal(id, mode) {
  const item = consumables.find((i) => i.id == id);
  if (!item) return;
  let adjustQty = 1;

  openModal(
    mode === 'remove' ? 'Remove Stock' : 'Add Stock',
    `<p style="margin-bottom:8px;"><strong>${escHtml(item.name)}</strong> (${escHtml(item.sku)})</p>
     <p style="margin-bottom:16px;font-size:13px;color:#64748b;">
       Current stock: <strong>${item.qty} ${escHtml(item.unit)}</strong>
     </p>
     <div class="modal-field">
       <label>Amount to ${mode === 'remove' ? 'Remove' : 'Add'}</label>
       <div class="qty-controls">
         <button type="button" id="qtyMinus">−</button>
         <input type="number" id="qtyValue" value="${adjustQty}" min="1" step="0.01"
                style="width:80px;text-align:center;border:1px solid #334155;border-radius:8px;
                       padding:6px;background:#1e293b;color:#f1f5f9;">
         <button type="button" id="qtyPlus">+</button>
       </div>
     </div>
     <div class="modal-field">
       <label>Reason (optional)</label>
       <input type="text" id="adjustReason" placeholder="${mode === 'remove' ? 'e.g. Weekly consumption' : 'e.g. New delivery'}">
     </div>
     <p class="modal-error" id="adjustError"></p>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--primary" id="confirmAdjust" data-orig-text="${mode === 'remove' ? 'Remove' : 'Apply'}">${mode === 'remove' ? 'Remove' : 'Apply'}</button>`);

  const getQty    = () => parseFloat(document.getElementById('qtyValue').value) || 1;
  const setQty    = (v) => { document.getElementById('qtyValue').value = Math.max(0.01, v); };

  document.getElementById('qtyMinus').addEventListener('click', () => setQty(getQty() - 1));
  document.getElementById('qtyPlus').addEventListener('click',  () => setQty(getQty() + 1));

  document.getElementById('confirmAdjust').addEventListener('click', async () => {
    const qty    = getQty();
    const reason = document.getElementById('adjustReason').value.trim();
    if (qty <= 0) {
      document.getElementById('adjustError').textContent = 'Amount must be greater than 0.';
      return;
    }
    if (mode === 'remove' && item.qty - qty < 0) {
      document.getElementById('adjustError').textContent = `Cannot remove more than current stock (${item.qty}).`;
      return;
    }

    setModalLoading('confirmAdjust', true);
    try {
      const delta   = mode === 'remove' ? -qty : qty;
      const updated = await apiAdjustStock(id, delta, reason);

      showToast(`${mode === 'remove' ? '📉 Removed' : '📦 Added'} ${qty} ${item.unit} — New stock: ${parseFloat(updated.current_stock)}`);
      closeModal();
      await apiFetchInventory();
    } catch (err) {
      document.getElementById('adjustError').textContent = err.message;
      setModalLoading('confirmAdjust', false);
    }
  });
}

// ─────────────────────────────────────────────
// EDIT ITEM MODAL (PUT /api/inventory/:id)
// ─────────────────────────────────────────────
function openEditModal(id) {
  const item = consumables.find((i) => i.id == id);
  if (!item) return;

  openModal('Edit Item',
    `<div class="modal-field"><label>Item Name</label>
       <input type="text" id="editName" value="${escAttr(item.name)}">
     </div>
     <div class="modal-field"><label>SKU / Code</label>
       <input type="text" id="editSku" value="${escAttr(item.sku)}">
     </div>
     <div class="modal-field"><label>Category</label>
       <select id="editCategory">
         ${CATEGORIES.map((c) => `<option${c === item.category ? ' selected' : ''}>${c}</option>`).join('')}
       </select>
     </div>
     <div class="modal-field"><label>Unit</label>
       <input type="text" id="editUnit" value="${escAttr(item.unit)}">
     </div>
     <div class="modal-field"><label>Reorder Point (Min Stock)</label>
       <input type="number" id="editMin" min="0" step="0.01" value="${item.minStock}">
     </div>
     <div class="modal-field"><label>Monthly Consumption</label>
       <input type="number" id="editMonthly" min="0" step="0.01" value="${item.monthly}">
     </div>
     <div class="modal-field"><label>Supplier Email</label>
       <input type="email" id="editSupplier" value="${escAttr(item.supplierEmail)}">
     </div>
     <p class="modal-error" id="editError"></p>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--primary" id="saveEditBtn" data-orig-text="Save">Save</button>`);

  document.getElementById('saveEditBtn').addEventListener('click', async () => {
    setModalLoading('saveEditBtn', true);
    try {
      await apiUpdateItem(id, {
        item_name:           document.getElementById('editName').value.trim() || item.name,
        sku:                 document.getElementById('editSku').value.trim() || null,
        category:            document.getElementById('editCategory').value,
        unit:                document.getElementById('editUnit').value.trim() || item.unit,
        reorder_point:       parseFloat(document.getElementById('editMin').value) ?? item.minStock,
        monthly_consumption: parseFloat(document.getElementById('editMonthly').value) ?? item.monthly,
        supplier_email:      document.getElementById('editSupplier').value.trim() || null,
      });

      showToast(`✏️ Updated "${item.name}".`);
      closeModal();
      await apiFetchInventory();
    } catch (err) {
      document.getElementById('editError').textContent = err.message;
      setModalLoading('saveEditBtn', false);
    }
  });
}

// ─────────────────────────────────────────────
// VIEW ITEM DETAIL MODAL
// ─────────────────────────────────────────────
function openViewModal(id) {
  const item = consumables.find((i) => i.id == id);
  if (!item) return;

  const historyRows = (item.history || []).slice(-5).reverse().map((h) => `
    <tr>
      <td style="padding:6px 8px;">${h.date || '—'}</td>
      <td style="padding:6px 8px;">${h.adjustment > 0 ? `+${h.adjustment}` : h.adjustment}</td>
      <td style="padding:6px 8px;">${h.reason || '—'}</td>
      <td style="padding:6px 8px;">${h.stock_after ?? '—'}</td>
    </tr>`).join('');

  openModal('Item Details',
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
       <div><span style="color:#64748b;font-size:12px;">Name</span><br><strong>${escHtml(item.name)}</strong></div>
       <div><span style="color:#64748b;font-size:12px;">SKU</span><br><strong>${escHtml(item.sku)}</strong></div>
       <div><span style="color:#64748b;font-size:12px;">Category</span><br><strong>${escHtml(item.category)}</strong></div>
       <div><span style="color:#64748b;font-size:12px;">Unit</span><br><strong>${escHtml(item.unit)}</strong></div>
       <div><span style="color:#64748b;font-size:12px;">Current Stock</span><br><strong>${item.qty} ${escHtml(item.unit)}</strong></div>
       <div><span style="color:#64748b;font-size:12px;">Reorder Point</span><br><strong>${item.minStock} ${escHtml(item.unit)}</strong></div>
       <div><span style="color:#64748b;font-size:12px;">Monthly Consumption</span><br><strong>${item.monthly}</strong></div>
       <div><span style="color:#64748b;font-size:12px;">Status</span><br><span class="status-pill ${item.statusClass}">${escHtml(item.status)}</span></div>
       ${item.supplierEmail ? `<div style="grid-column:1/-1;"><span style="color:#64748b;font-size:12px;">Supplier Email</span><br><strong>${escHtml(item.supplierEmail)}</strong></div>` : ''}
     </div>
     ${historyRows ? `
     <h4 style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Recent Activity</h4>
     <div style="overflow-x:auto;">
       <table style="width:100%;border-collapse:collapse;font-size:13px;">
         <thead>
           <tr style="color:#64748b;text-align:left;">
             <th style="padding:6px 8px;">Date</th>
             <th style="padding:6px 8px;">Change</th>
             <th style="padding:6px 8px;">Reason</th>
             <th style="padding:6px 8px;">After</th>
           </tr>
         </thead>
         <tbody>${historyRows}</tbody>
       </table>
     </div>` : '<p style="color:#64748b;font-size:13px;">No adjustment history yet.</p>'}`,
    `<button type="button" class="btn btn--outline" data-close-modal>Close</button>
     <button type="button" class="btn btn--primary" id="viewEditBtn">Edit Item</button>`);

  document.getElementById('viewEditBtn').addEventListener('click', () => {
    closeModal();
    setTimeout(() => openEditModal(id), 100);
  });
}

// ─────────────────────────────────────────────
// DELETE ITEM MODAL (DELETE /api/inventory/:id)
// ─────────────────────────────────────────────
function deleteItem(id) {
  const item = consumables.find((i) => i.id == id);
  if (!item) return;

  openModal('Delete Item',
    `<p>Are you sure you want to permanently delete <strong>${escHtml(item.name)}</strong> (${escHtml(item.sku)})?</p>
     <p style="margin-top:8px;color:#ef4444;font-size:13px;">This action cannot be undone.</p>
     <p class="modal-error" id="deleteError"></p>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Cancel</button>
     <button type="button" class="btn btn--primary" id="confirmDelete" style="background:#ef4444;border-color:#ef4444;" data-orig-text="Delete">Delete</button>`);

  document.getElementById('confirmDelete').addEventListener('click', async () => {
    setModalLoading('confirmDelete', true);
    try {
      await apiDeleteItem(id);
      showToast(`🗑️ Deleted "${item.name}".`, 'info');
      closeModal();
      await apiFetchInventory();
    } catch (err) {
      document.getElementById('deleteError').textContent = err.message;
      setModalLoading('confirmDelete', false);
    }
  });
}

// ─────────────────────────────────────────────
// LOW STOCK ALERTS MODAL (GET /api/inventory/alerts)
// ─────────────────────────────────────────────
async function openAlertsModal() {
  openModal('Low Stock Alerts', `<p style="color:#64748b;">Loading alerts...</p>`, '');
  try {
    const data   = await apiFetchAlerts();
    const alerts = data.alerts || [];

    const body = alerts.length
      ? `<p style="color:#f59e0b;margin-bottom:16px;">⚠ ${data.total_alerts} item(s) need attention</p>
         <div style="display:flex;flex-direction:column;gap:10px;">
           ${alerts.map((a) => `
             <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.18);
                         border-radius:10px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;">
               <div>
                 <div style="font-weight:600;font-size:14px;">${escHtml(a.item_name)}</div>
                 <div style="font-size:12px;color:#94a3b8;">SKU: ${escHtml(a.sku || '—')} · Stock: ${a.current_stock} / Min: ${a.reorder_point}</div>
               </div>
               <span style="background:${a.status === 'Out of Stock' ? '#ef4444' : '#f59e0b'};
                            color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">
                 ${escHtml(a.urgency)}
               </span>
             </div>`).join('')}
         </div>`
      : '<p style="color:#22c55e;text-align:center;padding:20px;">✅ All items are sufficiently stocked.</p>';

    $('#modalBody').innerHTML = body;
    $('#modalFooter').innerHTML = alerts.length
      ? `<button type="button" class="btn btn--outline" data-close-modal>Close</button>
         <button type="button" class="btn btn--primary" id="sendAlertsBtn">Send Email Alerts</button>`
      : `<button type="button" class="btn btn--primary" data-close-modal>Close</button>`;

    const sendBtn = document.getElementById('sendAlertsBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', async () => {
        sendBtn.disabled     = true;
        sendBtn.textContent  = 'Sending...';
        try {
          const res  = await fetch(`${API_BASE}/inventory/alerts/notify`, {
            method: 'POST',
            headers: getAuthHeaders(),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);
          showToast(`📧 Sent ${data.sent_count} alert email(s).`);
          closeModal();
        } catch (err) {
          showToast(err.message, 'error');
          sendBtn.disabled    = false;
          sendBtn.textContent = 'Send Email Alerts';
        }
      });
    }
  } catch (err) {
    $('#modalBody').innerHTML = `<p style="color:#ef4444;">Failed to load alerts: ${escHtml(err.message)}</p>`;
    $('#modalFooter').innerHTML = `<button type="button" class="btn btn--primary" data-close-modal>Close</button>`;
  }
}

// ─────────────────────────────────────────────
// REGISTER CONSUMABLE (sidebar quick-form)
// ─────────────────────────────────────────────
async function submitRegisterForm(e) {
  e.preventDefault();
  const name     = $('#itemName').value.trim();
  
  let category = '';
  if (categoryInputMode === 'select') {
    category = $('#itemCategory').value;
  } else {
    category = $('#itemCustomCategory').value.trim();
  }

  const minStock = parseFloat($('#minStock').value) || 0;

  if (!name) { showToast('Please enter an item name.', 'error'); return; }
  if (!category) { showToast('Please select or type a category.', 'error'); return; }

  const btn = e.target.querySelector('button[type="submit"]');
  const orig = btn.textContent;
  btn.disabled    = true;
  btn.textContent = 'Registering...';

  try {
    await apiCreateItem({
      item_name:     name,
      category:      category,
      reorder_point: minStock,
      unit:          'Units',
      current_stock: 0,
    });
    e.target.reset();
    if (categoryInputMode === 'custom') $('#toggleCategoryInputMode').click();
    $('#itemCustomCategory').value = '';
    showToast(`✅ Registered: "${name}"`);
    await apiFetchInventory();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = orig;
  }
}

// ─────────────────────────────────────────────
// ACTION MENU (per-row ⋮)
// ─────────────────────────────────────────────
function showActionMenu(id, btn) {
  actionTargetId = id;
  const menu = $('#actionMenu');
  const isManager = canManageInventory();
  const isAdmin   = canDeleteInventory();

  menu.innerHTML = `
    <button type="button" data-action="view">View Item</button>
    ${isManager ? '<button type="button" data-action="edit">Edit Item</button>' : ''}
    ${isManager ? '<button type="button" data-action="add">Add Stock</button>' : ''}
    ${isManager ? '<button type="button" data-action="remove">Remove Stock</button>' : ''}
    <button type="button" data-action="maintenance" style="color:#f59e0b;">Request Maintenance</button>
    ${isAdmin ? '<button type="button" data-action="delete" class="is-danger">Delete Item</button>' : ''}`;

  const rect       = btn.getBoundingClientRect();
  menu.style.top   = `${rect.bottom + window.scrollY + 4}px`;
  menu.style.left  = `${Math.max(8, rect.left - 130)}px`;
  menu.hidden      = false;
}

// ─────────────────────────────────────────────
// PURCHASE ORDER GENERATOR (alerts the most critical item)
// ─────────────────────────────────────────────
async function generatePurchaseOrder() {
  const critical = consumables
    .filter((i) => i.status !== 'In Stock')
    .sort((a, b) => a.qty - b.qty);

  if (!critical.length) {
    showToast('No items need restocking right now.', 'info');
    return;
  }

  const top    = critical[0];
  const needed = Math.max(0, top.minStock - top.qty + (top.monthly || top.minStock));

  openModal('Purchase Order',
    `<div style="margin-bottom:12px;">
       <p><strong>Item:</strong> ${escHtml(top.name)}</p>
       <p><strong>SKU:</strong> ${escHtml(top.sku)}</p>
       <p><strong>Current Stock:</strong> ${top.qty} ${escHtml(top.unit)}</p>
       <p><strong>Reorder Point:</strong> ${top.minStock}</p>
       <p><strong>Suggested Order Qty:</strong> ${needed} ${escHtml(top.unit)}</p>
       ${top.supplierEmail ? `<p><strong>Supplier:</strong> ${escHtml(top.supplierEmail)}</p>` : ''}
     </div>
     <p style="color:#64748b;font-size:13px;">Send a purchase order for this item?</p>`,
    `<button type="button" class="btn btn--outline" data-close-modal>Close</button>
     <button type="button" class="btn btn--primary" id="confirmPO">Generate PO</button>`);

  document.getElementById('confirmPO').addEventListener('click', () => {
    if (top.supplierEmail) {
      window.location.href = `mailto:${top.supplierEmail}?subject=Purchase Order – ${encodeURIComponent(top.name)}&body=Please supply ${needed} ${top.unit} of ${encodeURIComponent(top.name)} (SKU: ${encodeURIComponent(top.sku)}).`;
    } else {
      showToast(`PO generated for "${top.name}" (${needed} ${top.unit}). No supplier email on file.`, 'info');
    }
    closeModal();
  });
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────
function initEvents() {
  $('#exportBtn').addEventListener('click', exportInventory);
  $('#importBtn').addEventListener('click', openImportModal);
  $('#filterBtn').addEventListener('click', openFilterModal);
  $('#addStockBtn').addEventListener('click', openAddStockModal);

  $('#toggleCategoryInputMode')?.addEventListener('click', () => {
    const btn = $('#toggleCategoryInputMode');
    const select = $('#itemCategory');
    const customInput = $('#itemCustomCategory');

    if (categoryInputMode === 'select') {
      categoryInputMode = 'custom';
      btn.textContent = '📋 Choose from List';
      select.style.display = 'none';
      customInput.style.display = 'block';
      customInput.focus();
    } else {
      categoryInputMode = 'select';
      btn.textContent = '✍️ Type Custom';
      select.style.display = 'block';
      customInput.style.display = 'none';
    }
  });

  // Notification bell → show alerts modal
  const notifBtn = document.querySelector('.topbar__icon-btn--notifications');
  if (notifBtn) notifBtn.addEventListener('click', openAlertsModal);

  // Table search
  $('#tableFilter').addEventListener('input', (e) => {
    filters.search = e.target.value;
    currentPage    = 1;
    renderTable();
  });

  $('#clearSearchBtn').addEventListener('click', () => {
    filters.search         = '';
    $('#tableFilter').value = '';
    currentPage            = 1;
    renderTable();
    showToast('Search cleared.', 'info');
  });

  // Select all
  $('#selectAll').addEventListener('change', (e) => {
    document.querySelectorAll('.row-check').forEach((cb) => { cb.checked = e.target.checked; });
  });

  // Column sort
  document.querySelectorAll('.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      const keyMap = { name: 'name', category: 'category', qty: 'qty', status: 'status' };
      const mappedKey = keyMap[key] || key;
      if (sortKey === mappedKey) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortKey = mappedKey; sortDir = 'asc'; }
      renderTable();
    });
  });

  // Pagination
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

  // Row clicks: maintenance and action menu
  $('#consumablesBody').addEventListener('click', (e) => {
    const maintBtn = e.target.closest('.row-maintenance-direct-btn');
    if (maintBtn) {
      e.stopPropagation();
      const item = consumables.find((c) => c.id == maintBtn.dataset.id);
      if (item) window.location.href = `maintainance.html?item_name=${encodeURIComponent(item.name)}`;
      return;
    }
    const btn = e.target.closest('[data-action-menu]');
    if (!btn) return;
    e.stopPropagation();
    showActionMenu(parseInt(btn.dataset.actionMenu, 10), btn);
  });

  // Action menu clicks
  $('#actionMenu').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !actionTargetId) return;
    const action = btn.dataset.action;
    $('#actionMenu').hidden = true;
    if (action === 'view')        openViewModal(actionTargetId);
    else if (action === 'edit')   openEditModal(actionTargetId);
    else if (action === 'add')    openAdjustModal(actionTargetId, 'add');
    else if (action === 'remove') openAdjustModal(actionTargetId, 'remove');
    else if (action === 'delete') deleteItem(actionTargetId);
    else if (action === 'maintenance') {
      const item = consumables.find((c) => c.id == actionTargetId);
      if (item) window.location.href = `maintainance.html?item_name=${encodeURIComponent(item.name)}`;
    }
  });

  // Purchase order (stockout predictor button)
  $('#purchaseOrderBtn').addEventListener('click', generatePurchaseOrder);

  // Register form (sidebar quick-add)
  $('#registerForm').addEventListener('submit', submitRegisterForm);

  // Close modal on backdrop / data-close-modal
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu') && !e.target.closest('[data-action-menu]'))
      $('#actionMenu').hidden = true;
    if (e.target.matches('[data-close-modal]') || e.target === $('#modalBackdrop'))
      closeModal();
  });

  $('#modalCloseBtn').addEventListener('click', closeModal);
  $('#inventoryModal').addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });
}

// ─────────────────────────────────────────────
// TOPBAR INTEGRATION
// ─────────────────────────────────────────────
function initTopbarIntegration() {
  const topbarRoot  = $('#topbar-root');
  const searchInput = topbarRoot?.querySelector('#global-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filters.search         = e.target.value;
      $('#tableFilter').value = e.target.value;
      currentPage            = 1;
      renderTable();
    });
  }

  const quickAdd = topbarRoot?.querySelector('.topbar__quick-add');
  if (quickAdd) quickAdd.addEventListener('click', openAddStockModal);
}

// ─────────────────────────────────────────────
// UTILITY: XSS-safe escaping
// ─────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
async function initApp() {
  renderSidebar($('#sidebar-root'), { activeItem: 'inventory-management' });
  initSidebarNav($('#sidebar-root'));
  renderTopbar($('#topbar-root'), { searchPlaceholder: 'Search inventory, SKUs, or locations...' });
  initTopbarEvents($('#topbar-root'));
  initTopbarIntegration();
  initEvents();

  // Auth guard: redirect if no token
  if (!getToken()) {
    showToast('Please log in to access inventory.', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return;
  }

  // Role-based UI gating
  const role = getUserRole();
  const isManager = canManageInventory();

  // Hide Add Stock button for Staff
  const addBtn = $('#addStockBtn');
  if (addBtn && !isManager) addBtn.style.display = 'none';

  // Hide Import button for Staff
  const importBtn = $('#importBtn');
  if (importBtn && !isManager) importBtn.style.display = 'none';

  // Hide Register form submit for Staff
  const registerSubmit = document.querySelector('#registerForm button[type="submit"]');
  if (registerSubmit && !isManager) {
    registerSubmit.disabled = true;
    registerSubmit.title    = 'Requires Admin or Manager role';
    registerSubmit.style.opacity = '0.5';
  }

  // Show role badge in topbar area
  const roleColors = { Admin: '#6366f1', Manager: '#f59e0b', Staff: '#22c55e' };
  const roleBadge = document.createElement('span');
  roleBadge.style.cssText = `
    display:inline-flex;align-items:center;padding:3px 10px;
    background:${roleColors[role] || '#64748b'}22;
    color:${roleColors[role] || '#64748b'};
    border:1px solid ${roleColors[role] || '#64748b'}44;
    border-radius:20px;font-size:11px;font-weight:700;
    margin-left:8px;letter-spacing:0.5px;
  `;
  roleBadge.textContent = role.toUpperCase();
  const topbarRoot = $('#topbar-root');
  const userAvatar = topbarRoot?.querySelector('.topbar__user, .topbar__avatar, [class*="topbar__user"]');
  if (userAvatar) userAvatar.appendChild(roleBadge);

  // Load initial data
  showTableLoading();
  await apiFetchInventory();
}

document.addEventListener('DOMContentLoaded', initApp);
