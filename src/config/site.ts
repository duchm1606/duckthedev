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
  social: {
    github: 'https://github.com/duckthedev',
    linkedin: '#',
    email: 'mailto:vyquoccuong0210@gmail.com',
  },
  colophonTech: ['Fraunces & Newsreader', 'JetBrains Mono', 'Notion as CMS', 'Astro on Vercel'],
} as const

export type NavKey = (typeof site.nav)[number]['key']
