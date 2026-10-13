// Normalized domain types — see docs/notion-cms.md §12.
// Fields marked `// derived` are computed at build time and do not exist in Notion.

export type Topic = {
  id: string
  slug: string
  name: string
  description?: string
  pinned: boolean
  order?: number
  // derived
  articleCount: number
  noteCount: number
  updated?: string
}

export type PartRef = { order: number; name: string }

export type Post = {
  id: string
  title: string
  slug: string
  type: 'article' | 'note'
  status: 'idea' | 'draft' | 'review' | 'published'
  published: boolean
  date: string // ISO; for unreleased chapters this is the expected date
  updated?: string
  description: string
  topics: Topic[]
  series?: { slug: string; name: string }
  part?: PartRef
  order?: number // chapter number within the series
  pinned: boolean
  relatedIds: string[]
  lang: 'en' | 'vi'
  // derived
  url: string
}

export type SeriesPart = PartRef & { chapters: Post[] }

export type Series = {
  id: string
  slug: string
  name: string
  description: string
  topics: Topic[]
  level?: 'beginner' | 'intermediate' | 'advanced'
  order?: number
  cadence?: string
  plannedChapters?: number
  // derived
  parts: SeriesPart[]
  chapterCount: number
  publishedCount: number
  /** chapters written or planned, whichever is larger */
  total: number
  state: 'planned' | 'ongoing' | 'complete'
  latestDate?: string
  nextDate?: string
}

export type SiteData = {
  posts: Post[]
  series: Series[]
  topics: Topic[]
  site: Record<string, string> // `Site` database key/value pairs
}
