<div align="center">

# builtbykayde

**Full-stack developer · Auckland, New Zealand**

The source code for my portfolio site, built with React and Vite.

[**View the live site →**](https://builtbykayde.vercel.app) &nbsp;·&nbsp; [Email me](mailto:builtbykayde@gmail.com)

![React](https://img.shields.io/badge/React_18-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=flat&logo=css3&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

</div>

---

## About

I'm Kayde, a 20-year-old full-stack developer based in Auckland. I hold a
**Level 5 Certificate in Full-Stack Development** from Mission Ready, and I build
websites and web apps for people and small businesses under the name **builtbykayde**.

This repo is the site itself. It's my first shipped project, and I'll keep
building on it as I take on more work.

## Features

- **Two ways to read it.** A normal page for people, and a `.json` toggle that shows
  the same profile as data for developers. Both come from one file, so they never
  disagree.
- **Release-notes career timeline.** My work history is laid out like software
  versions, from `v1.0` (first job) to `v2.0` (what's next).
- **Spec sheet.** My tech stack with brand logos, drawn as inline SVG with no image
  files to load.
- **Live Auckland clock** in the header, so visitors know when I'm likely to reply.
- **Downloadable CV** straight from the hero section.
- **Contact form** that opens the visitor's email app, or sends directly through
  Formspree once an endpoint is added.
- **Responsive.** Works from big desktop screens down to small phones.
- **Accessible motion.** Animations switch off for anyone who has *reduce motion*
  turned on.
- **Private `/admin` dashboard.** A Gmail-style client manager (see below), loaded
  separately so normal visitors never download it.

## Admin dashboard

`/admin` is a small client manager for my freelance work:

- Add, edit and delete clients: name, business, email, phone, website
- Inbox-style list with search
- Side panel with full details and private notes for each client
- Collapses to a phone-friendly layout on small screens

**How it's secured:** login uses Supabase Auth with public sign-ups turned off, and both
tables use Row Level Security so a signed-in user can only ever read or change their own
rows. Logged-out visitors get no access at all. The table setup is in
[`supabase/schema.sql`](supabase/schema.sql).

## Tech stack

| Area      | Tools                                                         |
| --------- | ------------------------------------------------------------- |
| Front end | React 18, Vite, plain CSS (custom properties, no UI library)  |
| Fonts     | Space Grotesk, Inter, JetBrains Mono                          |
| Back end  | Supabase (Auth + Postgres with Row Level Security)            |
| Hosting   | Vercel                                                        |

## Project structure

```
src/
├── components/     Page sections: Header, Hero, Stack, Changelog, Contact…
├── data/
│   ├── profile.js  All the site's content lives here
│   └── brandIcons.js  SVG logo paths (Simple Icons, CC0)
├── hooks/          useAucklandTime
├── admin/          /admin login + client dashboard (lazy-loaded)
├── App.jsx
├── main.jsx        Loads the site, or the admin for /admin
└── styles.css      Theme colours and layout
public/             CV PDF, robots.txt, redirects
```

## Running it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>. The admin is at <http://localhost:5173/admin>.

The admin needs a Supabase project. Copy `.env.example` to `.env` and fill in your
project URL and publishable key. Without a `.env`, the admin runs in test mode: any
login works locally and clients are saved in your browser only.

To build for hosting (output goes to `dist/`):

```bash
npm run build
```

## Editing the content

Everything you'd change (bio, stack, timeline, projects, links, email) is in
[`src/data/profile.js`](src/data/profile.js). The accent colour is `--accent` at the
top of [`src/styles.css`](src/styles.css).

## Roadmap

- [x] Portfolio site
- [x] Admin dashboard UI
- [x] Connect Supabase login and client database
- [ ] Custom domain
- [ ] First client projects in the Work section

## Contact

Got a project in mind? Email **[builtbykayde@gmail.com](mailto:builtbykayde@gmail.com)**.

---

<div align="center">
<sub>Designed and built by Kayde Denton · Auckland, NZ</sub>
</div>
# Portfolio
