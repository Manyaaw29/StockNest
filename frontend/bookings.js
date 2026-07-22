/**
 * StockNest — Bookings Management
 * Main application logic: table rendering, filtering, search, cancel, and modal
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     Mock booking data
     -------------------------------------------------------------------------- */
  /* Default bookings: exactly BK-2451 through BK-2456 */
  let bookings = [
    {
      id: 'BK-2451',
      user: 'Rahul Sharma',
      initials: 'RS',
      space: 'Meeting Room A-101',
      date: 'May 16, 2025',
      startTime: '10:00',
      endTime: '11:00',
      status: 'upcoming',
    },
    {
      id: 'BK-2452',
      user: 'Ananya Singh',
      initials: 'AS',
      space: 'Room B-204',
      date: 'May 15, 2025',
      startTime: '12:00',
      endTime: '13:00',
      status: 'active',
    },
    {
      id: 'BK-2453',
      user: 'Vikram Patel',
      initials: 'VP',
      space: 'Conference Room C-301',
      date: 'May 15, 2025',
      startTime: '14:00',
      endTime: '15:30',
      status: 'completed',
    },
    {
      id: 'BK-2454',
      user: 'Neha Verma',
      initials: 'NV',
      space: 'Room D-404',
      date: 'May 17, 2025',
      startTime: '16:00',
      endTime: '17:00',
      status: 'upcoming',
    },
    {
      id: 'BK-2455',
      user: 'Team Event',
      initials: 'TE',
      space: 'Multipurpose Hall M-01',
      date: 'May 18, 2025',
      startTime: '17:30',
      endTime: '18:30',
      status: 'cancelled',
    },
    {
      id: 'BK-2456',
      user: 'Priya Kapoor',
      initials: 'PK',
      space: 'Meeting Room A-101',
      date: 'May 14, 2025',
      startTime: '09:00',
      endTime: '09:30',
      status: 'completed',
    },
  ];

  let nextBookingNumber = 2457;
  let activeFilter = 'all';
  let searchQuery = '';

  /* --------------------------------------------------------------------------
     DOM references
     -------------------------------------------------------------------------- */
  const tableBody = document.getElementById('booking-table-body');
  const bookingCountEl = document.getElementById('booking-count');
  const filterTabs = document.querySelectorAll('.filter-tabs__tab');
  const bookingSearchInput = document.getElementById('booking-search');
  const globalSearchInput = document.getElementById('global-search');
  const newBookingBtn = document.getElementById('new-booking-btn');
  const modal = document.getElementById('booking-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const bookingForm = document.getElementById('booking-form');

  const statEls = {
    upcoming: document.getElementById('stat-upcoming'),
    active: document.getElementById('stat-active'),
    completed: document.getElementById('stat-completed'),
    cancelled: document.getElementById('stat-cancelled'),
  };

  /* --------------------------------------------------------------------------
     Helpers
     -------------------------------------------------------------------------- */

  /** Derive two-letter initials from a full name */
  function getInitials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  /** Format a Date object as "Month DD, YYYY" */
  function formatDisplayDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /** Convert display date (e.g. "May 16, 2025") to YYYY-MM-DD for date input */
  function parseDisplayDateToInput(displayDate) {
    const date = new Date(displayDate);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Capitalize first letter of status for badge label */
  function capitalizeStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /** Count bookings grouped by status */
  function getStatusCounts() {
    return bookings.reduce(
      (counts, booking) => {
        counts[booking.status] = (counts[booking.status] || 0) + 1;
        return counts;
      },
      { upcoming: 0, active: 0, completed: 0, cancelled: 0 }
    );
  }

  /** Update stat card numbers in the DOM */
  function updateStats() {
    const counts = getStatusCounts();
    statEls.upcoming.textContent = counts.upcoming;
    statEls.active.textContent = counts.active;
    statEls.completed.textContent = counts.completed;
    statEls.cancelled.textContent = counts.cancelled;
  }

  /** Check whether a booking matches the current filter + search */
  function isBookingVisible(booking) {
    const matchesFilter =
      activeFilter === 'all' || booking.status === activeFilter;

    if (!matchesFilter) return false;

    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      booking.id.toLowerCase().includes(query) ||
      booking.user.toLowerCase().includes(query) ||
      booking.space.toLowerCase().includes(query)
    );
  }

  /** Build status badge HTML */
  function renderStatusBadge(status) {
    return `
      <span class="status-badge status-badge--${status}">
        <span class="status-badge__dot"></span>
        ${capitalizeStatus(status)}
      </span>
    `;
  }

  /** Build actions column HTML — Cancel only for upcoming & active */
  function renderActions(booking) {
    const canCancel =
      booking.status === 'upcoming' || booking.status === 'active';

    const cancelBtn = canCancel
      ? `<button type="button" class="booking-table__action booking-table__action--cancel" data-action="cancel" data-id="${booking.id}">Cancel</button>`
      : '';

    return `
      <div class="booking-table__actions">
        <button type="button" class="booking-table__action booking-table__action--edit" data-action="edit" data-id="${booking.id}">Edit</button>
        ${cancelBtn}
      </div>
    `;
  }

  /** Build a single table row */
  function renderRow(booking, index) {
    const visible = isBookingVisible(booking);
    const avatarIndex = index % 6;

    return `
      <tr class="booking-table__row${visible ? '' : ' booking-table__row--hidden'}" data-id="${booking.id}" data-status="${booking.status}">
        <td><a href="#" class="booking-table__id" data-id="${booking.id}">${booking.id}</a></td>
        <td>
          <div class="booking-table__user">
            <span class="booking-table__avatar booking-table__avatar--${avatarIndex}">${booking.initials}</span>
            <span class="booking-table__user-name">${booking.user}</span>
          </div>
        </td>
        <td>${booking.space}</td>
        <td>${booking.date}</td>
        <td>${booking.startTime}</td>
        <td>${booking.endTime}</td>
        <td class="booking-table__status-cell">${renderStatusBadge(booking.status)}</td>
        <td>${renderActions(booking)}</td>
      </tr>
    `;
  }

  /** Re-render the entire table and update the footer count */
  function renderTable() {
    tableBody.innerHTML = bookings
      .map((booking, index) => renderRow(booking, index))
      .join('');

    const visibleCount = bookings.filter(isBookingVisible).length;
    bookingCountEl.textContent = `Showing ${visibleCount} booking${visibleCount !== 1 ? 's' : ''}`;
  }

  /* --------------------------------------------------------------------------
     Filter tabs
     -------------------------------------------------------------------------- */
  function setActiveFilter(filter) {
    activeFilter = filter;

    filterTabs.forEach((tab) => {
      const isActive = tab.dataset.filter === filter;
      tab.classList.toggle('filter-tabs__tab--active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    renderTable();
  }

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setActiveFilter(tab.dataset.filter);
    });
  });

  /* --------------------------------------------------------------------------
     Search (table filter)
     -------------------------------------------------------------------------- */
  bookingSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderTable();
  });

  /* --------------------------------------------------------------------------
     Cancel booking action
     -------------------------------------------------------------------------- */
  tableBody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit"]');
    if (editBtn) {
      e.preventDefault();
      const booking = bookings.find((b) => b.id === editBtn.dataset.id);
      if (booking) openEditModal(booking);
      return;
    }

    const cancelBtn = e.target.closest('[data-action="cancel"]');
    if (!cancelBtn) return;

    e.preventDefault();
    const bookingId = cancelBtn.dataset.id;
    const booking = bookings.find((b) => b.id === bookingId);

    if (!booking) return;

    booking.status = 'cancelled';
    updateStats();
    renderTable();
  });

  /* Prevent booking ID links from navigating */
  tableBody.addEventListener('click', (e) => {
    if (e.target.closest('.booking-table__id')) {
      e.preventDefault();
    }
  });

  /* --------------------------------------------------------------------------
     Modal — New / Edit Booking
     -------------------------------------------------------------------------- */
  let editingBookingId = null;

  const modalTitle = document.getElementById('modal-title');
  const modalSubmitBtn = bookingForm.querySelector('button[type="submit"]');

  function resetModalMode() {
    editingBookingId = null;
    modalTitle.textContent = 'New Booking';
    modalSubmitBtn.textContent = 'Confirm';
  }

  function openModal() {
    resetModalMode();
    bookingForm.reset();
    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('field-user').focus();
  }

  function openEditModal(booking) {
    editingBookingId = booking.id;
    modalTitle.textContent = 'Edit Booking';
    modalSubmitBtn.textContent = 'Update Booking';

    document.getElementById('field-user').value = booking.user;
    document.getElementById('field-space').value = booking.space;
    document.getElementById('field-date').value = parseDisplayDateToInput(booking.date);
    document.getElementById('field-start').value = booking.startTime;
    document.getElementById('field-end').value = booking.endTime;

    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('field-user').focus();
  }

  function closeModal() {
    modal.classList.remove('modal--open');
    modal.setAttribute('aria-hidden', 'true');
    bookingForm.reset();
    resetModalMode();
  }

  newBookingBtn.addEventListener('click', openModal);
  modalCancelBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const userName = document.getElementById('field-user').value.trim();
    const space = document.getElementById('field-space').value;
    const dateRaw = document.getElementById('field-date').value;
    const startTime = document.getElementById('field-start').value;
    const endTime = document.getElementById('field-end').value;

    if (!userName || !space || !dateRaw || !startTime || !endTime) {
      alert('Please fill all fields');
      return;
    }

    if (endTime <= startTime) {
      alert('End time must be after start time');
      return;
    }

    if (editingBookingId) {
      const booking = bookings.find((b) => b.id === editingBookingId);
      if (booking) {
        booking.user = userName;
        booking.initials = getInitials(userName);
        booking.space = space;
        booking.date = formatDisplayDate(dateRaw);
        booking.startTime = startTime;
        booking.endTime = endTime;
      }
    } else {
      const newBooking = {
        id: `BK-${nextBookingNumber}`,
        user: userName,
        initials: getInitials(userName),
        space,
        date: formatDisplayDate(dateRaw),
        startTime,
        endTime,
        status: 'upcoming',
      };

      nextBookingNumber += 1;
      bookings.unshift(newBooking);
    }

    updateStats();
    renderTable();
    closeModal();
  });

  /* --------------------------------------------------------------------------
     Keyboard shortcut — Cmd+K / Ctrl+K focuses global search
     -------------------------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (globalSearchInput) {
        globalSearchInput.focus();
        globalSearchInput.select();
      }
    }

    // Close modal on Escape
    if (e.key === 'Escape' && modal.classList.contains('modal--open')) {
      closeModal();
    }
  });

  /* --------------------------------------------------------------------------
     Initial render
     -------------------------------------------------------------------------- */
  updateStats();
  renderTable();
})();
