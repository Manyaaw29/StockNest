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

// 2. Render tickets to table
function renderTable() {
  const tbody = $('#maintenanceTableBody');
  if (!tbody) return;

  if (tickets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:32px">No maintenance tickets logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = tickets.map(t => {
    const assetName = t.asset_name || `Asset #${t.asset_id}`;
    const assetCode = t.asset_id ? `AST-${String(t.asset_id).padStart(4, '0')}` : 'N/A';
    
    // Map status classes
    let statusClass = 'pending';
    if (t.status === 'In Progress') statusClass = 'scheduled';
    if (t.status === 'Resolved' || t.status === 'Closed') statusClass = 'scheduled';

    const formattedDate = t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline';

    return `
      <tr data-id="${t.request_id}">
        <td class="asset-cell">
          <span class="asset-icon">🛠</span>
          <div>
            <div class="asset-id">${assetCode}</div>
            <div class="asset-name">${assetName}</div>
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
        deadline: deadlineDate.toISOString().split('T')[0]
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

    try {
      const response = await fetch(`${BACKEND_URL}/maintenance/${activeTicketId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priority, status })
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

// Initialise App
function initApp() {
  renderSidebar($('#sidebar-root'), { activeItem: 'maintenance' });
  initSidebarNav($('#sidebar-root'));
  renderTopbar($('#topbar-root'), { searchPlaceholder: 'Search maintenance tickets...' });
  initTopbarEvents($('#topbar-root'));

  initPrioritySelector();
  setupModalEvents();
  setupDropdownListeners();

  $('#submitTicketBtn').addEventListener('click', submitTicket);

  loadData();
}

document.addEventListener('DOMContentLoaded', initApp);
