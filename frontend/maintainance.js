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

const BACKEND_URL = 'https://stocknest-rpcw.onrender.com/api';

// State
let tickets = [];
let rooms = [];
let inventory = [];
let currentCategory = 'Space';
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

// 1. Fetch Rooms, Inventory and Tickets from database
async function loadData() {
  try {
    const [roomsRes, inventoryRes, ticketsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/rooms`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${BACKEND_URL}/inventory`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${BACKEND_URL}/maintenance`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    if (roomsRes.ok) {
      const roomsData = await roomsRes.json();
      rooms = roomsData.rooms || [];
      const spaceSelect = $('#reportSpaceSelect');
      if (spaceSelect) {
        spaceSelect.innerHTML = '<option value="">-- Choose Space --</option>' +
          rooms.map(r => `<option value="${r.room_id}">${r.room_name} (${r.floor || 'N/A'})</option>`).join('');
      }
    }

    if (inventoryRes.ok) {
      const invData = await inventoryRes.json();
      inventory = invData.inventory || [];
      const invSelect = $('#reportInventorySelect');
      if (invSelect) {
        invSelect.innerHTML = '<option value="">-- Choose Consumable --</option>' +
          inventory.map(i => `<option value="${i.inventory_id}">${i.item_name}</option>`).join('');
      }
    }

    if (ticketsRes.ok) {
      const ticketsData = await ticketsRes.json();
      tickets = ticketsData.maintenance || [];
    } else {
      throw new Error('Failed to load tickets from server.');
    }

    renderTable();

  } catch (err) {
    console.error('Error loading data:', err);
    showToast(err.message, 'error');
  }
}

function getFilteredTickets() {
  let list = [...tickets];

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
      va = a.room_name || a.item_name || `Ticket #${a.request_id}`;
      vb = b.room_name || b.item_name || `Ticket #${b.request_id}`;
    } else if (sortKey === 'priority') {
      const priorityWeight = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      va = priorityWeight[a.priority] || 0;
      vb = priorityWeight[b.priority] || 0;
    } else if (sortKey === 'status') {
      const statusWeight = { 'Pending': 1, 'In Progress': 2, 'Resolved': 3, 'Closed': 4 };
      va = statusWeight[a.status] || 0;
      vb = statusWeight[b.status] || 0;
    } else {
      // Default: deadline sorting
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

// 2. Render tickets to table and update metrics
function renderTable() {
  const tbody = $('#maintenanceTableBody');
  if (!tbody) return;

  const filtered = getFilteredTickets();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center;padding:32px">No matching maintenance tickets found.</td></tr>`;
    $('#paginationInfo').textContent = 'Showing 0 entries';
    renderPagination(totalPages);
    updateOverviewStats();
    return;
  }

  tbody.innerHTML = pageItems.map(t => {
    let targetName = t.room_name || t.item_name;
    let targetType = t.room_id ? 'Space' : (t.inventory_id ? 'Consumable' : 'General');

    if (!targetName && t.description) {
      if (t.description.startsWith('[Custom Space: ')) {
        targetType = 'Space (Custom)';
        const endIdx = t.description.indexOf(']');
        targetName = t.description.substring(15, endIdx);
      } else if (t.description.startsWith('[Custom Item: ')) {
        targetType = 'Consumable (Custom)';
        const endIdx = t.description.indexOf(']');
        targetName = t.description.substring(14, endIdx);
      }
    }
    if (!targetName) targetName = `Ticket #${t.request_id}`;

    // Map status classes
    let statusClass = 'pending';
    if (t.status === 'In Progress') statusClass = 'scheduled';
    if (t.status === 'Resolved' || t.status === 'Closed') statusClass = 'scheduled';

    const formattedDate = t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline';

    // Map Priority Colors
    let priorityColor = '#16a34a'; // Low (Green)
    if (t.priority === 'Critical') priorityColor = '#ef4444'; // Red
    else if (t.priority === 'High') priorityColor = '#f59e0b'; // Orange
    else if (t.priority === 'Medium') priorityColor = 'var(--accent-blue)'; // Blue

    // Clean Description
    let cleanDesc = t.description || '-';
    if (cleanDesc.startsWith('[')) {
      const closingBracket = cleanDesc.indexOf(']');
      if (closingBracket !== -1) {
        cleanDesc = cleanDesc.substring(closingBracket + 1).trim();
      }
    }

    return `
      <tr data-id="${t.request_id}">
        <td class="asset-cell">
          <span class="asset-icon">${t.room_id ? '🏢' : '📦'}</span>
          <div>
            <div class="asset-name" style="color:var(--text-main);font-weight:600;">${targetName}</div>
            <div class="asset-id" style="color:var(--text-muted);font-size:12px;">${targetType}</div>
          </div>
        </td>
        <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${cleanDesc}">
          ${cleanDesc}
        </td>
        <td style="color:${priorityColor}; font-weight:600;">${t.priority}</td>
        <td>${formattedDate}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span class="status ${statusClass}" style="white-space: nowrap;">${t.status}</span>
            ${t.status !== 'Closed' 
              ? `<select class="status-dropdown text-input" data-id="${t.request_id}" style="-webkit-appearance: none; -moz-appearance: none; appearance: none; padding: 0 4px; border: none; font-size: 11px; background: transparent; cursor: pointer; color: var(--text-muted); outline: none;" title="Change Status">
                   <option value="" disabled selected>▼</option>
                   ${t.status !== 'Pending' ? '<option value="Pending">Pending</option>' : ''}
                   ${t.status !== 'In Progress' ? '<option value="In Progress">In Progress</option>' : ''}
                   ${t.status !== 'Resolved' ? '<option value="Resolved">Resolved</option>' : ''}
                   <option value="Closed">Closed</option>
                 </select>`
              : ''
            }
          </div>
        </td>
        <td class="action-cell">
          <button type="button" class="delete-ticket-btn" data-id="${t.request_id}" style="background:none;border:none;cursor:pointer;color:#64748b;padding:4px 8px;display:flex;align-items:center;transition:color 0.15s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#64748b'" title="Delete Ticket">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
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

  updateOverviewStats();
}

function updateOverviewStats() {
  const totalTickets = tickets.length;
  const pendingTickets = tickets.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
  const criticalTickets = tickets.filter(t => (t.priority === 'Critical' || t.priority === 'High') && (t.status === 'Pending' || t.status === 'In Progress')).length;

  let healthPct = 100;
  if (pendingTickets > 0) {
    const openCritical = tickets.filter(t => t.priority === 'Critical' && (t.status === 'Pending' || t.status === 'In Progress')).length;
    const openHigh = tickets.filter(t => t.priority === 'High' && (t.status === 'Pending' || t.status === 'In Progress')).length;
    const openMed = tickets.filter(t => t.priority === 'Medium' && (t.status === 'Pending' || t.status === 'In Progress')).length;
    const openLow = tickets.filter(t => t.priority === 'Low' && (t.status === 'Pending' || t.status === 'In Progress')).length;
    
    // Each critical ticket drops health by 1%, High by 0.75%, Medium by 0.5%, Low by 0.25%
    let penalty = (openCritical * 1) + (openHigh * 0.75) + (openMed * 0.5) + (openLow * 0.25);
    healthPct = Math.max(0, Math.round(100 - penalty));
  }

  const elTotal = $('#statTotalTickets');
  const elPending = $('#statPendingTickets');
  const elCritical = $('#statCriticalTickets');
  const elPct = $('#healthPercentage');
  const elFill = $('#healthBarFill');

  if (elTotal) elTotal.textContent = totalTickets;
  if (elPending) elPending.textContent = pendingTickets;
  if (elCritical) elCritical.textContent = criticalTickets;
  if (elPct) elPct.textContent = healthPct + '%';
  if (elFill) {
    if (elFill.tagName.toLowerCase() === 'path') {
      elFill.style.strokeDasharray = `${healthPct}, 100`;
      elFill.style.stroke = healthPct < 50 ? '#ef4444' : (healthPct < 80 ? '#f59e0b' : '#10b981');
    } else {
      elFill.style.width = healthPct + '%';
    }
  }
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
        else if (activePriority === 'Medium') sla.textContent = '48 Hours';
        else sla.textContent = '3 - 5 Days';
      }
    });
  });
}

// 4. Create Maintenance Ticket Form Submit
async function submitTicket() {
  const issueType = $('#reportIssueType') ? $('#reportIssueType').value : 'General';
  let description = issueType;

  let body = {
    priority: activePriority,
  };

  const deadlineDate = new Date();
  if (activePriority === 'Critical') {
    deadlineDate.setHours(deadlineDate.getHours() + 4);
  } else if (activePriority === 'High') {
    deadlineDate.setDate(deadlineDate.getDate() + 1);
  } else {
    deadlineDate.setDate(deadlineDate.getDate() + 5);
  }
  body.deadline = deadlineDate.toISOString().split('T')[0];

  if (currentCategory === 'Space') {
    const roomId = $('#reportSpaceSelect').value;
    if (!roomId) {
      showToast('Please select a space/room.', 'error');
      return;
    }
    body.room_id = parseInt(roomId, 10);
  } else {
    const invId = $('#reportInventorySelect').value;
    if (!invId) {
      showToast('Please select a consumable item.', 'error');
      return;
    }
    body.inventory_id = parseInt(invId, 10);
  }

  body.description = description;

  try {
    const response = await fetch(`${BACKEND_URL}/maintenance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create ticket.');

    showToast(`Ticket successfully submitted!`);
    if ($('#reportSpaceSelect')) $('#reportSpaceSelect').value = '';
    if ($('#reportInventorySelect')) $('#reportInventorySelect').value = '';
    if ($('#reportIssueType')) $('#reportIssueType').value = 'Hardware / Repair';
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
  // Inline Status Change Dropdown
  $('#maintenanceTableBody').addEventListener('change', async (e) => {
    if (e.target.classList.contains('status-dropdown')) {
      const ticketId = parseInt(e.target.dataset.id, 10);
      const newStatus = e.target.value;
      const ticket = tickets.find(t => t.request_id === ticketId);
      if (!ticket) return;
      
      try {
        const response = await fetch(`${BACKEND_URL}/maintenance/${ticketId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) throw new Error('Failed to update status');
        showToast('Status updated successfully!');
        loadData();
      } catch (err) {
        showToast(err.message, 'error');
        e.target.value = ticket.status; // Revert on failure
      }
    }
  });

  // Table delete click
  $('#maintenanceTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('.delete-ticket-btn');
    if (!btn) return;

    const ticketId = parseInt(btn.dataset.id, 10);
    const ticket = tickets.find(t => t.request_id === ticketId);
    if (!ticket) return;

    if (!confirm(`Are you sure you want to permanently delete this maintenance log for ${ticket.room_name || ticket.item_name || 'Ticket #' + ticket.request_id}?`)) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/maintenance/${ticketId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(()=>({}));
        throw new Error(errData.message || 'Failed to delete ticket.');
      }
      
      showToast('Maintenance log permanently deleted.');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// 7. CSV Export Generator
function exportToCSV() {
  if (tickets.length === 0) {
    showToast('No tickets available to export.', 'error');
    return;
  }

  const headers = ['Ticket ID', 'Type', 'Target Name', 'Priority', 'Deadline', 'Status', 'Created At'];
  const rows = tickets.map(t => [
    t.request_id,
    t.room_id ? 'Space' : 'Consumable',
    t.room_name || t.item_name || 'N/A',
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

function initQueryFilters() {
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

function initCategorySelectors() {
  const btnSpace = $('#btnSelectSpace');
  const btnInventory = $('#btnSelectInventory');
  const groupSpace = $('#spaceSelectGroup');
  const groupInventory = $('#inventorySelectGroup');
  const reportIssueType = $('#reportIssueType');

  const spaceOptions = `
    <option value="Hardware / Repair">🔧 Hardware / Repair</option>
    <option value="Cleaning / Housekeeping">🧹 Cleaning</option>
    <option value="IT / Network Support">💻 IT / Network</option>
    <option value="General Checkup">📋 General Checkup</option>
  `;

  const inventoryOptions = `
    <option value="Restock Required">📦 Restock Required</option>
    <option value="Item Damaged">⚠️ Item Damaged</option>
    <option value="Quality Issue">📉 Quality Issue</option>
    <option value="General Inquiry">💬 General Inquiry</option>
  `;

  btnSpace?.addEventListener('click', () => {
    btnSpace.classList.add('active');
    btnInventory.classList.remove('active');
    if (groupSpace) groupSpace.style.display = 'block';
    if (groupInventory) groupInventory.style.display = 'none';
    if (reportIssueType) reportIssueType.innerHTML = spaceOptions;
    currentCategory = 'Space';
  });

  btnInventory?.addEventListener('click', () => {
    btnInventory.classList.add('active');
    btnSpace.classList.remove('active');
    if (groupInventory) groupInventory.style.display = 'block';
    if (groupSpace) groupSpace.style.display = 'none';
    if (reportIssueType) reportIssueType.innerHTML = inventoryOptions;
    currentCategory = 'Consumable';
  });
}

// Initialise App
async function initApp() {
  renderSidebar($('#sidebar-root'), { activeItem: 'maintenance' });
  initSidebarNav($('#sidebar-root'));
  renderTopbar($('#topbar-root'), { searchPlaceholder: 'Search maintenance tickets...' });
  initTopbarEvents($('#topbar-root'));

  initCategorySelectors();
  initPrioritySelector();
  setupModalEvents();
  setupDropdownListeners();
  initQueryFilters();

  $('#submitTicketBtn').addEventListener('click', submitTicket);
  $('#exportBtn').addEventListener('click', exportToCSV);

  await loadData();

  // Check URL parameters for dynamic inventory pre-selection
  const urlParams = new URLSearchParams(window.location.search);
  const targetItemName = urlParams.get('item_name');
  if (targetItemName) {
    // Switch select view to Consumables
    const btnSpace = $('#btnSelectSpace');
    const btnInventory = $('#btnSelectInventory');
    const groupSpace = $('#spaceSelectGroup');
    const groupInventory = $('#inventorySelectGroup');
    
    if (btnInventory && btnSpace) {
      btnInventory.classList.add('active');
      btnSpace.classList.remove('active');
    }
    if (groupInventory) groupInventory.style.display = 'block';
    if (groupSpace) groupSpace.style.display = 'none';
    currentCategory = 'Consumable';

    // Select the matched option by substring match on item_name
    const reportInventorySelect = $('#reportInventorySelect');
    if (reportInventorySelect) {
      const option = Array.from(reportInventorySelect.options).find(opt => 
        opt.textContent.toLowerCase().includes(targetItemName.toLowerCase())
      );
      if (option) {
        reportInventorySelect.value = option.value;
      }
    }
    
    // Smooth scroll down to the request ticket card
    const ticketCard = document.querySelector('.raise-ticket');
    if (ticketCard) {
      ticketCard.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

document.addEventListener('DOMContentLoaded', initApp);
