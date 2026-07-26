/**
 * Injects the global search bar, notifications, quick add, and user avatar
 * dynamically on every page load.
 * @param {HTMLElement} container - The element to render into
 * @param {Object} options - Override defaults (initials, search placeholder)
 */
export function renderTopbar(container, { userInitials = 'NY', userName = 'Neha Yadav', searchPlaceholder = 'Search rooms, assets, or bookings (Cmd+K)' } = {}) {
  // Fetch user initials and background styles dynamically from storage
  let initials = userInitials;
  let userId = 'default';

  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.user_id) userId = user.user_id;
      if (user.name) {
        const parts = user.name.split(' ');
        initials = `${parts[0] ? parts[0][0] : ''}${parts[1] ? parts[1][0] : ''}`.toUpperCase() || 'U';
      }
    } catch (e) {
      console.error(e);
    }
  }

  const savedBg = localStorage.getItem(`sn_user_avatar_bg_${userId}`);
  const savedImg = localStorage.getItem(`sn_user_avatar_img_${userId}`);
  const savedText = localStorage.getItem(`sn_user_avatar_text_${userId}`);
  if (savedText && savedText.trim().length <= 2) {
    initials = savedText.trim().toUpperCase();
  } else if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.name) {
        const parts = user.name.trim().split(/\s+/);
        initials = `${parts[0] ? parts[0][0] : ''}${parts[1] ? parts[1][0] : ''}`.toUpperCase() || 'U';
      }
    } catch(e) {}
  }

  let avatarStyle = '';
  if (savedImg) {
    avatarStyle = `background-image: url(${savedImg}); background-size: cover; background-position: center;`;
  } else if (savedBg) {
    avatarStyle = `background-color: ${savedBg};`;
  }

  container.innerHTML = `
    <header class="topbar" role="banner">
      <div class="topbar__search-wrap">
        <svg class="topbar__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          id="global-search"
          class="topbar__search-input"
          placeholder="${searchPlaceholder}"
          aria-label="${searchPlaceholder}"
          style="outline:none;"
        />
      </div>

      <div class="topbar__actions" style="display:flex; align-items:center; gap:16px;">
        
        <!-- Notifications bell button and dropdown panel -->
        <div class="topbar__notifications-wrapper" style="position: relative; display: flex; align-items: center;">
          <button type="button" class="topbar__icon-btn topbar__icon-btn--notifications" aria-label="Notifications" style="position: relative;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width: 20px; height: 20px;">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span class="topbar__notification-dot" aria-hidden="true" style="position: absolute; top: 2px; right: 2px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></span>
          </button>
          
          <!-- Glassmorphic Notifications Dropdown Panel -->
          <div class="topbar__notifications-dropdown" style="display: none; position: absolute; right: 0; top: 45px; width: 340px; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5); z-index: 9999; backdrop-filter: blur(16px); padding: 16px; font-family: 'Outfit', sans-serif; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px; margin-bottom: 12px;">
              <span style="font-weight: 700; color: #f8fafc; font-size: 14px; letter-spacing: -0.2px;">Recent Activity Logs</span>
              <span style="font-size: 10px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 2px 8px; border-radius: 20px; font-weight: 700; text-transform: uppercase;">Live updates</span>
            </div>
            <ul class="topbar__notifications-list" style="list-style: none; padding: 0; margin: 0; max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
              <li style="color: #94a3b8; font-size: 13px; text-align: center; padding: 20px 0;">Loading activities...</li>
            </ul>
          </div>
        </div>

        <button type="button" class="topbar__quick-add">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Quick Add
        </button>

        <button type="button" class="topbar__avatar" style="${avatarStyle}" aria-label="User menu: ${userName}">
          <span class="topbar__avatar-initials">${savedImg ? '' : initials}</span>
        </button>
      </div>
    </header>`;
}

/**
 * Helper to show alert toasts inside topbar components.
 */
function showToastAlert(msg, type = 'success') {
  if (window.showToast) {
    window.showToast(msg, type === 'success' ? 'success' : 'error');
  } else if (window.snToast) {
    window.snToast(msg, { title: type === 'success' ? 'Success' : 'Error', type });
  } else {
    alert(msg);
  }
}

/**
 * Dynamically launches the Quick Add Hub modal.
 */
export function openQuickAddModal() {
  window.openQuickAddModal = openQuickAddModal;
  const existing = document.getElementById('sn-quick-add-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'sn-quick-add-modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000; font-family: 'Outfit', sans-serif;
  `;

  let userRole = 'Staff';
  try {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) userRole = JSON.parse(userStr).role || 'Staff';
  } catch(e) {}

  overlay.innerHTML = `
    <div style="background: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; width: 450px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); position: relative; color: #f3f4f6; text-align: left;">
      <h3 style="margin-top:0; font-size: 20px; font-weight: 700; color: #f9fafb; margin-bottom: 4px;">Quick Add Hub</h3>
      <p style="font-size:12.5px; color: #9ca3af; margin-bottom: 20px;">Select category below to instantly provision records.</p>
      
      <!-- Category Toggles -->
      <div style="display: flex; gap: 8px; margin-bottom: 20px; background: rgba(255,255,255,0.03); padding: 4px; border-radius: 8px;">
        <button type="button" id="qa-tab-room" style="flex:1; padding: 8px; border:none; background:none; color:#9ca3af; font-size:13px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.2s;">🏢 Room</button>
        <button type="button" id="qa-tab-consumable" style="flex:1; padding: 8px; border:none; background:none; color:#9ca3af; font-size:13px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.2s;">📦 Stock</button>
        <button type="button" id="qa-tab-ticket" style="flex:1; padding: 8px; border:none; background:none; color:#9ca3af; font-size:13px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.2s;">🔧 Ticket</button>
      </div>

      <!-- Room Form -->
      <form id="qa-form-room" style="display:none; flex-direction:column; gap:12px;">
        <div>
          <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Room / Space Name</label>
          <input type="text" id="qa-room-name" required placeholder="e.g. Executive Cabin 5" style="width:100%; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;" />
        </div>
        <div style="display:flex; gap:12px;">
          <div style="flex:1;">
            <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Space Type</label>
            <select id="qa-room-type" style="width:100%; padding:10px; background:#1f2937; border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;">
              <option value="Meeting Room">Meeting rooms</option>
              <option value="Executive Cabin">Executive cabins</option>
              <option value="Conference Room">Conference rooms</option>
              <option value="Co-work Space">Co-work space</option>
              <option value="Interview Room">Interview rooms</option>
            </select>
          </div>
          <div style="flex:1;">
            <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Capacity</label>
            <input type="number" id="qa-room-capacity" min="1" value="10" required style="width:100%; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;" />
          </div>
        </div>
        <div>
          <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Floor Location</label>
          <input type="text" id="qa-room-floor" placeholder="e.g. Ground Floor, Floor 3" required style="width:100%; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;" />
        </div>
        ${userRole !== 'Admin' ? `<div style="color:#ef4444; font-size:11px; font-weight:600;">⚠️ Admin privileges required to save spaces.</div>` : ''}
        <button type="submit" ${userRole !== 'Admin' ? 'disabled' : ''} style="background:linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color:#fff; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:700; margin-top:8px; opacity:${userRole !== 'Admin' ? 0.5 : 1};">Provision Room</button>
      </form>

      <!-- Stock Form -->
      <form id="qa-form-consumable" style="display:none; flex-direction:column; gap:12px;">
        <div>
          <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Item Name</label>
          <input type="text" id="qa-inv-name" required placeholder="e.g. Whiteboard Markers" style="width:100%; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;" />
        </div>
        <div style="display:flex; gap:12px;">
          <div style="flex:1;">
            <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">SKU Code</label>
            <input type="text" id="qa-inv-sku" required placeholder="e.g. WM-100" style="width:100%; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;" />
          </div>
          <div style="flex:1;">
            <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Category</label>
            <input type="text" id="qa-inv-cat" required placeholder="e.g. Stationery" style="width:100%; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;" />
          </div>
        </div>
        <div style="display:flex; gap:12px;">
          <div style="flex:1;">
            <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Stock Quantity</label>
            <input type="number" id="qa-inv-qty" min="0" value="10" required style="width:100%; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;" />
          </div>
          <div style="flex:1;">
            <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Reorder Point</label>
            <input type="number" id="qa-inv-reorder" min="0" value="2" required style="width:100%; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;" />
          </div>
        </div>
        ${!['Admin', 'Manager'].includes(userRole) ? `<div style="color:#ef4444; font-size:11px; font-weight:600;">⚠️ Admin or Manager privileges required to save stock.</div>` : ''}
        <button type="submit" ${!['Admin', 'Manager'].includes(userRole) ? 'disabled' : ''} style="background:linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color:#fff; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:700; margin-top:8px; opacity:${!['Admin', 'Manager'].includes(userRole) ? 0.5 : 1};">Provision Item</button>
      </form>

      <!-- Ticket Form -->
      <form id="qa-form-ticket" style="display:none; flex-direction:column; gap:12px;">
        <div style="display:flex; gap:12px;">
          <div style="flex:1;">
            <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Target Category</label>
            <select id="qa-ticket-cat" style="width:100%; padding:10px; background:#1f2937; border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;">
              <option value="Space">🏢 Space (Room)</option>
              <option value="Consumable">📦 Consumable</option>
            </select>
          </div>
          <div style="flex:1;">
            <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Priority</label>
            <select id="qa-ticket-priority" style="width:100%; padding:10px; background:#1f2937; border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;">
              <option value="Low">Low (SLA: 5 Days)</option>
              <option value="High">High (SLA: 24 Hours)</option>
              <option value="Critical">Critical (SLA: 4 Hours)</option>
            </select>
          </div>
        </div>
        
        <!-- Space selection row -->
        <div id="qa-ticket-room-wrap">
          <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Select Space</label>
          <select id="qa-ticket-room-select" style="width:100%; padding:10px; background:#1f2937; border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;">
            <option value="">Loading spaces...</option>
          </select>
        </div>

        <!-- Consumable selection row -->
        <div id="qa-ticket-item-wrap" style="display:none;">
          <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Select Consumable</label>
          <select id="qa-ticket-item-select" style="width:100%; padding:10px; background:#1f2937; border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;">
            <option value="">Loading items...</option>
          </select>
        </div>

        <div>
          <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Issue Type / Action Needed</label>
          <select id="qa-ticket-type" style="width:100%; padding:10px; background:#1f2937; border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none;">
            <option value="Hardware / Repair">🔧 Hardware / Repair (AC, Lights, Plugs, Furniture)</option>
            <option value="Cleaning / Housekeeping">🧹 Cleaning / Urgent Housekeeping</option>
            <option value="IT / Network Support">💻 IT / Network Support (WiFi, Projector, Screen)</option>
            <option value="General Checkup">📋 General Checkup / Inspection</option>
          </select>
        </div>

        <div>
          <label style="display:block; font-size:12px; color:#9ca3af; font-weight:600; margin-bottom:4px;">Description</label>
          <textarea id="qa-ticket-desc" required placeholder="Describe what needs repair/housekeeping..." style="width:100%; height:70px; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#fff; font-size:13.5px; outline:none; resize:none;"></textarea>
        </div>

        <button type="submit" style="background:linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color:#fff; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:700; margin-top:8px;">Raise Ticket</button>
      </form>

      <!-- Close button -->
      <button type="button" id="qa-btn-close" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: #9ca3af; font-size: 20px; cursor: pointer;">×</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Setup tab state switching
  const tabs = {
    room: { btn: overlay.querySelector('#qa-tab-room'), form: overlay.querySelector('#qa-form-room') },
    consumable: { btn: overlay.querySelector('#qa-tab-consumable'), form: overlay.querySelector('#qa-form-consumable') },
    ticket: { btn: overlay.querySelector('#qa-tab-ticket'), form: overlay.querySelector('#qa-form-ticket') }
  };

  function switchTab(activeKey) {
    Object.keys(tabs).forEach(key => {
      const isAct = key === activeKey;
      tabs[key].btn.style.background = isAct ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'none';
      tabs[key].btn.style.color = isAct ? '#fff' : '#9ca3af';
      tabs[key].form.style.display = isAct ? 'flex' : 'none';
    });
  }

  // Bind tabs
  overlay.querySelector('#qa-tab-room').addEventListener('click', () => switchTab('room'));
  overlay.querySelector('#qa-tab-consumable').addEventListener('click', () => switchTab('consumable'));
  overlay.querySelector('#qa-tab-ticket').addEventListener('click', () => switchTab('ticket'));

  // Close bindings
  const closeBtn = overlay.querySelector('#qa-btn-close');
  closeBtn.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Default active tab
  switchTab('room');

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const roomSelect = overlay.querySelector('#qa-ticket-room-select');
  const itemSelect = overlay.querySelector('#qa-ticket-item-select');

  // Fetch Rooms
  fetch('https://stocknest-rpcw.onrender.com/api/rooms', { headers: { 'Authorization': `Bearer ${token}` } })
    .then(r => r.json())
    .then(data => {
      const list = data.rooms || [];
      roomSelect.innerHTML = list.map(r => `<option value="${r.room_id}">${r.room_name} (${r.type})</option>`).join('');
    })
    .catch(() => { roomSelect.innerHTML = `<option value="">Failed to load spaces</option>`; });

  // Fetch Inventory
  fetch('https://stocknest-rpcw.onrender.com/api/inventory', { headers: { 'Authorization': `Bearer ${token}` } })
    .then(r => r.json())
    .then(data => {
      const list = data.inventory || [];
      itemSelect.innerHTML = list.map(i => `<option value="${i.inventory_id}">${i.item_name}</option>`).join('');
    })
    .catch(() => { itemSelect.innerHTML = `<option value="">Failed to load items</option>`; });

  // Ticket category switch
  overlay.querySelector('#qa-ticket-cat').addEventListener('change', (e) => {
    const isSpace = e.target.value === 'Space';
    overlay.querySelector('#qa-ticket-room-wrap').style.display = isSpace ? 'block' : 'none';
    overlay.querySelector('#qa-ticket-item-wrap').style.display = isSpace ? 'none' : 'block';
  });

  // Form Submissions
  // 1. Room form submit
  overlay.querySelector('#qa-form-room').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = overlay.querySelector('#qa-room-name').value.trim();
    const type = overlay.querySelector('#qa-room-type').value;
    const capacity = parseInt(overlay.querySelector('#qa-room-capacity').value, 10);
    const floor = overlay.querySelector('#qa-room-floor').value.trim();

    try {
      const res = await fetch('https://stocknest-rpcw.onrender.com/api/rooms', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_name: name, type, capacity, floor })
      });
      const data = await res.json();
      if (res.ok) {
        showToastAlert('Room provisioned successfully!', 'success');
        overlay.remove();
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToastAlert(data.message || 'Failed to save space.', 'error');
      }
    } catch(err) {
      showToastAlert('Connection error.', 'error');
    }
  });

  // 2. Consumable form submit
  overlay.querySelector('#qa-form-consumable').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = overlay.querySelector('#qa-inv-name').value.trim();
    const sku = overlay.querySelector('#qa-inv-sku').value.trim();
    const category = overlay.querySelector('#qa-inv-cat').value.trim();
    const qty = parseFloat(overlay.querySelector('#qa-inv-qty').value);
    const reorder = parseFloat(overlay.querySelector('#qa-inv-reorder').value);

    try {
      const res = await fetch('https://stocknest-rpcw.onrender.com/api/inventory', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: name, sku, category, current_stock: qty, reorder_point: reorder })
      });
      const data = await res.json();
      if (res.ok) {
        showToastAlert('Inventory item provisioned successfully!', 'success');
        overlay.remove();
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToastAlert(data.message || 'Failed to save item.', 'error');
      }
    } catch(err) {
      showToastAlert('Connection error.', 'error');
    }
  });

  // 3. Ticket form submit
  overlay.querySelector('#qa-form-ticket').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cat = overlay.querySelector('#qa-ticket-cat').value;
    const priority = overlay.querySelector('#qa-ticket-priority').value;
    const issueType = overlay.querySelector('#qa-ticket-type').value;
    const rawDesc = overlay.querySelector('#qa-ticket-desc').value.trim();
    const description = `[${issueType}] ${rawDesc}`;

    let postBody = { priority, description };

    const deadlineDate = new Date();
    if (priority === 'Critical') {
      deadlineDate.setHours(deadlineDate.getHours() + 4);
    } else if (priority === 'High') {
      deadlineDate.setDate(deadlineDate.getDate() + 1);
    } else {
      deadlineDate.setDate(deadlineDate.getDate() + 5);
    }
    postBody.deadline = deadlineDate.toISOString().split('T')[0];

    if (cat === 'Space') {
      const rId = roomSelect.value;
      if (!rId) return showToastAlert('Select a room.', 'error');
      postBody.room_id = parseInt(rId, 10);
    } else {
      const iId = itemSelect.value;
      if (!iId) return showToastAlert('Select a consumable.', 'error');
      postBody.inventory_id = parseInt(iId, 10);
    }

    try {
      const res = await fetch('https://stocknest-rpcw.onrender.com/api/maintenance', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(postBody)
      });
      const data = await res.json();
      if (res.ok) {
        showToastAlert('Maintenance ticket raised successfully!', 'success');
        overlay.remove();
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToastAlert(data.message || 'Failed to raise ticket.', 'error');
      }
    } catch(err) {
      showToastAlert('Connection error.', 'error');
    }
  });
}

/**
 * Attaches basic event listeners for search and top bar actions.
 * Call after renderTopbar().
 * @param {HTMLElement} container - The topbar root element
 */
export function initTopbarEvents(container) {
  const searchInput = container.querySelector('#global-search');
  const quickAddBtn = container.querySelector('.topbar__quick-add');
  const notifBtn = container.querySelector('.topbar__icon-btn--notifications');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      console.log('[Search]', e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        console.log('[Search] Cmd+K shortcut activated');
      }
    });
  }

  // Bind Quick Add modal launcher
  if (quickAddBtn) {
    quickAddBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openQuickAddModal();
    });
  }

  // Bind Notifications Bell Dropdown Panel
  if (notifBtn) {
    const dropdown = container.querySelector('.topbar__notifications-dropdown');
    const list = container.querySelector('.topbar__notifications-list');

    notifBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';

      // Hide all other notification dropdowns
      document.querySelectorAll('.topbar__notifications-dropdown').forEach(d => d.style.display = 'none');

      if (!isVisible) {
        dropdown.style.display = 'block';

        // Hide notification alert dot
        const dot = notifBtn.querySelector('.topbar__notification-dot');
        if (dot) dot.style.display = 'none';

        // Fetch logs dynamically from Dashboard activity feed
        try {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          const res = await fetch('https://stocknest-rpcw.onrender.com/api/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const activities = data.recentActivity || [];
            if (activities.length === 0) {
              list.innerHTML = `<li style="color: #94a3b8; font-size: 12px; text-align: center; padding: 16px;">No recent activities logged.</li>`;
            } else {
              list.innerHTML = activities.map(act => `
                <li style="border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 8px; display: flex; flex-direction: column; gap: 2px;">
                  <div style="color: #f1f5f9; font-size: 12.5px; font-weight: 500; line-height: 1.4;">${act.description}</div>
                  <div style="color: #64748b; font-size: 10px; font-weight: 600;">${act.time}</div>
                </li>
              `).join('');
            }
          } else {
            list.innerHTML = `<li style="color: #ef4444; font-size: 12px; text-align: center; padding: 12px;">Failed to load activities.</li>`;
          }
        } catch (err) {
          console.error(err);
          list.innerHTML = `<li style="color: #ef4444; font-size: 12px; text-align: center; padding: 12px;">Connection error.</li>`;
        }
      } else {
        dropdown.style.display = 'none';
      }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== notifBtn && !notifBtn.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  // Global Cmd+K listener when focus is elsewhere
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput?.focus();
    }
  });
}
