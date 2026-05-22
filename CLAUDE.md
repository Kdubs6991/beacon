# Beacon — Project Context for Claude Code

## What This Is

Self-hosted church worship team display app. Shows musician cards (name,
photo, mic assignment, IEM assignment) on TV/kiosk screens around a venue.
Integrates with Planning Center Online (PCO) for automatic service plan sync,
but also works fully without PCO using manual workflows.

**Runs anywhere Node.js runs** — local machine, Raspberry Pi, VPS, etc.
Access from any browser; optionally expose via Cloudflare Tunnel for HTTPS
without port forwarding.
**Comparable to:** "Mic Assign" — this is a self-hosted, more featureful
version.

---

## Tech Stack — CRITICAL

- **Backend:** Node.js 26, Express
- **Database:** SQLite via **`node:sqlite` built-in** — NEVER use
`better-sqlite3`
  - Usage: `const { DatabaseSync } = require('node:sqlite'); const db = new
 DatabaseSync(path)`
  - Prepared statements: `db.prepare(sql).run(...)` / `.get(...)` /
`.all(...)`
- **Frontend:** React 18 + Vite, CSS Modules
- **Scheduling:** `node-cron`
- **Auth:** Session-based for admin panel, cookie-based for display screens
- **PCO:** OAuth 2.0, token refresh handled in `server/pco-client.js`

---

## Project Structure

```
beacon/
├── server/
│   ├── index.js           # Express app entry, mounts routers
│   ├── db.js              # SQLite setup, schema creation, ALL migrations
│   ├── scheduler.js       # node-cron job registry + runSchedule pipeline
│   ├── pco-client.js      # PCO API wrapper (auto token refresh)
│   ├── routes/
│   │   ├── admin.js       # All /api/admin/* endpoints
│   │   ├── display.js     # /api/display/* (public display + heartbeat)
│   │   ├── pco.js         # /api/pco/* (OAuth, status)
│   │   └── auth.js        # /api/auth/* (login, logout, setup)
│   ├── middleware/
│   │   └── auth.js        # requireAuth, requireAdmin session middleware
│   └── uploads/           # User-uploaded photos/logos (gitignored)
├── client/
│   └── src/
│       ├── App.jsx         # React Router routes
│       ├── components/
│       │   ├── MusicianCard.jsx   # Individual display card
│       │   ├── CardGrid.jsx       # Full display grid, resolves linkedTo slots
│       │   ├── InfoPopover.jsx    # (?) popover for docs links
│       │   └── Modal.jsx          # Generic modal wrapper
│       ├── context/
│       │   └── AuthContext.jsx    # useAuth() hook
│       └── pages/
│           ├── Display.jsx        # TV/kiosk display — polls
│           ├── Display.module.css
│           ├── Admin/
│           │   ├── _Layout.jsx         # Sidebar nav + hamburger mobile menu
│           │   ├── _Layout.module.css
│           │   ├── Dashboard.jsx       # Overview cards (Screens, Services, People, Labels)
│           │   ├── Dashboard.module.css
│           │   ├── Locations.jsx       # Campus CRUD
│           │   ├── Locations.module.css
│           │   ├── Templates.jsx       # Template builder (slot grid, modes, linkedTo)
│           │   ├── Templates.module.css
│           │   ├── People.jsx          # People roster
│           │   ├── People.module.css
│           │   ├── Labels.jsx          # Mic/IEM/Position label management
│           │   ├── Labels.module.css
│           │   ├── Automation.jsx      # Automation rules (if/then)
│           │   ├── Automation.module.css
│           │   ├── Screens.jsx         # Screen management + status filter
│           │   ├── Screens.module.css
│           │   ├── Schedules.jsx       # Services & Schedules page (service type CRUD + cron)
│           │   ├── Schedules.module.css
│           │   ├── Integrations.jsx    # PCO OAuth connect
│           │   ├── Organization.jsx    # Org settings
│           │   └── Profile.jsx         # User profile
│           ├── Login.jsx
│           ├── Setup.jsx
│           └── Docs.jsx               # In-app documentation
└── CLAUDE.md
```

---

## CSS Variables — USE THESE EXACT NAMES

```css
--text-pri        /* primary text */
--text-sec        /* secondary text */
--text-muted      /* muted/placeholder text */
--bg-card         /* card backgrounds */
--bg-card-hover   /* card hover state */
--bg-sidebar      /* sidebar background */
--border          /* border color */
--accent          /* blue accent (#3b82f6 approx) */
--accent-dim      /* dimmed accent for backgrounds */
--radius          /* card border radius */
--radius-sm       /* small border radius */
--mic-color       /* mic label color */
--iem-color       /* IEM label color */
```

---

## Database Schema (all tables + migrations)

All schema creation is in `server/db.js`. Migrations are in a
`runMigrations()` IIFE at the bottom.

### Core Tables

**organizations** — single org per install
- id, name, slug, access_code, timezone (DEFAULT 'America/Chicago'),
  logo_url, address_street, address_city, address_state, address_zip

**users**
- id, org_id, name, email, password_hash, role ('admin'|'team_member')

**campuses** — locations/campuses within an org
- id, org_id, name, description

**service_types** — PCO or Manual service types
- id, campus_id, name, pco_service_type_id, created_at,
  mode TEXT NOT NULL DEFAULT 'pco'  ← 'pco' or 'manual'

**people**
- id, org_id, name, pco_person_id, photo_url, photo_url_portrait,
  photo_override, photo_override_portrait, name_override,
  email, email_override, category (JSON array), category_override,
  position, position_override

**photo_overrides** — legacy table, per-person photo override
- id, person_id, photo_url

**labels**
- id, org_id, name, type ('mic'|'iem'|'other'), group_name, sort_order

**automation_rules**
- id, org_id, priority, condition_field ('name'|'position'),
  condition_op ('is'|'contains'), condition_value,
  action_type ('mic'|'iem'|'slot'), action_value

**screens**
- id, org_id, name, token (unique), campus_id, share_code,
  mirror_screen_id, description, layout (DEFAULT 'grid-standard'),
  last_heartbeat

**templates**
- id, org_id, name, description, config (JSON string)

  Template config shape:
  ```json
  {
    "rows": [{ "cols": 3 }, { "cols": 2 }],
    "emptySlots": "hide",
    "autoMerge": false,
    "showTitle": true,
    "showLogo": false,
    "slots": {
      "1": { "mode": "full", "labelId": null, "linkedTo": null }
    }
  }
  ```
  Slot modes: `full` | `photo` (image only) | `name` (name only) | `label`
  (label only)
  `linkedTo`: when set on a "name" mode slot, CardGrid resolves musician
  from slot `linkedTo - 1`

**schedules**
- id, service_type_id, cron_expr, enabled (1|0), last_run,
  screen_ids (JSON array TEXT)

  Cron format: `M H * * DOW` (e.g. `0 8 * * 0` = Sunday at 8:00 AM)
  `screen_ids` stores a JSON array of screen IDs to update when schedule
  fires (e.g. `[1, 3]`)

**manual_assignments** — team members for a Manual service type
- id, service_type_id, person_id (FK → people), slot (integer order),
  position TEXT  ← the role for this person in this service (e.g. "Singer")

**position_types** — predefined position/role names for Manual service teams
- id, org_id, name, sort_order, created_at
- Examples: Singer, Speaker, Announcements, Worship Leader, etc.
- Used in ManualTeamBuilder person rows; automation rules match on these.

**active_assignments** — current displayed musicians per screen
- id, screen_id, person_id (nullable), person_name, person_photo,
  slot (0-based order), position, mic_label, iem_label,
  event_name, event_date, updated_at

**pco_tokens** — OAuth tokens (one row)
- id, access_token, refresh_token, expires_at

**settings** — key/value store
- key, value (includes 'setup_complete')

**invite_tokens** — team member invites
- id, org_id, token, role, email, used, expires_at

---

## Key Patterns & Conventions

### API helper (frontend)
```js
const API = import.meta.env.VITE_API_URL ?? ''
const api = (path, opts) =>
  fetch(API + '/api/admin' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  }).then(r => r.json())
```

### SCREENS_SELECT constant (admin.js)
Used for all screen queries — includes `is_active` via heartbeat check:
```js
const SCREENS_SELECT = `
  SELECT s.*,
    c.name  AS campus_name,
    m.name  AS mirror_screen_name,
    m.token AS mirror_screen_token,
    CASE WHEN s.last_heartbeat > datetime('now', '-90 seconds') THEN 1 ELSE
 0 END AS is_active
  FROM screens s
  LEFT JOIN campuses c ON s.campus_id = c.id
  LEFT JOIN screens  m ON s.mirror_screen_id = m.id
`
```

### Active screen detection
- `Display.jsx` fires `POST /api/display/:token/heartbeat` every 30s
- Server sets `last_heartbeat = datetime('now')`
- Screen is "active" if heartbeat within 90 seconds

### Display screen data flow
- `Display.jsx` polls `GET /api/display/:token` every 30s
- Response: `{ screen, org, event_name, event_date, template, musicians[] }`
- `musicians[]` maps to `active_assignments` rows
- Template config resolved from `templates` table when `layout` starts with
 `template:`

### Photo storage
- Square + portrait crops saved as WebP at `server/uploads/photos/`
- Served at `/uploads/photos/`
- `POST /api/admin/photos/upload` (multipart: `square` + `portrait` fields)

### Schedule pipeline (scheduler.js runSchedule)

**PCO mode** (`service_type.mode = 'pco'`):
1. Check PCO connected (pco_tokens table has a row)
2. Check service type has pco_service_type_id
3. Parse screen_ids from JSON, filter to only active screens (heartbeat <90s)
4. Get today's date in org's timezone (organizations.timezone)
5. Fetch PCO plans for service type, find one matching today's date
6. If no plan → log and return (no-op)
7. Fetch team members (`/plans/:id/team_members?include=person`)
8. Skip status='D' (declined) members
9. Run automation rules against each member's name + team_position_name
10. If no rule matches → skip person (instruments, tech crew, etc.)
11. Matched people: assign mic/IEM via resolveLabel, slot in order (0,1,2…)
12. Look up person in Beacon by pco_person_id → use name/photo overrides if found
13. Clear + re-insert active_assignments for each active target screen
14. Update last_run timestamp

**Manual mode** (`service_type.mode = 'manual'`):
1. Skip all PCO prerequisite checks
2. Parse screen_ids, filter to active screens
3. Load manual_assignments for this service type (JOIN people)
4. Run automation rules against each person's `position` field (same
   resolveLabel logic as PCO mode)
5. People with no matching rule are still included — they just get no labels
6. Clear + re-insert active_assignments for active target screens
7. Update last_run timestamp

---

## PCO API Reference

Base: `https://api.planningcenteronline.com`

| Purpose | Endpoint |
|---|---|
| List plans for service type | `GET /services/v2/service_types/:id/plans?per_page=15&order=sort_date` |
| Get team members for plan | `GET /services/v2/service_types/:id/plans/:id/team_members?per_page=100&include=person` |
| Team member attributes | `name`, `status` (C/U/D), `team_position_name`, `photo_thumbnail` |
| Team member PCO person ID | `relationships.person.data.id` |

Token refresh is automatic via `pco-client.js`. Use `pcoGet(path)` for all
PCO calls.

---

## Navigation (Admin Sidebar)

NAV_ITEMS in `_Layout.jsx`:
- Dashboard (`/admin`)
- Locations (`/admin/locations`)
- Templates (`/admin/templates`)
- People (`/admin/people`)
- Labels (`/admin/labels`)
- Automation (`/admin/automation`)
- Screens (`/admin/screens`)
- Services (`/admin/schedules`) ← renamed from "Schedules" in nav
- [separator]
- Organization (`/admin/organization`) — admin only
- Users (`/admin/users`) — admin only
- Integrations (`/admin/integrations`) — admin only

Mobile: sidebar collapses to hamburger menu (≤768px), slides in as fixed
overlay.

---

## Pending / In-Progress Work

### Backlog
- PCO OAuth connect flow (Integrations page) — PCO_CLIENT_ID/SECRET not yet
  configured
- Screen push UI from admin (push musicians to screen without going to
  Screens page)
- PCO plan → upcoming services display (Services card on Dashboard shows
  "coming soon")
- People page: PCO sync management UI

---

## Design Decisions / Conventions

- **No comments** unless the WHY is non-obvious
- **CSS Modules** for all component styles — never inline styles except for
  dynamic values
- **No better-sqlite3** — always `node:sqlite` built-in
- Template linkedTo dropdown shows "Row X · Col Y" (not "Slot N")
- `→N` linked indicator on template assign cells: `position: absolute;
  bottom: 1px; right: 2px`
- Schedule time picker: three dropdowns (Hour 1-12 / Min 00-55 / AM-PM) —
  NOT `<input type="time">`
- Schedule rows: show human-readable description only (e.g. "Sunday at 8:00
  AM"), NOT the raw cron expression
- Screen selector in ScheduleForm: `<details>`/`<summary>` dropdown showing
  "N screens selected" with a checkbox list inside — NOT a plain checkbox list
- Dashboard cards: max 4 items each, "+N more" row if there are more
- Active screen detection via heartbeat (90s window), shown as green pulsing
  TV icon dot
- MusicianCard full view: if no photo → show centered name only (no avatar
  placeholder)
- `event_name` in active_assignments = service type name (set by scheduler
  on push)
- Manual service mode: people are given a `position` text field per
  assignment; automation rules match on this same `position` field — the same
  rule system works for both PCO and Manual service types
- Position types (Labels → Positions section): predefined role names used as
  a `<select>` dropdown when adding people to a Manual service team. A
  person's existing position auto-fills when they are added to a team.
- Automation condition field renamed from "PCO Position" to "Position" —
  it matches both PCO `team_position_name` and Manual assignment `position`

---

## Environment Variables (server/.env)

```
PORT=3001
SESSION_SECRET=<long random string>
PCO_CLIENT_ID=<from PCO developer console>
PCO_CLIENT_SECRET=<from PCO developer console>
PCO_REDIRECT_URI=http://localhost:3001/auth/pco/callback
USE_MOCK_DATA=false
```

---

## Git

- Branch: `dev`
- Remote: `git@github.com:Kdubs6991/beacon.git`
- Push to `dev` branch after each significant feature group
