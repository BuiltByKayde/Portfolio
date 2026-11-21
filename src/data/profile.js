// All the content lives here. Edit this file to update the site —
// the readable page and the .json view both read from it.

export const profile = {
  name: 'Kayde Denton',
  age: 20,
  location: 'Auckland, New Zealand',
  role: 'Full-stack developer',
  education: ['Level 5 Certificate in Full-Stack Development, Mission Ready'],
  experience: [
    'Offsider, Relocate / Platinum (2 years)',
    "Crew Member & Trainer, McDonald's (6 months)",
  ],
  status: 'open_to_work',
  email: 'builtbykayde@gmail.com',
  github: { label: '[BuiltByKayde]', url: 'https://github.com/BuiltByKayde' },
  linkedin: { label: '[Kayde Denton]', url: 'https://www.linkedin.com/in/kayde-denton-487617451/' },
  // Lives in /public. This web copy leaves out your street address and date of birth.
  cvUrl: '/Kayde-Denton-CV.pdf',
  // Paste a Formspree (or similar) endpoint here to have the contact form send
  // straight to your inbox, e.g. 'https://formspree.io/f/abcdwxyz'.
  // Left empty, the form opens the visitor's email app instead.
  formEndpoint: '',
};

// icon: a key from brandIcons.js (real logo) — or glyph: a key from LineIcon.jsx.
// brand: the logo's own colour, shown on hover.
export const stack = [
  {
    area: 'front end',
    items: [
      { name: 'TypeScript', icon: 'typescript', brand: '#3178C6' },
      { name: 'JavaScript', icon: 'javascript', brand: '#F7DF1E' },
      { name: 'React', icon: 'react', brand: '#61DAFB' },
      { name: 'HTML', icon: 'html5', brand: '#E34F26' },
      { name: 'CSS', icon: 'css3', brand: '#2965F1' },
    ],
  },
  {
    area: 'back end',
    items: [
      { name: 'Node.js', icon: 'nodedotjs', brand: '#5FA04E' },
      { name: 'Express', icon: 'express' },
      { name: 'REST APIs', glyph: 'api' },
      { name: 'Auth', glyph: 'lock' },
    ],
  },
  {
    area: 'data',
    items: [
      { name: 'SQL', glyph: 'database' },
      { name: 'PostgreSQL', icon: 'postgresql', brand: '#4169E1' },
      { name: 'MongoDB', icon: 'mongodb', brand: '#47A248' },
    ],
  },
  {
    area: 'tooling',
    items: [
      { name: 'Git', icon: 'git', brand: '#F05032' },
      { name: 'GitHub', icon: 'github' },
      { name: 'VS Code', glyph: 'code' },
      { name: 'Testing', glyph: 'check' },
      { name: 'Deployment', glyph: 'upload' },
    ],
  },
];

export const foundations = [
  'Data structures',
  'Object-oriented programming',
  'Database design',
  'Design patterns',
  'Software lifecycle',
];

// status: 'upcoming' | 'current' | 'released' | 'initial'
export const changelog = [
  {
    version: 'v2.0',
    status: 'upcoming',
    title: 'Joining a team',
    body: 'A role where I ship real features alongside people I can learn from.',
    changes: [
      'Code review, pairing and shipping every week',
      'Your product, your users, your stack',
    ],
  },
  {
    version: 'v1.2',
    status: 'current',
    when: 'Mission Ready · 1 year',
    title: 'Level 5 Certificate in Full-Stack Development',
    body: 'A year of hands-on training across the whole stack, from the interface to the database.',
    changes: [
      'Front-end development: responsive user interfaces for the web',
      'Back-end development: servers, APIs and databases',
      'Version control with Git and collaborative development',
    ],
  },
  {
    version: 'v1.1',
    status: 'released',
    when: 'Relocate / Platinum · 2 years',
    title: 'Offsider',
    body: 'Moving and delivering furniture for homes and businesses across Auckland.',
    changes: [
      'Worked in a small crew to tight schedules on long, physical days',
      'Dealt directly with customers on site and kept every job on track',
    ],
  },
  {
    version: 'v1.0',
    status: 'initial',
    when: "McDonald's · 6 months",
    title: 'Crew Member & Trainer',
    body: "McDonald's, Lincoln Road, Henderson.",
    changes: [
      'Trained new crew on stations, procedures and service standards',
      'Food prep, customer service and payments through peak rushes',
    ],
  },
];

// status: 'live' | 'building' | 'open'. The first 'live' project gets the big feature card.
export const projects = [
  {
    id: '01',
    status: 'live',
    title: 'This portfolio',
    body: 'Designed and built from scratch. All content lives in one data file, so the readable page and the .json view can never drift apart. Includes a live Auckland clock, a working contact form and a layout that holds up on any screen.',
    tags: ['React', 'Vite', 'CSS', 'Responsive'],
    sourceUrl: '#',
  },
  {
    id: '02',
    status: 'building',
    title: '[Project name]',
    body: "[One line: what it does and who it's for.]",
    meta: '[stack] · ships [MONTH]',
  },
  {
    id: '03',
    status: 'open',
    title: 'Could be yours.',
    body: "Got a small site, tool or internal app that needs building? Let's talk scope.",
  },
];

export const principles = [
  {
    title: 'Read before writing',
    body: 'Understand the codebase and the problem before adding to either.',
  },
  {
    title: 'Ship small, ship often',
    body: 'Small pull requests, quick feedback, fewer surprises.',
  },
  { title: 'Ask early', body: 'A five-minute question beats a two-day wrong turn.' },
];
