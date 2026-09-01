import { requireAuth, apiFetch } from './sn_common.js';
import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // ── Layout ────────────────────────────────────────────────────────────────
  const sidebarRoot = document.getElementById('sidebar-root');
  const topbarRoot  = document.getElementById('topbar-root');
  if (sidebarRoot) { renderSidebar(sidebarRoot, { activeItem: 'room-allocation-transfer' }); initSidebarNav(sidebarRoot); }
  if (topbarRoot)  { renderTopbar(topbarRoot, { searchPlaceholder: 'Search assets...' }); initTopbarEvents(topbarRoot); }

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const focusRoomSelect   = document.getElementById('focus-room');
  const assetSearch       = document.getElementById('asset-search');
  const assetTableBody    = document.getElementById('asset-table-body');
  const transferDest      = document.getElementById('transfer-destination');
  const transferReason    = document.getElementById('transfer-reason');
  const transferDetails   = document.getElementById('transfer-details');
  const transferForm      = document.getElementById('transfer-form');
  const confirmTransferBtn= document.getElementById('btn-confirm-transfer');
  const selectedAssetCard = document.getElementById('selected-asset-card');
  const transferAssetId   = document.getElementById('transfer-asset-id');
  const transferAssetName = document.getElementById('transfer-asset-name');
  const transferAssetNameDisplay = document.getElementById('transfer-asset-name-display');
  const transferAssetIdDisplay   = document.getElementById('transfer-asset-id-display');
  const clearSelectionBtn = document.getElementById('btn-clear-selection');
  const timeline          = document.getElementById('transfer-timeline');
  const statTotalAssets   = document.getElementById('stat-total-assets');
  const statRoomCapacity  = document.getElementById('stat-room-capacity');
  const statTransfers     = document.getElementById('stat-transfers');
  const registerModal     = document.getElementById('register-modal');
  const registerForm      = document.getElementById('register-form');
  const btnOpenRegister   = document.getElementById('btn-open-register');
  const btnCloseRegister  = document.getElementById('btn-close-register');
  const btnCancelRegister = document.getElementById('btn-cancel-register');

  let allRooms = [];
  let allAssets = [];
  let selectedAsset = null;

  // ── Helper: toast ─────────────────────────────────────────────────────────
  function toast(msg, type = 'success') {
    if (window.snToast) snToast(msg, { type });
    else alert(msg);
  }

  // ── Load all rooms ─────────────────────────────────────────────────────────
  async function loadRooms() {
    try {
      const res = await apiFetch('/api/rooms');
      const data = await res.json();
      allRooms = data.rooms || [];

      focusRoomSelect.innerHTML = `<option value="">-- Select a room --</option>` +
        allRooms.map(r => `<option value="${r.room_id}">${r.room_name} (${r.category || 'General'})</option>`).join('');

      transferDest.innerHTML = `<option value="" disabled selected>Select destination...</option>` +
        allRooms.map(r => `<option value="${r.room_id}">${r.room_name}</option>`).join('');
    } catch (e) {
      focusRoomSelect.innerHTML = `<option value="">Failed to load rooms</option>`;
      console.error('Load rooms error:', e);
    }
  }

  // ── Load assets for selected room ─────────────────────────────────────────
  async function loadAssetsForRoom(roomId) {
    if (!roomId) {
      assetTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:32px;">Select a room to view assets.</td></tr>`;
      statTotalAssets.textContent = '--';
      statRoomCapacity.textContent = '--';
      timeline.innerHTML = `<li class="timeline-item"><div class="timeline-desc">Select a room to view history.</div></li>`;
      return;
    }

    assetTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:32px;">Loading assets…</td></tr>`;

    try {
      const [assetsRes, historyRes] = await Promise.all([
        apiFetch(`/api/assets/room/${roomId}`),
        apiFetch(`/api/assets/room/${roomId}/history`)
      ]);

      const assetsData  = await assetsRes.json();
      const historyData = await historyRes.json();

      allAssets = assetsData.assets || [];
      const history = historyData.history || [];

      // Update stats
      statTotalAssets.textContent = allAssets.length;
      const room = allRooms.find(r => String(r.room_id) === String(roomId));
      statRoomCapacity.textContent = room?.capacity ?? '--';
      statTransfers.textContent = history.length;

      renderAssetTable(allAssets);
      renderHistory(history);

    } catch (e) {
      assetTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ef4444;">Error loading assets: ${e.message}</td></tr>`;
    }
  }

  // ── Render asset table ────────────────────────────────────────────────────
  function renderAssetTable(assets) {
    const query = (assetSearch?.value || '').toLowerCase();
    const filtered = query
      ? assets.filter(a => (a.name || '').toLowerCase().includes(query) || (a.category || '').toLowerCase().includes(query))
      : assets;

    if (filtered.length === 0) {
      assetTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:32px;">No assets found${query ? ' matching "' + query + '"' : ' in this room'}.</td></tr>`;
      return;
    }

    assetTableBody.innerHTML = filtered.map(a => {
      const statusColor = a.status === 'Active' ? '#d1fae5' : '#fee2e2';
      const statusText  = a.status === 'Active' ? '#059669' : '#ef4444';
      return `
        <tr>
          <td style="font-size:12px;color:#9ca3af;">#${a.asset_id}</td>
          <td style="font-weight:500;color:#111827;">${a.name}</td>
          <td style="color:#6b7280;">${a.category || '—'}</td>
          <td><span style="display:inline-block;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:600;background:${statusColor};color:${statusText};">${a.status || 'Active'}</span></td>
          <td>
            <button class="btn btn--outline btn-transfer-asset" data-id="${a.asset_id}" data-name="${a.name}"
              style="padding:5px 12px;font-size:12px;cursor:pointer;">Transfer</button>
          </td>
        </tr>`;
    }).join('');

    // Bind transfer buttons
    document.querySelectorAll('.btn-transfer-asset').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAsset = { id: btn.dataset.id, name: btn.dataset.name };
        transferAssetId.value = selectedAsset.id;
        transferAssetName.value = selectedAsset.name;
        if (transferAssetNameDisplay) transferAssetNameDisplay.textContent = selectedAsset.name;
        if (transferAssetIdDisplay)   transferAssetIdDisplay.textContent = `ID: ${selectedAsset.id}`;
        selectedAssetCard.classList.add('has-selection');
        confirmTransferBtn.disabled = false;
        // Remove focus-room from destination options
        const currentRoomId = focusRoomSelect.value;
        Array.from(transferDest.options).forEach(opt => {
          opt.disabled = opt.value === currentRoomId;
        });
        transferDest.value = '';
      });
    });
  }

  // ── Render transfer history timeline ──────────────────────────────────────
  function renderHistory(history) {
    if (!timeline) return;
    if (history.length === 0) {
      timeline.innerHTML = `
        <li class="timeline-item">
          <span class="timeline-dot"></span>
          <div class="timeline-desc" style="color:#9ca3af;">No transfer history for this room.</div>
        </li>`;
      return;
    }
    timeline.innerHTML = history.map(h => {
      const raw  = h.transfer_date ? new Date(h.transfer_date) : null;
      const date = raw ? raw.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
      const time = raw ? raw.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }) : '';
      const reasonMap = {
        new_hire: 'New Hire', departure: 'Offboarding', reconfiguration: 'Reconfiguration',
        upgrade: 'Upgrade', faulty: 'Faulty', temporary: 'Temporary', storage: 'Storage', other: 'Other'
      };
      const reasonLabel = reasonMap[h.reason] || h.reason || '';
      return `
        <li class="timeline-item">
          <span class="timeline-dot"></span>
          <div class="timeline-date">${date}${time ? ' · ' + time : ''}</div>
          <p class="timeline-title">${h.asset_name || 'Asset'}</p>
          <div class="timeline-desc">
            <em>${h.from_room_name || '—'}</em>
            &nbsp;→&nbsp;
            <em>${h.to_room_name || '—'}</em>
            ${h.initiated_by_name ? `<span style="color:#9ca3af;"> · by ${h.initiated_by_name}</span>` : ''}
          </div>
          ${reasonLabel ? `<span style="display:inline-block;margin-top:6px;padding:2px 8px;background:#eff6ff;color:#2563eb;border-radius:999px;font-size:11px;font-weight:600;">${reasonLabel}</span>` : ''}
        </li>`;
    }).join('');
  }

  // ── Clear selection ───────────────────────────────────────────────────────
  clearSelectionBtn?.addEventListener('click', () => {
    selectedAsset = null;
    transferAssetId.value = '';
    transferAssetName.value = '';
    selectedAssetCard.classList.remove('has-selection');
    confirmTransferBtn.disabled = true;
  });

  // ── Room change ───────────────────────────────────────────────────────────
  focusRoomSelect?.addEventListener('change', () => {
    // Clear any existing selection
    selectedAsset = null;
    if (selectedAssetCard) selectedAssetCard.classList.remove('has-selection');
    confirmTransferBtn.disabled = true;
    loadAssetsForRoom(focusRoomSelect.value);
  });

  // ── Search filter ─────────────────────────────────────────────────────────
  assetSearch?.addEventListener('input', () => renderAssetTable(allAssets));

  // ── Transfer form submit ──────────────────────────────────────────────────
  transferForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedAsset) { toast('Please select an asset to transfer.', 'error'); return; }
    const destRoomId = transferDest.value;
    if (!destRoomId) { toast('Please select a destination room.', 'error'); return; }

    const reason  = transferReason?.value || 'other';
    const details = transferDetails?.value || '';

    confirmTransferBtn.disabled = true;
    confirmTransferBtn.textContent = 'Transferring…';

    try {
      const res = await apiFetch('/api/assets/transfer', {
        method: 'POST',
        body: JSON.stringify({
          assetId: parseInt(selectedAsset.id),
          targetRoomId: parseInt(destRoomId),
          reason: `${reason}${details ? ': ' + details : ''}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer failed');

      toast('Asset transferred successfully!', 'success');
      selectedAsset = null;
      selectedAssetCard.classList.remove('has-selection');
      transferForm.reset();
      confirmTransferBtn.disabled = true;
      loadAssetsForRoom(focusRoomSelect.value);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      confirmTransferBtn.textContent = 'Confirm Transfer';
    }
  });

  // ── Register asset modal ──────────────────────────────────────────────────
  btnOpenRegister?.addEventListener('click', () => {
    if (!focusRoomSelect.value) { toast('Please select a Focus Room first.', 'error'); return; }
    registerModal.classList.add('is-open');
  });
  [btnCloseRegister, btnCancelRegister].forEach(btn => {
    btn?.addEventListener('click', () => registerModal.classList.remove('is-open'));
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('reg-asset-name').value.trim();
    const category = document.getElementById('reg-asset-category').value;
    const roomId   = focusRoomSelect.value;

    if (!name || !category || !roomId) { toast('All fields are required.', 'error'); return; }

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering…';

    try {
      const res = await apiFetch('/api/assets/register', {
        method: 'POST',
        body: JSON.stringify({ roomId: parseInt(roomId), name, category })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      toast('Asset registered successfully!', 'success');
      registerModal.classList.remove('is-open');
      registerForm.reset();
      loadAssetsForRoom(roomId);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register Asset';
    }
  });

  // ── Add .is-open support to the modal overlay ─────────────────────────────
  // allocation.css uses '.sn-modal-overlay.open' — add alias for 'is-open' used in JS
  const styleTag = document.createElement('style');
  styleTag.textContent = `.sn-modal-overlay.is-open { display:flex; opacity:1; }`;
  document.head.appendChild(styleTag);

  // ── Init ──────────────────────────────────────────────────────────────────
  await loadRooms();
});
