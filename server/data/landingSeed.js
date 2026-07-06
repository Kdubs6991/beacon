const LANDING_SEED_SECTIONS = [
  {
    type: 'hero',
    data: {
      badge: 'Worship Team Display',
      headline: 'The right mic,\non the right screen.',
      subtext: 'Beacon auto-assigns mics and IEMs for your worship team and pushes them to any TV or kiosk in your venue — built manually or pulled from your service schedule automatically.',
      primaryBtn:   { label: 'Get started',    href: '/org' },
      secondaryBtn: { label: 'Read the docs',  href: '/docs' },
      showMockDisplay: true,
      align: 'left',
    },
  },
  {
    type: 'feature_grid',
    data: {
      heading: 'Everything your team needs on screen',
      subtext: 'Built specifically for worship teams. No extra apps, no laminated paper lists.',
      columns: 3,
      cells: [
        { heading: 'Any screen, any device',    text: 'Each display is a permanent browser URL. Point a TV, tablet, or kiosk at it and it auto-refreshes every 30 seconds — no app installs, no logins on the display.', accentColor: '#60a5fa' },
        { heading: 'Smart automation',          text: "Write rules once. Beacon auto-assigns mic and IEM labels based on each person's name or position — no manual work each service.", accentColor: '#c084fc' },
        { heading: 'Templates & themes',        text: 'Custom grid layouts with per-slot modes, label pins, and 7 colour themes. Full control over what every screen shows and how it looks.', accentColor: '#fb923c' },
        { heading: 'Scheduled push',            text: 'Set a schedule and displays update themselves before you arrive. Saturday at 6 PM, Sunday morning — it just runs.', accentColor: '#34d399' },
        { heading: 'Manual service teams',      text: 'Build your roster in Beacon and assign each person a position. No external integrations needed — everything runs from within the app.', accentColor: '#fbbf24' },
        { heading: 'Self-hosted',               text: 'Your data stays on your server. Runs on any machine with Node.js. No subscription fees, no vendor lock-in.', accentColor: '#94a3b8' },
      ],
    },
  },
  {
    type: 'steps',
    data: {
      heading: 'Up and running in minutes',
      subtext: 'Three steps and your displays are live.',
      steps: [
        { number: '01', title: 'Set up your team',       text: 'Add your people, define your mic and IEM inventory, and write automation rules. Do it once, use it every week.' },
        { number: '02', title: 'Create display screens', text: 'Each screen gets a permanent URL. Point your TVs at it and assign a template to control the layout and content.' },
        { number: '03', title: 'Set a schedule',         text: 'Pick a day and time. Beacon pushes assignments to your screens automatically — or hit Push any time for instant updates.' },
      ],
    },
  },
  {
    type: 'content_row',
    data: {
      imagePosition: 'left',
      imageUrl: '',
      imageAlt: '',
      heading: 'Designed for local hosting',
      text: "Beacon runs on your own hardware — a laptop, a Raspberry Pi, a VPS, or any machine with Node.js installed. There's no cloud service, no account required, and your data never leaves your network unless you choose to expose it.\n\nUpdates are distributed through the GitHub repository. When a new version is available, pull the latest code and restart the server — no auto-updates, no breaking changes pushed without your knowledge.",
      btn: { label: 'View repository on GitHub', href: 'https://github.com/Kdubs6991/beacon' },
      bgColor: '',
    },
  },
  {
    type: 'pricing',
    data: {
      heading: 'Simple, transparent pricing',
      subtext: 'We spent a long time on this.',
      tier: 'Free',
      amount: '$0',
      per: '/ forever',
      tagline: 'No catch. No credit card. No subscription. No upsell email at 3am.',
      features: ['Every feature', 'Unlimited screens', 'Unlimited team members', 'Unlimited automations', 'Hosted on your own hardware', 'You own your data'],
      primaryBtn: { label: 'Get started', href: '/org' },
    },
  },
  {
    type: 'profile',
    data: {
      badge: 'Developer',
      heading: 'Meet the Developer',
      name: 'Kaleb Wrigley',
      meta: 'Software Engineering · Iowa State University  ·  Ames, IA',
      photoUrl: '/kaleb.jpg',
      photoFallback: 'KW',
      bio: "I'm a student at Iowa State University majoring in Software Engineering with a minor in Artificial Intelligence. Beacon is a project to sharpen my development and deployment skills — and to give other churches a free, polished tool to simplify their workflow.",
      links: [
        { type: 'github',   label: 'GitHub',               href: 'https://github.com/Kdubs6991' },
        { type: 'linkedin', label: 'LinkedIn',              href: 'https://www.linkedin.com/in/kaloob/' },
        { type: 'email',    label: 'kjwrigley08@gmail.com', href: 'mailto:kjwrigley08@gmail.com' },
      ],
      supportText: "Beacon is completely free to use and always will be. I built it to grow as a developer and to give churches a tool that actually helps. If you'd like to help cover hosting costs, it's genuinely appreciated — but there's absolutely no obligation.",
      supportLinks: [
        { label: 'Venmo',    href: 'https://venmo.com/u/kdubs6991',              color: '#008CFF' },
        { label: 'PayPal',   href: 'https://www.paypal.com/paypalme/Kdubs6991',  color: '#009CDE' },
        { label: 'Cash App', href: 'https://cash.app/$boolak',                   color: '#00C244' },
      ],
    },
  },
]

module.exports = { LANDING_SEED_SECTIONS }
