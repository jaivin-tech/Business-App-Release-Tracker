

**Connector Release Tracker**


Local web app to track connector release process with:

Connector/application release records
Grouped list view by domain and month
Filters: app name, released date, team, status
Gantt-style segmented timeline by status/team with hover duration
Kanban board by status or team
Dashboard with KPIs + monthly release charts
User management in settings

**Tech Stack**
Node.js + Express
SQLite (better-sqlite3)
Session auth (express-session, connect-sqlite3)
Frontend: Vanilla JS + Chart.js

**First Login**
Username is pre-created:
On first login, set the password in the login screen.
Data Persistence
App database: SQLite
Session database: sessions.db

**Notes**
Every time status or team_assigned changes for an application, history is recorded.
Gantt segments are generated from this history and display duration per segment.
