// Static site strings that change a few times a year at most (docs/notion-cms.md §8).
// Things you'd edit while away from the laptop (availability, CV link) live in
// the Notion `Site` database instead.

export const site = {
  name: 'duckthedev',
  mark: 'D.',
  tagline: 'notes & essays of a working engineer',
  author: 'Duc Hoang',
  coloNote:
    'A personal notebook about backends, databases and the tools in between. ' +
    'Written by Duc Hoang. No trackers, no popups, no reading time paywall.',
  coloFoot: 'Built with more coffee than sense',
  copyrightFrom: 2019,
  nav: [
    { key: 'home', label: 'Home', href: '/' },
    { key: 'series', label: 'Series', href: '/series' },
    { key: 'blog', label: 'Blog', href: '/blog' },
    { key: 'topics', label: 'Topics', href: '/topics' },
    { key: 'about', label: 'About', href: '/about' },
  ],
  hero: {
    label: "Hi, I'm Duc",
    marker: 'Backend & platform engineer · 7 yrs shipping',
    // raw HTML — rendered with set:html
    title: 'I write down<br />what I <em>break.</em>',
    deck:
      'A personal notebook that grew into a publication. I work on <strong>distributed backends, ' +
      'developer tooling and the boring infrastructure</strong> that keeps them alive. Everything here is ' +
      'a note first and an article second — written while the bug was still fresh, then edited ' +
      'until it would survive a code review.',
    ornament: 'Set in Fraunces, Newsreader & JetBrains Mono',
    deskLogTitle: 'Desk log',
    deskLogSub: 'what I touched this week',
  },
  social: {
    github: 'https://github.com/duckthedev',
    linkedin: '#',
    email: 'mailto:vyquoccuong0210@gmail.com',
  },
  colophonTech: ['Fraunces & Newsreader', 'JetBrains Mono', 'Notion as CMS', 'Astro on Vercel'],
} as const

export type NavKey = (typeof site.nav)[number]['key']
