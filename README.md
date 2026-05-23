# Beacon

Self-hosted church worship team display app. Shows musician cards (name, photo, mic and IEM assignments) on TV/kiosk screens around your venue, with optional Planning Center Online integration for automatic roster sync.

## What it does

- Pulls service plans and team rosters from **Planning Center Online** (PCO mode) or lets you define a fixed team yourself (**Manual mode**)
- Runs configurable **automation rules** to assign mic and IEM labels to musicians based on their name or position
- Displays assignments on any browser — TV, tablet, Raspberry Pi kiosk
- Admin panel for managing locations, screens, templates, people, labels, automation rules, and schedules
- **Custom templates** — define multi-row grids with per-slot display modes (photo, name, label, full card) and optional slot pinning to specific labels
- **On-demand push** — push a team to screens instantly without waiting for a schedule
- **Active screen detection** — heartbeat-based live/offline status for every screen
- **Scan-to-login QR** — authenticate a TV screen by scanning a QR code with your phone

## Tech stack

- **Backend:** Node.js 26, Express, SQLite (via `node:sqlite` built-in)
- **Frontend:** React 18, Vite, CSS Modules
- **Auth:** Session-based (admin panel) + cookie-based (display screens)
- **Scheduling:** node-cron
- **Deployment target:** Raspberry Pi + Cloudflare Tunnel (or any Linux/Mac/Windows box)

## Local development

### Prerequisites

- Node.js 26+

### Setup

```bash
# Install all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Configure environment
cp server/.env.example server/.env
# Edit server/.env — at minimum set SESSION_SECRET
```

### Running

```bash
# Terminal 1 — backend
cd server && node index.js

# Terminal 2 — frontend dev server
cd client && npm run dev
```

- Admin panel: http://localhost:5173/admin
- Display screens: http://localhost:5173/display
- API: http://localhost:3001

### First run

Visit `/setup` to create your organization and first admin account. After that, log in at `/login`.

### Test data (seed script)

To populate the database with a realistic worship team for testing manual-mode features:

```bash
node server/seed-test.js
```

This creates 8 people, 16 labels (Vox 1-4, Keys DI, EG DI, BG DI, AG DI, IEM 1-8), automation rules that wire them all together, a Wednesday Night manual service type, a Worship Stage template, and a Stage Monitor screen. Push the team from Services → Wednesday Night → Push to see it all live.

```bash
node server/seed-test.js --reset   # remove all seed data
```

The seed script is gitignored and local-only.

## Environment variables

Copy `server/.env.example` to `server/.env`:

| Variable | Description |
|---|---|
| `PORT` | Server port (default 3001) |
| `SESSION_SECRET` | Long random string for session signing |
| `PCO_CLIENT_ID` | Planning Center OAuth app client ID |
| `PCO_CLIENT_SECRET` | Planning Center OAuth app client secret |
| `PCO_REDIRECT_URI` | OAuth redirect URI (e.g. `http://localhost:3001/api/auth/pco/callback`) |
| `USE_MOCK_DATA` | Set `true` to use hardcoded sample data instead of PCO |

## Project structure

```
beacon/
├── client/               React + Vite frontend
│   └── src/
│       ├── components/   Shared components (MusicianCard, CardGrid, Modal…)
│       └── pages/        Route-level pages (Admin/*, Display, Docs…)
├── server/               Express backend
│   ├── routes/           API route handlers (admin, display, pco, auth)
│   ├── middleware/        Auth middleware
│   ├── scheduler.js      node-cron job registry + push pipeline
│   ├── pco-client.js     PCO API wrapper with auto token refresh
│   └── uploads/          User-uploaded photos and logos (gitignored)
└── README.md
```

## How the display pipeline works

1. **Assign people** — automation rules run when a schedule fires or you click Push. They match each person's name/position against your rules and assign mic/IEM labels.
2. **Active assignments** — results are written to `active_assignments` in SQLite, keyed by screen.
3. **Display polls** — each display screen polls `GET /api/display/:token` every 30 seconds and re-renders.
4. **Templates** — if the screen uses a template layout, `CardGrid` maps each template slot to a person using slot order, `linkedTo` references, or label pins.

## Deployment

Designed to run on a Raspberry Pi (or any Linux box) behind a **Cloudflare Tunnel** for HTTPS without port-forwarding.

```bash
cd client && npm run build    # build the React app
NODE_ENV=production node server/index.js   # Express serves the built client
```

For auto-start: `pm2 start server/index.js --name beacon && pm2 save`
