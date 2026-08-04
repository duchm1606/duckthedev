// Per-post OG image. Slugs are globally unique (build-time check in the
// fetcher), so one flat route covers standalone posts and chapters.
import type { APIContext } from 'astro'
import { getSiteData } from '../../lib/fetcher'
import { formatDate } from '../../lib/notion/render'
import { renderOgImage } from '../../lib/og'
import { isProd } from '../../lib/env'
import type { Post } from '../../lib/types'

export async function getStaticPaths() {
  const { posts } = await getSiteData()
  return posts
    .filter((p) => p.published || !isProd())
    .map((post) => ({ params: { slug: post.slug }, props: { post } }))
}

export async function GET({ props }: APIContext) {
  const post = props.post as Post
  const kicker = post.series
    ? `${post.series.name} · Ch. ${post.order}`
    : [post.type === 'article' ? 'Essay' : 'Note', post.topics[0]?.name].filter(Boolean).join(' · ')
  const png = await renderOgImage({
    title: post.title,
    kicker,
    footer: formatDate(post.date),
  })
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } })
}
