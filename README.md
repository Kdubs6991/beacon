# Beacon

Self-hosted worship team display. Shows musician cards (name, photo, mic and IEM assignments) on any TV, tablet, or kiosk in your venue — updated automatically from a schedule or pushed on demand.

**Free and open source. Runs on your own hardware. Your data stays on your network.**

---

## Quick Start

**Requirements:** [Node.js 22+](https://nodejs.org)

```bash
git clone https://github.com/Kdubs6991/beacon.git
cd beacon
npm run setup
npm start
```

Open **http://localhost:3001** and complete the setup wizard.

That's it. No configuration required — a session secret is auto-generated on first run.

---

## Accessing from other devices

When the server starts it prints your local network address:

```
Beacon running on http://localhost:3001
  Network:   http://192.168.1.x:3001
```

Use the network URL to open Beacon on any TV, phone, or tablet on the same WiFi network. The IP changes when you switch networks — use the address printed each time you start the server.

For a permanent URL accessible outside your network, see [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

---

## Updating

```bash
git pull
npm run build
npm start
```

---

## Configuration (optional)

No configuration is needed to get started. If you want to customize:

```bash
cp server/.env.example server/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port to run the server on |
| `SESSION_SECRET` | auto-generated | Secret for session cookies |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | Pre-seed an admin account on first start |

SMTP (email) settings can be configured through the admin UI at **Admin → Organization → Email / SMTP** — no `.env` editing needed.

---

## Development

```bash
npm run dev
```

Runs the Express server on `:3001` and Vite on `:5173` with hot reload.

- Admin panel: http://localhost:5173/admin
- Display: http://localhost:5173/display
- API: http://localhost:3001

### Test data

To populate the database with a realistic worship team:

```bash
node server/seed-test.js          # seed 8 people, labels, rules, a template and screen
node server/seed-test.js --reset  # remove all seed data
```

---

## What it does

- **Manual service teams** — build your roster in Beacon and assign each person a position
- **Automation rules** — write rules once; Beacon auto-assigns mic and IEM labels based on name or position
- **Custom templates** — multi-row grids with per-slot display modes (photo, name, label, full card)
- **Scheduled push** — set a day and time; displays update before you arrive
- **On-demand push** — push to screens instantly from the admin panel
- **Any screen** — each display is a permanent browser URL; no app installs on TVs
- **Active screen detection** — heartbeat-based live/offline status for every screen

## Tech stack

- **Backend:** Node.js 22+, Express, SQLite via `node:sqlite` built-in
- **Frontend:** React 18, Vite, CSS Modules
- **Auth:** Session-based (admin) + cookie-based (display screens)
- **Scheduling:** node-cron

## License

MIT
