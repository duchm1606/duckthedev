// RSS feed of every published post — standalone articles/notes and chapters.
import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { site } from '../config/site'
import { getSiteData } from '../lib/fetcher'

export async function GET(context: APIContext) {
  const { posts } = await getSiteData()
  const published = posts
    .filter((p) => p.published)
    .sort((a, b) => b.date.localeCompare(a.date))
  return rss({
    title: site.name,
    description: site.coloNote,
    site: context.site!,
    items: published.map((p) => ({
      title: p.series ? `${p.series.name} · Ch. ${p.order}: ${p.title}` : p.title,
      description: p.description,
      link: p.url,
      pubDate: new Date(p.date),
      categories: p.topics.map((t) => t.name),
    })),
  })
}
