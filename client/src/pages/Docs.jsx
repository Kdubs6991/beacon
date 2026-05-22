import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styles from './Docs.module.css'

const NAV = [
  { id: 'overview',      label: 'Overview' },
  { id: 'first-run',     label: 'First Run / Setup' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'dashboard',     label: 'Dashboard', children: [
      { id: 'dashboard-screens',  label: 'Screens Card' },
      { id: 'dashboard-services', label: 'Services Card' },
      { id: 'dashboard-people',   label: 'People Card' },
    ]
  },
  { id: 'organization',  label: 'Organization',
    children: [
      { id: 'display-login',  label: 'Display Login' },
      { id: 'qr-code',        label: 'QR Code' },
      { id: 'backup-export',  label: 'Backup & Export' },
    ]
  },
  { id: 'locations',     label: 'Locations',
    children: [
      { id: 'campuses',       label: 'Campuses' },
    ]
  },
  { id: 'services',      label: 'Services',
    children: [
      { id: 'service-types',      label: 'Service Types' },
      { id: 'service-pco-mode',   label: 'PCO Mode' },
      { id: 'service-manual-mode', label: 'Manual Mode' },
      { id: 'service-schedules',  label: 'Auto-Refresh Schedules' },
    ]
  },
  { id: 'templates',     label: 'Templates',
    children: [
      { id: 'template-layout',  label: 'Grid Layout' },
      { id: 'template-slots',   label: 'Slot Configuration' },
      { id: 'template-empty',   label: 'Empty Slot Behavior' },
      { id: 'template-options', label: 'Display Options' },
    ]
  },
  { id: 'screens',       label: 'Screens',
    children: [
      { id: 'display-url',    label: 'Display URL' },
      { id: 'share-code',     label: 'Share Code' },
      { id: 'mirror',         label: 'Mirror Mode' },
      { id: 'screen-layout',  label: 'Layout' },
      { id: 'screen-header',  label: 'Display Header' },
    ]
  },
  { id: 'people',        label: 'People',
    children: [
      { id: 'people-views',   label: 'Grid & List Views' },
      { id: 'people-photos',  label: 'Photos & Crop' },
      { id: 'people-cats',    label: 'Categories & Position' },
      { id: 'people-filters', label: 'Filters' },
    ]
  },
  { id: 'labels', label: 'Labels', children: [
      { id: 'labels-types',     label: 'Mic vs IEM' },
      { id: 'labels-groups',    label: 'Groups' },
      { id: 'labels-order',     label: 'Order & Reordering' },
      { id: 'labels-positions', label: 'Positions' },
    ],
  },
  { id: 'automation',    label: 'Automation Rules' },
  { id: 'users',          label: 'Users & Accounts',
    children: [
      { id: 'user-roles',     label: 'Roles' },
      { id: 'invite-links',   label: 'Invite Links' },
      { id: 'my-account',     label: 'My Account' },
    ]
  },
  { id: 'pco-integration', label: 'Planning Center OAuth' },
  { id: 'hosting',       label: 'Self-Hosting' },
]

function Section({ id, title, children }) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.h2}>{title}</h2>
      {children}
    </section>
  )
}

function SubSection({ id, title, children }) {
  return (
    <div id={id} className={styles.subsection}>
      <h3 className={styles.h3}>{title}</h3>
      {children}
    </div>
  )
}

function Callout({ type = 'info', children }) {
  return <div className={`${styles.callout} ${styles[type]}`}>{children}</div>
}

export default function Docs() {
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }, [hash])

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <span className={styles.brand}>Beacon</span>
        <div className={styles.topBarNav}>
          <Link to="/login" className={styles.backLink}>Sign in</Link>
          <Link to="/display" className={styles.backLink}>Display login</Link>
        </div>
      </header>

      <div className={styles.layout}>
        {/* ── Sidebar ── */}
        <nav className={styles.sidebar}>
          <p className={styles.sidebarTitle}>Documentation</p>
          {NAV.map(item => (
            <div key={item.id}>
              <a href={`#${item.id}`} className={styles.navItem}>{item.label}</a>
              {item.children?.map(child => (
                <a key={child.id} href={`#${child.id}`} className={styles.navChild}>{child.label}</a>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Content ── */}
        <main className={styles.content}>
          <h1 className={styles.h1}>Beacon — Documentation</h1>
          <p className={styles.lead}>
            Everything you need to know to set up and run Beacon for your church.
          </p>

          {/* ── Overview ── */}
          <Section id="overview" title="Overview">
            <p>Beacon is a self-hosted app that shows a TV/kiosk-friendly card grid of your worship team's microphone and IEM assignments for a service. Think of it as a digital version of the laminated assignment sheet your sound engineer normally posts backstage.</p>
            <p>It integrates with <strong>Planning Center Online</strong> to pull your team roster automatically, and also works fully <strong>without PCO</strong> using a manual workflow where you predefine your team. Either way, it can refresh itself on a schedule so displays are always showing the right team before anyone arrives.</p>
            <p>The server runs anywhere Node.js runs — a laptop, a Raspberry Pi, a VPS. Any browser on any device can reach the display screens. For public access without port forwarding, run it behind a <strong>Cloudflare Tunnel</strong>.</p>
          </Section>

          {/* ── First Run / Setup ── */}
          <Section id="first-run" title="First Run / Setup">
            <p>On a fresh install, visiting any page in the app will automatically redirect you to <code>/setup</code>. This one-time setup wizard walks you through:</p>
            <ol className={styles.ol}>
              <li><strong>Create your organization</strong> — set your organization name and slug. The slug is used in display screen login URLs and cannot be easily changed later.</li>
              <li><strong>Create the first admin account</strong> — this account will have full access to the admin panel. Additional accounts can be invited after setup completes.</li>
            </ol>
            <p>Once the wizard is complete you'll be logged in automatically and taken to the admin dashboard. The <code>/setup</code> route is disabled after this point — revisiting it redirects to the dashboard.</p>
            <Callout type="warning">
              Complete the setup wizard before pointing any display screens at the app. Screens that load before an organization exists will show an error.
            </Callout>
          </Section>

          {/* ── Getting Started ── */}
          <Section id="getting-started" title="Getting Started">
            <p>The recommended setup order:</p>
            <ol className={styles.ol}>
              <li><strong>Create a Location</strong> — a campus or venue. Everything else belongs to a location.</li>
              <li><strong>Add Service Types</strong> under that location — choose PCO mode (pulls from Planning Center) or Manual mode (you define the team).</li>
              <li><strong>Create Screens</strong> — each screen gets a permanent URL you point a TV at.</li>
              <li><strong>Add People</strong> — your worship team members. Manual or pulled from PCO.</li>
              <li><strong>Define Labels</strong> — your mic and IEM inventory (e.g. "Vox 1", "Keys DI", "IEM 3"). For Manual mode, also define <strong>Positions</strong> (e.g. Singer, Speaker) on the Labels page.</li>
              <li><strong>Set up Automation Rules</strong> — tell the app how to assign mics/IEMs based on a person's name or position. Rules work for both PCO and Manual service types.</li>
              <li><strong>Connect Planning Center</strong> (PCO mode only) — link your PCO account so the app can pull plans automatically.</li>
              <li><strong>Set a Schedule</strong> — tell each service type when to auto-push assignments to screens.</li>
            </ol>
            <Callout type="info">
              You can test everything in <strong>mock mode</strong> (<code>USE_MOCK_DATA=true</code> in <code>server/.env</code>) without needing a PCO connection. The display will show a set of sample musicians so you can see how it looks.
            </Callout>
            <Callout type="info">
              The <strong>sun/moon icon</strong> in the top-right corner of every admin page toggles between light and dark mode. Your preference is saved in your browser and persists across sessions.
            </Callout>
          </Section>

          {/* ── Dashboard ── */}
          <Section id="dashboard" title="Dashboard">
            <p>The <strong>Dashboard</strong> is the first page you see after logging in. It gives you a quick at-a-glance view of your system without requiring you to navigate to individual pages.</p>
            <p>It is organized into <strong>cards</strong> — each card represents one area of the app. Clicking the card's title bar takes you directly to that page's full management view. On wide screens, cards sit 2–3 across; on smaller screens they stack vertically.</p>

            <SubSection id="dashboard-screens" title="Screens Card">
              <p>Shows all screens in your organization, with a <strong>Live</strong> badge and a pulsing green dot for any screen that is currently open in a browser. The <strong>live detection</strong> works via a heartbeat: whenever a display screen is open, it silently pings the server every 30 seconds. If a screen hasn't pinged in the last 90 seconds it is considered inactive.</p>
              <p>Each screen row also shows its <strong>location</strong> (campus) and the current service name and musician count, so you can tell at a glance what's showing where.</p>
              <p>The active/inactive status also appears as a filter on the <Link to="/docs#screens">Screens</Link> management page — use it to quickly isolate which displays are currently running.</p>
            </SubSection>

            <SubSection id="dashboard-services" title="Services Card">
              <p>Shows upcoming or active services, with a toggle between two sources:</p>
              <ul className={styles.ul}>
                <li><strong>Manual</strong> — services that were pushed to a screen manually (by pushing a musician list from the admin panel or via share code). These always work, with or without a PCO connection.</li>
                <li><strong>PCO</strong> — upcoming plans pulled from Planning Center Online. If your PCO account isn't connected yet, this tab shows a "not connected" notice. See <Link to="/docs#pco-integration">Planning Center OAuth</Link> for connection instructions.</li>
              </ul>
            </SubSection>

            <SubSection id="dashboard-people" title="People Card">
              <p>Shows a preview of your worship team roster, also with a Manual/PCO toggle:</p>
              <ul className={styles.ul}>
                <li><strong>Manual</strong> — people added directly through the People page, including anyone imported from PCO.</li>
                <li><strong>PCO</strong> — shows how many roster members came from PCO sync vs. were added manually. Useful for spotting sync drift.</li>
              </ul>
            </SubSection>
          </Section>

          {/* ── Organization ── */}
          <Section id="organization" title="Organization">
            <p>The <strong>Organization</strong> page (Admin → Organization) holds your top-level settings. Beacon is designed for a single organization per installation — there's no multi-tenant setup. The <strong>org slug</strong> is a short URL-safe identifier for your organization (e.g. <code>first-church</code>) and is embedded in display screen login URLs.</p>
            <p>You can also set your organization's <strong>timezone</strong> here. This ensures that schedule next-run times and other time-sensitive information display correctly for your location rather than defaulting to the server's system clock.</p>

            <SubSection id="display-login" title="Display Login">
              <p>Display screens authenticate using two pieces of information:</p>
              <ul className={styles.ul}>
                <li><strong>Org code</strong> — your organization's slug (e.g. <code>first-church</code>). This is the same for every screen in your org.</li>
                <li><strong>Access code</strong> — a short alphanumeric code shown on the Organization page. This is shared across all screens at your org.</li>
              </ul>
              <p>When a browser on a TV or kiosk enters these credentials, a session cookie is stored that persists for <strong>1 year</strong>. The screen will stay authenticated and continue auto-refreshing without requiring re-login, even after the browser restarts.</p>
              <p>The <strong>access code</strong> is shown on the Organization page. You can <strong>regenerate</strong> it at any time, but note that doing so will immediately invalidate the existing cookie on every screen — all displays will be redirected to the login page and will need to re-enter the new code.</p>
              <Callout type="warning">
                Regenerate the access code only when necessary (e.g. if it was shared with someone who should no longer have access). You'll need to re-authenticate every display screen afterward.
              </Callout>
            </SubSection>

            <SubSection id="qr-code" title="Scan-to-Login QR">
              <p>The display login page (<code>/display</code>) shows a <strong>QR code</strong> unique to that browser session. A staff member can scan this QR code with their phone and complete the login on their phone instead of typing on the TV.</p>
              <p><strong>How the flow works:</strong></p>
              <ol className={styles.ol}>
                <li>Open <code>/display</code> on the TV browser — a QR code appears automatically.</li>
                <li>Scan the QR code with your phone — it opens a mobile setup page.</li>
                <li>Enter the org code, access code, and screen name on your phone.</li>
                <li>The TV detects the completed setup and transitions to the display immediately — no interaction on the TV required.</li>
              </ol>
              <p>This is the recommended way to authenticate TVs: no keyboard needed on the TV itself. The QR code expires after 10 minutes. If it expires, refreshing the page generates a new one.</p>
              <Callout type="info">
                If you prefer, you can still enter the org code and access code manually using the form below the QR code on the display login page.
              </Callout>
            </SubSection>

            <SubSection id="backup-export" title="Backup & Export">
              <p>The Organization page has a <strong>Download Backup</strong> button that exports your entire app configuration as a JSON file. The backup includes:</p>
              <ul className={styles.ul}>
                <li>Organization settings</li>
                <li>Campuses and service types</li>
                <li>People and photo overrides</li>
                <li>Labels and label groups</li>
                <li>Automation rules</li>
                <li>Screen configurations</li>
                <li>Schedules</li>
              </ul>
              <p>Keep a backup somewhere safe — especially before making large changes or migrating to a new Pi. Backup restore is not yet automated (import it manually if needed), but the JSON structure is human-readable.</p>
              <Callout type="info">
                The backup does <strong>not</strong> include PCO OAuth tokens or user account passwords. You'll need to reconnect Planning Center and reset passwords after a restore.
              </Callout>
            </SubSection>
          </Section>

          {/* ── Locations ── */}
          <Section id="locations" title="Locations">
            <p>The Locations page is where you define your campuses — the physical venues your church operates at. Everything else (service types, screens) is organized under a campus.</p>

            <SubSection id="campuses" title="Campuses">
              <p>A <strong>campus</strong> represents a physical venue — your main building, a satellite campus, a rented school gym, etc. Campuses group your service types and display screens so everything stays organized when you have more than one site.</p>
              <p>Each campus just needs a name. The description is optional but handy for your team ("North building, sanctuary A/V booth").</p>
            </SubSection>
          </Section>

          {/* ── Services ── */}
          <Section id="services" title="Services">
            <p>The <strong>Services</strong> page is where you set up recurring service types (Sunday Morning, Wednesday Night, etc.) and the schedules that automatically push team assignments to your screens.</p>

            <SubSection id="service-types" title="Service Types">
              <p>A <strong>service type</strong> is a recurring kind of service at a campus. Each service type has a <strong>mode</strong> that determines where its team roster comes from:</p>
              <ul className={styles.ul}>
                <li><strong>PCO</strong> — the team is pulled automatically from a Planning Center plan that matches today's date. Requires a PCO connection and a PCO service type ID.</li>
                <li><strong>Manual</strong> — you define a fixed team roster in the app. No PCO connection needed. Good for services that aren't in Planning Center, or as a simpler alternative when you don't need PCO sync.</li>
              </ul>
              <p>The mode badge on each service type card (blue for PCO, green for Manual) shows which mode is active.</p>
            </SubSection>

            <SubSection id="service-pco-mode" title="PCO Mode">
              <p>In PCO mode, Beacon connects to Planning Center to fetch the team for a matching plan. You need to provide the <strong>Planning Center service type ID</strong> so Beacon knows which calendar to look at.</p>
              <p><strong>How to find it:</strong> Log in to Planning Center, go to Services → your service type. Look at the URL:</p>
              <div className={styles.codeBlock}>
                https://services.planningcenteronline.com/service_types/<strong>1234567</strong>
              </div>
              <p>The number at the end is your PCO ID. Paste it into the "Planning Center ID" field when editing the service type.</p>
              <Callout type="warning">
                Without the PCO ID, PCO-mode schedules will fail silently — the scheduler runs but won't know where to look. The display keeps showing whatever was last pushed.
              </Callout>
            </SubSection>

            <SubSection id="service-manual-mode" title="Manual Mode">
              <p>In Manual mode, you define a fixed team for this service type directly in the app. The team is set on the service type's detail card on the Services page.</p>
              <p><strong>How it works:</strong></p>
              <ol className={styles.ol}>
                <li>Add people from your roster to the team. Pick the person, then choose their <strong>position</strong> for this service (e.g. Singer, Speaker, Worship Leader).</li>
                <li>When a schedule fires, Beacon runs your <strong>automation rules</strong> against each person's position to assign their mic and IEM — the same rule system that PCO mode uses.</li>
                <li>Assignments are pushed to your target screens.</li>
              </ol>
              <p>Positions are defined on the <Link to="/docs#labels-positions">Labels → Positions</Link> page. Add all the roles your team uses there first, then they'll appear as options when building a manual team.</p>
              <Callout type="info">
                Manual mode is a great choice if you have a consistent core team each week and don't need Planning Center to drive your display. Set it up once and let the schedule handle the rest.
              </Callout>
            </SubSection>

            <SubSection id="service-schedules" title="Auto-Refresh Schedules">
              <p>Each service type can have one <strong>schedule</strong>. The schedule fires a cron job at a day and time you choose and pushes the team assignments to your selected screens automatically.</p>
              <p><strong>How to set one up:</strong> Click <em>Add Schedule</em> on a service type card, pick a day of the week and time, and choose which screens should receive the update.</p>
              <p>When the schedule fires:</p>
              <ol className={styles.ol}>
                <li>Beacon loads the team (from PCO or from your manual roster).</li>
                <li>Runs automation rules to assign mic and IEM labels.</li>
                <li>Pushes assignments to all selected screens that are currently active (heartbeat within 90 seconds).</li>
              </ol>
              <p><strong>Example:</strong> Saturday at 6:00 PM — loads Sunday's team so displays are ready before anyone arrives.</p>
              <p>You can trigger a schedule manually any time by clicking <strong>Run now</strong> — useful for testing or mid-week changes.</p>
              <Callout type="info">
                Schedules only push to <strong>active screens</strong> — screens that are currently open in a browser. If a screen isn't active when the schedule fires, it will pick up the new assignments next time it polls (every 30 seconds).
              </Callout>
            </SubSection>
          </Section>

          {/* ── Templates ── */}
          <Section id="templates" title="Templates">
            <p>Templates let you define a <strong>custom grid layout</strong> for a display screen — how many rows, how many slots per row, what each individual slot shows, and what happens when fewer people are assigned than the template has space for.</p>
            <p>Templates are more powerful than preset layouts because you control exact grid dimensions, per-row heights, per-slot label assignments, and how each cell displays its content. Once created, select a template when setting up a screen.</p>
            <p>The Templates page supports both <strong>list view</strong> and <strong>grid view</strong> (toggle top-right). Grid view shows a TV-ratio preview of each template so you can see the layout at a glance.</p>

            <SubSection id="template-layout" title="Grid Layout">
              <p>Each template is built from <strong>rows</strong>, and each row has its own settings:</p>
              <ul className={styles.ul}>
                <li><strong>Rows</strong> — 1 to 5 rows, stacked vertically on the display.</li>
                <li><strong>Columns</strong> — 1 to 8 columns per row. Each column is one person-card slot.</li>
                <li><strong>Height</strong> — Controls how much vertical space that row gets relative to the others. Options are <em>Tiny</em>, <em>Compact</em>, <em>Standard</em>, and <em>Tall</em>. A Tall row takes 6× the space of a Tiny row. The layout preview updates live as you change heights.</li>
                <li><strong>Section label</strong> — Optional text identifying the row (e.g., "Vocals", "Band", "Tech"). Type a label, then click <em>Show on screen</em> to make it visible on the display. Leave the toggle off to use the label only for your reference inside the editor.</li>
              </ul>
              <p>Slots are numbered left-to-right, top-to-bottom starting at 1. The proportional preview in the editor reflects your exact row heights so you can see how the grid will look on a TV before saving.</p>
            </SubSection>

            <SubSection id="template-slots" title="Slot Configuration">
              <p>Each slot in the grid can be individually configured. In the template editor, the <strong>Slot configuration</strong> section shows a clickable grid — click any cell to open its settings panel.</p>
              <p><strong>Display mode</strong> — controls what content this slot shows on the live display:</p>
              <ul className={styles.ul}>
                <li><strong>Full</strong> — the complete card: person's photo, name, and their assigned label.</li>
                <li><strong>Photo only</strong> — shows just the person's headshot, filling the cell. No text.</li>
                <li><strong>Label only</strong> — shows the person's name and their label without the photo. Good for text-dense rows where photos would be too small to be useful.</li>
              </ul>
              <p><strong>Label</strong> — assign a single mic or IEM label as the default for this slot. The label picker groups options by type (Mic / IEM). This label shows on the display card when someone is assigned to the slot. The label field is hidden when <em>Photo only</em> mode is selected since there is nothing to display.</p>
              <Callout type="info">
                Slot label assignments set the <em>default</em> for that position. Automation rules can override them for specific people or PCO positions.
              </Callout>
              <p>Configured slots show their label and mode at a glance in the cell. Use <em>Clear</em> in the panel to remove all settings from a slot. Click a configured cell again to close the panel.</p>
            </SubSection>

            <SubSection id="template-empty" title="Empty Slot Behavior">
              <p>Controls what happens when fewer people are assigned than the template has slots for. For example: your template has 4 slots but only 3 singers are scheduled this week.</p>
              <ul className={styles.ul}>
                <li><strong>Reserve slots</strong> — The unfilled slot stays on screen as a visible empty placeholder. The grid keeps its exact shape. Good for fixed setups where a position always means something (e.g., Slot 4 is always the pastor's lapel mic, whether or not they're on the plan this week).</li>
                <li><strong>Collapse slots</strong> — The unfilled slot disappears and the remaining cards fill in. Good for variable team sizes where you only want to show who's actually assigned.</li>
              </ul>
              <Callout type="info">
                This setting only affects how the display renders — not your underlying assignment data. You can change it at any time.
              </Callout>
            </SubSection>

            <SubSection id="template-options" title="Display Options">
              <p>Each template has three toggles that control the display header when this template is active on a screen:</p>
              <ul className={styles.ul}>
                <li><strong>Auto-merge same person</strong> — If the same person appears in vertically adjacent slots, their cards merge into one taller card. Useful when a worship leader holds multiple adjacent slots.</li>
                <li><strong>Show service title</strong> — Displays the event name and date in the center of the header bar.</li>
                <li><strong>Show organization logo</strong> — Displays your org logo and name on the left side of the header bar.</li>
              </ul>
            </SubSection>
          </Section>

          {/* ── Screens ── */}
          <Section id="screens" title="Screens">
            <p>A <strong>screen</strong> represents a single display — a TV backstage, a monitor at the front of house, a tablet at the door. Each screen gets a permanent URL that you load in a browser (or kiosk-mode browser) and never have to change.</p>
            <p>Use the <strong>filter bar</strong> at the top of the Screens page to narrow the list by location, screen type (independent vs. mirror), or <strong>status</strong>. A screen is <strong>Active</strong> when it is currently open in a browser and has sent a heartbeat within the last 90 seconds — the same signal shown as a pulsing dot on the <Link to="/docs#dashboard">Dashboard</Link>.</p>

            <SubSection id="display-url" title="Display URL">
              <p>Every screen gets a unique URL like:</p>
              <div className={styles.codeBlock}>http://your-domain.com/display/abc123def456</div>
              <p>Point any browser at this URL and it will show the card grid for that screen, auto-refreshing every 30 seconds to pick up new assignments. The URL is permanent — it doesn't change when you update assignments or rename the screen.</p>
              <p>For a TV, use your browser's kiosk/fullscreen mode. On Chrome: <code>--kiosk</code> flag. On a Raspberry Pi you can set Chromium to auto-launch in kiosk mode at startup.</p>
            </SubSection>

            <SubSection id="share-code" title="Share Code">
              <p>Each screen has a short <strong>share code</strong> (like <code>ABC123</code>). Team members can use this code to push assignments to a screen without needing admin login. This is useful for a worship leader who wants to update mic assignments from their phone before service.</p>
              <p>Share codes are case-insensitive and can be regenerated if needed.</p>
            </SubSection>

            <SubSection id="mirror" title="Mirror Mode">
              <p>A screen can be set to <strong>mirror</strong> another screen at the same location. A mirroring screen shows exactly the same assignments as its source — it has no assignments of its own.</p>
              <p><strong>When is this useful?</strong> If you have two TVs in the same room — say a main backstage monitor and an overflow monitor — you can have both show the same content by pointing one at the other. You only push assignments once, and both update automatically.</p>
              <Callout type="info">
                Mirrors are one level deep. You can't mirror a screen that is itself already mirroring another screen.
              </Callout>
            </SubSection>

            <SubSection id="screen-layout" title="Layout">
              <p>Each screen has a <strong>layout</strong> that controls how the musician cards are arranged on the display. Choose a layout when creating or editing a screen. Available presets:</p>
              <ul className={styles.ul}>
                <li><strong>Standard Grid</strong> — 5 portrait cards per row. Works for most team sizes.</li>
                <li><strong>Compact Grid</strong> — 7 thinner cards per row. Fits larger teams on one screen.</li>
                <li><strong>Large Cards</strong> — 3 wider cards per row. Best for smaller teams or high-visibility screens.</li>
                <li><strong>List</strong> — Horizontal rows with a small avatar and name. Maximizes the number of people visible.</li>
              </ul>
              <p>If you've created <strong>custom templates</strong> on the Templates page, they appear in the layout picker below the presets. Custom templates give you full control over slot positions, per-slot label defaults, and per-slot display modes. See the <Link to="/docs#templates">Templates</Link> section for details.</p>
            </SubSection>

            <SubSection id="screen-header" title="Display Header">
              <p>Every display screen shows a header bar at the top with three zones:</p>
              <ul className={styles.ul}>
                <li><strong>Left</strong> — your organization's logo (if uploaded) and name. Upload a logo on the <strong>Organization</strong> page.</li>
                <li><strong>Center</strong> — the service/event name and date from the active assignments.</li>
                <li><strong>Right</strong> — a live clock that updates every second.</li>
              </ul>
              <p>If no logo is uploaded, only the org name appears on the left. Upload a logo at <strong>Admin → Organization → Organization Logo</strong>.</p>
            </SubSection>
          </Section>

          {/* ── People ── */}
          <Section id="people" title="People">
            <p>The People page is where your worship team roster lives. People can be:</p>
            <ul className={styles.ul}>
              <li><strong>PCO-linked</strong> — imported from Planning Center. Name and photo sync from PCO. Any edits you make in Beacon (name, photo, category, email) are <em>local overrides</em> — they don't affect PCO and won't be clobbered on the next sync.</li>
              <li><strong>Manual</strong> — added by hand, for team members not in Planning Center (volunteers, guests, one-off musicians, etc.).</li>
            </ul>
            <p>PCO-linked people are marked with a <strong>PCO</strong> badge. They cannot be deleted from within Beacon — they're removed automatically the next time that person no longer appears in any PCO plan.</p>

            <SubSection id="people-views" title="Grid &amp; List Views">
              <p>Use the <strong>view toggle</strong> (top-right of the toolbar) to switch between:</p>
              <ul className={styles.ul}>
                <li><strong>Grid view</strong> — card-based layout with a square photo at the top. Click any card to open a detail popup with full info and quick Edit/Delete actions.</li>
                <li><strong>List view</strong> — compact table rows with name, position, category, and PCO ID. Edit and Delete appear as inline buttons at the end of each row.</li>
              </ul>
              <p>Your preferred view is saved in the browser and restored on your next visit.</p>
            </SubSection>

            <SubSection id="people-photos" title="Photos &amp; Crop">
              <p>Every person can have a custom photo. For PCO-linked people this replaces their PCO profile picture on display cards without touching their PCO account.</p>
              <p><strong>How the upload works:</strong></p>
              <ol className={styles.ol}>
                <li>Click <strong>Upload Photo</strong> on the person's edit form.</li>
                <li>Drop or select an image (up to 15 MB, any common image format).</li>
                <li>A crop editor appears with a <strong>portrait frame (3:4)</strong> as the primary crop and a <strong>dashed square overlay (1:1)</strong> showing the secondary crop simultaneously.</li>
                <li>Drag and zoom to frame both crops at once, then click <strong>Save Crops</strong>.</li>
              </ol>
              <p>Two versions are saved and used in different places:</p>
              <ul className={styles.ul}>
                <li><strong>Portrait (3:4)</strong> — used on the TV display card where the full card height is available.</li>
                <li><strong>Square (1:1)</strong> — used in the admin People grid and list view.</li>
              </ul>
              <Callout type="info">
                Both crops are extracted from the same upload — you only upload once and see both frames at the same time so you can position them together.
              </Callout>
            </SubSection>

            <SubSection id="people-cats" title="Categories &amp; Position">
              <p>Each person can belong to <strong>one or more categories</strong> — Worship, Pastor, Tech, or Other. Categories are used as conditions in automation rules (e.g., "if category contains Worship, assign mic: next available").</p>
              <p>The <strong>position</strong> field stores a person's primary role or instrument (e.g., "Lead Vocals", "Electric Guitar", "Drums"). This is separate from category and is also available as a condition in automation rules.</p>
              <p>For PCO-linked people, the position shown on the display card comes from their PCO team position for that specific plan — it may differ from the position stored in Beacon.</p>
            </SubSection>

            <SubSection id="people-filters" title="Search &amp; Filters">
              <p>Use the <strong>search bar</strong> to find people by name, position, email, or PCO ID. Results update instantly as you type.</p>
              <p>The <strong>Filters</strong> bar below the toolbar lets you narrow the list by:</p>
              <ul className={styles.ul}>
                <li><strong>Source</strong> — All, PCO only, or Manual only.</li>
                <li><strong>Category</strong> — select one or more categories to show only people in those groups (multi-select).</li>
              </ul>
              <p>Active filters are highlighted in blue. Click <strong>Clear filters</strong> to reset all at once.</p>
            </SubSection>
          </Section>

          {/* ── Labels ── */}
          <Section id="labels" title="Labels">
            <p>Labels are your physical audio equipment inventory — every mic channel and IEM pack gets a label that you can assign to musicians. Use the <strong>+ Add Label</strong> button at the top of the page, choose the type, give it a name, and optionally assign it to a group.</p>

            <SubSection id="labels-types" title="Mic vs IEM">
              <p>Labels are split into two types:</p>
              <ul className={styles.ul}>
                <li><strong>Microphones</strong> — any mic, DI box, or input channel. Examples: <em>Vox 1</em>, <em>Vox 2</em>, <em>Keys DI</em>, <em>EG DI</em>, <em>Bass DI</em>.</li>
                <li><strong>In-Ear Monitors</strong> — IEM packs or monitor sends. Examples: <em>IEM 1</em>, <em>IEM 2</em>, <em>Pack A</em>.</li>
              </ul>
              <p>The type determines which section a label appears in on the Labels page and which category automation rules can pull from.</p>
            </SubSection>

            <SubSection id="labels-groups" title="Groups">
              <p>Groups let you create named pools within a type. For example, you might split your mic labels into a <em>Vocals</em> group (Vox 1, Vox 2, Vox 3) and an <em>Instruments</em> group (Keys DI, EG DI, Bass DI).</p>
              <p>Groups are used by automation rules with the <strong>"next available"</strong> action — a rule can say "assign next available mic from group: Vocals" rather than pulling from your entire mic inventory.</p>
              <Callout type="info">
                Groups are optional. If you don't use them, "next available" automation pulls from all labels of that type in order.
              </Callout>
            </SubSection>

            <SubSection id="labels-order" title="Order & Reordering">
              <p>The order of your labels matters for automation. When a rule uses <strong>next available</strong>, Beacon picks the first label in the list (top-to-bottom) that hasn't already been assigned to someone in that service.</p>
              <p>To reorder, grab the <strong>grip handle</strong> (six dots) on the left side of any row and drag it to the desired position. Order is saved automatically.</p>
              <Callout type="tip">
                Put your most commonly used labels at the top of each section. Leads and featured vocalists often get the same channel every week — use automation's specific-label rules for those, so "next available" only runs for the rest.
              </Callout>
            </SubSection>

            <SubSection id="labels-positions" title="Positions">
              <p><strong>Positions</strong> are role names for your team — things like Singer, Speaker, Worship Leader, Announcements, Electric Guitar, etc. They live at the bottom of the Labels page under their own section.</p>
              <p>Positions are used in two places:</p>
              <ul className={styles.ul}>
                <li><strong>People</strong> — each person can have a position set on their profile (used as a default when adding them to a Manual service team).</li>
                <li><strong>Manual service teams</strong> — when you add someone to a Manual service type, you pick their position for that service. This is what automation rules match against to assign their mic and IEM.</li>
              </ul>
              <p>Define all your positions here first, then they'll appear as a dropdown when building manual teams or editing people profiles.</p>
              <Callout type="info">
                Positions are also matched by automation rules in PCO mode — the same rules work for both. A rule like "position contains Singer → Mic: next available (Vocals group)" will fire whether the person came from PCO or a manual team.
              </Callout>
            </SubSection>
          </Section>

          {/* ── Automation ── */}
          <Section id="automation" title="Automation Rules">
            <p>Automation rules auto-assign mics and IEMs when a schedule fires. They're evaluated <strong>top-to-bottom</strong> — each person matches only the first rule that applies to them.</p>
            <p>Each rule has two parts:</p>
            <ul className={styles.ul}>
              <li><strong>Condition:</strong> match by <em>Name</em> or <em>Position</em>, using <em>is</em> (exact) or <em>contains</em> (partial).</li>
              <li><strong>Action:</strong> assign a specific mic or IEM label, or "next available" from the full pool or a named group.</li>
            </ul>
            <p>The <strong>Position</strong> field matches two things:</p>
            <ul className={styles.ul}>
              <li>In <strong>PCO mode</strong> — the team position name from the Planning Center plan (e.g. "Vocalist", "Worship Leader").</li>
              <li>In <strong>Manual mode</strong> — the position you assigned to the person when building the manual team (from your <Link to="/docs#labels-positions">Positions</Link> list).</li>
            </ul>
            <p>The same rule set works for both modes, so you only need to write your rules once.</p>
            <p><strong>Example rules:</strong></p>
            <div className={styles.codeBlock}>
              If position contains "Singer"        → Mic: next available (Vocals group){'\n'}
              If position is "Worship Leader"      → Mic: Vox 1{'\n'}
              If position contains "Guitar"        → Mic: next available (Instruments group){'\n'}
              If position is "Drums"               → IEM: IEM 6
            </div>
            <Callout type="info">
              You'll typically need two rules per person — one for the mic and one for the IEM. Add them as separate rules with the same condition.
            </Callout>
            <p><strong>Priority order:</strong> grab the grip handle on any rule row and drag it up or down to change evaluation order. Rules at the top run first.</p>
            <Callout type="tip">
              You can re-run automation manually from the Automation page using the <strong>Run automation</strong> button — useful for testing without firing a full schedule.
            </Callout>
          </Section>

          {/* ── Users & Accounts ── */}
          <Section id="users" title="Users & Accounts">
            <p>Beacon has two user roles — <strong>Admin</strong> and <strong>Team Member</strong>. Anyone can register an account, but new accounts are always created as Team Member until an admin promotes them.</p>

            <SubSection id="user-roles" title="Roles">
              <p><strong>Admin</strong> — full access to the admin panel: campuses, screens, people, labels, automation, scheduling, users, and integrations.</p>
              <p><strong>Team Member</strong> — can log in but only sees a "display access only" message in the admin panel. Intended for accounts that only need to push assignments to a screen via a share code, not manage the system.</p>
              <p>Admins can change any account's role from the <strong>Users</strong> page. Guards prevent removing the last admin account or demoting yourself.</p>
            </SubSection>

            <SubSection id="invite-links" title="Invite Links">
              <p>Instead of asking team members to register manually, you can invite them by email. Go to <strong>Organization → Invite Team Members</strong>, enter their email address, choose a role (Admin or Team Member), and click <strong>Send invite</strong>.</p>
              <p>The recipient gets an email with a personal invite link. When they click it, their email is already pre-filled on the registration form — they only need to enter their name and a password. The link:</p>
              <ul className={styles.ul}>
                <li>Expires after <strong>7 days</strong>.</li>
                <li>Pre-fills their email and locks it — they can't register under a different address.</li>
                <li>Is <strong>single-use</strong> — the invite token is consumed when the account is created.</li>
                <li>Automatically assigns the chosen role when the account is created.</li>
              </ul>
              <Callout type="info">
                If SMTP is not configured in <code>server/.env</code>, the app won't send an email. Instead it shows the raw invite link in the admin panel so you can copy-paste it manually. Set <code>SMTP_HOST</code>, <code>SMTP_USER</code>, and <code>SMTP_PASS</code> to enable email sending.
              </Callout>
              <Callout type="info">
                If an invite expires before the recipient uses it, generate a new one. Expired tokens are cleaned up automatically. You can also revoke active invites from the Organization page.
              </Callout>
            </SubSection>

            <SubSection id="my-account" title="My Account">
              <p>Click your name at the bottom of the sidebar (or go to <strong>My Account</strong> in the nav) to update your profile:</p>
              <ul className={styles.ul}>
                <li><strong>Account info</strong> — change your display name or email address.</li>
                <li><strong>Change password</strong> — requires your current password before setting a new one (minimum 8 characters).</li>
              </ul>
              <Callout type="info">
                Profile changes take effect immediately — the sidebar name updates without requiring a re-login.
              </Callout>
            </SubSection>
          </Section>

          {/* ── PCO Integration ── */}
          <Section id="pco-integration" title="Planning Center OAuth">
            <p>The app connects to Planning Center Online using OAuth 2.0. Once connected, it can:</p>
            <ul className={styles.ul}>
              <li>Pull upcoming service plans</li>
              <li>Get the team roster for each plan (names, positions, confirmation status)</li>
              <li>Fetch profile photos</li>
            </ul>
            <p><strong>To connect:</strong></p>
            <ol className={styles.ol}>
              <li>Go to <code>api.planningcenteronline.com/oauth/applications</code> and create a new OAuth app.</li>
              <li>Request scopes: <code>services</code> and <code>people</code>.</li>
              <li>Set the redirect URI to <code>http://your-domain/api/auth/pco/callback</code>.</li>
              <li>Add <code>PCO_CLIENT_ID</code> and <code>PCO_CLIENT_SECRET</code> to <code>server/.env</code>.</li>
              <li>Go to Admin → Integrations and click "Connect to Planning Center."</li>
            </ol>
            <p>PCO access tokens expire every 2 hours. The app automatically refreshes them in the background using the stored refresh token — you only need to connect once.</p>
            <Callout type="warning">
              The <code>pco_tokens</code> table in the database stores your access and refresh tokens. Keep your database file secure and do not commit it to version control.
            </Callout>
          </Section>

          {/* ── Hosting ── */}
          <Section id="hosting" title="Self-Hosting">
            <p>Beacon runs anywhere Node.js 18+ is available — a laptop, a Raspberry Pi, a VPS, a home server. Display screens are just browser tabs, so any device on the same network (or any network if you use a tunnel) can show them.</p>
            <ol className={styles.ol}>
              <li>Install Node.js (<code>nvm</code> recommended).</li>
              <li>Clone the repo and run <code>npm run install:all</code>.</li>
              <li>Create <code>server/.env</code> from <code>server/.env.example</code> and fill in your values.</li>
              <li>Build the client: <code>cd client && npm run build</code>.</li>
              <li>Set <code>NODE_ENV=production</code> in your <code>.env</code> — the Express server serves the built client automatically.</li>
              <li>Start with PM2: <code>pm2 start server/index.js --name beacon</code>.</li>
            </ol>
            <Callout type="info">
              To auto-start on boot: <code>pm2 startup</code> then <code>pm2 save</code>.
            </Callout>
            <p><strong>For HTTPS / remote access</strong> without port forwarding: install <code>cloudflared</code> and create a tunnel pointing to <code>localhost:3001</code>. Update <code>PCO_REDIRECT_URI</code> in <code>.env</code> to your public tunnel URL if you're using PCO OAuth.</p>
            <Callout type="info">
              On a local network with a fixed IP, you can point TVs directly at <code>http://192.168.x.x:3001/display/...</code> — no tunnel needed if all screens are on the same network as the server.
            </Callout>
          </Section>
        </main>
      </div>
    </div>
  )
}
