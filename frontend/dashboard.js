import { requireAuth, apiFetch } from './sn_common.js';
import { renderSidebar, initSidebarNav } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents } from './components/topbar.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // ── Layout ─────────────────────────────────────────────────────────────────
  const sidebarRoot = document.getElementById('sidebar-root');
  const topbarRoot  = document.getElementById('topbar-root');
  if (sidebarRoot) { renderSidebar(sidebarRoot, { activeItem: 'dashboard' }); initSidebarNav(sidebarRoot); }
  if (topbarRoot)  { renderTopbar(topbarRoot); initTopbarEvents(topbarRoot); }

  // ── Topbar user info & Greeting ────────────────────────────────────────────
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}'); }
    catch { return {}; }
  })();
  const profileBtn = document.getElementById('profileBtn');
  let firstName = 'User';
  if (profileBtn && user.name) {
    const parts = user.name.trim().split(' ');
    firstName = parts[0] || 'User';
    profileBtn.textContent = `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || 'U';
  }

  // Dynamic Greeting
  const greetingEl = document.getElementById('dashboardGreeting');
  if (greetingEl) {
    const hour = new Date().getHours();
    let greeting = 'Good Evening';
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 18) greeting = 'Good Afternoon';
    greetingEl.textContent = `${greeting}, ${firstName} 👋`;
  }

  // ── Load dashboard data ─────────────────────────────────────────────
  try {
    const res  = await apiFetch('/api/dashboard');

    if (!res.ok) {
      console.warn('Dashboard data failed to load:', res.status);
      return;
    }

    const data = await res.json();

    // ── Summary cards ───────────────────────────────────────────────
    const summary = data.summary || {};
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? '--';
    };
    set('totalRoomsValue',     summary.totalRooms     ?? '--');
    set('occupiedRoomsValue',  summary.occupiedRooms  ?? '--');
    set('availableRoomsValue', summary.availableRooms ?? '--');
    set('todayBookingsValue',  summary.todayBookings  ?? '--');

    // ── Charts (Pure CSS + SVG — no Chart.js) ───────────────────────────────────

    // ── 1. Bar Chart (Day-wise, current week) ────────────────────────────
    const barWrap  = document.getElementById('barChartWrap');
    const barEmpty = document.getElementById('barChartEmpty');
    const trend    = data.bookingTrend || {};
    const trendLabels = trend.labels || [];   // ['Monday','Tuesday',...]
    const trendData   = (trend.datasets?.[0]?.data || []);
    const hasTrend    = trendData.some(v => v > 0);

    if (barWrap) {
      if (!hasTrend) {
        barWrap.style.display = 'none';
        if (barEmpty) barEmpty.style.display = 'block';
      } else {
        const maxVal = Math.max(...trendData, 1);
        barWrap.style.height = '160px';
        barWrap.style.alignItems = 'unset';
        barWrap.style.gap = '6px';
        barWrap.style.paddingBottom = '0';
        barWrap.style.borderBottom = '1px solid #f1f5f9';
        barWrap.innerHTML = trendLabels.map((label, i) => {
          const val   = trendData[i] || 0;
          const pct   = Math.round((val / maxVal) * 100);
          const clamp = Math.max(pct, val > 0 ? 6 : 0);
          const bg    = val > 0 ? 'linear-gradient(180deg,#6366f1 0%,#818cf8 100%)' : '#f1f5f9';
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:0;">
              ${val > 0 ? `<span style="font-size:11px;font-weight:700;color:#6366f1;margin-bottom:3px;">${val}</span>` : '<span style="display:block;height:18px;"></span>'}
              <div title="${val} booking${val !== 1 ? 's' : ''}"
                style="width:76%;height:${clamp}%;background:${bg};border-radius:5px 5px 0 0;transition:opacity .15s;min-height:${val > 0 ? '6px' : '0'};"
                onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'"
              ></div>
              <span style="font-size:10px;color:#94a3b8;font-weight:500;margin-top:5px;">${label.slice(0,3)}</span>
            </div>`;
        }).join('');
      }
    }



    // ── 2. SVG Doughnut ───────────────────────────────────────────────────
    const occSvg     = document.getElementById('occupancySvg');
    const occLegend  = document.getElementById('occupancyLegend');
    const occEmpty   = document.getElementById('occupancyEmpty');
    const occTotalEl = document.getElementById('occTotal');
    const occ        = data.occupancy || {};
    const occLabels  = occ.labels || [];
    const occData    = (occ.datasets?.[0]?.data || []);
    const total      = occData.reduce((a, b) => a + b, 0);

    // Semantic colors: Booked=indigo, Under Maintenance=amber, Available=emerald
    const OCC_COLORS = ['#6366f1', '#f59e0b', '#10b981'];

    // Helper: convert polar angle to cartesian x,y
    function polarToCartesian(cx, cy, r, angleDeg) {
      const rad = (angleDeg - 90) * Math.PI / 180;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }

    // Build an SVG arc path for a ring segment
    function ringArcPath(cx, cy, r, strokeW, startAngle, endAngle) {
      // Clamp to avoid full-circle (which collapses to a point in SVG)
      const sweep = Math.min(endAngle - startAngle, 359.99);
      const start = polarToCartesian(cx, cy, r, startAngle);
      const end   = polarToCartesian(cx, cy, r, startAngle + sweep);
      const large = sweep > 180 ? 1 : 0;
      return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
    }

    if (occSvg) {
      if (occEmpty) occEmpty.style.display = 'none';
      if (occTotalEl) occTotalEl.textContent = total || 0;

      const cx = 90, cy = 90, r = 68, strokeW = 20;
      const GAP_DEG = 2; // gap in degrees between segments

      let startAngle = 0;
      const paths = occData.map((val, i) => {
        if (val <= 0 || total <= 0) return '';
        const pct        = val / total;
        const sweepDeg   = pct * 360;
        const endAngle   = startAngle + sweepDeg;
        // Apply gap only when segment is large enough
        const s = sweepDeg > GAP_DEG * 2 ? startAngle + GAP_DEG / 2 : startAngle;
        const e = sweepDeg > GAP_DEG * 2 ? endAngle   - GAP_DEG / 2 : endAngle;
        const d = ringArcPath(cx, cy, r, strokeW, s, e);
        const path = `<path
          d="${d}"
          fill="none"
          stroke="${OCC_COLORS[i % OCC_COLORS.length]}"
          stroke-width="${strokeW}"
          stroke-linecap="butt"
          class="occ-arc"
          data-index="${i}"
          data-val="${val}"
          data-label="${occLabels[i] || ''}"
          style="transition:stroke-width 0.2s,opacity 0.2s;cursor:pointer;"
        />`;
        startAngle = endAngle;
        return path;
      }).join('');

      occSvg.innerHTML = `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${strokeW}"/>
        ${paths}
      `;

      // Legend — always show all labels
      if (occLegend) {
        occLegend.innerHTML = occLabels.map((label, i) => {
          const val   = occData[i] || 0;
          const pct   = total > 0 ? Math.round((val / total) * 100) : 0;
          const color = OCC_COLORS[i % OCC_COLORS.length];
          return `
            <div class="occ-legend-item" data-index="${i}"
              style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:8px;transition:background 0.2s;cursor:pointer;">
              <div style="width:11px;height:11px;border-radius:50%;background:${color};flex-shrink:0;box-shadow:0 0 0 3px ${color}22;"></div>
              <div style="flex:1;">
                <div style="font-size:12px;font-weight:600;color:#334155;">${label}</div>
                <div style="font-size:11px;color:#94a3b8;">${val} room${val !== 1 ? 's' : ''} · ${pct}%</div>
              </div>
            </div>`;
        }).join('');
      }

      // Hover interactions
      const arcEls        = occSvg.querySelectorAll('.occ-arc');
      const legEls        = occLegend ? occLegend.querySelectorAll('.occ-legend-item') : [];
      const occTotalLabel = occTotalEl ? occTotalEl.nextElementSibling : null;

      const resetChart = () => {
        arcEls.forEach(el => { el.style.opacity = '1'; el.setAttribute('stroke-width', strokeW); });
        legEls.forEach(el => el.style.background = 'transparent');
        if (occTotalEl) occTotalEl.textContent = total || 0;
        if (occTotalLabel) occTotalLabel.textContent = 'Total';
      };

      const highlightIndex = (idx) => {
        arcEls.forEach(el => {
          if (el.getAttribute('data-index') == idx) {
            el.style.opacity = '1';
            el.setAttribute('stroke-width', strokeW + 5);
            if (occTotalEl) occTotalEl.textContent = el.getAttribute('data-val');
            if (occTotalLabel) occTotalLabel.textContent = el.getAttribute('data-label');
          } else {
            el.style.opacity = '0.2';
            el.setAttribute('stroke-width', strokeW);
          }
        });
        legEls.forEach(el => {
          el.style.background = el.getAttribute('data-index') == idx ? '#f8fafc' : 'transparent';
        });
      };

      arcEls.forEach(el => {
        el.addEventListener('mouseenter', () => highlightIndex(el.getAttribute('data-index')));
        el.addEventListener('mouseleave', resetChart);
      });
      legEls.forEach(el => {
        el.addEventListener('mouseenter', () => highlightIndex(el.getAttribute('data-index')));
        el.addEventListener('mouseleave', resetChart);
      });
    }

    // ── Upcoming Bookings table ────────────────────────────────────────────

    const tbody = document.getElementById('bookingsTableBody');
    const wrap  = document.getElementById('bookingsTableWrap');
    const empty = document.getElementById('bookingsEmpty');
    const upcoming = data.upcomingBookings || [];

    if (tbody && upcoming.length > 0) {
      if (wrap)  wrap.hidden = false;
      if (empty) empty.style.display = 'none';
      tbody.innerHTML = upcoming.map(b => {
        const statusColors = {
          confirmed: '#dcfce7;color:#16a34a',
          pending:   '#fef9c3;color:#ca8a04',
          cancelled: '#fee2e2;color:#dc2626',
          'no-show': '#f3f4f6;color:#6b7280',
        };
        const sc = statusColors[b.status] || '#f3f4f6;color:#6b7280';
        const date = b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
        const duration = b.duration_hours ? `${b.duration_hours} hr${b.duration_hours !== 1 ? 's' : ''}` : '—';
        return `
          <tr style="transition:background 0.2s;cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'" onclick="window.location.href='room-booking.html'">
            <td>${b.room || '—'}</td>
            <td><span style="font-weight:500;color:#64748b;">${date}</span></td>
            <td>${b.time || '—'}</td>
            <td>${duration}</td>
            <td>${b.bookedBy || '—'}</td>
            <td><span style="display:inline-block;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:600;background:${sc.split(';')[0].replace('background:','')};${sc.split(';')[1]||''};">${b.status}</span></td>
          </tr>`;
      }).join('');
    }

    // ── Room Availability ──────────────────────────────────────────────────
    const avList   = document.getElementById('availabilityList');
    const avEmpty  = document.getElementById('availabilityEmpty');
    const avData   = data.roomAvailability || [];

    if (avList && avData.length > 0) {
      avList.hidden = false;
      if (avEmpty) avEmpty.style.display = 'none';
      avList.innerHTML = avData.map(r => {
        const pct = Math.min(Math.round(r.percentage || 0), 100);
        return `
          <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:500;margin-bottom:6px;">
              <span>${r.floor || 'General'}</span>
              <span style="color:var(--color-text-muted);">${pct}%</span>
            </div>
            <div style="height:6px;background:#f1f5f9;border-radius:999px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:#2563eb;border-radius:999px;transition:width .4s;"></div>
            </div>
          </div>`;
      }).join('');
    }

    // ── Admin Alerts ───────────────────────────────────────────────────────
    const alertsWrap = document.getElementById('adminAlertsWrap');
    const alertsGrid = document.getElementById('adminAlertsGrid');
    
    if (alertsWrap && alertsGrid && data.alerts) {
      const { lowStock = [], maintenance = [] } = data.alerts;
      let alertsHtml = '';

      if (lowStock.length > 0) {
        alertsHtml += `
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
              <div style="background:#fef08a;color:#ca8a04;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0;">Low Stock Alert</h3>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${lowStock.map(item => `
                <div style="display:flex;justify-content:space-between;font-size:13px;">
                  <span style="font-weight:500;color:#334155;">${item.item_name}</span>
                  <span style="color:#64748b;">${item.current_stock} ${item.unit} left</span>
                </div>
              `).join('')}
            </div>
            <button onclick="window.location.href='inventory.html'" style="margin-top:12px;width:100%;padding:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;color:#334155;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">View Inventory</button>
          </div>
        `;
      }

      if (maintenance.length > 0) {
        alertsHtml += `
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
              <div style="background:#fecaca;color:#dc2626;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              </div>
              <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0;">Action Required</h3>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${maintenance.map(m => {
                const desc = (m.description && String(m.description).toLowerCase() !== 'null') ? m.description : 'Maintenance Requested';
                return `
                <div style="display:flex;justify-content:space-between;font-size:13px;">
                  <span style="font-weight:500;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;" title="${desc}">${desc}</span>
                  <span style="color:#ef4444;">${m.location}</span>
                </div>
              `}).join('')}
            </div>
            <button onclick="window.location.href='maintainance.html'" style="margin-top:12px;width:100%;padding:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;color:#334155;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">Manage Tickets</button>
          </div>
        `;
      }

      if (alertsHtml) {
        alertsGrid.innerHTML = alertsHtml;
        alertsWrap.style.display = 'block';
      }
    }

    // ── Recent Activity ────────────────────────────────────────────────────
    const actList  = document.getElementById('activityList');
    const actEmpty = document.getElementById('activityEmpty');
    const activities = data.recentActivity || [];

    if (actList && activities.length > 0) {
      actList.hidden = false;
      if (actEmpty) actEmpty.style.display = 'none';
      actList.style.padding = '4px 0';
      actList.innerHTML = activities.map(a => {
        // Pick a dot color based on keyword
        const isBook  = /book/i.test(a.description);
        const isMaint = /maint/i.test(a.description);
        const isInv   = /stock|inventor/i.test(a.description);
        const dot     = isBook ? '#6366f1' : isMaint ? '#f43f5e' : isInv ? '#f97316' : '#10b981';
        return `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 20px;border-bottom:1px solid #f8fafc;border-radius:8px;transition:background 0.2s;cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
          <div style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0;margin-top:4px;box-shadow:0 0 0 2px ${dot}33;"></div>
          <span style="flex:1;font-size:13px;color:#334155;line-height:1.5;">${a.description}</span>
          <span style="font-size:11px;color:#94a3b8;white-space:nowrap;margin-left:8px;padding-top:1px;">${a.time}</span>
        </div>`;
      }).join('');
    }

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
});
