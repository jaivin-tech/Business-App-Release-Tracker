# Connector Release Tracker

Local web app to track connector release process with:
- Login and first-time password setup for `jaivinje`
- Connector/application release records
- Grouped list view by domain and month
- Filters: app name, released date, team, status
- Gantt-style segmented timeline by status/team with hover duration
- Kanban board by status or team
- Dashboard with KPIs + monthly release charts
- User management in settings

## Tech Stack
- Node.js + Express
- SQLite (`better-sqlite3`)
- Session auth (`express-session`, `connect-sqlite3`)
- Frontend: Vanilla JS + Chart.js

## Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start server:
   ```bash
   npm start
   ```
3. Open:
   - Local: `http://localhost:3000`
   - Intranet: `http://<your-local-machine-ip>:3000`

The server binds to `0.0.0.0` by default, so other users in your intranet can access it if firewall allows port `3000`.

## First Login
- Username is pre-created: `jaivinje`
- On first login, set the password in the login screen.

## Data Persistence
- App database: `data.db`
- Session database: `sessions.db`

## Notes
- Every time `status` or `team_assigned` changes for an application, history is recorded.
- Gantt segments are generated from this history and display duration per segment.
