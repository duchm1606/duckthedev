// Maps Notion pages → domain types (docs/notion-cms.md §12) and joins relations.
// Every derived number (post counts, latest/next dates…) is computed here, never stored in Notion.

import { isProd } from './env'
import { queryAll } from './notion/client'
import type { Post, Series, SeriesPart, SiteData, Topic } from './types'

// ── property pickers (official API, addressed by real property names) ──
const text = (p: any): string =>
  ((p?.rich_text ?? p?.title ?? []) as any[]).map((t) => t.plain_text).join('')
const sel = (p: any): string | undefined => p?.select?.name
const num = (p: any): number | undefined => p?.number ?? undefined
const date = (p: any): string | undefined => p?.date?.start ?? undefined
const check = (p: any): boolean => !!p?.checkbox
const relIds = (p: any): string[] => ((p?.relation ?? []) as any[]).map((r) => r.id)

export function postUrl(p: { slug: string; order?: number; series?: { slug: string } }): string {
  return p.series
    ? `/series/${p.series.slug}/${String(p.order ?? 0).padStart(2, '0')}-${p.slug}`
    : `/blog/${p.slug}`
}

function assertUniqueSlugs(items: { slug: string }[], label: string) {
  const seen = new Map<string, number>()
  for (const { slug } of items) seen.set(slug, (seen.get(slug) ?? 0) + 1)
  const dupes = [...seen].filter(([, n]) => n > 1).map(([s]) => s)
  if (dupes.length) throw new Error(`Duplicate slugs in ${label}: ${dupes.join(', ')}`)
}

async function load(): Promise<SiteData> {
  const [rawTopics, rawSeries, rawParts, rawPosts, rawSite] = await Promise.all([
    queryAll('topics'),
    queryAll('series'),
    queryAll('parts'),
    queryAll('posts'),
    queryAll('site'),
  ])

  const topics: Topic[] = rawTopics
    .map((r) => {
      const p = r.properties
      return {
        id: r.id,
        name: text(p.Name),
        slug: text(p.Slug),
        description: text(p.Description) || undefined,
        pinned: check(p.Pinned),
        order: num(p.Order),
        articleCount: 0,
        noteCount: 0,
      }
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name))
  const topicById = new Map(topics.map((t) => [t.id, t]))

  type RawPart = { id: string; name: string; order: number; seriesId?: string }
  const parts: RawPart[] = rawParts.map((r) => {
    const p = r.properties
    return {
      id: r.id,
      name: text(p.Name),
      order: num(p.Order) ?? 0,
      seriesId: relIds(p.Series)[0],
    }
  })
  const partById = new Map(parts.map((p) => [p.id, p]))

  type RawSeries = Series & { topicIds: string[]; status?: string }
  const seriesList: RawSeries[] = rawSeries
    .map((r) => {
      const p = r.properties
      return {
        id: r.id,
        name: text(p.Name),
        slug: text(p.Slug),
        description: text(p.Description),
        topicIds: relIds(p.Topics),
        topics: [] as Topic[],
        level: sel(p.Level) as Series['level'],
        order: num(p.Order),
        cadence: text(p.Cadence) || undefined,
        plannedChapters: num(p['Planned chapters']),
        status: sel(p.Status),
        parts: [] as SeriesPart[],
        chapterCount: 0,
        publishedCount: 0,
        total: 0,
        state: 'planned' as Series['state'],
      }
    })
    .filter((s) => !isProd() || s.status === 'published')
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  const seriesById = new Map(seriesList.map((s) => [s.id, s]))

  const posts: Post[] = rawPosts
    .map((r) => {
      const p = r.properties
      const status = (sel(p.Status) ?? 'idea') as Post['status']
      const seriesRel = seriesById.get(relIds(p.Series)[0] ?? '')
      const partRel = partById.get(relIds(p.Part)[0] ?? '')
      const post: Post = {
        id: r.id,
        title: text(p.Title),
        slug: text(p.Slug),
        type: (sel(p.Type) ?? 'article') as Post['type'],
        status,
        published: status === 'published',
        date: date(p.Date) ?? '1970-01-01',
        updated: date(p.Updated),
        description: text(p.Description),
        topics: relIds(p.Topics)
          .map((id) => topicById.get(id))
          .filter((t): t is Topic => !!t),
        series: seriesRel ? { slug: seriesRel.slug, name: seriesRel.name } : undefined,
        part: partRel ? { order: partRel.order, name: partRel.name } : undefined,
        order: num(p.Order),
        pinned: check(p.Pinned),
        relatedIds: relIds(p.Related),
        lang: sel(p.Lang) === 'vi' ? 'vi' : 'en',
        url: '',
      }
      post.url = postUrl(post)
      return post
    })
    // unpublished chapters are kept (rendered as locked rows in the series map);
    // unpublished standalone posts only show up in dev for previewing
    .filter((post) => post.published || !isProd() || post.series !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
  assertUniqueSlugs(posts, 'Posts')

  // ── derive: per-topic counts (published posts only) ──
  for (const post of posts.filter((x) => x.published)) {
    for (const t of post.topics) {
      if (post.type === 'article') t.articleCount++
      else t.noteCount++
      if (!t.updated || post.date > t.updated) t.updated = post.date
    }
  }

  // ── derive: attach topics + parts/chapters to series ──
  for (const s of seriesList) {
    s.topics = s.topicIds.map((id) => topicById.get(id)).filter((t): t is Topic => !!t)
    const chapters = posts
      .filter((post) => post.series?.slug === s.slug)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    s.chapterCount = chapters.length
    s.publishedCount = chapters.filter((c) => c.published).length
    // chapters are created as they get written, so `Planned chapters` is the
    // real length of a series; a series only completes against that number
    s.total = Math.max(s.chapterCount, s.plannedChapters ?? 0)
    s.state =
      s.publishedCount === 0
        ? 'planned'
        : s.plannedChapters && s.publishedCount >= s.plannedChapters
          ? 'complete'
          : 'ongoing'
    s.latestDate = chapters.filter((c) => c.published).map((c) => c.date).sort().at(-1)
    s.nextDate = chapters.filter((c) => !c.published).map((c) => c.date).sort()[0]
    const partsOfSeries = parts
      .filter((part) => part.seriesId === s.id)
      .sort((a, b) => a.order - b.order)
    s.parts = partsOfSeries.map((part) => ({
      order: part.order,
      name: part.name,
      chapters: chapters.filter((c) => c.part?.order === part.order && c.part?.name === part.name),
    }))
    // chapters without a part (series not split into parts) go into one anonymous group
    const orphans = chapters.filter((c) => !c.part)
    if (orphans.length) s.parts.push({ order: 99, name: '', chapters: orphans })
  }
  assertUniqueSlugs(seriesList, 'Series')

  const site: Record<string, string> = {}
  for (const r of rawSite) site[text(r.properties.Key)] = text(r.properties.Value)

  return { posts, series: seriesList, topics, site }
}

// One fetch per build — every page shares the same getSiteData() promise.
let cached: Promise<SiteData> | null = null
export function getSiteData(): Promise<SiteData> {
  cached ??= load()
  return cached
}
