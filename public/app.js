const state = {
  meta: { statuses: [], teams: [] },
  user: null,
  apps: [],
  kanbanMode: 'status',
  connectorViewMode: 'kanban',
  listDensity: localStorage.getItem('listDensity') || 'comfortable',
  listFilter: null,
  charts: { monthly: null, domain: null },
  theme: window.BATheme?.getTheme?.() || { preset: 'calm', mode: 'dark' }
};

const STATUS_ORDER = ['Open', 'PM Approval', 'Approved', 'Legal Pending', 'Credentials Ready', 'In Progress', 'Released'];

function getStatusPalette() {
  return window.BATheme?.getStatusPalette?.() || {};
}

function getTeamPalette() {
  return window.BATheme?.getTeamPalette?.() || {};
}

function alphaColor(hex, alpha) {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex;
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenColor(hex, factor = 0.62) {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex;
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const r = Math.max(0, Math.min(255, Math.round(parseInt(full.slice(1, 3), 16) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(full.slice(3, 5), 16) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(full.slice(5, 7), 16) * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

function qs(sel) {
  return document.querySelector(sel);
}

function qsa(sel) {
  return Array.from(document.querySelectorAll(sel));
}

function canEdit() {
  return state.user?.role === 'admin';
}

function normalizeStatusValue(status) {
  return status === 'Closed' ? 'Released' : status;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showAuthError(message) {
  qs('#auth-error').textContent = message;
}

function showToast(message, tone = 'success') {
  const root = qs('#toast-root');
  if (!root) return;
  const toast = document.createElement('div');
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  root.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2800);
}

function fillSelect(selector, values, includeAll = false) {
  const el = qs(selector);
  el.innerHTML = '';
  if (includeAll) {
    const allOpt = document.createElement('option');
    allOpt.value = 'All';
    allOpt.textContent = 'All';
    el.appendChild(allOpt);
  }
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    el.appendChild(option);
  });
}

function setActiveView(view) {
  qsa('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === view));
  qsa('.panel').forEach((panel) => panel.classList.remove('active'));

  const viewMap = {
    home: '#view-home',
    connectors: '#view-connectors',
    gantt: '#view-gantt',
    form: '#view-form',
    settings: '#view-settings'
  };
  const panel = qs(viewMap[view]);
  if (panel) panel.classList.add('active');

  const titles = {
    home: 'Home',
    connectors: 'Connector List',
    gantt: 'Gantt View',
    form: 'New Connector Record',
    settings: 'Settings'
  };

  qs('#view-title').textContent = titles[view] || 'Connector Tracker';
  qs('#new-btn').style.display = canEdit() && view !== 'form' && view !== 'settings' ? 'inline-block' : 'none';
}

function setConnectorMode(mode) {
  state.connectorViewMode = mode;
  qs('#toggle-list').classList.toggle('active', mode === 'list');
  qs('#toggle-kanban').classList.toggle('active', mode === 'kanban');
  qs('#connector-list-wrap').classList.toggle('hidden', mode !== 'list');
  qs('#connector-kanban-wrap').classList.toggle('hidden', mode !== 'kanban');
}

function setListDensity(mode) {
  state.listDensity = mode === 'compact' ? 'compact' : 'comfortable';
  localStorage.setItem('listDensity', state.listDensity);
  const select = qs('#list-density');
  if (select) select.value = state.listDensity;
  renderList();
}

function appMonthKey(app) {
  const raw = app.actual_release_date || app.release_eta || app.created_date;
  if (!raw) return '';
  return String(raw).slice(0, 7);
}

function normalizeDomainValue(domain) {
  return domain && String(domain).trim() ? String(domain).trim().toLowerCase() : 'unassigned';
}

function openFilteredList(title, predicate) {
  state.listFilter = { title, predicate };
  setActiveView('connectors');
  setConnectorMode('list');
  renderList();
}

function clearListFilter() {
  state.listFilter = null;
  renderList();
}

function isoToInputDateTime(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function resetForm(record = null) {
  qs('#record-id').value = record?.id || '';
  qs('#application_name').value = record?.application_name || record?.connector_name || '';
  qs('#domain').value = record?.domain || '';
  qs('#team_assigned').value = record?.team_assigned || state.meta.teams[0];
  qs('#status').value = record?.status || state.meta.statuses[0];
  qs('#created_date').value = record?.created_date || new Date().toISOString().slice(0, 10);
  qs('#actual_completed_date').value = isoToInputDateTime(record?.actual_completed_date);
  qs('#release_eta').value = record?.release_eta || '';
  qs('#prd_link').value = record?.prd_link || '';
  qs('#build_request_form').value = record?.build_request_form || '';
  qs('#pm_owner').value = record?.pm_owner || '';
  qs('#da_owner').value = record?.da_owner || '';
  qs('#pm_manager').value = record?.pm_manager || '';

  qs('#form-title').textContent = record ? `Edit Record #${record.id}` : 'New Connector Record';
}

function applyRolePermissions() {
  const editable = canEdit();
  qsa('#app-form input, #app-form select').forEach((el) => {
    if (el.id === 'record-id') return;
    el.disabled = !editable;
  });
  const saveBtn = qs('#app-form button[type=\"submit\"]');
  if (saveBtn) saveBtn.style.display = editable ? 'inline-block' : 'none';
  const userForm = qs('#user-form');
  if (userForm) userForm.style.display = editable ? 'grid' : 'none';
}

function formPayload() {
  const appName = qs('#application_name').value.trim();
  return {
    connector_name: appName,
    application_name: appName,
    domain: qs('#domain').value.trim(),
    team_assigned: qs('#team_assigned').value,
    status: qs('#status').value,
    created_date: qs('#created_date').value,
    actual_completed_date: qs('#actual_completed_date').value || null,
    release_eta: qs('#release_eta').value || null,
    prd_link: qs('#prd_link').value || null,
    build_request_form: qs('#build_request_form').value || null,
    pm_owner: qs('#pm_owner').value || null,
    da_owner: qs('#da_owner').value || null,
    pm_manager: qs('#pm_manager').value || null
  };
}

async function loadApplications() {
  const rows = await api('/api/applications');
  state.apps = rows.map((row) => ({
    ...row,
    status: normalizeStatusValue(row.status)
  }));
}

function renderList() {
  const rowsData = state.listFilter ? state.apps.filter(state.listFilter.predicate) : state.apps;
  const filterBanner = state.listFilter
    ? `<div class="list-filter-banner">
         <strong>${state.listFilter.title}</strong>
         <button type="button" class="ghost" id="clear-list-filter">Clear Filter</button>
       </div>`
    : '';

  const rows = rowsData
    .map(
      (row) => `<tr>
        <td><button class="link-btn" data-open-id="${row.id}" type="button">${row.application_name || row.connector_name}</button></td>
        <td>${row.domain}</td>
        <td>${row.team_assigned}</td>
        <td><span class="badge status-badge" data-status="${row.status}">${row.status}</span></td>
        <td>${row.release_eta || '-'}</td>
        <td><button class="icon-btn" data-history-id="${row.id}" title="History" type="button">&#128340;</button></td>
      </tr>`
    )
    .join('');

  qs('#list-container').innerHTML = `
    ${filterBanner}
    <table class="table ${state.listDensity === 'compact' ? 'table-compact' : ''}">
      <thead>
        <tr>
          <th class="th-sort th-pin">App Name<span class="th-resize"></span></th>
          <th class="th-sort">Domain<span class="th-resize"></span></th>
          <th class="th-sort">Team Assigned<span class="th-resize"></span></th>
          <th class="th-sort">Status<span class="th-resize"></span></th>
          <th class="th-sort">Release ETA<span class="th-resize"></span></th>
          <th>History</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="6"><div class="empty-state">No records found.</div></td></tr>'}</tbody>
    </table>
  `;

  const clearBtn = qs('#clear-list-filter');
  if (clearBtn) clearBtn.addEventListener('click', clearListFilter);

  qsa('[data-open-id]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!canEdit()) return;
      const app = state.apps.find((x) => String(x.id) === button.dataset.openId);
      if (!app) return;
      resetForm(app);
      setActiveView('form');
    });
  });

  qsa('[data-history-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const appId = Number(button.dataset.historyId);
      const app = state.apps.find((x) => x.id === appId);
      if (!app) return;
      await openHistory(app);
    });
  });
}

function statusOptionsHtml(selected) {
  return STATUS_ORDER.map((s) => `<option value="${s}" ${s === selected ? 'selected' : ''}>${s}</option>`).join('');
}

function cardHtml(app) {
  const title = app.application_name || app.connector_name;
  return `<article class="k-card" draggable="true" data-app-id="${app.id}">
    <div class="k-top">
      <strong>${title}</strong>
      ${canEdit() ? `<button class="k-edit" data-edit-id="${app.id}" type="button">Edit</button>` : ''}
    </div>
    ${app.release_eta ? `<div class="eta">Release ETA: ${app.release_eta}</div>` : '<div class="eta muted">Release ETA: -</div>'}
    <div class="k-sub">Domain: ${app.domain}</div>
  </article>`;
}

function getKanbanColumns() {
  if (state.kanbanMode === 'status') {
    return ['General', ...STATUS_ORDER];
  }
  return ['General', ...state.meta.teams];
}

function appsForColumn(columnKey) {
  if (state.kanbanMode === 'status') {
    if (columnKey === 'General') return state.apps.filter((a) => a.status === 'Open');
    if (columnKey === 'Open') return [];
    return state.apps.filter((a) => a.status === columnKey);
  }
  if (columnKey === 'General') return state.apps.filter((a) => a.team_assigned === state.meta.teams[0]);
  return state.apps.filter((a) => a.team_assigned === columnKey);
}

async function updateStatus(appId, newStatus) {
  await api(`/api/applications/${appId}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
  await loadApplications();
  await loadHome();
  renderList();
  renderKanban();
  await renderGantt();
  showToast(`Status updated to ${newStatus}`);
}

function formatTs(ts) {
  return new Date(ts).toLocaleString();
}

function formatDurationHours(hours) {
  const whole = Math.round(hours * 10) / 10;
  return `${whole}h`;
}

function formatDurationVerbose(hours) {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const dayRemainder = totalMinutes % (24 * 60);
  const h = Math.floor(dayRemainder / 60);
  const m = dayRemainder % 60;
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}, ${h} hr: ${m} min`;
  }
  return `${h} hr: ${m} min`;
}

function aggregateHistory(items) {
  const grouped = new Map();
  for (let i = 0; i < items.length; i += 1) {
    const current = items[i];
    const next = items[i + 1];
    const start = new Date(current.changed_at);
    const end = next ? new Date(next.changed_at) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (!grouped.has(current.value)) grouped.set(current.value, { value: current.value, total: 0, entries: [] });
    const g = grouped.get(current.value);
    g.total += hours;
    g.entries.push({ start, end, hours });
  }
  return Array.from(grouped.values());
}

function detailsTable(rows, kind) {
  if (!rows.length) return '<p>No data</p>';
  return `<table class="table">
    <thead><tr><th>${kind}</th><th>Total Time</th><th>Entries</th></tr></thead>
    <tbody>
      ${rows
        .map((r) => {
          const entries = r.entries
            .map((e, i) => `T${i + 1}: ${formatShortDate(e.start)}-${formatShortDate(e.end)} (${formatDurationVerbose(e.hours)})`)
            .join('<br>');
          return `<tr><td>${r.value}</td><td>${formatDurationVerbose(r.total)}</td><td>${entries}</td></tr>`;
        })
        .join('')}
    </tbody>
  </table>`;
}

async function openGanttDetails(appId) {
  const app = state.apps.find((x) => x.id === Number(appId));
  if (!app) return;
  const history = await api(`/api/applications/${app.id}/history`);
  const statusRows = aggregateHistory(history.status || []);
  const teamRows = aggregateHistory(history.team || []);

  qs('#gantt-details').innerHTML = `
    <div class="g-details-head">
      <div>
        <h4>${app.application_name}</h4>
      </div>
      <div>
        <span>${app.domain || '-'}</span>
        ${canEdit() ? `<button type="button" class="ghost" id="gantt-details-edit">Edit</button>` : ''}
        <button type="button" class="ghost g-close-details" id="gantt-details-close">Close</button>
      </div>
    </div>
    <div class="g-props">
      <div class="g-prop-card">
        <h5>Time Taken Under Each Status</h5>
        ${detailsTable(statusRows, 'Status')}
      </div>
      <div class="g-prop-card">
        <h5>Time Taken Under Each Team</h5>
        ${detailsTable(teamRows, 'Team')}
      </div>
    </div>
  `;
  qs('#gantt-details').classList.remove('hidden');
  qs('#gantt-details-close')?.addEventListener('click', () => {
    qs('#gantt-details').classList.add('hidden');
    qs('#gantt-details').innerHTML = '';
  });
  qs('#gantt-details-edit')?.addEventListener('click', () => {
    resetForm(app);
    setActiveView('form');
  });
}

function formatShortDate(ts) {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildHistoryRows(items) {
  if (!items.length) return '<p>No entries</p>';
  const list = [];
  for (let i = 0; i < items.length; i += 1) {
    const current = items[i];
    const next = items[i + 1];
    const start = new Date(current.changed_at);
    const end = next ? new Date(next.changed_at) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    list.push(`<tr>
      <td>${current.value}</td>
      <td>${formatTs(start)}</td>
      <td>${formatTs(end)}</td>
      <td>${formatDurationHours(hours)}</td>
    </tr>`);
  }
  return `<table class="table">
    <thead><tr><th>Value</th><th>Start</th><th>End</th><th>Duration</th></tr></thead>
    <tbody>${list.join('')}</tbody>
  </table>`;
}

function buildGroupedHistory(items) {
  if (!items.length) return '<p>No entries</p>';
  const grouped = new Map();
  for (let i = 0; i < items.length; i += 1) {
    const current = items[i];
    const next = items[i + 1];
    const start = new Date(current.changed_at);
    const end = next ? new Date(next.changed_at) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (!grouped.has(current.value)) grouped.set(current.value, []);
    grouped.get(current.value).push({ start, end, hours });
  }

  let html = '';
  for (const [value, entries] of grouped.entries()) {
    const totalHours = entries.reduce((sum, x) => sum + x.hours, 0);
    const lines = entries
      .map(
        (x, index) =>
          `<div><strong>T${index + 1}</strong> : ${formatShortDate(x.start)}-${formatShortDate(x.end)} (${formatDurationVerbose(
            x.hours
          )})</div>`
      )
      .join('');
    html += `<div class="history-group">
      <h6>${value} - Total: ${formatDurationVerbose(totalHours)}</h6>
      ${lines}
    </div>`;
  }
  return html;
}

async function openHistory(app) {
  const history = await api(`/api/applications/${app.id}/history`);
  qs('#history-title').textContent = `History - ${app.connector_name || app.application_name}`;
  qs('#history-content').innerHTML = `
    <h5>Status Changes</h5>
    ${buildGroupedHistory(history.status)}
    ${buildHistoryRows(history.status)}
    <h5>Team Changes</h5>
    ${buildGroupedHistory(history.team)}
    ${buildHistoryRows(history.team)}
  `;
  qs('#history-modal').classList.remove('hidden');
}

function renderKanban() {
  const statusColors = getStatusPalette();
  const teamColors = getTeamPalette();
  const columns = getKanbanColumns();

  qs('#kanban-container').innerHTML = columns
    .map((key) => {
      const apps = appsForColumn(key);
      const count = key === 'Open' && state.kanbanMode === 'status' ? state.apps.filter((a) => a.status === 'Open').length : apps.length;
      const columnColor =
        state.kanbanMode === 'status'
          ? key === 'General'
            ? 'var(--text-muted)'
            : statusColors[key] || 'var(--text-muted)'
          : key === 'General'
            ? 'var(--text-muted)'
            : teamColors[key] || 'var(--text-muted)';
      const columnBg = alphaColor(columnColor, 0.15);
      return `<section class="k-column" data-column-key="${key}">
        <div class="k-head" style="--lane-color:${columnColor};--lane-bg:${columnBg}">
          ${key} <span class="count">${count}</span>
          ${canEdit() ? `<button class="k-new" type="button" data-new-column="${key}">+ New</button>` : ''}
        </div>
        <div class="k-dropzone">${apps.map(cardHtml).join('')}</div>
      </section>`;
    })
    .join('');

  qsa('.k-card').forEach((card) => {
    if (canEdit()) {
      card.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', card.dataset.appId);
      });
    } else {
      card.setAttribute('draggable', 'false');
    }
  });

  if (canEdit()) {
    qsa('[data-new-column]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.newColumn;
        resetForm();
        if (state.kanbanMode === 'status') {
          qs('#status').value = key === 'General' ? 'Open' : key;
        } else {
          qs('#team_assigned').value = key === 'General' ? state.meta.teams[0] : key;
        }
        setActiveView('form');
      });
    });

    qsa('[data-edit-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const app = state.apps.find((x) => String(x.id) === button.dataset.editId);
        if (!app) return;
        resetForm(app);
        setActiveView('form');
      });
    });
  }

  if (canEdit()) {
    qsa('[data-status-btn]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.statusBtn;
        button.classList.add('hidden');
        const select = qs(`[data-status-select="${id}"]`);
        select.classList.remove('hidden');
        select.focus();
      });
    });
  }

  if (canEdit()) {
    qsa('[data-status-select]').forEach((select) => {
      select.addEventListener('blur', () => {
        select.classList.add('hidden');
        const btn = qs(`[data-status-btn="${select.dataset.statusSelect}"]`);
        if (btn) btn.classList.remove('hidden');
      });

      select.addEventListener('change', async () => {
        const appId = Number(select.dataset.statusSelect);
        const app = state.apps.find((x) => x.id === appId);
        if (!app || app.status === select.value) return;
        await updateStatus(appId, select.value);
      });
    });
  }

  if (canEdit()) {
    qsa('.k-column').forEach((column) => {
      column.addEventListener('dragover', (event) => {
        event.preventDefault();
        column.classList.add('drag-over');
      });

      column.addEventListener('dragleave', () => {
        column.classList.remove('drag-over');
      });

      column.addEventListener('drop', async (event) => {
        event.preventDefault();
        column.classList.remove('drag-over');

        const appId = Number(event.dataTransfer.getData('text/plain'));
        const key = column.dataset.columnKey;
        const app = state.apps.find((x) => x.id === appId);
        if (!app) return;

        let payload = null;
        if (state.kanbanMode === 'status') {
          if (key === 'General' || key === 'Open') payload = { status: 'Open' };
          else payload = { status: key };
        } else {
          if (key !== 'General') payload = { team_assigned: key };
        }

        if (!payload) return;
        await api(`/api/applications/${appId}`, { method: 'PUT', body: JSON.stringify(payload) });
        await loadApplications();
        await loadHome();
        renderList();
        renderKanban();
        await renderGantt();
        showToast('Card updated');
      });
    });
  }
}

async function loadUsers() {
  const users = await api('/api/users');
  qs('#users-table').innerHTML = `
    <table class="table">
      <thead>
        <tr><th>ID</th><th>Username</th><th>Role</th><th>Password Pending</th></tr>
      </thead>
      <tbody>
        ${users
          .map((u) => `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.role}</td><td>${u.must_set_password ? 'Yes' : 'No'}</td></tr>`)
          .join('')}
      </tbody>
    </table>
  `;
}

async function loadHome() {
  await loadApplications();

  const byStatus = new Map();
  state.apps.forEach((app) => {
    const key = normalizeStatusValue(app.status) || 'Open';
    byStatus.set(key, (byStatus.get(key) || 0) + 1);
  });

  const statusLabel = (status) => {
    if (status === 'Released') return 'Connector Released';
    if (status === 'In Progress') return 'Development';
    return status;
  };

  const knownStatusCards = STATUS_ORDER.map((status) => ({ status, count: byStatus.get(status) || 0 }));
  const unknownStatusCards = Array.from(byStatus.entries())
    .filter(([status]) => !STATUS_ORDER.includes(status))
    .map(([status, count]) => ({ status, count }));
  const statusCards = [...knownStatusCards, ...unknownStatusCards].filter((x) => x.count > 0);

  const dynamicStatusCards = statusCards
    .map((x) => {
      const label = statusLabel(x.status);
      return `<button type="button" class="h-card h-card-btn" data-home-status="${x.status}">
        <div class="num">${x.count}</div><div class="label">${label}</div>
      </button>`;
    })
    .join('');
  const fixedCards = `
    <button type="button" class="h-card h-card-btn h-card-total" data-home-total="1"><div class="num">${state.apps.length}</div><div class="label">Total Connectors</div></button>
  `;
  qs('#home-cards').innerHTML = `${fixedCards}${dynamicStatusCards}`;

  qsa('[data-home-total]').forEach((el) => {
    el.addEventListener('click', () => openFilteredList('All Connectors', () => true));
  });
  qsa('[data-home-status]').forEach((el) => {
    el.addEventListener('click', () => {
      const status = el.dataset.homeStatus;
      const label = statusLabel(status);
      openFilteredList(label, (a) => a.status === status);
    });
  });

  if (state.charts.monthly) state.charts.monthly.destroy();
  if (state.charts.domain) state.charts.domain.destroy();

  const monthLabel = (m) => {
    const [year, month] = String(m).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', { month: 'short', year: 'numeric' });
  };

  const monthlyMap = new Map();
  state.apps.forEach((app) => {
    const mk = appMonthKey(app);
    if (!mk) return;
    monthlyMap.set(mk, (monthlyMap.get(mk) || 0) + 1);
  });
  const monthlyEntries = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
    .map(([month, count]) => ({ month, count }));
  const monthlyKeys = monthlyEntries.map((x) => x.month);
  state.charts.monthly = new Chart(qs('#monthly-chart'), {
    type: 'bar',
    data: {
      labels: monthlyEntries.map((x) => monthLabel(x.month)),
      datasets: [
        {
          label: 'Releases',
          data: monthlyEntries.map((x) => x.count),
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-1').trim()
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      onClick: (_evt, elements) => {
        if (!elements.length) return;
        const index = elements[0].index;
        const monthKey = monthlyKeys[index];
        if (!monthKey) return;
        openFilteredList(`Monthly Releases: ${monthLabel(monthKey)}`, (a) => appMonthKey(a) === monthKey);
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0, stepSize: 1 }
        }
      }
    }
  });

  const domainLabelMap = new Map();
  state.apps.forEach((a) => {
    const key = normalizeDomainValue(a.domain);
    if (!domainLabelMap.has(key)) {
      const raw = a.domain && String(a.domain).trim();
      domainLabelMap.set(key, raw || 'Unassigned');
    }
  });
  const domainKeys = Array.from(domainLabelMap.keys()).sort();
  const domains = domainKeys.map((k) => domainLabelMap.get(k));
  const domainCounts = domainKeys.map((key) => state.apps.filter((a) => normalizeDomainValue(a.domain) === key).length);
  const domainPalette = window.BATheme?.getChartPalette?.() || ['#2563eb', '#14b8a6', '#f59e0b', '#a855f7', '#ec4899', '#10b981'];
  const domainColors = domains.map((_, i) => domainPalette[i % domainPalette.length]);

  state.charts.domain = new Chart(qs('#domain-chart'), {
    type: 'bar',
    data: {
      labels: domains,
      datasets: [{ label: 'Apps Count', data: domainCounts, backgroundColor: domainColors }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      onClick: (_evt, elements) => {
        if (!elements.length) return;
        const { index } = elements[0];
        const domainKey = domainKeys[index];
        const domainLabel = domains[index];
        if (!domainKey) return;
        openFilteredList(`${domainLabel} Apps`, (a) => normalizeDomainValue(a.domain) === domainKey);
      },
      scales: {
        x: { stacked: false },
        y: {
          stacked: false,
          beginAtZero: true,
          ticks: { precision: 0, stepSize: 1 }
        }
      }
    }
  });
}

function fillGanttApps() {
  const names = [...new Set(state.apps.map((a) => a.application_name).filter(Boolean))].sort();
  fillSelect('#gantt-app-filter', names, true);
}

function getColorMap(mode) {
  return mode === 'team' ? getTeamPalette() : getStatusPalette();
}

function renderGanttLegend(mode, colorMap = null) {
  const source = mode === 'team' ? state.meta.teams : STATUS_ORDER;
  const colors = colorMap || getColorMap(mode);
  qs('#gantt-legend').innerHTML = source
    .map((k) => `<span class="legend-item"><span class="legend-dot" style="background:${colors[k] || '#4d5a70'}"></span>${k}</span>`)
    .join('');
}

function toggleGanttMonthPicker() {
  const isMonth = qs('#gantt-calendar-view').value === 'month';
  qs('#gantt-month-wrap').classList.toggle('hidden', !isMonth);
}

function getGanttRange() {
  const view = qs('#gantt-calendar-view').value;

  if (view === 'month') {
    const m = qs('#gantt-month').value || new Date().toISOString().slice(0, 7);
    const [year, month] = m.split('-').map(Number);
    const from = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    return { from, to };
  }
  return { from: '', to: '' };
}

function consolidateSegments(segments, mode) {
  const grouped = new Map();
  segments.forEach((seg) => {
    if (!grouped.has(seg.value)) grouped.set(seg.value, { value: seg.value, totalHours: 0, entries: [] });
    const g = grouped.get(seg.value);
    g.totalHours += seg.hours;
    g.entries.push({ start: seg.start, end: seg.end, hours: seg.hours });
  });

  const order = mode === 'status' ? STATUS_ORDER : state.meta.teams;
  const ordered = [];
  order.forEach((name) => {
    if (grouped.has(name)) ordered.push(grouped.get(name));
  });
  grouped.forEach((value, key) => {
    if (!order.includes(key)) ordered.push(value);
  });
  return ordered;
}

function timelineRange(from, to, rows) {
  let selectedStart = from ? new Date(from) : null;
  let selectedEnd = to ? new Date(to) : null;
  if (selectedStart) selectedStart.setHours(0, 0, 0, 0);
  if (selectedEnd) selectedEnd.setHours(23, 59, 59, 999);

  let min = null;
  let max = null;
  rows.forEach((r) => {
    (r.segments || []).forEach((s) => {
      const st = new Date(s.start);
      const en = new Date(s.end);
      if (!min || st < min) min = st;
      if (!max || en > max) max = en;
    });
  });
  if (selectedStart && selectedEnd) {
    // Extend beyond selected month if an app genuinely runs into next month.
    if (max && max > selectedEnd) selectedEnd = max;
    return { start: selectedStart, end: selectedEnd };
  }

  if (!min || !max) {
    const now = new Date();
    return { start: now, end: now };
  }
  return { start: min, end: max };
}

function buildTimelineHeader(from, to, rows) {
  const { start, end } = timelineRange(from, to, rows);
  const scale = qs('#gantt-scale')?.value || 'days';
  const days = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  let safety = 0;
  while (cursor <= endDay && safety < 70) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    safety += 1;
  }

  const monthGroups = [];
  days.forEach((d) => {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const last = monthGroups[monthGroups.length - 1];
    if (!last || last.key !== key) monthGroups.push({ key, label, count: 1 });
    else last.count += 1;
  });

  const monthsHtml = monthGroups
    .map((m) => `<div class="g-month" style="flex:${m.count}">${m.label}</div>`)
    .join('');

  let scaleHtml = '';
  if (scale === 'weeks') {
    const weekGroups = [];
    for (let i = 0; i < days.length; i += 7) {
      const wStart = days[i];
      const chunk = days.slice(i, i + 7);
      weekGroups.push({ label: `W${Math.floor(i / 7) + 1}`, count: chunk.length, start: wStart });
    }
    scaleHtml = weekGroups
      .map((w) => `<div class="g-week" style="flex:${w.count}" title="Week starting ${w.start.toLocaleDateString()}">${w.label}</div>`)
      .join('');
  } else {
    scaleHtml = days
      .map((d) => {
        const weekend = d.getDay() === 0 || d.getDay() === 6 ? 'is-weekend' : '';
        return `<div class="g-day ${weekend}">${String(d.getDate()).padStart(2, '0')}</div>`;
      })
      .join('');
  }

  return `<div class="g-time-header">
    <div class="g-month-row">${monthsHtml}</div>
    <div class="g-day-row">${scaleHtml}</div>
  </div>`;
}

function buildWeekendBands(rangeStart, rangeEnd) {
  const out = [];
  const total = Math.max(1, rangeEnd.getTime() - rangeStart.getTime());
  const dayCursor = new Date(rangeStart);
  dayCursor.setHours(0, 0, 0, 0);
  const finalDay = new Date(rangeEnd);
  finalDay.setHours(23, 59, 59, 999);

  while (dayCursor <= finalDay) {
    const day = dayCursor.getDay();
    if (day === 0 || day === 6) {
      const st = Math.max(dayCursor.getTime(), rangeStart.getTime());
      const next = new Date(dayCursor);
      next.setDate(next.getDate() + 1);
      const en = Math.min(next.getTime(), rangeEnd.getTime());
      if (en > st) {
        const left = ((st - rangeStart.getTime()) / total) * 100;
        const width = ((en - st) / total) * 100;
        out.push(`<div class="g-weekend-band" style="left:${left}%;width:${width}%"></div>`);
      }
    }
    dayCursor.setDate(dayCursor.getDate() + 1);
  }
  return out.join('');
}

function buildTodayMarker(rangeStart, rangeEnd) {
  const now = new Date();
  if (now < rangeStart || now > rangeEnd) return '';
  const total = Math.max(1, rangeEnd.getTime() - rangeStart.getTime());
  const left = ((now.getTime() - rangeStart.getTime()) / total) * 100;
  return `<div class="g-today-marker" style="left:${left}%"></div>`;
}

async function renderGantt() {
  const { from, to } = getGanttRange();
  const appFilter = qs('#gantt-app-filter').value;
  const mode = qs('#gantt-color-mode').value;

  const query = new URLSearchParams({ mode });
  if (from) query.set('from', from);
  if (to) query.set('to', to);

  const rows = await api(`/api/gantt?${query.toString()}`);
  const filtered = rows.filter((r) => appFilter === 'All' || r.app.application_name === appFilter);
  const baseColors = getColorMap(mode);
  const colors = Object.fromEntries(Object.entries(baseColors).map(([key, val]) => [key, darkenColor(val, 0.42)]));
  renderGanttLegend(mode, colors);

  if (!filtered.length) {
    qs('#gantt-container').innerHTML = '<p>No applications in selected range.</p>';
    return;
  }

  const range = timelineRange(from, to, filtered);
  const rangeMs = Math.max(1, range.end.getTime() - range.start.getTime());

  const rowsHtml = filtered
    .map((row) => {
      const weekendBands = buildWeekendBands(range.start, range.end);
      const todayMarker = buildTodayMarker(range.start, range.end);
      const consolidated = consolidateSegments(row.segments, mode);
      const totalByValue = new Map(consolidated.map((x) => [x.value, x.totalHours]));
      const segHtml = row.segments
        .map((seg) => {
          const segStartMs = Math.max(new Date(seg.start).getTime(), range.start.getTime());
          const segEndMs = Math.min(new Date(seg.end).getTime(), range.end.getTime());
          if (segEndMs <= segStartMs) return '';
          const width = Math.max(((segEndMs - segStartMs) / rangeMs) * 100, 0.4);
          const left = ((segStartMs - range.start.getTime()) / rangeMs) * 100;
          const color = colors[seg.value] || '#2f3f57';
          const totalHours = totalByValue.get(seg.value) ?? seg.hours;
          const tip = `${seg.value}\nTotal Time: ${formatDurationVerbose(totalHours)}`;
          const label = width > 12 ? seg.value : '';
          return `<div class="g-seg" style="left:${left}%;width:${width}%;background:${color}" title="${tip}" data-segment="${seg.value}">${label}</div>`;
        })
        .join('');

      return `<div class="gantt-row2">
        <div class="g-left-cols">
          <div class="g-activity"><button type="button" class="g-app-link" data-gantt-details-id="${row.app.id}">${row.app.application_name}</button></div>
          <div class="g-state">${row.app.status}</div>
        </div>
        <div class="g-right-cols">
          <div class="g-track">${weekendBands}${todayMarker}${segHtml}</div>
        </div>
      </div>`;
    })
    .join('');

  qs('#gantt-container').innerHTML = `
    <div class="gantt-grid">
      <div class="gantt-head">
        <div class="g-left-head">
          <div>App Name</div><div>Status</div>
        </div>
        <div class="g-right-head">${buildTimelineHeader(range.start.toISOString().slice(0, 10), range.end.toISOString().slice(0, 10), filtered)}</div>
      </div>
      ${rowsHtml}
    </div>
  `;

  qsa('[data-gantt-details-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openGanttDetails(btn.dataset.ganttDetailsId);
    });
  });
}

async function initializeData() {
  state.meta = await api('/api/meta');
  fillSelect('#team_assigned', state.meta.teams);
  fillSelect('#status', state.meta.statuses);

  await loadApplications();
  fillGanttApps();
  await loadHome();
  renderList();
  renderKanban();
  await renderGantt();
  await loadUsers();
}

function bindEvents() {
  qsa('.nav-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      setActiveView(button.dataset.view);
      if (button.dataset.view === 'home') {
        await loadHome();
      }
      if (button.dataset.view === 'connectors') {
        await loadApplications();
        renderList();
        renderKanban();
        setConnectorMode('kanban');
      }
      if (button.dataset.view === 'gantt') {
        await loadApplications();
        fillGanttApps();
        qs('#gantt-details').classList.add('hidden');
        qs('#gantt-details').innerHTML = '';
        await renderGantt();
      }
    });
  });

  qs('#new-btn').addEventListener('click', () => {
    if (!canEdit()) return;
    resetForm();
    setActiveView('form');
  });

  qs('#cancel-form').addEventListener('click', () => {
    setActiveView('connectors');
    setConnectorMode(state.connectorViewMode);
  });

  qs('#kanban-mode').addEventListener('change', () => {
    state.kanbanMode = qs('#kanban-mode').value;
    renderKanban();
  });

  qs('#toggle-list').addEventListener('click', () => setConnectorMode('list'));
  qs('#toggle-kanban').addEventListener('click', () => setConnectorMode('kanban'));
  qs('#list-density').addEventListener('change', () => setListDensity(qs('#list-density').value));

  qs('#gantt-app-filter').addEventListener('change', renderGantt);
  qs('#gantt-calendar-view').addEventListener('change', () => {
    toggleGanttMonthPicker();
    renderGantt();
  });
  qs('#gantt-month').addEventListener('change', renderGantt);
  qs('#gantt-scale').addEventListener('change', renderGantt);
  qs('#gantt-color-mode').addEventListener('change', renderGantt);
  qs('#history-close').addEventListener('click', () => qs('#history-modal').classList.add('hidden'));

  qs('#app-form').addEventListener('submit', async (event) => {
    if (!canEdit()) return;
    event.preventDefault();
    const id = qs('#record-id').value;

    if (id) {
      await api(`/api/applications/${id}`, { method: 'PUT', body: JSON.stringify(formPayload()) });
      showToast('Connector updated');
    } else {
      await api('/api/applications', { method: 'POST', body: JSON.stringify(formPayload()) });
      showToast('Connector created');
    }

    await loadApplications();
    fillGanttApps();
    await loadHome();
    renderList();
    renderKanban();
    await renderGantt();
    setActiveView('connectors');
    setConnectorMode('kanban');
  });

  qs('#user-form').addEventListener('submit', async (event) => {
    if (!canEdit()) return;
    event.preventDefault();
    await api('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        username: qs('#new-username').value,
        password: qs('#new-password').value || null,
        role: qs('#new-role').value
      })
    });
    qs('#new-username').value = '';
    qs('#new-password').value = '';
    await loadUsers();
    showToast('User added');
  });

  qs('#sidebar-logout-btn').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    location.reload();
  });

  qs('#theme-preset').addEventListener('change', () => {
    const next = { ...state.theme, preset: qs('#theme-preset').value };
    state.theme = next;
    window.BATheme?.setTheme?.(next);
  });

  qs('#theme-mode-toggle').addEventListener('click', () => {
    const nextMode = state.theme.mode === 'dark' ? 'light' : 'dark';
    const next = { ...state.theme, mode: nextMode };
    state.theme = next;
    window.BATheme?.setTheme?.(next);
  });

  document.addEventListener('themechange', async (event) => {
    state.theme = event.detail || state.theme;
    qs('#theme-mode-toggle').textContent = state.theme.mode === 'dark' ? 'Light' : 'Dark';
    renderList();
    renderKanban();
    await loadHome();
    await renderGantt();
  });
}

async function initApp() {
  qs('#auth-screen').classList.add('hidden');
  qs('#app').classList.remove('hidden');

  bindEvents();
  await initializeData();
  resetForm();
  applyRolePermissions();
  setActiveView('home');
  setConnectorMode('kanban');
  setListDensity(state.listDensity);
  qs('#gantt-month').value = new Date().toISOString().slice(0, 7);
  toggleGanttMonthPicker();
  const theme = window.BATheme?.getTheme?.() || state.theme;
  state.theme = theme;
  qs('#theme-preset').value = theme.preset;
  qs('#theme-mode-toggle').textContent = theme.mode === 'dark' ? 'Light' : 'Dark';
}

async function bootstrapAuth() {
  const [boot, me] = await Promise.all([api('/api/auth/bootstrap'), api('/api/auth/me')]);
  if (me.user) {
    state.user = me.user;
    await initApp();
    return;
  }

  qs('#username').value = boot.username;
  qs('#username').readOnly = true;
  qs('#password').value = '12345';

  if (boot.mustSetPassword) {
    qs('#auth-subtitle').textContent = 'Set first password for jaivinje';
    qs('#auth-btn').textContent = 'Set Password';
    qs('#auth-form').onsubmit = async (event) => {
      event.preventDefault();
      showAuthError('');
      try {
        await api('/api/auth/set-password', {
          method: 'POST',
          body: JSON.stringify({ username: 'jaivinje', password: qs('#password').value })
        });
        state.user = (await api('/api/auth/me')).user;
        await initApp();
      } catch (error) {
        showAuthError(error.message);
      }
    };
  } else {
    qs('#auth-subtitle').textContent = 'Enter password';
    qs('#auth-btn').textContent = 'Login';
    qs('#auth-form').onsubmit = async (event) => {
      event.preventDefault();
      showAuthError('');
      try {
        await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: qs('#username').value, password: qs('#password').value })
        });
        state.user = (await api('/api/auth/me')).user;
        await initApp();
      } catch (error) {
        showAuthError(error.message);
      }
    };
  }
}

bootstrapAuth().catch((error) => showAuthError(error.message));
