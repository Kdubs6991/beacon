// Landing page seed — element-based sections (v2)
const LANDING_SEED_SECTIONS = [
  {
    type: 'section',
    data: {
      label: 'Hero',
      bgColor: '',
      padding: 'xl',
      columns: 2,
      elements: [
        { _id: 'h-badge',   type: 'badge',        data: { text: 'Worship Team Display', color: '#60a5fa', fullWidth: true } },
        { _id: 'h-heading', type: 'heading',       data: { level: 1, text: 'The right mic,\non the right screen.', fullWidth: false } },
        { _id: 'h-mock',    type: 'mock_display',  data: { fullWidth: false } },
        { _id: 'h-text',    type: 'text',          data: { html: 'Beacon auto-assigns mics and IEMs for your worship team and pushes them to any TV or kiosk in your venue — built manually or pulled from your service schedule automatically.', fullWidth: false } },
        { _id: 'h-btn1',    type: 'button',        data: { label: 'Get started', href: '/org',   variant: 'primary',   fullWidth: false } },
        { _id: 'h-btn2',    type: 'button',        data: { label: 'Read the docs', href: '/docs', variant: 'secondary', fullWidth: false } },
      ],
    },
  },
  {
    type: 'section',
    data: {
      label: 'Features',
      bgColor: '',
      padding: 'lg',
      columns: 3,
      elements: [
        { _id: 'f-title', type: 'heading', data: { level: 2, text: 'Everything your team needs on screen', fullWidth: true } },
        { _id: 'f-sub',   type: 'text',    data: { html: 'Built specifically for worship teams. No extra apps, no laminated paper lists.', fullWidth: true } },
        { _id: 'f-1-h', type: 'heading', data: { level: 3, text: 'Any screen, any device',   fullWidth: false } },
        { _id: 'f-1-t', type: 'text',    data: { html: 'Each display is a permanent browser URL. Point a TV, tablet, or kiosk at it and it auto-refreshes every 30 seconds.', fullWidth: false } },
        { _id: 'f-2-h', type: 'heading', data: { level: 3, text: 'Smart automation',          fullWidth: false } },
        { _id: 'f-2-t', type: 'text',    data: { html: "Write rules once. Beacon auto-assigns mic and IEM labels based on each person's name or position — no manual work each service.", fullWidth: false } },
        { _id: 'f-3-h', type: 'heading', data: { level: 3, text: 'Templates & themes',        fullWidth: false } },
        { _id: 'f-3-t', type: 'text',    data: { html: 'Custom grid layouts with per-slot modes, label pins, and 7 colour themes. Full control over what every screen shows.', fullWidth: false } },
        { _id: 'f-4-h', type: 'heading', data: { level: 3, text: 'Scheduled push',             fullWidth: false } },
        { _id: 'f-4-t', type: 'text',    data: { html: 'Set a schedule and displays update themselves before you arrive. Saturday at 6 PM, Sunday morning — it just runs.', fullWidth: false } },
        { _id: 'f-5-h', type: 'heading', data: { level: 3, text: 'Manual service teams',       fullWidth: false } },
        { _id: 'f-5-t', type: 'text',    data: { html: 'Build your roster in Beacon and assign each person a position. No external integrations needed.', fullWidth: false } },
        { _id: 'f-6-h', type: 'heading', data: { level: 3, text: 'Self-hosted',                fullWidth: false } },
        { _id: 'f-6-t', type: 'text',    data: { html: 'Your data stays on your server. Runs on any machine with Node.js. No subscription fees, no vendor lock-in.', fullWidth: false } },
      ],
    },
  },
  {
    type: 'section',
    data: {
      label: 'How It Works',
      bgColor: '',
      padding: 'lg',
      columns: 3,
      elements: [
        { _id: 's-title', type: 'heading', data: { level: 2, text: 'Up and running in minutes', fullWidth: true } },
        { _id: 's-sub',   type: 'text',    data: { html: 'Three steps and your displays are live.', fullWidth: true } },
        { _id: 's-1-h', type: 'heading', data: { level: 3, text: '01 — Set up your team', fullWidth: false } },
        { _id: 's-1-t', type: 'text',    data: { html: 'Add your people, define your mic and IEM inventory, and write automation rules. Do it once, use it every week.', fullWidth: false } },
        { _id: 's-2-h', type: 'heading', data: { level: 3, text: '02 — Create display screens', fullWidth: false } },
        { _id: 's-2-t', type: 'text',    data: { html: 'Each screen gets a permanent URL. Point your TVs at it and assign a template to control the layout and content.', fullWidth: false } },
        { _id: 's-3-h', type: 'heading', data: { level: 3, text: '03 — Set a schedule', fullWidth: false } },
        { _id: 's-3-t', type: 'text',    data: { html: 'Pick a day and time. Beacon pushes assignments to your screens automatically — or hit Push any time for instant updates.', fullWidth: false } },
      ],
    },
  },
  {
    type: 'section',
    data: {
      label: 'Local Hosting',
      bgColor: '',
      padding: 'lg',
      columns: 1,
      elements: [
        { _id: 'l-heading', type: 'heading', data: { level: 2, text: 'Designed for local hosting', fullWidth: true } },
        { _id: 'l-text', type: 'text', data: { html: "Beacon runs on your own hardware — a laptop, a Raspberry Pi, a VPS, or any machine with Node.js installed. There's no cloud service, no account required, and your data never leaves your network unless you choose to expose it.", fullWidth: true } },
        { _id: 'l-btn', type: 'button', data: { label: 'View repository on GitHub', href: 'https://github.com/Kdubs6991/beacon', variant: 'secondary', fullWidth: false } },
      ],
    },
  },
  {
    type: 'section',
    data: {
      label: 'Pricing',
      bgColor: '',
      padding: 'lg',
      columns: 1,
      elements: [
        { _id: 'p-heading', type: 'heading', data: { level: 2, text: 'Simple, transparent pricing', fullWidth: true } },
        { _id: 'p-sub',     type: 'text',    data: { html: 'We spent a long time on this.', fullWidth: true } },
        { _id: 'p-badge',   type: 'badge',   data: { text: 'Free — $0 / forever', color: '#34d399', fullWidth: false } },
        { _id: 'p-tagline', type: 'text',    data: { html: 'No catch. No credit card. No subscription. No upsell email at 3am.', fullWidth: false } },
        { _id: 'p-btn',     type: 'button',  data: { label: 'Get started', href: '/org', variant: 'primary', fullWidth: false } },
      ],
    },
  },
  {
    type: 'section',
    data: {
      label: 'Developer Bio',
      bgColor: '',
      padding: 'lg',
      columns: 2,
      elements: [
        { _id: 'd-badge',   type: 'badge',   data: { text: 'Developer', color: '#94a3b8', fullWidth: true } },
        { _id: 'd-heading', type: 'heading', data: { level: 2, text: 'Meet the Developer', fullWidth: true } },
        { _id: 'd-photo',   type: 'image',   data: { url: '/kaleb.jpg', alt: 'Kaleb Wrigley', fullWidth: false } },
        { _id: 'd-name',    type: 'heading', data: { level: 3, text: 'Kaleb Wrigley', fullWidth: false } },
        { _id: 'd-meta',    type: 'text',    data: { html: 'Software Engineering · Iowa State University · Ames, IA', fullWidth: false } },
        { _id: 'd-bio',     type: 'text',    data: { html: "I'm a student at Iowa State University majoring in Software Engineering with a minor in Artificial Intelligence. Beacon is a project to sharpen my development and deployment skills — and to give other churches a free, polished tool to simplify their workflow.", fullWidth: false } },
        { _id: 'd-gh',      type: 'button',  data: { label: 'GitHub', href: 'https://github.com/Kdubs6991', variant: 'secondary', fullWidth: false } },
        { _id: 'd-li',      type: 'button',  data: { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kaloob/', variant: 'secondary', fullWidth: false } },
      ],
    },
  },
]

module.exports = { LANDING_SEED_SECTIONS }
