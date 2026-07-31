const MEET_THE_DEV_SECTIONS = [
  {
    type: 'section',
    data: {
      label: 'Intro',
      bgColor: '',
      padding: 'xl',
      columns: 2,
      elements: [
        { _id: 'mtd-badge',  type: 'badge',   data: { text: 'Software Developer', color: '#60a5fa', fullWidth: true } },
        { _id: 'mtd-h1',     type: 'heading', data: { level: 1, text: 'Kaleb Wrigley', fullWidth: false } },
        { _id: 'mtd-photo',  type: 'image',   data: { url: '/kaleb.jpg', alt: 'Kaleb Wrigley', fullWidth: false, radius: 'lg', maxWidth: 'md' } },
        { _id: 'mtd-school', type: 'text',    data: { html: 'Software Engineering · Iowa State University · Ames, IA', fullWidth: false } },
        { _id: 'mtd-bio',    type: 'text',    data: { html: "I'm a student at Iowa State University majoring in Software Engineering with a minor in Artificial Intelligence. I build software that solves real problems — Beacon started as an internal tool for my own church's AV team and grew into something I wanted to share with other worship teams.", fullWidth: false } },
        { _id: 'mtd-gh',     type: 'button',  data: { label: 'GitHub', href: 'https://github.com/Kdubs6991', variant: 'secondary', fullWidth: false } },
        { _id: 'mtd-li',     type: 'button',  data: { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kaloob/', variant: 'secondary', fullWidth: false } },
      ],
    },
  },
  {
    type: 'section',
    data: {
      label: 'Skills',
      bgColor: '',
      padding: 'lg',
      columns: 3,
      elements: [
        { _id: 'mtd-sk-h',  type: 'heading', data: { level: 2, text: 'What I work with', fullWidth: true, align: 'center' } },
        { _id: 'mtd-sk-sp', type: 'spacer',  data: { height: 8, fullWidth: true } },
        { _id: 'mtd-sk-1',  type: 'card',    data: { icon: '🖥️', title: 'Full-stack web', body: 'Node.js, Express, React, Vite, PostgreSQL, SQLite. Comfortable building everything from the database schema to the component tree.', accentColor: '#60a5fa', align: 'left', fullWidth: false } },
        { _id: 'mtd-sk-2',  type: 'card',    data: { icon: '🤖', title: 'AI & machine learning', body: 'Minor in Artificial Intelligence at Iowa State. Studying ML fundamentals, neural networks, and practical AI integration in software systems.', accentColor: '#a78bfa', align: 'left', fullWidth: false } },
        { _id: 'mtd-sk-3',  type: 'card',    data: { icon: '🚀', title: 'Deployment & DevOps', body: 'Railway, Cloudinary, Resend, GitHub Actions. Beacon runs on a real production deployment — I maintain the whole stack.', accentColor: '#34d399', align: 'left', fullWidth: false } },
      ],
    },
  },
  {
    type: 'section',
    data: {
      label: 'About Beacon',
      bgColor: '',
      padding: 'lg',
      columns: 1,
      elements: [
        { _id: 'mtd-ab-h',   type: 'heading', data: { level: 2, text: 'About Beacon', fullWidth: true } },
        { _id: 'mtd-ab-txt', type: 'text',    data: { html: "Beacon is a worship team display app that shows musician cards — name, photo, mic and IEM assignments — on any TV or kiosk in a venue. The AV team builds a roster once, writes automation rules, and Beacon handles the rest: assignments are pushed to screens on a schedule or on demand.<br><br>Most churches manage this with a laminated sheet or a whiteboard updated by hand before each service. Beacon replaces that with a real-time digital display that pulls from Planning Center or a manually-built roster and updates every screen automatically.", fullWidth: true } },
        { _id: 'mtd-ab-btn', type: 'button',  data: { label: 'View the repository', href: 'https://github.com/Kdubs6991/beacon', variant: 'secondary', fullWidth: false } },
      ],
    },
  },
  {
    type: 'section',
    data: {
      label: 'Contact',
      bgColor: '',
      padding: 'lg',
      columns: 1,
      elements: [
        { _id: 'mtd-ct-h',   type: 'heading', data: { level: 2, text: 'Get in touch', fullWidth: true } },
        { _id: 'mtd-ct-txt', type: 'text',    data: { html: 'Have a question about Beacon, want to report a bug, or just want to say hello? Use the contact page.', fullWidth: true } },
        { _id: 'mtd-ct-btn', type: 'button',  data: { label: 'Send a message', href: '/contact', variant: 'primary', fullWidth: false } },
      ],
    },
  },
]

module.exports = { MEET_THE_DEV_SECTIONS }
