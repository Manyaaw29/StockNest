/**
 * StockNest — Room Allocation & Transfer Page
 */

import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

/* --------------------------------------------------------------------------
   Mock Data
   -------------------------------------------------------------------------- */

const ASSETS = [
  {
    id: 'AST-1042',
    description: 'Herman Miller Aeron Chair',
    category: 'Furniture',
    status: 'in-use',
    statusLabel: 'In Use',
  },
  {
    id: 'AST-2099',
    description: 'Dell UltraSharp 27" Monitor',
    category: 'Electronics',
    status: 'in-use',
    statusLabel: 'In Use',
  },
  {
    id: 'AST-0841',
    description: 'Logitech MeetUp Camera',
    category: 'A/V Equipment',
    status: 'maintenance',
    statusLabel: 'Maintenance Scheduled',
  },
  {
    id: 'AST-3102',
    description: 'Standing Desk Frame (Dual Motor)',
    category: 'Furniture',
    status: 'in-use',
    statusLabel: 'In Use',
  },
];

const DESTINATION_LABELS = {
  'maintenance-bay': 'Maintenance Bay',
  'storage-c': 'Storage Room C',
  'conf-b': 'Conference Room B (Floor 3)',
  'it-closet': 'IT Equipment Closet',
};

const REASON_LABELS = {
  maintenance: 'Scheduled Maintenance',
  replacement: 'Equipment Replacement',
  reallocation: 'Room Reallocation',
  repair: 'Repair / Service',
  other: 'Other',
};

let transfers = [
  {
    id: 'transfer-1',
    title: 'AST-0841 (Logitech Camera) moved to Maintenance Bay',
    reason: 'Scheduled firmware update and lens cleaning.',
    initiatedBy: 'Sarah Jenkins',
    timestamp: 'Today, 09:45 AM',
    isRecent: true,
  },
  {
    id: 'transfer-2',
    title: 'AST-1042 (Aeron Chair) received from Storage Room C',
    reason: 'Replaced broken chair (AST-1011).',
    initiatedBy: 'Marcus Chen',
    timestamp: 'Oct 24, 14:20 PM',
    isRecent: false,
  },
];

/** Currently selected asset in the transfer form */
let selectedAsset = { id: 'AST-0841', description: 'Logitech MeetUp Camera' };

/* --------------------------------------------------------------------------
   Render Helpers
   -------------------------------------------------------------------------- */

function createStatusBadge(asset) {
  const modifier = asset.status === 'maintenance' ? 'maintenance' : 'in-use';
  return `<span class="status-badge status-badge--${modifier}">
    <span class="status-badge__dot">●</span> ${asset.statusLabel}
  </span>`;
}

function createAssetRowHTML(asset) {
  return `
    <tr data-asset-id="${asset.id}" data-asset-name="${asset.description}">
      <td>
        <button type="button" class="asset-table__id-link" data-asset-id="${asset.id}" data-asset-name="${asset.description}">
          ${asset.id}
        </button>
      </td>
      <td>${asset.description}</td>
      <td>${asset.category}</td>
      <td>${createStatusBadge(asset)}</td>
      <td>
        <button type="button" class="asset-table__action-btn" aria-label="View ${asset.id} details">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </td>
    </tr>`;
}

function createTimelineItemHTML(transfer, index) {
  const markerClass = index === 0 ? 'transfer-timeline__marker--active' : 'transfer-timeline__marker--past';
  return `
    <li class="transfer-timeline__item" data-transfer-id="${transfer.id}">
      <div class="transfer-timeline__marker ${markerClass}" aria-hidden="true"></div>
      <div class="transfer-timeline__content">
        <div class="transfer-timeline__top">
          <p class="transfer-timeline__title">${transfer.title}</p>
          <time class="transfer-timeline__time">${transfer.timestamp}</time>
        </div>
        <p class="transfer-timeline__reason">Reason: ${transfer.reason}</p>
        <p class="transfer-timeline__initiator">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          Initiated by ${transfer.initiatedBy}
        </p>
      </div>
    </li>`;
}

function renderAssetTable() {
  const tbody = document.getElementById('asset-table-body');
  if (!tbody) return;
  tbody.innerHTML = ASSETS.map(createAssetRowHTML).join('');
}

function renderTransfers() {
  const timeline = document.getElementById('transfer-timeline');
  if (!timeline) return;
  timeline.innerHTML = transfers.map(createTimelineItemHTML).join('');
}

function updateAssetChip(asset) {
  selectedAsset = { id: asset.id, description: asset.description };
  document.getElementById('chip-asset-id').textContent = asset.id;
  document.getElementById('chip-asset-name').textContent = asset.description;
  document.getElementById('asset-search').value = asset.id;
}

/* --------------------------------------------------------------------------
   Transfer Form Logic
   -------------------------------------------------------------------------- */

function getFormElements() {
  return {
    form: document.getElementById('transfer-form'),
    destination: document.getElementById('destination'),
    reason: document.getElementById('transfer-reason'),
    details: document.getElementById('transfer-details'),
    confirmBtn: document.getElementById('transfer-confirm'),
    destRadio: document.getElementById('dest-radio'),
    assetSearch: document.getElementById('asset-search'),
  };
}

function updateConfirmButtonState() {
  const { destination, reason, confirmBtn, destRadio } = getFormElements();
  const isValid = destination.value && reason.value;
  confirmBtn.disabled = !isValid;

  if (destination.value) {
    destRadio.classList.add('transfer-route__radio--filled');
  } else {
    destRadio.classList.remove('transfer-route__radio--filled');
  }
}

function resetTransferForm() {
  const { form, destination, reason, details, confirmBtn, destRadio } = getFormElements();

  selectedAsset = { id: 'AST-0841', description: 'Logitech MeetUp Camera' };
  document.getElementById('chip-asset-id').textContent = selectedAsset.id;
  document.getElementById('chip-asset-name').textContent = selectedAsset.description;
  document.getElementById('asset-search').value = '';

  destination.selectedIndex = 0;
  reason.selectedIndex = 0;
  details.value = '';
  confirmBtn.disabled = true;
  destRadio.classList.remove('transfer-route__radio--filled');
}

function formatNowTimestamp() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `Today, ${h12}:${minutes} ${ampm}`;
}

function handleConfirmTransfer(e) {
  e.preventDefault();

  const { destination, reason, details } = getFormElements();
  if (!destination.value || !reason.value) return;

  const destLabel = DESTINATION_LABELS[destination.value] || destination.value;
  const reasonLabel = REASON_LABELS[reason.value] || reason.value;
  const detailText = details.value.trim() || reasonLabel;

  const newTransfer = {
    id: `transfer-${Date.now()}`,
    title: `${selectedAsset.id} (${selectedAsset.description}) moved to ${destLabel}`,
    reason: detailText,
    initiatedBy: 'Neha Yadav',
    timestamp: formatNowTimestamp(),
    isRecent: true,
  };

  transfers.unshift(newTransfer);
  renderTransfers();
  resetTransferForm();

  console.log('[Transfer Confirmed]', newTransfer);
}

function initAssetTable() {
  const tbody = document.getElementById('asset-table-body');

  tbody?.addEventListener('click', (e) => {
    const link = e.target.closest('.asset-table__id-link');
    if (!link) return;

    updateAssetChip({
      id: link.dataset.assetId,
      description: link.dataset.assetName,
    });

    document.getElementById('transfer-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    console.log('[Asset Selected]', selectedAsset);
  });
}

function initTransferForm() {
  const { form, destination, reason, confirmBtn } = getFormElements();

  destination?.addEventListener('change', () => {
    updateConfirmButtonState();
    console.log('[Destination]', DESTINATION_LABELS[destination.value]);
  });

  reason?.addEventListener('change', () => {
    updateConfirmButtonState();
    console.log('[Reason]', REASON_LABELS[reason.value]);
  });

  form?.addEventListener('submit', handleConfirmTransfer);

  document.getElementById('transfer-cancel')?.addEventListener('click', () => {
    resetTransferForm();
    console.log('[Transfer Form] Reset');
  });
}

function initAssetSearch() {
  const search = document.getElementById('asset-search');

  search?.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (!query) return;

    const match = ASSETS.find(
      (a) => a.id.toLowerCase().includes(query) || a.description.toLowerCase().includes(query)
    );

    if (match) {
      updateAssetChip({ id: match.id, description: match.description });
    }
  });
}

function initHeaderActions() {
  document.getElementById('export-manifest')?.addEventListener('click', () => {
    console.log('[Export Manifest] Placeholder — export not yet implemented');
  });

  document.getElementById('new-transfer')?.addEventListener('click', () => {
    resetTransferForm();
    document.getElementById('transfer-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('asset-search')?.focus();
  });
}

/* --------------------------------------------------------------------------
   App Initialization
   -------------------------------------------------------------------------- */

function initApp() {
  const sidebarRoot = document.getElementById('sidebar-root');
  const topbarRoot = document.getElementById('topbar-root');

  renderSidebar(sidebarRoot, { activeItem: 'room-allocation-transfer' });
  initSidebarNav(sidebarRoot);

  renderTopbar(topbarRoot);
  initTopbarEvents(topbarRoot);

  renderAssetTable();
  renderTransfers();

  initAssetTable();
  initTransferForm();
  initAssetSearch();
  initHeaderActions();
}

document.addEventListener('DOMContentLoaded', initApp);
