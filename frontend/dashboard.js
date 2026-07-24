/**
 * StockNest — Workspace Dashboard
 * API-ready dashboard with empty-state UI. No dummy data.
 */

import { renderSidebar, initSidebarNav } from './components/sidebar.js';

// Authentication Check
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
  console.warn('No authentication token found. Redirecting to login...');
  window.location.href = 'index.html';
}

const BACKEND_URL = 'http://localhost:5000/api';

/* --------------------------------------------------------------------------
   API-ready data store (populated by fetchDashboardData later)
     -------------------------------------------------------------------------- */

  const DashboardData = {
    summary: {
      totalRooms: null,
      occupiedRooms: null,
      availableRooms: null,
      todayBookings: null,
      trends: {
        totalRooms: null,
        occupiedRooms: null,
        availableRooms: null,
        todayBookings: null,
      },
    },
    bookingTrend: { labels: [], datasets: [] },
    occupancy: { labels: [], datasets: [] },
    upcomingBookings: [],
    roomAvailability: [],
    recentActivity: [],
  };

  const MODULE_ROUTES = {
    'setup-locations': 'organisation.html',
    'inventory-management': 'inventory.html',
    'maintenance': 'maintainance.html',
    'room-booking': 'room-booking.html',
    'room-allocation': 'allocation.html',
    'settings': 'stocknest-settings-view.html',
  };

  let bookingChart = null;
  let occupancyChart = null;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* --------------------------------------------------------------------------
     Utilities
     -------------------------------------------------------------------------- */

  function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function formatValue(value) {
    return value === null || value === undefined ? '--' : value;
  }

  function formatTrend(value) {
    return value === null || value === undefined ? '—' : value;
  }

  /* --------------------------------------------------------------------------
     Render functions — call after API data is loaded
     -------------------------------------------------------------------------- */

  function renderSummaryCards() {
    const s = DashboardData.summary;
    const valueMap = {
      totalRoomsValue: s.totalRooms,
      occupiedRoomsValue: s.occupiedRooms,
      availableRoomsValue: s.availableRooms,
      todayBookingsValue: s.todayBookings,
    };

    Object.entries(valueMap).forEach(([id, val]) => {
      const el = $(`#${id}`);
      if (el) el.textContent = formatValue(val);
    });

    const trendMap = {
      totalRoomsTrend: s.trends.totalRooms,
      occupiedRoomsTrend: s.trends.occupiedRooms,
      availableRoomsTrend: s.trends.availableRooms,
      todayBookingsTrend: s.trends.todayBookings,
    };

    Object.entries(trendMap).forEach(([id, val]) => {
      const el = $(`#${id}`);
      if (el) el.textContent = formatTrend(val);
    });
  }

  function renderUpcomingBookings() {
    const bookings = DashboardData.upcomingBookings;
    const list = $('#bookingsTableBody');
    const wrap = $('#bookingsTableWrap');
    const empty = $('#bookingsEmpty');

    if (!list || !wrap || !empty) return;

    if (!bookings.length) {
      wrap.hidden = true;
      empty.hidden = false;
      return;
    }

    wrap.hidden = false;
    empty.hidden = true;

    list.innerHTML = bookings
      .map(
        (b) => `
      <tr onclick="window.location.href='room-booking.html'" style="cursor:pointer;">
        <td><strong>${b.room}</strong></td>
        <td>${b.time}</td>
        <td>${b.bookedBy}</td>
        <td>${b.purpose || '—'}</td>
        <td><span class="badge badge--${b.status.toLowerCase()}">${b.status}</span></td>
      </tr>`
      )
      .join('');
  }

  function renderRoomAvailability() {
    const floors = DashboardData.roomAvailability;
    const list = $('#availabilityList');
    const empty = $('#availabilityEmpty');

    if (!list || !empty) return;

    if (!floors.length) {
      list.hidden = true;
      empty.hidden = false;
      return;
    }

    list.hidden = false;
    empty.hidden = true;

    list.innerHTML = floors
      .map(
        (f) => `
      <div class="availability-item" onclick="window.location.href='room-booking.html'" style="cursor:pointer;">
        <div class="availability-item__header">
          <span>${f.floor || f.roomName || 'Room'}</span>
          <span>${f.percentage}%</span>
        </div>
        <div class="availability-item__track">
          <div class="availability-item__fill" style="width: ${f.percentage}%"></div>
        </div>
      </div>`
      )
      .join('');
  }

  function renderRecentActivity() {
    const activities = DashboardData.recentActivity;
    const list = $('#activityList');
    const empty = $('#activityEmpty');

    if (!list || !empty) return;

    if (!activities.length) {
      list.hidden = true;
      empty.hidden = false;
      return;
    }

    list.hidden = false;
    empty.hidden = true;

    list.innerHTML = activities
      .map(
        (a) => {
          const isMaint = a.description.toLowerCase().includes('maintenance');
          const url = isMaint ? 'maintainance.html' : 'room-booking.html';
          return `
      <div class="activity-item" onclick="window.location.href='${url}'" style="cursor:pointer;">
        <div class="activity-item__dot"></div>
        <div class="activity-item__content">
          <p class="activity-item__text">${a.description}</p>
          <span class="activity-item__time">${a.time}</span>
        </div>
      </div>`;
        }
      )
      .join('');
  }

  function renderDashboard() {
    renderSummaryCards();
    renderUpcomingBookings();
    renderRoomAvailability();
    renderRecentActivity();
    updateCharts();
  }

  /* --------------------------------------------------------------------------
     Charts setup
     -------------------------------------------------------------------------- */

  function initCharts() {
    const bookingCtx = $('#bookingTrendChart');
    if (bookingCtx) {
      bookingChart = new Chart(bookingCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    const occupancyCtx = $('#occupancyChart');
    if (occupancyCtx) {
      occupancyChart = new Chart(occupancyCtx, {
        type: 'doughnut',
        data: {
          labels: [],
          datasets: [],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
          cutout: '70%',
        },
      });
    }
  }

  function updateChartEmptyStates() {
    const hasBookingData = DashboardData.bookingTrend.labels.length > 0;
    const hasOccupancyData = DashboardData.occupancy.labels.length > 0;

    $('#bookingTrendChart').hidden = !hasBookingData;
    $('#bookingChartEmpty').hidden = hasBookingData;

    $('#occupancyChart').hidden = !hasOccupancyData;
    $('#occupancyChartEmpty').hidden = hasOccupancyData;
  }

  function updateCharts() {
    if (bookingChart) {
      bookingChart.data.labels = DashboardData.bookingTrend.labels;
      bookingChart.data.datasets = DashboardData.bookingTrend.datasets.length
        ? DashboardData.bookingTrend.datasets
        : [{ data: [], borderColor: '#2563eb', tension: 0.3 }];
      bookingChart.update();
    }

    if (occupancyChart) {
      occupancyChart.data.labels = DashboardData.occupancy.labels;
      occupancyChart.data.datasets = DashboardData.occupancy.datasets.length
        ? DashboardData.occupancy.datasets
        : [{ data: [], backgroundColor: ['#2563eb', '#93c5fd', '#e5e7eb'] }];
      occupancyChart.update();
    }

    updateChartEmptyStates();
  }

  /* --------------------------------------------------------------------------
     Data fetching
     -------------------------------------------------------------------------- */

  async function fetchDashboardData() {
    try {
      const response = await fetch(`${BACKEND_URL}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Dashboard request failed with status ${response.status}`);
      }

      const data = await response.json();
      Object.assign(DashboardData, data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }

    renderDashboard();
  }

  /* --------------------------------------------------------------------------
     Sidebar & shell navigation
     -------------------------------------------------------------------------- */

  function switchModule(moduleId) {
    if (moduleId !== 'dashboard' && MODULE_ROUTES[moduleId]) {
      window.location.href = MODULE_ROUTES[moduleId];
    }
  }

  /* --------------------------------------------------------------------------
     Shell layout controls
     -------------------------------------------------------------------------- */

  function openSidebar() {
    $('#sidebar')?.classList.add('is-open');
    $('#sidebarOverlay')?.classList.add('is-visible');
    $('#sidebarOverlay')?.setAttribute('aria-hidden', 'false');
  }

  function closeSidebar() {
    $('#sidebar')?.classList.remove('is-open');
    $('#sidebarOverlay')?.classList.remove('is-visible');
    $('#sidebarOverlay')?.setAttribute('aria-hidden', 'true');
  }

  function closeAllDropdowns() {
    $$('.dropdown-panel').forEach((panel) => { panel.hidden = true; });
    $$('[aria-expanded="true"]').forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
  }

  function toggleDropdown(btn, panel) {
    const isOpen = !panel.hidden;
    closeAllDropdowns();
    if (!isOpen) {
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }
  }

  function renderNotifications() {
    const list = $('#notifList');
    if (!list) return;
    list.innerHTML = '<li class="dropdown-panel__empty">No notifications available.</li>';
  }

  function initSummaryCardAnimations() {
    $$('.summary-card').forEach((card, i) => {
      setTimeout(() => card.classList.add('is-visible'), i * 80);
    });
  }

  /* --------------------------------------------------------------------------
     Event bindings
     -------------------------------------------------------------------------- */

  function bindEvents() {
    $$('.sidebar__nav-btn[data-module]').forEach((btn) => {
      btn.addEventListener('click', () => switchModule(btn.dataset.module));
    });

    $('#sidebarToggle')?.addEventListener('click', openSidebar);
    $('#sidebarClose')?.addEventListener('click', closeSidebar);
    $('#sidebarOverlay')?.addEventListener('click', closeSidebar);

    const locationBtn = $('#locationBtn');
    const locationMenu = $('#locationMenu');

    locationBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !locationMenu.hidden;
      closeAllDropdowns();
      locationMenu.hidden = isOpen;
      locationBtn.setAttribute('aria-expanded', String(!isOpen));
    });

    $$('#locationMenu li').forEach((li) => {
      li.addEventListener('click', () => {
        locationMenu.hidden = true;
        locationBtn.setAttribute('aria-expanded', 'false');
        showToast(`Location switched to ${li.dataset.location}.`);
      });
    });

    $('#helpCenterBtn')?.addEventListener('click', () => {
      showToast('Help Center — contact admin@stocknest.io for support.');
    });

    const notifBtn = $('#notifBtn');
    const notifPanel = $('#notifPanel');
    notifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(notifBtn, notifPanel);
    });

    const profileBtn = $('#profileBtn');
    const profilePanel = $('#profilePanel');
    profileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(profileBtn, profilePanel);
    });

    $$('#profilePanel [data-action]').forEach((item) => {
      item.addEventListener('click', () => {
        closeAllDropdowns();
        if (item.dataset.action === 'logout') {
          showToast('Logging out...');
          setTimeout(() => { window.location.href = 'index.html'; }, 800);
        } else if (item.dataset.action === 'settings') {
          window.location.href = 'stocknest-settings-view.html';
        } else {
          window.location.href = 'profile.html';
        }
      });
    });

    $('#quickAddBtn')?.addEventListener('click', () => {
      if (window.openQuickAddModal) window.openQuickAddModal();
    });

    $('#globalSearch')?.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        $('#globalSearch')?.focus();
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && document.activeElement !== $('#globalSearch')) {
        e.preventDefault();
        $('#globalSearch')?.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar__dropdown-wrap') && !e.target.closest('.sidebar__footer')) {
        closeAllDropdowns();
        if (locationMenu) locationMenu.hidden = true;
        if (locationBtn) locationBtn.setAttribute('aria-expanded', 'false');
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) closeSidebar();
    });
  }

  /* --------------------------------------------------------------------------
     Public API for backend integration
     -------------------------------------------------------------------------- */

  window.StockNestDashboard = {
    data: DashboardData,
    render: renderDashboard,
    fetch: fetchDashboardData,
    updateSummary(summary) {
      Object.assign(DashboardData.summary, summary);
      renderSummaryCards();
    },
    updateBookingTrend(labels, datasets) {
      DashboardData.bookingTrend = { labels, datasets };
      updateCharts();
    },
    updateOccupancy(labels, datasets) {
      DashboardData.occupancy = { labels, datasets };
      updateCharts();
    },
    setBookings(bookings) {
      DashboardData.upcomingBookings = bookings;
      renderBookings();
    },
    setRoomAvailability(floors) {
      DashboardData.roomAvailability = floors;
      renderRoomAvailability();
    },
    setRecentActivity(activities) {
      DashboardData.recentActivity = activities;
      renderRecentActivity();
    },
  };

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */

  function init() {
    renderSidebar(document.getElementById('sidebar-root'), { activeItem: 'dashboard' });
    initSidebarNav(document.getElementById('sidebar-root'));
    renderNotifications();
    initSummaryCardAnimations();
    initCharts();
    bindEvents();
    fetchDashboardData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
