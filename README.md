# Beacon

Self-hosted church worship team display system. Shows musician cards (name, photo, mic, IEM assignments) on TV screens around your venue, pulled from Planning Center Online.

## What it does

- Pulls service plans from Planning Center Online
- Runs configurable automation rules to assign mics and IEMs to musicians
- Displays assignments on TV screens via a browser running on Raspberry Pi or any device
- Admin panel for managing locations, screens, templates, people, labels, and automation rules

## Tech stack

- **Backend:** Node.js 26, Express, SQLite (via `node:sqlite` built-in)
- **Frontend:** React 18, Vite, CSS Modules
- **Auth:** Session-based (admin panel) + cookie-based (display screens)
- **Deployment target:** Raspberry Pi + Cloudflare Tunnel

## Local development

### Prerequisites

- Node.js 26+

### Setup

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..

# Copy and configure environment
cp server/.env.example server/.env
# Edit server/.env with your values
```

### Running

```bash
# Start backend (from /server)
cd server && node index.js

# Start frontend dev server (from /client, separate terminal)
cd client && npm run dev
```

- Admin panel: http://localhost:5173/admin
- Display: http://localhost:5173/display
- API: http://localhost:3001

### First run

On first startup, visit `/setup` to create your organization and admin account. After that, log in at `/login`.

## Environment variables

Copy `server/.env.example` to `server/.env` and fill in:

| Variable | Description |
|---|---|
| `PORT` | Server port (default 3001) |
| `SESSION_SECRET` | Long random string for session signing |
| `ADMIN_EMAIL` | Initial admin account email |
| `ADMIN_NAME` | Initial admin account name |
| `ADMIN_PASSWORD` | Initial admin account password |
| `PCO_CLIENT_ID` | Planning Center OAuth app client ID |
| `PCO_CLIENT_SECRET` | Planning Center OAuth app client secret |
| `PCO_REDIRECT_URI` | OAuth redirect URI |
| `USE_MOCK_DATA` | Set `true` to use hardcoded test data instead of PCO |

## Project structure

```
beacon/
├── client/          React + Vite frontend
│   └── src/
│       ├── components/   Shared components (MusicianCard, CardGrid, Modal…)
│       └── pages/        Route-level pages (Admin/*, Display, Docs…)
├── server/          Express backend
│   ├── routes/      API route handlers
│   ├── middleware/  Auth middleware
│   ├── utils/       Mailer, password helpers
│   └── uploads/     User-uploaded photos and logos (gitignored)
└── CLAUDE.md        Project context for Claude Code
```

## Deployment

Designed to run on a Raspberry Pi (or any Linux box) behind a Cloudflare Tunnel for HTTPS without port-forwarding. Build the client with `npm run build` inside `/client`, then serve everything from the Express backend.
