// Map Notion pages → domain types (docs/notion-cms.md §12) và join quan hệ.
// Mọi con số derive (đếm bài, latest/next date…) tính ở đây, không lưu ở Notion.

import { isProd } from './env'
import { queryAll } from './notion/client'
import type { CvEntry, Post, Series, SeriesPart, SiteData, Skill, Topic } from './types'

// ── property pickers (official API, đọc theo tên property thật) ──
const text = (p: any): string =>
  ((p?.rich_text ?? p?.title ?? []) as any[]).map((t) => t.plain_text).join('')
const sel = (p: any): string | undefined => p?.select?.name
const num = (p: any): number | undefined => p?.number ?? undefined
const date = (p: any): string | undefined => p?.date?.start ?? undefined
const check = (p: any): boolean => !!p?.checkbox
const urlOf = (p: any): string | undefined => p?.url ?? undefined
const relIds = (p: any): string[] => ((p?.relation ?? []) as any[]).map((r) => r.id)
const fileUrl = (p: any): string | undefined => {
  const f = p?.files?.[0]
  return f?.file?.url ?? f?.external?.url ?? undefined
}

export function postUrl(p: { slug: string; order?: number; series?: { slug: string } }): string {
  return p.series
    ? `/series/${p.series.slug}/${String(p.order ?? 0).padStart(2, '0')}-${p.slug}`
    : `/blog/${p.slug}`
}

function assertUniqueSlugs(items: { slug: string }[], label: string) {
  const seen = new Map<string, number>()
  for (const { slug } of items) seen.set(slug, (seen.get(slug) ?? 0) + 1)
  const dupes = [...seen].filter(([, n]) => n > 1).map(([s]) => s)
  if (dupes.length) throw new Error(`Slug trùng trong ${label}: ${dupes.join(', ')}`)
}

async function load(): Promise<SiteData> {
  const [rawTopics, rawSkills, rawSeries, rawParts, rawPosts, rawCv, rawSite] = await Promise.all([
    queryAll('topics'),
    queryAll('skills'),
    queryAll('series'),
    queryAll('parts'),
    queryAll('posts'),
    queryAll('cv'),
    queryAll('site'),
  ])

  const topics: Topic[] = rawTopics
    .map((r) => {
      const p = r.properties
      return {
        id: r.id,
        name: text(p.Name),
        slug: text(p.Slug),
        glyph: text(p.Glyph),
        icon: urlOf(p.Icon),
        iconClass: sel(p['Icon class']) as Topic['iconClass'],
        description: text(p.Description) || undefined,
        group: sel(p.Group) as Topic['group'],
        pinned: check(p.Pinned),
        order: num(p.Order),
        articleCount: 0,
        noteCount: 0,
      }
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name))
  const topicById = new Map(topics.map((t) => [t.id, t]))

  const skills: Skill[] = rawSkills
    .map((r) => {
      const p = r.properties
      return {
        id: r.id,
        name: text(p.Name),
        group: sel(p.Group),
        order: num(p.Order),
        showInSkills: check(p['Show in skills']),
        note: text(p.Note) || undefined,
      }
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  const skillById = new Map(skills.map((s) => [s.id, s]))

  type RawPart = { id: string; name: string; note?: string; order: number; seriesId?: string }
  const parts: RawPart[] = rawParts.map((r) => {
    const p = r.properties
    return {
      id: r.id,
      name: text(p.Name),
      note: text(p.Note) || undefined,
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
        state: (sel(p.State) ?? 'planned') as Series['state'],
        level: sel(p.Level) as Series['level'],
        order: num(p.Order),
        cadence: text(p.Cadence) || undefined,
        plannedChapters: num(p['Planned chapters']),
        cover: fileUrl(p.Cover),
        status: sel(p.Status),
        parts: [] as SeriesPart[],
        chapterCount: 0,
        publishedCount: 0,
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
        part: partRel ? { order: partRel.order, name: partRel.name, note: partRel.note } : undefined,
        order: num(p.Order),
        pinned: check(p.Pinned),
        featuredOrder: num(p['Featured order']),
        relatedIds: relIds(p.Related),
        lang: sel(p.Lang),
        cover: fileUrl(p.Cover),
        url: '',
      }
      post.url = postUrl(post)
      return post
    })
    // chapter chưa published vẫn giữ (render "chap-row locked" trong series map);
    // bài lẻ chưa published chỉ hiện ở dev để xem trước
    .filter((post) => post.published || !isProd() || post.series !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
  assertUniqueSlugs(posts, 'Posts')

  // ── derive: đếm theo topic (chỉ tính bài published) ──
  for (const post of posts.filter((x) => x.published)) {
    for (const t of post.topics) {
      if (post.type === 'article') t.articleCount++
      else t.noteCount++
      if (!t.updated || post.date > t.updated) t.updated = post.date
    }
  }

  // ── derive: gắn topics + parts/chapters vào series ──
  for (const s of seriesList) {
    s.topics = s.topicIds.map((id) => topicById.get(id)).filter((t): t is Topic => !!t)
    const chapters = posts
      .filter((post) => post.series?.slug === s.slug)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    s.chapterCount = chapters.length
    s.publishedCount = chapters.filter((c) => c.published).length
    s.latestDate = chapters.filter((c) => c.published).map((c) => c.date).sort().at(-1)
    s.nextDate = chapters.filter((c) => !c.published).map((c) => c.date).sort()[0]
    const partsOfSeries = parts
      .filter((part) => part.seriesId === s.id)
      .sort((a, b) => a.order - b.order)
    s.parts = partsOfSeries.map((part) => ({
      order: part.order,
      name: part.name,
      note: part.note,
      chapters: chapters.filter((c) => c.part?.order === part.order && c.part?.name === part.name),
    }))
    // chapter không thuộc part nào (series không chia part) gom vào một nhóm ẩn danh
    const orphans = chapters.filter((c) => !c.part)
    if (orphans.length) s.parts.push({ order: 99, name: '', chapters: orphans })
  }
  assertUniqueSlugs(seriesList, 'Series')

  const cv: CvEntry[] = rawCv
    .filter((r) => check(r.properties.Visible))
    .map((r) => {
      const p = r.properties
      return {
        id: r.id,
        role: text(p.Role),
        kind: (sel(p.Kind) ?? 'experience') as CvEntry['kind'],
        org: text(p.Org),
        orgUrl: urlOf(p['Org URL']),
        location: text(p.Location) || undefined,
        logo: text(p.Logo),
        start: date(p.Start),
        end: date(p.End),
        order: num(p.Order),
        tech: relIds(p.Tech)
          .map((id) => skillById.get(id))
          .filter((s): s is Skill => !!s),
      }
    })
    .sort((a, b) => (b.start ?? '').localeCompare(a.start ?? '') || (a.order ?? 99) - (b.order ?? 99))

  const site: Record<string, string> = {}
  for (const r of rawSite) site[text(r.properties.Key)] = text(r.properties.Value)

  return { posts, series: seriesList, topics, skills, cv, site }
}

// Một lần fetch cho cả lượt build — mọi trang gọi getSiteData() dùng chung.
let cached: Promise<SiteData> | null = null
export function getSiteData(): Promise<SiteData> {
  cached ??= load()
  return cached
}
