import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const db = new Database(path.join(__dirname, '..', 'data.db'));
db.pragma('journal_mode = WAL');

const STATUS_VALUES = [
  'Open',
  'In Progress',
  'Released',
  'Approved',
  'PM Approval',
  'Legal Pending',
  'Credentials Ready'
];

const TEAM_VALUES = ['PM', 'Development', 'Design', 'Marketing', 'Data Analysts'];

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      must_set_password INTEGER NOT NULL DEFAULT 1,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connector_name TEXT,
      application_name TEXT NOT NULL,
      domain TEXT NOT NULL,
      team_assigned TEXT NOT NULL,
      status TEXT NOT NULL,
      created_date TEXT NOT NULL,
      actual_release_date TEXT,
      actual_completed_date TEXT,
      release_eta TEXT,
      prd_link TEXT,
      build_request_form TEXT,
      pm_owner TEXT,
      da_owner TEXT,
      pm_manager TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      changed_by INTEGER,
      FOREIGN KEY (application_id) REFERENCES applications(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS app_team_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      team TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      changed_by INTEGER,
      FOREIGN KEY (application_id) REFERENCES applications(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_app_domain ON applications(domain);
    CREATE INDEX IF NOT EXISTS idx_app_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_app_team ON applications(team_assigned);
    CREATE INDEX IF NOT EXISTS idx_app_created ON applications(created_date);
    CREATE INDEX IF NOT EXISTS idx_app_release ON applications(actual_release_date);
    CREATE INDEX IF NOT EXISTS idx_status_app_time ON app_status_history(application_id, changed_at);
    CREATE INDEX IF NOT EXISTS idx_team_app_time ON app_team_history(application_id, changed_at);
  `);

  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('jaivinje');
  if (!admin) {
    db.prepare('INSERT INTO users (username, must_set_password, role) VALUES (?, 1, ?)').run('jaivinje', 'admin');
  }

  const appColumns = db.prepare(`PRAGMA table_info(applications)`).all();
  if (!appColumns.find((c) => c.name === 'actual_completed_date')) {
    db.prepare(`ALTER TABLE applications ADD COLUMN actual_completed_date TEXT`).run();
  }

  // Backward-compat migration: rename legacy status value.
  db.prepare(`UPDATE applications SET status = 'Released' WHERE status = 'Closed'`).run();
  db.prepare(`UPDATE app_status_history SET status = 'Released' WHERE status = 'Closed'`).run();
}

initDb();

const SQLiteStore = SQLiteStoreFactory(session);
app.use(express.json());
app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, '..') }),
    secret: process.env.SESSION_SECRET || 'replace-this-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }
  })
);

app.use(express.static(path.join(__dirname, '..', 'public')));

function validateEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    const err = new Error(`${fieldName} must be one of: ${allowed.join(', ')}`);
    err.status = 400;
    throw err;
  }
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireWriteAccess(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Read-only access: guest/viewer cannot modify data' });
  }
  next();
}

function getIntranetUrls() {
  const urls = new Set([`http://localhost:${PORT}`]);
  const hostName = os.hostname();
  const localHostName = String(hostName || '').trim();
  if (localHostName) {
    urls.add(`http://${localHostName}:${PORT}`);
    urls.add(`http://${localHostName}.local:${PORT}`);
  }
  const nets = os.networkInterfaces();
  Object.values(nets).forEach((entries) => {
    (entries || []).forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) {
        urls.add(`http://${net.address}:${PORT}`);
      }
    });
  });
  return Array.from(urls);
}

app.get('/api/meta', (_req, res) => {
  res.json({ statuses: STATUS_VALUES, teams: TEAM_VALUES });
});

app.get('/api/network/urls', (_req, res) => {
  res.json({ urls: getIntranetUrls() });
});

app.get('/api/auth/bootstrap', (req, res) => {
  const user = db.prepare('SELECT username, must_set_password FROM users WHERE username = ?').get('jaivinje');
  res.json({
    username: 'jaivinje',
    mustSetPassword: user?.must_set_password === 1,
    isLoggedIn: Boolean(req.session.user)
  });
});

app.post('/api/auth/set-password', (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (username !== 'jaivinje') {
      return res.status(400).json({ error: 'Only jaivinje can be initialized here' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = db.prepare('SELECT id, must_set_password FROM users WHERE username = ?').get(username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ?, must_set_password = 0 WHERE id = ?').run(hash, user.id);

    req.session.user = { id: user.id, username, role: 'admin' };
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare('SELECT id, username, password_hash, must_set_password, role FROM users WHERE username = ?')
    .get(username);

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.must_set_password) return res.status(400).json({ error: 'Password setup required' });

  const ok = bcrypt.compareSync(password || '', user.password_hash || '');
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.json({ ok: true, user: req.session.user });
});

app.post('/api/auth/guest-login', (req, res) => {
  req.session.user = { id: -1, username: 'guest', role: 'guest' };
  req.session.save(() => res.json({ ok: true, user: req.session.user }));
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get('/api/users', requireAuth, (_req, res) => {
  const users = db
    .prepare('SELECT id, username, role, must_set_password, created_at FROM users ORDER BY id DESC')
    .all();
  res.json(users);
});

app.post('/api/users', requireWriteAccess, (req, res) => {
  const { username, password, role = 'viewer' } = req.body;
  if (!username || String(username).trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  const mustSetPassword = !password ? 1 : 0;
  const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

  try {
    const info = db
      .prepare('INSERT INTO users (username, password_hash, must_set_password, role) VALUES (?, ?, ?, ?)')
      .run(String(username).trim(), passwordHash, mustSetPassword, role);
    res.json({ id: info.lastInsertRowid });
  } catch {
    res.status(409).json({ error: 'Username already exists' });
  }
});

function normalizeDate(v) {
  return v ? String(v).slice(0, 10) : null;
}

function normalizeDateTime(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function nowIso() {
  return new Date().toISOString();
}

function validateAppPayload(body) {
  if (!body.application_name || !body.domain || !body.team_assigned || !body.status) {
    const err = new Error('application_name, domain, team_assigned, and status are required');
    err.status = 400;
    throw err;
  }
  validateEnum(body.status, STATUS_VALUES, 'status');
  validateEnum(body.team_assigned, TEAM_VALUES, 'team_assigned');
}

function appendHistoryIfChanged(applicationId, previous, nextData, userId) {
  const ts = nowIso();
  if (previous.status !== nextData.status) {
    db.prepare(
      'INSERT INTO app_status_history (application_id, status, changed_at, changed_by) VALUES (?, ?, ?, ?)'
    ).run(applicationId, nextData.status, ts, userId);
  }
  if (previous.team_assigned !== nextData.team_assigned) {
    db.prepare('INSERT INTO app_team_history (application_id, team, changed_at, changed_by) VALUES (?, ?, ?, ?)').run(
      applicationId,
      nextData.team_assigned,
      ts,
      userId
    );
  }
}

app.get('/api/applications', requireAuth, (req, res) => {
  const { appName, releasedDate, team, status, domain, from, to } = req.query;

  let sql = 'SELECT * FROM applications WHERE 1=1';
  const params = [];

  if (appName) {
    sql += ' AND application_name LIKE ?';
    params.push(`%${appName}%`);
  }
  if (releasedDate) {
    sql += ' AND actual_release_date = ?';
    params.push(releasedDate);
  }
  if (team) {
    sql += ' AND team_assigned = ?';
    params.push(team);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (domain) {
    sql += ' AND domain = ?';
    params.push(domain);
  }
  if (from) {
    sql += ' AND COALESCE(actual_release_date, release_eta, created_date) >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND COALESCE(actual_release_date, release_eta, created_date) <= ?';
    params.push(to);
  }

  sql += ' ORDER BY COALESCE(actual_release_date, release_eta, created_date) DESC, id DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.post('/api/applications', requireWriteAccess, (req, res, next) => {
  try {
    const body = req.body;
    if (body.status === 'Closed') body.status = 'Released';
    validateAppPayload(body);

    const createdDate = normalizeDate(body.created_date) || normalizeDate(new Date().toISOString());
    const actualRelease = normalizeDate(body.actual_release_date);
    const actualCompleted = normalizeDateTime(body.actual_completed_date);
    const eta = normalizeDate(body.release_eta);
    const ts = nowIso();
    const completedAt = body.status === 'Released' ? actualCompleted || ts : actualCompleted;

    const tx = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO applications (
            connector_name, application_name, domain, team_assigned, status,
            created_date, actual_release_date, actual_completed_date, release_eta, prd_link, build_request_form,
            pm_owner, da_owner, pm_manager, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          body.connector_name || null,
          body.application_name,
          body.domain,
          body.team_assigned,
          body.status,
          createdDate,
          actualRelease,
          completedAt,
          eta,
          body.prd_link || null,
          body.build_request_form || null,
          body.pm_owner || null,
          body.da_owner || null,
          body.pm_manager || null,
          ts
        );

      const appId = info.lastInsertRowid;
      db.prepare('INSERT INTO app_status_history (application_id, status, changed_at, changed_by) VALUES (?, ?, ?, ?)').run(
        appId,
        body.status,
        ts,
        req.session.user.id
      );
      db.prepare('INSERT INTO app_team_history (application_id, team, changed_at, changed_by) VALUES (?, ?, ?, ?)').run(
        appId,
        body.team_assigned,
        ts,
        req.session.user.id
      );

      return appId;
    });

    const id = tx();
    res.json({ id });
  } catch (error) {
    next(error);
  }
});

app.put('/api/applications/:id', requireWriteAccess, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const previous = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    if (!previous) return res.status(404).json({ error: 'Not found' });

    const nextStatus = req.body.status === 'Closed' ? 'Released' : req.body.status;
    const hasCompletedInRequest = Object.prototype.hasOwnProperty.call(req.body, 'actual_completed_date');
    const body = {
      ...previous,
      ...req.body,
      status: nextStatus || previous.status,
      created_date: normalizeDate(req.body.created_date || previous.created_date),
      actual_release_date: normalizeDate(req.body.actual_release_date || previous.actual_release_date),
      actual_completed_date: hasCompletedInRequest
        ? normalizeDateTime(req.body.actual_completed_date)
        : normalizeDateTime(previous.actual_completed_date),
      release_eta: normalizeDate(req.body.release_eta || previous.release_eta)
    };

    // When an app is moved to Released, mark release/completion date if not already present.
    if (previous.status !== 'Released' && body.status === 'Released' && !body.actual_release_date) {
      body.actual_release_date = new Date().toISOString().slice(0, 10);
    }
    if (previous.status !== 'Released' && body.status === 'Released' && !body.actual_completed_date) {
      body.actual_completed_date = nowIso();
    }

    validateAppPayload(body);

    const ts = nowIso();
    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE applications SET
          connector_name = ?, application_name = ?, domain = ?, team_assigned = ?, status = ?,
          created_date = ?, actual_release_date = ?, actual_completed_date = ?, release_eta = ?, prd_link = ?, build_request_form = ?,
          pm_owner = ?, da_owner = ?, pm_manager = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        body.connector_name || null,
        body.application_name,
        body.domain,
        body.team_assigned,
        body.status,
        body.created_date,
        body.actual_release_date,
        body.actual_completed_date,
        body.release_eta,
        body.prd_link || null,
        body.build_request_form || null,
        body.pm_owner || null,
        body.da_owner || null,
        body.pm_manager || null,
        ts,
        id
      );

      appendHistoryIfChanged(id, previous, body, req.session.user.id);
    });

    tx();
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/applications/:id/history', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const status = db
    .prepare('SELECT status AS value, changed_at FROM app_status_history WHERE application_id = ? ORDER BY changed_at ASC')
    .all(id);
  const team = db
    .prepare('SELECT team AS value, changed_at FROM app_team_history WHERE application_id = ? ORDER BY changed_at ASC')
    .all(id);
  res.json({ status, team });
});

app.get('/api/gantt', requireAuth, (req, res) => {
  const mode = req.query.mode === 'team' ? 'team' : 'status';
  const from = req.query.from;
  const to = req.query.to;
  const statusFilter = req.query.status;
  const teamFilter = req.query.team;

  let appSql = 'SELECT * FROM applications WHERE 1=1';
  const params = [];

  if (from) {
    appSql += ' AND COALESCE(actual_completed_date, actual_release_date, release_eta, created_date) >= ?';
    params.push(from);
  }
  if (to) {
    appSql += ' AND created_date <= ?';
    params.push(to);
  }
  if (statusFilter && statusFilter !== 'All') {
    appSql += ' AND status = ?';
    params.push(statusFilter);
  }
  if (teamFilter && teamFilter !== 'All') {
    appSql += ' AND team_assigned = ?';
    params.push(teamFilter);
  }

  const apps = db.prepare(appSql).all(...params);

  const results = apps.map((application) => {
    const rawHistory =
      mode === 'status'
        ? db
            .prepare('SELECT status AS value, changed_at FROM app_status_history WHERE application_id = ? ORDER BY changed_at ASC')
            .all(application.id)
        : db
            .prepare('SELECT team AS value, changed_at FROM app_team_history WHERE application_id = ? ORDER BY changed_at ASC')
            .all(application.id);

    const defaultValue = mode === 'status' ? application.status : application.team_assigned;
    const start = new Date(application.created_date || application.updated_at).toISOString();
    const end = new Date(
      application.actual_completed_date ||
        application.actual_release_date ||
        application.release_eta ||
        application.created_date ||
        new Date().toISOString()
    ).toISOString();

    const history = rawHistory.length ? rawHistory : [{ value: defaultValue, changed_at: start }];
    if (history[0].changed_at > start) {
      history.unshift({ value: history[0].value, changed_at: start });
    }

    const segments = [];
    for (let i = 0; i < history.length; i += 1) {
      const current = history[i];
      const next = history[i + 1];
      const segStart = new Date(current.changed_at).toISOString();
      const segEnd = next ? new Date(next.changed_at).toISOString() : end;

      if (new Date(segEnd) > new Date(segStart)) {
        const durationMs = new Date(segEnd).getTime() - new Date(segStart).getTime();
        const hours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;
        segments.push({ value: current.value, start: segStart, end: segEnd, hours });
      }
    }

    return {
      app: {
        id: application.id,
        application_name: application.application_name,
        domain: application.domain,
        status: application.status,
        team_assigned: application.team_assigned,
        created_date: application.created_date,
        actual_completed_date: application.actual_completed_date,
        release_eta: application.release_eta
      },
      segments
    };
  });

  res.json(results);
});

app.get('/api/dashboard/summary', requireAuth, (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS c FROM applications').get().c;
  const releasedThisMonth = db
    .prepare(
      `SELECT COUNT(*) AS c FROM applications
       WHERE actual_release_date IS NOT NULL
       AND strftime('%Y-%m', actual_release_date) = strftime('%Y-%m', 'now')`
    )
    .get().c;

  const byStatus = db
    .prepare('SELECT status, COUNT(*) AS count FROM applications GROUP BY status ORDER BY count DESC')
    .all();

  const monthly = db
    .prepare(
      `SELECT strftime('%Y-%m', COALESCE(actual_release_date, release_eta, created_date)) AS month,
              COUNT(*) AS count
       FROM applications
       GROUP BY month
       ORDER BY month ASC`
    )
    .all();

  const byDomain = db
    .prepare('SELECT domain, COUNT(*) AS count FROM applications GROUP BY domain ORDER BY count DESC')
    .all();

  res.json({ total, releasedThisMonth, byStatus, monthly, byDomain });
});

app.get('/api/kanban', requireAuth, (req, res) => {
  const mode = req.query.mode === 'team' ? 'team' : 'status';
  const apps = db
    .prepare('SELECT id, application_name, connector_name, domain, team_assigned, status, release_eta, actual_release_date FROM applications')
    .all();

  const groups = {};
  const keys = mode === 'status' ? STATUS_VALUES : TEAM_VALUES;
  keys.forEach((k) => {
    groups[k] = [];
  });

  for (const app of apps) {
    const key = mode === 'status' ? app.status : app.team_assigned;
    if (!groups[key]) groups[key] = [];
    groups[key].push(app);
  }

  res.json({ mode, groups });
});

app.get('/api/list/grouped', requireAuth, (req, res) => {
  const month = req.query.month; // YYYY-MM
  const rows = db
    .prepare(
      `SELECT * FROM applications
       WHERE (? IS NULL OR strftime('%Y-%m', COALESCE(actual_release_date, release_eta, created_date)) = ?)
       ORDER BY domain ASC, COALESCE(actual_release_date, release_eta, created_date) DESC`
    )
    .all(month || null, month || null);

  const grouped = rows.reduce((acc, row) => {
    const key = row.domain;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  res.json(grouped);
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Connector tracker running at http://${HOST}:${PORT}`);
});
