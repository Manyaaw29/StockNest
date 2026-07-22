/**
 * StockNest — Maintenance Center Controller (PostgreSQL Connected)
 */

import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

// Authentication Check
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
const userString = localStorage.getItem('user') || sessionStorage.getItem('user');

if (!token) {
  console.warn('No authentication token found. Redirecting to login...');
  window.location.href = 'index.html';
}

const BACKEND_URL = 'http://localhost:5000/api';

// State
let tickets = [];
let assets = [];
let activeTicketId = null;
let activePriority = 'High';

// Filters & Sorting & Pagination State
let ticketFilters = { search: '', status: 'All', priority: 'All' };
let sortKey = 'deadline';
let sortDir = 'asc';
let currentPage = 1;
const PAGE_SIZE = 5;

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function showToast(message, type = 'success') {
  const container = $('#toastContainer');
  if (!container) {
    alert(message);
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// 1. Fetch Assets and Tickets from database
async function loadData() {
  try {
    // Fetch assets first (to resolve names/IDs in form submissions)
    const assetsRes = await fetch(`${BACKEND_URL}/assets`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (assetsRes.ok) {
      const assetsData = await assetsRes.json();
      assets = assetsData.assets;
    }

    // Fetch maintenance tickets
    const ticketsRes = await fetch(`${BACKEND_URL}/maintenance`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!ticketsRes.ok) throw new Error('Failed to load tickets from server.');

    const ticketsData = await ticketsRes.json();
    tickets = ticketsData.maintenance;

    renderTable();

  } catch (err) {
    console.error('Error loading data:', err);
    showToast(err.message, 'error');
  }
}

function getFilteredTickets() {
  let list = [...tickets];

  // 1. Search Query
  if (ticketFilters.search) {
    const q = ticketFilters.search.toLowerCase();
    list = list.filter(t => {
      const assetName = t.asset_name || '';
      const assetCode = t.asset_id ? `AST-${String(t.asset_id).padStart(4, '0')}` : 'N/A';
      const desc = t.description || '';
      const priority = t.priority || '';
      return (
        assetName.toLowerCase().includes(q) ||
        assetCode.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        priority.toLowerCase().includes(q)
      );
    });
  }

  // 2. Status Filter
  if (ticketFilters.status !== 'All') {
    list = list.filter(t => t.status === ticketFilters.status);
  }

  // 3. Priority Filter
  if (ticketFilters.priority !== 'All') {
    list = list.filter(t => t.priority === ticketFilters.priority);
  }

  // 4. Sorting
  list.sort((a, b) => {
    let va, vb;
    if (sortKey === 'asset') {
      va = a.asset_name || `Asset #${a.asset_id}`;
      vb = b.asset_name || `Asset #${b.asset_id}`;
    } else if (sortKey === 'priority') {
      const priorityWeight = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      va = priorityWeight[a.priority] || 0;
      vb = priorityWeight[b.priority] || 0;
    } else if (sortKey === 'status') {
      const statusWeight = { 'Pending': 1, 'In Progress': 2, 'Resolved': 3, 'Closed': 4 };
      va = statusWeight[a.status] || 0;
      vb = statusWeight[b.status] || 0;
    } else {
      // Default: deadline / date sorting
      va = a.deadline ? new Date(a.deadline).getTime() : 0;
      vb = b.deadline ? new Date(b.deadline).getTime() : 0;
    }

    if (typeof va === 'number') {
      return sortDir === 'asc' ? va - vb : vb - va;
    } else {
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    }
  });

  return list;
}

// 2. Render tickets to table
function renderTable() {
  const tbody = $('#maintenanceTableBody');
  if (!tbody) return;

  const filtered = getFilteredTickets();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:32px">No matching maintenance tickets found.</td></tr>`;
    $('#paginationInfo').textContent = 'Showing 0 entries';
    renderPagination(totalPages);
    return;
  }

  tbody.innerHTML = pageItems.map(t => {
    const targetName = t.room_name || t.item_name || `Ticket #${t.request_id}`;
    const targetType = t.room_id ? 'Space' : (t.inventory_id ? 'Consumable' : 'General');
    
    // Map status classes
    let statusClass = 'pending';
    if (t.status === 'In Progress') statusClass = 'scheduled';
    if (t.status === 'Resolved' || t.status === 'Closed') statusClass = 'scheduled';

    const formattedDate = t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline';

    return `
      <tr data-id="${t.request_id}">
        <td class="asset-cell">
          <span class="asset-icon">${t.room_id ? '🏢' : '📦'}</span>
          <div>
            <div class="asset-id" style="color:var(--accent-blue);font-weight:600;">${targetType}</div>
            <div class="asset-name" style="color:inherit;">${targetName}</div>
          </div>
        </td>
        <td><strong>${t.priority}</strong></td>
        <td>${formattedDate}</td>
        <td><span class="status ${statusClass}">${t.status}</span></td>
        <td class="action-cell">
          <button type="button" class="row-options-btn" data-id="${t.request_id}" style="background:none;border:none;font-size:16px;cursor:pointer;color:#9298a9;padding:6px 12px;">⋮</button>
        </td>
      </tr>
    `;
  }).join('');

  const end = Math.min(start + PAGE_SIZE, filtered.length);
  $('#paginationInfo').textContent = filtered.length
    ? `Showing ${start + 1} to ${end} of ${filtered.length} entries`
    : 'Showing 0 entries';

  renderPagination(totalPages);

  // Update header indicators
  document.querySelectorAll('th.sortable').forEach((th) => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.sort === sortKey) {
      th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  });
}

function renderPagination(totalPages) {
  const controls = $('#paginationControls');
  if (!controls) return;
  
  let html = `<button type="button" class="page-btn" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" class="page-btn${i === currentPage ? ' page-btn--active' : ''}" data-page="${i}">${i}</button>`;
  }

  html += `<button type="button" class="page-btn" data-page="next" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>`;
  controls.innerHTML = html;
}

// 3. Setup Priority Selector Buttons
function initPrioritySelector() {
  const buttons = $$('#reportPriorityGroup .priority-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePriority = btn.dataset.priority;

      // Update SLA Estimate Label
      const sla = $('#slaEstimate');
      if (sla) {
        if (activePriority === 'Critical') sla.textContent = '4 Hours';
        else if (activePriority === 'High') sla.textContent = '24 Hours';
        else sla.textContent = '3 - 5 Days';
      }
    });
  });
}

// 4. Create Maintenance Ticket Form Submit
async function submitTicket() {
  const assetIdentifier = $('#reportAssetInput').value.trim();
  const description = $('#reportDescInput').value.trim();

  if (!assetIdentifier || !description) {
    showToast('Please fill in Asset ID/Name and Description', 'error');
    return;
  }

  // Find matching asset
  const matchedAsset = assets.find(a => 
    a.name.toLowerCase().includes(assetIdentifier.toLowerCase()) ||
    String(a.asset_id) === assetIdentifier ||
    `AST-${String(a.asset_id).padStart(4, '0')}`.toLowerCase() === assetIdentifier.toLowerCase()
  );

  if (!matchedAsset) {
    showToast(`Could not find an asset matching "${assetIdentifier}". Check the Asset Registry first.`, 'error');
    return;
  }

  try {
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 7); // 7 days deadline

    const response = await fetch(`${BACKEND_URL}/maintenance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        asset_id: matchedAsset.asset_id,
        priority: activePriority,
        deadline: deadlineDate.toISOString().split('T')[0],
        description: description
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create ticket.');

    showToast(`Ticket successfully submitted for ${matchedAsset.name}!`);
    $('#reportAssetInput').value = '';
    $('#reportDescInput').value = '';
    loadData(); // Refresh list

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 5. Open & Handle Modals (Edit, Reschedule, Delete)
function openModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) modal.classList.add('open');
  $('#modalBackdrop').hidden = false;
}

function closeModal() {
  $$('.modal-overlay').forEach(m => m.classList.remove('open'));
  $('#modalBackdrop').hidden = true;
  activeTicketId = null;
}

function setupModalEvents() {
  // Cancel Buttons
  $('#rescheduleCancel').addEventListener('click', closeModal);
  $('#deleteCancel').addEventListener('click', closeModal);
  $('#editCancel').addEventListener('click', closeModal);

  // Backdrop click close
  $('#modalBackdrop').addEventListener('click', closeModal);

  // Reschedule Confirm
  $('#rescheduleConfirm').addEventListener('click', async () => {
    const newDate = $('#rescheduleDate').value;
    if (!newDate) {
      showToast('Please select a valid date.', 'error');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/maintenance/${activeTicketId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deadline: newDate })
      });

      if (!response.ok) throw new Error('Failed to reschedule ticket.');
      showToast('Service ticket rescheduled.');
      closeModal();
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Edit Confirm
  $('#editSave').addEventListener('click', async () => {
    const priority = $('#editPriority').value;
    const status = $('#editStatus').value;
    const description = $('#editDesc').value.trim();

    try {
      const response = await fetch(`${BACKEND_URL}/maintenance/${activeTicketId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priority, status, description })
      });

      if (!response.ok) throw new Error('Failed to update ticket.');
      showToast('Service ticket updated.');
      closeModal();
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Delete Confirm
  $('#deleteConfirm').addEventListener('click', async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/maintenance/${activeTicketId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete ticket.');
      showToast('Ticket deleted.', 'info');
      closeModal();
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// 6. Action Menu & Dropdowns Delegated Click Handlers
function setupDropdownListeners() {
  // Table options (⋮) click
  $('#maintenanceTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.row-options-btn');
    if (!btn) return;

    activeTicketId = parseInt(btn.dataset.id, 10);
    const ticket = tickets.find(t => t.request_id === activeTicketId);
    if (!ticket) return;

    const action = prompt('Choose action: "edit", "reschedule", or "delete":');
    if (!action) return;

    const lower = action.toLowerCase().trim();
    if (lower === 'edit') {
      $('#editAssetName').textContent = ticket.asset_name || `Asset #${ticket.asset_id}`;
      $('#editPriority').value = ticket.priority;
      $('#editStatus').value = ticket.status;
      $('#editDesc').value = ticket.description || '';
      openModal('editModal');
    } else if (lower === 'reschedule') {
      $('#rescheduleAssetName').textContent = ticket.asset_name || `Asset #${ticket.asset_id}`;
      $('#rescheduleDate').value = ticket.deadline ? ticket.deadline.split('T')[0] : '';
      openModal('rescheduleModal');
    } else if (lower === 'delete') {
      $('#deleteAssetName').textContent = ticket.asset_name || `Asset #${ticket.asset_id}`;
      openModal('deleteModal');
    } else {
      showToast('Invalid action selected.', 'error');
    }
  });

  // Refresh Form Trigger
  $('#refreshBtn').addEventListener('click', () => {
    $('#reportAssetInput').value = '';
    $('#reportDescInput').value = '';
    showToast('Form cleared.');
  });
}

// 7. CSV Export Generator
function exportToCSV() {
  if (tickets.length === 0) {
    showToast('No tickets available to export.', 'error');
    return;
  }

  const headers = ['Ticket ID', 'Asset ID', 'Asset Name', 'Priority', 'Deadline', 'Status', 'Created At'];
  const rows = tickets.map(t => [
    t.request_id,
    `AST-${String(t.asset_id).padStart(4, '0')}`,
    t.asset_name || `Asset #${t.asset_id}`,
    t.priority,
    t.deadline ? new Date(t.deadline).toLocaleDateString() : 'N/A',
    t.status,
    t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `StockNest_Maintenance_Log_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Maintenance log exported successfully (CSV)!');
}

function checkQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const assetId = params.get('asset_id');
  if (assetId) {
    const reportAssetInput = $('#reportAssetInput');
    if (reportAssetInput) {
      reportAssetInput.value = assetId;
      // Scroll to the report issue card
      const section = $('.report-issue');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
}

function initQueryFilters() {
  // Search
  $('#ticketSearchInput')?.addEventListener('input', (e) => {
    ticketFilters.search = e.target.value.trim();
    currentPage = 1;
    renderTable();
  });

  $('#clearTicketSearch')?.addEventListener('click', () => {
    const input = $('#ticketSearchInput');
    if (input) input.value = '';
    ticketFilters.search = '';
    currentPage = 1;
    renderTable();
    showToast('Search query cleared.', 'info');
  });

  // Status select
  $('#statusFilter')?.addEventListener('change', (e) => {
    ticketFilters.status = e.target.value;
    currentPage = 1;
    renderTable();
  });

  // Priority select
  $('#priorityFilter')?.addEventListener('change', (e) => {
    ticketFilters.priority = e.target.value;
    currentPage = 1;
    renderTable();
  });

  // Reset button
  $('#resetTicketFilters')?.addEventListener('click', () => {
    const sInput = $('#ticketSearchInput');
    if (sInput) sInput.value = '';
    const statusSel = $('#statusFilter');
    if (statusSel) statusSel.value = 'All';
    const prioritySel = $('#priorityFilter');
    if (prioritySel) prioritySel.value = 'All';

    ticketFilters = { search: '', status: 'All', priority: 'All' };
    currentPage = 1;
    renderTable();
    showToast('Ticket filters reset.', 'info');
  });

  // Pagination controls delegated click
  $('#paginationControls')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    const totalPages = Math.ceil(getFilteredTickets().length / PAGE_SIZE);
    if (btn.dataset.page === 'prev') currentPage--;
    else if (btn.dataset.page === 'next') currentPage++;
    else currentPage = parseInt(btn.dataset.page, 10);
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    renderTable();
  });

  // Sorting columns
  document.querySelectorAll('th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortKey === key) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDir = 'asc';
      }
      renderTable();
    });
  });
}

// Initialise App
async function initApp() {
  renderSidebar($('#sidebar-root'), { activeItem: 'maintenance' });
  initSidebarNav($('#sidebar-root'));
  renderTopbar($('#topbar-root'), { searchPlaceholder: 'Search maintenance tickets...' });
  initTopbarEvents($('#topbar-root'));

  initPrioritySelector();
  setupModalEvents();
  setupDropdownListeners();
  initQueryFilters();

  $('#submitTicketBtn').addEventListener('click', submitTicket);
  $('#exportBtn').addEventListener('click', exportToCSV);

  await loadData();
  checkQueryParams();
}

document.addEventListener('DOMContentLoaded', initApp);
