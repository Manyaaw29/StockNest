import { requireAuth, apiFetch } from './sn_common.js';
import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // ── Layout ─────────────────────────────────────────────────────────────────
  const sidebarRoot = document.getElementById('sidebar-root');
  const topbarRoot  = document.getElementById('topbar-root');
  if (sidebarRoot) { renderSidebar(sidebarRoot, { activeItem: 'consumables' }); initSidebarNav(sidebarRoot); }
  if (topbarRoot)  { renderTopbar(topbarRoot, { searchPlaceholder: 'Search inventory...' }); initTopbarEvents(topbarRoot); }

  const toast = (msg, type = 'success') => window.snToast ? snToast(msg, { type }) : alert(msg);

  // ── Status badge ───────────────────────────────────────────────────────────
  function stockBadge(status) {
    const map = {
      'In Stock':     { bg: '#dcfce7', color: '#16a34a' },
      'Low Stock':    { bg: '#ffedd5', color: '#ea580c' },
      'Out of Stock': { bg: '#fee2e2', color: '#dc2626' },
      'Discontinued': { bg: '#f3f4f6', color: '#6b7280' },
    };
    const s = map[status] || { bg: '#f3f4f6', color: '#6b7280' };
    return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:${s.bg};color:${s.color};">${status || '—'}</span>`;
  }

  // ── Load inventory ─────────────────────────────────────────────────────────
  let allItems = [];

  async function loadInventory() {
    const tbody = document.querySelector('tbody') || document.getElementById('inventoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#9ca3af;">Loading inventory…</td></tr>`;

    try {
      const res  = await apiFetch('/api/inventory');
      const data = await res.json();
      allItems = data.items || data.inventory || [];

      // Update stat cards with real data
      const total    = allItems.length;
      const low      = allItems.filter(i => i.status === 'Low Stock').length;
      const out      = allItems.filter(i => i.status === 'Out of Stock').length;
      const inStock  = allItems.filter(i => i.status === 'In Stock').length;

      const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      setEl('statActiveSKUs', total);
      setEl('statLowStock', low + out);

      renderTable(allItems);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#ef4444;">Error: ${e.message}</td></tr>`;
    }
  }

  function renderTable(items) {
    const tbody = document.querySelector('tbody') || document.getElementById('inventoryTableBody');
    if (!tbody) return;

    const search = (document.getElementById('inventorySearch')?.value || '').toLowerCase();
    const filtered = search ? items.filter(i =>
      (i.item_name || '').toLowerCase().includes(search) ||
      (i.sku || '').toLowerCase().includes(search) ||
      (i.category || '').toLowerCase().includes(search)
    ) : items;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#9ca3af;">No items found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const pct = item.reorder_point > 0 ? Math.min(Math.round((item.current_stock / item.reorder_point) * 50), 100) : 100;
      const barColor = item.status === 'Out of Stock' ? '#ef4444' : item.status === 'Low Stock' ? '#f97316' : '#16a34a';
      return `
        <tr>
          <td style="font-weight:500;color:#111827;">${item.item_name}</td>
          <td style="font-size:12px;color:#9ca3af;font-family:monospace;">${item.sku || '—'}</td>
          <td>${item.category || '—'}</td>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-weight:600;min-width:40px;">${item.current_stock} ${item.unit || ''}</span>
              <div style="flex:1;height:5px;background:#e5e7eb;border-radius:999px;">
                <div style="height:100%;width:${pct}%;background:${barColor};border-radius:999px;"></div>
              </div>
            </div>
          </td>
          <td>${item.reorder_point} ${item.unit || ''}</td>
          <td>${stockBadge(item.status)}</td>
          <td class="col-actions">
            <button class="row-action-btn" aria-label="Actions" 
              data-id="${item.inventory_id}" 
              data-name="${item.item_name}" 
              data-unit="${item.unit || 'units'}">⋮</button>
          </td>
        </tr>`;
    }).join('');

    // Bind action menu buttons
    document.querySelectorAll('.row-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openActionMenu(e.target, btn.dataset.id, btn.dataset.name, btn.dataset.unit);
      });
    });
  }

  // ── Action Menu ────────────────────────────────────────────────────────────
  const actionMenu = document.getElementById('actionMenu');
  
  function openActionMenu(targetBtn, id, name, unit) {
    if (!actionMenu) return;
    
    // Position menu near the button
    const rect = targetBtn.getBoundingClientRect();
    actionMenu.style.top = `${rect.bottom + 5}px`;
    actionMenu.style.left = `${rect.right - 170}px`; // Menu width is ~170px
    
    actionMenu.innerHTML = `
      <button class="menu-item-adjust">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Adjust Stock
      </button>
      <button class="menu-item-edit">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;vertical-align:middle;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        Edit Details
      </button>
      <button class="menu-item-delete is-danger">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;vertical-align:middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        Remove Item
      </button>
    `;
    actionMenu.hidden = false;

    const hideMenu = () => { actionMenu.hidden = true; document.removeEventListener('click', hideMenu); };
    setTimeout(() => document.addEventListener('click', hideMenu), 0);

    // Bind menu actions
    actionMenu.querySelector('.menu-item-adjust').onclick = () => openAdjustModal(id, name, unit);
    actionMenu.querySelector('.menu-item-edit').onclick = () => {
      toast('Edit functionality coming soon.', 'info');
    };
    actionMenu.querySelector('.menu-item-delete').onclick = async () => {
      if (!confirm(`Are you sure you want to delete ${name}?`)) return;
      try {
        const res = await apiFetch(`/api/inventory/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        toast('Item removed successfully.');
        loadInventory();
      } catch(e) { toast(e.message, 'error'); }
    };
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  document.getElementById('inventorySearch')?.addEventListener('input', () => renderTable(allItems));

  // ── Adjust Stock Modal ─────────────────────────────────────────────────────
  function openAdjustModal(id, name, unit) {
    const modal    = document.getElementById('inventoryModal');
    const backdrop = document.getElementById('modalBackdrop');
    const titleEl  = document.getElementById('modalTitle');
    const bodyEl   = document.getElementById('modalBody');
    const footerEl = document.getElementById('modalFooter');

    if (!modal) return;
    if (titleEl) titleEl.textContent = `Adjust Stock — ${name}`;
    if (bodyEl) bodyEl.innerHTML = `
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:12px;font-weight:600;color:#6b7280;margin-bottom:6px;text-transform:uppercase;">Adjustment</label>
        <div style="display:flex;gap:8px;">
          <select id="adjType" style="flex:1;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;">
            <option value="consume">Consume (–)</option>
            <option value="restock">Restock (+)</option>
          </select>
          <input type="number" id="adjAmount" placeholder="Qty" min="0.01" step="0.01"
            style="width:100px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;" />
        </div>
        <div style="font-size:11px;color:#9ca3af;margin-top:6px;">Unit: ${unit}</div>
      </div>`;
    if (footerEl) footerEl.innerHTML = `
      <button id="adjCancel" style="padding:8px 16px;border:1px solid #e2e8f0;background:#fff;border-radius:8px;cursor:pointer;">Cancel</button>
      <button id="adjConfirm" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Confirm</button>`;

    if (backdrop) backdrop.hidden = false;
    modal.showModal?.() || (modal.hidden = false);

    document.getElementById('adjCancel')?.addEventListener('click', () => {
      if (backdrop) backdrop.hidden = true;
      modal.close?.() || (modal.hidden = true);
    });

    document.getElementById('adjConfirm')?.addEventListener('click', async () => {
      const adjType   = document.getElementById('adjType').value;
      const adjAmount = parseFloat(document.getElementById('adjAmount').value);
      if (!adjAmount || adjAmount <= 0) { toast('Enter a valid quantity.', 'error'); return; }
      try {
        const res = await apiFetch(`/api/inventory/${id}/adjust`, {
          method: 'PATCH',
          body: JSON.stringify({ adjustment_type: adjType, quantity: adjAmount })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Adjustment failed');
        toast(`Stock ${adjType === 'consume' ? 'consumed' : 'restocked'} successfully!`);
        if (backdrop) backdrop.hidden = true;
        modal.close?.() || (modal.hidden = true);
        loadInventory();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  // ── Modal close button (used by Adjust Stock modal) ───────────────────────
  document.getElementById('modalCloseBtn')?.addEventListener('click', () => {
    const modal    = document.getElementById('inventoryModal');
    const backdrop = document.getElementById('modalBackdrop');
    if (backdrop) backdrop.hidden = true;
    modal?.close?.() || (modal && (modal.hidden = true));
  });

  // ── Register Drawer ────────────────────────────────────────────────────────
  const registerDrawer  = document.getElementById('registerDrawer');
  const drawerBackdrop  = document.getElementById('drawerBackdrop');

  function openDrawer() {
    registerDrawer?.classList.add('is-open');
    drawerBackdrop?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    // Focus first input after animation
    setTimeout(() => document.getElementById('itemName')?.focus(), 310);
  }

  function closeDrawer() {
    registerDrawer?.classList.remove('is-open');
    drawerBackdrop?.classList.remove('is-open');
    document.body.style.overflow = '';
    // Clear errors
    ['itemNameError', 'currentStockError'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }

  // Open via "Add Stock" button
  document.getElementById('addStockBtn')?.addEventListener('click', openDrawer);

  // Close via × button, Cancel, or backdrop click
  document.getElementById('drawerCloseBtn')?.addEventListener('click', closeDrawer);
  document.getElementById('drawerCancelBtn')?.addEventListener('click', closeDrawer);
  drawerBackdrop?.addEventListener('click', closeDrawer);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && registerDrawer?.classList.contains('is-open')) closeDrawer();
  });

  // ── Register Item Form Submit ───────────────────────────────────────────────
  document.getElementById('registerItemForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    ['itemNameError', 'currentStockError'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });

    const itemName     = document.getElementById('itemName')?.value.trim();
    const currentStock = document.getElementById('currentStock')?.value;

    let hasError = false;
    if (!itemName) {
      const el = document.getElementById('itemNameError');
      if (el) el.textContent = 'Item name is required.';
      hasError = true;
    }
    if (currentStock === '' || currentStock === null) {
      const el = document.getElementById('currentStockError');
      if (el) el.textContent = 'Current stock is required.';
      hasError = true;
    }
    if (hasError) return;

    const payload = {
      item_name:      itemName,
      sku:            document.getElementById('itemSku')?.value.trim() || null,
      category:       document.getElementById('itemCategory')?.value || 'General',
      unit:           document.getElementById('itemUnit')?.value || 'Units',
      current_stock:  parseFloat(currentStock) || 0,
      reorder_point:  parseFloat(document.getElementById('minStock')?.value) || 0,
      supplier_email: document.getElementById('supplierEmail')?.value.trim() || null,
    };

    const submitBtn  = document.getElementById('drawerSubmitBtn');
    const origHTML   = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering…';

    try {
      const res  = await apiFetch('/api/inventory', { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to register item.');

      toast('Item registered successfully! 🎉');
      document.getElementById('registerItemForm').reset();
      closeDrawer();
      loadInventory();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHTML;
    }
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  loadInventory();
});
