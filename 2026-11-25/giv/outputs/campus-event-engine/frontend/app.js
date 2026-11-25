const api = '/api';
const state = { category: '', freeOnly: false, tagged: false, search: '', view: 'events' };
const $ = (sel) => document.querySelector(sel);
const escapeHTML = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${api}${path}`, options);
  } catch {
    throw new Error('Cannot reach the server. Run: npm run dev');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

function money(v) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0); }
function dateLabel(v) { return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)); }
function toast(msg, error = false) {
  const el = $('#toast'); el.textContent = msg; el.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(toast._t); toast._t = setTimeout(() => { el.className = 'toast'; }, 3000);
}
function artwork(event) {
  if (event.category === 'Cultural') return ['art-music', '♫'];
  if (/workshop/i.test(event.title)) return ['art-workshop', '⚙'];
  return ['art-tech', '⌘'];
}

// ─── VIEW ROUTING ────────────────────────────────────────────────────────────
function showView(name) {
  state.view = name;
  ['events', 'registrations', 'analytics'].forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === name ? '' : 'none';
  });
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === name);
  });
  const labels = { events: 'Events', registrations: 'Registrations', analytics: 'Analytics' };
  $('#breadcrumb').innerHTML = `Workspace <span>/</span> ${labels[name]}`;
  if (name === 'registrations') loadRegistrations().catch(err => toast(err.message, true));
  if (name === 'analytics') loadFullAnalytics().catch(err => toast(err.message, true));
}

document.querySelectorAll('[data-nav]').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); showView(el.dataset.nav); });
});

// ─── EVENTS ──────────────────────────────────────────────────────────────────
async function loadEvents() {
  const params = new URLSearchParams();
  if (state.category) params.set('category', state.category);
  if (state.freeOnly) params.set('freeOnly', 'true');
  if (state.tagged) params.set('tagged', 'true');
  if (state.search) params.set('search', state.search);
  const events = await request(`/events?${params}`);
  $('#allCount').textContent = events.length;
  $('#eventNavCount').textContent = String(events.length).padStart(2, '0');
  const grid = $('#eventGrid');
  if (!events.length) {
    grid.innerHTML = '<div class="empty">No events match those filters.</div>';
    return;
  }
  grid.innerHTML = events.map(ev => {
    const [art, icon] = artwork(ev);
    const tags = (ev.tags || []).slice(0, 3).map(t => `<span># ${escapeHTML(t)}</span>`).join('');
    const sponsorList = (ev.sponsors || []).length
      ? `<div class="event-sponsors">${ev.sponsors.map(s => `<span class="sponsor-chip">${escapeHTML(s)}</span>`).join('')}</div>`
      : '';
    return `<article class="event-card">
      <div class="event-art ${art}"><span class="category-tag">${escapeHTML(ev.category)}</span><span class="fee-tag">${ev.entryFee === 0 ? 'FREE' : money(ev.entryFee)}</span><span class="art-icon">${icon}</span></div>
      <div class="event-body">
        <div class="event-title">${escapeHTML(ev.title)}</div>
        <div class="event-club">Organized by ${escapeHTML(ev.organizerClub)}</div>
        <div class="event-meta"><span>◷ ${dateLabel(ev.date)}</span><span>⌖ ${escapeHTML(ev.venue)}</span></div>
        <div class="event-tags">${tags}</div>
        ${sponsorList}
        <div class="event-bottom">
          <span class="seats"><b>${ev.seatsAvailable}</b> seats left</span>
          <div class="event-actions">
            <button class="sponsor-btn" data-sponsor="${escapeHTML(ev._id)}" data-title="${escapeHTML(ev.title)}" title="Add sponsor">+ Sponsor</button>
            <button class="book-btn" data-book="${escapeHTML(ev._id)}" ${ev.seatsAvailable < 1 ? 'disabled' : ''}>${ev.seatsAvailable < 1 ? 'Sold out' : 'Reserve spot →'}</button>
          </div>
        </div>
      </div>
    </article>`;
  }).join('');
  grid.querySelectorAll('[data-book]').forEach(btn =>
    btn.addEventListener('click', () => openBooking(btn.dataset.book, events.find(e => e._id === btn.dataset.book)))
  );
  grid.querySelectorAll('[data-sponsor]').forEach(btn =>
    btn.addEventListener('click', () => openSponsor(btn.dataset.sponsor, btn.dataset.title))
  );
}

async function loadOverviewStats() {
  const ov = await request('/analytics/overview');
  $('#statEvents').textContent = ov.eventCount;
  $('#statRegistrations').textContent = ov.registrationCount;
  $('#statCheckedIn').textContent = ov.checkedInCount;
  $('#statRevenue').textContent = money(ov.totalRevenue);
}

async function loadInlinePanels() {
  const [departments, turnout, events] = await Promise.all([
    request('/analytics/departments'), request('/analytics/turnout'), request('/events')
  ]);
  const eventNames = Object.fromEntries(events.map(e => [e._id, e.title]));
  const maxDept = Math.max(1, ...departments.map(r => r.totalRegistrations));
  $('#departmentList').innerHTML = departments.map(r =>
    `<div class="department-row"><span>${escapeHTML(r._id)}</span><div class="bar-track"><div class="bar-fill" style="width:${r.totalRegistrations / maxDept * 100}%"></div></div><strong>${r.totalRegistrations}</strong></div>`
  ).join('') || '<div class="empty">No registrations yet.</div>';
  $('#turnoutList').innerHTML = turnout.map(r =>
    `<div class="turnout-row"><span class="turnout-name">${escapeHTML(eventNames[r.eventId] || r.eventId)}</span><span class="turnout-count">${r.checkedInCount}/${r.totalRegistrations} · ${Math.round(r.turnoutPercentage)}%</span><div class="turnout-bar"><i style="width:${Math.min(100, r.turnoutPercentage)}%"></i></div></div>`
  ).join('') || '<div class="empty">No attendance yet.</div>';
}

async function refresh() {
  try {
    await Promise.all([loadEvents(), loadOverviewStats(), loadInlinePanels()]);
  } catch (err) {
    $('#eventGrid').innerHTML = `<div class="empty error-state">⚠ ${escapeHTML(err.message)}<br><small>Make sure the backend is running: <code>npm run dev</code></small></div>`;
  }
}

// ─── REGISTRATIONS VIEW ───────────────────────────────────────────────────────
let _allRegistrations = [];
let _eventNameCache = {};

async function loadRegistrations() {
  const wrap = $('#regTableWrap');
  wrap.innerHTML = '<div class="loading">Loading registrations…</div>';
  try {
    const [regs, events] = await Promise.all([request('/registrations'), request('/events')]);
    _allRegistrations = regs;
    _eventNameCache = Object.fromEntries(events.map(e => [e._id, e.title]));
    const depts = [...new Set(regs.map(r => r.department))].sort();
    const sel = $('#regDeptFilter');
    const current = sel.value;
    sel.innerHTML = '<option value="">All departments</option>' + depts.map(d => `<option${d === current ? ' selected' : ''}>${escapeHTML(d)}</option>`).join('');
    renderRegTable(current);
    const count = regs.length;
    const navCount = $('#regNavCount');
    navCount.textContent = String(count).padStart(2, '0');
    navCount.style.display = count ? '' : 'none';
  } catch (err) {
    wrap.innerHTML = `<div class="empty error-state">⚠ ${escapeHTML(err.message)}<br><small>Run: <code>npm run dev</code></small></div>`;
  }
}

function renderRegTable(deptFilter) {
  const rows = deptFilter ? _allRegistrations.filter(r => r.department === deptFilter) : _allRegistrations;
  const wrap = $('#regTableWrap');
  if (!rows.length) { wrap.innerHTML = '<div class="empty">No registrations found.</div>'; return; }
  wrap.innerHTML = `<table class="reg-table">
    <thead><tr><th>Ticket ID</th><th>Student</th><th>Department</th><th>Event</th><th>Date</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td class="ticket-id">${escapeHTML(r.ticketId)}</td>
      <td><div class="reg-student">${escapeHTML(r.studentName)}</div><div class="reg-sid">${escapeHTML(r.studentId)} · Year ${r.year}</div></td>
      <td>${escapeHTML(r.department)}</td>
      <td>${escapeHTML(_eventNameCache[r.eventId] || r.eventId)}</td>
      <td>${dateLabel(r.registrationDate)}</td>
      <td><span class="status-badge ${r.checkInStatus ? 'checked-in' : 'pending'}">${r.checkInStatus ? '✓ Checked in' : '● Pending'}</span></td>
      <td>${r.checkInStatus ? '' : `<button class="checkin-btn" data-ticket="${escapeHTML(r.ticketId)}">Check in</button>`}</td>
    </tr>`).join('')}</tbody>
  </table>`;
  wrap.querySelectorAll('.checkin-btn').forEach(btn =>
    btn.addEventListener('click', () => doCheckIn(btn.dataset.ticket))
  );
}

async function doCheckIn(ticketId) {
  try {
    await request(`/registrations/${encodeURIComponent(ticketId)}/check-in`, { method: 'PATCH' });
    const reg = _allRegistrations.find(r => r.ticketId === ticketId);
    if (reg) reg.checkInStatus = true;
    renderRegTable($('#regDeptFilter').value);
    toast(`Checked in: ${ticketId}`);
  } catch (err) {
    toast(err.message, true);
  }
}

$('#regDeptFilter').addEventListener('change', e => renderRegTable(e.target.value));
$('#regRefreshButton').addEventListener('click', () => loadRegistrations().then(() => toast('Registrations refreshed.')).catch(err => toast(err.message, true)));

// ─── FULL ANALYTICS VIEW ──────────────────────────────────────────────────────
async function loadFullAnalytics() {
  try {
    const [ov, revenue, departments, turnout, events] = await Promise.all([
      request('/analytics/overview'), request('/analytics/revenue'),
      request('/analytics/departments'), request('/analytics/turnout'), request('/events')
    ]);
    const eventNames = Object.fromEntries(events.map(e => [e._id, e.title]));

    $('#aStatEvents').textContent = ov.eventCount;
    $('#aStatRegistrations').textContent = ov.registrationCount;
    $('#aStatCheckedIn').textContent = ov.checkedInCount;
    $('#aStatRevenue').textContent = money(ov.totalRevenue);

    // Revenue by event
    const maxRev = Math.max(1, ...revenue.map(r => r.totalRevenue));
    $('#revenueList').innerHTML = revenue.length
      ? revenue.map(r => `<div class="department-row"><span title="${escapeHTML(r.eventTitle)}">${escapeHTML(r.eventTitle)}</span><div class="bar-track"><div class="bar-fill" style="width:${r.totalRevenue / maxRev * 100}%"></div></div><strong>${money(r.totalRevenue)}</strong></div>`).join('')
      : '<div class="empty">No revenue data yet.</div>';

    // Revenue by club
    const clubRevMap = {};
    revenue.forEach(r => { clubRevMap[r.organizerClub] = (clubRevMap[r.organizerClub] || 0) + r.totalRevenue; });
    const clubRevRows = Object.entries(clubRevMap).sort((a, b) => b[1] - a[1]);
    const maxClubRev = Math.max(1, ...clubRevRows.map(r => r[1]));
    $('#revenueClubList').innerHTML = clubRevRows.length
      ? clubRevRows.map(([club, rev]) => `<div class="department-row"><span>${escapeHTML(club)}</span><div class="bar-track"><div class="bar-fill revenue-club" style="width:${rev / maxClubRev * 100}%"></div></div><strong>${money(rev)}</strong></div>`).join('')
      : '<div class="empty">No revenue data yet.</div>';

    // Departments
    const maxDept = Math.max(1, ...departments.map(r => r.totalRegistrations));
    $('#aDepartmentList').innerHTML = departments.length
      ? departments.map(r => `<div class="department-row"><span>${escapeHTML(r._id)}</span><div class="bar-track"><div class="bar-fill" style="width:${r.totalRegistrations / maxDept * 100}%"></div></div><strong>${r.totalRegistrations}</strong></div>`).join('')
      : '<div class="empty">No registrations yet.</div>';

    // Turnout
    $('#aTurnoutList').innerHTML = turnout.length
      ? turnout.map(r => `<div class="turnout-row"><span class="turnout-name">${escapeHTML(eventNames[r.eventId] || r.eventId)}</span><span class="turnout-count">${r.checkedInCount}/${r.totalRegistrations} · ${Math.round(r.turnoutPercentage)}%</span><div class="turnout-bar"><i style="width:${Math.min(100, r.turnoutPercentage)}%"></i></div></div>`).join('')
      : '<div class="empty">No attendance yet.</div>';
  } catch (err) {
    ['revenueList', 'revenueClubList', 'aDepartmentList', 'aTurnoutList'].forEach(id => {
      document.getElementById(id).innerHTML = `<div class="empty error-state">⚠ ${escapeHTML(err.message)}</div>`;
    });
  }
}

$('#analyticsRefreshButton').addEventListener('click', () => loadFullAnalytics().then(() => toast('Analytics refreshed.')).catch(err => toast(err.message, true)));

// ─── BOOKING ─────────────────────────────────────────────────────────────────
function openBooking(id, event) {
  $('#bookingEventId').value = id;
  $('#bookingTitle').textContent = event.title;
  $('#bookingMessage').textContent = '';
  $('#bookingForm').reset();
  $('#bookingEventId').value = id;
  $('#bookingDialog').showModal();
}

$('#bookingForm').addEventListener('submit', async e => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
  payload.year = Number(payload.year);
  const btn = e.currentTarget.querySelector('.submit-booking');
  btn.disabled = true;
  try {
    const result = await request(`/events/${encodeURIComponent($('#bookingEventId').value)}/book`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    $('#bookingDialog').close();
    toast(`Booking confirmed · ${result.registration.ticketId}`);
    await refresh();
  } catch (err) {
    $('#bookingMessage').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// ─── SPONSORS ────────────────────────────────────────────────────────────────
function openSponsor(id, title) {
  $('#sponsorEventId').value = id;
  $('#sponsorEventTitle').textContent = title;
  $('#sponsorMessage').textContent = '';
  $('#sponsorForm').reset();
  $('#sponsorEventId').value = id;
  $('#sponsorDialog').showModal();
}

$('#sponsorForm').addEventListener('submit', async e => {
  e.preventDefault();
  const sponsor = new FormData(e.currentTarget).get('sponsor');
  const btn = e.currentTarget.querySelector('.submit-booking');
  btn.disabled = true;
  try {
    await request(`/events/${encodeURIComponent($('#sponsorEventId').value)}/sponsors`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sponsor })
    });
    $('#sponsorDialog').close();
    toast(`Sponsor "${sponsor}" added.`);
    await loadEvents();
  } catch (err) {
    $('#sponsorMessage').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// ─── FILTERS ─────────────────────────────────────────────────────────────────
$('#searchInput').addEventListener('input', e => {
  state.search = e.target.value.trim();
  clearTimeout(loadEvents._t);
  loadEvents._t = setTimeout(() => loadEvents().catch(err => toast(err.message, true)), 250);
});
$('#categorySelect').addEventListener('change', e => {
  state.category = e.target.value;
  document.querySelectorAll('[data-category]').forEach(c => c.classList.toggle('active', c.dataset.category === state.category));
  loadEvents().catch(err => toast(err.message, true));
});
document.querySelectorAll('[data-category]').forEach(chip => chip.addEventListener('click', () => {
  state.category = chip.dataset.category;
  $('#categorySelect').value = state.category;
  document.querySelectorAll('[data-category]').forEach(c => c.classList.toggle('active', c === chip));
  loadEvents().catch(err => toast(err.message, true));
}));
$('#freeFilter').addEventListener('click', e => {
  state.freeOnly = !state.freeOnly;
  e.currentTarget.classList.toggle('on', state.freeOnly);
  loadEvents().catch(err => toast(err.message, true));
});
$('#tagFilter').addEventListener('click', e => {
  state.tagged = !state.tagged;
  e.currentTarget.classList.toggle('active', state.tagged);
  loadEvents().catch(err => toast(err.message, true));
});
$('#refreshButton').addEventListener('click', () => refresh().then(() => toast('Campus data refreshed.')));

// ─── INIT ─────────────────────────────────────────────────────────────────────
$('#todayLabel').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
refresh();
