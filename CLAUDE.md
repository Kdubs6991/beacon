# Beacon — Project Context

## What This Is

A self-hosted church worship team display app, similar to "Mic Assign", that integrates with Planning Center Online (PCO). It shows a card-based display (TV/kiosk-friendly) of each musician's name, photo, role, microphone assignment, and in-ear monitor (IEM) assignment for a given service.

**Key improvement over Mic Assign:** Scheduled auto-fetch — the app can automatically pull the next upcoming service from Planning Center on a cron schedule, so staff don't have to manually select the service each week.

---

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** React + Vite
- **Database:** SQLite via `better-sqlite3`
- **Auth:** Planning Center OAuth 2.0 (credentials pending — see below)
- **Scheduling:** `node-cron` (runs inside the Express server)
- **Remote Access:** Cloudflare Tunnel (hosted on Raspberry Pi, accessible via browser from any device)

### Project Structure
```
beacon/
├── server/          # Express backend
│   ├── index.js
│   ├── db.js        # SQLite setup + migrations
│   ├── routes/
│   │   ├── auth.js       # PCO OAuth flow
│   │   ├── pco.js        # Planning Center API calls
│   │   ├── admin.js      # Admin panel API
│   │   └── display.js    # Display screen API
│   ├── scheduler.js      # node-cron jobs
│   └── pco-client.js     # PCO API wrapper (token refresh, requests)
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Display.jsx       # TV/kiosk display (the card grid)
│   │   │   ├── Admin/            # All admin panel pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Locations.jsx
│   │   │   │   ├── Templates.jsx
│   │   │   │   ├── People.jsx
│   │   │   │   ├── Labels.jsx
│   │   │   │   ├── Automation.jsx
│   │   │   │   ├── Screens.jsx
│   │   │   │   └── Schedules.jsx
│   │   ├── components/
│   │   │   ├── MusicianCard.jsx  # Individual display card
│   │   │   └── CardGrid.jsx      # The full display grid
│   │   └── App.jsx
└── CLAUDE.md
```

---

## Planning Center OAuth — PLACEHOLDER

**Status: Not yet set up. Add these values to `server/.env` when ready.**

```env
PCO_CLIENT_ID=YOUR_CLIENT_ID_HERE
PCO_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
PCO_REDIRECT_URI=http://localhost:3000/auth/callback
```

To set up: visit https://api.planningcenteronline.com/oauth/applications, create a new app, request `services` and `people` scopes, and set the redirect URI above. Update `PCO_REDIRECT_URI` to the production URL once deployed to the Pi.

PCO tokens expire every 2 hours — the app must use refresh tokens to stay connected. The `pco-client.js` wrapper handles this automatically.

---

## Planning Center API — Key Endpoints

Base URL: `https://api.planningcenteronline.com/services/v2`

| Purpose | Endpoint |
|---|---|
| List service types | `GET /service_types` |
| List plans for a service type | `GET /service_types/:id/plans` |
| Get upcoming plans | `GET /service_types/:id/plans?filter=future` |
| Get team members on a plan | `GET /service_types/:id/plans/:id/team_members` |
| Get person details | `GET /people/v2/people/:id` |
| Get person's PCO photo | included in person object |

Team members have a `status` (confirmed/declined/unconfirmed) and a `team_position_name` (e.g., "Vocalist", "Keys", "EG 1") — this is what drives assignment automation rules.

---

## Core Features

### Display (TV/Kiosk View)
- Dark-themed card grid, one card per musician
- Each card: photo, name, role/position, microphone label, IEM label
- Event name + date at top
- Unique permanent URL per screen (e.g., `/display/abc123`)
- Kiosk-mode friendly (no UI chrome)
- Auto-refreshes when new assignments are pushed

### Admin Panel
All of the following match Mic Assign's feature set:

**Locations**
- Campus management (name + optional description)
- Service Types (e.g., "Sunday Mornings", "Youth Group")

**Templates**
- Reusable fixed display layouts/grids
- Define slot positions and appearance

**People**
- PCO-linked people (pull from Planning Center)
- Manual people (name, photo, category like "Worship" / "Pastor")
- Photo upload with dual-crop UI: user uploads an image (up to 15 MB), crops it once showing both a portrait (3:4) overlay and square (1:1) overlay simultaneously — both crops are saved as separate WebP files
- Photos stored on disk at `server/uploads/photos/`, served as static files at `/uploads/photos/`
- Two photo variants per person: `photo_url` (square, used in people grid), `photo_url_portrait` (3:4, used on display screen cards)
- PCO people have corresponding `photo_override` and `photo_override_portrait` columns so uploads don't get clobbered by PCO sync
- Upload endpoint: `POST /api/admin/photos/upload` (multipart: `square` + `portrait` fields)
- Grid card view opens a detail modal on click (not expand-in-place)

**Labels**
- Define mic and IEM equipment (e.g., "Vox 1", "Vox 2", "Keys IEM")
- Drag-to-reorder (order matters for "Next Available" automation)
- Automation groups (e.g., group "vocal" mics separately from "pack" mics)
- Import/export labels

**Assignment Automation**
- Priority-ordered if/then rules
- Conditions: match by Name or PCO Position, using "is" (exact) or "contains" (partial)
- Actions: assign Slot, Mic label, IEM label (specific or "next available")
- "Next available" respects label order and optional group filter
- Each person matches only their first matching rule (top-down priority)

**Screens**
- Create named display screens with unique permanent URLs
- Optional location tag
- Share code system: generate a code so team members can push content to a screen without needing admin access
- Kiosk mode URL (no admin chrome)

**Schedules (KEY IMPROVEMENT over Mic Assign)**
- Admin sets a cron schedule per service type (e.g., "every Sunday at 6am")
- On trigger: app queries PCO for the next upcoming plan in that service type
- Automatically sets it as the active plan and runs assignment automation
- No manual service selection required
- Admin can also manually trigger a refresh at any time
- Schedule stored in SQLite, executed by node-cron on the server

**Logo**
- Upload church logo displayed on the display screen

---

## Database Schema (SQLite)

Key tables to implement:
- `settings` — app-wide config (logo, etc.)
- `campuses` — campus/location records
- `service_types` — maps to PCO service types
- `people` — local people cache (PCO-linked or manual)
- `photo_overrides` — custom photos for PCO people
- `labels` — mic/IEM/other equipment labels with group and sort order
- `automation_rules` — if/then assignment rules with priority
- `screens` — display screen records with unique tokens
- `schedules` — cron expressions + service type + last-run info
- `pco_tokens` — stored OAuth access + refresh tokens (encrypted)
- `active_assignments` — current mic/IEM assignments per screen

---

## Hosting (Raspberry Pi)

- App runs on the Pi as a Node.js process (managed by `pm2`)
- SQLite database file lives on the Pi's filesystem
- Cloudflare Tunnel (`cloudflared`) makes it publicly accessible without port forwarding
- Admin accesses the panel from any browser via the tunnel URL
- Display screens run in kiosk-mode browser on any TV/monitor pointed at their unique URL

**Pi setup steps (to do):**
1. Install Node.js on Pi
2. Clone repo, `npm install`
3. Set up `.env` with secrets
4. `pm2 start server/index.js`
5. Install and configure `cloudflared` tunnel
6. (Optional) point custom domain to tunnel in Cloudflare DNS

---

## Development Notes

- Build backend first (Express + SQLite + routes) with PCO auth as a stubbed placeholder
- Build the display UI second — match the dark card grid from the screenshot
- Build admin panel third
- Wire up PCO OAuth last (when credentials are available)
- All PCO API calls should go through `pco-client.js` which handles token refresh automatically
- The scheduler should be testable without PCO (use mock data during dev)
