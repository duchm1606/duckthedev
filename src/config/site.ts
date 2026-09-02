// Static site strings that change a few times a year at most (docs/notion-cms.md §8).
// Things you'd edit while away from the laptop (availability, CV link) live in
// the Notion `Site` database instead.

export const site = {
  name: 'duckthedev',
  mark: 'D.',
  tagline: 'notes & essays of a working engineer',
  author: 'Duc Hoang',
  description:
    'A personal notebook about backends, databases and the tools in between. ' +
    'Written by Duc Hoang. No trackers, no popups, no reading time paywall.',
  footerNote: 'No trackers, no popups, no paywall.',
  copyrightFrom: 2019,
  // the brand mark is the Home link, so the nav starts at Series
  nav: [
    { key: 'series', label: 'Series', href: '/series' },
    { key: 'blog', label: 'Blog', href: '/blog' },
    { key: 'topics', label: 'Topics', href: '/topics' },
    { key: 'about', label: 'About', href: '/about' },
  ],
  hero: {
    kicker: "Hi, I'm Duc · Software engineer · Hanoi",
    // raw HTML — rendered with set:html
    title: 'I write down<br />what I <em>break.</em>',
    deck: 'Notes on backends, databases and the tools in between.',
  },
  social: {
    github: 'https://github.com/duchm1606',
    linkedin: 'https://www.linkedin.com/in/duchoang-hust',
    email: 'mailto:hoangduc1662002@gmail.com',
  },
  about: {
    kicker: 'About',
    // raw HTML — rendered with set:html
    title: 'Duc Hoang',
    deck: 'Software engineer. Love building & deep-diving.',
    coords: [
      { k: 'Based', v: 'Hanoi, Vietnam' },
      { k: 'Languages', v: 'Vietnamese, English' },
    ],
    sayHello: 'Found a mistake, or stuck on something I wrote about? Email me.',
  },
} as const

export type NavKey = (typeof site.nav)[number]['key'] | 'home'
