import { requireAuth, apiFetch } from './sn_common.js';
import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // ── Layout ─────────────────────────────────────────────────────────────────
  const sidebarRoot = document.getElementById('sidebar-root');
  const topbarRoot  = document.getElementById('topbar-root');
  if (sidebarRoot) { renderSidebar(sidebarRoot, { activeItem: 'maintenance' }); initSidebarNav(sidebarRoot); }
  if (topbarRoot)  { renderTopbar(topbarRoot, { searchPlaceholder: 'Search requests...' }); initTopbarEvents(topbarRoot); }

  // ── DOM Refs ───────────────────────────────────────────────────────────────
  const tableBody   = document.getElementById('maintenanceTableBody') || document.querySelector('tbody');
  const toast       = (msg, type = 'success') => window.snToast ? snToast(msg, { type }) : alert(msg);

  // ── Status Badge ───────────────────────────────────────────────────────────
  function statusBadge(status) {
    const map = {
      'Pending':     { bg: '#fef9c3', color: '#ca8a04' },
      'In Progress': { bg: '#dbeafe', color: '#2563eb' },
      'Resolved':    { bg: '#dcfce7', color: '#16a34a' },
      'Closed':      { bg: '#f3f4f6', color: '#6b7280' },
    };
    const s = map[status] || { bg: '#f3f4f6', color: '#6b7280' };
    return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:${s.bg};color:${s.color};">${status}</span>`;
  }

  function priorityBadge(priority) {
    const map = {
      'High':   { bg: '#fee2e2', color: '#dc2626' },
      'Medium': { bg: '#ffedd5', color: '#ea580c' },
      'Low':    { bg: '#dcfce7', color: '#16a34a' },
    };
    const s = map[priority] || { bg: '#f3f4f6', color: '#6b7280' };
    return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${s.bg};color:${s.color};">${priority || '—'}</span>`;
  }

  // ── Load maintenance requests ──────────────────────────────────────────────
  async function loadMaintenance() {
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#9ca3af;">Loading...</td></tr>`;
    try {
      const res  = await apiFetch('/api/maintenance');
      const data = await res.json();
      const items = data.requests || data.maintenance || [];

      // Update stat counters
      const total             = items.length;
      const pendingAndProgress = items.filter(i => i.status === 'Pending' || i.status === 'In Progress').length;
      const resolved          = items.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;
      const criticalAndHigh   = items.filter(i => i.priority === 'Critical' || i.priority === 'High').length;
      
      const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      setEl('statTotalTickets', total); 
      setEl('statPendingTickets', pendingAndProgress);
      setEl('statCriticalTickets', criticalAndHigh);
      
      // Operational Health: start at 100, deduct per open ticket by priority
      // Critical: -1.75, High: -1.5, Medium: -1.25, Low: -1.0
      const DEDUCTIONS = { 'Critical': 1.75, 'High': 1.5, 'Medium': 1.25, 'Low': 1.0 };
      let health = 100;
      items.forEach(item => {
        if (item.status === 'Resolved' || item.status === 'Closed') return; // no deduction for resolved
        const deduct = DEDUCTIONS[item.priority] ?? 1.0;
        health -= deduct;
      });
      health = Math.round(Math.max(0, Math.min(100, health)));
      setEl('healthPercentage', `${health}%`);
      
      const healthBar = document.getElementById('healthBarFill');
      if (healthBar) {
        healthBar.style.strokeDasharray = `${health}, 100`;
        if (health >= 70) healthBar.style.stroke = '#10b981';      // Green
        else if (health >= 40) healthBar.style.stroke = '#f59e0b'; // Amber
        else healthBar.style.stroke = '#ef4444';                   // Red
      }

      if (items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#9ca3af;">No maintenance requests found.</td></tr>`;
        return;
      }

      tableBody.innerHTML = items.map(item => {
        const deadline = item.deadline ? new Date(item.deadline).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
        return `
          <tr>
            <td>
              <div style="font-weight:600;color:#0f172a;">${item.room_name || item.item_name || '—'}</div>
              <div style="font-size:11px;color:#9ca3af;font-family:monospace;margin-top:2px;">#REQ-${item.request_id}</div>
            </td>
            <td style="color:#334155;">${item.description ? item.description.slice(0, 60) + (item.description.length > 60 ? '…' : '') : '—'}</td>
            <td>${priorityBadge(item.priority)}</td>
            <td>${deadline}</td>
            <td>${statusBadge(item.status)}</td>
            <td>
              <button class="btn btn--outline btn-edit-maint" data-id="${item.request_id}" data-status="${item.status}"
                style="padding:5px 12px;font-size:12px;cursor:pointer;">Edit</button>
            </td>
          </tr>`;
      }).join('');

      // Bind edit buttons
      document.querySelectorAll('.btn-edit-maint').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id, btn.dataset.status));
      });

    } catch (e) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#ef4444;">Error: ${e.message}</td></tr>`;
    }
  }

  // ── Edit Modal ──────────────────────────────────────────────────
  function openEditModal(id, currentStatus) {
    const editModal = document.getElementById('editModal');
    const editStatus = document.getElementById('editStatus');
    if (editStatus) editStatus.value = currentStatus;
    if (editModal) editModal.classList.add('open');

    document.getElementById('editSave')?.addEventListener('click', async () => {
      const newStatus = editStatus?.value;
      const newDesc   = document.getElementById('editDesc')?.value;
      try {
        const res = await apiFetch(`/api/maintenance/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus, description: newDesc })
        });
        if (!res.ok) throw new Error('Update failed');
        toast('Request updated!', 'success');
        if (editModal) editModal.classList.remove('open');
        loadMaintenance();
      } catch (e) { toast(e.message, 'error'); }
    }, { once: true });
  }

  document.getElementById('editCancel')?.addEventListener('click', () => {
    document.getElementById('editModal')?.classList.remove('open');
  });

  // ── Load Dropdown Options ──────────────────────────────────────────────────
  async function loadOptions() {
    try {
      const [roomsRes, invRes] = await Promise.all([
        apiFetch('/api/rooms'),
        apiFetch('/api/inventory')
      ]);
      const roomsData = await roomsRes.json();
      const invData = await invRes.json();
      
      const spaceSelect = document.getElementById('reportSpaceSelect');
      if (spaceSelect && roomsData.rooms) {
        spaceSelect.innerHTML = '<option value="">Choose Space</option>' + 
          roomsData.rooms.map(r => `<option value="${r.room_id}">${r.room_name}</option>`).join('');
      }
      
      const invSelect = document.getElementById('reportInventorySelect');
      if (invSelect && invData.inventory) {
        invSelect.innerHTML = '<option value="">Choose Consumable</option>' + 
          invData.inventory.map(i => `<option value="${i.inventory_id}">${i.item_name}</option>`).join('');
      }
    } catch (e) {
      console.error('Failed to load options', e);
    }
  }

  // ── Create Request Logic ───────────────────────────────────────────────────
  const btnSpace = document.getElementById('btnSelectSpace');
  const btnInv = document.getElementById('btnSelectInventory');
  const groupSpace = document.getElementById('spaceSelectGroup');
  const groupInv = document.getElementById('inventorySelectGroup');
  
  let currentCategory = 'Space';
  
  if (btnSpace && btnInv) {
    btnSpace.addEventListener('click', () => {
      currentCategory = 'Space';
      btnSpace.classList.add('active');
      btnInv.classList.remove('active');
      groupSpace.style.display = 'block';
      groupInv.style.display = 'none';
      document.getElementById('reportInventorySelect').value = '';
    });
    btnInv.addEventListener('click', () => {
      currentCategory = 'Consumable';
      btnInv.classList.add('active');
      btnSpace.classList.remove('active');
      groupInv.style.display = 'block';
      groupSpace.style.display = 'none';
      document.getElementById('reportSpaceSelect').value = '';
    });
  }

  const priorityBtns = document.querySelectorAll('.priority-btn');
  let currentPriority = 'High';
  priorityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      priorityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPriority = btn.dataset.priority;
    });
  });

  const submitBtn = document.getElementById('submitTicketBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const issueType = document.getElementById('reportIssueType')?.value;
      const detailedDesc = document.getElementById('reportDesc')?.value;
      const roomId = document.getElementById('reportSpaceSelect')?.value;
      const invId = document.getElementById('reportInventorySelect')?.value;
      
      if (currentCategory === 'Space' && !roomId) return toast('Please select a space', 'error');
      if (currentCategory === 'Consumable' && !invId) return toast('Please select an item', 'error');
      
      const payload = {
        description: detailedDesc ? `${issueType} - ${detailedDesc}` : issueType,
        priority: currentPriority,
        room_id: roomId || null,
        inventory_id: invId || null,
        deadline: null
      };
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      try {
        const res = await apiFetch('/api/maintenance', { method: 'POST', body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Failed to create request');
        toast('Maintenance request created!', 'success');
        
        document.getElementById('reportSpaceSelect').value = '';
        document.getElementById('reportInventorySelect').value = '';
        
        loadMaintenance();
      } catch (e) { 
        toast(e.message, 'error'); 
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '▷ Submit Ticket';
      }
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  loadMaintenance();
  loadOptions();
});
