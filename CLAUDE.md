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
  logo_url, short_name, address_street, address_city, address_state, address_zip
- `short_name`: optional nickname shown in nav/display header instead of `name` when set

**users**
- id, org_id, name, email, password_hash, role ('admin'|'team_member'),
  dashboard_config TEXT (JSON array of `{id, visible}` — per-user card order/visibility)

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
- `POST /api/display/:token/leave` immediately sets `last_heartbeat = NULL` — called
  by the exit button so the screen picker shows it as inactive right away

### Display screen data flow
- `Display.jsx` polls `GET /api/display/:token` every 30s
- Response: `{ screen, org, event_name, event_date, template, musicians[] }`
- `org.name` in the response is resolved as `short_name || name` server-side
- `musicians[]` maps to `active_assignments` rows
- Template config resolved from `templates` table when `layout` starts with
 `template:`

### Display login / cookie flow
- `/display` with no URL token renders `CookieDisplay` (cookie-based flow)
- `?setup=1` param clears `beacon_screen` cookie and forces fresh screen selection
- Flow steps: `checking` → `org-auth` → `screen-pick` → (`screen-created`) → `display`
- `beacon_org` cookie stores `{ id, name, short_name, slug }` from `POST /api/display/auth/org`
- `beacon_screen` cookie stores the screen token
- Screen picker fetches `GET /api/display/auth/screens?org_id=X`
- New screens created via `POST /api/display/auth/screen/create`
- Exit button (top-right, fades in on cursor/touch/D-pad focus) calls leave endpoint
  then navigates to `/display?setup=1`

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

### Completed (recent)
- Manual screen push — "Push" button on each service type card; `PushModal`
  lets you select screens and push immediately without a schedule
- Current assignments modal on Screens page — "Current assignments" button
  above "Open display →", shows what's on each screen + "Clear screen"
- Template rendering fixes — `emptySlots: collapse` column/row hiding,
  `linkedTo` priority over `labelName`, `row.cols` vs `row.columns` fix
- Template slot mode switching — switching modes now clears irrelevant fields
  (`linkedTo` cleared when leaving name mode, `labelId` cleared when switching
  to photo or name mode)
- Docs page — auth-aware header (shows "Dashboard" when logged in); slot
  config, automation, and label routing docs updated for accuracy
- Seed script at `server/seed-test.js` (gitignored) — 8 people, 16 labels,
  full automation rules, Wednesday Night manual service, Worship Stage
  template, Stage Monitor screen
- Display template fill — `height: 100vh` on `.page`, `flex: 1` on
  `.templateGrid` so cards fill the full screen top-to-bottom
- Push modal pre-selection — selects schedule's screen_ids by default instead
  of all screens
- Label cell redesign — multi-label checkboxes (up to 3), centered layout,
  count-based font scaling, optional "show name" toggle
- Name cell auto-fit — `container-type: size` + `cqw` units so text scales
  with actual cell dimensions
- Display header — shows screen name instead of event_date under event title
- showTitle / showLogo template flags now actually gate header zones in Display.jsx
- Photo-mode cards: full-cell initials when no photo; position badge gradient
  overlay at bottom; always white text on overlay (dark gradient regardless of theme)
- Name-mode cards: position removed, just shows name
- Label-mode "show name": name · position on one line, same font size
- Full card adaptive layout: `container-type: size` + container queries —
  narrow (<190px) shrinks avatar/fonts; short (<140px) shows assignments side-by-side
- Display header padding/font reduced for more screen real estate
- Color themes: 7 presets (blue/green/purple/red/yellow/black/white) stored as
  `theme` in template config; applied as CSS variable overrides on `.page` in
  Display.jsx; each theme has tinted bg/header/cards and distinct mic vs IEM colors
- Position badge (`.position`) uses `color-mix(in srgb, var(--accent) 16%, transparent)`
  so it auto-matches the active theme
- Removed hover state from display cards (view-only screen)
- Dashboard 3-col grid fix — media query forces 2-col at 992–1327px to prevent
  lonely 4th card filling an entire row
- Dashboard customizable layout — per-user card order + visibility toggles;
  stored as JSON in `users.dashboard_config`; saved via `GET/PUT /api/auth/dashboard-config`
- Dashboard "Customize dashboard →" link scrolls to the Dashboard Layout section
  in Profile via hash (`/admin/profile#dashboard`) + `useEffect` scroll-to on mount
- Dashboard save button shows "✓ Saved" (green) inline on success; shows error
  text if the request fails
- Four new dashboard cards: Schedules (enabled schedules + last run),
  Templates (templates + screen counts), Quick Push (push a service immediately
  to its scheduled screens), Recent Activity (screens sorted by last assignment update)
- `describeCron(expr)` helper in Dashboard.jsx — parses `M H * * DOW` to
  "Sunday at 8:00 AM"
- `timeAgo(ts)` helper in Dashboard.jsx — timestamp → "Xm ago" / "Xh ago" / "Xd ago"
- Quick Push card shows inline result: "✓ N musicians pushed", "⚠ Pushed but no
  musicians found", or the specific error (e.g. "Planning Center not connected")
- Display setup flow — `CookieDisplay` with `?setup=1`, org auth → screen picker →
  create screen; screen picker shows existing screens with Live badges
- Screen-created step: "Open display on this screen" is the primary CTA (blue button);
  admin sign-in is secondary below a divider with QR code
- `POST /api/display/:token/leave` — clears heartbeat so screen shows inactive
  immediately in the screen picker after exit
- Exit button on display screens: fixed top-right (68px from top), fades in on
  `mousemove`/`touchstart`/`:focus`, fades out after 3s; calls leave then navigates
  to `?setup=1`
- `100dvh` height on `.page` in Display.jsx — fixes iOS Safari scroll on iPad
- PublicNav smart auth link: shows "Sign in" (→ `/login`) when `beacon_org` cookie
  exists, "Org login" (→ `/org`) otherwise; uses `short_name || name` for org button
- OrgLogin page now includes PublicNav (gives access to Docs and Display links)
- Org slug inputs convert spaces to hyphens on change; access code inputs force
  `.toUpperCase()` on change
- `copyToClipboard` in Organization.jsx falls back to `execCommand('copy')` for
  non-HTTPS contexts (fixes iPad/LAN network copy)
- Org `short_name` field in Organization settings — optional nickname shown in nav
  and display header instead of the full org name
- Vite `host: true` + CORS open in dev mode; network IP printed on server start

### Tablet / admin polish pass (tablet-dev branch)
- Touch-friendly CSS pass across all 12 admin CSS modules — `@media (hover: none) and (pointer: coarse)` blocks added to every page: larger tap targets (min 36px), bigger form inputs/selects, always-visible delete buttons
- Automation: touch drag/drop for rule reordering — `elementFromPoint` + `useRef` pattern, `touch-action: none` on `.ruleList` container (required for reliable touch drag; handle alone is insufficient)
- Automation: filter bar redesigned to People-page style single row — `filterHead` (Filters label + funnel icon), `filterGroup` containers with `filterPill`/`filterPillActive` buttons for Field (Name/Position) and Action (Mic/IEM), `filterClear`, non-matching rules dimmed (`opacity: 0.3`) instead of hidden so priority order stays visible
- Automation: Smart search input at far right of filter bar — WandIcon + "Smart search" label in `#a59cf5` purple, searches condition value + field + action description as you type; `matchesFilter()` checks `filterField`, `filterAction`, AND `search`
- Dashboard: touch drag/drop for card reorder in Profile → Dashboard Layout — `touch-action: none` on `.dashList` container (root cause: without this the browser treats finger movement as page scroll); `data-card-idx` on each `.dashRow`, `elementFromPoint` in `handleTouchDragMove`
- Users: Edit modal now includes Role `<select>` (disabled when editing yourself); `PUT /api/admin/users/:id` updated to accept optional `role` field with self-demotion guard + last-admin guard; table role column replaced with static `.roleBadge`/`.roleBadgeAdmin`/`.roleBadgeMember` display
- Users: search bar above table — filters by name or email, instant inline filter on `users.filter()`
- Labels: 2-column desktop layout at `@media (min-width: 860px)` — Mics + IEMs side by side, Positions full-width below (was previously landscape-tablet-only)
- Labels: "Add Label" button renamed to "Add Device Label"
- Screens: `shareCodeWrap` changed from column to `flex-direction: row; align-items: center; gap: 6px` so "screen code" label is inline with share code button (fixes uneven cardLinks row height)
- PublicNav: `useEffect` checks `GET /api/auth/me` on mount; shows "Dashboard" link when admin session exists instead of "Sign in"; no arrow on "Dashboard" link
- Admin `_Layout.jsx`: `{org.name}` → `{org.short_name || org.name}` in sidebar header — root cause of nickname not showing; `beacon_org` cookie stores both fields
- Docs + What's This InfoPopovers updated for all changes above

### Email / account features
- Integrations page → "coming soon" placeholder — removed all connect/status
  logic; shows yellow badge + feature list + pointer to manual mode
- Email/SMTP config in Organization settings — `EmailConfigSection` component;
  saves to `settings` table (no env file edits needed); password never returned
  to frontend (only `passSet: bool` + `passHint` last-4-chars); edit mode
  preserves existing pass if field submitted empty
- `GET /api/admin/email-config` + `PUT /api/admin/email-config` +
  `POST /api/admin/email-config/test` endpoints in admin.js
- Gmail App Password guide in Docs — `#email-setup` subsection; links from
  Organization SMTP section open in new tab and auto-scroll to that anchor
- Admin-triggered password reset email — `POST /api/admin/users/:id/send-reset-email`;
  shown in Users page edit modal; if SMTP not configured shows raw link instead
- Beacon-branded HTML email templates — `emailWrapper()` shared layout in
  `server/utils/mailer.js`; dark `#1e2433` header with Beacon wordmark,
  white card body, light gray footer; all inline styles + table layout for
  email client compatibility; preheader text for inbox previews
- ResetPassword.jsx two-button fix — `.footer` ("Back to sign in") was outside
  the `{done}` conditional; wrapped in `{!done && (...)}`
- `server/.env.example` updated with SMTP vars + comments

### Backlog
- PCO OAuth connect flow (Integrations page) — PCO_CLIENT_ID/SECRET not yet
  configured
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
- Dashboard cards: 8 total (Screens, Services, People, Labels, Schedules,
  Templates, Quick Push, Recent Activity); max 4–5 items each, "+N more" row
- Dashboard card order and visibility are per-user (`users.dashboard_config`);
  DEFAULT_CARDS constant in Dashboard.jsx defines the fallback order
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
- Display header center zone: shows `event_name` (service type name) on top,
  `screen.name` below it — NOT event_date
- Label-mode cards (`mode: 'label'`): centered layout, limited to 3 labels max,
  font scales with label count via `data-count` attribute + `cqw` container
  query units (`container-type: size` on the card wrapper)
- Name-mode cards (`mode: 'name'`): font size uses `clamp(0.65rem, 6cqw, 2.8rem)`
  so text auto-fits the cell regardless of column count; position NOT shown
- Photo-mode cards (`mode: 'photo'`): no photo → initials fill the full cell
  (`avatarInitialsFull`, `18cqw` font). Position badge overlays bottom of cell
  with dark gradient; overlay `.position` always uses white text.
- Full card (`mode: 'full'`): `container-type: size`; `@container (max-width:190px)`
  shrinks avatar to 40px; `@container (max-height:140px)` hides divider and
  puts mic/IEM rows side-by-side
- Color themes stored in template config as `theme: 'blue'|'green'|'purple'|
  'red'|'yellow'|'black'|'white'`. Applied as inline CSS custom property overrides
  on the `.page` div in DisplayView. `--bg-header` CSS variable (fallback dark
  blue) lets themes tint the sticky header bar.
- `showTitle` / `showLogo` in template config gate their respective header zones
  in Display.jsx — previously these were saved but never read
- Quick Push card uses the schedule's `screen_ids` for the target screens (same
  screens the automatic schedule would push to); falls back to all org screens
  if the service type has no enabled schedule
- `pushToScreens(serviceTypeId, screenIds)` in scheduler.js is the on-demand
  push function — no heartbeat filter (pushes to all provided screen IDs
  regardless of active status), unlike `runSchedule` which only targets active screens
- `GET /api/admin/dashboard` returns `schedules`, `templates`, and `serviceTypes`
  in addition to `screens`, `people`, `labels`
- `short_name` in organizations: optional; used as `short_name || name` in display
  header (resolved server-side) and nav button (resolved from `beacon_org` cookie)
- Access code inputs always call `.toUpperCase()` on change — `autoCapitalize="characters"`
  attribute alone is not reliable on all devices
- Display exit button: `position: fixed; top: 68px; right: 20px` (under header);
  `opacity: 0 / pointer-events: none` when hidden; shown on `mousemove`, `touchstart`,
  or `:focus`; hides after 3s (1.5s after blur)
- Touch drag pattern (Automation rules + Dashboard card reorder): `useRef` for drag
  state (avoids re-renders), `document.elementFromPoint(touch.clientX, touch.clientY)`
  to find drop target, `touch-action: none` on the CONTAINER element (not just the
  handle) — without it the browser intercepts touch movement as scroll before React
  can handle it
- Automation filter bar: single-row People-page style — `filterHead`/`filterGroup`/
  `filterPill`/`filterPillActive`/`filterClear` CSS classes; Smart search at far right
  via `margin-left: auto` on `.filterSearchWrap`; non-matching rules get
  `opacity: 0.3` (dimmed, not hidden) so priority order stays readable
- Labels page: `@media (min-width: 860px)` 2-column grid for Mics + IEMs side by
  side; `sections > div:last-child { grid-column: 1 / -1 }` pins Positions full-width
- Users page: role change lives in the Edit modal (disabled when editing self);
  table shows static role badge only; PUT `/api/admin/users/:id` conditionally
  includes role in UPDATE (prevents accidental role reset when editing name/email)
- SMTP config stored in `settings` table — `getSmtpConfig()` in `mailer.js`
  reads DB first, falls back to env vars; no transporter caching so changes
  take effect immediately without restart
- Email password never exposed to frontend — `GET /api/admin/email-config`
  returns `passSet: bool` + `passHint` (last 4 chars); `PUT` skips password
  update if the submitted field is blank
- `emailWrapper({preheader, headerLabel, body, footerText})` in `mailer.js` —
  shared layout for all emails; dark `#1e2433` header, white card body, gray
  footer; table-based with full inline styles for email client compatibility

---

## Environment Variables (server/.env)

```
PORT=3001
SESSION_SECRET=<long random string>

# SMTP email — optional, can also be configured in Admin → Organization
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourchurch@gmail.com
SMTP_PASS=
SMTP_FROM=

# Planning Center OAuth — fill in when PCO integration is ready
PCO_CLIENT_ID=<from PCO developer console>
PCO_CLIENT_SECRET=<from PCO developer console>
PCO_REDIRECT_URI=http://localhost:3001/api/auth/pco/callback
USE_MOCK_DATA=false
```

---

## Git

- Branch: `dev`
- Remote: `git@github.com:Kdubs6991/beacon.git`
- Push to `dev` branch after each significant feature group
