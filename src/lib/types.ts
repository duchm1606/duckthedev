// Kiểu dữ liệu sau normalize — xem docs/notion-cms.md §12.
// Field `// derived` được tính lúc build, không tồn tại trong Notion.

export type Topic = {
  id: string
  slug: string
  name: string
  glyph: string
  icon?: string
  iconClass?: 'invert' | 'wide'
  description?: string
  group?: 'lang' | 'data' | 'infra' | 'practice'
  pinned: boolean
  order?: number
  // derived
  articleCount: number
  noteCount: number
  updated?: string
}

export type PartRef = { order: number; name: string; note?: string }

export type Post = {
  id: string
  title: string
  slug: string
  type: 'article' | 'note'
  status: 'idea' | 'draft' | 'review' | 'published'
  published: boolean
  date: string // ISO; với chapter chưa ra là ngày dự kiến
  updated?: string
  description: string
  topics: Topic[]
  series?: { slug: string; name: string }
  part?: PartRef
  order?: number // số chapter trong series
  pinned: boolean
  featuredOrder?: number
  relatedIds: string[]
  lang?: string
  cover?: string
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
  state: 'planned' | 'ongoing' | 'complete'
  level?: 'beginner' | 'intermediate' | 'advanced'
  order?: number
  cadence?: string
  plannedChapters?: number
  cover?: string
  // derived
  parts: SeriesPart[]
  chapterCount: number
  publishedCount: number
  latestDate?: string
  nextDate?: string
}

export type Skill = {
  id: string
  name: string
  group?: string
  order?: number
  showInSkills: boolean
  note?: string
}

export type CvEntry = {
  id: string
  role: string
  kind: 'experience' | 'education' | 'project'
  org: string
  orgUrl?: string
  location?: string
  logo: string
  start?: string
  end?: string
  order?: number
  tech: Skill[]
}

export type SiteData = {
  posts: Post[]
  series: Series[]
  topics: Topic[]
  skills: Skill[]
  cv: CvEntry[]
  site: Record<string, string> // DB `Site` key/value
}
