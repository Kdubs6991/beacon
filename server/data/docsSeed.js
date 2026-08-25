'use strict'

// Complete docs content migrated from the hardcoded Docs.jsx.
// Each block maps to { type, data } following the block schema.

const DOCS_SEED_BLOCKS = [
  // ── Overview ─────────────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Overview', id: 'overview' } },
  { type: 'paragraph', data: { html: 'Beacon is a self-hosted app that shows a TV/kiosk-friendly card grid of your worship team\'s microphone and IEM assignments for a service. Think of it as a digital version of the laminated assignment sheet your sound engineer normally posts backstage.' } },
  { type: 'paragraph', data: { html: 'You define your team roster directly in Beacon using <strong>Manual service types</strong>, or connect to <strong>Planning Center Online</strong> (PCO) to pull team assignments directly from your existing plans. Either way, automation rules assign mic and IEM labels automatically, and a schedule pushes everything to your screens before you even arrive.' } },
  { type: 'paragraph', data: { html: 'The server runs anywhere Node.js runs — a laptop, a Raspberry Pi, a VPS. Any browser on any device can reach the display screens. For public access without port forwarding, run it behind a <strong>Cloudflare Tunnel</strong>.' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── First Run / Setup ────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'First Run / Setup', id: 'first-run' } },
  { type: 'paragraph', data: { html: 'On a fresh install, visiting any page in the app will automatically redirect you to <code>/setup</code>. This one-time setup wizard walks you through:' } },
  { type: 'list', data: { ordered: true, items: [
    '<strong>Create your organization</strong> — set your organization name and slug. The slug is used in display screen login URLs and cannot be easily changed later.',
    '<strong>Create the first admin account</strong> — this account will have full access to Studio. Additional accounts can be invited after setup completes.',
  ] } },
  { type: 'paragraph', data: { html: 'Once the wizard is complete you\'ll be logged in automatically and taken to the Studio dashboard. The <code>/setup</code> route is disabled after this point — revisiting it redirects to the dashboard.' } },
  { type: 'callout', data: { variant: 'warning', html: 'Complete the setup wizard before pointing any display screens at the app. Screens that load before an organization exists will show an error.' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── Getting Started ──────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Getting Started', id: 'getting-started' } },
  { type: 'paragraph', data: { html: 'The recommended setup order:' } },
  { type: 'list', data: { ordered: true, items: [
    '<strong>Create a Location</strong> — a campus or venue. Everything else belongs to a location.',
    '<strong>Add Service Types</strong> on the Services page — choose <strong>Manual mode</strong> to define a fixed team roster in Beacon, or <strong>PCO mode</strong> to pull your team from Planning Center Online.',
    '<strong>Create Screens</strong> — each screen gets a permanent URL you point a TV or kiosk browser at.',
    '<strong>Add People</strong> — add team members manually, or use <strong>Import from PCO</strong> on the People page to pull them in from Planning Center.',
    '<strong>Define Labels</strong> — your mic and IEM inventory (e.g. "Vox 1", "Keys DI", "IEM 3"). Also define <strong>Positions</strong> (e.g. Singer, Worship Leader) on the Labels page — these are the role names your automation rules and Manual teams use.',
    '<strong>Set up Automation Rules</strong> — write rules that tell Beacon how to assign mic and IEM labels based on a person\'s name or position.',
    '<strong>Set a Schedule</strong> — on the Services page, add a schedule to each service type. Pick a day and time and Beacon will auto-push assignments to your screens before you even arrive.',
  ] } },
  { type: 'callout', data: { variant: 'info', html: 'To change between <strong>light and dark mode</strong>, click your name in the bottom-left corner of the sidebar to open <strong>Settings → Appearance</strong>. Your preference is saved in the browser and persists across sessions.' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── Dashboard ────────────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Dashboard', id: 'dashboard' } },
  { type: 'paragraph', data: { html: 'The <strong>Dashboard</strong> is the first page you see after logging in. It gives you a quick at-a-glance view of your system without requiring you to navigate to individual pages.' } },
  { type: 'paragraph', data: { html: 'It is organized into <strong>eight cards</strong> — each card represents one area of the app. Clicking a card\'s title bar takes you directly to that page\'s full management view. You can hide cards or rearrange their order per-user from <strong>Settings → Profile → Dashboard Layout</strong>, or by clicking <strong>Customize dashboard →</strong> in the top right of the Dashboard page. Drag to reorder works on both mouse and touch/tablet.' } },

  { type: 'heading', data: { level: 2, text: 'Screens Card', id: 'dashboard-screens' } },
  { type: 'paragraph', data: { html: 'Shows all screens in your organization, with a <strong>Live</strong> badge and a pulsing green dot for any screen that is currently open in a browser. The <strong>live detection</strong> works via a heartbeat: whenever a display screen is open, it silently pings the server every 30 seconds. If a screen hasn\'t pinged in the last 90 seconds it is considered inactive.' } },
  { type: 'paragraph', data: { html: 'Each screen row also shows its <strong>location</strong> (campus) and the current service name and musician count, so you can tell at a glance what\'s showing where.' } },
  { type: 'paragraph', data: { html: 'The active/inactive status also appears as a filter on the <a href="/docs#screens">Screens</a> management page — use it to quickly isolate which displays are currently running.' } },

  { type: 'heading', data: { level: 2, text: 'Services Card', id: 'dashboard-services' } },
  { type: 'paragraph', data: { html: 'Shows what\'s currently pushed to your display screens, with a toggle between two views:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Manual</strong> — lists every screen that currently has musicians assigned to it. Shows the service name, date, screen name, and musician count. This is the live state of your displays right now.',
    '<strong>PCO</strong> — shows screens that currently have PCO-sourced assignments, along with the plan name and team count. If your PCO account isn\'t connected yet, this tab shows a "not connected" notice. See <a href="/docs#pco-integration">Planning Center OAuth</a> for connection instructions.',
  ] } },

  { type: 'heading', data: { level: 2, text: 'People Card', id: 'dashboard-people' } },
  { type: 'paragraph', data: { html: 'Shows a preview of your worship team roster, with a Manual/PCO toggle:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Manual</strong> — shows the first few people in your roster with their name, photo initials, and position. The summary chip shows total count and how many came from PCO.',
    '<strong>PCO</strong> — when PCO is connected, shows the breakdown of PCO-synced vs. manually added people.',
  ] } },

  { type: 'heading', data: { level: 2, text: 'Labels Card', id: 'dashboard-labels' } },
  { type: 'paragraph', data: { html: 'Shows a summary of your audio equipment inventory — the total count of mic labels and IEM labels you\'ve defined, plus how many position types you have. The list previews the first few labels with their type badge (Mic, IEM, or Position) and group name if they belong to one.' } },
  { type: 'paragraph', data: { html: 'If you haven\'t added any labels yet, this card prompts you to head to the Labels page to build out your inventory. See <a href="/docs#labels">Labels</a> for full details on how mic/IEM labels work with automation.' } },

  { type: 'heading', data: { level: 2, text: 'Schedules Card', id: 'dashboard-schedules' } },
  { type: 'paragraph', data: { html: 'Lists your auto-push schedules and their current status. Each row shows the service type name, when it\'s scheduled to fire (e.g. "Sunday at 8:00 AM"), and how long ago it last ran. A green <strong>On</strong> badge marks active schedules; gray <strong>Off</strong> marks disabled ones.' } },
  { type: 'paragraph', data: { html: 'The summary chip at the top shows how many schedules are currently enabled out of your total. If no schedules are configured, the card prompts you to go to the Services page to set one up.' } },

  { type: 'heading', data: { level: 2, text: 'Templates Card', id: 'dashboard-templates' } },
  { type: 'paragraph', data: { html: 'Lists your custom display templates and how many screens are currently using each one. If a template shows 0 screens, it\'s been created but hasn\'t been assigned to any screen yet.' } },
  { type: 'paragraph', data: { html: 'The summary chip shows the total template count and how many screens across your org are using a custom template (vs. a preset layout). Click the card header to go to the Templates management page.' } },

  { type: 'heading', data: { level: 2, text: 'Quick Push Card', id: 'dashboard-quickpush' } },
  { type: 'paragraph', data: { html: 'Lets you immediately push a service\'s team to its screens without waiting for the auto-push schedule to fire. Every service type in your org gets its own <strong>Push</strong> button.' } },
  { type: 'paragraph', data: { html: 'When you hit Push:' } },
  { type: 'list', data: { ordered: true, items: [
    'For <strong>PCO service types</strong> — Beacon fetches the team from the matching Planning Center plan.',
    'For <strong>Manual service types</strong> — Beacon loads the prebuilt team roster you defined.',
    'Automation rules run to assign mic and IEM labels.',
    'Assignments are sent to the screens configured in that service\'s schedule. If no schedule exists, it pushes to all screens.',
  ] } },
  { type: 'paragraph', data: { html: 'The result shows inline: <em>"✓ N people pushed"</em>, a warning if no people were found, or an error message (e.g., if PCO isn\'t connected). This is the fastest way to update displays when your roster changes mid-week or you want to test without setting up a schedule.' } },

  { type: 'heading', data: { level: 2, text: 'Recent Activity Card', id: 'dashboard-activity' } },
  { type: 'paragraph', data: { html: 'Shows which screens were most recently updated, sorted newest first. The time shown (e.g. <em>"3m ago"</em>, <em>"2h ago"</em>, <em>"1d ago"</em>) reflects when musicians were last pushed to that screen.' } },
  { type: 'paragraph', data: { html: 'Useful for a quick sanity check — you can see at a glance which screens have been refreshed today and which are still showing an older push. Click the card header to go to the Screens management page.' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── Organization ─────────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Organization', id: 'organization' } },
  { type: 'paragraph', data: { html: 'The <strong>Organization</strong> page (Studio → Organization) holds your top-level settings. A single Beacon installation can support multiple independent organizations — each with their own users, screens, and settings. The <strong>org slug</strong> is a short URL-safe identifier for your organization (e.g. <code>first-church</code>) and is embedded in display screen login URLs.' } },
  { type: 'paragraph', data: { html: 'You can also set your organization\'s <strong>timezone</strong> here. This ensures that schedule next-run times and other time-sensitive information display correctly for your location rather than defaulting to the server\'s system clock.' } },

  { type: 'heading', data: { level: 2, text: 'Display Login', id: 'display-login' } },
  { type: 'paragraph', data: { html: 'Display screens authenticate using two pieces of information:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Org code</strong> — your organization\'s slug (e.g. <code>first-church</code>). Spaces are not allowed — hyphens are used instead.',
    '<strong>Access code</strong> — a short uppercase alphanumeric code shown on the Organization page. Shared across all screens at your org.',
  ] } },
  { type: 'paragraph', data: { html: '<strong>How the setup flow works:</strong>' } },
  { type: 'list', data: { ordered: true, items: [
    'Open <code>/display</code> (or <code>/display?setup=1</code> to re-run setup) on the TV or kiosk browser.',
    'Enter your org code and access code to authenticate your organization.',
    'Choose an existing screen from the list, or create a new one by typing a name.',
    'The display loads immediately and stores both credentials as cookies for 1 year — no re-login needed even after the browser restarts.',
  ] } },
  { type: 'paragraph', data: { html: 'Once a screen is created, go to Studio to assign it a template and include it in a push schedule.' } },
  { type: 'paragraph', data: { html: 'To exit a display and return to the screen picker (e.g. to switch screens), move the mouse or touch the screen — an <strong>Exit display</strong> button will appear in the top-right corner.' } },
  { type: 'paragraph', data: { html: 'The <strong>access code</strong> is shown on the Organization page. You can <strong>regenerate</strong> it at any time, but note that doing so will immediately invalidate the existing cookie on every screen — all displays will be redirected to the login page and will need to re-enter the new code.' } },
  { type: 'callout', data: { variant: 'warning', html: 'Regenerate the access code only when necessary (e.g. if it was shared with someone who should no longer have access). You\'ll need to re-authenticate every display screen afterward.' } },

  { type: 'heading', data: { level: 2, text: 'Scan-to-Login QR', id: 'qr-code' } },
  { type: 'paragraph', data: { html: 'The org login page (<code>/org</code>) and the display screen picker both show a <strong>QR code</strong>. A staff member can scan this code with their phone to complete the display setup remotely — no keyboard needed on the TV itself.' } },
  { type: 'paragraph', data: { html: '<strong>How the remote QR flow works:</strong>' } },
  { type: 'list', data: { ordered: true, items: [
    'Open <code>/org</code> or the screen picker on the TV browser — a QR code appears automatically.',
    'Scan the QR code with your phone — it opens a mobile setup page.',
    'Enter the org code, access code, and choose or create a screen name on your phone.',
    'The TV detects the completed setup and transitions to the display immediately — no interaction on the TV required.',
  ] } },
  { type: 'paragraph', data: { html: 'The QR code expires after 10 minutes. Refreshing the page generates a new one.' } },
  { type: 'paragraph', data: { html: 'After creating a new screen, a separate QR code appears that links directly to <strong>Studio</strong> — scan it from any device to sign in and configure the screen\'s template and schedule.' } },
  { type: 'callout', data: { variant: 'info', html: 'You can also enter the org code and access code manually on any device by navigating to <code>/display?setup=1</code>.' } },

  { type: 'heading', data: { level: 2, text: 'Short Name / Nickname', id: 'short-name' } },
  { type: 'paragraph', data: { html: 'If your organization\'s full name is long, you can set a <strong>short name</strong> under Organization → Organization Profile. This nickname appears in:' } },
  { type: 'list', data: { ordered: false, items: [
    'The navigation bar sign-out button',
    'The display screen header alongside your logo',
    'The screen picker during display setup',
  ] } },
  { type: 'paragraph', data: { html: 'Leave it blank and your full organization name is used everywhere. The full name is always used on the Organization settings page itself.' } },

  { type: 'heading', data: { level: 2, text: 'Backup & Restore', id: 'backup-export' } },
  { type: 'paragraph', data: { html: 'The Organization page has a <strong>Download Backup</strong> button that exports your entire org configuration as a JSON file. The backup includes:' } },
  { type: 'list', data: { ordered: false, items: [
    'Organization profile (name, timezone, address, logo URL)',
    'Campuses and service types',
    'People and all photo/name/category overrides',
    'Labels, label groups, and position types',
    'Automation rules',
    'Templates (including full slot configuration)',
    'Screens (including layout, share code, and mirror relationships)',
    'Schedules (cron expression, enabled state, target screen list)',
    'Manual service team rosters',
  ] } },
  { type: 'paragraph', data: { html: '<strong>What\'s not included:</strong> user accounts, PCO OAuth tokens, and the org access code. These are install-specific and are not touched by a restore.' } },
  { type: 'paragraph', data: { html: '<strong>Restoring a backup</strong> — below the download button, use <strong>Choose backup file…</strong> to upload a <code>.json</code> backup. The app parses the file and shows you a preview (org name, backup date, entity counts) before anything changes. Click <strong>Restore backup</strong> to confirm. The restore:' } },
  { type: 'list', data: { ordered: false, items: [
    'Replaces all current org data (campuses, people, labels, screens, templates, rules, schedules, etc.) with the contents of the backup.',
    'Remaps all internal IDs automatically — automation rules, template slot configs, schedule screen lists, and mirror relationships are all updated to the new IDs.',
    'Runs in a single database transaction — if anything fails, nothing changes.',
  ] } },
  { type: 'callout', data: { variant: 'warning', html: 'Restoring is <strong>destructive and immediate</strong> — it permanently replaces all current org data. Download a fresh backup of your current state first if you may want to go back.' } },
  { type: 'callout', data: { variant: 'info', html: 'Photo files are not included in the backup — only the URLs are stored. On the hosted version, photos live on Cloudinary and their URLs remain valid after a restore with no extra steps. On a self-hosted install using local disk storage, photos are stored on the server and will still work after a restore to the same server, but will need to be re-uploaded if you move to a new machine.' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── Locations ────────────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Locations', id: 'locations' } },
  { type: 'paragraph', data: { html: 'The Locations page is where you define your campuses — the physical venues your church operates at. Everything else (service types, screens) is organized under a campus.' } },

  { type: 'heading', data: { level: 2, text: 'Campuses', id: 'campuses' } },
  { type: 'paragraph', data: { html: 'A <strong>campus</strong> represents a physical venue — your main building, a satellite campus, a rented school gym, etc. Campuses group your service types and display screens so everything stays organized when you have more than one site.' } },
  { type: 'paragraph', data: { html: 'Each campus just needs a name. The description is optional but handy for your team ("North building, sanctuary A/V booth").' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── Services ─────────────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Services', id: 'services' } },
  { type: 'paragraph', data: { html: 'The <strong>Services</strong> page is where you set up recurring service types (Sunday Morning, Wednesday Night, etc.) and the schedules that automatically push team assignments to your screens.' } },

  { type: 'heading', data: { level: 2, text: 'Service Types', id: 'service-types' } },
  { type: 'paragraph', data: { html: 'A <strong>service type</strong> is a recurring kind of service at a campus. Each service type has a <strong>mode</strong> that determines where its team roster comes from:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Manual</strong> — you define a fixed team roster in the app. Add your people, assign positions, and let Beacon handle assignments automatically via your automation rules.',
    '<strong>PCO</strong> — Planning Center Online sync. When your PCO account is connected, Beacon pulls the team roster from the matching plan automatically.',
  ] } },
  { type: 'paragraph', data: { html: 'The mode badge on each service type card shows which mode is active. You can use both modes in the same organization — some service types can be PCO-synced while others are manual.' } },

  { type: 'heading', data: { level: 2, text: 'PCO Mode', id: 'service-pco-mode' } },
  { type: 'paragraph', data: { html: 'PCO mode pulls the team roster for a specific Planning Center service type. When a schedule fires (or you press Push), Beacon finds the plan matching today\'s date, fetches the confirmed team members, runs your automation rules to assign mic and IEM labels, and pushes to your screens.' } },
  { type: 'paragraph', data: { html: '<strong>Setting up a PCO service type:</strong>' } },
  { type: 'list', data: { ordered: true, items: [
    'Go to Studio → Integrations and connect your Planning Center account.',
    'On the Services page, click <em>New service type</em> and choose <strong>PCO Sync</strong>.',
    'Pick your service from the list of Planning Center services — Beacon will fetch them automatically. Or enter the PCO service type ID manually (see below).',
    'Add a schedule and pick your screens.',
  ] } },

  { type: 'heading', data: { level: 3, text: 'Finding your PCO service type ID', id: 'pco-service-id' } },
  { type: 'paragraph', data: { html: 'If you prefer to enter the PCO service type ID manually, here\'s how to find it:' } },
  { type: 'list', data: { ordered: true, items: [
    'Log in to Planning Center at <strong>services.planningcenteronline.com</strong>.',
    'Click on any service type (e.g. "Sunday Morning Worship").',
    'Look at the URL — it will look like: <code>services.planningcenteronline.com/service_types/<strong>123456</strong>/plans</code>',
    'The number after <code>/service_types/</code> is the PCO service type ID. Copy and paste that number into Beacon.',
  ] } },

  { type: 'paragraph', data: { html: '<strong>PCO push behavior:</strong> The Push button shows a plan picker — you can push today\'s plan or choose any upcoming plan by date. Schedules always fire on today\'s plan automatically.' } },
  { type: 'paragraph', data: { html: 'Team members with a "Declined" status in PCO are skipped. Confirmed and Unconfirmed members are both included.' } },
  { type: 'callout', data: { variant: 'info', html: 'PCO people are matched to Beacon people by their PCO person ID. If a team member is in your Beacon roster (imported via Import from PCO on the People page), their Beacon photo and name overrides are used instead of the PCO photo. If they\'re not yet in Beacon, their PCO name and thumbnail photo are used directly.' } },

  { type: 'heading', data: { level: 2, text: 'Manual Mode', id: 'service-manual-mode' } },
  { type: 'paragraph', data: { html: 'In Manual mode, you define a fixed team for this service type directly in the app. The team is set on the service type\'s detail card on the Services page.' } },
  { type: 'paragraph', data: { html: '<strong>How it works:</strong>' } },
  { type: 'list', data: { ordered: true, items: [
    'Add people from your roster to the team. Pick the person, then choose their <strong>position</strong> for this service (e.g. Singer, Speaker, Worship Leader).',
    'When a schedule fires, Beacon runs your <strong>automation rules</strong> against each person\'s position to assign their mic and IEM — the same rule system that PCO mode uses.',
    'Assignments are pushed to your target screens.',
  ] } },
  { type: 'paragraph', data: { html: 'Positions are defined on the <a href="/docs#labels-positions">Labels → Positions</a> page. Add all the roles your team uses there first, then they\'ll appear as options when building a manual team.' } },
  { type: 'callout', data: { variant: 'info', html: 'Manual mode is a great choice if you have a consistent core team each week and don\'t need Planning Center to drive your display. Set it up once and let the schedule handle the rest.' } },

  { type: 'heading', data: { level: 2, text: 'Auto-Refresh Schedules', id: 'service-schedules' } },
  { type: 'paragraph', data: { html: 'Each service type can have one or more <strong>schedules</strong>. Each schedule fires a cron job at a day and time you choose and pushes the team assignments to your selected screens automatically.' } },
  { type: 'paragraph', data: { html: '<strong>How to set one up:</strong> Click <em>Add Schedule</em> on a service type card, pick a day of the week and time, choose which screens should receive the update, and optionally override the timezone for that schedule.' } },
  { type: 'paragraph', data: { html: 'When the schedule fires:' } },
  { type: 'list', data: { ordered: true, items: [
    'For <strong>Manual</strong> service types — Beacon loads the team from your saved roster. For <strong>PCO</strong> service types — Beacon fetches today\'s confirmed team from Planning Center.',
    'Runs automation rules to assign mic and IEM labels.',
    'Pushes assignments to all selected screens that are currently live (heartbeat within 90 seconds).',
  ] } },
  { type: 'paragraph', data: { html: '<strong>Example:</strong> Saturday at 6:00 PM — loads Sunday\'s team so displays are ready before anyone arrives.' } },
  { type: 'paragraph', data: { html: 'You can trigger a schedule manually any time by clicking <strong>Run now</strong> — useful for testing or mid-week changes.' } },
  { type: 'callout', data: { variant: 'info', html: 'Schedules only push to <strong>live screens</strong> — screens that are currently open in a browser (heartbeat within 90 seconds). If none of the target screens are live when the schedule fires, the push is skipped entirely. To ensure a screen gets the latest assignments, keep it open in a browser or use the <strong>Run now</strong> button after the screen is live.' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── Templates ────────────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Templates', id: 'templates' } },
  { type: 'paragraph', data: { html: 'Templates let you define a <strong>custom grid layout</strong> for a display screen — how many rows, how many slots per row, what each individual slot shows, and what happens when fewer people are assigned than the template has space for.' } },
  { type: 'paragraph', data: { html: 'Templates are more powerful than preset layouts because you control exact grid dimensions, per-row heights, per-slot label assignments, and how each cell displays its content. Once created, select a template when setting up a screen.' } },
  { type: 'paragraph', data: { html: 'The Templates page supports both <strong>list view</strong> and <strong>grid view</strong> (toggle top-right). Grid view shows a TV-ratio preview of each template so you can see the layout at a glance.' } },

  { type: 'heading', data: { level: 2, text: 'Grid Layout', id: 'template-layout' } },
  { type: 'paragraph', data: { html: 'Each template is built from <strong>rows</strong>, and each row has its own settings:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Rows</strong> — 1 to 5 rows, stacked vertically on the display.',
    '<strong>Columns</strong> — 1 to 8 columns per row. Each column is one person-card slot.',
    '<strong>Height</strong> — Controls how much vertical space that row gets relative to the others. Options are <em>Tiny</em>, <em>Compact</em>, <em>Standard</em>, and <em>Tall</em>. A Tall row takes 6× the space of a Tiny row. The layout preview updates live as you change heights.',
    '<strong>Section label</strong> — Optional text identifying the row (e.g., "Vocals", "Band", "Tech"). Type a label, then click <em>Show on screen</em> to make it visible on the display. Leave the toggle off to use the label only for your reference inside the editor.',
  ] } },
  { type: 'paragraph', data: { html: 'Slots are numbered left-to-right, top-to-bottom starting at 1. The proportional preview in the editor reflects your exact row heights so you can see how the grid will look on a TV before saving.' } },

  { type: 'heading', data: { level: 2, text: 'Slot Configuration', id: 'template-slots' } },
  { type: 'paragraph', data: { html: 'Each slot in the grid can be individually configured. In the template editor, the <strong>Slot configuration</strong> section shows a clickable grid — click any cell to open its settings panel.' } },
  { type: 'paragraph', data: { html: '<strong>Display mode</strong> — controls what content this slot shows on the live display:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Full card</strong> — photo (if uploaded), name, position, and both mic and IEM labels.',
    '<strong>Image only</strong> — shows just the person\'s headshot, filling the cell. No text at all.',
    '<strong>Name only</strong> — shows name and position. No photo, no labels. Can optionally link to another slot (see below).',
    '<strong>Label only</strong> — shows name, position, and mic/IEM labels. No photo. Good for compact rows where photos would be too small.',
  ] } },
  { type: 'paragraph', data: { html: '<strong>Label pin</strong> (available on Full card and Label only modes) — pin this slot to a specific mic or IEM label. When set, the slot searches for whichever team member has been assigned that label by an automation rule, and displays them here. If nobody has been assigned that label this week, the slot is empty.' } },
  { type: 'callout', data: { variant: 'warning', html: 'The label pin is a <em>search filter</em>, not a display override. It finds the person who <em>already has</em> that label assigned via automation. It does not add a label to someone\'s card. If your automation rules haven\'t assigned that label to anyone, the slot stays blank.' } },
  { type: 'paragraph', data: { html: '<strong>Link to slot</strong> (available on Name only mode) — pull a different slot\'s person into this cell instead of the slot\'s own position in the roster. For example: Row 1 shows photos, Row 2 has Name only cells each linked back to the matching Row 1 cell — same people, different display style stacked on top of each other.' } },
  { type: 'paragraph', data: { html: 'Configured slots show their label and mode at a glance in the cell. Use <em>Clear</em> in the panel to remove all settings from a slot. Click a configured cell again to close the panel.' } },

  { type: 'heading', data: { level: 2, text: 'Empty Slot Behavior', id: 'template-empty' } },
  { type: 'paragraph', data: { html: 'Controls what happens when fewer people are assigned than the template has slots for. For example: your template has 4 slots but only 3 singers are scheduled this week.' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Reserve slots</strong> — The unfilled slot stays on screen as a visible empty placeholder. The grid keeps its exact shape. Good for fixed setups where a position always means something (e.g., Slot 4 is always the pastor\'s lapel mic, whether or not they\'re on the plan this week).',
    '<strong>Collapse slots</strong> — The unfilled slot disappears and the remaining cards fill in. Good for variable team sizes where you only want to show who\'s actually assigned.',
  ] } },
  { type: 'callout', data: { variant: 'info', html: 'This setting only affects how the display renders — not your underlying assignment data. You can change it at any time.' } },

  { type: 'heading', data: { level: 2, text: 'Display Options', id: 'template-options' } },
  { type: 'paragraph', data: { html: 'Each template has options that control how the display screen looks when this template is active:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Auto-merge same person</strong> — If the same person appears in vertically adjacent slots, their cards merge into one taller card. Useful when a worship leader holds multiple adjacent slots.',
    '<strong>Show service title</strong> — Displays the event name in the center of the header bar.',
    '<strong>Show organization logo</strong> — Displays your org logo and name on the left side of the header bar.',
    '<strong>Color theme</strong> — Choose an accent color applied across the entire display screen: Blue (default), Green, Purple, Red, Yellow, Black, or White. The background, cards, header, mic labels, and IEM labels all shift to match the chosen theme. White switches the screen to a light mode layout.',
  ] } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── Screens ──────────────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Screens', id: 'screens' } },
  { type: 'paragraph', data: { html: 'A <strong>screen</strong> represents a single display — a TV backstage, a monitor at the front of house, a tablet at the door. Each screen gets a permanent URL that you load in a browser (or kiosk-mode browser) and never have to change.' } },
  { type: 'paragraph', data: { html: 'Use the <strong>filter bar</strong> at the top of the Screens page to narrow the list by location, screen type (independent vs. mirror), or <strong>status</strong>. A screen shows <strong>Live</strong> (with a pulsing green dot) when it is currently open in a browser and has sent a heartbeat within the last 90 seconds — the same signal shown on the <a href="/docs#dashboard">Dashboard</a>. Each card also shows a preview of what\'s currently assigned to that screen.' } },

  { type: 'heading', data: { level: 2, text: 'Display URL', id: 'display-url' } },
  { type: 'paragraph', data: { html: 'Every screen gets a unique URL like:' } },
  { type: 'code', data: { text: 'http://your-domain.com/display/a1b2c3d4e5f6a7b8' } },
  { type: 'paragraph', data: { html: 'Point any browser at this URL and it will show the card grid for that screen, auto-refreshing every 30 seconds to pick up new assignments. The URL is permanent — it doesn\'t change when you update assignments or rename the screen.' } },
  { type: 'paragraph', data: { html: 'For a TV, use your browser\'s kiosk/fullscreen mode. On Chrome: <code>--kiosk</code> flag. On a Raspberry Pi you can set Chromium to auto-launch in kiosk mode at startup.' } },

  { type: 'heading', data: { level: 2, text: 'Share Code', id: 'share-code' } },
  { type: 'paragraph', data: { html: 'Each screen has a short <strong>share code</strong> (like <code>ABC123</code>). Team members can use this code to push assignments to a screen without needing admin login. This is useful for a worship leader who wants to update mic assignments from their phone before service.' } },
  { type: 'paragraph', data: { html: 'Share codes are case-insensitive and can be regenerated if needed.' } },

  { type: 'heading', data: { level: 2, text: 'Mirror Mode', id: 'mirror' } },
  { type: 'paragraph', data: { html: 'A screen can be set to <strong>mirror</strong> another screen at the same location. A mirroring screen shows exactly the same assignments as its source — it has no assignments of its own.' } },
  { type: 'paragraph', data: { html: '<strong>When is this useful?</strong> If you have two TVs in the same room — say a main backstage monitor and an overflow monitor — you can have both show the same content by pointing one at the other. You only push assignments once, and both update automatically.' } },
  { type: 'callout', data: { variant: 'info', html: 'Mirrors are one level deep. You can\'t mirror a screen that is itself already mirroring another screen.' } },

  { type: 'heading', data: { level: 2, text: 'Layout', id: 'screen-layout' } },
  { type: 'paragraph', data: { html: 'Each screen has a <strong>layout</strong> that controls how the musician cards are arranged on the display. Choose a layout when creating or editing a screen. Available presets:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Standard Grid</strong> — 5 portrait cards per row. Works for most team sizes.',
    '<strong>Compact Grid</strong> — 7 thinner cards per row. Fits larger teams on one screen.',
    '<strong>Large Cards</strong> — 3 wider cards per row. Best for smaller teams or high-visibility screens.',
    '<strong>List</strong> — Single-column stacked rows. Best when you want each person to have maximum screen space.',
  ] } },
  { type: 'paragraph', data: { html: 'If you\'ve created <strong>custom templates</strong> on the Templates page, they appear in the layout picker below the presets. Custom templates give you full control over slot positions, per-slot label defaults, and per-slot display modes. See the <a href="/docs#templates">Templates</a> section for details.' } },

  { type: 'heading', data: { level: 2, text: 'Display Header', id: 'screen-header' } },
  { type: 'paragraph', data: { html: 'Every display screen shows a header bar at the top with three zones:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Left</strong> — your organization\'s logo (if uploaded) and name. Upload a logo on the <strong>Organization</strong> page.',
    '<strong>Center</strong> — the service/event name and the screen\'s name from the active assignments.',
    '<strong>Right</strong> — a live clock that updates every second.',
  ] } },
  { type: 'paragraph', data: { html: 'If no logo is uploaded, only the org name appears on the left. Upload a logo at <strong>Studio → Organization → Organization Logo</strong>.' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── People ───────────────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'People', id: 'people' } },
  { type: 'paragraph', data: { html: 'The People page is where your worship team roster lives. Add team members manually or import them from Planning Center Online. Each person can have a custom photo, position, and one or more categories.' } },

  { type: 'heading', data: { level: 2, text: 'Grid & List Views', id: 'people-views' } },
  { type: 'paragraph', data: { html: 'Use the <strong>view toggle</strong> (top-right of the toolbar) to switch between:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Grid view</strong> — card-based layout with a square photo at the top. Click any card to open a detail popup with full info and quick Edit/Delete actions.',
    '<strong>List view</strong> — compact table rows with name, position, category, and PCO ID. Edit and Delete appear as inline buttons at the end of each row. Use the <strong>checkboxes</strong> on the left to select multiple people — a bulk action bar appears at the bottom letting you delete selected people or update their category and position in one step.',
  ] } },
  { type: 'paragraph', data: { html: 'Your preferred view is saved in the browser and restored on your next visit.' } },

  { type: 'heading', data: { level: 2, text: 'Photos & Crop', id: 'people-photos' } },
  { type: 'paragraph', data: { html: 'Every person can have a custom photo uploaded directly in Beacon.' } },
  { type: 'paragraph', data: { html: '<strong>How the upload works:</strong>' } },
  { type: 'list', data: { ordered: true, items: [
    'Click <strong>Upload Photo</strong> on the person\'s edit form.',
    'Drop or select an image (up to 15 MB, any common image format).',
    'A crop editor appears with a <strong>portrait frame (3:4)</strong> as the primary crop and a <strong>dashed square overlay (1:1)</strong> showing the secondary crop simultaneously.',
    'Drag and zoom to frame both crops at once, then click <strong>Crop &amp; Save</strong>.',
  ] } },
  { type: 'paragraph', data: { html: 'Two versions are saved and used in different places:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Portrait (3:4)</strong> — used on the TV display card where the full card height is available.',
    '<strong>Square (1:1)</strong> — used in the admin People grid and list view.',
  ] } },
  { type: 'callout', data: { variant: 'info', html: 'Both crops are extracted from the same upload — you only upload once and see both frames at the same time so you can position them together.' } },

  { type: 'heading', data: { level: 2, text: 'Categories & Position', id: 'people-cats' } },
  { type: 'paragraph', data: { html: 'Each person can belong to <strong>one or more categories</strong> — Worship, Pastor, Tech, or Other. Categories are used as conditions in automation rules (e.g., "if category contains Worship, assign mic: next available").' } },
  { type: 'paragraph', data: { html: 'The <strong>position</strong> field stores a person\'s primary role or instrument (e.g., "Lead Vocals", "Electric Guitar", "Drums"). This is separate from category and is also available as a condition in automation rules.' } },
  { type: 'paragraph', data: { html: 'For PCO-linked people, the position shown on the display card comes from their PCO team position for that specific plan — it may differ from the position stored in Beacon.' } },

  { type: 'heading', data: { level: 2, text: 'Search & Filters', id: 'people-filters' } },
  { type: 'paragraph', data: { html: 'Use the <strong>search bar</strong> to find people by name, position, email, or PCO ID. Results update instantly as you type.' } },
  { type: 'paragraph', data: { html: 'The <strong>Filters</strong> bar below the toolbar lets you narrow the list by:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Source</strong> — All, PCO only, or Manual only.',
    '<strong>Category</strong> — select one or more categories to show only people in those groups (multi-select).',
  ] } },
  { type: 'paragraph', data: { html: 'Active filters are highlighted in blue. Click <strong>Clear filters</strong> to reset all at once.' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── Labels ───────────────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Labels', id: 'labels' } },
  { type: 'paragraph', data: { html: 'Labels are your physical audio equipment inventory — every mic channel and IEM pack gets a label that you can assign to musicians. Use the <strong>+ Add Device Label</strong> button at the top of the page, choose the type, give it a name, and optionally assign it to a group.' } },
  { type: 'paragraph', data: { html: 'On wider screens (860px+), Microphones and In-Ear Monitors appear in a <strong>two-column layout</strong> side by side, with Positions spanning the full width below them.' } },

  { type: 'heading', data: { level: 2, text: 'Mic vs IEM', id: 'labels-types' } },
  { type: 'paragraph', data: { html: 'Labels are split into two types:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Microphones</strong> — any mic, DI box, or input channel. Examples: <em>Vox 1</em>, <em>Vox 2</em>, <em>Keys DI</em>, <em>EG DI</em>, <em>Bass DI</em>.',
    '<strong>In-Ear Monitors</strong> — IEM packs or monitor sends. Examples: <em>IEM 1</em>, <em>IEM 2</em>, <em>Pack A</em>.',
  ] } },
  { type: 'paragraph', data: { html: 'The type determines which section a label appears in on the Labels page and which category automation rules can pull from.' } },

  { type: 'heading', data: { level: 2, text: 'Groups', id: 'labels-groups' } },
  { type: 'paragraph', data: { html: 'Groups let you create named pools within a type. For example, you might split your mic labels into a <em>Vocals</em> group (Vox 1, Vox 2, Vox 3) and an <em>Instruments</em> group (Keys DI, EG DI, Bass DI).' } },
  { type: 'paragraph', data: { html: 'Groups are used by automation rules with the <strong>"next available"</strong> action — a rule can say "assign next available mic from group: Vocals" rather than pulling from your entire mic inventory.' } },
  { type: 'callout', data: { variant: 'info', html: 'Groups are optional. If you don\'t use them, "next available" automation pulls from all labels of that type in order.' } },

  { type: 'heading', data: { level: 2, text: 'Order & Reordering', id: 'labels-order' } },
  { type: 'paragraph', data: { html: 'The order of your labels matters for automation. When a rule uses <strong>next available</strong>, Beacon picks the first label in the list (top-to-bottom) that hasn\'t already been assigned to someone in that service.' } },
  { type: 'paragraph', data: { html: 'To reorder, grab the <strong>grip handle</strong> (six dots) on the left side of any row and drag it to the desired position. Order is saved automatically.' } },
  { type: 'callout', data: { variant: 'tip', html: 'Put your most commonly used labels at the top of each section. Leads and featured vocalists often get the same channel every week — use automation\'s specific-label rules for those, so "next available" only runs for the rest.' } },

  { type: 'heading', data: { level: 2, text: 'Positions', id: 'labels-positions' } },
  { type: 'paragraph', data: { html: '<strong>Positions</strong> are role names for your team — things like Singer, Speaker, Worship Leader, Announcements, Electric Guitar, etc. They live at the bottom of the Labels page under their own section.' } },
  { type: 'paragraph', data: { html: 'Positions are used in two places:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>People</strong> — each person can have a position set on their profile (used as a default when adding them to a Manual service team).',
    '<strong>Manual service teams</strong> — when you add someone to a Manual service type, you pick their position for that service. This is what automation rules match against to assign their mic and IEM.',
  ] } },
  { type: 'paragraph', data: { html: 'Define all your positions here first, then they\'ll appear as a dropdown when building manual teams or editing people profiles.' } },
  { type: 'callout', data: { variant: 'info', html: 'Positions are also matched by automation rules in PCO mode — the same rules work for both. A rule like "position contains Singer → Mic: next available (Vocals group)" will fire whether the person came from PCO or a manual team.' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── Automation ───────────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Automation Rules', id: 'automation' } },
  { type: 'paragraph', data: { html: 'Automation rules auto-assign mics and IEMs when a schedule fires or a Push is triggered. They\'re evaluated <strong>top-to-bottom</strong> — each person is checked against every rule, but only the first matching mic rule and first matching IEM rule are applied.' } },
  { type: 'callout', data: { variant: 'info', html: 'Automation is what puts label text on cards. If a person has no matching automation rule, their card shows no mic or IEM — even if their template slot is pinned to a label. The rule must run and assign the label first.' } },
  { type: 'paragraph', data: { html: 'Each rule has two parts:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Condition:</strong> match by <em>Name</em> or <em>Position</em>, using <em>is</em> (exact) or <em>contains</em> (partial). <strong>Name</strong> checks the person\'s actual name. <strong>Position</strong> checks their role for that service (PCO team position or Manual assignment position).',
    '<strong>Action:</strong> assign a specific mic or IEM label, or "next available" from the full pool or a named group.',
  ] } },
  { type: 'paragraph', data: { html: 'The <strong>Position</strong> field matches two things:' } },
  { type: 'list', data: { ordered: false, items: [
    'In <strong>PCO mode</strong> — the team position name from the Planning Center plan (e.g. "Vocalist", "Worship Leader").',
    'In <strong>Manual mode</strong> — the position you assigned to the person when building the manual team (from your <a href="/docs#labels-positions">Positions</a> list).',
  ] } },
  { type: 'paragraph', data: { html: 'The same rule set works for both modes, so you only need to write your rules once.' } },
  { type: 'paragraph', data: { html: '<strong>Example rules:</strong>' } },
  { type: 'code', data: { text: 'If position contains "Singer"        → Mic: next available (Vocals group)\nIf position is "Worship Leader"      → Mic: Vox 1\nIf position contains "Guitar"        → Mic: next available (Instruments group)\nIf position is "Drums"               → IEM: IEM 6' } },
  { type: 'callout', data: { variant: 'info', html: 'You\'ll typically need two rules per person — one for the mic and one for the IEM. Add them as separate rules with the same condition.' } },
  { type: 'paragraph', data: { html: '<strong>Priority order:</strong> grab the grip handle on any rule row and drag it up or down to change evaluation order (drag works on both mouse and touch). Rules at the top run first.' } },
  { type: 'paragraph', data: { html: '<strong>Filtering and search:</strong> the filter bar above the rule list lets you narrow by <strong>Field</strong> (Name or Position) and <strong>Action</strong> (Mic or IEM). Rules that don\'t match the active filter are dimmed rather than hidden, so you can still see where they fall in priority order. The <strong>Smart search</strong> input on the right filters by any text in the rule as you type — condition value, field, and assigned label are all searchable.' } },
  { type: 'callout', data: { variant: 'tip', html: 'You can re-run automation manually from the Automation page using the <strong>Run automation</strong> button — useful for testing without firing a full schedule.' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── Users & Accounts ─────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Users & Accounts', id: 'users' } },
  { type: 'paragraph', data: { html: 'Beacon has two user roles — <strong>Admin</strong> and <strong>Team Member</strong>. Anyone can register an account, but new accounts are always created as Team Member until an admin promotes them.' } },

  { type: 'heading', data: { level: 2, text: 'Roles', id: 'user-roles' } },
  { type: 'paragraph', data: { html: '<strong>Admin</strong> — full access to every page in Studio, including Organization settings, Users management, and Integrations.' } },
  { type: 'paragraph', data: { html: '<strong>Team Member</strong> — access to the Dashboard and all content pages: Locations, Templates, People, Labels, Automation, Screens, and Services. They can view, add, and edit content for the organization. The three admin-only pages — <strong>Organization</strong>, <strong>Users</strong>, and <strong>Integrations</strong> — are hidden from the sidebar and redirect to an access-denied page if reached directly.' } },
  { type: 'paragraph', data: { html: 'All data is <strong>shared across the organization</strong> — people, screens, templates, and labels added by one user are visible to every user in the same org, regardless of role.' } },
  { type: 'paragraph', data: { html: 'Admins can change any account\'s role from the <strong>Users</strong> page — click the edit icon on any row to open the edit modal, which includes a Role dropdown. Guards prevent removing the last admin account or demoting yourself.' } },
  { type: 'paragraph', data: { html: 'Use the <strong>search bar</strong> at the top of the Users table to filter by name or email address.' } },
  { type: 'paragraph', data: { html: 'Admins can also <strong>send a password reset email</strong> to any user directly from the edit modal — useful if a team member is locked out.' } },

  { type: 'heading', data: { level: 2, text: 'Invite Links', id: 'invite-links' } },
  { type: 'paragraph', data: { html: 'Instead of asking team members to register manually, you can invite them by email. Go to <strong>Studio → Users</strong> (or <strong>Studio → Organization</strong>) and use the <strong>Invite Team Members</strong> section — enter their email address, choose a role (Admin or Team Member), and click <strong>Send invite</strong>.' } },
  { type: 'paragraph', data: { html: 'The recipient gets an email with a personal invite link. When they click it, their email is already pre-filled on the registration form — they only need to enter their name and a password. The link:' } },
  { type: 'list', data: { ordered: false, items: [
    'Expires after <strong>7 days</strong>.',
    'Pre-fills their email and locks it — they can\'t register under a different address.',
    'Is <strong>single-use</strong> — the invite token is consumed when the account is created.',
    'Automatically assigns the chosen role when the account is created.',
  ] } },
  { type: 'callout', data: { variant: 'info', html: 'Email is pre-configured on the hosted version — invite emails send automatically with no setup required. If an invite expires before the recipient uses it, generate a new one. You can revoke active invites from either the <strong>Organization</strong> page or the <strong>Users</strong> page.' } },

  { type: 'heading', data: { level: 2, text: 'Settings', id: 'my-account' } },
  { type: 'paragraph', data: { html: 'Click your name at the bottom of the sidebar to open your <strong>Settings</strong> page. A sticky nav at the top lets you jump to any section:' } },
  { type: 'list', data: { ordered: false, items: [
    '<strong>Account</strong> — change your display name or email address. Your current role (Admin or Team Member) is shown as a badge. Changes take effect immediately.',
    '<strong>Security</strong> — change your password. Requires your current password first. New password must be at least 8 characters. If you\'ve forgotten your current password, use the <strong>Forgot password?</strong> link on the sign-in page — a reset link will be emailed to you.',
    '<strong>Appearance</strong> — switch between <em>Dark</em> and <em>Light</em> theme. Preference is stored in the browser and applies across the whole Studio.',
    '<strong>Dashboard</strong> — drag to reorder your Dashboard cards and toggle card visibility. Settings are saved to your account and persist across devices.',
    '<strong>Organization</strong> — a read-only summary of your organization\'s name, slug, timezone, and address. Admins see an <em>Edit settings →</em> link to the full Organization page.',
  ] } },
  { type: 'paragraph', data: { html: 'The <strong>Sign out</strong> button is at the bottom of the Settings page (and also available via the icon next to your name in the sidebar).' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── PCO Integration ──────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Planning Center Integration', id: 'pco-integration' } },
  { type: 'paragraph', data: { html: 'Beacon connects to Planning Center Online using OAuth 2.0. Once connected, each organization can independently link its own PCO account.' } },
  { type: 'paragraph', data: { html: '<strong>To connect:</strong>' } },
  { type: 'list', data: { ordered: true, items: [
    'Go to Studio → <strong>Integrations</strong>.',
    'Click <em>Connect to Planning Center</em> — you\'ll be redirected to PCO to authorize Beacon.',
    'After authorizing, you\'re redirected back to the Integrations page showing "Connected."',
    'Click <em>Test connection</em> to verify it\'s working — Beacon will fetch your service type list and confirm the count.',
  ] } },
  { type: 'paragraph', data: { html: 'PCO access tokens expire every 2 hours. Beacon automatically refreshes them in the background using the stored refresh token — you won\'t need to reconnect unless you explicitly disconnect.' } },
  { type: 'paragraph', data: { html: '<strong>What PCO connection enables:</strong>' } },
  { type: 'list', data: { ordered: false, items: [
    'PCO Sync service types on the Services page',
    'Import from PCO on the People page',
    'Upcoming plan preview inside each PCO service type card',
    'Plan picker on the Push button (push any upcoming plan, not just today\'s)',
  ] } },
  { type: 'paragraph', data: { html: '<strong>Importing people from PCO:</strong> Go to Studio → People and click <em>Import from PCO</em>. Choose a service and plan, preview the team, and import. People already in Beacon (matched by PCO person ID) are skipped — your overrides are never touched by import.' } },
  { type: 'callout', data: { variant: 'info', html: 'Each organization has its own independent PCO connection. If you\'re using multiple organizations in one Beacon install, each can connect to a different PCO account.' } },
  { type: 'spacer', data: { size: 'sm' } },

  // ── Self-Hosting ─────────────────────────────────────────────────────────────
  { type: 'heading', data: { level: 1, text: 'Self-Hosting', id: 'hosting' } },
  { type: 'callout', data: { variant: 'info', html: 'You\'re currently using the <strong>hosted version</strong> of Beacon at beaconscreen.com — no server setup is required. This section is for organizations who want to run their own private instance on a local machine or server.' } },
  { type: 'paragraph', data: { html: 'The self-hosted version of Beacon runs anywhere Node.js 22+ is available — a laptop, a Raspberry Pi, a VPS, a home server. Display screens are just browser tabs, so any device on the same network (or any network if you use a tunnel) can show them.' } },
  { type: 'callout', data: { variant: 'warning', html: 'Node.js 22 or higher is required — the self-hosted version uses the built-in <code>node:sqlite</code> module introduced in Node 22. Earlier versions will fail to start.' } },
  { type: 'paragraph', data: { html: '<strong>Fresh install — four commands:</strong>' } },
  { type: 'code', data: { text: 'git clone https://github.com/Kdubs6991/beacon\ncd beacon\nnpm run setup\nnpm start' } },
  { type: 'paragraph', data: { html: 'Open <code>http://localhost:3001</code> and complete the setup wizard. No configuration file is required — a session secret is auto-generated on first run.' } },
  { type: 'callout', data: { variant: 'info', html: 'To auto-start on boot: install PM2 (<code>npm install -g pm2</code>), then run <code>pm2 start server/index.js --name beacon &amp;&amp; pm2 save &amp;&amp; pm2 startup</code>.' } },
  { type: 'paragraph', data: { html: '<strong>For HTTPS / remote access</strong> without port forwarding: install <code>cloudflared</code> and create a tunnel pointing to <code>localhost:3001</code>.' } },
  { type: 'callout', data: { variant: 'info', html: 'On a local network with a fixed IP, you can point TVs directly at <code>http://192.168.x.x:3001/display/...</code> — no tunnel needed if all screens are on the same network as the server.' } },

  { type: 'heading', data: { level: 2, text: 'Staying Up to Date', id: 'hosting-updates' } },
  { type: 'paragraph', data: { html: 'Beacon does not auto-update. New versions are published to the <a href="https://github.com/Kdubs6991/beacon" target="_blank" rel="noopener noreferrer">GitHub repository</a> and you pull them manually when you\'re ready.' } },
  { type: 'paragraph', data: { html: '<strong>Recommended: check for updates once a month.</strong> To update:' } },
  { type: 'code', data: { text: 'git pull\nnpm run setup\nnpm start' } },
  { type: 'paragraph', data: { html: 'The <code>git pull</code> fetches the latest code, <code>npm run setup</code> installs any new dependencies and rebuilds the frontend, and <code>npm start</code> restarts the server. Your database and settings are not affected — they live in <code>server/beacon.db</code> which is never touched by a pull.' } },
  { type: 'callout', data: { variant: 'tip', html: 'To get notified automatically: go to the <a href="https://github.com/Kdubs6991/beacon" target="_blank" rel="noopener noreferrer">GitHub repository</a>, click <strong>Watch → Custom → Releases</strong>. GitHub will email you whenever a new version is published.' } },
]

module.exports = { DOCS_SEED_BLOCKS }
