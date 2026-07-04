/**
 * StockNest — Room Booking Page
 * Initializes shared components and page-specific interactivity.
 */

import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

/* --------------------------------------------------------------------------
   Mock Data
   -------------------------------------------------------------------------- */

const ROOMS = [
  {
    id: 'rm-104a',
    name: 'The Turing Boardroom',
    wing: 'North Wing',
    floor: '1st Floor',
    code: 'RM-104A',
    capacity: '12 Max',
    amenities: ['Smart Board', 'Video Conf'],
    status: 'Available',
  },
  {
    id: 'rm-201b',
    name: 'Lovelace Huddle',
    wing: 'East Wing',
    floor: '2nd Floor',
    code: 'RM-201B',
    capacity: '4 Max',
    amenities: ['Monitor', 'Whiteboard'],
    status: 'Available',
  },
];

const BOOKINGS = [
  // Top entry — includes Edit / Cancel actions
  {
    id: 'booking-sync',
    datetime: 'TODAY, 2:00 PM',
    duration: '1h 30m',
    title: 'Project Sync: Delta',
    room: 'Hopper Hub (RM-102)',
    showActions: true,
  },
  {
    id: 'booking-pitch',
    datetime: 'TOMORROW, 10:00 AM',
    duration: '45m',
    title: 'Client Pitch',
    room: 'Turing Boardroom',
    showActions: false,
  },
];

/* --------------------------------------------------------------------------
   SVG Icons (inline helpers for dynamic rendering)
   -------------------------------------------------------------------------- */

const ICONS = {
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  mapPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  roomThumbnail: `<svg class="room-card__thumbnail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
};

/* --------------------------------------------------------------------------
   Render Functions
   -------------------------------------------------------------------------- */

/**
 * Builds HTML for a single room card.
 * @param {object} room
 * @returns {string}
 */
function createRoomCardHTML(room) {
  const amenityTags = room.amenities
    .map(
      (amenity) =>
        `<span class="room-card__tag">${amenity}</span>`
    )
    .join('');

  return `
    <article class="room-card" role="listitem" data-room-id="${room.id}">
      <div class="room-card__thumbnail" aria-hidden="true">${ICONS.roomThumbnail}</div>
      <div class="room-card__body">
        <div class="room-card__header">
          <div class="room-card__info">
            <h4 class="room-card__name">${room.name}</h4>
            <p class="room-card__location">${room.wing} • ${room.floor}</p>
            <p class="room-card__code">${room.code}</p>
          </div>
          <span class="room-card__badge">
            <span class="room-card__badge-dot">●</span> ${room.status}
          </span>
        </div>
        <div class="room-card__tags">
          <span class="room-card__tag">${ICONS.users} ${room.capacity}</span>
          ${amenityTags}
        </div>
        <div class="room-card__footer">
          <button type="button" class="room-card__book-btn" data-room-name="${room.name}">
            Book Now
          </button>
        </div>
      </div>
    </article>`;
}

/**
 * Builds HTML for a single booking item.
 * @param {object} booking
 * @returns {string}
 */
function createBookingItemHTML(booking) {
  const actionsHTML = booking.showActions
    ? `<div class="booking-item__actions">
         <button type="button" class="booking-item__btn booking-item__btn--edit">Edit</button>
         <button type="button" class="booking-item__btn booking-item__btn--cancel" data-booking-id="${booking.id}">Cancel</button>
       </div>`
    : '';

  return `
    <li class="booking-item" data-booking-id="${booking.id}" role="listitem">
      <div class="booking-item__meta">
        <span class="booking-item__datetime">${booking.datetime}</span>
        <span class="booking-item__duration">${booking.duration}</span>
      </div>
      <p class="booking-item__title">${booking.title}</p>
      <p class="booking-item__room">${ICONS.mapPin} ${booking.room}</p>
      ${actionsHTML}
    </li>`;
}

/**
 * Renders all room cards into the rooms list container.
 */
function renderRooms() {
  const roomsList = document.getElementById('rooms-list');
  const roomsCount = document.getElementById('rooms-count');

  if (!roomsList) return;

  roomsList.innerHTML = ROOMS.map(createRoomCardHTML).join('');
  if (roomsCount) {
    roomsCount.textContent = `${ROOMS.length} found`;
  }
}

/**
 * Renders all booking items into the bookings list container.
 */
function renderBookings() {
  const bookingsList = document.getElementById('bookings-list');
  if (!bookingsList) return;

  bookingsList.innerHTML = BOOKINGS.map(createBookingItemHTML).join('');
}

/* --------------------------------------------------------------------------
   Modal
   -------------------------------------------------------------------------- */

let pendingRoomName = null;

function openBookingModal(roomName) {
  pendingRoomName = roomName;
  const modal = document.getElementById('booking-modal');
  const message = document.getElementById('modal-message');

  if (message) {
    message.textContent = `You are about to book "${roomName}". This is placeholder logic — real booking will be wired up later.`;
  }

  modal?.removeAttribute('hidden');
}

function closeBookingModal() {
  pendingRoomName = null;
  document.getElementById('booking-modal')?.setAttribute('hidden', '');
}

function initModal() {
  const modal = document.getElementById('booking-modal');
  const confirmBtn = document.getElementById('modal-confirm');

  modal?.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', closeBookingModal);
  });

  confirmBtn?.addEventListener('click', () => {
    if (pendingRoomName) {
      console.log('[Booking Confirmed]', pendingRoomName);
      alert(`Booking confirmed for "${pendingRoomName}"! (placeholder)`);
    }
    closeBookingModal();
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

/**
 * Delegated click handler for "Book Now" buttons on room cards.
 */
function initRoomCards() {
  const roomsList = document.getElementById('rooms-list');

  roomsList?.addEventListener('click', (e) => {
    const bookBtn = e.target.closest('.room-card__book-btn');
    if (bookBtn) {
      const roomName = bookBtn.dataset.roomName;
      openBookingModal(roomName);
    }
  });
}

/**
 * Delegated click handler for "Cancel" on booking items — removes from DOM.
 */
function initBookingCancel() {
  const bookingsList = document.getElementById('bookings-list');

  bookingsList?.addEventListener('click', (e) => {
    const cancelBtn = e.target.closest('.booking-item__btn--cancel');
    if (!cancelBtn) return;

    const bookingId = cancelBtn.dataset.bookingId;
    const item = bookingsList.querySelector(`[data-booking-id="${bookingId}"]`);

    if (item) {
      console.log('[Booking Cancelled]', bookingId);
      item.remove();
    }
  });

  bookingsList?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.booking-item__btn--edit');
    if (editBtn) {
      const bookingId = editBtn.closest('.booking-item')?.dataset.bookingId;
      console.log('[Booking Edit] Edit clicked — placeholder', bookingId);
    }
  });
}

/**
 * Attaches change/input listeners to the Find a Room form fields.
 */
function initFindRoomForm() {
  const form = document.getElementById('find-room-form');
  if (!form) return;

  const dateInput = document.getElementById('booking-date');
  const timeInput = document.getElementById('booking-time');
  const durationSelect = document.getElementById('booking-duration');
  const capacitySelect = document.getElementById('booking-capacity');

  // Default date to today; clicking the styled wrapper opens the native picker
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    dateInput.addEventListener('change', (e) => {
      console.log('[Find Room] Date changed:', e.target.value);
    });

    dateInput.closest('.find-room__picker')?.addEventListener('click', (e) => {
      if (e.target !== dateInput) {
        dateInput.showPicker?.();
        dateInput.focus();
      }
    });
  }

  timeInput?.addEventListener('change', (e) => {
    console.log('[Find Room] Time changed:', e.target.value);
  });

  timeInput?.closest('.find-room__picker')?.addEventListener('click', (e) => {
    if (e.target !== timeInput) {
      timeInput.showPicker?.();
      timeInput.focus();
    }
  });

  durationSelect?.addEventListener('change', (e) => {
    const label = e.target.options[e.target.selectedIndex].text;
    console.log('[Find Room] Duration changed:', label, `(${e.target.value} min)`);
  });

  capacitySelect?.addEventListener('change', (e) => {
    const label = e.target.options[e.target.selectedIndex].text;
    console.log('[Find Room] Capacity changed:', label);
  });
}

/* --------------------------------------------------------------------------
   App Initialization
   -------------------------------------------------------------------------- */

function initApp() {
  // Mount shared layout components
  const sidebarRoot = document.getElementById('sidebar-root');
  const topbarRoot = document.getElementById('topbar-root');

  renderSidebar(sidebarRoot, { activeItem: 'room-booking' });
  initSidebarNav(sidebarRoot);

  renderTopbar(topbarRoot);
  initTopbarEvents(topbarRoot);

  // Render page content
  renderRooms();
  renderBookings();

  // Wire up interactivity
  initRoomCards();
  initBookingCancel();
  initFindRoomForm();
  initModal();
}

document.addEventListener('DOMContentLoaded', initApp);
