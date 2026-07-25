/**
 * StockNest — Room Booking Page
 * Live backend integration: fetches rooms and bookings from the API.
 */

import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

/* --------------------------------------------------------------------------
   Config & Auth
   -------------------------------------------------------------------------- */

const BACKEND_URL = 'http://localhost:5000/api';
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
const currentUser = userStr ? JSON.parse(userStr) : null;
const userRole = currentUser ? currentUser.role : 'Staff';

/* --------------------------------------------------------------------------
   Category Images
   -------------------------------------------------------------------------- */

const CATEGORY_IMAGES = {
  'Executive Boardroom': 'https://www.andmeetings.com/wp-content/uploads/2019/08/7-boardroom-design-considerations-Blog.jpg',
  'Meeting Room': 'https://www.maiortvlift.com/wp-content/uploads/2024/05/tech-meeting-room-1024x538.jpg',
  'Conference Hall': 'https://www.oyorooms.com/blog/wp-content/uploads/2018/03/proper-seating-arrangement.jpg',
  'Focus Pod': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS14WuKqIM7OJYPmqNYenHO75buI1Jt9FuN3X0w22Qb-ZAVMLG6cy9pFe_v&s=10',
  'Hot Desk Area': 'https://go-work-web.storage.googleapis.com/post/117/thumbnail/What-is-Hot-Desking.jpg',
  'Private Cabin': 'https://static.wixstatic.com/media/789222_f6a375eaf5fe4cce948ec3c2018d50d2~mv2.jpg/v1/fill/w_980,h_551,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/789222_f6a375eaf5fe4cce948ec3c2018d50d2~mv2.jpg'
};

/* --------------------------------------------------------------------------
   IST Helpers
   -------------------------------------------------------------------------- */

function getISTDateString() {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Intl.DateTimeFormat('en-CA', options).format(new Date());
}

function getISTHour() {
  const options = { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false };
  let hr = parseInt(new Intl.DateTimeFormat('en-US', options).format(new Date()), 10);
  return hr === 24 ? 0 : hr;
}

/* --------------------------------------------------------------------------
   API Fetchers
   -------------------------------------------------------------------------- */

async function fetchRooms() {
  try {
    const dateInput = document.getElementById('booking-date')?.value || '';
    const timeInput = document.getElementById('booking-time')?.value || '';
    const durationInput = document.getElementById('booking-duration')?.value || '';
    const categoryInput = document.getElementById('booking-category')?.value || '';

    const queryParams = new URLSearchParams();
    if (dateInput) queryParams.append('date', dateInput);
    if (timeInput) queryParams.append('time', timeInput);
    if (durationInput) queryParams.append('duration', durationInput);
    if (categoryInput) queryParams.append('category', categoryInput);

    const res = await fetch(`${BACKEND_URL}/rooms?${queryParams.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();

    const roomsList = document.getElementById('rooms-list');
    const roomsCount = document.getElementById('rooms-count');

    if (roomsList) {
      if (!data.rooms || data.rooms.length === 0) {
        roomsList.innerHTML = `<p style="color:#64748b; padding: 24px 0; text-align:center;">No available rooms found for the selected filters.</p>`;
      } else {
        roomsList.innerHTML = data.rooms.map(createRoomCardHTML).join('');
      }
    }
    if (roomsCount) {
      roomsCount.textContent = `${(data.rooms || []).length} found`;
    }
  } catch (err) {
    console.error('Error fetching rooms:', err);
    const roomsList = document.getElementById('rooms-list');
    if (roomsList) {
      roomsList.innerHTML = `<p style="color:#ef4444; padding: 24px 0; text-align:center;">Failed to load rooms. Please refresh.</p>`;
    }
  }
}

async function fetchBookings() {
  try {
    const res = await fetch(`${BACKEND_URL}/bookings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();

    const now = new Date();
    const upcomingBookings = (data.bookings || []).filter(b => {
      if (b.status === 'cancelled') return false;

      // booking_date from PostgreSQL is a UTC timestamp (e.g. 2026-07-24T18:30Z = 2026-07-25 IST)
      // Convert to local date string so the date is correct for the user's timezone
      const localDate = new Date(b.booking_date);
      const year  = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day   = String(localDate.getDate()).padStart(2, '0');
      const datePart = `${year}-${month}-${day}`;

      // PostgreSQL returns time as HH:MM:SS — take only HH:MM
      const startHHMM = (b.start_time || '00:00').slice(0, 5);
      const endHHMM   = (b.end_time   || '23:59').slice(0, 5);

      const startDateTime = new Date(`${datePart}T${startHHMM}:00`);
      let   endDateTime   = new Date(`${datePart}T${endHHMM}:00`);

      // Overnight booking — end is actually the next day
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      return endDateTime >= now;
    });

    const bookingsList = document.getElementById('bookings-list');
    if (bookingsList) {
      if (upcomingBookings.length === 0) {
        bookingsList.innerHTML = `<li style="color:#64748b; font-size:13px; padding: 12px 0; list-style:none; text-align:center;">No upcoming bookings.</li>`;
      } else {
        bookingsList.innerHTML = upcomingBookings.map(createBookingItemHTML).join('');
      }
    }
  } catch (err) {
    console.error('Error fetching bookings:', err);
  }
}

async function cancelBooking(id) {
  try {
    const res = await fetch(`${BACKEND_URL}/bookings/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to cancel booking');
    }
    if (window.SNToast) SNToast.show({ message: 'Booking cancelled successfully', type: 'success' });
    fetchBookings();
    fetchRooms();
  } catch (err) {
    if (window.SNToast) SNToast.show({ message: err.message, type: 'error' });
  }
}

async function bookRoom() {
  if (!pendingRoomId) return;
  const dateInput = document.getElementById('booking-date').value;
  const timeInput = document.getElementById('booking-time').value;
  const durationInput = document.getElementById('booking-duration').value;
  const purposeInput = document.getElementById('booking-purpose')?.value?.trim();

  if (!dateInput || !timeInput || !durationInput) {
    if (window.SNToast) SNToast.show({ message: 'Please select date, time, and duration first!', type: 'error' });
    return;
  }
  if (!purposeInput) {
    if (window.SNToast) SNToast.show({ message: 'Please enter a purpose for this booking.', type: 'error' });
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        room_id: pendingRoomId,
        booking_date: dateInput,
        start_time: timeInput,
        duration: parseInt(durationInput, 10),
        purpose: purposeInput
      })
    });

    const data = await res.json();
    closeBookingModal();
    if (res.ok) {
      if (window.SNToast) SNToast.show({ message: 'Booking confirmed successfully!', type: 'success' });
      fetchRooms();
      fetchBookings();
    } else {
      if (window.SNToast) SNToast.show({ message: data.message || 'Failed to create booking.', type: 'error' });
    }
  } catch (err) {
    console.error(err);
    if (window.SNToast) SNToast.show({ message: 'Network error.', type: 'error' });
  }
}

/* --------------------------------------------------------------------------
   Render Functions
   -------------------------------------------------------------------------- */

function createRoomCardHTML(room) {
  let amenities = [];
  try {
    amenities = JSON.parse(room.amenities || '[]');
  } catch (e) {}

  const AMENITY_ICONS = {
    'TV': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>',
    'Projector': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="6" width="16" height="12" rx="2" ry="2"/><circle cx="12" cy="12" r="3"/></svg>',
    'Whiteboard': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="14" rx="2" ry="2"/><line x1="3" y1="21" x2="21" y2="21"/><line x1="8" y1="21" x2="8" y2="17"/><line x1="16" y1="21" x2="16" y2="17"/></svg>',
    'Video Conferencing': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    'Air Conditioning': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M8 22V9.5"/><path d="M16 2v12.5"/><path d="M4 14.5v3"/><path d="M20 6.5v3"/></svg>',
    'Coffee Machine': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/></svg>'
  };

  const amenityTags = amenities.map(am => {
    const icon = AMENITY_ICONS[am] || '';
    return `<span class="room-card__tag" style="display:inline-flex;align-items:center;gap:4px;">${icon}${am}</span>`;
  }).join('');

  const imageUrl = CATEGORY_IMAGES[room.category] || '';

  return `
    <article class="room-card" role="listitem" data-room-id="${room.room_id}" style="display:flex;flex-direction:row;align-items:stretch;border-radius:14px;background:#fff;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.06);overflow:hidden;transition:box-shadow 0.2s;padding:14px 16px;gap:14px;">
      <img src="${imageUrl}" alt="${room.category}" style="width:90px;height:90px;object-fit:cover;object-position:center;flex-shrink:0;border-radius:10px;align-self:center;" onerror="this.style.display='none'" />
      <div style="display:flex;flex-direction:column;flex:1;gap:4px;min-width:0;justify-content:center;">
        <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${room.room_name}</h4>
        <div style="display:flex;align-items:center;gap:12px;margin-top:2px;">
          ${room.floor ? `<span style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${room.floor}</span>` : ''}
          ${room.capacity ? `<span style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Fits ${room.capacity}</span>` : ''}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">${amenityTags}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;flex-shrink:0;min-height:80px;">
        ${(() => {
          let badgeBg = 'var(--color-success-bg)';
          let badgeColor = 'var(--color-success)';
          let dotColor = 'var(--color-success)';
          let displayStatus = room.status;

          if (displayStatus === 'Booked') {
            badgeBg = '#fef3c7';
            badgeColor = '#d97706';
            dotColor = '#d97706';
          } else if (displayStatus === 'Under Maintenance') {
            badgeBg = 'var(--color-danger-bg)';
            badgeColor = 'var(--color-danger)';
            dotColor = 'var(--color-danger)';
          } else {
            displayStatus = 'Available';
          }

          return `
            <span class="room-card__badge" style="background:${badgeBg}; color:${badgeColor};">
              <span class="room-card__badge-dot" style="color:${dotColor};">●</span> ${displayStatus}
            </span>
          `;
        })()}
        <button type="button" class="room-card__book-btn" data-room-id="${room.room_id}" data-room-name="${room.room_name}" style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:9px 22px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.15s;white-space:nowrap;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
          Book Now
        </button>
      </div>
    </article>`;
}

function createBookingItemHTML(booking) {
  const d = new Date(booking.booking_date);
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  function format12Hr(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.slice(0, 5).split(':');
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;
  }

  const startStr = format12Hr(booking.start_time);
  const endStr = format12Hr(booking.end_time);

  const startObj = new Date(`1970-01-01T${(booking.start_time || '00:00').slice(0, 5)}:00Z`);
  const endObj   = new Date(`1970-01-01T${(booking.end_time   || '00:00').slice(0, 5)}:00Z`);
  let diffMs = endObj - startObj;
  if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
  const durationHours = diffMs / (1000 * 60 * 60);
  const durationText = durationHours === 1 ? '1 Hour' : `${durationHours} Hours`;

  let statusBadge = '';
  if (booking.status === 'confirmed') {
    statusBadge = `<span style="font-size:11px;font-weight:600;color:#16a34a;background:#dcfce7;padding:4px 8px;border-radius:6px;text-transform:uppercase;">Confirmed</span>`;
  } else if (booking.status === 'cancelled') {
    statusBadge = `<span style="font-size:11px;font-weight:600;color:#dc2626;background:#fee2e2;padding:4px 8px;border-radius:6px;text-transform:uppercase;">Cancelled</span>`;
  }
  const cancelBtnHTML = booking.status === 'confirmed'
    ? `<div class="booking-item__actions">
         <button type="button" class="booking-item__btn booking-item__btn--cancel" data-booking-id="${booking.booking_id}">Cancel Booking</button>
       </div>`
    : '';

  return `
    <li class="booking-item" data-booking-id="${booking.booking_id}" role="listitem" style="padding:16px;border-radius:12px;background:#ffffff;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);margin-bottom:12px;display:flex;flex-direction:column;gap:8px;list-style:none;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.5px;">${dateStr}</span>
        <span style="font-size:12px;font-weight:600;color:#1e293b;background:#f1f5f9;padding:4px 10px;border-radius:20px;">${startStr} – ${endStr}</span>
      </div>
      <div style="margin-top:4px;">
        <h4 style="margin:0 0 4px 0;font-size:15px;font-weight:600;color:#0f172a;">${booking.room_name}</h4>
        <p style="margin:0;font-size:13px;color:#64748b;">Duration: ${durationText}</p>
        ${booking.purpose ? `<p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8;font-style:italic;">📌 ${booking.purpose}</p>` : ''}
      </div>
      <div style="display:flex;align-items:center;margin-top:4px;">${statusBadge}</div>
      ${cancelBtnHTML}
    </li>`;
}

/* --------------------------------------------------------------------------
   Modal
   -------------------------------------------------------------------------- */

let pendingRoomName = null;
let pendingRoomId = null;

function openBookingModal(roomName, roomId) {
  pendingRoomName = roomName;
  pendingRoomId = roomId;
  const modal = document.getElementById('booking-modal');
  const message = document.getElementById('modal-message');
  if (message) {
    message.textContent = `You are about to book "${roomName}".`;
  }
  modal?.removeAttribute('hidden');
}

function closeBookingModal() {
  pendingRoomName = null;
  pendingRoomId = null;
  const purposeEl = document.getElementById('booking-purpose');
  if (purposeEl) purposeEl.value = '';
  document.getElementById('booking-modal')?.setAttribute('hidden', '');
}

function initBookingModal() {
  const modal = document.getElementById('booking-modal');
  const confirmBtn = document.getElementById('modal-confirm');

  modal?.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', closeBookingModal);
  });

  confirmBtn?.addEventListener('click', () => {
    bookRoom();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal?.hasAttribute('hidden')) {
      closeBookingModal();
    }
  });
}

/* --------------------------------------------------------------------------
   Event Handlers
   -------------------------------------------------------------------------- */

function initRoomCards() {
  const roomsList = document.getElementById('rooms-list');
  roomsList?.addEventListener('click', (e) => {
    const bookBtn = e.target.closest('.room-card__book-btn');
    if (bookBtn) {
      const roomName = bookBtn.dataset.roomName;
      const roomId = bookBtn.dataset.roomId;
      openBookingModal(roomName, roomId);
    }
  });
}

function initBookingCancel() {
  const bookingsList = document.getElementById('bookings-list');
  bookingsList?.addEventListener('click', (e) => {
    const cancelBtn = e.target.closest('.booking-item__btn--cancel');
    if (!cancelBtn) return;
    const bookingId = cancelBtn.dataset.bookingId;
    if (confirm('Are you sure you want to cancel this booking?')) {
      cancelBooking(bookingId);
    }
  });
}

function enforceISTTime() {
  const dateInput = document.getElementById('booking-date');
  const timeInput = document.getElementById('booking-time');
  if (!dateInput || !timeInput) return;

  const todayStr = getISTDateString();
  const isToday = (dateInput.value === todayStr);
  const currentHour = getISTHour();

  Array.from(timeInput.options).forEach(option => {
    const optionHour = parseInt(option.value.split(':')[0], 10);
    if (isToday && optionHour <= currentHour) {
      option.disabled = true;
      option.style.display = 'none';
    } else {
      option.disabled = false;
      option.style.display = '';
    }
  });

  // If currently selected is disabled, pick the first valid one
  if (timeInput.options[timeInput.selectedIndex]?.disabled) {
    const firstValid = Array.from(timeInput.options).find(opt => !opt.disabled);
    if (firstValid) timeInput.value = firstValid.value;
  }
}

function initFindRoomForm() {
  const form = document.getElementById('find-room-form');
  if (!form) return;

  const dateInput = document.getElementById('booking-date');
  const timeInput = document.getElementById('booking-time');
  const durationSelect = document.getElementById('booking-duration');
  const categorySelect = document.getElementById('booking-category');

  // Set today as the default date
  if (dateInput) {
    const todayStr = getISTDateString();
    dateInput.value = todayStr;
    dateInput.min = todayStr;

    // Enforce time for today on load
    setTimeout(() => {
      enforceISTTime();
      fetchRooms();
    }, 0);

    dateInput.addEventListener('change', () => {
      enforceISTTime();
      fetchRooms();
    });

    dateInput.closest('.find-room__picker')?.addEventListener('click', (e) => {
      if (e.target !== dateInput) {
        dateInput.showPicker?.();
        dateInput.focus();
      }
    });
  }

  timeInput?.addEventListener('change', fetchRooms);
  durationSelect?.addEventListener('change', fetchRooms);
  categorySelect?.addEventListener('change', fetchRooms);
}

/* --------------------------------------------------------------------------
   App Initialization
   -------------------------------------------------------------------------- */

function initApp() {
  const sidebarRoot = document.getElementById('sidebar-root');
  const topbarRoot = document.getElementById('topbar-root');

  renderSidebar(sidebarRoot, { activeItem: 'room-booking' });
  initSidebarNav(sidebarRoot);

  renderTopbar(topbarRoot);
  initTopbarEvents(topbarRoot);

  initFindRoomForm();
  initRoomCards();
  initBookingCancel();
  initBookingModal();

  fetchBookings();
}

document.addEventListener('DOMContentLoaded', initApp);
