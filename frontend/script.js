import { requireAuth, apiFetch } from './sn_common.js';
import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // ── Layout ─────────────────────────────────────────────────────────────────
  const sidebarRoot = document.getElementById('sidebar-root');
  const topbarRoot  = document.getElementById('topbar-root');
  if (sidebarRoot) { renderSidebar(sidebarRoot, { activeItem: 'room-booking' }); initSidebarNav(sidebarRoot); }
  if (topbarRoot)  { renderTopbar(topbarRoot, { searchPlaceholder: 'Search rooms or bookings...' }); initTopbarEvents(topbarRoot); }

  // ── Set default date + restrict past dates ────────────────────────────────
  const dateInput = document.getElementById('booking-date');
  const timeSelect = document.getElementById('booking-time');

  function todayStr() { return new Date().toISOString().split('T')[0]; }

  function filterPastTimes() {
    if (!timeSelect || !dateInput) return;
    const isToday = dateInput.value === todayStr();
    const nowHour = new Date().getHours();
    Array.from(timeSelect.options).forEach(opt => {
      const optHour = parseInt(opt.value.split(':')[0], 10);
      if (isToday && optHour <= nowHour) {
        opt.disabled = true;
        opt.style.color = '#c0c0c0';
      } else {
        opt.disabled = false;
        opt.style.color = '';
      }
    });
    // If current selection is now disabled, jump to next valid
    if (timeSelect.options[timeSelect.selectedIndex]?.disabled) {
      const firstValid = Array.from(timeSelect.options).find(o => !o.disabled);
      if (firstValid) firstValid.selected = true;
    }
  }

  if (dateInput) {
    dateInput.min = todayStr();          // Block past dates in picker
    dateInput.value = todayStr();        // Default to today
    dateInput.addEventListener('change', () => {
      // Don't allow navigating to past dates even if typed
      if (dateInput.value < todayStr()) dateInput.value = todayStr();
      filterPastTimes();
      searchRooms();                     // Auto-refresh rooms when date changes
    });
  }
  filterPastTimes(); // Run immediately on load

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const roomsList      = document.getElementById('rooms-list');
  const roomsCount     = document.getElementById('rooms-count');
  const bookingsList   = document.getElementById('bookings-list');
  const modal          = document.getElementById('booking-modal');
  const modalConfirmBtn= document.getElementById('modal-confirm');
  const modalTypeSelect= document.getElementById('booking-type');
  const modalPersonSelect = document.getElementById('booking-person');
  const modalPurpose   = document.getElementById('booking-purpose');

  let selectedRoomId   = null;

  // ── Upcoming Bookings (right panel) ───────────────────────────────────────
  async function loadBookings() {
    if (!bookingsList) return;
    try {
      const res  = await apiFetch('/api/bookings');
      const data = await res.json();
      const now  = new Date();

      // Filter out cancelled AND past bookings
      const bookings = (data.bookings || []).filter(b => {
        if (b.status === 'cancelled') return false;
        if (!b.booking_date) return true;
        
        // Parse the ISO string to a local Date object. 
        // e.g. "2026-08-03T18:30:00.000Z" -> "Aug 04 2026 00:00:00 IST"
        const endDt = new Date(b.booking_date);
        const [endH, endM] = (b.end_time || '23:59').split(':').map(Number);
        
        // Set the local time for the end of the booking
        endDt.setHours(endH, endM, 0, 0);
        return endDt >= now;   // Only show future/ongoing
      }).slice(0, 6);

      if (bookings.length === 0) {
        bookingsList.innerHTML = `
          <li style="padding:24px 16px;text-align:center;color:var(--color-text-muted);font-size:13px;">
            No upcoming bookings.
          </li>`;
        return;
      }

      bookingsList.innerHTML = bookings.map(b => {
        // Construct the local date for display
        const localDate = new Date(b.booking_date);
        const dateStr = localDate.toLocaleDateString('en-GB', { day:'2-digit', month:'short' }).toUpperCase();

        function fmtTime(t) {
          if (!t) return '';
          const [hStr, mStr] = t.split(':');
          let h = parseInt(hStr, 10), m = mStr || '00';
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          return `${h}:${m} ${ampm}`;
        }
        const start = fmtTime(b.start_time);
        const end   = fmtTime(b.end_time);

        const statusClr = b.status === 'confirmed' ? '#16a34a' : b.status === 'pending' ? '#ca8a04' : '#6b7280';
        const statusBg  = b.status === 'confirmed' ? '#dcfce7' : b.status === 'pending' ? '#fef9c3' : '#f3f4f6';
        const statusBadge = `<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:700;background:${statusBg};color:${statusClr};text-transform:uppercase;letter-spacing:.05em;">${b.status}</span>`;

        return `
          <li style="padding:14px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <span style="font-size:11px;font-weight:700;letter-spacing:.06em;color:#2563eb;">${dateStr}</span>
              <span style="font-size:11px;font-weight:600;padding:3px 9px;background:#eff6ff;color:#2563eb;border-radius:999px;">${start} – ${end}</span>
            </div>
            <div style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:4px;">${b.room_name || 'Room'}</div>
            <div style="font-size:11px;color:#64748b;font-weight:500;margin-bottom:2px;">📍 ${b.floor || 'Main Building'}</div>
            <div style="font-size:11px;color:#64748b;font-weight:500;margin-bottom:8px;">🧑‍💼 Booked by: <strong style="color:#334155;">${b.user_name || 'Unknown'}</strong></div>
            ${statusBadge}
          </li>`;
      }).join('');
    } catch (e) { console.error('Bookings load error:', e); }
  }

  // ── Room Search ────────────────────────────────────────────────────────────
  // Curated room images by category
  const ROOM_IMGS = {
    'Executive Boardroom': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&q=60',
    'Meeting Room':        'https://images.unsplash.com/photo-1600508774634-4e11d34730e2?w=200&q=60',
    'Conference Hall':     'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=200&q=60',
    'Hot Desk Area':       'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&q=60',
    'Focus Pod':           'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=200&q=60',
    'Private Cabin':       'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=200&q=60',
  };

  async function searchRooms() {
    if (!roomsList) return;
    const date     = document.getElementById('booking-date')?.value;
    const time     = document.getElementById('booking-time')?.value;
    const duration = document.getElementById('booking-duration')?.value;
    const category = document.getElementById('booking-category')?.value;

    roomsList.innerHTML = `<p style="padding:32px;text-align:center;color:var(--color-text-muted);">Searching rooms…</p>`;

    try {
      const qs = new URLSearchParams();
      if (date)     qs.append('date', date);
      if (time)     qs.append('time', time);
      if (duration) qs.append('duration', duration);
      if (category) qs.append('category', category);

      const res  = await apiFetch(`/api/rooms?${qs}`);
      const data = await res.json();
      const rooms = data.rooms || [];

      if (roomsCount) roomsCount.textContent = `${rooms.length} found`;

      if (rooms.length === 0) {
        roomsList.innerHTML = `
          <div class="room-card" style="justify-content:center;color:var(--color-text-muted);">
            No rooms available for the selected criteria.
          </div>`;
        return;
      }

      roomsList.innerHTML = rooms.map(room => {
        const imgUrl = ROOM_IMGS[room.category] || ROOM_IMGS['Meeting Room'];
        const amenities = (() => {
          try { return JSON.parse(room.amenities) || []; } catch { return []; }
        })();

        return `
          <div class="room-card" role="listitem">
            <div class="room-card__thumbnail">
              <img src="${imgUrl}" alt="${room.room_name}"
                   style="width:100%;height:100%;object-fit:cover;border-radius:8px;"
                   onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
              <svg class="room-card__thumbnail-icon" style="display:none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <div class="room-card__body">
              <div class="room-card__header">
                <div class="room-card__info">
                  <div class="room-card__name">${room.room_name}</div>
                  <div class="room-card__location">${room.floor || room.category}</div>
                  <div class="room-card__code">${room.category}</div>
                </div>
                <span class="room-card__badge">
                  <span class="room-card__badge-dot">●</span>Available
                </span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                  <span class="room-card__tag">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    </svg>
                    Up to ${room.capacity || 10}
                  </span>
                  ${amenities.slice(0, 2).map(a => `<span class="room-card__tag">${a}</span>`).join('')}
                </div>
                <button class="room-card__book-btn btn-book"
                  data-room-id="${room.room_id}"
                  data-room-name="${room.room_name}">
                  Book Room
                </button>
              </div>
            </div>
          </div>`;
      }).join('');

      // Bind book buttons
      document.querySelectorAll('.btn-book').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedRoomId = btn.dataset.roomId;
          document.getElementById('modal-message').textContent =
            `You are about to book "${btn.dataset.roomName}" on ${date} at ${time}.`;
          if (modalPurpose)  modalPurpose.value = '';
          if (modalTypeSelect) { modalTypeSelect.value = 'internal'; }
          if (modalPersonSelect) {
            modalPersonSelect.innerHTML = `<option value="">-- Myself --</option>`;
            modalPersonSelect.disabled = true;
          }
          modal.hidden = false;
        });
      });

    } catch (e) {
      roomsList.innerHTML = `<div class="room-card" style="color:#ef4444;">Error: ${e.message}</div>`;
    }
  }

  document.getElementById('find-room-form')?.addEventListener('change', searchRooms);

  // ── Modal close ────────────────────────────────────────────────────────────
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => { modal.hidden = true; selectedRoomId = null; });
  });

  // ── Modal type switch (client booking) ────────────────────────────────────
  modalTypeSelect?.addEventListener('change', async (e) => {
    if (e.target.value === 'client') {
      modalPersonSelect.disabled = false;
      try {
        const res  = await apiFetch('/api/clients');
        const data = await res.json();
        const opts = (data.clients || []).map(c =>
          `<option value="${c.client_id}">${c.name}${c.company ? ' ('+c.company+')' : ''}</option>`
        ).join('');
        modalPersonSelect.innerHTML = `<option value="">-- Select Client --</option>${opts}`;
      } catch {
        modalPersonSelect.innerHTML = `<option value="">Failed to load clients</option>`;
      }
    } else {
      modalPersonSelect.innerHTML = `<option value="">-- Myself --</option>`;
      modalPersonSelect.disabled = true;
    }
  });

  // ── Confirm Booking ────────────────────────────────────────────────────────
  modalConfirmBtn?.addEventListener('click', async () => {
    if (!selectedRoomId) return;

    const purpose  = modalPurpose?.value.trim();
    if (!purpose) { alert('Please enter a purpose for this booking.'); return; }

    const date     = document.getElementById('booking-date')?.value;
    const time     = document.getElementById('booking-time')?.value;
    const duration = document.getElementById('booking-duration')?.value;

    // Build payload — purposely omit 'purpose' since it's not in the DB schema
    const payload = {
      room_id:      parseInt(selectedRoomId),
      booking_date: date,
      start_time:   time,
      duration,
      attendees:    1,
    };

    if (modalTypeSelect?.value === 'client' && modalPersonSelect?.value) {
      payload.client_id = parseInt(modalPersonSelect.value);
    }

    modalConfirmBtn.disabled = true;
    modalConfirmBtn.textContent = 'Booking…';

    try {
      const res  = await apiFetch('/api/bookings', { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Booking failed');

      modal.hidden = true;
      if (window.snToast) snToast('Room booked successfully! ✅', { type: 'success' });
      else alert('Room booked successfully!');
      searchRooms();
      loadBookings();
    } catch (e) {
      if (window.snToast) snToast(e.message, { type: 'error' });
      else alert(e.message);
    } finally {
      modalConfirmBtn.disabled = false;
      modalConfirmBtn.textContent = 'Confirm Booking';
    }
  });

  // ── Initial load ───────────────────────────────────────────────────────────
  searchRooms();
  loadBookings();
});
